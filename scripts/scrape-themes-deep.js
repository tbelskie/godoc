#!/usr/bin/env node

/**
 * Deep scraping of themes.gohugo.io to find actual theme listings
 * Look for dynamic content and real theme cards
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');

async function scrapeThemesDeep() {
  console.log('🕵️ Deep scraping themes.gohugo.io for actual theme listings...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to themes site
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    console.log('📄 Initial page load complete');
    
    // Wait for any dynamic content
    await page.waitForTimeout(2000);
    
    // Scroll down to load more content
    console.log('📜 Scrolling to load dynamic content...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);
    
    // Look for theme listings more specifically
    console.log('🔍 Searching for theme content...');
    
    const themeData = await page.evaluate(() => {
      const results = {
        totalElements: document.querySelectorAll('*').length,
        images: [],
        links: [],
        potentialThemes: [],
        textContent: []
      };
      
      // Find all images (themes usually have preview images)
      document.querySelectorAll('img').forEach(img => {
        results.images.push({
          src: img.src,
          alt: img.alt,
          className: img.className,
          parentTag: img.parentElement?.tagName,
          parentClass: img.parentElement?.className
        });
      });
      
      // Find all links (especially to github or demos)
      document.querySelectorAll('a[href]').forEach(link => {
        const href = link.href;
        if (href.includes('github.com') || href.includes('demo') || href.includes('theme')) {
          results.links.push({
            href,
            text: link.textContent?.trim(),
            className: link.className,
            parentTag: link.parentElement?.tagName,
            parentClass: link.parentElement?.className
          });
        }
      });
      
      // Look for text that suggests theme names
      const themeKeywords = ['hugo', 'theme', 'bootstrap', 'minimal', 'blog', 'portfolio', 'docs', 'landing'];
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length > 5 && text.length < 100) {
          const lowerText = text.toLowerCase();
          if (themeKeywords.some(keyword => lowerText.includes(keyword))) {
            results.textContent.push({
              text,
              tagName: el.tagName,
              className: el.className,
              id: el.id
            });
          }
        }
      });
      
      // Look for structured data or JSON
      const scriptTags = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
      results.structuredData = Array.from(scriptTags).map(script => ({
        type: script.type,
        content: script.textContent
      }));
      
      return results;
    });
    
    // Also check if there's a specific themes API or endpoint
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Look for network requests that might be fetching themes
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('theme') || response.url().includes('api')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type']
        });
      }
    });
    
    // Save the analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/themes-deep-scrape.json', {
      ...themeData,
      apiCalls,
      pageUrl: currentUrl,
      timestamp: new Date().toISOString()
    }, { spaces: 2 });
    
    console.log('\n📊 Deep Scrape Results:');
    console.log(`- Total elements: ${themeData.totalElements}`);
    console.log(`- Images found: ${themeData.images.length}`);
    console.log(`- Theme-related links: ${themeData.links.length}`);
    console.log(`- Text content items: ${themeData.textContent.length}`);
    console.log(`- Structured data: ${themeData.structuredData.length}`);
    
    if (themeData.images.length > 0) {
      console.log('\n🖼️ Sample images found:');
      themeData.images.slice(0, 3).forEach((img, i) => {
        console.log(`${i + 1}. ${img.alt || 'No alt'} - ${img.src.substring(0, 60)}...`);
      });
    }
    
    if (themeData.links.length > 0) {
      console.log('\n🔗 Sample theme links:');
      themeData.links.slice(0, 3).forEach((link, i) => {
        console.log(`${i + 1}. ${link.text} -> ${link.href.substring(0, 60)}...`);
      });
    }
    
    if (themeData.textContent.length > 0) {
      console.log('\n📝 Sample theme-related text:');
      themeData.textContent.slice(0, 3).forEach((item, i) => {
        console.log(`${i + 1}. ${item.tagName}: ${item.text.substring(0, 50)}...`);
      });
    }
    
    console.log('\n⏱️  Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error in deep scraping:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Deep scrape complete! Check ./analysis/themes-deep-scrape.json');
}

if (require.main === module) {
  scrapeThemesDeep().catch(console.error);
}

module.exports = { scrapeThemesDeep };