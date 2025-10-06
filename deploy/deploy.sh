#!/bin/bash

# Deployment script for D&B Scraper

set -e

VPS_IP="185.202.236.231"
VPS_USER="dnbscraper"
APP_DIR="/opt/dnb-scraper"

echo "Deploying D&B Scraper to VPS..."

# Build frontend for production
echo "Building frontend..."
cd frontend
npm run build
cd ..

# Create deployment package
echo "Creating deployment package..."
tar -czf dnb-scraper-deploy.tar.gz \
    backend/ \
    frontend/build/ \
    deploy/ecosystem.config.js \
    --exclude=backend/node_modules \
    --exclude=backend/logs \
    --exclude=backend/exports

# Copy to VPS
echo "Copying files to VPS..."
scp dnb-scraper-deploy.tar.gz ${VPS_USER}@${VPS_IP}:~/

# Deploy on VPS
echo "Deploying on VPS..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
    # Backup current installation
    if [ -d "/opt/dnb-scraper" ]; then
        sudo cp -r /opt/dnb-scraper /opt/dnb-scraper-backup-$(date +%Y%m%d_%H%M%S)
    fi

    # Extract new files
    cd ~
    tar -xzf dnb-scraper-deploy.tar.gz
    sudo rm -rf /opt/dnb-scraper/*
    sudo cp -r backend frontend deploy /opt/dnb-scraper/
    sudo chown -R dnbscraper:dnbscraper /opt/dnb-scraper

    # Install dependencies
    cd /opt/dnb-scraper/backend
    npm install --production

    # Install Playwright browsers
    npx playwright install chromium

    # Create logs directory
    mkdir -p /opt/dnb-scraper/logs

    # Start/Restart application
    pm2 delete dnb-scraper-api || true
    pm2 start /opt/dnb-scraper/deploy/ecosystem.config.js
    pm2 save

    # Restart nginx
    sudo systemctl restart nginx

    echo "Deployment completed successfully!"
ENDSSH

# Cleanup
rm dnb-scraper-deploy.tar.gz

echo "Deployment script completed!"
echo "Application should be running at http://${VPS_IP}"