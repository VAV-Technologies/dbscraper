# D&B Scraper VPS Deployment Guide

## 🚀 Frontend Status: ✅ DEPLOYED
- **Live URL**: https://dbscraper.netlify.app
- **Status**: Production ready and connected to VPS backend

## 📋 VPS Deployment Steps

### Step 1: Prepare Your VPS (185.202.236.231)

1. **SSH into your VPS**:
```bash
ssh root@185.202.236.231
```

2. **Run the automated setup script**:
```bash
# Download the deployment package (you'll need to transfer this)
cd /root
wget -O dnb-scraper-deployment.tar.gz [YOUR_DOWNLOAD_LINK]

# Or use SCP to transfer:
# scp dnb-scraper-deployment.tar.gz root@185.202.236.231:/root/

# Extract the package
tar -xzf dnb-scraper-deployment.tar.gz

# Run setup script
chmod +x deploy/vps-setup.sh
./deploy/vps-setup.sh
```

### Step 2: Configure Environment

1. **Setup production environment**:
```bash
cd /opt/dnb-scraper/backend
cp .env.production .env

# Edit the .env file with secure passwords
nano .env
```

2. **Important variables to update**:
```env
# Replace with strong passwords
MONGODB_URI=mongodb://dnb_user:YOUR_SECURE_PASSWORD@localhost:27017/dnb_scraper
JWT_SECRET=your_super_secure_jwt_secret_here
API_KEY=your_secure_api_key_here
```

### Step 3: Install Dependencies & Deploy

1. **Install Node.js dependencies**:
```bash
cd /opt/dnb-scraper/backend
npm install --production
```

2. **Install Playwright browsers**:
```bash
npx playwright install chromium
npx playwright install-deps
```

3. **Setup MongoDB database**:
```bash
# Create database user (update password)
mongo --eval "
use dnb_scraper;
db.createUser({
  user: 'dnb_user',
  pwd: 'YOUR_SECURE_PASSWORD',
  roles: [{role: 'readWrite', db: 'dnb_scraper'}]
});
"
```

4. **Start application with PM2**:
```bash
cd /opt/dnb-scraper
pm2 start deploy/ecosystem.config.js
pm2 save
pm2 startup
```

### Step 4: Configure Nginx & SSL

1. **Test nginx configuration**:
```bash
nginx -t
systemctl restart nginx
```

2. **Setup SSL (if you have a domain)**:
```bash
# Replace 'your-domain.com' with your actual domain
chmod +x deploy/ssl-setup.sh
./deploy/ssl-setup.sh
```

### Step 5: Verify Deployment

1. **Check services status**:
```bash
# Check PM2 processes
pm2 status

# Check system services
systemctl status nginx
systemctl status mongodb
systemctl status redis-server

# Check logs
pm2 logs dnb-scraper-api
tail -f /opt/dnb-scraper/logs/api-combined.log
```

2. **Test API endpoints**:
```bash
# Test basic connectivity
curl http://localhost:5000/api/scrape/jobs

# Check from external
curl http://185.202.236.231/api/scrape/jobs
```

3. **Test frontend connection**:
   - Visit: https://dbscraper.netlify.app
   - Should show "Connection: connected" status
   - Try starting a test scraping job

## 🔧 Production Configuration

### Security Checklist:
- ✅ Firewall configured (UFW)
- ✅ Strong passwords set
- ✅ SSL certificates (if domain configured)
- ✅ API rate limiting enabled
- ✅ Input validation in place

### Performance Settings:
- ✅ PM2 cluster mode (2 instances)
- ✅ Nginx reverse proxy
- ✅ Redis for queue management
- ✅ MongoDB for data persistence

### Anti-Detection Features Active:
- ✅ User agent rotation
- ✅ Session management
- ✅ Human-like behavior simulation
- ✅ Rate limiting (3-10 second delays)
- ✅ Retry logic with exponential backoff

## 📊 Monitoring & Maintenance

### Check Application Health:
```bash
# PM2 monitoring
pm2 monit

# Check memory usage
free -h

# Check disk space
df -h

# View real-time logs
pm2 logs --lines 50
```

### Restart Application:
```bash
pm2 restart dnb-scraper-api
```

### Update Deployment:
```bash
# Stop application
pm2 stop dnb-scraper-api

# Update code (repeat steps 1-3)
# Then restart
pm2 restart dnb-scraper-api
```

## 🚨 Troubleshooting

### Common Issues:

1. **MongoDB Connection Failed**:
```bash
systemctl status mongodb
systemctl restart mongodb
```

2. **Redis Connection Failed**:
```bash
systemctl status redis-server
systemctl restart redis-server
```

3. **Playwright Browser Issues**:
```bash
npx playwright install chromium --force
apt-get update && apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2
```

4. **Nginx 502 Error**:
```bash
# Check if backend is running
pm2 status
# Check nginx logs
tail -f /var/log/nginx/error.log
```

5. **Frontend Can't Connect**:
   - Verify VPS firewall allows port 80/443
   - Check CORS configuration in backend
   - Confirm FRONTEND_URL in .env

### Log Locations:
- Application logs: `/opt/dnb-scraper/logs/`
- PM2 logs: `pm2 logs`
- Nginx logs: `/var/log/nginx/`
- System logs: `journalctl -u mongodb` / `journalctl -u redis-server`

## 📞 Support

- Frontend: https://dbscraper.netlify.app
- Admin Panel: https://app.netlify.com/projects/dbscraper
- VPS IP: 185.202.236.231

Your D&B scraper is now ready for production use with comprehensive anti-detection measures and real-time monitoring!