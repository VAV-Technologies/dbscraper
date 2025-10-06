const { v4: uuidv4 } = require('uuid');
const ScrapingJob = require('../models/ScrapingJob');
const CompanyResult = require('../models/CompanyResult');
const DNBScraper = require('../scraper/dnbScraper');
const DNBScraperStealth = require('../scraper/dnbScraperStealth');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs').promises;
const robotsChecker = require('../utils/robotsChecker');

const activeScrapers = new Map();

exports.startScraping = async (req, res) => {
  try {
    const { url, expectedCount, options = {}, proxies = [] } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate proxies format if provided
    if (proxies && proxies.length > 0) {
      const invalidProxies = proxies.filter(proxy => {
        const proxyRegex = /^(https?|socks5):\/\/([^:]+:[^@]+@)?[^:]+:\d+$/;
        return !proxyRegex.test(proxy);
      });

      if (invalidProxies.length > 0) {
        return res.status(400).json({
          error: 'Invalid proxy format',
          message: 'Proxies must be in format: http://username:password@host:port or http://host:port',
          invalidProxies
        });
      }
    }

    // Check robots.txt compliance
    const robotsCheck = await robotsChecker.canScrape(url);
    if (!robotsCheck.allowed) {
      global.logger.warn(`Robots.txt disallows scraping ${url}: ${robotsCheck.reason}`);
      return res.status(403).json({
        error: 'Scraping not allowed by robots.txt',
        reason: robotsCheck.reason
      });
    }

    if (robotsCheck.crawlDelay) {
      global.logger.info(`Robots.txt suggests crawl delay of ${robotsCheck.crawlDelay}s for ${url}`);
      options.minDelay = Math.max(options.minDelay || 3000, robotsCheck.crawlDelay * 1000);
    }
    
    const jobId = uuidv4();
    
    const job = new ScrapingJob({
      jobId,
      url,
      expectedCount: expectedCount || 0,
      status: 'pending',
      startedAt: new Date()
    });
    
    await job.save();
    
    global.scrapeQueue.add('scrape', {
      jobId,
      url,
      expectedCount,
      options,
      proxies
    });
    
    res.json({
      jobId,
      message: 'Scraping job started',
      status: 'pending'
    });
    
  } catch (error) {
    global.logger.error('Error starting scraping job:', error);
    res.status(500).json({ error: 'Failed to start scraping job' });
  }
};

exports.getStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await ScrapingJob.findOne({ jobId }).select('-results');
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      expectedCount: job.expectedCount,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorCount: job.errors.length
    });
    
  } catch (error) {
    global.logger.error('Error getting job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format = 'json', page = 1, limit = 100 } = req.query;

    const job = await ScrapingJob.findOne({ jobId });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get total count
    const totalCount = await CompanyResult.countDocuments({ jobId });

    if (format === 'csv') {
      const csvPath = path.join(__dirname, '..', 'exports', `${jobId}.csv`);
      await fs.mkdir(path.dirname(csvPath), { recursive: true });

      const csvWriter = createObjectCsvWriter({
        path: csvPath,
        header: [
          { id: 'name', title: 'Company Name' },
          { id: 'location', title: 'Location' },
          { id: 'revenue', title: 'Revenue' },
          { id: 'doingBusinessAs', title: 'DBA' },
          { id: 'keyPrincipal', title: 'Key Principal' },
          { id: 'principalTitle', title: 'Principal Title' },
          { id: 'industries', title: 'Industries' },
          { id: 'fullAddress', title: 'Full Address' },
          { id: 'phone', title: 'Phone' },
          { id: 'website', title: 'Website' },
          { id: 'profileUrl', title: 'Profile URL' }
        ]
      });

      // Stream results in batches to handle large datasets
      const batchSize = 1000;
      let skip = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await CompanyResult.find({ jobId })
          .skip(skip)
          .limit(batchSize)
          .lean();

        if (batch.length === 0) {
          hasMore = false;
        } else {
          // Format industries array as string for CSV
          const formattedBatch = batch.map(company => ({
            ...company,
            industries: Array.isArray(company.industries) ? company.industries.join(', ') : company.industries
          }));

          await csvWriter.writeRecords(formattedBatch);
          skip += batchSize;
        }
      }

      res.download(csvPath);

    } else {
      // Paginated JSON response
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const results = await CompanyResult.find({ jobId })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: 1 })
        .lean();

      res.json({
        jobId: job.jobId,
        status: job.status,
        results,
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
        errors: job.errors
      });
    }

  } catch (error) {
    global.logger.error('Error getting job results:', error);
    res.status(500).json({ error: 'Failed to get job results' });
  }
};

exports.pauseScraping = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await ScrapingJob.findOne({ jobId });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'in_progress') {
      return res.status(400).json({ error: 'Job is not in progress' });
    }

    job.status = 'paused';
    await job.save();

    res.json({
      jobId,
      message: 'Scraping job paused',
      status: 'paused'
    });

  } catch (error) {
    global.logger.error('Error pausing scraping job:', error);
    res.status(500).json({ error: 'Failed to pause scraping job' });
  }
};

exports.resumeScraping = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await ScrapingJob.findOne({ jobId });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'paused') {
      return res.status(400).json({ error: 'Job is not paused' });
    }

    job.status = 'in_progress';
    await job.save();

    // Re-add to queue to continue processing
    global.scrapeQueue.add('scrape', {
      jobId,
      url: job.url,
      expectedCount: job.expectedCount,
      options: {},
      resume: true
    });

    res.json({
      jobId,
      message: 'Scraping job resumed',
      status: 'in_progress'
    });

  } catch (error) {
    global.logger.error('Error resuming scraping job:', error);
    res.status(500).json({ error: 'Failed to resume scraping job' });
  }
};

exports.stopScraping = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await ScrapingJob.findOne({ jobId });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const scraper = activeScrapers.get(jobId);
    if (scraper) {
      await scraper.close();
      activeScrapers.delete(jobId);
    }

    job.status = 'stopped';
    job.completedAt = new Date();
    await job.save();

    res.json({
      jobId,
      message: 'Scraping job stopped',
      status: 'stopped'
    });

  } catch (error) {
    global.logger.error('Error stopping scraping job:', error);
    res.status(500).json({ error: 'Failed to stop scraping job' });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await ScrapingJob.find()
      .select('-results')
      .sort('-createdAt')
      .limit(50);
    
    res.json(jobs);
    
  } catch (error) {
    global.logger.error('Error getting jobs:', error);
    res.status(500).json({ error: 'Failed to get jobs' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const scraper = activeScrapers.get(jobId);
    if (scraper) {
      await scraper.close();
      activeScrapers.delete(jobId);
    }

    // Delete job metadata
    await ScrapingJob.deleteOne({ jobId });

    // Delete all company results for this job
    const deleteResult = await CompanyResult.deleteMany({ jobId });
    global.logger.info(`Deleted ${deleteResult.deletedCount} company results for job ${jobId}`);

    res.json({
      message: 'Job deleted successfully',
      companiesDeleted: deleteResult.deletedCount
    });

  } catch (error) {
    global.logger.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
};