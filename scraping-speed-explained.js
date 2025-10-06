// DNB Scraping Speed Explanation and Optimization

function explainSpeed(companyCount) {
  console.log('='.repeat(60));
  console.log('WHY DOES SCRAPING TAKE SO LONG?');
  console.log('='.repeat(60));
  console.log('');

  const companiesPerPage = 25;
  const directoryPages = Math.ceil(companyCount / companiesPerPage);
  const profilePages = companyCount;
  const totalPages = directoryPages + profilePages;

  console.log('📊 THE NUMBERS:');
  console.log('─'.repeat(60));
  console.log(`Companies:              ${companyCount.toLocaleString()}`);
  console.log(`Directory pages:        ${directoryPages.toLocaleString()}`);
  console.log(`Profile pages:          ${profilePages.toLocaleString()}`);
  console.log(`TOTAL PAGES:            ${totalPages.toLocaleString()}`);
  console.log('');

  console.log('⏱️  WHY THE DELAYS?');
  console.log('─'.repeat(60));
  console.log('');
  console.log('🤖 Anti-Detection Requirements:');
  console.log('  • DNB has VERY strong bot protection (Akamai)');
  console.log('  • Too fast = instant permanent ban');
  console.log('  • Must mimic human browsing behavior');
  console.log('  • Need random delays between requests');
  console.log('');

  console.log('Current settings (backend/.env):');
  console.log('  MIN_DELAY = 5,000ms  (5 seconds)');
  console.log('  MAX_DELAY = 15,000ms (15 seconds)');
  console.log('  AVERAGE   = 10,000ms (10 seconds)');
  console.log('');

  const minDelay = 5;
  const maxDelay = 15;
  const avgDelay = 10;

  const timeWithCurrent = (totalPages * avgDelay) / 3600;
  const daysWithCurrent = timeWithCurrent / 24;

  console.log('📐 THE MATH:');
  console.log('─'.repeat(60));
  console.log(`${totalPages.toLocaleString()} pages × ${avgDelay} seconds = ${(totalPages * avgDelay).toLocaleString()} seconds`);
  console.log(`${(totalPages * avgDelay).toLocaleString()} seconds ÷ 3600 = ${timeWithCurrent.toFixed(1)} hours`);
  console.log(`${timeWithCurrent.toFixed(1)} hours ÷ 24 = ${daysWithCurrent.toFixed(1)} days`);
  console.log('');

  console.log('='.repeat(60));
  console.log('🚀 HOW TO SPEED IT UP');
  console.log('='.repeat(60));
  console.log('');

  const strategies = [
    {
      name: 'Reduce Delays (Risky)',
      minDelay: 3,
      maxDelay: 8,
      avgDelay: 5,
      risk: 'HIGH',
      speedup: '2x faster'
    },
    {
      name: 'Moderate Delays (Balanced)',
      minDelay: 4,
      maxDelay: 10,
      avgDelay: 7,
      risk: 'MEDIUM',
      speedup: '1.4x faster'
    },
    {
      name: 'Run Multiple Jobs (BEST)',
      minDelay: 5,
      maxDelay: 15,
      avgDelay: 10,
      parallel: 3,
      risk: 'LOW',
      speedup: '3x faster'
    },
    {
      name: 'Aggressive + Parallel',
      minDelay: 3,
      maxDelay: 8,
      avgDelay: 5,
      parallel: 3,
      risk: 'MEDIUM-HIGH',
      speedup: '6x faster'
    }
  ];

  console.log('Strategy'.padEnd(30) + 'Time'.padEnd(15) + 'Risk'.padEnd(15) + 'Speedup');
  console.log('─'.repeat(60));

  strategies.forEach(strategy => {
    let totalTime;
    if (strategy.parallel) {
      totalTime = (totalPages * strategy.avgDelay) / strategy.parallel / 3600 / 24;
    } else {
      totalTime = (totalPages * strategy.avgDelay) / 3600 / 24;
    }

    const riskIcon = strategy.risk === 'HIGH' ? '🔴' :
                    strategy.risk === 'MEDIUM-HIGH' ? '🟠' :
                    strategy.risk === 'MEDIUM' ? '🟡' : '🟢';

    console.log(
      strategy.name.padEnd(30) +
      `${totalTime.toFixed(1)} days`.padEnd(15) +
      `${riskIcon} ${strategy.risk}`.padEnd(15) +
      strategy.speedup
    );
  });

  console.log('');
}

