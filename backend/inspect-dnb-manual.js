/**
 * Manual DNB Page Inspector - Opens browser and saves full HTML
 * You can then manually inspect the HTML to find the correct selectors
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

async function inspectManually() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    console.log('Opening DNB page...');
    await page.goto('https://www.dnb.com/business-directory/company-information.information.cn.html?page=8', {
      waitUntil: 'domcontentloaded',
      timeout: 120000
    });

    // Wait for content to load
    console.log('Waiting for content to load...');
    await page.waitForTimeout(10000);

    // Save full HTML
    const html = await page.content();
    await fs.writeFile('dnb-page-full.html', html);
    console.log('✓ Saved full HTML to: dnb-page-full.html');

    // Save screenshot
    await page.screenshot({ path: 'dnb-screenshot.png', fullPage: true });
    console.log('✓ Saved screenshot to: dnb-screenshot.png');

    // Get all text content
    const allText = await page.evaluate(() => document.body.innerText);
    await fs.writeFile('dnb-page-text.txt', allText);
    console.log('✓ Saved text content to: dnb-page-text.txt');

    // Check if target company is present
    if (allText.includes('Qingdao Eastsoft')) {
      console.log('\n✓ Found "Qingdao Eastsoft" in page!');

      // Try to get the HTML around it
      const context = await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.includes('Qingdao Eastsoft')) {
            return {
              found: true,
              parentHTML: node.parentElement.outerHTML,
              grandparentHTML: node.parentElement.parentElement?.outerHTML.substring(0, 1000),
              parentClasses: node.parentElement.className,
              grandparentClasses: node.parentElement.parentElement?.className
            };
          }
        }
        return { found: false };
      });

      console.log('\nCompany element structure:');
      console.log(JSON.stringify(context, null, 2));
      await fs.writeFile('qingdao-element.json', JSON.stringify(context, null, 2));
    } else {
      console.log('\n✗ "Qingdao Eastsoft" NOT found in page');
      console.log('The page might require scrolling or interaction to load companies');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Browser will stay open for 60 seconds');
    console.log('Please manually inspect the page to find:');
    console.log('1. The HTML structure of company listings');
    console.log('2. The CSS classes used');
    console.log('3. The company profile link structure');
    console.log('='.repeat(60));

    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectManually();
