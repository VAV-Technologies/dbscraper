# Deploy Backend to VPS - Manual Steps

## 🚀 Quick Deployment Guide

### Step 1: Package the Backend

Run this on your Windows PC:

```bash
cd C:\Users\Vilca\Documents\DB\dnb-scraper\backend
tar -czf backend-deploy.tar.gz .
```

### Step 2: Upload to VPS

Upload the file using SCP (you'll need password: Vilca123):

```bash
scp backend-deploy.tar.gz dnbscraper@185.202.236.231:/tmp/
```

### Step 3: SSH into VPS

```bash
ssh dnbscraper@185.202.236.231
# Password: Vilca123
```

### Step 4: Deploy on VPS

Once logged into VPS, run these commands:

```bash
# Stop existing process
pm2 stop dnb-scraper 2>/dev/null || true
pm2 delete dnb-scraper 2>/dev/null || true

# Create/navigate to directory
mkdir -p /home/dnbscraper/dnb-scraper/backend
cd /home/dnbscraper/dnb-scraper/backend

# Extract new code
tar -xzf /tmp/backend-deploy.tar.gz

# Copy production environment
cp .env.production .env

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name dnb-scraper --env production
pm2 save
pm2 startup

# Check status
pm2 list
pm2 logs dnb-scraper --lines 20
```

### Step 5: Verify Deployment

From your Windows PC, test the API:

```bash
curl http://185.202.236.231:5000/api/scrape/jobs \
  -H "x-api-key: 83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204"
```

Should return: `[]`

---

## ✅ If Successful

You should see:
- PM2 shows "dnb-scraper" as "online"  
- API test returns `[]`
- No errors in `pm2 logs`

Then the backend is deployed! ✅

---

## 🔧 Troubleshooting

### Port 5000 already in use?

```bash
# Find what's using it
sudo lsof -i :5000

# Kill it
sudo kill -9 <PID>
```

### MongoDB connection issues?

Check `.env` on VPS:
```bash
cat /home/dnbscraper/dnb-scraper/backend/.env
```

Should have the MongoDB Atlas URL with `ytqahuc` in it.

### Redis connection issues?

The Upstash Redis URL should be in `.env` on VPS.

---

## 🎯 Quick Deploy (Copy-Paste Method)

If tar/scp doesn't work, here's an alternative:

### On Windows:
1. Zip the backend folder
2. Upload to Dropbox/Google Drive
3. Get share link

### On VPS:
```bash
cd /home/dnbscraper/dnb-scraper
wget "YOUR_SHARE_LINK" -O backend.zip
unzip backend.zip
cd backend
cp .env.production .env
npm install --production
pm2 start server.js --name dnb-scraper
pm2 save
```

---

## 📝 Environment File (.env.production)

Make sure this file is in your backend folder before deploying:

```env
PORT=5000
MONGODB_URI=mongodb+srv://vilcaaiman_db_user:Z0qCXtmuSUsYjWMC@cluster0.ytqahuc.mongodb.net/dnb_scraper?retryWrites=true&w=majority&appName=Cluster0
REDIS_URL=redis://default:AU2tAAIncDIzZmIzZDhjYjlmMTQ0ODU3YWNhMjEyYzlhMDljYjkzMnAyMTk4ODU@classic-tetra-19885.upstash.io:6379
REDIS_TLS=true
FRONTEND_URL=https://dbscraper.netlify.app
NODE_ENV=production
HEADLESS=true
MIN_DELAY=3000
MAX_DELAY=10000
MAX_CONCURRENCY=3
RETRY_ATTEMPTS=3
API_KEYS=83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204
```

This file has been created for you already!
