require('dotenv').config();

module.exports = {
  apps: [{
    name: 'dnb-scraper',
    script: './server.js',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 5000,
      MONGODB_URI: process.env.MONGODB_URI,
      REDIS_URL: process.env.REDIS_URL,
      REDIS_TLS: process.env.REDIS_TLS,
      FRONTEND_URL: process.env.FRONTEND_URL,
      HEADLESS: process.env.HEADLESS,
      MIN_DELAY: process.env.MIN_DELAY,
      MAX_DELAY: process.env.MAX_DELAY,
      MAX_CONCURRENCY: process.env.MAX_CONCURRENCY,
      RETRY_ATTEMPTS: process.env.RETRY_ATTEMPTS,
      API_KEYS: process.env.API_KEYS
    }
  }]
};
