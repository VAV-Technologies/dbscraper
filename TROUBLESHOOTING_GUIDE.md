# Troubleshooting Guide - "Nothing Happens" When Clicking Start

## 🔴 Problem: Click Start → Nothing Happens

This happens when the **frontend can't connect to the backend**.

---

## ✅ Quick Fix: Test Locally First

### Step 1: Start Backend Locally

```bash
cd C:\Users\Vilca\Documents\DB\dnb-scraper\backend
npm start
```

**You should see:**
```
Server running on port 5000
Connected to MongoDB
```

### Step 2: Test Locally (Skip Netlify)

Instead of using `https://dbscraper.netlify.app`, use:

**http://localhost:3000**

This connects to your local backend at `localhost:5000`.

---

## 🔧 Option 1: Use Local Setup (Recommended for Testing)

### 1. Make sure both are running:

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 2. Open in browser:
```
http://localhost:3000
```

### 3. Test the scraper:
- Add your DNB URL
- Add proxies (one per line)
- Click Start
- Should work! ✅

---

## 🌐 Option 2: Deploy Backend to VPS

If you want to use the Netlify frontend (https://dbscraper.netlify.app), you need to deploy the backend to your VPS.

### Current Issue:
- Frontend tries to connect to: `http://185.202.236.231:5000`
- Backend is NOT running on VPS
- Result: 404 error, nothing happens

### To Fix - Deploy Backend to VPS:

**You'll need SSH access to deploy. Here's what needs to be done:**

1. Upload backend files to VPS
2. Install dependencies
3. Configure MongoDB and Redis
4. Start with PM2
5. Update firewall rules

Would you like me to help you deploy to the VPS?

---

## 🔍 How to Check What's Wrong

### Test 1: Check if backend is accessible

**From your computer:**
```bash
curl http://185.202.236.231:5000/api/scrape/jobs -H "x-api-key: 83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204"
```

**Expected (Good):**
```json
[]  # Empty array (no jobs yet)
```

**Actual (Bad):**
```html
404 Not Found
```

This means backend is not running on VPS.

### Test 2: Check browser console

1. Open https://dbscraper.netlify.app
2. Press F12 (open developer tools)
3. Click "Console" tab
4. Click "Start Scraping"
5. Look for errors

**You'll probably see:**
```
POST http://185.202.236.231:5000/api/scrape/start net::ERR_FAILED
```

or

```
404 Not Found
```

This confirms backend is not running.

---

## 📋 Summary: What's Happening

```
User clicks "Start" on Netlify
    ↓
Frontend sends request to 185.202.236.231:5000
    ↓
VPS returns 404 (wrong app running, or no app)
    ↓
Frontend can't start job
    ↓
Nothing happens (no error shown to user)
```

---

## ✅ Solutions (Pick One)

### **Solution A: Test Locally** (Easiest)

1. Run backend locally: `npm start` in backend folder
2. Run frontend locally: `npm start` in frontend folder
3. Open `http://localhost:3000`
4. Test with proxies
5. ✅ Should work!

**Pros:** Fast, easy to debug
**Cons:** Only works on your computer

---

### **Solution B: Deploy Backend to VPS** (Production)

**Requires SSH access to VPS.**

Would you like me to create a deployment script?

**Pros:** Works from anywhere via Netlify
**Cons:** Need to set up VPS properly

---

## 🐛 Additional Checks

### Check 1: MongoDB Running?

```bash
# Windows
tasklist | findstr mongod

# Should show mongod.exe
```

If MongoDB is not running:
```bash
# Start MongoDB
mongod --dbpath C:\data\db
```

### Check 2: Redis Running?

```bash
# Windows
tasklist | findstr redis

# Should show redis-server.exe
```

If Redis is not running:
```bash
# Start Redis
redis-server
```

### Check 3: Backend Environment Variables

Check `backend/.env` has:
```env
MONGODB_URI=mongodb://localhost:27017/dnb_scraper
REDIS_HOST=localhost
REDIS_PORT=6379
PORT=5000
```

---

## 💡 Recommended Path Forward

**For Testing:**
1. ✅ Run backend locally (already done)
2. ✅ Run frontend locally (`npm start` in frontend folder)
3. ✅ Open http://localhost:3000
4. ✅ Test scraping with real proxies
5. ✅ Verify data is collected

**For Production:**
Once testing works locally, then we can deploy to VPS.

---

## 🆘 Still Not Working?

Check these common issues:

1. **Port 5000 already in use?**
   ```bash
   # Find what's using port 5000
   netstat -ano | findstr :5000

   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **Firewall blocking?**
   - Check Windows Firewall
   - Allow Node.js through firewall

3. **Dependencies not installed?**
   ```bash
   cd backend
   npm install
   ```

4. **Wrong API key?**
   - Check frontend `.env.local` matches backend `.env`

---

## 📞 Next Steps

Since your backend is now running locally at `http://localhost:5000`:

**Option 1: Test locally first**
- Open `http://localhost:3000` in browser
- Everything should work

**Option 2: Deploy to VPS**
- Need SSH access
- I can help set it up

Which would you prefer?
