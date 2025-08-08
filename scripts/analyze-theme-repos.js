#!/usr/bin/env node

/**
 * Analyze Hugo theme GitHub repositories to extract best practices
 * This is where we get the REAL intelligence about theme structure
 */

const { chromium } = require('playwright');
const fs = require('fs-extra');
const chalk = require('chalk');

async function analyzeThemeRepos(limit = 5) {
  console.log(chalk.blue('🔬 Analyzing Hugo theme GitHub repositories for best practices...'));
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // First get themes with proper GitHub URLs
    const themes = await getThemesWithGitHubUrls(page, limit);
    console.log(chalk.green(`✅ Found ${themes.length} themes with GitHub repos`));
    
    // Analyze each theme's GitHub repository
    const themeAnalysis = [];
    
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      console.log(chalk.gray(`  ${i+1}/${themes.length}: Analyzing ${theme.name} repo...`));
      
      try {
        const repoAnalysis = await analyzeGitHubRepo(page, theme);
        themeAnalysis.push(repoAnalysis);
        
        // Rate limiting
        await page.waitForTimeout(2000);
        
      } catch (error) {
        console.warn(chalk.yellow(`  ⚠️ Error analyzing ${theme.name}: ${error.message}`));
      }
    }
    
    // Save comprehensive analysis
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/theme-repo-analysis.json', {
      themes: themeAnalysis,
      analyzedAt: new Date().toISOString(),
      totalCount: themeAnalysis.length,
      bestPracticesSummary: extractBestPractices(themeAnalysis)
    }, { spaces: 2 });
    
    // Display results
    displayAnalysisResults(themeAnalysis);
    
    return themeAnalysis;
    
  } catch (error) {
    console.error(chalk.red('❌ Error in theme repo analysis:'), error);
  } finally {
    await browser.close();
  }
}

