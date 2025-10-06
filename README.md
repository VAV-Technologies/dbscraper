# DNB Scraper

A web scraper for collecting company information from DNB with proxy support.

## Features

- Provider-agnostic proxy support (HTTP, HTTPS, SOCKS5)
- MongoDB Atlas for data storage
- Upstash Redis for job queue management
- Stealth browser automation with anti-detection
- Parallel scraping support
- Real-time progress tracking

## Deployment

### Frontend (Netlify)
- Already deployed at: https://dbscraper.netlify.app

### Backend (Contabo VPS)
- See deployment instructions below

## Environment Variables

The backend requires a `.env` file with the following:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_uri
REDIS_URL=your_upstash_redis_url
REDIS_TLS=true
FRONTEND_URL=https://dbscraper.netlify.app
NODE_ENV=production
HEADLESS=true
MIN_DELAY=3000
MAX_DELAY=10000
MAX_CONCURRENCY=3
RETRY_ATTEMPTS=3
API_KEYS=your_api_key
```

## Quick Deploy to VPS

1. Push code to GitHub
2. Run `bash deploy-backend.sh` from your local machine
3. The script will automatically deploy to your Contabo VPS

## Manual Deployment

See `DEPLOY_TO_VPS_MANUAL.md` for step-by-step instructions.
