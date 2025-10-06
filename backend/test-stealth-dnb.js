/**
 * Test Stealth Scraper Against DNB Bot Protection
 */

const DNBScraperStealth = require('./scraper/dnbScraperStealth');
const winston = require('winston');

global.logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function testStealth() {
  const scraper = new DNBScraperStealth({
    headless: false, // Show browser to see what happens
    minDelay: 3000,
    maxDelay: 7000,
    retryAttempts: 2
  });

  try {
    global.logger.info('='.repeat(60));
    global.logger.info('STEALTH SCRAPER TEST - DNB BOT PROTECTION');
    global.logger.info('='.repeat(60));

    await scraper.initialize();
    global.logger.info('✓ Browser initialized with stealth mode');

    const testUrl = 'https://www.dnb.com/business-directory/company-information.information.cn.html?page=8';

    global.logger.info('\nAttempting to access DNB page...');
    global.logger.info('If successful, you should see companies listed.');
    global.logger.info('If blocked, we\'ll see "Access Denied" or similar.\n');

    const sessionId = await scraper.createSession();
    global.logger.info('✓ Session created with anti-detection measures');

    // First, let's see what's actually on the page
    const scrapSession = scraper.sessions.get(sessionId);
    const pageContent = await scrapSession.page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 500),
        hasAccessDenied: document.body.innerText.includes('Access Denied'),
        hasBlocked: document.body.innerText.includes('blocked'),
        allClasses: Array.from(document.querySelectorAll('[class]')).slice(0, 20).map(el => el.className),
        linkCount: document.querySelectorAll('a').length,
        divCount: document.querySelectorAll('div').length
      };
    });

    global.logger.info('\n--- PAGE CONTENT ANALYSIS ---');
    global.logger.info(`Title: ${pageContent.title}`);
    global.logger.info(`Access Denied: ${pageContent.hasAccessDenied}`);
    global.logger.info(`Blocked: ${pageContent.hasBlocked}`);
    global.logger.info(`Links found: ${pageContent.linkCount}`);
    global.logger.info(`Divs found: ${pageContent.divCount}`);
    global.logger.info(`\nPage text (first 500 chars):\n${pageContent.bodyText}`);
    global.logger.info(`\nFirst 20 classes: ${JSON.stringify(pageContent.allClasses, null, 2)}`);

    const result = await scraper.scrapeDirectoryPage(testUrl, sessionId);

    if (result.companies && result.companies.length > 0) {
      global.logger.info('\n' + '='.repeat(60));
      global.logger.info('SUCCESS! Bot protection bypassed!');
      global.logger.info('='.repeat(60));
      global.logger.info(`Companies found: ${result.companies.length}`);
      global.logger.info('\nFirst 3 companies:');
      result.companies.slice(0, 3).forEach((company, idx) => {
        global.logger.info(`\n${idx + 1}. ${company.name}`);
        global.logger.info(`   Location: ${company.location}`);
        global.logger.info(`   Revenue: ${company.revenue || 'N/A'}`);
        global.logger.info(`   Profile: ${company.profileUrl || 'N/A'}`);
      });
      global.logger.info('\n' + '='.repeat(60));
    } else {
      global.logger.warn('\n' + '='.repeat(60));
      global.logger.warn('No companies found - might still be blocked');
      global.logger.warn('Check the browser window for error messages');
      global.logger.warn('='.repeat(60));
    }

    // Keep browser open for inspection
    global.logger.info('\nBrowser will stay open for 30 seconds for manual inspection...');
    const session = scraper.sessions.get(sessionId);
    if (session) {
      await session.page.waitForTimeout(30000);
    }

    await scraper.close();
    process.exit(0);

  } catch (error) {
    global.logger.error('\n' + '='.repeat(60));
    global.logger.error('TEST FAILED');
    global.logger.error('='.repeat(60));
    global.logger.error(`Error: ${error.message}`);
    global.logger.error('\nThis might mean:');
    global.logger.error('1. Bot protection is still detecting us');
    global.logger.error('2. Page structure is different than expected');
    global.logger.error('3. Need additional anti-detection measures');
    global.logger.error('='.repeat(60));

    await scraper.close();
    process.exit(1);
  }
}

testStealth();
