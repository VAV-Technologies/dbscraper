/**
 * Google-based DNB Scraper
 *
 * Strategy: Instead of scraping DNB directly (blocked), we:
 * 1. Use Google Search to find DNB company profile URLs
 * 2. Extract company info from Google search results snippets
 * 3. Optionally use Google Cache to access full pages
 *
 * This bypasses DNB's bot protection entirely!
 */

const axios = require('axios');

class GoogleDNBScraper {
  constructor(options = {}) {
    this.options = {
      googleApiKey: options.googleApiKey || process.env.GOOGLE_API_KEY,
      googleCseId: options.googleCseId || process.env.GOOGLE_CSE_ID,
      maxResults: options.maxResults || 100,
      delayBetweenRequests: options.delayBetweenRequests || 2000,
      ...options
    };

    this.results = [];
    this.errors = [];
  }

  /**
   * Search Google for DNB company profiles
   * @param {string} query - Search query (e.g., "information technology companies china")
   * @param {number} startIndex - Pagination start index
   */
  async searchGoogleForDNBCompanies(query, startIndex = 1) {
    try {
      // If no API key, use alternative method
      if (!this.options.googleApiKey) {
        return await this.searchGoogleScraping(query, startIndex);
      }

      // Use Google Custom Search API (10,000 queries/day free tier)
      const url = 'https://www.googleapis.com/customsearch/v1';
      const params = {
        key: this.options.googleApiKey,
        cx: this.options.googleCseId,
        q: `site:dnb.com/business-directory/company-profiles ${query}`,
        start: startIndex,
        num: 10 // Max 10 results per request
      };

      const response = await axios.get(url, { params });

      return this.parseGoogleResults(response.data);

    } catch (error) {
      global.logger?.error(`Google search error: ${error.message}`);
      this.errors.push({ query, error: error.message });
      return [];
    }
  }

  /**
   * Alternative: Scrape Google search results directly (no API key needed)
   */
  async searchGoogleScraping(query, page = 1) {
    try {
      const searchQuery = encodeURIComponent(`site:dnb.com/business-directory/company-profiles ${query}`);
      const startIndex = (page - 1) * 10;
      const url = `https://www.google.com/search?q=${searchQuery}&start=${startIndex}`;

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      return this.parseGoogleHTML(response.data);

    } catch (error) {
      global.logger?.error(`Google scraping error: ${error.message}`);
      return [];
    }
  }

  /**
   * Parse Google API response
   */
  parseGoogleResults(data) {
    if (!data.items) return [];

    return data.items.map(item => {
      // Extract company info from Google snippet
      const companyInfo = this.extractCompanyInfoFromSnippet(item);

      return {
        name: item.title.split(' Company Profile')[0].trim(),
        profileUrl: item.link,
        snippet: item.snippet,
        location: companyInfo.location || '',
        industry: companyInfo.industry || '',
        ...companyInfo
      };
    });
  }

  /**
   * Parse Google HTML search results
   */
  parseGoogleHTML(html) {
    const companies = [];

    // Extract search result blocks
    const resultRegex = /<div class="[^"]*g[^"]*"[^>]*>[\s\S]*?<a href="(https:\/\/www\.dnb\.com\/business-directory\/company-profiles[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/g;

    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      const url = match[1];
      const titleHtml = match[2];
      const snippet = match[3];

      // Clean up HTML tags
      const title = titleHtml.replace(/<[^>]+>/g, '').trim();
      const cleanSnippet = snippet.replace(/<[^>]+>/g, '').trim();

      const companyInfo = this.extractCompanyInfoFromSnippet({
        title,
        snippet: cleanSnippet,
        link: url
      });

      companies.push({
        name: title.split(' Company Profile')[0].trim(),
        profileUrl: url,
        snippet: cleanSnippet,
        ...companyInfo
      });
    }

