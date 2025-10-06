#!/bin/bash

# D&B Scraper VPS Setup Script for Ubuntu
# Run as root: ssh root@185.202.236.231

set -e

echo "Starting D&B Scraper VPS setup..."

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install additional dependencies
apt-get install -y \
    git \
    nginx \
    mongodb \
    redis-server \
    pm2 \
    certbot \
    python3-certbot-nginx \
    unzip \
    wget \
    curl \
    build-essential

# Install Playwright dependencies
npx playwright install-deps

# Create app directory
mkdir -p /opt/dnb-scraper
cd /opt/dnb-scraper

# Clone or copy project files (replace with your repo)
# git clone YOUR_REPO_URL .

# Create systemd services
cat > /etc/systemd/system/mongodb.service << 'EOF'
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.org/manual
After=network-online.target
Wants=network-online.target

[Service]
User=mongodb
Group=mongodb
EnvironmentFile=-/etc/default/mongod
ExecStart=/usr/bin/mongod --config /etc/mongod.conf
PIDFile=/var/lib/mongodb/mongod.lock
TimeoutStopSec=5
KillMode=mixed

[Install]
WantedBy=multi-user.target
EOF

# Start and enable services
systemctl enable mongodb
systemctl start mongodb
systemctl enable redis-server
systemctl start redis-server

# Create MongoDB database and user
mongo --eval "
use dnb_scraper;
db.createUser({
  user: 'dnb_user',
  pwd: 'secure_password_here',
  roles: [{role: 'readWrite', db: 'dnb_scraper'}]
});
"

# Install PM2 globally
npm install -g pm2

# Setup nginx configuration
cat > /etc/nginx/sites-available/dnb-scraper << 'EOF'
server {
    listen 80;
    server_name 185.202.236.231;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable nginx site
ln -sf /etc/nginx/sites-available/dnb-scraper /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

# Setup firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Create application user
useradd -m -s /bin/bash dnbscraper
usermod -aG sudo dnbscraper

# Set permissions
chown -R dnbscraper:dnbscraper /opt/dnb-scraper

echo "VPS setup completed. Next steps:"
echo "1. Copy your application code to /opt/dnb-scraper/"
echo "2. Run 'npm install' in the backend directory"
echo "3. Update .env with production settings"
echo "4. Start the application with PM2"
echo "5. Setup SSL with certbot"