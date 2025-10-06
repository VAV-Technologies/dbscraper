#!/bin/bash

# DNB Scraper - Git Deploy to VPS Script
# This script deploys the backend to Contabo VPS using Git

echo "========================================="
echo "DNB Scraper - Git Deployment to VPS"
echo "========================================="

VPS_USER="root"
VPS_IP="185.202.236.231"
VPS_PATH="/home/dnbscraper/dnb-scraper"
REPO_URL="https://github.com/YOUR_USERNAME/dnb-scraper.git"  # Update this after creating GitHub repo

echo ""
echo "Step 1: Connecting to VPS and installing Git..."
ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
# Install git if not already installed
if ! command -v git &> /dev/null; then
    echo "Installing Git..."
    apt-get update
    apt-get install -y git
fi

# Install Node.js and npm if not already installed
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo "Prerequisites installed!"
ENDSSH

echo ""
echo "Step 2: Cloning repository and setting up backend..."
ssh ${VPS_USER}@${VPS_IP} << ENDSSH
# Stop existing process
pm2 stop dnb-scraper 2>/dev/null || true
pm2 delete dnb-scraper 2>/dev/null || true

# Remove old deployment if exists
rm -rf ${VPS_PATH}

# Clone repository
echo "Cloning from GitHub..."
git clone ${REPO_URL} ${VPS_PATH}

# Navigate to backend
cd ${VPS_PATH}/backend

# Create .env file from .env.production
cp .env.production .env

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Downgrade p-queue to compatible version
npm install p-queue@6.6.2

# Start with PM2
echo "Starting backend with PM2..."
pm2 start server.js --name dnb-scraper
pm2 save
pm2 startup

echo ""
echo "Deployment complete!"
pm2 list
pm2 logs dnb-scraper --lines 10
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
echo ""
echo "To update in the future, just run this script again!"
