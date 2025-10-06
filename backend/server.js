const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const socketIO = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');
const Bull = require('bull');
const winston = require('winston');
require('dotenv').config();

const scraperController = require('./controllers/scraperController');
const scraperRoutes = require('./routes/scraperRoutes');

const app = express();
app.set('trust proxy', true);
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'dnb-scraper' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1 // Trust first proxy (nginx)
});

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use('/api', limiter);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dnb_scraper', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Configure Bull queue with proper Redis settings
let queueConfig;
if (process.env.REDIS_URL) {
  queueConfig = {
    redis: {
      port: 6379,
      host: 'classic-tetra-19885.upstash.io',
      password: 'AU2tAAIncDIzZmIzZDhjYjlmMTQ0ODU3YWNhMjEyYzlhMDljYjkzMnAyMTk4ODU',
      tls: {}
    }
  };
} else {
  queueConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  };
}

const scrapeQueue = new Bull('scrape-queue', queueConfig);

app.use('/api/scrape', scraperRoutes);

io.on('connection', (socket) => {
  logger.info('New client connected');
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

global.io = io;
global.logger = logger;
global.scrapeQueue = scrapeQueue;

// Worker to process scraping jobs
const DNBScraperStealth = require('./scraper/dnbScraperStealth');
const ScrapingJob = require('./models/ScrapingJob');
const CompanyResult = require('./models/CompanyResult');

scrapeQueue.process('scrape', async (job) => {
  const { jobId, url, expectedCount, proxies, options } = job.data;

  logger.info(`Processing job ${jobId}: ${url}`);

  try {
    // Update job status to 'running'
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      { status: 'running' }
    );

    // Delete any existing results for this job
    const deleteResult = await CompanyResult.deleteMany({ jobId });
    logger.info(`Deleted ${deleteResult.deletedCount} company results for job ${jobId}`);

    // Initialize scraper
    const scraper = new DNBScraperStealth({
      proxies: proxies || [],
      headless: options?.headless !== false,
      minDelay: parseInt(process.env.MIN_DELAY) || 3000,
      maxDelay: parseInt(process.env.MAX_DELAY) || 10000,
      maxConcurrency: options?.maxConcurrency || parseInt(process.env.MAX_CONCURRENCY) || 1,
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3
    });

    // Run scraper
    const results = await scraper.scrapeDirectory(url, {
      jobId,
      maxPages: options?.maxPages || null,
      expectedCount: expectedCount || 50
    });

    // Save results to database
    if (results && results.length > 0) {
      const companyDocs = results.map(company => ({
        jobId,
        ...company
      }));
      await CompanyResult.insertMany(companyDocs);
      logger.info(`Saved ${results.length} companies for job ${jobId}`);
    }

    // Mark job as completed
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: 'completed',
        completedAt: new Date(),
        progress: {
          companiesScraped: results.length,
          totalCompanies: expectedCount,
          pagesProcessed: scraper.pagesProcessed || 0,
          errors: scraper.errorCount || 0
        }
      }
    );

    // Emit completion
    if (global.io) {
      global.io.emit('scrapeComplete', {
        jobId,
        totalCompanies: results.length
      });
    }

    logger.info(`Job ${jobId} completed successfully with ${results.length} companies`);
    return { success: true, companiesScraped: results.length };

  } catch (error) {
    logger.error(`Job ${jobId} failed:`, error);

    // Mark job as failed
    await ScrapingJob.findOneAndUpdate(
      { jobId },
      {
        status: 'failed',
        errors: [error.message],
        completedAt: new Date()
      }
    );

    // Emit error
    if (global.io) {
      global.io.emit('scrapeError', {
        jobId,
        error: error.message
      });
    }

    throw error;
  }
});

logger.info('Bull queue worker initialized and ready to process jobs');

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});