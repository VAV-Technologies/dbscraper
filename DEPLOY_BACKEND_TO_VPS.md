# Deploy Updated Backend to VPS

## 📦 What Needs to Be Deployed

The backend code has been updated with proxy support. You need to upload these changes to your VPS.

---

## 🚀 Quick Deployment Steps

###  Method 1: Using Git (Recommended)

If your backend code is in a Git repository:

```bash
# On VPS (SSH into it):
ssh dnbscraper@185.202.236.231

# Navigate to backend folder
cd /path/to/dnb-scraper/backend

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Restart the server
pm2 restart dnb-scraper

# Check it's running
pm2 logs dnb-scraper
```

---

### Method 2: Manual Upload (If No Git)

**Step 1: Create a ZIP of backend folder**

On your Windows PC:
```
Right-click dnb-scraper\backend folder
→ Send to → Compressed (zipped) folder
→ Save as backend.zip
```

**Step 2: Upload to VPS**

Using WinSCP or SCP:
```bash
scp backend.zip dnbscraper@185.202.236.231:/home/dnbscraper/
```

**Step 3: SSH into VPS and extract**

```bash
ssh dnbscraper@185.202.236.231

# Extract
unzip backend.zip -d /path/to/dnb-scraper/

# Install dependencies
cd /path/to/dnb-scraper/backend
npm install

# Restart server
pm2 restart dnb-scraper
```

---

## 🔍 Check if Backend is Running

### From your Windows PC:

```bash
curl http://185.202.236.231:5000/api/scrape/jobs \
  -H "x-api-key: 83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204"
```

**Expected output:**
```json
[]
```

**If you see this, backend is working! ✅**

---

## 🐛 If Backend Still Not Working

### Check PM2 Status

```bash
ssh dnbscraper@185.202.236.231
pm2 list
```

Should show:
```
┌─────┬────────────────┬─────────┬─────────┬──────────┐
│ id  │ name           │ status  │ restart │ uptime   │
├─────┼────────────────┼─────────┼─────────┼──────────┤
│ 0   │ dnb-scraper    │ online  │ 0       │ 5m       │
└─────┴────────────────┴─────────┴─────────┴──────────┘
```

### Check Logs

```bash
pm2 logs dnb-scraper --lines 50
```

Look for:
- ✅ "Server running on port 5000"
- ✅ "Connected to MongoDB" (or similar)
- ❌ Any errors

### Restart if Needed

```bash
pm2 restart dnb-scraper
pm2 logs dnb-scraper
```

---

## 📋 Files That Changed (Need to be Updated on VPS)

These files have been modified with proxy support:

1. **backend/controllers/scraperController.js**
   - Accepts proxies from frontend
   - Validates proxy format
   - Passes proxies to scraper

2. **backend/scraper/dnbScraperStealth.js**
   - Parses proxy strings (HTTP/HTTPS/SOCKS5)
   - Supports authentication
   - Automatic proxy rotation

3. **frontend/src/components/Dashboard.js** (already deployed to Netlify)
   - Proxy input field
   - Format validation

---

## ⚡ Alternative: Start Fresh on VPS

If you want to start clean:

```bash
# SSH into VPS
ssh dnbscraper@185.202.236.231

# Stop existing process
pm2 delete dnb-scraper

# Remove old backend
rm -rf /path/to/old/backend

# Upload new backend (using scp or git)
# Then:
cd /path/to/new/backend
npm install

# Start with PM2
pm2 start server.js --name dnb-scraper
pm2 save
pm2 startup
```

---

## 🎯 Expected Result

Once deployed:

1. Open https://dbscraper.netlify.app
2. Add DNB URL
3. Add proxies (one per line)
4. Click "Start Scraping"
5. **Should start working!** ✅

You'll see:
- Job ID appears
- Status shows "pending" → "in_progress"
- Progress bar starts moving
- Real-time company count updates

---

## 🆘 Still Not Working?

### Check These:

1. **VPS Firewall**
   ```bash
   sudo ufw status
   # Port 5000 should be allowed
   ```

2. **MongoDB Running?**
   ```bash
   sudo systemctl status mongod
   ```

3. **Redis Running?**
   ```bash
   sudo systemctl status redis
   ```

4. **Environment Variables**
   Check `/path/to/backend/.env` on VPS:
   ```env
   MONGODB_URI=mongodb://localhost:27017/dnb_scraper
   PORT=5000
   API_KEYS=83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204
   ```

---

## 💡 Don't Have SSH Access?

If you can't SSH into the VPS, you have a few options:

1. **Use local setup** (MongoDB + Redis on Windows)
2. **Use MongoDB Atlas** (cloud database, no local install needed)
3. **Deploy to a service** like Railway, Render, or Heroku

Would you like help with any of these?

---

## ✅ Quick Test (Without Deploying)

Want to test locally first without MongoDB?

The scraper can work with MongoDB Atlas (cloud):

1. Sign up at https://www.mongodb.com/cloud/atlas (free tier)
2. Create a cluster
3. Get connection string
4. Update `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dnb_scraper
   ```
5. Run `npm start` locally
6. Test at http://localhost:3000

This way you can test without installing MongoDB locally!
