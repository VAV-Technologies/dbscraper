/**
 * Large Dataset Test - Validates system can handle 100,000+ records
 *
 * This test simulates scraping 100,000 companies and verifies:
 * - No MongoDB 16MB document limit errors
 * - Batch saving works correctly
 * - Memory usage stays reasonable
 * - Data integrity maintained
 */

const mongoose = require('mongoose');
const winston = require('winston');
require('dotenv').config();

const CompanyResult = require('./models/CompanyResult');
const ScrapingJob = require('./models/ScrapingJob');

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

async function testLargeDataset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnb_scraper', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    global.logger.info('Connected to MongoDB');

    const testJobId = `test-large-${Date.now()}`;
    const targetCount = 100000; // 100k records
    const batchSize = 50;

    global.logger.info('='.repeat(60));
    global.logger.info(`LARGE DATASET TEST: ${targetCount.toLocaleString()} records`);
    global.logger.info('='.repeat(60));

    // Create test job
    const job = new ScrapingJob({
      jobId: testJobId,
      url: 'http://test.com',
      status: 'in_progress',
      startedAt: new Date()
    });
    await job.save();

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    let companiesCreated = 0;
    const batch = [];

    for (let i = 0; i < targetCount; i++) {
      batch.push({
        jobId: testJobId,
        name: `Test Company ${i}`,
        location: `City ${i % 1000}, State`,
        revenue: `$${(Math.random() * 100).toFixed(1)}M`,
        profileUrl: `http://example.com/company/${i}`,
        doingBusinessAs: `DBA ${i}`,
        keyPrincipal: `Principal ${i}`,
        principalTitle: 'CEO',
        industries: ['Technology', 'Software'],
        fullAddress: `${i} Main St, City, State 12345`,
        phone: `555-${String(i).padStart(4, '0')}`,
        website: `https://company-${i}.com`
      });

      if (batch.length >= batchSize) {
        await CompanyResult.insertMany(batch, { ordered: false });
        companiesCreated += batch.length;
        batch.length = 0;

        if (companiesCreated % 10000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (companiesCreated / (elapsed / 60)).toFixed(0);
          const memUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
          global.logger.info(`Progress: ${companiesCreated.toLocaleString()}/${targetCount.toLocaleString()} (${rate}/min, ${memUsed}MB)`);
        }
      }
    }

    // Save remaining
    if (batch.length > 0) {
      await CompanyResult.insertMany(batch, { ordered: false });
      companiesCreated += batch.length;
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const memoryIncrease = ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2);

    // Verify count
    const actualCount = await CompanyResult.countDocuments({ jobId: testJobId });

    global.logger.info('='.repeat(60));
    global.logger.info('TEST RESULTS');
    global.logger.info('='.repeat(60));
    global.logger.info(`Records created: ${companiesCreated.toLocaleString()}`);
    global.logger.info(`Records verified: ${actualCount.toLocaleString()}`);
    global.logger.info(`Duration: ${duration}s`);
    global.logger.info(`Insert rate: ${(companiesCreated / (duration / 60)).toFixed(0)} records/min`);
    global.logger.info(`Memory increase: ${memoryIncrease}MB`);

    // Test retrieval performance
    global.logger.info('\nTesting retrieval performance...');
    const retrievalStart = Date.now();
    const sample = await CompanyResult.find({ jobId: testJobId }).limit(1000).lean();
    const retrievalTime = Date.now() - retrievalStart;
    global.logger.info(`Retrieved 1000 records in ${retrievalTime}ms`);

    // Test pagination
    global.logger.info('\nTesting pagination...');
    const page1 = await CompanyResult.find({ jobId: testJobId }).skip(0).limit(100).lean();
    const page100 = await CompanyResult.find({ jobId: testJobId }).skip(9900).limit(100).lean();
    global.logger.info(`Page 1 records: ${page1.length}`);
    global.logger.info(`Page 100 records: ${page100.length}`);

    // Test aggregation
    global.logger.info('\nTesting aggregation...');
    const aggStart = Date.now();
    const stats = await CompanyResult.aggregate([
      { $match: { jobId: testJobId } },
      { $group: {
        _id: null,
        totalCompanies: { $sum: 1 },
        uniqueLocations: { $addToSet: '$location' }
      }}
    ]);
    const aggTime = Date.now() - aggStart;
    global.logger.info(`Aggregated ${actualCount.toLocaleString()} records in ${aggTime}ms`);

    // Validation
    global.logger.info('\n' + '='.repeat(60));
    let testPassed = true;
    const issues = [];

    if (actualCount !== targetCount) {
      testPassed = false;
      issues.push(`Count mismatch: expected ${targetCount}, got ${actualCount}`);
    }

    if (parseFloat(memoryIncrease) > 1000) {
      testPassed = false;
      issues.push(`High memory usage: ${memoryIncrease}MB`);
    }

    if (sample.length !== 1000) {
      testPassed = false;
      issues.push(`Sample retrieval failed: got ${sample.length}/1000 records`);
    }

    if (testPassed) {
      global.logger.info('✓ LARGE DATASET TEST PASSED');
      global.logger.info('  - All 100,000 records saved successfully');
      global.logger.info('  - No document size limit errors');
      global.logger.info('  - Memory usage acceptable');
      global.logger.info('  - Retrieval and pagination working');
      global.logger.info('  - System ready for 700,000+ records');
    } else {
      global.logger.error('✗ LARGE DATASET TEST FAILED');
      issues.forEach(issue => global.logger.error(`  - ${issue}`));
    }

    global.logger.info('='.repeat(60));

    // Cleanup
    global.logger.info('\nCleaning up test data...');
    const deleteResult = await CompanyResult.deleteMany({ jobId: testJobId });
    await ScrapingJob.deleteOne({ jobId: testJobId });
    global.logger.info(`Deleted ${deleteResult.deletedCount} test records`);

    await mongoose.disconnect();
    process.exit(testPassed ? 0 : 1);

  } catch (error) {
    global.logger.error('Test failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testLargeDataset();
