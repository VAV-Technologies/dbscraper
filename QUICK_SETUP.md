# Quick Setup - Get Backend Running NOW

## ✅ MongoDB Atlas Connected!

Your MongoDB Atlas credentials have been configured:
- Username: `vilcaaiman_db_user`
- Password: `Z0qCXtmuSUsYjWMC`
- Database: `dnb_scraper`

---

## ⚡ Quick Option: Use Upstash Redis (Free Cloud Redis)

Instead of installing Redis locally, use Upstash (free, 30 seconds to setup):

### Step 1: Sign Up for Upstash Redis (Free)

1. Go to: https://upstash.com/
2. Click "Sign Up" (use GitHub or Google)
3. Create a new Redis database
4. Copy the connection details

### Step 2: Update .env

You'll get something like:
```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxXXXX
```

Or connection string format:
```
redis://default:password@region.upstash.io:port
```

Just tell me the connection details and I'll configure it!

---

## 🚀 Then Start Backend:

```bash
cd backend
npm start
```

---

## 🌐 Then Access Frontend:

Open: **http://localhost:3000**

NOT the Netlify URL - use localhost to connect to your local backend!

---

## 📝 Summary of What We've Done:

✅ MongoDB Atlas configured (cloud database)
✅ Proxy support added to backend
✅ Proxy validation added to frontend
✅ Frontend updated and deployed to Netlify
⏳ **Need Redis** - Get Upstash credentials (30 seconds)

---

## Alternative: Install Redis Locally (15 minutes)

If you prefer local Redis:

### Windows:

**Option A: Memurai (Recommended for Windows)**
1. Download: https://www.memurai.com/get-memurai
2. Install the .msi file
3. Redis will start automatically
4. Done!

**Option B: WSL2 + Redis**
```bash
# In WSL2
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

---

## 🎯 Fastest Path Forward:

1. **Get Upstash Redis** (literally 30 seconds, free)
2. **Give me the connection URL**
3. **I'll update .env**
4. **Start backend** (`npm start`)
5. **Open http://localhost:3000**
6. **Start scraping!** 🚀

Ready for the Upstash Redis URL?
