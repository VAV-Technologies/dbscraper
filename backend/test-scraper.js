const DNBScraper = require('./scraper/dnbScraper');
const winston = require('winston');

// Setup logger
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

async function testScraper() {
  const scraper = new DNBScraper({
    headless: true,
    maxConcurrency: 2,
    minDelay: 2000,
    maxDelay: 4000,
    retryAttempts: 3,
    timeout: 30000
  });

  try {
    global.logger.info('Initializing scraper...');
    await scraper.initialize();
    global.logger.info('Scraper initialized successfully');

    // Test with a public business directory (using Yelp as example)
    // NOTE: You should replace this with the actual DNB URL you want to test
    const testUrl = process.argv[2] || 'https://www.yelp.com/search?find_desc=Restaurants&find_loc=New+York%2C+NY';

    global.logger.info(`Testing scraper with URL: ${testUrl}`);
    global.logger.info('Starting continuous scrape test for 5+ pages...');

    const startTime = Date.now();
    const { results, errors } = await scraper.scrapeDirectory(testUrl, {
      maxPages: 10, // Test with 10 pages
      expectedCount: 100
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    global.logger.info('='.repeat(60));
    global.logger.info('SCRAPING TEST COMPLETED');
    global.logger.info('='.repeat(60));
    global.logger.info(`Total time: ${duration} seconds`);
    global.logger.info(`Companies scraped: ${results.length}`);
    global.logger.info(`Errors encountered: ${errors.length}`);

    if (errors.length > 0) {
      global.logger.error('Errors:');
      errors.forEach((err, idx) => {
        global.logger.error(`  ${idx + 1}. Page ${err.page}: ${err.error}`);
      });
    }

    if (results.length > 0) {
      global.logger.info('Sample results (first 3):');
      results.slice(0, 3).forEach((company, idx) => {
        global.logger.info(`  ${idx + 1}. ${company.name} - ${company.location}`);
      });
    }

    global.logger.info('='.repeat(60));

    // Calculate success rate
    const successRate = results.length > 0 ? ((results.length / (results.length + errors.length)) * 100).toFixed(2) : 0;
    global.logger.info(`Success rate: ${successRate}%`);

    if (successRate >= 95) {
      global.logger.info('✓ Test PASSED: Success rate >= 95%');
    } else {
      global.logger.warn('✗ Test NEEDS IMPROVEMENT: Success rate < 95%');
    }

    await scraper.close();

  } catch (error) {
    global.logger.error(`Test failed with error: ${error.message}`);
    global.logger.error(error.stack);
    await scraper.close();
    process.exit(1);
  }
}

// Run the test
testScraper().then(() => {
  global.logger.info('Test script completed');
  process.exit(0);
}).catch(err => {
  global.logger.error('Test script failed:', err);
  process.exit(1);
});
