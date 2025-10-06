const { chromium } = require('playwright');
const UserAgent = require('user-agents');
const PQueue = require('p-queue').default;

class DNBScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      maxConcurrency: options.maxConcurrency || 3,
      minDelay: options.minDelay || 3000,
      maxDelay: options.maxDelay || 10000,
      retryAttempts: options.retryAttempts || 3,
      timeout: options.timeout || 30000,
      ...options
    };
    
    this.queue = new PQueue({ concurrency: this.options.maxConcurrency });
    this.sessions = new Map();
    this.proxies = options.proxies || [];
    this.currentProxyIndex = 0;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });
  }

  async createSession() {
    const context = await this.browser.newContext({
      userAgent: new UserAgent().toString(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: [],
      offline: false,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      colorScheme: 'light',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      }
    });

    const page = await context.newPage();

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' })
        })
      });
    });

    const sessionId = Date.now().toString();
    this.sessions.set(sessionId, { context, page });
    
    return sessionId;
  }

  async humanLikeBehavior(page) {
    const actions = [
      async () => {
        await page.mouse.move(
          Math.random() * 1920,
          Math.random() * 1080,
          { steps: Math.floor(Math.random() * 10) + 5 }
        );
      },
      async () => {
        await page.evaluate(() => {
          window.scrollBy(0, Math.random() * 300);
        });
      },
      async () => {
        await page.keyboard.press('Tab');
      }
    ];

    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    await randomAction();
  }

  async randomDelay() {
    const delay = Math.random() * (this.options.maxDelay - this.options.minDelay) + this.options.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async detectCaptcha(page) {
    try {
      const captchaIndicators = await page.evaluate(() => {
        const captchaSelectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="captcha"]',
          '.g-recaptcha',
          '#captcha',
          '[class*="captcha"]',
          '[id*="captcha"]'
        ];

        for (const selector of captchaSelectors) {
          if (document.querySelector(selector)) {
            return { detected: true, type: selector };
          }
        }

        // Check for common CAPTCHA text
        const bodyText = document.body.innerText.toLowerCase();
        if (bodyText.includes('verify you are human') ||
            bodyText.includes('captcha') ||
            bodyText.includes('security check')) {
          return { detected: true, type: 'text-based' };
        }

        return { detected: false };
      });

      return captchaIndicators;
    } catch (error) {
      return { detected: false };
    }
  }

  async scrapeDirectoryPage(url, sessionId) {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const newSessionId = await this.createSession();
      session = this.sessions.get(newSessionId);
    }
    const { page } = session;

    let attempts = 0;
    while (attempts < this.options.retryAttempts) {
      try {
        await this.randomDelay();

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.options.timeout
        });

        // Check for CAPTCHA
        const captchaCheck = await this.detectCaptcha(page);
        if (captchaCheck.detected) {
          global.logger.error(`CAPTCHA detected on ${url}: ${captchaCheck.type}`);
          if (global.io) {
            global.io.emit('captchaDetected', {
              url,
              type: captchaCheck.type,
              timestamp: new Date().toISOString()
            });
          }
          throw new Error(`CAPTCHA detected: ${captchaCheck.type}`);
        }

        await this.humanLikeBehavior(page);

        // Wait for page content with better error handling
        const contentLoaded = await page.waitForSelector('.company-list, .directory-results, [data-company], .business-card, .search-results', {
          timeout: 10000
        }).catch(err => {
          global.logger.warn(`Content selector not found on ${url}: ${err.message}`);
          return null;
        });

        if (!contentLoaded) {
          throw new Error('Page content did not load - selectors not found');
        }

        const companies = await page.evaluate(() => {
          const companyElements = document.querySelectorAll(
            '.company-list-item, .directory-result, [data-company], .business-card, .company-info, .search-result-item'
          );

          if (companyElements.length === 0) {
            console.warn('No company elements found with standard selectors');
          }

          return Array.from(companyElements).map(el => {
            const nameEl = el.querySelector('.company-name, h2, h3, a[href*="/business-directory/"], .business-name');
            const locationEl = el.querySelector('.location, .address, .company-location, .locality');
            const revenueEl = el.querySelector('.revenue, .sales, .company-revenue, .annual-sales');
            const linkEl = el.querySelector('a[href*="/business-directory/"], a[href*="/company/"]');

            return {
              name: nameEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              revenue: revenueEl?.textContent?.trim() || '',
              profileUrl: linkEl?.href || '',
              scrapedAt: new Date().toISOString()
            };
          }).filter(company => company.name);
        });

        // Better next page detection
        const hasNextPage = await page.evaluate(() => {
          const nextSelectors = [
            'a[rel="next"]',
            '.pagination-next',
            'a[aria-label*="Next"]',
            'button[aria-label*="Next"]',
            '.pagination a:last-child:not(.disabled)',
            'a:has-text("Next")',
            'a:has-text("›")',
            'a:has-text("→")'
          ];

          for (const selector of nextSelectors) {
            try {
              const el = document.querySelector(selector);
              if (el && !el.classList.contains('disabled') && !el.hasAttribute('disabled')) {
                return true;
              }
            } catch (e) {
              // Ignore invalid selectors
            }
          }
          return false;
        });

        return { companies, hasNextPage, error: null };
        
      } catch (error) {
        attempts++;
        global.logger.error(`Attempt ${attempts} failed for ${url}: ${error.message}`);
        
        if (attempts >= this.options.retryAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  async scrapeCompanyPage(url, sessionId) {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const newSessionId = await this.createSession();
      session = this.sessions.get(newSessionId);
    }
    const { page } = session;
    
    let attempts = 0;
    while (attempts < this.options.retryAttempts) {
      try {
        await this.randomDelay();
        
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.options.timeout
        });

        await this.humanLikeBehavior(page);

        const companyData = await page.evaluate(() => {
          const getData = (selectors) => {
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) return el.textContent.trim();
            }
            return '';
          };

          return {
            doingBusinessAs: getData(['.dba-name', '[data-dba]', '.doing-business-as']),
            keyPrincipal: getData(['.key-principal', '.principal-name', '.executive-name']),
            principalTitle: getData(['.principal-title', '.executive-title', '.job-title']),
            industries: Array.from(document.querySelectorAll('.industry, .industry-tag')).map(el => el.textContent.trim()),
            fullAddress: getData(['.full-address', '.company-address', '.street-address']),
            phone: getData(['.phone', '.phone-number', 'a[href^="tel:"]']),
            website: document.querySelector('a[href^="http"]:not([href*="dnb.com"])')?.href || '',
            scrapedAt: new Date().toISOString()
          };
        });

        return { ...companyData, error: null };
        
      } catch (error) {
        attempts++;
        global.logger.error(`Attempt ${attempts} failed for company ${url}: ${error.message}`);
        
        if (attempts >= this.options.retryAttempts) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  async scrapeDirectory(directoryUrl, options = {}) {
    const results = [];
    const errors = [];
    let currentPage = 1;
    let hasMorePages = true;
    let sessionRotationCounter = 0;
    const SESSION_ROTATION_INTERVAL = 10; // Rotate session every 10 pages
    const BATCH_SIZE = 50; // Save to DB every 50 companies

    let sessionId = await this.createSession();
    const ScrapingJob = require('../models/ScrapingJob');
    const CompanyResult = require('../models/CompanyResult');

    try {
      while (hasMorePages && (!options.maxPages || currentPage <= options.maxPages)) {
        // Check if job was paused
        if (options.jobId) {
          const job = await ScrapingJob.findOne({ jobId: options.jobId });
          if (job && job.status === 'paused') {
            global.logger.info(`Job ${options.jobId} paused, stopping scrape loop`);
            break;
          }
        }

        // Better URL construction that handles existing parameters
        const url = new URL(directoryUrl);
        url.searchParams.set('page', currentPage);
        const pageUrl = url.toString();

        global.logger.info(`Scraping directory page ${currentPage}: ${pageUrl}`);

        if (global.io) {
          global.io.emit('scrapeProgress', {
            status: 'scraping_directory',
            currentPage,
            url: pageUrl
          });
        }

        let pageResult;
        try {
          pageResult = await this.scrapeDirectoryPage(pageUrl, sessionId);
        } catch (error) {
          global.logger.error(`Failed to scrape page ${currentPage}: ${error.message}`);
          errors.push({ page: currentPage, error: error.message, url: pageUrl });

          // Try to recover session on critical errors
          if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
            global.logger.info('Session lost, recreating...');
            const session = this.sessions.get(sessionId);
            if (session) {
              await session.context.close().catch(() => {});
              this.sessions.delete(sessionId);
            }
            sessionId = await this.createSession();
          }

          // Continue to next page after error
          currentPage++;
          continue;
        }

        const { companies, hasNextPage, error } = pageResult;

        if (error) {
          errors.push({ page: currentPage, error, url: pageUrl });
          break;
        }

        for (let i = 0; i < companies.length; i++) {
          // Check pause status before each company
          if (options.jobId) {
            const job = await ScrapingJob.findOne({ jobId: options.jobId });
            if (job && job.status === 'paused') {
              global.logger.info(`Job ${options.jobId} paused, stopping company scraping`);
              return { results, errors };
            }
          }

          const company = companies[i];

          if (global.io) {
            global.io.emit('scrapeProgress', {
              status: 'scraping_company',
              companyName: company.name,
              progress: results.length + 1,
              total: options.expectedCount || 'unknown'
            });
          }

          let companyData;
          if (company.profileUrl) {
            try {
              const details = await this.scrapeCompanyPage(company.profileUrl, sessionId);
              companyData = { ...company, ...details, jobId: options.jobId };
            } catch (error) {
              global.logger.error(`Failed to scrape company details for ${company.name}: ${error.message}`);
              companyData = { ...company, jobId: options.jobId };
            }
          } else {
            companyData = { ...company, jobId: options.jobId };
          }

          results.push(companyData);

          // Batch save to CompanyResult collection to handle unlimited records
          if (results.length >= BATCH_SIZE) {
            try {
              await CompanyResult.insertMany(results, { ordered: false });
              const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
              global.logger.info(`Batch saved ${results.length} companies (total: ${totalScraped})`);

              // Update job progress
              if (options.jobId) {
                await ScrapingJob.updateOne(
                  { jobId: options.jobId },
                  {
                    $set: {
                      'progress.companiesScraped': totalScraped,
                      'progress.pagesProcessed': currentPage,
                      'progress.errors': errors.length
                    }
                  }
                );
              }

              results.length = 0; // Clear batch from memory
            } catch (err) {
              global.logger.error(`Failed to save batch: ${err.message}`);
            }
          }

          await this.randomDelay();
        }

        hasMorePages = hasNextPage;
        currentPage++;
        sessionRotationCounter++;

        // Rotate session periodically to avoid detection
        if (sessionRotationCounter >= SESSION_ROTATION_INTERVAL) {
          global.logger.info('Rotating session for anti-detection');
          const oldSession = this.sessions.get(sessionId);
          if (oldSession) {
            await oldSession.context.close().catch(() => {});
            this.sessions.delete(sessionId);
          }
          sessionId = await this.createSession();
          sessionRotationCounter = 0;
        }
      }

      // Save any remaining results in final batch
      if (results.length > 0 && options.jobId) {
        try {
          await CompanyResult.insertMany(results, { ordered: false });
          const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
          global.logger.info(`Final batch saved ${results.length} companies (total: ${totalScraped})`);

          await ScrapingJob.updateOne(
            { jobId: options.jobId },
            {
              $set: {
                'progress.companiesScraped': totalScraped,
                'progress.totalCompanies': totalScraped,
                'progress.pagesProcessed': currentPage - 1,
                'progress.errors': errors.length
              }
            }
          );

          results.length = 0;
        } catch (err) {
          global.logger.error(`Failed to save final batch: ${err.message}`);
        }
      }

    } finally {
      const session = this.sessions.get(sessionId);
      if (session) {
        await session.context.close();
        this.sessions.delete(sessionId);
      }
    }

    // Return count instead of full results array to save memory
    const totalCount = options.jobId ? await CompanyResult.countDocuments({ jobId: options.jobId }) : results.length;
    return {
      results: [], // Empty - data is in CompanyResult collection
      resultCount: totalCount,
      errors
    };
  }

  async close() {
    for (const [sessionId, session] of this.sessions) {
      await session.context.close();
    }
    this.sessions.clear();
    
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = DNBScraper;