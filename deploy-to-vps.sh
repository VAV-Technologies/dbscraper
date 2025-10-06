#!/bin/bash

# DNB Scraper - Deploy to VPS Script

echo "========================================="
echo "Deploying DNB Scraper to VPS"
echo "========================================="

VPS_USER="dnbscraper"
VPS_IP="185.202.236.231"
VPS_PATH="/home/dnbscraper/dnb-scraper"

echo ""
echo "Step 1: Creating deployment package..."
cd backend
tar -czf ../backend-deploy.tar.gz .
cd ..

echo ""
echo "Step 2: Uploading to VPS..."
scp backend-deploy.tar.gz ${VPS_USER}@${VPS_IP}:/tmp/

echo ""
echo "Step 3: Extracting and installing on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
# Stop existing process
pm2 stop dnb-scraper 2>/dev/null || true

# Backup old deployment
if [ -d "/home/dnbscraper/dnb-scraper/backend" ]; then
  mv /home/dnbscraper/dnb-scraper/backend /home/dnbscraper/dnb-scraper/backend.backup.$(date +%Y%m%d_%H%M%S)
fi

# Create directory
mkdir -p /home/dnbscraper/dnb-scraper/backend
cd /home/dnbscraper/dnb-scraper/backend

# Extract
tar -xzf /tmp/backend-deploy.tar.gz

# Copy production env
cp .env.production .env

# Install dependencies
npm install --production

# Start with PM2
pm2 start server.js --name dnb-scraper
pm2 save

echo "Deployment complete!"
pm2 list
ENDSSH

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Backend URL: http://185.202.236.231:5000"
echo ""
echo "Test it:"
echo "curl http://185.202.236.231:5000/api/scrape/jobs \\"
echo "  -H 'x-api-key: 83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204'"
