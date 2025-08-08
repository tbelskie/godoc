#!/usr/bin/env node

/**
 * Find the REAL theme cards by going further up the DOM tree
 * The theme images are nested deep, we need to find their parent cards
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');

async function findRealThemeCards() {
  console.log('🔎 Finding REAL theme cards by traversing DOM hierarchy...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log('📄 Page loaded, analyzing theme card hierarchy...');
    
    const analysis = await page.evaluate(() => {
      const results = {
        themeCards: [],
        domHierarchy: [],
        linkAnalysis: []
      };
      
      // Find all theme images
      const themeImages = document.querySelectorAll('img.aspect-10\\/7, img[class*="aspect-10/7"]');
      console.log(`Found ${themeImages.length} theme images`);
      
      // For each image, walk up the DOM and analyze hierarchy
      themeImages.forEach((img, index) => {
        if (index >= 5) return; // Limit to first 5 for detailed analysis
        
        const hierarchy = [];
        let currentElement = img;
        let level = 0;
        
        // Walk up 15 levels to understand the structure
        while (currentElement.parentElement && level < 15) {
          currentElement = currentElement.parentElement;
          
          const elementInfo = {
            level,
            tagName: currentElement.tagName,
            className: currentElement.className,
            id: currentElement.id,
            childCount: currentElement.children.length,
            textLength: currentElement.textContent?.length || 0,
            textPreview: currentElement.textContent?.trim().substring(0, 100),
            hasLinks: currentElement.querySelectorAll('a[href]').length,
            linkCount: currentElement.querySelectorAll('a[href]').length
          };
          
          // Check if this looks like a theme card (has links and reasonable text)
          if (elementInfo.hasLinks > 0 && elementInfo.textLength > 20 && elementInfo.textLength < 500) {
            elementInfo.isLikelyThemeCard = true;
            
            // Extract links from this potential card
            const links = Array.from(currentElement.querySelectorAll('a[href]')).map(link => ({
              href: link.href,
              text: link.textContent?.trim(),
              className: link.className
            }));
            elementInfo.links = links;
          }
          
          hierarchy.push(elementInfo);
          level++;
        }
        
        results.domHierarchy.push({
          imageIndex: index,
          imageName: extractThemeName(img.src),
          hierarchy
        });
        
        // Find the most likely theme card (highest level with links and good text)
        const likelyCard = hierarchy.find(h => h.isLikelyThemeCard);
        if (likelyCard) {
          results.themeCards.push({
            name: extractThemeName(img.src),
            cardLevel: likelyCard.level,
            cardInfo: likelyCard,
            image: {
              src: img.src,
              alt: img.alt
            }
          });
        }
      });
      
      // Also analyze ALL links on the page to understand patterns
      const allLinks = document.querySelectorAll('a[href]');
      const themeRelatedLinks = Array.from(allLinks).filter(link => 
        link.href.includes('github.com') || 
        link.href.includes('demo') ||
        link.textContent?.toLowerCase().includes('demo') ||
        link.textContent?.toLowerCase().includes('github')
      );
      
      results.linkAnalysis = themeRelatedLinks.slice(0, 10).map(link => ({
        href: link.href,
        text: link.textContent?.trim(),
        className: link.className,
        parentTagName: link.parentElement?.tagName,
        parentClassName: link.parentElement?.className
      }));
      
      function extractThemeName(imgSrc) {
        const match = imgSrc.match(/\/themes\/([^\/]+)\//);
        return match ? match[1] : 'unknown';
      }
      
      return results;
    });
    
    console.log(`\n🎯 Analysis Results:`);
    console.log(`- Theme images found: ${analysis.domHierarchy.length}`);
    console.log(`- Likely theme cards: ${analysis.themeCards.length}`);
    console.log(`- Theme-related links: ${analysis.linkAnalysis.length}`);
    
    // Show DOM hierarchy for first theme
    if (analysis.domHierarchy.length > 0) {
      console.log(`\n🌳 DOM hierarchy for "${analysis.domHierarchy[0].imageName}":`);
      analysis.domHierarchy[0].hierarchy.forEach(level => {
        const indicator = level.isLikelyThemeCard ? ' ⭐ LIKELY CARD' : '';
        console.log(`  Level ${level.level}: ${level.tagName}.${level.className.substring(0, 40)} (${level.childCount} children, ${level.linkCount} links)${indicator}`);
        if (level.textPreview) {
          console.log(`    Text: "${level.textPreview.substring(0, 60)}..."`);
        }
      });
    }
    
    // Show likely theme cards
    if (analysis.themeCards.length > 0) {
      console.log(`\n🎨 Likely theme cards found:`);
      analysis.themeCards.forEach((card, i) => {
        console.log(`\n${i + 1}. ${card.name} (Level ${card.cardLevel})`);
        console.log(`   Container: ${card.cardInfo.tagName}.${card.cardInfo.className.substring(0, 50)}`);
        console.log(`   Text: "${card.cardInfo.textPreview}"`);
        console.log(`   Links: ${card.cardInfo.linkCount}`);
        
        if (card.cardInfo.links && card.cardInfo.links.length > 0) {
          card.cardInfo.links.forEach(link => {
            console.log(`     -> ${link.text}: ${link.href.substring(0, 50)}...`);
          });
        }
      });
    }
    
    // Save detailed analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/theme-card-hierarchy.json', analysis, { spaces: 2 });
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ Error in theme card analysis:', error);
  } finally {
    await browser.close();
  }
  
  console.log('\n✅ Theme card hierarchy analysis complete!');
  console.log('📁 Detailed results saved to ./analysis/theme-card-hierarchy.json');
}

if (require.main === module) {
  findRealThemeCards().catch(console.error);
}

module.exports = { findRealThemeCards };