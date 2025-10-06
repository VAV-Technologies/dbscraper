// Proxy Count Calculator for DNB Scraping

function calculateProxyCount(companyCount) {
  console.log('='.repeat(60));
  console.log('DNB SCRAPER PROXY COUNT CALCULATOR');
  console.log('='.repeat(60));
  console.log(`\nCalculating for: ${companyCount.toLocaleString()} companies`);
  console.log('');

  // Scraping parameters
  const companiesPerPage = 25; // Directory listing
  const directoryPages = Math.ceil(companyCount / companiesPerPage);
  const totalPages = directoryPages + companyCount; // Directory pages + profile pages

  // Session rotation settings
  const pagesPerSession = 5; // Rotate session every 5 pages (anti-detection)
  const totalSessions = Math.ceil(totalPages / pagesPerSession);

  // Time estimates
  const avgDelayPerPage = 10; // seconds (5-15 range, avg 10)
  const totalTimeSeconds = totalPages * avgDelayPerPage;
  const totalTimeHours = totalTimeSeconds / 3600;
  const totalTimeDays = totalTimeHours / 24;

  console.log('📊 SCRAPING DETAILS:');
  console.log('─'.repeat(60));
  console.log(`Companies to scrape:        ${companyCount.toLocaleString()}`);
  console.log(`Directory pages:            ${directoryPages.toLocaleString()}`);
  console.log(`Company profile pages:      ${companyCount.toLocaleString()}`);
  console.log(`Total pages to load:        ${totalPages.toLocaleString()}`);
  console.log('');
  console.log(`Pages per session:          ${pagesPerSession}`);
  console.log(`Total sessions needed:      ${totalSessions.toLocaleString()}`);
  console.log(`Avg delay per page:         ${avgDelayPerPage} seconds`);
  console.log('');
  console.log(`Estimated time:             ${totalTimeHours.toFixed(1)} hours (${totalTimeDays.toFixed(1)} days)`);
  console.log('');

  console.log('='.repeat(60));
  console.log('🔄 PROXY ROTATION STRATEGY');
  console.log('='.repeat(60));
  console.log('');
  console.log('How it works:');
  console.log('  • Every 5 pages = new browser session');
  console.log('  • New session = rotate to next proxy');
  console.log('  • Proxies cycle in round-robin pattern');
  console.log('  • Same proxy reused after full rotation');
  console.log('');

  // Calculate recommendations for different scenarios
  const scenarios = [
    {
      name: 'Minimum (Conservative)',
      count: 5,
      description: 'Bare minimum, high reuse per proxy',
      requestsPerProxy: Math.ceil(totalSessions / 5),
      riskLevel: 'HIGH'
    },
    {
      name: 'Recommended (Balanced)',
      count: 15,
      description: 'Good balance of cost vs safety',
      requestsPerProxy: Math.ceil(totalSessions / 15),
      riskLevel: 'MEDIUM'
    },
    {
      name: 'Safe (Low Risk)',
      count: 30,
      description: 'Lower IP reuse, safer from blocks',
      requestsPerProxy: Math.ceil(totalSessions / 30),
      riskLevel: 'LOW'
    },
    {
      name: 'Maximum Safety',
      count: 50,
      description: 'Minimal IP reuse, best anti-detection',
      requestsPerProxy: Math.ceil(totalSessions / 50),
      riskLevel: 'VERY LOW'
    }
  ];

  console.log('Scenario'.padEnd(25) + 'Proxies'.padEnd(12) + 'Sessions/Proxy'.padEnd(18) + 'Risk');
  console.log('─'.repeat(60));

  scenarios.forEach(scenario => {
    const riskColor = scenario.riskLevel === 'HIGH' ? '🔴' :
                     scenario.riskLevel === 'MEDIUM' ? '🟡' :
                     scenario.riskLevel === 'LOW' ? '🟢' : '🟢';

    console.log(
      scenario.name.padEnd(25) +
      scenario.count.toString().padEnd(12) +
      scenario.requestsPerProxy.toLocaleString().padEnd(18) +
      `${riskColor} ${scenario.riskLevel}`
    );
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  console.log('');

  if (companyCount <= 10000) {
    console.log('✅ For ' + companyCount.toLocaleString() + ' companies:');
    console.log('   Recommended: 10-15 proxies');
    console.log('   Each proxy handles ~' + Math.ceil(totalSessions / 15) + ' sessions');
    console.log('   Risk: LOW to MEDIUM');
  } else if (companyCount <= 50000) {
    console.log('✅ For ' + companyCount.toLocaleString() + ' companies:');
    console.log('   Recommended: 20-30 proxies');
    console.log('   Each proxy handles ~' + Math.ceil(totalSessions / 25) + ' sessions');
    console.log('   Risk: LOW');
  } else {
    console.log('✅ For ' + companyCount.toLocaleString() + ' companies:');
    console.log('   Recommended: 30-50 proxies');
    console.log('   Each proxy handles ~' + Math.ceil(totalSessions / 40) + ' sessions');
    console.log('   Risk: LOW to VERY LOW');
  }

  console.log('');
  console.log('🎯 WHY MORE PROXIES = BETTER:');
  console.log('─'.repeat(60));
  console.log('  • Less frequent IP reuse');
  console.log('  • Lower chance of triggering rate limits');
  console.log('  • Better distribution of requests');
  console.log('  • DNB less likely to detect automation');
  console.log('  • Higher success rate overall');
  console.log('');

  return scenarios;
}

function showProxyMath(companyCount) {
  console.log('='.repeat(60));
  console.log('📐 THE MATH EXPLAINED');
  console.log('='.repeat(60));
  console.log('');

  const companiesPerPage = 25;
  const directoryPages = Math.ceil(companyCount / companiesPerPage);
  const profilePages = companyCount;
  const totalPages = directoryPages + profilePages;
  const pagesPerSession = 5;
  const totalSessions = Math.ceil(totalPages / pagesPerSession);

  console.log('Step 1: Calculate total pages');
  console.log(`  Directory pages = ${companyCount.toLocaleString()} ÷ 25 = ${directoryPages.toLocaleString()}`);
  console.log(`  Profile pages = ${companyCount.toLocaleString()}`);
  console.log(`  Total pages = ${directoryPages.toLocaleString()} + ${companyCount.toLocaleString()} = ${totalPages.toLocaleString()}`);
  console.log('');

  console.log('Step 2: Calculate sessions');
  console.log(`  Sessions = ${totalPages.toLocaleString()} ÷ 5 pages/session = ${totalSessions.toLocaleString()} sessions`);
  console.log('');

  console.log('Step 3: Determine proxy count');
  console.log('  Each session uses 1 proxy (rotates round-robin)');
  console.log('');
  console.log('  Examples:');
  console.log(`    5 proxies  → Each used ~${Math.ceil(totalSessions/5).toLocaleString()} times`);
  console.log(`   10 proxies  → Each used ~${Math.ceil(totalSessions/10).toLocaleString()} times`);
  console.log(`   15 proxies  → Each used ~${Math.ceil(totalSessions/15).toLocaleString()} times`);
  console.log(`   30 proxies  → Each used ~${Math.ceil(totalSessions/30).toLocaleString()} times`);
  console.log(`   50 proxies  → Each used ~${Math.ceil(totalSessions/50).toLocaleString()} times`);
  console.log('');

  console.log('💡 Sweet Spot: 15-30 proxies');
  console.log('   Balances cost vs safety effectively');
  console.log('');
}

function compareScenarios() {
  console.log('='.repeat(60));
  console.log('📊 COMPARISON: DIFFERENT COMPANY COUNTS');
  console.log('='.repeat(60));
  console.log('');

  const scenarios = [
    { companies: 1000, recommended: 5 },
    { companies: 10000, recommended: 10 },
    { companies: 50000, recommended: 25 },
    { companies: 100000, recommended: 30 },
    { companies: 700000, recommended: 50 }
  ];

  console.log('Companies'.padEnd(15) + 'Min Proxies'.padEnd(15) + 'Recommended'.padEnd(15) + 'Max Safe');
  console.log('─'.repeat(60));

  scenarios.forEach(scenario => {
    const min = Math.max(3, Math.ceil(scenario.recommended / 2));
    const max = scenario.recommended * 2;

    console.log(
      scenario.companies.toLocaleString().padEnd(15) +
      min.toString().padEnd(15) +
      scenario.recommended.toString().padEnd(15) +
      max.toString()
    );
  });

  console.log('');
}

function costAnalysis(companyCount) {
  console.log('='.repeat(60));
  console.log('💰 COST ANALYSIS');
  console.log('='.repeat(60));
  console.log('');

  console.log('Most proxy providers charge by BANDWIDTH, not proxy count!');
  console.log('');
  console.log('What this means:');
  console.log('  • You can use 5 proxies or 50 proxies → SAME PRICE');
  console.log('  • Price depends on GB used, not number of IPs');
  console.log('  • More proxies = SAFER, not more expensive');
  console.log('');
  console.log('Example providers:');
  console.log('  • Smartproxy Unlimited: $500/month → Use 1 or 1000 proxies');
  console.log('  • Oxylabs Unlimited: $300/month → Unlimited proxies');
  console.log('  • Bright Data: $10/GB → Proxy count doesn\'t matter');
  console.log('');
  console.log('✅ BOTTOM LINE: Use MORE proxies for better results at NO extra cost!');
  console.log('');
}

// Main execution
const companyCount = parseInt(process.argv[2]) || 100000;

calculateProxyCount(companyCount);
showProxyMath(companyCount);
compareScenarios();
costAnalysis(companyCount);

console.log('='.repeat(60));
console.log('🎯 FINAL ANSWER FOR ' + companyCount.toLocaleString() + ' COMPANIES:');
console.log('='.repeat(60));
console.log('');

if (companyCount <= 10000) {
  console.log('  Minimum:     5-10 proxies');
  console.log('  Recommended: 10-15 proxies ⭐');
  console.log('  Maximum:     20-30 proxies');
} else if (companyCount <= 50000) {
  console.log('  Minimum:     10-15 proxies');
  console.log('  Recommended: 20-30 proxies ⭐');
  console.log('  Maximum:     40-50 proxies');
} else if (companyCount <= 100000) {
  console.log('  Minimum:     15-20 proxies');
  console.log('  Recommended: 30-40 proxies ⭐');
  console.log('  Maximum:     50-75 proxies');
} else {
  console.log('  Minimum:     25-30 proxies');
  console.log('  Recommended: 50-75 proxies ⭐');
  console.log('  Maximum:     100+ proxies');
}

console.log('');
console.log('💡 Pro Tip: Since most plans are unlimited IPs, use MORE');
console.log('   rather than FEWER for better anti-detection!');
console.log('');
console.log('='.repeat(60));
