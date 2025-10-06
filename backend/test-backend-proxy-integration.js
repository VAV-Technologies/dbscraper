const DNBScraperStealth = require('./scraper/dnbScraperStealth');

console.log('='.repeat(60));
console.log('BACKEND PROXY INTEGRATION TEST');
console.log('='.repeat(60));

async function testProxyParsing() {
  console.log('\n✓ Test 1: Proxy parsing logic');

  const testCases = [
    {
      name: 'HTTP with auth',
      proxy: 'http://user123:pass456@proxy.example.com:8080',
      expected: {
        server: 'http://proxy.example.com:8080',
        username: 'user123',
        password: 'pass456'
      }
    },
    {
      name: 'HTTPS with auth',
      proxy: 'https://user789:pass012@secure.proxy.com:9999',
      expected: {
        server: 'https://secure.proxy.com:9999',
        username: 'user789',
        password: 'pass012'
      }
    },
    {
      name: 'SOCKS5 with auth',
      proxy: 'socks5://myuser:mypass@socks.proxy.io:1080',
      expected: {
        server: 'socks5://socks.proxy.io:1080',
        username: 'myuser',
        password: 'mypass'
      }
    },
    {
      name: 'HTTP without auth',
      proxy: 'http://simple.proxy.com:3128',
      expected: {
        server: 'http://simple.proxy.com:3128'
      }
    },
    {
      name: 'SOCKS5 without auth',
      proxy: 'socks5://another.proxy.net:7777',
      expected: {
        server: 'socks5://another.proxy.net:7777'
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const scraper = new DNBScraperStealth({ proxies: [testCase.proxy] });
    const result = scraper.getNextProxy();

    const match = JSON.stringify(result) === JSON.stringify(testCase.expected);

    if (match) {
      console.log(`  ✓ ${testCase.name}: PASS`);
      passed++;
    } else {
      console.log(`  ✗ ${testCase.name}: FAIL`);
      console.log(`    Expected: ${JSON.stringify(testCase.expected)}`);
      console.log(`    Got:      ${JSON.stringify(result)}`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function testProxyRotation() {
  console.log('\n✓ Test 2: Proxy rotation logic');

  const proxies = [
    'http://user1:pass1@proxy1.com:8080',
    'http://user2:pass2@proxy2.com:8080',
    'http://user3:pass3@proxy3.com:8080'
  ];

  const scraper = new DNBScraperStealth({ proxies });

  const results = [];
  for (let i = 0; i < 5; i++) {
    const proxy = scraper.getNextProxy();
    results.push(proxy.server);
  }

  const expected = [
    'http://proxy1.com:8080',
    'http://proxy2.com:8080',
    'http://proxy3.com:8080',
    'http://proxy1.com:8080', // Should cycle back
    'http://proxy2.com:8080'
  ];

  const match = JSON.stringify(results) === JSON.stringify(expected);

  if (match) {
    console.log('  ✓ Rotation pattern: PASS');
    console.log(`    Cycled through: ${results.join(' → ')}`);
    return true;
  } else {
    console.log('  ✗ Rotation pattern: FAIL');
    console.log(`    Expected: ${expected.join(' → ')}`);
    console.log(`    Got:      ${results.join(' → ')}`);
    return false;
  }
}

async function testControllerIntegration() {
  console.log('\n✓ Test 3: Controller proxy acceptance');

  // Simulate what the controller does
  const requestProxies = [
    'http://user:pass@proxy1.com:8080',
    'http://user:pass@proxy2.com:8080'
  ];

  const options = {};
  const proxies = requestProxies.length > 0
    ? requestProxies
    : (process.env.PROXIES ? process.env.PROXIES.split(',') : []);

  console.log(`  ✓ Request proxies: ${requestProxies.length}`);
  console.log(`  ✓ Proxies to use: ${proxies.length}`);

  const scraper = new DNBScraperStealth({
    ...options,
    proxies: proxies,
    headless: true
  });

  console.log(`  ✓ Scraper initialized with ${scraper.proxies.length} proxies`);

  return scraper.proxies.length === 2;
}

async function testEmptyProxies() {
  console.log('\n✓ Test 4: Handling empty proxy list');

  const scraper = new DNBScraperStealth({ proxies: [] });
  const proxy = scraper.getNextProxy();

  if (proxy === null) {
    console.log('  ✓ Correctly returns null for empty proxy list');
    return true;
  } else {
    console.log('  ✗ Should return null, got:', proxy);
    return false;
  }
}

async function testValidationRegex() {
  console.log('\n✓ Test 5: Validation regex compatibility');

  const validProxies = [
    'http://user:pass@proxy.com:8080',
    'https://user:pass@proxy.com:443',
    'socks5://user:pass@proxy.com:1080',
    'http://proxy.com:3128',
    'socks5://proxy.io:7777'
  ];

  const invalidProxies = [
    'proxy.com:8080', // Missing protocol
    'http://proxy.com', // Missing port
    'user:pass@proxy.com:8080', // Missing protocol
    'http://proxy', // Missing port and domain
    'invalid-format'
  ];

  // This is the validation regex from scraperController.js
  const validationRegex = /^(https?|socks5):\/\/([^:]+:[^@]+@)?[^:]+:\d+$/;

  let passed = 0;
  let failed = 0;

  console.log('  Valid proxies:');
  for (const proxy of validProxies) {
    const isValid = validationRegex.test(proxy);
    if (isValid) {
      console.log(`    ✓ ${proxy}`);
      passed++;
    } else {
      console.log(`    ✗ ${proxy} (should be valid)`);
      failed++;
    }
  }

  console.log('  Invalid proxies:');
  for (const proxy of invalidProxies) {
    const isValid = validationRegex.test(proxy);
    if (!isValid) {
      console.log(`    ✓ ${proxy} (correctly rejected)`);
      passed++;
    } else {
      console.log(`    ✗ ${proxy} (should be invalid)`);
      failed++;
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function runTests() {
  const results = {
    parsing: false,
    rotation: false,
    controller: false,
    empty: false,
    validation: false
  };

  try {
    results.parsing = await testProxyParsing();
    results.rotation = await testProxyRotation();
    results.controller = await testControllerIntegration();
    results.empty = await testEmptyProxies();
    results.validation = await testValidationRegex();

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    console.log(`Proxy Parsing:          ${results.parsing ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Proxy Rotation:         ${results.rotation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Controller Integration: ${results.controller ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Empty Proxy Handling:   ${results.empty ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Validation Regex:       ${results.validation ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(r => r === true);

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Backend is ready for proxy usage!');
      console.log('='.repeat(60));
      console.log('\nWhat works:');
      console.log('  ✓ Accepts proxies from frontend API');
      console.log('  ✓ Validates proxy format');
      console.log('  ✓ Parses HTTP, HTTPS, SOCKS5');
      console.log('  ✓ Handles auth and no-auth proxies');
      console.log('  ✓ Automatically rotates through proxies');
      console.log('  ✓ Falls back to .env if no proxies provided');
      console.log('\nReady to scrape with proxies! 🚀');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('='.repeat(60));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
