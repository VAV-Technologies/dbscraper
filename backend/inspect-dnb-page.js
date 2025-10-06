/**
 * DNB Page Inspector - Manual tool to inspect actual DNB page structure
 *
 * This will open a browser, navigate to DNB, and extract the actual HTML structure
 * so we can identify the correct selectors to use.
 *
 * Run with: node inspect-dnb-page.js
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

async function inspectDNBPage() {
  const browser = await chromium.launch({
    headless: false, // Show browser so you can see what's happening
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    console.log('\n' + '='.repeat(60));
    console.log('DNB PAGE INSPECTOR');
    console.log('='.repeat(60));

    // Navigate to the directory page
    const directoryUrl = 'https://www.dnb.com/business-directory/company-information.information.cn.html?page=8';
    console.log(`\nNavigating to: ${directoryUrl}`);

    await page.goto(directoryUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    console.log('✓ Page loaded');

    // Wait a bit for any dynamic content
    await page.waitForTimeout(3000);

    console.log('\n--- INSPECTING DIRECTORY PAGE STRUCTURE ---\n');

    // Extract directory page structure
    const directoryStructure = await page.evaluate(() => {
      const results = {
        companyListings: [],
        pagination: {},
        pageStructure: {}
      };

      // Try to find company listings
      const possibleContainers = [
        '.company-list', '.directory-results', '.search-results',
        '[class*="company"]', '[class*="result"]', '[class*="listing"]'
      ];

      let foundContainer = null;
      for (const selector of possibleContainers) {
        const el = document.querySelector(selector);
        if (el) {
          foundContainer = selector;
          results.pageStructure.containerSelector = selector;
          break;
        }
      }

      // Find all potential company cards
      const companyCards = document.querySelectorAll('div[class*="company"], div[class*="result"], li[class*="company"], article');

      results.pageStructure.totalPotentialCards = companyCards.length;
      results.pageStructure.cardSelectors = Array.from(new Set(
        Array.from(companyCards).map(el => el.className).filter(c => c)
      )).slice(0, 10);

      // Analyze first few cards
      Array.from(companyCards).slice(0, 5).forEach((card, idx) => {
        const cardInfo = {
          index: idx,
          classes: card.className,
          innerHTML: card.innerHTML.substring(0, 500), // First 500 chars
          links: Array.from(card.querySelectorAll('a')).map(a => ({
            text: a.textContent.trim().substring(0, 50),
            href: a.href,
            class: a.className
          })),
          textContent: card.textContent.trim().substring(0, 200)
        };

        results.companyListings.push(cardInfo);
      });

      // Look for "Qingdao Eastsoft Communication Technology Co.,Ltd."
      const allText = document.body.innerText;
      if (allText.includes('Qingdao Eastsoft')) {
        results.foundTargetCompany = true;

        // Try to find the element containing it
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          if (el.textContent.includes('Qingdao Eastsoft Communication Technology')) {
            results.targetCompanyElement = {
              tagName: el.tagName,
              className: el.className,
              innerHTML: el.innerHTML.substring(0, 500),
              parentClassName: el.parentElement?.className
            };
            break;
          }
        }
      }

      // Find pagination
      const paginationElements = [];
      document.querySelectorAll('[class*="pag"]').forEach(el => paginationElements.push(el));
      document.querySelectorAll('a[rel="next"]').forEach(el => paginationElements.push(el));

      results.pagination.elements = paginationElements.map(el => ({
        tagName: el.tagName,
        className: el.className,
        text: el.textContent.trim(),
        href: el.href || ''
      }));

      return results;
    });

    console.log('Directory Page Analysis:');
    console.log(JSON.stringify(directoryStructure, null, 2));

    // Save to file
    await fs.writeFile(
      'dnb-directory-analysis.json',
      JSON.stringify(directoryStructure, null, 2)
    );
    console.log('\n✓ Saved directory structure to: dnb-directory-analysis.json');

    // Now try to find and click on a company
    console.log('\n--- LOOKING FOR COMPANY PROFILE LINK ---\n');

    const companyLink = await page.evaluate(() => {
      // Look for any link that might be a company profile
      const links = Array.from(document.querySelectorAll('a'));
      const companyLinks = links.filter(a =>
        a.href.includes('/business-directory/company-information') ||
        a.href.includes('company') ||
        a.textContent.includes('Qingdao Eastsoft')
      );

      if (companyLinks.length > 0) {
        return {
          found: true,
          url: companyLinks[0].href,
          text: companyLinks[0].textContent.trim(),
          totalFound: companyLinks.length
        };
      }

      return { found: false };
    });

    console.log('Company Link Search:', JSON.stringify(companyLink, null, 2));

    if (companyLink.found) {
      console.log(`\n✓ Found company link: ${companyLink.url}`);
      console.log('Navigating to company profile...');

      await page.goto(companyLink.url, {
        waitUntil: 'domcontentloaded',
        timeout: 120000
      });

      await page.waitForTimeout(3000);

      console.log('\n--- INSPECTING COMPANY PROFILE PAGE ---\n');

      // Extract company profile structure
      const profileStructure = await page.evaluate(() => {
        const profile = {
          title: document.title,
          url: window.location.href,
          fields: {}
        };

        // Try to find all potential data fields
        const labels = [
          'doing business as', 'dba', 'trade name',
          'key principal', 'principal', 'executive', 'contact',
          'industry', 'industries', 'sic', 'naics',
          'address', 'location', 'street',
          'phone', 'telephone', 'tel',
          'website', 'web site', 'url',
          'revenue', 'sales', 'annual sales',
          'title', 'job title', 'position'
        ];

        // Search for these labels in the page
        const allElements = document.querySelectorAll('*');

        for (const label of labels) {
          for (const el of allElements) {
            const text = el.textContent.toLowerCase();
            if (text.includes(label) && el.children.length < 5) {
              if (!profile.fields[label]) {
                profile.fields[label] = [];
              }

              profile.fields[label].push({
                tagName: el.tagName,
                className: el.className,
                textContent: el.textContent.trim().substring(0, 100),
                innerHTML: el.innerHTML.substring(0, 200)
              });
            }
          }
        }

        // Get all class names used on the page
        const allClasses = new Set();
        document.querySelectorAll('[class]').forEach(el => {
          el.className.split(' ').forEach(c => {
            if (c.trim()) allClasses.add(c.trim());
          });
        });

        profile.allClassNames = Array.from(allClasses).sort().slice(0, 100);

        return profile;
      });

      console.log('Company Profile Analysis:');
      console.log(JSON.stringify(profileStructure, null, 2));

      // Save to file
      await fs.writeFile(
        'dnb-profile-analysis.json',
        JSON.stringify(profileStructure, null, 2)
      );
      console.log('\n✓ Saved profile structure to: dnb-profile-analysis.json');
    }

    // Take screenshots
    await page.screenshot({ path: 'dnb-page-screenshot.png', fullPage: true });
    console.log('\n✓ Saved screenshot to: dnb-page-screenshot.png');

    console.log('\n' + '='.repeat(60));
    console.log('INSPECTION COMPLETE');
    console.log('='.repeat(60));
    console.log('\nGenerated files:');
    console.log('  - dnb-directory-analysis.json (directory page structure)');
    console.log('  - dnb-profile-analysis.json (company profile structure)');
    console.log('  - dnb-page-screenshot.png (visual reference)');
    console.log('\nReview these files to determine correct selectors.');
    console.log('='.repeat(60));

    // Keep browser open for 30 seconds so you can inspect manually
    console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

inspectDNBPage();
