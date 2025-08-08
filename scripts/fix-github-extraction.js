#!/usr/bin/env node

/**
 * Fix GitHub URL extraction - look for actual theme repository URLs
 * not the main Hugo repo
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const chalk = require('chalk');

async function fixGitHubExtraction(limit = 5) {
  console.log(chalk.blue('🔧 Fixing GitHub URL extraction to find theme repos...'));
  
  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const page = await browser.newPage();
  
  try {
    // Test with a specific theme first
    const testUrl = 'https://themes.gohugo.io/themes/simple-dark/';
    console.log(chalk.blue(`🔍 Testing with: ${testUrl}`));
    
    await page.goto(testUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    console.log(chalk.blue('📄 Page loaded, analyzing GitHub links...'));
    
    const analysis = await page.evaluate(() => {
      const results = {
        allLinks: [],
        githubLinks: [],
        potentialThemeRepos: [],
        pageContent: document.body.innerHTML.substring(0, 2000)
      };
      
      // Get all links
      const allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(link => {
        results.allLinks.push({
          href: link.href,
          text: link.textContent?.trim(),
          className: link.className
        });
      });
      
      // Filter GitHub links
      results.githubLinks = results.allLinks.filter(link => 
        link.href.includes('github.com')
      );
      
      // Look for theme-specific GitHub repos
      results.potentialThemeRepos = results.githubLinks.filter(link => {
        const url = link.href.toLowerCase();
        return !url.includes('gohugoio/hugo') && // Not main Hugo repo
               !url.includes('/releases') &&      // Not releases
               !url.includes('/issues') &&        // Not issues
               !url.includes('/wiki') &&          // Not wiki
               url.includes('github.com');        // Is GitHub
      });
      
      // Look for specific buttons or sections that might contain repo links
      const downloadButtons = document.querySelectorAll('button, a, [class*="download"], [class*="source"], [class*="repo"]');
      const buttonAnalysis = Array.from(downloadButtons).map(btn => ({
        tagName: btn.tagName,
        text: btn.textContent?.trim(),
        href: btn.href,
        className: btn.className
      }));
      
      results.buttonAnalysis = buttonAnalysis;
      
      return results;
    });
    
    console.log(chalk.green(`\n📊 GitHub Link Analysis:`));
    console.log(`  Total links: ${analysis.allLinks.length}`);
    console.log(`  GitHub links: ${analysis.githubLinks.length}`);
    console.log(`  Potential theme repos: ${analysis.potentialThemeRepos.length}`);
    
    console.log(chalk.blue(`\n🔗 All GitHub links found:`));
    analysis.githubLinks.forEach((link, i) => {
      console.log(`  ${i+1}. ${link.text}: ${link.href}`);
    });
    
    if (analysis.potentialThemeRepos.length > 0) {
      console.log(chalk.green(`\n🎯 Potential theme repos:`));
      analysis.potentialThemeRepos.forEach((link, i) => {
        console.log(`  ${i+1}. ${link.text}: ${link.href}`);
      });
    } else {
      console.log(chalk.yellow(`\n⚠️ No theme-specific repos found. The theme might not have a public repo or uses different structure.`));
    }
    
    // Look at the page HTML structure to understand where the real repo link might be
    console.log(chalk.blue(`\n🔍 Analyzing page structure for repo links...`));
    
    // Wait so we can inspect the page manually
    console.log(chalk.gray('\n⏱️ Keeping browser open for 10 seconds for manual inspection...'));
    await page.waitForTimeout(10000);
    
    // Save analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/github-extraction-debug.json', analysis, { spaces: 2 });
    
  } catch (error) {
    console.error(chalk.red('❌ Error in GitHub extraction debug:'), error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  fixGitHubExtraction().catch(console.error);
}

module.exports = { fixGitHubExtraction };