function showParallelStrategy(companyCount) {
  console.log('='.repeat(60));
  console.log('🎯 BEST STRATEGY: RUN PARALLEL JOBS');
  console.log('='.repeat(60));
  console.log('');

  console.log('Instead of scraping 100,000 sequentially:');
  console.log('  ❌ 1 job × 100,000 companies = 12 days');
  console.log('');
  console.log('Run multiple jobs in parallel:');
  console.log('  ✅ 3 jobs × 33,333 companies each = 4 days');
  console.log('  ✅ 5 jobs × 20,000 companies each = 2.4 days');
  console.log('  ✅ 10 jobs × 10,000 companies each = 1.2 days');
  console.log('');

  console.log('How it works:');
  console.log('─'.repeat(60));
  console.log('');
  console.log('1. Split your target into chunks:');
  console.log('   • Job 1: Companies 1-33,333');
  console.log('   • Job 2: Companies 33,334-66,667');
  console.log('   • Job 3: Companies 66,668-100,000');
  console.log('');
  console.log('2. Start each job with different proxies:');
  console.log('   • Job 1: Uses proxies 1-10');
  console.log('   • Job 2: Uses proxies 11-20');
  console.log('   • Job 3: Uses proxies 21-30');
  console.log('');
  console.log('3. All jobs run simultaneously');
  console.log('');
  console.log('4. Results automatically saved to same database');
  console.log('');

  const parallelScenarios = [
    { jobs: 1, time: 12.0 },
    { jobs: 2, time: 6.0 },
    { jobs: 3, time: 4.0 },
    { jobs: 5, time: 2.4 },
    { jobs: 10, time: 1.2 }
  ];

  console.log('Parallel Jobs'.padEnd(20) + 'Time to Complete'.padEnd(20) + 'Speedup');
  console.log('─'.repeat(60));

  parallelScenarios.forEach(scenario => {
    const speedup = parallelScenarios[0].time / scenario.time;
    console.log(
      scenario.jobs.toString().padEnd(20) +
      `${scenario.time} days`.padEnd(20) +
      `${speedup.toFixed(1)}x faster`
    );
  });

  console.log('');
}

function showOptimizations() {
  console.log('='.repeat(60));
  console.log('⚡ OTHER OPTIMIZATIONS');
  console.log('='.repeat(60));
  console.log('');

  console.log('1️⃣  REDUCE DELAYS (Moderate Risk)');
  console.log('─'.repeat(60));
  console.log('Edit backend/.env:');
  console.log('  MIN_DELAY=3000  # Down from 5000 (3 seconds)');
  console.log('  MAX_DELAY=8000  # Down from 15000 (8 seconds)');
  console.log('');
  console.log('Result: ~6 days instead of 12 days');
  console.log('Risk: Medium - may trigger more bot detection');
  console.log('');

  console.log('2️⃣  INCREASE CONCURRENCY (High Risk)');
  console.log('─'.repeat(60));
  console.log('Edit backend/.env:');
  console.log('  MAX_CONCURRENCY=3  # Up from 1');
  console.log('');
  console.log('Result: 3x faster theoretically');
  console.log('Risk: HIGH - DNB may detect multiple parallel requests');
  console.log('Not recommended unless you have many proxies');
  console.log('');

  console.log('3️⃣  SKIP SOME DATA FIELDS (Not Recommended)');
  console.log('─'.repeat(60));
  console.log('Only scrape directory, skip profile pages');
  console.log('');
  console.log('Result: ~96% faster (only 4,000 pages vs 104,000)');
  console.log('Downside: Missing key data (DBA, principal, phone, etc.)');
  console.log('❌ Not recommended - defeats the purpose');
  console.log('');

  console.log('4️⃣  USE FASTER PROXIES');
  console.log('─'.repeat(60));
  console.log('Some proxy providers have faster response times');
  console.log('');
  console.log('Typical proxy latency:');
  console.log('  • Slow proxies: +2-3 seconds per request');
  console.log('  • Fast proxies: +0.5-1 second per request');
  console.log('');
  console.log('Can save: 1-2 days on 100K scrape');
  console.log('');
}

