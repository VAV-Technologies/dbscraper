# Final Deployment Steps - Do This Now

## 📦 File Ready for Upload

I've created: `C:\Users\Vilca\Documents\DB\dnb-scraper\backend\backend-deploy.tar.gz`

## 🚀 Deploy to VPS (Choose Method)

### Method 1: Using WinSCP (Easiest)

1. Download WinSCP: https://winscp.net/
2. Connect to VPS:
   - Host: 185.202.236.231
   - User: dnbscraper
   - Password: Vilca123
3. Upload `backend-deploy.tar.gz` to `/tmp/`
4. Use WinSCP's built-in terminal (Ctrl+T) and run:

```bash
pm2 stop dnb-scraper 2>/dev/null || true
mkdir -p /home/dnbscraper/dnb-scraper/backend
cd /home/dnbscraper/dnb-scraper/backend
tar -xzf /tmp/backend-deploy.tar.gz
cp .env.production .env
npm install --production
pm2 start server.js --name dnb-scraper
pm2 save
pm2 list
```

### Method 2: Using PuTTY + PSCP

1. Upload file:
```cmd
pscp C:\Users\Vilca\Documents\DB\dnb-scraper\backend\backend-deploy.tar.gz dnbscraper@185.202.236.231:/tmp/
```

2. SSH with PuTTY to 185.202.236.231
3. Run the same commands as Method 1

### Method 3: Upload to Cloud (If SSH doesn't work)

1. Upload `backend-deploy.tar.gz` to Google Drive/Dropbox
2. Get shareable link
3. SSH to VPS and run:

```bash
cd /tmp
wget "YOUR_SHARE_LINK" -O backend-deploy.tar.gz
# Then continue with deploy commands
```

## ✅ Verify Deployment

After deploying, test from your PC:

```bash
curl http://185.202.236.231:5000/api/scrape/jobs -H "x-api-key: 83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204"
```

Should return: `[]`

## 🎯 Then Use Netlify

Once backend responds with `[]`:

1. Go to: https://dbscraper.netlify.app
2. Add DNB URL
3. Add proxies (one per line)
4. Click Start
5. It will work! 🎉

---

## 🆘 Quick Help

**Backend file location:**
`C:\Users\Vilca\Documents\DB\dnb-scraper\backend\backend-deploy.tar.gz`

**VPS Details:**
- IP: 185.202.236.231
- User: dnbscraper
- Password: Vilca123

**What's included:**
✅ MongoDB Atlas configured
✅ Upstash Redis configured  
✅ Proxy support enabled
✅ All features ready
