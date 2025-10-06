const express = require('express');
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

// Create mock server
function createMockServer() {
  const app = express();

  app.get('/directory', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const maxPages = 10;

    const html = `
<!DOCTYPE html>
<html>
<head><title>Test Directory - Page ${page}</title></head>
<body>
  <div class="search-results">
    ${generateCompanies(page)}
  </div>
  <div class="pagination">
    ${page < maxPages ? '<a rel="next" href="?page=' + (page + 1) + '">Next</a>' : ''}
  </div>
</body>
</html>
    `;

    res.send(html);
  });

  app.get('/company/:id', (req, res) => {
    const id = req.params.id;

    const html = `
<!DOCTYPE html>
<html>
<head><title>Company ${id}</title></head>
<body>
  <div class="company-profile">
    <div class="dba-name">DBA Company ${id}</div>
    <div class="key-principal">John Doe ${id}</div>
    <div class="principal-title">CEO</div>
    <div class="industry">Technology</div>
    <div class="industry">Software</div>
    <div class="full-address">123 Main St, New York, NY 10001</div>
    <div class="phone">555-${String(id).padStart(4, '0')}</div>
    <a href="https://example-${id}.com">https://example-${id}.com</a>
  </div>
</body>
</html>
    `;

    res.send(html);
  });

  return app;
}

function generateCompanies(page) {
  let html = '';
  const companiesPerPage = 20;
  const startId = (page - 1) * companiesPerPage;

  for (let i = 0; i < companiesPerPage; i++) {
    const id = startId + i;
    html += `
    <div class="search-result-item">
      <h3 class="company-name">
        <a href="http://localhost:9999/company/${id}">Test Company ${id}</a>
      </h3>
      <div class="location">New York, NY</div>
      <div class="revenue">$${(Math.random() * 10 + 1).toFixed(1)}M</div>
    </div>
    `;
  }

  return html;
}

async function runTest() {
  // Start mock server
  const app = createMockServer();
  const server = app.listen(9999, () => {
    global.logger.info('Mock server started on port 9999');
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  const scraper = new DNBScraper({
    headless: true,
    maxConcurrency: 3,
    minDelay: 500, // Faster for testing
    maxDelay: 1000,
    retryAttempts: 3,
    timeout: 10000
  });

  try {
    global.logger.info('Initializing scraper...');
    await scraper.initialize();
    global.logger.info('Scraper initialized successfully');

    global.logger.info('Starting continuous scrape test for 10 pages...');
    const startTime = Date.now();

    const { results, errors } = await scraper.scrapeDirectory('http://localhost:9999/directory', {
      maxPages: 10,
      expectedCount: 200
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    global.logger.info('='.repeat(60));
    global.logger.info('SCRAPING TEST COMPLETED');
    global.logger.info('='.repeat(60));
    global.logger.info(`Total time: ${duration} seconds`);
    global.logger.info(`Companies scraped: ${results.length}`);
    global.logger.info(`Expected companies: 200 (10 pages × 20 companies)`);
    global.logger.info(`Errors encountered: ${errors.length}`);

    if (errors.length > 0) {
      global.logger.error('Errors:');
      errors.forEach((err, idx) => {
        global.logger.error(`  ${idx + 1}. ${JSON.stringify(err)}`);
      });
    }

    if (results.length > 0) {
      global.logger.info('Sample results (first 5):');
      results.slice(0, 5).forEach((company, idx) => {
        global.logger.info(`  ${idx + 1}. ${company.name} - ${company.location} - ${company.revenue}`);
        if (company.keyPrincipal) {
          global.logger.info(`      Principal: ${company.keyPrincipal} (${company.principalTitle})`);
        }
      });
    }

    global.logger.info('='.repeat(60));

    // Calculate metrics
    const expectedTotal = 200;
    const successRate = ((results.length / expectedTotal) * 100).toFixed(2);
    const errorRate = ((errors.length / 10) * 100).toFixed(2); // 10 pages total

    global.logger.info(`Data capture rate: ${successRate}%`);
    global.logger.info(`Error rate: ${errorRate}%`);

    // Check if test passed
    let testPassed = true;
    const issues = [];

    if (results.length < 190) { // Allow 5% margin
      testPassed = false;
      issues.push(`Low data capture: ${results.length}/200 (${successRate}%)`);
    }

    if (errors.length > 1) { // Allow max 1 error
      testPassed = false;
      issues.push(`Too many errors: ${errors.length}`);
    }

    // Check if detailed data was scraped
    const companiesWithDetails = results.filter(c => c.keyPrincipal && c.phone).length;
    const detailRate = ((companiesWithDetails / results.length) * 100).toFixed(2);
    global.logger.info(`Companies with detailed data: ${companiesWithDetails}/${results.length} (${detailRate}%)`);

    if (companiesWithDetails < results.length * 0.95) {
      testPassed = false;
      issues.push(`Low detail capture rate: ${detailRate}%`);
    }

    global.logger.info('='.repeat(60));
    if (testPassed) {
      global.logger.info('✓ TEST PASSED: All checks successful!');
      global.logger.info('  - Data capture rate >= 95%');
      global.logger.info('  - Error rate <= 10%');
      global.logger.info('  - Detail capture rate >= 95%');
    } else {
      global.logger.warn('✗ TEST FAILED - Issues found:');
      issues.forEach(issue => global.logger.warn(`  - ${issue}`));
    }
    global.logger.info('='.repeat(60));

    await scraper.close();
    server.close();

    process.exit(testPassed ? 0 : 1);

  } catch (error) {
    global.logger.error(`Test failed with error: ${error.message}`);
    global.logger.error(error.stack);
    await scraper.close();
    server.close();
    process.exit(1);
  }
}

// Run the test
runTest();
