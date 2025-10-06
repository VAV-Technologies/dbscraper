// PM2 Ecosystem Configuration for D&B Scraper
module.exports = {
  apps: [
    {
      name: 'dnb-scraper-api',
      script: './backend/server.js',
      cwd: '/opt/dnb-scraper',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGODB_URI: 'mongodb://dnb_user:secure_password_here@localhost:27017/dnb_scraper',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        FRONTEND_URL: 'https://dbscraper.netlify.app',
        MIN_DELAY: 3000,
        MAX_DELAY: 10000,
        MAX_CONCURRENCY: 3,
        RETRY_ATTEMPTS: 3
      },
      error_file: '/opt/dnb-scraper/logs/api-error.log',
      out_file: '/opt/dnb-scraper/logs/api-out.log',
      log_file: '/opt/dnb-scraper/logs/api-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000
    }
  ],

  deploy: {
    production: {
      user: 'dnbscraper',
      host: '185.202.236.231',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/dnb-scraper.git',
      path: '/opt/dnb-scraper',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};