function showRecommendations() {
  console.log('='.repeat(60));
  console.log('🎯 RECOMMENDED APPROACH FOR 100K COMPANIES');
  console.log('='.repeat(60));
  console.log('');

  console.log('✅ OPTION 1: Balanced (Recommended)');
  console.log('─'.repeat(60));
  console.log('  • Run 3 parallel jobs');
  console.log('  • Use moderate delays (4-10 seconds)');
  console.log('  • 30 total proxies (10 per job)');
  console.log('  • Time: ~3-4 days');
  console.log('  • Risk: LOW');
  console.log('');

  console.log('✅ OPTION 2: Fast & Safe');
  console.log('─'.repeat(60));
  console.log('  • Run 5 parallel jobs');
  console.log('  • Keep current delays (5-15 seconds)');
  console.log('  • 50 total proxies (10 per job)');
  console.log('  • Time: ~2.5 days');
  console.log('  • Risk: LOW');
  console.log('');

  console.log('✅ OPTION 3: Maximum Speed (Risky)');
  console.log('─'.repeat(60));
  console.log('  • Run 10 parallel jobs');
  console.log('  • Reduce delays to 3-8 seconds');
  console.log('  • 100 total proxies (10 per job)');
  console.log('  • Time: ~0.6 days (14 hours)');
  console.log('  • Risk: MEDIUM-HIGH');
  console.log('');

  console.log('💡 MY RECOMMENDATION:');
  console.log('─'.repeat(60));
  console.log('  Start with Option 1 (3 parallel jobs, moderate delays)');
  console.log('  • Safe, proven approach');
  console.log('  • 3-4 days is acceptable for 100K companies');
  console.log('  • Low risk of getting blocked');
  console.log('  • Easy to manage and monitor');
  console.log('');
  console.log('  If it works well, scale to Option 2 for even faster results!');
  console.log('');
}

function howToRunParallel() {
  console.log('='.repeat(60));
  console.log('📝 HOW TO RUN PARALLEL JOBS');
  console.log('='.repeat(60));
  console.log('');

  console.log('Method 1: Frontend UI (Easy)');
  console.log('─'.repeat(60));
  console.log('');
  console.log('1. Open frontend 3 times in different browser tabs');
  console.log('');
  console.log('2. Configure each job:');
  console.log('   Tab 1:');
  console.log('     URL: https://www.dnb.com/business-directory/...?page=1');
  console.log('     Expected Count: 33,333');
  console.log('     Proxies: [paste proxies 1-10]');
  console.log('');
  console.log('   Tab 2:');
  console.log('     URL: https://www.dnb.com/business-directory/...?page=1334');
  console.log('     Expected Count: 33,333');
  console.log('     Proxies: [paste proxies 11-20]');
  console.log('');
  console.log('   Tab 3:');
  console.log('     URL: https://www.dnb.com/business-directory/...?page=2668');
  console.log('     Expected Count: 33,334');
  console.log('     Proxies: [paste proxies 21-30]');
  console.log('');
  console.log('3. Click Start on all tabs');
  console.log('');
  console.log('4. Download results from each job when complete');
  console.log('');

  console.log('Method 2: API (Advanced)');
  console.log('─'.repeat(60));
  console.log('');
  console.log('bash');
  console.log('# Start Job 1');
  console.log('curl -X POST http://your-api/scrape/start \\');
  console.log('  -H "x-api-key: YOUR_KEY" \\');
  console.log('  -d \'{"url": "...", "expectedCount": 33333, "proxies": [...]}\'');
  console.log('');
  console.log('# Start Job 2');
  console.log('curl -X POST http://your-api/scrape/start \\');
  console.log('  -H "x-api-key: YOUR_KEY" \\');
  console.log('  -d \'{"url": "...", "expectedCount": 33333, "proxies": [...]}\'');
  console.log('');
  console.log('# Start Job 3');
  console.log('curl -X POST http://your-api/scrape/start \\');
  console.log('  -H "x-api-key: YOUR_KEY" \\');
  console.log('  -d \'{"url": "...", "expectedCount": 33334, "proxies": [...]}\'');
  console.log('');
}

// Main execution
const companyCount = parseInt(process.argv[2]) || 100000;

explainSpeed(companyCount);
showParallelStrategy(companyCount);
showOptimizations();
showRecommendations();
howToRunParallel();

console.log('='.repeat(60));
console.log('🎯 SUMMARY');
console.log('='.repeat(60));
console.log('');
console.log('Q: Why 12 days?');
console.log('A: 104,000 pages × 10 seconds average delay = anti-detection');
console.log('');
console.log('Q: How to make it faster?');
console.log('A: Run 3-5 parallel jobs = finish in 2-4 days! ⚡');
console.log('');
console.log('Q: Is that safe?');
console.log('A: YES! Each job uses different proxies, no conflict.');
console.log('');
console.log('✅ Recommended: 3 parallel jobs × 33K companies = 4 days');
console.log('');
console.log('='.repeat(60));
