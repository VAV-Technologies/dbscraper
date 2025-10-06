# Residential Proxy Setup Guide

## ✅ Proxy Support Added!

The scraper now supports residential proxies with automatic rotation. This will bypass DNB's bot protection.

---

## Step 1: Choose a Proxy Provider

### Recommended Providers:

#### Option A: Smartproxy (Best Value)
- **Price:** $75/month (8GB)
- **Quality:** High (real residential IPs)
- **Coverage:** Global
- **Setup:** Easy
- **Sign up:** https://smartproxy.com

#### Option B: Bright Data (Premium)
- **Price:** $500/month (but best quality)
- **Quality:** Highest
- **Coverage:** Global + rotating
- **Setup:** Easy
- **Sign up:** https://brightdata.com

#### Option C: Oxylabs (Mid-tier)
- **Price:** $300/month
- **Quality:** High
- **Coverage:** Global
- **Setup:** Medium
- **Sign up:** https://oxylabs.io

---

## Step 2: Get Your Proxy Credentials

After signing up, you'll receive:
- **Proxy Host:** e.g., `gate.smartproxy.com` or `brd.superproxy.io`
- **Port:** e.g., `7000` or `22225`
- **Username:** Your account username
- **Password:** Your account password

### Example Credentials:

**Smartproxy:**
```
Host: gate.smartproxy.com
Port: 7000
Username: your_username
Password: your_password
```

**Bright Data:**
```
Host: brd.superproxy.io
Port: 22225
Username: brd-customer-XXXXX-zone-residential
Password: your_password
```

---

## Step 3: Configure the Scraper

### Add to `.env` File

Edit `backend/.env` and add:

```env
# Proxy Configuration
PROXIES=http://USERNAME:PASSWORD@gate.smartproxy.com:7000

# Multiple proxies (comma-separated for rotation)
# PROXIES=http://user:pass@proxy1.com:7000,http://user:pass@proxy2.com:7000

# Browser Settings
HEADLESS=true
```

### Example `.env` with Smartproxy:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/dnb_scraper

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Proxy Configuration (REQUIRED for DNB)
PROXIES=http://smartproxy_user:smartproxy_pass@gate.smartproxy.com:7000

# Server
PORT=5000
FRONTEND_URL=http://localhost:3000

# Browser
HEADLESS=true
```

---

## Step 4: Verify Proxy Works

### Test Script:

```bash
cd backend
node test-proxy-connection.js
```

This will:
1. Test proxy connection
2. Check if DNB is accessible through proxy
3. Verify your IP is masked

---

## Step 5: Start Scraping

Once proxies are configured, just start scraping normally:

```bash
# Start backend
cd backend
npm start

# OR with PM2
pm2 start server.js
```

The scraper will automatically:
- Use residential proxies
- Rotate IPs
- Bypass bot protection
- Scrape all data fields

---

## Proxy Formats Supported

### Format 1: With Authentication
```
http://username:password@host:port
```

### Format 2: Multiple Proxies (Rotation)
```
http://user1:pass1@proxy1.com:7000,http://user2:pass2@proxy2.com:7000
```

### Format 3: SOCKS5
```
socks5://username:password@host:port
```

---

## Cost Breakdown

### For 700,000 Companies:

**Traffic Estimate:**
- Each company page: ~500KB
- 700,000 × 500KB = ~350GB total
- Plus directory pages: ~50GB
- **Total: ~400GB**

### Provider Costs:

| Provider | Plan Needed | Cost/Month | Enough for 700k? |
|----------|-------------|------------|------------------|
| **Smartproxy** | 8GB plan | $75 | ❌ Need more |
| **Smartproxy** | 25GB plan | $200 | ❌ Need more |
| **Smartproxy** | Unlimited | $500 | ✅ Yes |
| **Bright Data** | Pay-as-you-go | ~$400-600 | ✅ Yes |
| **Oxylabs** | Unlimited | $300 | ✅ Yes |

### Recommendation:

**Option 1: Smartproxy Unlimited ($500/month)**
- Best for one-time large scrape
- Unlimited bandwidth
- Easy setup

**Option 2: Bright Data Pay-as-you-go**
- Pay only for what you use
- ~$400-600 for 700k companies
- Best quality

---

## Advanced Configuration

### Custom Delays (Optional)

In `.env`:
```env
MIN_DELAY=5000  # Minimum 5 seconds between requests
MAX_DELAY=15000 # Maximum 15 seconds
```

### Session Rotation

The scraper automatically rotates browser sessions every 5 pages to avoid detection.

You can adjust in code:
```javascript
// In dnbScraperStealth.js
const SESSION_ROTATION_INTERVAL = 5; // Change this number
```

---

## Troubleshooting

### Error: "Proxy Connection Failed"

**Solution:**
1. Check username/password are correct
2. Verify proxy host/port
3. Make sure you have bandwidth left
4. Test proxy in browser first

### Error: "Still Getting Blocked"

**Solution:**
1. Use residential proxies (NOT datacenter)
2. Increase delays between requests
3. Rotate sessions more frequently
4. Contact proxy provider for "sticky sessions"

### Slow Scraping

**Normal Speed:** 3,000-5,000 companies per day

**If slower:**
1. Reduce delays (but risk detection)
2. Use multiple proxy IPs
3. Increase concurrency (carefully)

---

## Proxy Test Script

Save as `backend/test-proxy-connection.js`:

```javascript
const { chromium } = require('playwright');

async function testProxy() {
  const proxy = process.env.PROXIES?.split(',')[0];

  if (!proxy) {
    console.error('❌ No proxy configured in .env');
    process.exit(1);
  }

  console.log('Testing proxy:', proxy);

  // Parse proxy
  const match = proxy.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/);
  if (!match) {
    console.error('❌ Invalid proxy format');
    process.exit(1);
  }

  const browser = await chromium.launch({
    proxy: {
      server: `${match[1]}://${match[4]}:${match[5]}`,
      username: match[2],
      password: match[3]
    }
  });

  const page = await browser.newPage();

  // Test 1: Check IP
  console.log('\n✓ Test 1: Checking IP...');
  await page.goto('https://api.ipify.org?format=json');
  const ip = await page.textContent('body');
  console.log('Your IP through proxy:', ip);

  // Test 2: Access DNB
  console.log('\n✓ Test 2: Testing DNB access...');
  try {
    await page.goto('https://www.dnb.com/business-directory/company-information.information.cn.html', {
      timeout: 30000
    });

    const content = await page.textContent('body');
    if (content.includes('Access Denied')) {
      console.error('❌ Still blocked by DNB');
    } else {
      console.log('✓ DNB accessible!');
    }
  } catch (error) {
    console.error('❌ Failed to access DNB:', error.message);
  }

  await browser.close();
  console.log('\n✓ Proxy test complete!');
}

testProxy();
```

---

## Next Steps

1. **Sign up** for proxy provider
2. **Get credentials**
3. **Add to `.env`**
4. **Test connection**
5. **Start scraping!**

---

## Support

If you need help:
1. Check proxy provider docs
2. Test proxy in browser first
3. Verify `.env` format is correct
4. Check backend logs for errors

The scraper is ready - just add your proxy credentials!
