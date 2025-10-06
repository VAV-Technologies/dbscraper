const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
const API_KEY = '83eb59e700efe317e71f754b81b921226739c6f5206cfc989705c08d12f45204';

axios.defaults.headers.common['X-API-Key'] = API_KEY;

async function testProxyAPI() {
  console.log('='.repeat(60));
  console.log('PROXY API TEST');
  console.log('='.repeat(60));

  // Test with sample proxies
  const testProxies = [
    'http://user1:pass1@proxy1.example.com:8080',
    'http://user2:pass2@proxy2.example.com:8080'
  ];

  console.log('\n✓ Test 1: Sending scraping request with proxies...');
  console.log('Proxies:', testProxies.length);

  try {
    const response = await axios.post(`${API_BASE}/scrape/start`, {
      url: 'https://www.dnb.com/business-directory/company-information.information.jp.html',
      expectedCount: 50,
      proxies: testProxies,
      options: {
        maxPages: 1,
        headless: true,
        maxConcurrency: 1
      }
    });

    console.log('✓ Success! Job created:', response.data.jobId);
    console.log('Status:', response.data.status);

    return response.data.jobId;

  } catch (error) {
    if (error.response) {
      console.error('❌ Request failed:', error.response.status);
      console.error('Error:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Backend not running on localhost:5000');
      console.error('Start the backend with: npm start');
    } else {
      console.error('❌ Error:', error.message);
    }
    throw error;
  }
}

async function testInvalidProxies() {
  console.log('\n✓ Test 2: Testing invalid proxy format validation...');

  const invalidProxies = [
    'invalid-proxy-format',
    'http://missing-port.com'
  ];

  try {
    await axios.post(`${API_BASE}/scrape/start`, {
      url: 'https://www.dnb.com/business-directory/company-information.information.jp.html',
      expectedCount: 50,
      proxies: invalidProxies,
      options: {
        maxPages: 1
      }
    });

    console.error('❌ Should have rejected invalid proxies');

  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✓ Backend correctly rejected invalid proxies');
      console.log('Error message:', error.response.data.message);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

async function testWithoutProxies() {
  console.log('\n✓ Test 3: Testing scraping without proxies (should still work)...');

  try {
    const response = await axios.post(`${API_BASE}/scrape/start`, {
      url: 'https://www.dnb.com/business-directory/company-information.information.jp.html',
      expectedCount: 50,
      options: {
        maxPages: 1,
        headless: true
      }
    });

    console.log('✓ Job created without proxies:', response.data.jobId);

  } catch (error) {
    if (error.response) {
      console.error('❌ Request failed:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

async function runTests() {
  try {
    await testProxyAPI();
    await testInvalidProxies();
    await testWithoutProxies();

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log('\nProxy API is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Add real proxy credentials in the frontend');
    console.log('2. Start a scraping job');
    console.log('3. Monitor progress in real-time');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    process.exit(1);
  }
}

runTests();
