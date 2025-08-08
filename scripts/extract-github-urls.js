#!/usr/bin/env node

/**
 * Extract GitHub URLs for themes by visiting individual theme pages
 * This gives us access to the actual Hugo theme source code
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const chalk = require('chalk');

async function extractGitHubUrls(limit = 10) {
  console.log(chalk.blue('🔍 Extracting GitHub URLs from theme detail pages...'));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // First get the theme listing page
    await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    console.log(chalk.blue('📄 Getting theme detail URLs...'));
    
    // Get all theme detail URLs
    const themeDetailUrls = await page.evaluate((limit) => {
      const urls = [];
      const themeLinks = document.querySelectorAll('a[href*="/themes/"]');
      
      for (let i = 0; i < Math.min(themeLinks.length, limit); i++) {
        const link = themeLinks[i];
        if (link.href.includes('/themes/') && !link.href.endsWith('/themes/')) {
          urls.push({
            url: link.href,
            name: link.href.split('/themes/')[1]?.replace('/', ''),
            title: link.textContent?.replace('View details for ', '').trim()
          });
        }
      }
      
      return urls;
    }, limit);
    
    console.log(chalk.green(`✅ Found ${themeDetailUrls.length} theme detail pages`));
    
    // Now visit each theme page to get GitHub URL
    const themesWithGitHub = [];
    
    for (let i = 0; i < themeDetailUrls.length; i++) {
      const theme = themeDetailUrls[i];
      console.log(chalk.gray(`  ${i+1}/${themeDetailUrls.length}: Fetching ${theme.name}...`));
      
      try {
        await page.goto(theme.url, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(1000);
        
        // Extract GitHub URL and other metadata from the theme page
        const themeData = await page.evaluate(() => {
          const data = {
            githubUrl: null,
            demoUrl: null,
            author: null,
            license: null,
            minHugoVersion: null,
            stars: null,
            lastUpdated: null,
            description: null,
            features: []
          };
          
          // Look for GitHub link
          const githubLinks = Array.from(document.querySelectorAll('a[href*="github.com"]'));
          if (githubLinks.length > 0) {
            data.githubUrl = githubLinks[0].href;
          }
          
          // Look for demo link
          const demoLinks = Array.from(document.querySelectorAll('a')).filter(a => 
            a.textContent?.toLowerCase().includes('demo') || 
            a.textContent?.toLowerCase().includes('preview')
          );
          if (demoLinks.length > 0) {
            data.demoUrl = demoLinks[0].href;
          }
          
          // Extract text content for analysis
          const pageText = document.body.textContent || '';
          
          // Try to extract author
          const authorMatch = pageText.match(/Author[:\s]+([^\n]+)/i);
          if (authorMatch) {
            data.author = authorMatch[1].trim();
          }
          
          // Try to extract license
          const licenseMatch = pageText.match(/License[:\s]+([^\n]+)/i);
          if (licenseMatch) {
            data.license = licenseMatch[1].trim();
          }
          
          // Try to extract Hugo version
          const hugoMatch = pageText.match(/Hugo[:\s]+v?([0-9.]+)/i);
          if (hugoMatch) {
            data.minHugoVersion = hugoMatch[1];
          }
          
          // Look for features mentioned
          const featureKeywords = ['responsive', 'dark mode', 'search', 'multilingual', 'seo', 'fast', 'minimal', 'blog', 'portfolio', 'documentation'];
          featureKeywords.forEach(feature => {
            if (pageText.toLowerCase().includes(feature)) {
              data.features.push(feature);
            }
          });
          
          // Get description (usually in first paragraph)
          const paragraphs = document.querySelectorAll('p');
          if (paragraphs.length > 0) {
            data.description = paragraphs[0].textContent?.trim();
          }
          
          return data;
        });
        
        themesWithGitHub.push({
          ...theme,
          ...themeData,
          scrapedAt: new Date().toISOString()
        });
        
        // Rate limiting - be respectful
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.warn(chalk.yellow(`  ⚠️ Error fetching ${theme.name}: ${error.message}`));
      }
    }
    
    // Save the results
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/themes-with-github.json', {
      themes: themesWithGitHub,
      extractedAt: new Date().toISOString(),
      totalCount: themesWithGitHub.length
    }, { spaces: 2 });
    
    console.log(chalk.green(`\n✅ Successfully extracted GitHub URLs for ${themesWithGitHub.filter(t => t.githubUrl).length} themes`));
    
    // Show summary
    console.log(chalk.blue('\n📊 Extraction Summary:'));
    console.log(`  Total themes processed: ${themesWithGitHub.length}`);
    console.log(`  Themes with GitHub URLs: ${themesWithGitHub.filter(t => t.githubUrl).length}`);
    console.log(`  Themes with demo URLs: ${themesWithGitHub.filter(t => t.demoUrl).length}`);
    console.log(`  Themes with author info: ${themesWithGitHub.filter(t => t.author).length}`);
    console.log(`  Themes with license info: ${themesWithGitHub.filter(t => t.license).length}`);
    
    // Show sample themes with GitHub URLs
    console.log(chalk.blue('\n🎯 Sample themes with GitHub URLs:'));
    themesWithGitHub.filter(t => t.githubUrl).slice(0, 5).forEach((theme, i) => {
      console.log(`\n${i+1}. ${theme.title || theme.name}`);
      console.log(`   GitHub: ${theme.githubUrl}`);
      console.log(`   Demo: ${theme.demoUrl || 'N/A'}`);
      console.log(`   Author: ${theme.author || 'Unknown'}`);
      console.log(`   License: ${theme.license || 'Unknown'}`);
      console.log(`   Features: ${theme.features.join(', ') || 'None detected'}`);
    });
    
    return themesWithGitHub;
    
  } catch (error) {
    console.error(chalk.red('❌ Error in GitHub extraction:'), error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  extractGitHubUrls(10).catch(console.error);
}

module.exports = { extractGitHubUrls };