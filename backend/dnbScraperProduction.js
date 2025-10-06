const { chromium } = require('playwright');

class DNBScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      maxConcurrency: options.maxConcurrency || 2,
      minDelay: options.minDelay || 3000,
      maxDelay: options.maxDelay || 8000,
      retryAttempts: options.retryAttempts || 3,
      timeout: options.timeout || 30000,
      ...options
    };
    
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0'
    ];
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
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-features=TranslateUI',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--force-color-profile=srgb',
        '--metrics-recording-only',
        '--no-first-run',
        '--enable-automation',
        '--password-store=basic',
        '--use-mock-keychain'
      ]
    });
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async createPage() {
    const context = await this.browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
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
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: () => Promise.resolve({ state: 'granted' })
        })
      });
      
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    return { page, context };
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
      }
    ];

    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    try {
      await randomAction();
    } catch (error) {
      // Ignore minor errors
    }
  }

  async randomDelay() {
    const delay = Math.random() * (this.options.maxDelay - this.options.minDelay) + this.options.minDelay;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async scrapeDirectoryPage(url) {
    const { page, context } = await this.createPage();
    
    let attempts = 0;
    while (attempts < this.options.retryAttempts) {
      try {
        console.log(`Scraping directory page: ${url} (attempt ${attempts + 1})`);
        
        await this.randomDelay();
        
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.options.timeout
        });

        await this.humanLikeBehavior(page);
        await page.waitForTimeout(2000);

        const companies = await page.evaluate(() => {
          const companyElements = document.querySelectorAll(
            '.company-list-item, .directory-result, [data-company], .business-card, .company-info, .search-result, .company-card'
          );
          
          return Array.from(companyElements).map(el => {
            const nameEl = el.querySelector('.company-name, h2, h3, h4, a[href*="/business-directory/"], .company-title, .business-name');
            const locationEl = el.querySelector('.location, .address, .company-location, .city, .region');
            const revenueEl = el.querySelector('.revenue, .sales, .company-revenue, .annual-sales');
            const linkEl = el.querySelector('a[href*="/business-directory/"]');
            
            return {
              name: nameEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              revenue: revenueEl?.textContent?.trim() || '',
              profileUrl: linkEl?.href ? new URL(linkEl.href, window.location.origin).href : '',
              scrapedAt: new Date().toISOString()
            };
          }).filter(company => company.name && company.name.length > 2);
        });

        const nextPageLink = await page.$('a[rel="next"], .pagination-next, a:has-text("Next"), .next-page');
        const hasNextPage = !!nextPageLink;
        let nextPageUrl = null;
        
        if (hasNextPage) {
          nextPageUrl = await nextPageLink.getAttribute('href');
          if (nextPageUrl && !nextPageUrl.startsWith('http')) {
            nextPageUrl = new URL(nextPageUrl, url).href;
          }
        }

        await context.close();
        
        return { 
          companies, 
          hasNextPage, 
          nextPageUrl,
          error: null 
        };
        
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed for ${url}: ${error.message}`);
        
        await context.close();
        
        if (attempts >= this.options.retryAttempts) {
          return { companies: [], hasNextPage: false, nextPageUrl: null, error: error.message };
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  async scrapeCompanyPage(url) {
    const { page, context } = await this.createPage();
    
    let attempts = 0;
    while (attempts < this.options.retryAttempts) {
      try {
        console.log(`Scraping company page: ${url}`);
        
        await this.randomDelay();
        
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.options.timeout
        });

        await this.humanLikeBehavior(page);
        await page.waitForTimeout(2000);

        const companyData = await page.evaluate(() => {
          const getText = (selectors) => {
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) return el.textContent.trim();
            }
            return '';
          };

          return {
            doingBusinessAs: getText(['.dba-name', '[data-dba]', '.doing-business-as']),
            keyPrincipal: getText(['.key-principal', '.principal-name', '.executive-name']),
            principalTitle: getText(['.principal-title', '.executive-title', '.job-title']),
            industries: Array.from(document.querySelectorAll('.industry, .industry-tag')).map(el => el.textContent.trim()),
            fullAddress: getText(['.full-address', '.company-address', '.street-address']),
            phone: getText(['.phone', '.phone-number', 'a[href^="tel:"]']),
            website: document.querySelector('a[href^="http"]:not([href*="dnb.com"])')?.href || '',
            scrapedAt: new Date().toISOString()
          };
        });

        await context.close();
        return { ...companyData, error: null };
        
      } catch (error) {
        attempts++;
        console.error(`Company page attempt ${attempts} failed: ${error.message}`);
        
        await context.close();
        
        if (attempts >= this.options.retryAttempts) {
          return { error: error.message };
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }

  async scrapeDirectory(directoryUrl, options = {}) {
    const results = [];
    const errors = [];
    let currentPage = 1;
    let currentUrl = directoryUrl;
    let hasMorePages = true;
    
    try {
      while (hasMorePages && (!options.maxPages || currentPage <= options.maxPages)) {
        console.log(`Scraping directory page ${currentPage}: ${currentUrl}`);
        
        if (global.io) {
          global.io.emit('scrapeProgress', {
            status: 'scraping_directory',
            currentPage,
            url: currentUrl
          });
        }
        
        const { companies, hasNextPage, nextPageUrl, error } = await this.scrapeDirectoryPage(currentUrl);
        
        if (error) {
          errors.push({ page: currentPage, error, url: currentUrl });
          console.error(`Page ${currentPage} failed: ${error}`);
          break;
        }
        
        console.log(`Found ${companies.length} companies on page ${currentPage}`);
        
        for (let i = 0; i < companies.length; i++) {
          const company = companies[i];
          
          if (global.io) {
            global.io.emit('scrapeProgress', {
              status: 'scraping_company',
              companyName: company.name,
              progress: results.length + 1,
              total: options.expectedCount || 'unknown'
            });
          }
          
          if (company.profileUrl && company.profileUrl.includes('/business-directory/')) {
            try {
              const details = await this.scrapeCompanyPage(company.profileUrl);
              if (!details.error) {
                results.push({ ...company, ...details });
              } else {
                results.push(company);
              }
            } catch (error) {
              console.error(`Failed details for ${company.name}: ${error.message}`);
              results.push(company);
            }
          } else {
            results.push(company);
          }
          
          await this.randomDelay();
        }
        
        hasMorePages = hasNextPage && nextPageUrl;
        if (hasMorePages) {
          currentUrl = nextPageUrl;
          currentPage++;
          await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        }
      }
    } catch (error) {
      console.error(`Directory scraping failed: ${error.message}`);
      errors.push({ page: currentPage, error: error.message, url: currentUrl });
    }
    
    return { results, errors };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = DNBScraper;