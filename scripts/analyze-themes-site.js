#!/usr/bin/env node

/**
 * Analyze themes.gohugo.io HTML structure
 * Figure out the correct selectors for scraping
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');

async function analyzeThemesSite() {
  console.log('🔍 Analyzing themes.gohugo.io HTML structure...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Navigate to themes site
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    console.log('📄 Page loaded, analyzing structure...');
    
    // Get page title to verify we're on the right page
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Analyze the HTML structure
    const analysis = await page.evaluate(() => {
      const results = {
        pageInfo: {
          title: document.title,
          url: window.location.href,
          totalElements: document.querySelectorAll('*').length
        },
        possibleThemeContainers: [],
        commonClasses: new Map(),
        themeCards: []
      };
      
      // Look for potential theme containers
      const potentialContainers = [
        '.theme', '.card', '.item', '.box', '.tile',
        '[class*="theme"]', '[class*="card"]', '[class*="item"]',
        'article', 'section', 'div[class*="grid"]'
      ];
      
      potentialContainers.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            results.possibleThemeContainers.push({
              selector,
              count: elements.length,
              sample: elements[0] ? {
                tagName: elements[0].tagName,
                className: elements[0].className,
                id: elements[0].id,
                textContent: elements[0].textContent?.substring(0, 100)
              } : null
            });
          }
        } catch (e) {
          // Invalid selector, skip
        }
      });
      
      // Count common class patterns
      document.querySelectorAll('*').forEach(el => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(' ').forEach(cls => {
            if (cls.trim()) {
              results.commonClasses.set(cls, (results.commonClasses.get(cls) || 0) + 1);
            }
          });
        }
      });
      
      // Convert Map to object for JSON serialization
      results.commonClasses = Object.fromEntries(
        Array.from(results.commonClasses.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 20) // Top 20 most common classes
      );
      
      // Look for what appears to be theme information
      const potentialThemeElements = document.querySelectorAll('article, .card, [class*="theme"], section');
      const sampleThemes = Array.from(potentialThemeElements).slice(0, 5).map(el => ({
        tagName: el.tagName,
        className: el.className,
        innerHTML: el.innerHTML.substring(0, 500), // First 500 chars
        textContent: el.textContent?.substring(0, 200),
        children: Array.from(el.children).map(child => ({
          tagName: child.tagName,
          className: child.className,
          textContent: child.textContent?.substring(0, 100)
        }))
      }));
      
      results.themeCards = sampleThemes;
      
      return results;
    });
    
    // Save the analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/themes-site-structure.json', analysis, { spaces: 2 });
    
    console.log('\n📊 Analysis Results:');
    console.log(`- Page: ${analysis.pageInfo.title}`);
    console.log(`- Total elements: ${analysis.pageInfo.totalElements}`);
    console.log(`- Potential theme containers found: ${analysis.possibleThemeContainers.length}`);
    
    console.log('\n🔍 Top theme container candidates:');
    analysis.possibleThemeContainers
      .filter(container => container.count > 1 && container.count < 100)
      .slice(0, 5)
      .forEach(container => {
        console.log(`  ${container.selector}: ${container.count} elements`);
        if (container.sample) {
          console.log(`    Sample: ${container.sample.tagName}.${container.sample.className}`);
        }
      });
    
    console.log('\n📝 Top 10 most common CSS classes:');
    Object.entries(analysis.commonClasses).slice(0, 10).forEach(([cls, count]) => {
      console.log(`  .${cls}: ${count} occurrences`);
    });
    
    // Save a screenshot for reference
    await page.screenshot({ path: './analysis/themes-site-screenshot.png', fullPage: true });
    
    console.log('\n✅ Analysis complete!');
    console.log('📁 Results saved to:');
    console.log('  - ./analysis/themes-site-structure.json');
    console.log('  - ./analysis/themes-site-screenshot.png');
    
  } catch (error) {
    console.error('❌ Error analyzing site:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  analyzeThemesSite().catch(console.error);
}

module.exports = { analyzeThemesSite };