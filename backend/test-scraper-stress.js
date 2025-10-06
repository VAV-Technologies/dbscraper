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

// Create mock server with larger dataset
function createMockServer() {
  const app = express();

  app.get('/directory', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const maxPages = 50; // Increased to 50 pages for stress test

    // Simulate occasional slow responses
    const delay = Math.random() > 0.9 ? 2000 : 0;

    setTimeout(() => {
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
    }, delay);
  });

  app.get('/company/:id', (req, res) => {
    const id = req.params.id;

    // Simulate occasional slow responses
    const delay = Math.random() > 0.9 ? 2000 : 0;

    setTimeout(() => {
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
    }, delay);
  });

  return app;
}

function generateCompanies(page) {
  let html = '';
  const companiesPerPage = 25; // More companies per page
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

async function runStressTest() {
  const app = createMockServer();
  const server = app.listen(9999, () => {
    global.logger.info('Mock server started on port 9999');
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  const scraper = new DNBScraper({
    headless: true,
    maxConcurrency: 3,
    minDelay: 300, // Faster for stress test
    maxDelay: 800,
    retryAttempts: 3,
    timeout: 15000
  });

  try {
    global.logger.info('='.repeat(60));
    global.logger.info('STRESS TEST: 30 pages, 750 companies');
    global.logger.info('='.repeat(60));

    await scraper.initialize();
    global.logger.info('Scraper initialized');

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    const { results, errors } = await scraper.scrapeDirectory('http://localhost:9999/directory', {
      maxPages: 30, // Test with 30 pages
      expectedCount: 750
    });

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const memoryIncrease = ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2);

    global.logger.info('='.repeat(60));
    global.logger.info('STRESS TEST RESULTS');
    global.logger.info('='.repeat(60));
    global.logger.info(`Duration: ${duration}s (${(results.length / (duration / 60)).toFixed(2)} companies/min)`);
    global.logger.info(`Companies scraped: ${results.length}/750`);
    global.logger.info(`Errors: ${errors.length}`);
    global.logger.info(`Memory increase: ${memoryIncrease}MB`);
    global.logger.info(`Avg time per company: ${(duration / results.length).toFixed(2)}s`);

    const companiesWithDetails = results.filter(c => c.keyPrincipal && c.phone).length;
    const dataQuality = ((companiesWithDetails / results.length) * 100).toFixed(2);

    global.logger.info(`Data quality: ${dataQuality}% (companies with full details)`);

    if (errors.length > 0) {
      global.logger.error(`\nErrors by page:`);
      const errorsByPage = {};
      errors.forEach(err => {
        errorsByPage[err.page] = (errorsByPage[err.page] || 0) + 1;
      });
      Object.entries(errorsByPage).forEach(([page, count]) => {
        global.logger.error(`  Page ${page}: ${count} error(s)`);
      });
    }

    global.logger.info('='.repeat(60));

    // Test criteria
    const successRate = ((results.length / 750) * 100).toFixed(2);
    const errorRate = ((errors.length / 30) * 100).toFixed(2);

    let passed = true;
    const issues = [];

    if (parseFloat(successRate) < 95) {
      passed = false;
      issues.push(`Low success rate: ${successRate}%`);
    }

    if (parseFloat(errorRate) > 10) {
      passed = false;
      issues.push(`High error rate: ${errorRate}%`);
    }

    if (parseFloat(dataQuality) < 95) {
      passed = false;
      issues.push(`Low data quality: ${dataQuality}%`);
    }

    if (parseFloat(memoryIncrease) > 500) {
      passed = false;
      issues.push(`High memory usage: ${memoryIncrease}MB`);
    }

    if (passed) {
      global.logger.info('✓ STRESS TEST PASSED');
      global.logger.info('  - Success rate >= 95%');
      global.logger.info('  - Error rate <= 10%');
      global.logger.info('  - Data quality >= 95%');
      global.logger.info('  - Memory usage < 500MB');
    } else {
      global.logger.warn('✗ STRESS TEST FAILED');
      issues.forEach(issue => global.logger.warn(`  - ${issue}`));
    }

    global.logger.info('='.repeat(60));

    await scraper.close();
    server.close();

    process.exit(passed ? 0 : 1);

  } catch (error) {
    global.logger.error(`Stress test failed: ${error.message}`);
    global.logger.error(error.stack);
    await scraper.close();
    server.close();
    process.exit(1);
  }
}

runStressTest();
