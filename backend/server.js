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
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
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

const scrapeQueue = new Bull('scrape-queue',
  process.env.REDIS_URL || {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    }
  }
);

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});