    return companies;
  }

  /**
   * Extract company details from Google search snippet
   */
  extractCompanyInfoFromSnippet(item) {
    const snippet = item.snippet || '';
    const title = item.title || '';

    const info = {};

    // Extract location (usually after company name in title)
    const locationMatch = title.match(/\|\s*([^|]+),\s*([^|]+)\s*\|/);
    if (locationMatch) {
      info.location = `${locationMatch[1]}, ${locationMatch[2]}`.trim();
    }

    // Extract revenue/sales from snippet
    const revenueMatch = snippet.match(/\$?([\d,]+\.?\d*)\s*(million|billion|M|B)/i);
    if (revenueMatch) {
      info.revenue = revenueMatch[0];
    }

    // Extract employee count
    const employeeMatch = snippet.match(/([\d,]+)\s*(total\s*)?employees/i);
    if (employeeMatch) {
      info.employees = employeeMatch[1].replace(/,/g, '');
    }

    // Extract industry from snippet
    const industryMatch = snippet.match(/part of the ([^.]+) Industry/);
    if (industryMatch) {
      info.industry = industryMatch[1].trim();
    }

    return info;
  }

  /**
   * Get company profile from Google Cache (bypasses DNB protection)
   */
  async getCompanyFromGoogleCache(profileUrl) {
    try {
      const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(profileUrl)}`;

      const response = await axios.get(cacheUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      // Parse cached page HTML
      return this.parseCompanyProfile(response.data);

    } catch (error) {
      global.logger?.warn(`Google cache failed for ${profileUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Parse company profile HTML
   */
  parseCompanyProfile(html) {
    const profile = {};

    // Extract various fields using regex
    // These patterns match DNB's page structure

    // Company name
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (nameMatch) profile.name = nameMatch[1].trim();

    // DBA / Trade name
    const dbaMatch = html.match(/Doing Business As[:\s]*([^<\n]+)/i);
    if (dbaMatch) profile.doingBusinessAs = dbaMatch[1].trim();

    // Address
    const addressMatch = html.match(/address["\s>:]+([^<]+(?:<[^>]+>[^<]+)*)/i);
    if (addressMatch) {
      profile.fullAddress = addressMatch[1].replace(/<[^>]+>/g, ' ').trim();
    }

    // Phone
    const phoneMatch = html.match(/phone["\s>:]+([+\d\s()-]+)/i) || html.match(/tel:([+\d\s()-]+)/);
    if (phoneMatch) profile.phone = phoneMatch[1].trim();

    // Website
    const websiteMatch = html.match(/website["\s>:]+<a[^>]+href="([^"]+)"/i);
    if (websiteMatch && !websiteMatch[1].includes('dnb.com')) {
      profile.website = websiteMatch[1];
    }

    // Key Principal
    const principalMatch = html.match(/Principal[:\s]*([^<\n]+)/i);
    if (principalMatch) profile.keyPrincipal = principalMatch[1].trim();

    // Industry
    const industryMatches = html.match(/industry["\s>:]*([^<\n]+)/gi);
    if (industryMatches) {
      profile.industries = industryMatches.map(m =>
        m.replace(/industry["\s>:]*/i, '').trim()
      ).filter(i => i.length > 0 && i.length < 100);
    }

    return profile;
  }

  /**
   * Main scraping method
   */
  async scrapeDirectory(searchQuery, options = {}) {
    const results = [];
    const errors = [];
    let currentPage = 1;
    const maxPages = options.maxPages || 10;

    const ScrapingJob = require('../models/ScrapingJob');
    const CompanyResult = require('../models/CompanyResult');

    try {
      while (currentPage <= maxPages) {
        // Check if job was paused
        if (options.jobId) {
          const job = await ScrapingJob.findOne({ jobId: options.jobId });
          if (job && job.status === 'paused') {
            global.logger?.info(`Job ${options.jobId} paused`);
            break;
          }
        }

        global.logger?.info(`Searching Google for DNB companies (page ${currentPage}/${maxPages})...`);

        // Search Google for companies
        const companies = await this.searchGoogleScraping(searchQuery, currentPage);

        global.logger?.info(`Found ${companies.length} companies from Google`);

        if (companies.length === 0) {
          global.logger?.info('No more results from Google');
          break;
        }

        // Process each company
        for (const company of companies) {
          if (options.jobId) {
            const job = await ScrapingJob.findOne({ jobId: options.jobId });
            if (job && job.status === 'paused') {
              return { results, errors };
            }
          }

          // Optionally get full profile from Google cache
          if (options.fetchFullProfile && company.profileUrl) {
            try {
              const fullProfile = await this.getCompanyFromGoogleCache(company.profileUrl);
              if (fullProfile) {
                Object.assign(company, fullProfile);
              }
            } catch (error) {
              global.logger?.warn(`Failed to get full profile: ${error.message}`);
            }
          }

          company.jobId = options.jobId;
          company.scrapedAt = new Date();
          results.push(company);

          // Save in batches
          if (results.length >= 50 && options.jobId) {
            await CompanyResult.insertMany(results, { ordered: false });
            const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
            global.logger?.info(`Batch saved ${results.length} companies (total: ${totalScraped})`);

            await ScrapingJob.updateOne(
              { jobId: options.jobId },
              {
                $set: {
                  'progress.companiesScraped': totalScraped,
                  'progress.pagesProcessed': currentPage
                }
              }
            );

            results.length = 0;
          }

          // Rate limit
          await new Promise(r => setTimeout(r, this.options.delayBetweenRequests));
        }

        currentPage++;

        // Delay between pages
        await new Promise(r => setTimeout(r, 5000));
      }

      // Save remaining results
      if (results.length > 0 && options.jobId) {
        await CompanyResult.insertMany(results, { ordered: false });
        const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
        global.logger?.info(`Final batch: ${results.length} companies (total: ${totalScraped})`);

        await ScrapingJob.updateOne(
          { jobId: options.jobId },
          {
            $set: {
              'progress.companiesScraped': totalScraped,
              'progress.totalCompanies': totalScraped
            }
          }
        );
      }

    } catch (error) {
      global.logger?.error(`Scraping error: ${error.message}`);
      errors.push({ error: error.message });
    }

    const totalCount = options.jobId ?
      await CompanyResult.countDocuments({ jobId: options.jobId }) :
      results.length;

    return {
      results: [],
      resultCount: totalCount,
      errors
    };
  }

  async close() {
    // No browser to close - all HTTP requests
  }
}

module.exports = GoogleDNBScraper;
