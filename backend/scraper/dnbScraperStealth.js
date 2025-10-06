const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const UserAgent = require('user-agents');
const PQueue = require('p-queue').default;

class DNBScraperStealth {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      maxConcurrency: options.maxConcurrency || 1, // Lower for stealth
      minDelay: options.minDelay || 5000, // Longer delays
      maxDelay: options.maxDelay || 15000,
      retryAttempts: options.retryAttempts || 3,
      timeout: options.timeout || 60000,
      ...options
    };

    this.queue = new PQueue({ concurrency: this.options.maxConcurrency });
    this.sessions = new Map();
    this.proxies = options.proxies || [];
    this.currentProxyIndex = 0;
  }

  async initialize() {
    const launchOptions = {
      headless: this.options.headless,
      channel: 'chrome', // Use real Chrome instead of Chromium
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--start-maximized',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--lang=en-US,en',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    };

    // Add proxy if configured
    if (this.proxies && this.proxies.length > 0) {
      const proxy = this.getNextProxy();
      launchOptions.proxy = {
        server: proxy.server,
        username: proxy.username,
        password: proxy.password
      };
      global.logger?.info(`Using proxy: ${proxy.server}`);
    }

    this.browser = await chromium.launch(launchOptions);
  }

  getNextProxy() {
    if (!this.proxies || this.proxies.length === 0) {
      return null;
    }

    const proxy = this.proxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;

    // Parse proxy string with authentication: http://user:pass@host:port
    const matchWithAuth = proxy.match(/^(https?|socks5):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/);
    if (matchWithAuth) {
      return {
        server: `${matchWithAuth[1]}://${matchWithAuth[4]}:${matchWithAuth[5]}`,
        username: matchWithAuth[2],
        password: matchWithAuth[3]
      };
    }

    // Parse proxy string without authentication: http://host:port
    const matchNoAuth = proxy.match(/^(https?|socks5):\/\/([^:]+):(\d+)$/);
    if (matchNoAuth) {
      return {
        server: `${matchNoAuth[1]}://${matchNoAuth[2]}:${matchNoAuth[3]}`
      };
    }

    // Fallback: treat as raw proxy string
    global.logger?.warn(`Proxy format not recognized, using as-is: ${proxy}`);
    return { server: proxy };
  }

  async createSession() {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    const context = await this.browser.newContext({
      userAgent: userAgent,
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
      }
    });

    const page = await context.newPage();

    // Advanced anti-detection scripts
    await page.addInitScript(() => {
      // Remove webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          {
            0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: Plugin },
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Plugin"
          },
          {
            0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "", enabledPlugin: Plugin },
            description: "",
            filename: "internal-pdf-viewer",
            length: 1,
            name: "Chrome PDF Viewer"
          },
          {
            0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: Plugin },
            1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: Plugin },
            description: "",
            filename: "internal-nacl-plugin",
            length: 2,
            name: "Native Client"
          }
        ]
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Add chrome object
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Override the permissions property
      Object.defineProperty(navigator, 'permissions', {
        get: () => ({
          query: (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: 'granted' }) :
              Promise.resolve({ state: 'granted' })
          )
        })
      });

      // Add realistic screen properties
      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });

      // Mock battery API
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        })
      });

      // Mock connection
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        })
      });

      // Mock mediaDevices
      Object.defineProperty(navigator, 'mediaDevices', {
        get: () => ({
          enumerateDevices: () => Promise.resolve([
            { kind: 'audioinput', deviceId: 'default', label: '', groupId: '' },
            { kind: 'videoinput', deviceId: 'default', label: '', groupId: '' },
            { kind: 'audiooutput', deviceId: 'default', label: '', groupId: '' }
          ])
        })
      });

      // Remove automation indicators
      delete navigator.__proto__.webdriver;

      // Mock hardwareConcurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });

      // Mock deviceMemory
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    });

    const sessionId = Date.now().toString();
    this.sessions.set(sessionId, { context, page });

    return sessionId;
  }

  async advancedHumanBehavior(page) {
    const actions = [
      // Random mouse movements
      async () => {
        const x = Math.random() * 1920;
        const y = Math.random() * 1080;
        const steps = Math.floor(Math.random() * 30) + 20; // 20-50 steps
        await page.mouse.move(x, y, { steps });
        await new Promise(r => setTimeout(r, Math.random() * 500 + 100));
      },
      // Random scrolling
      async () => {
        const scrollAmount = Math.floor(Math.random() * 500) + 100;
        await page.evaluate((amount) => {
          window.scrollBy({
            top: amount,
            behavior: 'smooth'
          });
        }, scrollAmount);
        await new Promise(r => setTimeout(r, Math.random() * 1000 + 500));
      },
      // Mouse wiggle
      async () => {
        const startX = Math.random() * 1920;
        const startY = Math.random() * 1080;
        for (let i = 0; i < 5; i++) {
          await page.mouse.move(
            startX + (Math.random() - 0.5) * 50,
            startY + (Math.random() - 0.5) * 50,
            { steps: 3 }
          );
          await new Promise(r => setTimeout(r, Math.random() * 100 + 50));
        }
      },
      // Read pause (simulate reading)
      async () => {
        await new Promise(r => setTimeout(r, Math.random() * 3000 + 2000));
      }
    ];

    // Execute 2-3 random actions
    const numActions = Math.floor(Math.random() * 2) + 2;
    for (let i = 0; i < numActions; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      await action();
    }
  }

  async randomDelay() {
    const delay = Math.random() * (this.options.maxDelay - this.options.minDelay) + this.options.minDelay;
    global.logger?.info(`Waiting ${(delay / 1000).toFixed(1)}s before next action...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async detectCaptcha(page) {
    try {
      const captchaIndicators = await page.evaluate(() => {
        const captchaSelectors = [
          'iframe[src*="recaptcha"]',
          'iframe[src*="captcha"]',
          'iframe[src*="hcaptcha"]',
          '.g-recaptcha',
          '#captcha',
          '[class*="captcha"]',
          '[id*="captcha"]',
          '[class*="challenge"]'
        ];

        for (const selector of captchaSelectors) {
          if (document.querySelector(selector)) {
            return { detected: true, type: selector };
          }
        }

        const bodyText = document.body.innerText.toLowerCase();
        if (bodyText.includes('verify you are human') ||
            bodyText.includes('captcha') ||
            bodyText.includes('security check') ||
            bodyText.includes('access denied') ||
            bodyText.includes('blocked')) {
          return { detected: true, type: 'text-based', text: bodyText.substring(0, 200) };
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

        global.logger?.info(`Navigating to: ${url}`);

        // Navigate with realistic behavior
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: this.options.timeout
        });

        // Wait for page to fully load
        await page.waitForTimeout(5000);

        // Check for CAPTCHA/blocking
        const captchaCheck = await this.detectCaptcha(page);
        if (captchaCheck.detected) {
          global.logger?.error(`Bot protection detected: ${captchaCheck.type}`);
          global.logger?.error(`Page text: ${captchaCheck.text || 'N/A'}`);

          // Save screenshot for debugging
          await page.screenshot({ path: `blocked-${Date.now()}.png` });

          if (global.io) {
            global.io.emit('captchaDetected', {
              url,
              type: captchaCheck.type,
              timestamp: new Date().toISOString()
            });
          }
          throw new Error(`Bot protection detected: ${captchaCheck.type}`);
        }

        // Perform human-like actions
        await this.advancedHumanBehavior(page);

        // Wait for content
        await page.waitForTimeout(2000);

        // Try to find company listings
        const companies = await page.evaluate(() => {
          // Look for DNB-specific selectors (these are educated guesses - may need adjustment)
          const companyElements = document.querySelectorAll(
            '[class*="company-card"], [class*="business-card"], [class*="search-result"], [class*="company-info"], li[class*="company"], div[class*="result-item"]'
          );

          if (companyElements.length === 0) {
            console.warn('No company elements found');
          }

          return Array.from(companyElements).map(el => {
            // Try multiple selector patterns
            const nameEl = el.querySelector('[class*="company-name"], [class*="business-name"], h2, h3, a[href*="/company"]');
            const locationEl = el.querySelector('[class*="location"], [class*="address"], [class*="city"]');
            const revenueEl = el.querySelector('[class*="revenue"], [class*="sales"], [class*="annual"]');
            const linkEl = el.querySelector('a[href*="/business-directory"], a[href*="/company"]');

            return {
              name: nameEl?.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              revenue: revenueEl?.textContent?.trim() || '',
              profileUrl: linkEl?.href || '',
              scrapedAt: new Date().toISOString()
            };
          }).filter(company => company.name);
        });

        global.logger?.info(`Found ${companies.length} companies on page`);

        // Find next page
        const hasNextPage = await page.evaluate(() => {
          const nextSelectors = [
            'a[rel="next"]',
            '[class*="pagination"] a:has-text("Next")',
            '[class*="next-page"]',
            'a[aria-label*="Next"]',
            'button[aria-label*="Next"]'
          ];

          for (const selector of nextSelectors) {
            try {
              const el = document.querySelector(selector);
              if (el && !el.classList.contains('disabled') && !el.hasAttribute('disabled')) {
                return true;
              }
            } catch (e) {}
          }
          return false;
        });

        return { companies, hasNextPage, error: null };

      } catch (error) {
        attempts++;
        global.logger?.error(`Attempt ${attempts} failed for ${url}: ${error.message}`);

        if (attempts >= this.options.retryAttempts) {
          throw error;
        }

        // Longer wait between retries
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 5000));
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

        await page.waitForTimeout(3000);
        await this.advancedHumanBehavior(page);

        const companyData = await page.evaluate(() => {
          const getData = (selectors) => {
            for (const selector of selectors) {
              const el = document.querySelector(selector);
              if (el) return el.textContent.trim();
            }
            return '';
          };

          return {
            doingBusinessAs: getData(['[class*="dba"]', '[class*="trade-name"]', '[class*="doing-business"]']),
            keyPrincipal: getData(['[class*="principal"]', '[class*="executive"]', '[class*="contact-name"]']),
            principalTitle: getData(['[class*="title"]', '[class*="job-title"]', '[class*="position"]']),
            industries: Array.from(document.querySelectorAll('[class*="industry"], [class*="sic"], [class*="naics"]')).map(el => el.textContent.trim()),
            fullAddress: getData(['[class*="full-address"]', '[class*="street-address"]', 'address']),
            phone: getData(['[class*="phone"]', 'a[href^="tel:"]', '[class*="telephone"]']),
            website: document.querySelector('a[href^="http"]:not([href*="dnb.com"])')?.href || '',
            scrapedAt: new Date().toISOString()
          };
        });

        return { ...companyData, error: null };

      } catch (error) {
        attempts++;
        global.logger?.error(`Attempt ${attempts} failed for company ${url}: ${error.message}`);

        if (attempts >= this.options.retryAttempts) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 5000));
      }
    }
  }

  // Same scrapeDirectory method as original but with stealth
  async scrapeDirectory(directoryUrl, options = {}) {
    const results = [];
    const errors = [];
    let currentPage = 1;
    let hasMorePages = true;
    let sessionRotationCounter = 0;
    const SESSION_ROTATION_INTERVAL = 5; // Rotate more frequently for stealth
    const BATCH_SIZE = 50;

    let sessionId = await this.createSession();
    const ScrapingJob = require('../models/ScrapingJob');
    const CompanyResult = require('../models/CompanyResult');

    try {
      while (hasMorePages && (!options.maxPages || currentPage <= options.maxPages)) {
        if (options.jobId) {
          const job = await ScrapingJob.findOne({ jobId: options.jobId });
          if (job && job.status === 'paused') {
            global.logger?.info(`Job ${options.jobId} paused, stopping scrape loop`);
            break;
          }
        }

        const url = new URL(directoryUrl);
        url.searchParams.set('page', currentPage);
        const pageUrl = url.toString();

        global.logger?.info(`Scraping directory page ${currentPage}: ${pageUrl}`);

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
          global.logger?.error(`Failed to scrape page ${currentPage}: ${error.message}`);
          errors.push({ page: currentPage, error: error.message, url: pageUrl });

          if (error.message.includes('Target closed') || error.message.includes('Session closed')) {
            global.logger?.info('Session lost, recreating...');
            const session = this.sessions.get(sessionId);
            if (session) {
              await session.context.close().catch(() => {});
              this.sessions.delete(sessionId);
            }
            sessionId = await this.createSession();
          }

          currentPage++;
          continue;
        }

        const { companies, hasNextPage, error } = pageResult;

        if (error) {
          errors.push({ page: currentPage, error, url: pageUrl });
          break;
        }

        for (let i = 0; i < companies.length; i++) {
          if (options.jobId) {
            const job = await ScrapingJob.findOne({ jobId: options.jobId });
            if (job && job.status === 'paused') {
              global.logger?.info(`Job ${options.jobId} paused, stopping company scraping`);
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
              global.logger?.error(`Failed to scrape company details for ${company.name}: ${error.message}`);
              companyData = { ...company, jobId: options.jobId };
            }
          } else {
            companyData = { ...company, jobId: options.jobId };
          }

          results.push(companyData);

          if (results.length >= BATCH_SIZE) {
            try {
              await CompanyResult.insertMany(results, { ordered: false });
              const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
              global.logger?.info(`Batch saved ${results.length} companies (total: ${totalScraped})`);

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

              results.length = 0;
            } catch (err) {
              global.logger?.error(`Failed to save batch: ${err.message}`);
            }
          }

          await this.randomDelay();
        }

        hasMorePages = hasNextPage;
        currentPage++;
        sessionRotationCounter++;

        if (sessionRotationCounter >= SESSION_ROTATION_INTERVAL) {
          global.logger?.info('Rotating session for anti-detection');
          const oldSession = this.sessions.get(sessionId);
          if (oldSession) {
            await oldSession.context.close().catch(() => {});
            this.sessions.delete(sessionId);
          }
          sessionId = await this.createSession();
          sessionRotationCounter = 0;
        }
      }

      if (results.length > 0 && options.jobId) {
        try {
          await CompanyResult.insertMany(results, { ordered: false });
          const totalScraped = await CompanyResult.countDocuments({ jobId: options.jobId });
          global.logger?.info(`Final batch saved ${results.length} companies (total: ${totalScraped})`);

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
          global.logger?.error(`Failed to save final batch: ${err.message}`);
        }
      }

    } finally {
      const session = this.sessions.get(sessionId);
      if (session) {
        await session.context.close();
        this.sessions.delete(sessionId);
      }
    }

    const totalCount = options.jobId ? await CompanyResult.countDocuments({ jobId: options.jobId }) : results.length;
    return {
      results: [],
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

module.exports = DNBScraperStealth;
