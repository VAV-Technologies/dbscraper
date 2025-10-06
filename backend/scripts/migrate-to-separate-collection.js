/**
 * Migration Script: Move embedded results to separate CompanyResult collection
 *
 * This script migrates existing ScrapingJob documents that have embedded results
 * to the new architecture where results are stored in a separate collection.
 *
 * Run with: node scripts/migrate-to-separate-collection.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ScrapingJob = require('../models/ScrapingJob');
const CompanyResult = require('../models/CompanyResult');

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnb_scraper', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Find all jobs with embedded results (old schema)
    // Note: Old schema had 'results' array, new schema doesn't
    const jobsWithResults = await mongoose.connection.db
      .collection('scrapingjobs')
      .find({ results: { $exists: true, $ne: [] } })
      .toArray();

    console.log(`Found ${jobsWithResults.length} jobs with embedded results to migrate`);

    let totalMigrated = 0;
    let totalCompanies = 0;

    for (const job of jobsWithResults) {
      console.log(`\nMigrating job ${job.jobId}...`);
      console.log(`  Companies in job: ${job.results.length}`);

      if (job.results.length === 0) {
        console.log('  Skipping - no results');
        continue;
      }

      // Add jobId to each company result
      const companiesWithJobId = job.results.map(company => ({
        ...company,
        jobId: job.jobId,
        scrapedAt: company.scrapedAt || job.startedAt || new Date()
      }));

      // Insert in batches to avoid memory issues
      const batchSize = 1000;
      for (let i = 0; i < companiesWithJobId.length; i += batchSize) {
        const batch = companiesWithJobId.slice(i, i + batchSize);
        await CompanyResult.insertMany(batch, { ordered: false });
        console.log(`  Migrated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companiesWithJobId.length / batchSize)}`);
      }

      // Verify migration
      const migratedCount = await CompanyResult.countDocuments({ jobId: job.jobId });
      console.log(`  Verified: ${migratedCount} companies in CompanyResult collection`);

      // Update the job document to remove embedded results
      await mongoose.connection.db
        .collection('scrapingjobs')
        .updateOne(
          { _id: job._id },
          {
            $unset: { results: "" },
            $set: {
              'progress.companiesScraped': migratedCount,
              'progress.totalCompanies': migratedCount,
              migratedAt: new Date()
            }
          }
        );

      console.log(`  ✓ Job ${job.jobId} migrated successfully`);
      totalMigrated++;
      totalCompanies += migratedCount;
    }

    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Jobs migrated: ${totalMigrated}`);
    console.log(`Total companies migrated: ${totalCompanies}`);
    console.log('='.repeat(60));

    // Verify no embedded results remain
    const remainingEmbedded = await mongoose.connection.db
      .collection('scrapingjobs')
      .countDocuments({ results: { $exists: true, $ne: [] } });

    if (remainingEmbedded > 0) {
      console.warn(`\n⚠ Warning: ${remainingEmbedded} jobs still have embedded results`);
    } else {
      console.log('\n✓ All jobs successfully migrated to new architecture');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('Migration failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log('\nMigration script completed');
  process.exit(0);
});
