# How to Find the Correct DNB Selectors

The DNB website blocks automated access, so we need to manually inspect the page to find the correct CSS selectors.

## Method 1: Manual Browser Inspection (RECOMMENDED)

### Step 1: Open the DNB Page
1. Open Chrome/Edge browser
2. Navigate to: `https://www.dnb.com/business-directory/company-information.information.cn.html?page=8`
3. Let the page load completely

### Step 2: Inspect Company Listing
1. Find "Qingdao Eastsoft Communication Technology Co.,Ltd." on the page
2. Right-click on the company name → "Inspect" (or press F12)
3. The Developer Tools will open showing the HTML element

### Step 3: Find Directory Page Selectors

Look for these patterns and note the **actual CSS classes/IDs**:

#### Company Card Container
- Look at the parent `<div>` or `<li>` that wraps the entire company listing
- Note the class name (e.g., `class="company-card"` or `class="search-result"`)

#### Company Name
- Find the element containing the company name
- Note the class (e.g., `class="company-title"`)

#### Location
- Find the element with location info
- Note the class (e.g., `class="company-location"`)

#### Revenue/Sales
- Find the revenue element (if visible)
- Note the class (e.g., `class="revenue-info"`)

#### Profile Link
- Find the `<a>` tag that links to company profile
- Note the `href` pattern (e.g., `/business-directory/company-information.abcd.html`)
- Note any class on the link

### Step 4: Click on Company Profile

1. Click on "Qingdao Eastsoft Communication Technology Co.,Ltd."
2. Let the profile page load
3. Press F12 to open Developer Tools again

### Step 5: Find Profile Page Selectors

Locate and note the CSS selectors for:

#### Doing Business As (DBA)
- Search for "Doing Business As" or "Trade Name" text
- Right-click → Inspect the VALUE (not the label)
- Note the class

#### Key Principal
- Find the principal/contact name section
- Inspect the name element
- Note the class

#### Job Title
- Usually in the same section as principal
- Inspect the title (e.g., "Director", "CEO")
- Note the class

#### Industries
- Find the industries section
- Inspect each industry tag/item
- Note the class (there might be multiple elements)

#### Address
- Find the full address
- Inspect and note the class

#### Phone
- Find the phone number (might be in a link like `tel:+123...`)
- Note the class or selector (e.g., `a[href^="tel:"]`)

#### Website
- Find the company website link
- Note the class or selector (e.g., `a[href^="http"]`)

---

## Method 2: Copy HTML Source

If you have trouble with Method 1:

1. Open the DNB directory page in browser
2. Right-click anywhere → "View Page Source"
3. Press Ctrl+F and search for "Qingdao Eastsoft"
4. Copy the surrounding HTML (about 50 lines before and after)
5. Send me that HTML snippet

Do the same for the company profile page.

---

## Method 3: Use Browser Console

1. Open DNB directory page
2. Press F12 → Go to "Console" tab
3. Run this code to find company elements:

```javascript
// Find all potential company containers
document.querySelectorAll('[class*="company"], [class*="result"], [class*="card"]').forEach((el, i) => {
  if (i < 3) { // Show first 3
    console.log('Element ' + i, el.className, el.innerHTML.substring(0, 200));
  }
});
```

4. Send me the output

---

## What I Need From You

Please provide the following information:

### Directory Page (List View)
```
Company Container Class: _________________
Company Name Class: _________________
Location Class: _________________
Revenue Class: _________________
Profile Link Class/Pattern: _________________
Next Page Button Class: _________________
```

### Company Profile Page
```
Doing Business As Class: _________________
Key Principal Class: _________________
Job Title Class: _________________
Industries Class: _________________
Full Address Class: _________________
Phone Class/Selector: _________________
Website Class/Selector: _________________
```

---

## Once You Provide Selectors

I'll update the scraper immediately with the correct DNB-specific selectors and it will scrape exactly the data you need!

---

## Alternative: Screen Share

If this is too complicated, we can:
1. You share your screen
2. Navigate to the DNB page
3. I guide you through using browser DevTools
4. We identify selectors together in real-time
