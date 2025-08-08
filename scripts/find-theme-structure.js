#!/usr/bin/env node

/**
 * Find the actual theme card structure on themes.gohugo.io
 * More targeted analysis to find theme listings
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');

async function findThemeStructure() {
  console.log('🔍 Finding theme card structure on themes.gohugo.io...');
  
  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const page = await browser.newPage();
  
  try {
    // Navigate to themes site
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    console.log('📄 Page loaded, searching for theme elements...');
    
    // Look for theme-specific content
    const themeAnalysis = await page.evaluate(() => {
      const results = {
        pageStructure: {
          title: document.title,
          mainContent: null,
          themeElements: []
        }
      };
      
      // Look for elements that might contain themes
      const searchTerms = ['theme', 'demo', 'github', 'author', 'download', 'hugo'];
      const potentialThemeElements = [];
      
      // Search for elements containing theme-related text
      document.querySelectorAll('*').forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        const hasThemeContent = searchTerms.some(term => text.includes(term));
        
        if (hasThemeContent && el.children.length > 0 && el.children.length < 20) {
          // Potential theme card
          potentialThemeElements.push({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textContent: el.textContent?.substring(0, 200),
            innerHTML: el.innerHTML.substring(0, 400),
            childCount: el.children.length,
            attributes: Array.from(el.attributes).map(attr => ({
              name: attr.name,
              value: attr.value
            }))
          });
        }
      });
      
      // Sort by likelihood of being theme cards
      potentialThemeElements.sort((a, b) => {
        // Prefer elements with moderate child counts (likely cards)
        const aScore = Math.abs(a.childCount - 5);
        const bScore = Math.abs(b.childCount - 5);
        return aScore - bScore;
      });
      
      results.pageStructure.themeElements = potentialThemeElements.slice(0, 10);
      
      // Also look for main content areas
      const mainElements = document.querySelectorAll('main, [role="main"], .main, #main');
      if (mainElements.length > 0) {
        results.pageStructure.mainContent = {
          selector: 'main',
          count: mainElements.length,
          innerHTML: mainElements[0].innerHTML.substring(0, 1000)
        };
      }
      
      // Look for grid or list containers
      const gridElements = document.querySelectorAll('[class*="grid"], [class*="flex"], [class*="list"]');
      results.gridContainers = Array.from(gridElements).slice(0, 5).map(el => ({
        tagName: el.tagName,
        className: el.className,
        childCount: el.children.length,
        innerHTML: el.innerHTML.substring(0, 300)
      }));
      
      return results;
    });
    
    // Save the analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/theme-structure-detailed.json', themeAnalysis, { spaces: 2 });
    
    console.log('\n📊 Theme Structure Analysis:');
    console.log(`- Page: ${themeAnalysis.pageStructure.title}`);
    console.log(`- Potential theme elements found: ${themeAnalysis.pageStructure.themeElements.length}`);
    
    console.log('\n🎯 Top theme element candidates:');
    themeAnalysis.pageStructure.themeElements.slice(0, 3).forEach((el, index) => {
      console.log(`\n${index + 1}. ${el.tagName}.${el.className}`);
      console.log(`   Children: ${el.childCount}`);
      console.log(`   Text: ${el.textContent.substring(0, 100)}...`);
    });
    
    console.log('\n📦 Grid containers found:');
    themeAnalysis.gridContainers?.forEach((container, index) => {
      console.log(`${index + 1}. ${container.tagName}.${container.className} (${container.childCount} children)`);
    });
    
    // Wait a bit so we can see the page
    console.log('\n⏱️  Keeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    
    console.log('\n✅ Analysis complete! Check ./analysis/theme-structure-detailed.json');
    
  } catch (error) {
    console.error('❌ Error analyzing site:', error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  findThemeStructure().catch(console.error);
}

module.exports = { findThemeStructure };