async function getThemesWithGitHubUrls(page, limit) {
  await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Get theme detail URLs
  const themeUrls = await page.evaluate((limit) => {
    const urls = [];
    const links = document.querySelectorAll('a[href*="/themes/"]');
    
    for (let i = 0; i < Math.min(links.length, limit); i++) {
      const link = links[i];
      if (link.href.includes('/themes/') && !link.href.endsWith('/themes/')) {
        urls.push({
          detailUrl: link.href,
          name: link.href.split('/themes/')[1]?.replace('/', ''),
          title: link.textContent?.replace('View details for ', '').trim()
        });
      }
    }
    return urls;
  }, limit);
  
  // Get GitHub URLs for each theme
  const themesWithGitHub = [];
  
  for (const theme of themeUrls) {
    try {
      await page.goto(theme.detailUrl, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      
      const githubUrl = await page.evaluate(() => {
        // Look for Download link (most likely to be theme repo)
        const downloadLinks = Array.from(document.querySelectorAll('a')).filter(a =>
          a.textContent?.toLowerCase().includes('download') && a.href.includes('github.com')
        );
        
        if (downloadLinks.length > 0) {
          return downloadLinks[0].href;
        }
        
        // Fallback: look for any GitHub link that's not the main Hugo repo
        const githubLinks = Array.from(document.querySelectorAll('a[href*="github.com"]'));
        const themeRepos = githubLinks.filter(link => 
          !link.href.includes('gohugoio/hugo') &&
          !link.href.includes('/releases') &&
          !link.href.includes('/issues')
        );
        
        return themeRepos.length > 0 ? themeRepos[0].href : null;
      });
      
      if (githubUrl) {
        themesWithGitHub.push({
          ...theme,
          githubUrl
        });
      }
      
    } catch (error) {
      console.warn(`Error getting GitHub URL for ${theme.name}`);
    }
  }
  
  return themesWithGitHub;
}

async function analyzeGitHubRepo(page, theme) {
  await page.goto(theme.githubUrl, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  
  console.log(chalk.gray(`    🔍 Analyzing repo structure...`));
  
  const repoData = await page.evaluate(() => {
    const analysis = {
      basicInfo: {},
      fileStructure: {},
      hugoConfig: {},
      bestPractices: {}
    };
    
    // Basic repo info
    analysis.basicInfo = {
      stars: document.querySelector('[data-testid="repository-stars-counter-star"]')?.textContent?.trim(),
      forks: document.querySelector('[data-testid="repository-forks-count"]')?.textContent?.trim(),
      license: document.querySelector('a[data-testid="repository-license"]')?.textContent?.trim(),
      lastCommit: document.querySelector('relative-time')?.getAttribute('datetime'),
      description: document.querySelector('[data-pjax="#repo-content-pjax-container"] p')?.textContent?.trim(),
      language: document.querySelector('[data-ga-click*="language"]')?.textContent?.trim(),
      size: document.querySelector('[data-testid="repository-size"]')?.textContent?.trim()
    };
    
    // File structure analysis (from visible files)
    const files = Array.from(document.querySelectorAll('[role="rowheader"] a')).map(a => a.textContent?.trim());
    analysis.fileStructure = {
      hasConfigToml: files.includes('config.toml'),
      hasConfigYaml: files.includes('config.yaml') || files.includes('config.yml'),
      hasHugoToml: files.includes('hugo.toml'),
      hasLayouts: files.includes('layouts'),
      hasStatic: files.includes('static'),
      hasAssets: files.includes('assets'),
      hasContent: files.includes('content'),
      hasExampleSite: files.includes('exampleSite'),
      hasI18n: files.includes('i18n'),
      hasData: files.includes('data'),
      hasArchetypes: files.includes('archetypes'),
      hasPackageJson: files.includes('package.json'),
      hasThemeToml: files.includes('theme.toml'),
      hasReadme: files.some(f => f?.toLowerCase().includes('readme')),
      allFiles: files
    };
    
    // Look for Hugo-specific indicators in README
    const readmeContent = document.querySelector('[data-testid="readme"]')?.textContent?.toLowerCase() || '';
    analysis.bestPractices = {
      mentionsHugoVersion: readmeContent.includes('hugo') && readmeContent.includes('version'),
      hasInstallInstructions: readmeContent.includes('install') || readmeContent.includes('getting started'),
      hasConfigExample: readmeContent.includes('config') && (readmeContent.includes('toml') || readmeContent.includes('yaml')),
      mentionsShortcodes: readmeContent.includes('shortcode'),
      mentionsPartials: readmeContent.includes('partial'),
      mentionsArchetypes: readmeContent.includes('archetype'),
      hasDemo: readmeContent.includes('demo') || readmeContent.includes('example'),
      hasScreenshots: readmeContent.includes('screenshot') || readmeContent.includes('preview'),
      readmeLength: readmeContent.length
    };
    
    return analysis;
  });
  
  return {
    name: theme.name,
    title: theme.title,
    githubUrl: theme.githubUrl,
    detailUrl: theme.detailUrl,
    ...repoData,
    analyzedAt: new Date().toISOString()
  };
}

function extractBestPractices(themeAnalysis) {
  const practices = {
    commonConfigFiles: {},
    commonDirectories: {},
    averageStars: 0,
    commonLanguages: {},
    commonLicenses: {},
    bestPracticePatterns: []
  };
  
  themeAnalysis.forEach(theme => {
    // Count config file types
    if (theme.fileStructure?.hasConfigToml) practices.commonConfigFiles.toml = (practices.commonConfigFiles.toml || 0) + 1;
    if (theme.fileStructure?.hasConfigYaml) practices.commonConfigFiles.yaml = (practices.commonConfigFiles.yaml || 0) + 1;
    if (theme.fileStructure?.hasHugoToml) practices.commonConfigFiles.hugoToml = (practices.commonConfigFiles.hugoToml || 0) + 1;
    
    // Count directories
    ['layouts', 'static', 'assets', 'content', 'exampleSite', 'i18n', 'data', 'archetypes'].forEach(dir => {
      if (theme.fileStructure?.[`has${dir.charAt(0).toUpperCase() + dir.slice(1)}`]) {
        practices.commonDirectories[dir] = (practices.commonDirectories[dir] || 0) + 1;
      }
    });
    
    // Count languages and licenses
    if (theme.basicInfo?.language) {
      practices.commonLanguages[theme.basicInfo.language] = (practices.commonLanguages[theme.basicInfo.language] || 0) + 1;
    }
    if (theme.basicInfo?.license) {
      practices.commonLicenses[theme.basicInfo.license] = (practices.commonLicenses[theme.basicInfo.license] || 0) + 1;
    }
    
    // Calculate average stars
    const stars = parseInt(theme.basicInfo?.stars?.replace(/[^0-9]/g, '') || '0');
    practices.averageStars += stars;
  });
  
  practices.averageStars = Math.round(practices.averageStars / themeAnalysis.length);
  
  // Identify best practice patterns
  const totalThemes = themeAnalysis.length;
  Object.entries(practices.commonDirectories).forEach(([dir, count]) => {
    if (count / totalThemes > 0.8) { // 80% of themes have this
      practices.bestPracticePatterns.push(`${dir} directory (${Math.round(count/totalThemes*100)}% of themes)`);
    }
  });
  
  return practices;
}

function displayAnalysisResults(themeAnalysis) {
  console.log(chalk.green(`\n📊 Theme Repository Analysis Complete!`));
  console.log(chalk.blue(`\n🎯 Sample theme analysis:`));
  
  themeAnalysis.slice(0, 3).forEach((theme, i) => {
    console.log(`\n${i+1}. ${theme.title} (${theme.name})`);
    console.log(`   ⭐ Stars: ${theme.basicInfo?.stars || 'N/A'}`);
    console.log(`   📄 License: ${theme.basicInfo?.license || 'Unknown'}`);
    console.log(`   💻 Language: ${theme.basicInfo?.language || 'Unknown'}`);
    console.log(`   📂 Structure: ${theme.fileStructure?.hasLayouts ? '✅' : '❌'} layouts, ${theme.fileStructure?.hasExampleSite ? '✅' : '❌'} exampleSite`);
    console.log(`   ⚙️ Config: ${theme.fileStructure?.hasConfigToml ? 'TOML' : theme.fileStructure?.hasConfigYaml ? 'YAML' : theme.fileStructure?.hasHugoToml ? 'Hugo.toml' : 'Unknown'}`);
    console.log(`   📖 README: ${theme.bestPractices?.hasInstallInstructions ? '✅' : '❌'} install, ${theme.bestPractices?.hasDemo ? '✅' : '❌'} demo`);
  });
}

if (require.main === module) {
  analyzeThemeRepos(5).catch(console.error);
}

module.exports = { analyzeThemeRepos };