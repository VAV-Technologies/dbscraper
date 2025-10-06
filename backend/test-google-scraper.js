/**
 * Test Google-based DNB Scraper
 * This bypasses DNB's bot protection by using Google search instead!
 */

const GoogleDNBScraper = require('./scraper/googleDNBScraper');
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

async function testGoogleScraper() {
  const scraper = new GoogleDNBScraper({
    delayBetweenRequests: 1000
  });

  try {
    global.logger.info('='.repeat(60));
    global.logger.info('GOOGLE-BASED DNB SCRAPER TEST');
    global.logger.info('='.repeat(60));
    global.logger.info('Strategy: Use Google to find DNB companies');
    global.logger.info('This bypasses DNB bot protection entirely!');
    global.logger.info('='.repeat(60));

    // Test 1: Search for companies
    global.logger.info('\nTest 1: Searching Google for DNB company profiles...');

    const query = 'information technology companies china';
    const companies = await scraper.searchGoogleScraping(query, 1);

    global.logger.info(`\n✓ Found ${companies.length} companies from Google!`);

    if (companies.length > 0) {
      global.logger.info('\n--- First 5 Companies Found ---\n');

      companies.slice(0, 5).forEach((company, idx) => {
        global.logger.info(`${idx + 1}. ${company.name}`);
        global.logger.info(`   Location: ${company.location || 'N/A'}`);
        global.logger.info(`   Industry: ${company.industry || 'N/A'}`);
        global.logger.info(`   Revenue: ${company.revenue || 'N/A'}`);
        global.logger.info(`   Employees: ${company.employees || 'N/A'}`);
        global.logger.info(`   Profile URL: ${company.profileUrl}`);
        global.logger.info(`   Snippet: ${company.snippet.substring(0, 150)}...`);
        global.logger.info('');
      });

      // Test 2: Try to get full profile from first company
      if (companies[0]) {
        global.logger.info('\nTest 2: Attempting to get full profile from Google Cache...');
        const fullProfile = await scraper.getCompanyFromGoogleCache(companies[0].profileUrl);

        if (fullProfile && Object.keys(fullProfile).length > 0) {
          global.logger.info('\n✓ Successfully retrieved full profile!');
          global.logger.info('Full Profile Data:');
          global.logger.info(JSON.stringify(fullProfile, null, 2));
        } else {
          global.logger.warn('\n✗ Google Cache unavailable or parsing failed');
          global.logger.info('(This is normal - not all pages are cached)');
        }
      }

      global.logger.info('\n' + '='.repeat(60));
      global.logger.info('SUCCESS! Google-based scraping works!');
      global.logger.info('='.repeat(60));
      global.logger.info('\nWhat we can get:');
      global.logger.info('✓ Company names');
      global.logger.info('✓ Locations');
      global.logger.info('✓ Industries');
      global.logger.info('✓ Revenue (sometimes)');
      global.logger.info('✓ Employee count (sometimes)');
      global.logger.info('✓ Profile URLs');
      global.logger.info('✓ Basic info from Google snippets');
      global.logger.info('\nLimitations:');
      global.logger.info('- Limited to ~100 results per search query');
      global.logger.info('- Need multiple queries to get all 700k companies');
      global.logger.info('- Full details require Google Cache (not always available)');
      global.logger.info('='.repeat(60));

    } else {
      global.logger.warn('\n✗ No companies found');
      global.logger.warn('Google might be rate-limiting or blocking');
    }

  } catch (error) {
    global.logger.error(`\nTest failed: ${error.message}`);
    global.logger.error(error.stack);
  }
}

testGoogleScraper().then(() => {
  global.logger.info('\nTest complete!');
  process.exit(0);
}).catch(err => {
  global.logger.error('Test error:', err);
  process.exit(1);
});
