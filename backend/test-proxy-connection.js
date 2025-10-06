const { chromium } = require('playwright');
require('dotenv').config();

async function testProxy() {
  const proxy = process.env.PROXIES?.split(',')[0];

  console.log('='.repeat(60));
  console.log('PROXY CONNECTION TEST');
  console.log('='.repeat(60));

  if (!proxy) {
    console.error('\n❌ No proxy configured in .env');
    console.error('\nAdd this to your .env file:');
    console.error('PROXIES=http://username:password@host:port');
    console.error('\nExample:');
    console.error('PROXIES=http://user123:pass456@gate.smartproxy.com:7000');
    process.exit(1);
  }

  console.log('\n✓ Proxy found in .env');
  console.log('Proxy:', proxy.replace(/:([^:@]+)@/, ':****@')); // Hide password

  // Parse proxy
  const match = proxy.match(/^(https?):\/\/([^:]+):([^@]+)@([^:]+):(\d+)$/);
  if (!match) {
    console.error('\n❌ Invalid proxy format');
    console.error('Expected: http://username:password@host:port');
    console.error('Got:', proxy);
    process.exit(1);
  }

  console.log('\n✓ Proxy format valid');
  console.log('  Server:', `${match[1]}://${match[4]}:${match[5]}`);
  console.log('  Username:', match[2]);
  console.log('  Password:', '****');

  try {
    console.log('\n--- Launching browser with proxy ---');
    const browser = await chromium.launch({
      headless: true,
      proxy: {
        server: `${match[1]}://${match[4]}:${match[5]}`,
        username: match[2],
        password: match[3]
      }
    });

    const page = await browser.newPage();
    console.log('✓ Browser launched');

    // Test 1: Check IP
    console.log('\n--- Test 1: Checking your IP address ---');
    try {
      await page.goto('https://api.ipify.org?format=json', { timeout: 20000 });
      const ipResponse = await page.textContent('body');
      const ipData = JSON.parse(ipResponse);
      console.log('✓ Your IP through proxy:', ipData.ip);

      // Check if it's a residential IP
      await page.goto(`https://ipapi.co/${ipData.ip}/json/`, { timeout: 20000 });
      const locationData = await page.textContent('body');
      const location = JSON.parse(locationData);
      console.log('  Location:', location.city, location.region, location.country_name);
      console.log('  ISP:', location.org);

    } catch (error) {
      console.error('❌ Failed to check IP:', error.message);
    }

    // Test 2: Access DNB
    console.log('\n--- Test 2: Testing DNB access ---');
    try {
      console.log('Attempting to access DNB...');
      await page.goto('https://www.dnb.com/business-directory/company-information.information.cn.html?page=1', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await page.waitForTimeout(3000);

      const content = await page.textContent('body');

      if (content.toLowerCase().includes('access denied') || content.toLowerCase().includes('blocked')) {
        console.error('\n❌ STILL BLOCKED BY DNB');
        console.error('The proxy might be:');
        console.error('  - A datacenter proxy (need residential)');
        console.error('  - Already flagged by DNB');
        console.error('  - Not working properly');
        console.error('\nCheck with your proxy provider!');
      } else if (content.length < 100) {
        console.warn('\n⚠️  Page loaded but seems empty');
        console.warn('Content length:', content.length);
      } else {
        console.log('\n✅ SUCCESS! DNB is accessible through proxy!');
        console.log('✓ Page loaded successfully');
        console.log('✓ No "Access Denied" message');
        console.log('✓ Content length:', content.length, 'characters');

        // Try to find companies
        const hasCompanies = content.includes('Company') || content.includes('company');
        if (hasCompanies) {
          console.log('✓ Page contains company information');
        }

        console.log('\n🎉 Proxy is working! Ready to scrape!');
      }

      // Save screenshot for manual verification
      await page.screenshot({ path: 'proxy-test-screenshot.png', fullPage: true });
      console.log('\n✓ Screenshot saved: proxy-test-screenshot.png');

    } catch (error) {
      console.error('\n❌ Failed to access DNB:', error.message);
      console.error('\nThis could mean:');
      console.error('  - Proxy is not working');
      console.error('  - DNB is blocking the proxy IP');
      console.error('  - Network timeout');
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nCheck:');
    console.error('  1. Proxy credentials are correct');
    console.error('  2. Proxy has available bandwidth');
    console.error('  3. Proxy server is online');
    process.exit(1);
  }
}

testProxy();
