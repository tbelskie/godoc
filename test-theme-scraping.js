#!/usr/bin/env node

/**
 * Test the updated ThemeIntelligence scraper
 */

const ThemeIntelligence = require('./src/theme-intelligence');

async function testThemeScraping() {
  console.log('🧪 Testing updated ThemeIntelligence scraper...\n');
  
  const intelligence = new ThemeIntelligence();
  
  try {
    // Test scraping 10 themes
    console.log('🔍 Testing scrapeThemesFromHugoSite...');
    const themes = await intelligence.scrapeThemesFromHugoSite(10);
    
    console.log(`\n📊 Scraping Results:`);
    console.log(`- Themes found: ${themes.length}`);
    console.log(`- Scraping method: ${themes[0]?.scrapingMethod || 'fallback'}`);
    
    if (themes.length > 0) {
      console.log('\n🎨 Sample themes:');
      themes.slice(0, 3).forEach((theme, i) => {
        console.log(`\n${i + 1}. ${theme.name}`);
        console.log(`   Title: ${theme.title}`);
        console.log(`   Description: ${theme.description}`);
        console.log(`   Details URL: ${theme.detailsUrl}`);
        console.log(`   Image: ${theme.image ? 'Yes' : 'No'}`);
        console.log(`   Discovered: ${theme.discoveredAt}`);
      });
    }
    
    // Test theme analysis
    console.log('\n🔬 Testing theme analysis...');
    const analyzedThemes = await intelligence.analyzeThemes(themes.slice(0, 5));
    
    console.log(`\n📈 Analysis Results:`);
    analyzedThemes.forEach((theme, i) => {
      console.log(`\n${i + 1}. ${theme.name}`);
      console.log(`   Category: ${theme.category}`);
      console.log(`   Quality Score: ${theme.qualityScore?.toFixed(1) || 'N/A'}`);
      console.log(`   Complexity: ${theme.complexity}/5`);
      console.log(`   Features: ${theme.features?.join(', ') || 'None detected'}`);
      console.log(`   Colors: ${theme.colors?.join(', ') || 'None detected'}`);
    });
    
    // Test theme matching
    console.log('\n🎯 Testing theme matching...');
    const recommendations = await intelligence.matchThemes('fintech API documentation', 3);
    
    console.log(`\n🏆 Theme Recommendations for 'fintech API documentation':`);
    recommendations.forEach((rec, i) => {
      console.log(`\n${i + 1}. ${rec.name} (Score: ${rec.matchScore})`);
      console.log(`   Title: ${rec.title}`);
      console.log(`   Reasons: ${rec.matchReasons?.join(', ') || 'No specific reasons'}`);
      console.log(`   Category: ${rec.category}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testThemeScraping().catch(console.error);
}

module.exports = { testThemeScraping };