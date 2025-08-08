#!/usr/bin/env node

/**
 * Extract actual theme card structure from themes.gohugo.io
 * Based on discovered image patterns, find the complete theme data
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');

async function extractThemeCards() {
  console.log('🎯 Extracting theme cards from themes.gohugo.io...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('📄 Page loaded, extracting theme cards...');
    
    // Extract theme data by targeting the known image structure
    const themes = await page.evaluate(() => {
      const themeCards = [];
      
      // Find all theme images (we know these exist)
      const themeImages = document.querySelectorAll('img.aspect-10\\/7, img[class*="aspect-10/7"]');
      
      themeImages.forEach((img, index) => {
        try {
          // Walk up the DOM to find the theme card container
          let cardContainer = img;
          let depth = 0;
          
          // Go up until we find what looks like a complete theme card
          while (cardContainer.parentElement && depth < 10) {
            cardContainer = cardContainer.parentElement;
            depth++;
            
            // Look for container that has multiple children (likely the full card)
            if (cardContainer.children.length >= 2 && cardContainer.tagName !== 'BODY') {
              break;
            }
          }
          
          // Extract theme info from the card
          const themeData = {
            name: extractThemeName(img.src),
            image: {
              src: img.src,
              alt: img.alt,
              className: img.className
            },
            container: {
              tagName: cardContainer.tagName,
              className: cardContainer.className,
              childCount: cardContainer.children.length,
              innerHTML: cardContainer.innerHTML.substring(0, 1000)
            },
            links: [],
            textContent: cardContainer.textContent?.trim().substring(0, 200),
            index
          };
          
          // Find all links in the card
          const links = cardContainer.querySelectorAll('a[href]');
          links.forEach(link => {
            themeData.links.push({
              href: link.href,
              text: link.textContent?.trim(),
              className: link.className
            });
          });
          
          // Look for additional metadata in the card
          const allText = cardContainer.textContent?.toLowerCase() || '';
          themeData.metadata = {
            hasGitHub: allText.includes('github'),
            hasDemo: allText.includes('demo') || allText.includes('preview'),
            hasDownload: allText.includes('download'),
            hasAuthor: allText.includes('by ') || allText.includes('author'),
            allText: cardContainer.textContent?.trim()
          };
          
          themeCards.push(themeData);
          
        } catch (error) {
          console.warn(`Error processing theme ${index}:`, error.message);
        }
      });
      
      function extractThemeName(imgSrc) {
        const match = imgSrc.match(/\/themes\/([^\/]+)\//);
        return match ? match[1] : 'unknown';
      }
      
      return themeCards;
    });
    
    console.log(`\n🎯 Extracted ${themes.length} theme cards!`);
    
    // Save the theme data
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/extracted-theme-cards.json', {
      themes,
      extractedAt: new Date().toISOString(),
      totalCount: themes.length
    }, { spaces: 2 });
    
    // Show sample themes
    console.log('\n🎨 Sample themes extracted:');
    themes.slice(0, 5).forEach((theme, i) => {
      console.log(`\n${i + 1}. ${theme.name}`);
      console.log(`   Image: ${theme.image.src.substring(50)}...`);
      console.log(`   Container: ${theme.container.tagName}.${theme.container.className.substring(0, 50)}...`);
      console.log(`   Links: ${theme.links.length}`);
      console.log(`   Text: ${theme.textContent?.substring(0, 80)}...`);
      
      if (theme.links.length > 0) {
        console.log(`   Sample link: ${theme.links[0].text} -> ${theme.links[0].href.substring(0, 50)}...`);
      }
    });
    
    // Analyze the structure for consistent patterns
    const structureAnalysis = {
      commonContainerTags: {},
      commonContainerClasses: {},
      averageLinks: themes.reduce((sum, t) => sum + t.links.length, 0) / themes.length,
      themesWithGitHub: themes.filter(t => t.metadata.hasGitHub).length,
      themesWithDemo: themes.filter(t => t.metadata.hasDemo).length
    };
    
    themes.forEach(theme => {
      // Count container patterns
      structureAnalysis.commonContainerTags[theme.container.tagName] = 
        (structureAnalysis.commonContainerTags[theme.container.tagName] || 0) + 1;
      
      // Extract first class for analysis
      const firstClass = theme.container.className.split(' ')[0];
      if (firstClass) {
        structureAnalysis.commonContainerClasses[firstClass] = 
          (structureAnalysis.commonContainerClasses[firstClass] || 0) + 1;
      }
    });
    
    console.log('\n📊 Structure Analysis:');
    console.log(`   Average links per theme: ${structureAnalysis.averageLinks.toFixed(1)}`);
    console.log(`   Themes with GitHub links: ${structureAnalysis.themesWithGitHub}`);
    console.log(`   Themes with demo links: ${structureAnalysis.themesWithDemo}`);
    console.log(`   Most common container tag: ${Object.entries(structureAnalysis.commonContainerTags).sort((a,b) => b[1] - a[1])[0]?.[0]}`);
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error extracting theme cards:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Theme extraction complete! Data saved to ./analysis/extracted-theme-cards.json');
}

if (require.main === module) {
  extractThemeCards().catch(console.error);
}

module.exports = { extractThemeCards };