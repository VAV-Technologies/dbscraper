# Proxy Integration Guide - Provider Agnostic

## Overview

The DNB scraper now supports **provider-agnostic proxy configuration**. You can use proxies from any provider by simply entering them in the frontend UI.

---

## ✅ What's New

### Frontend Changes
- **Proxy Input Field**: Multi-line text area in the main scraping form
- **Real-time Validation**: Validates proxy format as you type
- **Proxy Counter**: Shows how many proxies are configured
- **Format Support**: HTTP, HTTPS, and SOCKS5 proxies

### Backend Changes
- **API Enhancement**: `/api/scrape/start` now accepts `proxies` array
- **Proxy Validation**: Validates proxy format before starting jobs
- **Automatic Rotation**: Scraper automatically rotates through provided proxies
- **Fallback Support**: Falls back to `.env` proxies if none provided in request

---

## 🎯 How to Use

### Step 1: Get Proxies from Any Provider

Sign up with any proxy provider:
- **Smartproxy** (https://smartproxy.com)
- **Bright Data** (https://brightdata.com)
- **Oxylabs** (https://oxylabs.io)
- **IPRoyal** (https://iproyal.com)
- **ProxyEmpire** (https://proxyempire.io)
- Or any other provider

### Step 2: Format Your Proxies

Proxies must be in one of these formats:

**With Authentication:**
```
http://username:password@host:port
https://username:password@host:port
socks5://username:password@host:port
```

**Without Authentication:**
```
http://host:port
https://host:port
socks5://host:port
```

### Step 3: Enter Proxies in the Frontend

1. Open the scraper frontend
2. Scroll to "Scraping Configuration"
3. Find the "Proxies (One per line)" field
4. Paste your proxies (one per line)

**Example:**
```
http://user123:pass456@gate.smartproxy.com:7000
http://user123:pass456@gate.smartproxy.com:7001
http://user789:pass012@proxy.brightdata.com:22225
socks5://user456:pass789@residential.oxylabs.io:7777
```

### Step 4: Configure Other Settings

1. Enter the DNB URL to scrape
2. Set expected company count
3. Click "Start Scraping"

### Step 5: Monitor Progress

- Real-time progress updates
- Proxy rotation happens automatically
- Session rotates every 5 pages for anti-detection

---

## 📝 Proxy Format Examples

### Smartproxy
```
http://username:password@gate.smartproxy.com:7000
http://username:password@gate.smartproxy.com:7001
http://username:password@gate.smartproxy.com:10000
```

### Bright Data
```
http://brd-customer-XXXXX-zone-residential:password@brd.superproxy.io:22225
http://brd-customer-XXXXX-zone-residential:password@brd.superproxy.io:22226
```

### Oxylabs
```
http://customer-username:password@pr.oxylabs.io:7777
http://customer-username:password@pr.oxylabs.io:8888
```

### IPRoyal
```
http://username:password@geo.iproyal.com:12321
http://username:password@residential.iproyal.com:8080
```

### SOCKS5 Example
```
socks5://username:password@proxy.example.com:1080
```

---

## 🔧 API Usage

### Start Scraping with Proxies

**Endpoint:** `POST /api/scrape/start`

**Request Body:**
```json
{
  "url": "https://www.dnb.com/business-directory/company-information.information.cn.html",
  "expectedCount": 700000,
  "proxies": [
    "http://user:pass@proxy1.com:8080",
    "http://user:pass@proxy2.com:8080",
    "socks5://user:pass@proxy3.com:1080"
  ],
  "options": {
    "maxPages": 28000,
    "headless": true,
    "maxConcurrency": 3
  }
}
```

**Response:**
```json
{
  "jobId": "abc123...",
  "message": "Scraping job started",
  "status": "pending"
}
```

**Error Response (Invalid Proxy):**
```json
{
  "error": "Invalid proxy format",
  "message": "Proxies must be in format: http://username:password@host:port or http://host:port",
  "invalidProxies": ["invalid-proxy-format"]
}
```

---

## 🔒 How Proxy Rotation Works

1. **Initial Selection**: Scraper starts with first proxy in the list
2. **Automatic Rotation**: Rotates to next proxy every session
3. **Session Rotation**: New browser session every 5 pages
4. **Round-Robin**: Cycles back to first proxy after using all
5. **Anti-Detection**: Different IPs across different pages

**Example Flow:**
```
Page 1-5:   Proxy 1 (IP: 123.45.67.89)
Page 6-10:  Proxy 2 (IP: 98.76.54.32)
Page 11-15: Proxy 3 (IP: 111.22.33.44)
Page 16-20: Proxy 1 (IP: 123.45.67.89) // Cycles back
```

---

## ✅ Validation Rules

The system validates proxies with these rules:

1. **Protocol**: Must be `http://`, `https://`, or `socks5://`
2. **Host**: Must be valid hostname or IP
3. **Port**: Must be numeric (1-65535)
4. **Authentication**: Optional, format `username:password@`

**Valid Examples:**
```
✓ http://user:pass@proxy.com:8080
✓ http://proxy.com:8080
✓ https://user:pass@1.2.3.4:9999
✓ socks5://user:pass@proxy.io:1080
```

**Invalid Examples:**
```
✗ proxy.com:8080 (missing protocol)
✗ http://proxy.com (missing port)
✗ user:pass@proxy.com:8080 (missing protocol)
✗ http://proxy (missing port)
```

---

## 🧪 Testing

### Test 1: Validate Proxy Format
```bash
cd backend
node test-proxy-api.js
```

### Test 2: Test Single Proxy Connection
```bash
# Edit backend/.env to add test proxy:
PROXIES=http://your-username:your-password@proxy.example.com:8080

# Run test:
node test-proxy-connection.js
```

### Test 3: Frontend Validation
1. Open frontend
2. Enter invalid proxy format
3. Should show error message immediately
4. Fix format, error should disappear

---

## 📊 Proxy Performance Tips

### 1. Use Multiple Proxies
- **Minimum**: 5-10 proxies for 700k companies
- **Recommended**: 20+ proxies for faster rotation
- **Benefit**: Reduces chance of IP blocks

### 2. Mix Proxy Locations
```
http://user:pass@us-proxy.com:8080      # USA
http://user:pass@uk-proxy.com:8080      # UK
http://user:pass@de-proxy.com:8080      # Germany
http://user:pass@jp-proxy.com:8080      # Japan
```

### 3. Monitor Proxy Health
- Check backend logs for connection errors
- Remove proxies that consistently fail
- Replace with fresh proxies

### 4. Adjust Delays (Optional)
In `backend/.env`:
```env
MIN_DELAY=5000   # 5 seconds between requests
MAX_DELAY=15000  # 15 seconds maximum
```

---

## 🚨 Troubleshooting

### "Invalid proxy format" Error

**Problem:** Frontend shows validation error

**Solution:**
1. Check format matches: `http://user:pass@host:port`
2. Remove spaces before/after proxies
3. Ensure one proxy per line
4. Check protocol is `http://`, `https://`, or `socks5://`

### "Access Denied" Even with Proxies

**Problem:** DNB still blocks requests

**Solutions:**
1. **Use Residential Proxies** (not datacenter)
2. Increase delays in `.env` (MIN_DELAY=10000)
3. Reduce concurrency (maxConcurrency: 1)
4. Contact proxy provider for "sticky sessions"
5. Try different proxy locations

### Scraping Fails to Start

**Problem:** Job starts but immediately fails

**Check:**
1. Backend logs: `pm2 logs` or console output
2. MongoDB is running: `mongod --version`
3. Redis is running (if using queue)
4. Proxies are valid and working
5. Test proxy connection: `node test-proxy-connection.js`

### Proxies Not Rotating

**Problem:** Using same IP repeatedly

**Check:**
1. Verify multiple proxies entered (one per line)
2. Check backend logs: should see "Starting scrape job with N proxies"
3. Session rotation enabled (every 5 pages by default)

---

## 💰 Cost Estimation

### For 700,000 Companies

**Bandwidth:**
- Average page size: 500KB
- 700,000 companies = ~350GB
- Directory pages: ~50GB
- **Total: ~400GB**

**Proxy Costs:**

| Provider | Plan Type | Cost | Enough? |
|----------|-----------|------|---------|
| **Smartproxy** | 8GB | $75/month | ❌ No |
| **Smartproxy** | Unlimited | $500/month | ✅ Yes |
| **Bright Data** | Pay-as-you-go | $400-600 | ✅ Yes |
| **Oxylabs** | Unlimited | $300/month | ✅ Yes |
| **IPRoyal** | Pay-as-you-go | $300-500 | ✅ Yes |

**Recommended:** Unlimited residential plans for large scrapes

---

## 🎯 Best Practices

### 1. Start Small
- Test with 100 companies first
- Verify data quality
- Check proxies working
- Then scale to full 700k

### 2. Use Residential Proxies
- Datacenter proxies WILL get blocked
- Residential IPs look like real users
- Higher success rate (99%+)

### 3. Rotate Regularly
- Don't reuse same proxy too frequently
- Default: rotates every 5 pages
- Can adjust in code if needed

### 4. Monitor Progress
- Watch real-time updates in UI
- Check for error spikes
- Pause if too many failures

### 5. Keep Proxies Fresh
- Add new proxies if some fail
- Remove dead proxies from list
- Most providers rotate IPs automatically

---

## 📚 Code Reference

### Backend Files Modified
- `backend/controllers/scraperController.js:13-35` - Proxy validation
- `backend/controllers/scraperController.js:346-367` - Proxy usage
- `backend/scraper/dnbScraperStealth.js` - Proxy implementation

### Frontend Files Modified
- `frontend/src/components/Dashboard.js:50` - Proxy state
- `frontend/src/components/Dashboard.js:176-195` - Validation function
- `frontend/src/components/Dashboard.js:329-356` - UI input field

---

## 🔐 Security Notes

1. **Never commit proxies to Git**
   - Add to `.gitignore`
   - Use environment variables for production

2. **Secure proxy credentials**
   - Store in environment variables
   - Don't share in logs or screenshots

3. **API Key Authentication**
   - All API calls require `X-API-Key` header
   - Keep API key secret

---

## ✨ Summary

You now have a **fully provider-agnostic proxy system**:

✅ Enter proxies from ANY provider in the UI
✅ Automatic validation and error handling
✅ Automatic rotation across proxies
✅ Session rotation for anti-detection
✅ Real-time progress monitoring
✅ Works with HTTP, HTTPS, and SOCKS5
✅ Fallback to .env proxies if needed

**Ready to scrape 700,000+ companies with residential proxies!** 🚀
