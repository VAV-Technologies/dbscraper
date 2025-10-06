// Bandwidth Calculator for DNB Scraping

function calculateBandwidth(companyCount) {
  console.log('='.repeat(60));
  console.log('DNB SCRAPER BANDWIDTH CALCULATOR');
  console.log('='.repeat(60));
  console.log(`\nCalculating for: ${companyCount.toLocaleString()} companies`);
  console.log('');

  // Average sizes based on actual DNB pages
  const directoryPageSize = 200; // KB per directory listing page
  const companiesPerPage = 25; // Companies listed per directory page
  const companyProfileSize = 500; // KB per individual company profile page

  // Calculate number of directory pages needed
  const directoryPages = Math.ceil(companyCount / companiesPerPage);
  const directoryBandwidth = (directoryPages * directoryPageSize) / 1024 / 1024; // Convert to GB

  // Calculate company profile bandwidth
  const profileBandwidth = (companyCount * companyProfileSize) / 1024 / 1024; // Convert to GB

  // Additional overhead (retries, failed requests, etc.)
  const overheadPercentage = 0.10; // 10% overhead
  const totalBandwidth = (directoryBandwidth + profileBandwidth) * (1 + overheadPercentage);

  console.log('📊 BREAKDOWN:');
  console.log('─'.repeat(60));
  console.log(`Directory pages needed:     ${directoryPages.toLocaleString()}`);
  console.log(`Directory page size:        ${directoryPageSize} KB`);
  console.log(`Directory bandwidth:        ${directoryBandwidth.toFixed(2)} GB`);
  console.log('');
  console.log(`Company profiles:           ${companyCount.toLocaleString()}`);
  console.log(`Profile page size:          ${companyProfileSize} KB`);
  console.log(`Profile bandwidth:          ${profileBandwidth.toFixed(2)} GB`);
  console.log('');
  console.log(`Overhead (${overheadPercentage * 100}%):              ${(totalBandwidth - directoryBandwidth - profileBandwidth).toFixed(2)} GB`);
  console.log('─'.repeat(60));
  console.log(`\n🎯 TOTAL BANDWIDTH NEEDED:  ${totalBandwidth.toFixed(2)} GB`);
  console.log(`   (Rounded up for safety:  ${Math.ceil(totalBandwidth)} GB)`);
  console.log('');

  return totalBandwidth;
}

