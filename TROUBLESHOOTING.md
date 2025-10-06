# D&B Scraper Troubleshooting Guide

## Table of Contents
1. [Backend Issues](#backend-issues)
2. [Frontend Issues](#frontend-issues)
3. [VPS Deployment Issues](#vps-deployment-issues)
4. [Scraping Issues](#scraping-issues)
5. [Network & Connectivity](#network--connectivity)
6. [Performance Issues](#performance-issues)
7. [Database Issues](#database-issues)

---

## Backend Issues

### API Returns 404 for All Endpoints

**Symptoms:**
- All API requests return 404 Not Found
- `curl http://185.202.236.231:5000/api/scrape/jobs` returns 404

**Solutions:**
1. Check if backend is running:
   ```bash
   ssh dnbscraper@185.202.236.231
   pm2 list
   ```

2. Check PM2 logs:
   ```bash
   pm2 logs dnb-scraper-api
   ```

3. Restart the backend:
   ```bash
   pm2 restart dnb-scraper-api
   ```

4. If not running, start it:
   ```bash
   cd /opt/dnb-scraper/backend
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

### API Returns 401/403 Unauthorized

**Symptoms:**
- All requests return "API key is required" or "Invalid API key"

**Solutions:**
1. Check API key in frontend `.env.production`:
   ```bash
   cat frontend/.env.production
   ```

2. Check API key in backend `.env`:
   ```bash
   cat backend/.env | grep API_KEYS
   ```

3. Verify keys match

4. If keys don't exist, generate new one:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Update both `.env` files with the new key

6. Rebuild frontend:
   ```bash
   cd frontend
   npm run build
   netlify deploy --prod
   ```

7. Restart backend:
   ```bash
   pm2 restart dnb-scraper-api
   ```

---

### MongoDB Connection Failed

**Symptoms:**
- Backend logs show "MongoNetworkError" or "Connection refused"
- Jobs not saving to database

**Solutions:**
1. Check MongoDB status:
   ```bash
   sudo systemctl status mongodb
   ```

2. Start MongoDB:
   ```bash
   sudo systemctl start mongodb
   sudo systemctl enable mongodb
   ```

3. Check MongoDB is listening:
   ```bash
   sudo netstat -tlnp | grep 27017
   ```

4. Test connection:
   ```bash
   mongo --eval "db.adminCommand('ping')"
   ```

5. Check MongoDB logs:
   ```bash
   sudo tail -f /var/log/mongodb/mongod.log
   ```

---

### Redis Connection Failed

**Symptoms:**
- Backend logs show "ECONNREFUSED" for Redis
- Jobs not queuing

**Solutions:**
1. Check Redis status:
   ```bash
   sudo systemctl status redis-server
   ```

2. Start Redis:
   ```bash
   sudo systemctl start redis-server
   sudo systemctl enable redis-server
   ```

3. Test connection:
   ```bash
   redis-cli ping
   ```

4. Check Redis logs:
   ```bash
   sudo tail -f /var/log/redis/redis-server.log
   ```

---

## Frontend Issues

### WebSocket Not Connecting

**Symptoms:**
- Frontend shows "Connection: disconnected"
- No real-time updates

**Solutions:**
1. Check backend is running (see above)

2. Verify API_BASE in frontend `.env`:
   ```bash
   cat frontend/.env.production
   ```

3. Test WebSocket directly:
   ```bash
   curl -i -N -H "Connection: Upgrade" \
        -H "Upgrade: websocket" \
        http://185.202.236.231:5000/socket.io/
   ```

4. Check browser console for errors

5. Verify CORS settings in `backend/server.js`:
   ```javascript
   origin: process.env.FRONTEND_URL || 'http://localhost:3000'
   ```

---

### "Scraping not allowed by robots.txt" Error

**Symptoms:**
- Jobs fail immediately with robots.txt error

**Solutions:**
1. This is expected behavior - the site disallows scraping

2. To bypass (use responsibly):
   - Comment out robots.txt check in `backend/controllers/scraperController.js` lines 19-32
   - Restart backend: `pm2 restart dnb-scraper-api`

3. Or modify the check to be a warning instead of error

---

## VPS Deployment Issues

### SSH Connection Timeout

**Symptoms:**
- `ssh dnbscraper@185.202.236.231` hangs or times out

**Solutions:**
1. Check VPS is running in Contabo panel

2. Test ping:
   ```bash
   ping 185.202.236.231
   ```

3. Try SSH with verbose:
   ```bash
   ssh -v dnbscraper@185.202.236.231
   ```

4. Check firewall:
   ```bash
   ssh root@185.202.236.231 "ufw status"
   ```

5. Ensure port 22 is open:
   ```bash
   ssh root@185.202.236.231 "ufw allow 22"
   ```

---

### Port 5000 Not Accessible

**Symptoms:**
- `curl http://185.202.236.231:5000` times out
- Frontend can't connect to backend

**Solutions:**
1. Check backend is running:
   ```bash
   pm2 list
   ```

2. Check port is listening:
   ```bash
   sudo netstat -tlnp | grep 5000
   ```

3. Check firewall:
   ```bash
   sudo ufw status
   sudo ufw allow 5000
   ```

4. Test locally on VPS:
   ```bash
   curl http://localhost:5000/api/scrape/jobs
   ```

5. If working locally but not externally, check nginx config:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

### PM2 Process Keeps Crashing

**Symptoms:**
- `pm2 list` shows status "errored"
- Backend restarts continuously

**Solutions:**
1. Check logs:
   ```bash
   pm2 logs dnb-scraper-api --lines 100
   ```

2. Check for common errors:
   - Missing environment variables
   - MongoDB/Redis not running
   - Port already in use
   - Missing node_modules

3. Reinstall dependencies:
   ```bash
   cd /opt/dnb-scraper/backend
   rm -rf node_modules
   npm install --production
   ```

4. Check Playwright browsers:
   ```bash
   npx playwright install chromium
   npx playwright install-deps
   ```

5. Restart with fresh logs:
   ```bash
   pm2 delete dnb-scraper-api
   pm2 start ecosystem.config.js
   pm2 save
   ```

---

## Scraping Issues

### CAPTCHA Detected

**Symptoms:**
- Jobs fail with "CAPTCHA detected" error
- Frontend shows CAPTCHA alert

**Solutions:**
1. This indicates anti-scraping measures are active

2. Increase delays in `.env`:
   ```
   MIN_DELAY=5000
   MAX_DELAY=15000
   ```

3. Reduce concurrency in `.env`:
   ```
   MAX_CONCURRENCY=1
   ```

4. Wait some time before retrying (hours/days)

5. Consider using residential proxies (not implemented)

---

### No Companies Found

**Symptoms:**
- Job completes but results are empty
- "Companies Scraped: 0"

**Solutions:**
1. Check if D&B changed their HTML structure

2. Test URL in browser manually

3. Update CSS selectors in `backend/scraper/dnbScraper.js`:
   - Lines 151-169 (directory page selectors)
   - Lines 217-243 (company page selectors)

4. Enable headless: false for debugging:
   ```javascript
   options: { headless: false }
   ```

5. Check browser console in non-headless mode

---

### Job Stuck in "in_progress"

**Symptoms:**
- Job status never changes from "in_progress"
- No progress updates

**Solutions:**
1. Check if scraper process crashed:
   ```bash
   pm2 logs dnb-scraper-api
   ```

2. Stop the job:
   ```http
   POST /api/scrape/stop/:jobId
   ```

3. Check MongoDB for job status:
   ```bash
   mongo dnb_scraper
   db.scrapingjobs.find({status: "in_progress"})
   ```

4. Manually update status:
   ```bash
   db.scrapingjobs.updateOne(
     {jobId: "your-job-id"},
     {$set: {status: "failed", completedAt: new Date()}}
   )
   ```

5. Restart backend:
   ```bash
   pm2 restart dnb-scraper-api
   ```

---

## Network & Connectivity

### Rate Limiting (429 Too Many Requests)

**Symptoms:**
- API returns 429 error
- "Too many requests from this IP"

**Solutions:**
1. This is expected - wait 15 minutes

2. Check rate limit in `backend/server.js`:
   ```javascript
   max: 100,  // Increase if needed
   windowMs: 15 * 60 * 1000  // Time window
   ```

3. Use different IP or wait

---

### DNS Resolution Failures

**Symptoms:**
- "getaddrinfo ENOTFOUND" errors
- Can't resolve www.dnb.com

**Solutions:**
1. Check DNS on VPS:
   ```bash
   nslookup www.dnb.com
   ```

2. Try different DNS:
   ```bash
   echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf
   ```

3. Test connectivity:
   ```bash
   curl https://www.dnb.com
   ```

---

## Performance Issues

### Scraping Very Slow

**Symptoms:**
- Processing <5 companies per minute
- Long delays between requests

**Solutions:**
1. Reduce delays in `.env`:
   ```
   MIN_DELAY=2000
   MAX_DELAY=5000
   ```

2. Increase concurrency:
   ```
   MAX_CONCURRENCY=5
   ```

3. Check VPS resources:
   ```bash
   top
   free -h
   df -h
   ```

4. Restart backend to clear memory:
   ```bash
   pm2 restart dnb-scraper-api
   ```

---

### High Memory Usage

**Symptoms:**
- PM2 shows high memory usage
- VPS becomes unresponsive

**Solutions:**
1. Check memory:
   ```bash
   free -h
   pm2 monit
   ```

2. Reduce concurrency:
   ```
   MAX_CONCURRENCY=1
   ```

3. Enable headless mode:
   ```
   options: { headless: true }
   ```

4. Restart PM2:
   ```bash
   pm2 restart dnb-scraper-api
   ```

5. Add swap space if needed:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

---

## Database Issues

### MongoDB Out of Space

**Symptoms:**
- "No space left on device"
- Can't save jobs

**Solutions:**
1. Check disk space:
   ```bash
   df -h
   ```

2. Clear old jobs:
   ```bash
   mongo dnb_scraper
   db.scrapingjobs.deleteMany({
     completedAt: {$lt: new Date(Date.now() - 30*24*60*60*1000)}
   })
   ```

3. Compact database:
   ```bash
   db.runCommand({compact: 'scrapingjobs'})
   ```

4. Clear exports:
   ```bash
   rm -rf /opt/dnb-scraper/backend/exports/*
   ```

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Service not running | Start MongoDB/Redis |
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `TimeoutError` | Page load timeout | Increase timeout in options |
| `Protocol error` | Browser crashed | Restart backend, check memory |
| `Invalid API key` | Wrong/missing key | Update .env files |
| `Job not found` | Wrong jobId | Check jobId spelling |

---

## Getting Help

If issues persist:

1. Check logs:
   ```bash
   pm2 logs dnb-scraper-api --lines 200
   sudo tail -f /var/log/mongodb/mongod.log
   sudo tail -f /var/log/redis/redis-server.log
   ```

2. Enable debug mode in `.env`:
   ```
   NODE_ENV=development
   DEBUG=*
   ```

3. Create GitHub issue with:
   - Error message
   - Backend logs
   - Steps to reproduce
   - Environment details (VPS, Node version, etc.)

---

## Preventive Maintenance

### Daily
- Monitor PM2: `pm2 monit`
- Check disk space: `df -h`

### Weekly
- Review logs: `pm2 logs`
- Clear old exports
- Update dependencies if needed

### Monthly
- Delete old jobs from MongoDB
- Review and rotate API keys
- Update Node.js and system packages
- Review robots.txt compliance
