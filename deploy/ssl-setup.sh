#!/bin/bash

# SSL Setup Script for D&B Scraper VPS
# Run this after basic VPS setup and domain configuration

set -e

VPS_IP="185.202.236.231"
DOMAIN="your-domain.com"  # Replace with your actual domain

echo "Setting up SSL for D&B Scraper..."

# Install Certbot if not already installed
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily
systemctl stop nginx

# Get SSL certificate
certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email your-email@example.com

# Update nginx configuration with SSL
cat > /etc/nginx/sites-available/dnb-scraper << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Test nginx configuration
nginx -t

# Start nginx
systemctl start nginx
systemctl reload nginx

# Setup automatic certificate renewal
crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | crontab -

echo "SSL setup completed!"
echo "Your application should now be available at https://$DOMAIN"
echo "Certificate will auto-renew via cron job"