function recommendProxyPlans(bandwidth) {
  console.log('='.repeat(60));
  console.log('RECOMMENDED PROXY PLANS');
  console.log('='.repeat(60));
  console.log('');

  const plans = [
    {
      provider: 'Smartproxy',
      plans: [
        { name: '8 GB', price: 75, bandwidth: 8, unlimited: false },
        { name: '25 GB', price: 200, bandwidth: 25, unlimited: false },
        { name: '50 GB', price: 350, bandwidth: 50, unlimited: false },
        { name: 'Unlimited', price: 500, bandwidth: Infinity, unlimited: true }
      ]
    },
    {
      provider: 'Bright Data',
      plans: [
        { name: 'Pay-as-you-go', price: bandwidth * 10, bandwidth: bandwidth, unlimited: false, payg: true }
      ]
    },
    {
      provider: 'Oxylabs',
      plans: [
        { name: '20 GB', price: 300, bandwidth: 20, unlimited: false },
        { name: 'Unlimited', price: 300, bandwidth: Infinity, unlimited: true }
      ]
    },
    {
      provider: 'IPRoyal',
      plans: [
        { name: 'Pay-as-you-go', price: bandwidth * 7, bandwidth: bandwidth, unlimited: false, payg: true }
      ]
    }
  ];

  plans.forEach(provider => {
    console.log(`\n${provider.provider}:`);
    console.log('─'.repeat(60));

    provider.plans.forEach(plan => {
      const sufficient = plan.unlimited || plan.bandwidth >= bandwidth;
      const icon = sufficient ? '✅' : '❌';

      if (plan.payg) {
        console.log(`  ${icon} ${plan.name.padEnd(20)} $${Math.ceil(plan.price)}/one-time  ${sufficient ? '(Sufficient)' : '(Not enough)'}`);
      } else if (plan.unlimited) {
        console.log(`  ${icon} ${plan.name.padEnd(20)} $${plan.price}/month     (Unlimited bandwidth)`);
      } else {
        console.log(`  ${icon} ${plan.name.padEnd(20)} $${plan.price}/month     ${sufficient ? '(Sufficient)' : '(Not enough)'}`);
      }
    });
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));

  if (bandwidth < 8) {
    console.log('\n✅ Best Value: Smartproxy 8GB - $75/month');
    console.log('   You only need ~' + bandwidth.toFixed(1) + 'GB, so 8GB is plenty');
  } else if (bandwidth < 25) {
    console.log('\n✅ Best Value: Smartproxy 25GB - $200/month');
    console.log('   You need ~' + bandwidth.toFixed(1) + 'GB, 25GB gives you buffer');
  } else if (bandwidth < 50) {
    console.log('\n✅ Best Value: Smartproxy 50GB - $350/month');
    console.log('   Or Bright Data Pay-as-you-go: $' + Math.ceil(bandwidth * 10));
  } else {
    console.log('\n✅ Best Value for Large Scrapes:');
    console.log('   1. Oxylabs Unlimited - $300/month (best price for unlimited)');
    console.log('   2. Smartproxy Unlimited - $500/month');
    console.log('   3. Bright Data PAYG - $' + Math.ceil(bandwidth * 10) + ' one-time');
  }

  console.log('');
}

function compareScenarios() {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('COMMON SCENARIOS');
  console.log('='.repeat(60));

  const scenarios = [
    { companies: 1000, name: 'Small test' },
    { companies: 10000, name: 'Medium scrape' },
    { companies: 50000, name: 'Large scrape' },
    { companies: 100000, name: 'Very large' },
    { companies: 700000, name: 'Full dataset' }
  ];

  console.log('');
  console.log('Companies'.padEnd(15) + 'Bandwidth'.padEnd(15) + 'Min Plan Needed');
  console.log('─'.repeat(60));

  scenarios.forEach(scenario => {
    const bandwidth = calculateBandwidthOnly(scenario.companies);
    let minPlan = '';

    if (bandwidth < 8) minPlan = 'Smartproxy 8GB ($75)';
    else if (bandwidth < 25) minPlan = 'Smartproxy 25GB ($200)';
    else if (bandwidth < 50) minPlan = 'Smartproxy 50GB ($350)';
    else minPlan = 'Unlimited ($300-500)';

    console.log(
      scenario.companies.toLocaleString().padEnd(15) +
      (bandwidth.toFixed(1) + ' GB').padEnd(15) +
      minPlan
    );
  });

  console.log('');
}

function calculateBandwidthOnly(companyCount) {
  const directoryPageSize = 200; // KB
  const companiesPerPage = 25;
  const companyProfileSize = 500; // KB
  const directoryPages = Math.ceil(companyCount / companiesPerPage);
  const directoryBandwidth = (directoryPages * directoryPageSize) / 1024 / 1024;
  const profileBandwidth = (companyCount * companyProfileSize) / 1024 / 1024;
  const overheadPercentage = 0.10;
  return (directoryBandwidth + profileBandwidth) * (1 + overheadPercentage);
}

// Main execution
const companyCount = parseInt(process.argv[2]) || 100000;

const bandwidth = calculateBandwidth(companyCount);
recommendProxyPlans(bandwidth);
compareScenarios();

console.log('='.repeat(60));
console.log('');
console.log('💡 TIP: Start with a smaller test (1,000 companies) to verify');
console.log('   everything works before committing to a large proxy plan!');
console.log('');
console.log('='.repeat(60));
