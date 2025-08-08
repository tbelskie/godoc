const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * ThemeIntelligence - Discover, analyze, and recommend Hugo themes intelligently
 * 
 * Core capabilities:
 * 1. Scrape and catalog themes from themes.hugo.io
 * 2. Analyze theme characteristics (colors, layouts, features)
 * 3. Categorize themes by purpose (portfolio, docs, business, blog)
 * 4. Match themes to user descriptions with AI-powered recommendations
 */
class ThemeIntelligence {
  constructor() {
    this.themeDatabase = null;
    this.cacheDir = path.join(__dirname, '..', '.theme-cache');
    this.databasePath = path.join(this.cacheDir, 'theme-database.json');
    this.lastUpdatePath = path.join(this.cacheDir, 'last-update.json');
    
    // Theme categories and their characteristics
    this.categoryPatterns = {
      portfolio: {
        keywords: ['portfolio', 'personal', 'showcase', 'creative', 'designer', 'freelance', 'artist'],
        features: ['gallery', 'projects', 'contact', 'about', 'services'],
        layouts: ['hero', 'grid', 'masonry', 'single-page']
      },
      documentation: {
        keywords: ['docs', 'documentation', 'api', 'technical', 'reference', 'manual', 'guide'],
        features: ['search', 'navigation', 'toc', 'syntax-highlighting', 'versioning'],
        layouts: ['sidebar', 'multi-level', 'search-bar', 'breadcrumbs']
      },
      business: {
        keywords: ['business', 'corporate', 'company', 'startup', 'agency', 'professional'],
        features: ['services', 'team', 'testimonials', 'contact', 'pricing'],
        layouts: ['hero', 'features', 'cta', 'multi-section']
      },
      blog: {
        keywords: ['blog', 'news', 'journal', 'writing', 'article', 'magazine'],
        features: ['posts', 'tags', 'categories', 'archive', 'comments'],
        layouts: ['post-list', 'single-post', 'sidebar', 'pagination']
      },
      ecommerce: {
        keywords: ['shop', 'store', 'ecommerce', 'product', 'commerce', 'retail'],
        features: ['products', 'cart', 'checkout', 'payment', 'catalog'],
        layouts: ['product-grid', 'product-detail', 'cart', 'checkout']
      }
    };
    
    // Initialize cache directory
    this.initializeCache();
  }

  async initializeCache() {
    try {
      await fs.ensureDir(this.cacheDir);
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not create theme cache directory:', error.message));
    }
  }

  /**
   * Discover and catalog themes from themes.hugo.io
   * @param {number} limit - Maximum number of themes to discover (default: 50)
   * @returns {Promise<Array>} Array of discovered themes
   */
  async discoverThemes(limit = 50) {
    console.log(chalk.blue('🔍 Discovering Hugo themes from themes.hugo.io...'));
    
    try {
      // Check if we have a recent cache
      const cachedThemes = await this.loadCachedThemes();
      if (cachedThemes && this.isCacheValid()) {
        console.log(chalk.green(`✅ Using cached themes (${cachedThemes.length} themes)`));
        return cachedThemes.slice(0, limit);
      }

      // Scrape themes from themes.hugo.io
      let themes = await this.scrapeThemesFromHugoSite(limit);
      
      // If scraping returned no themes, fall back to sample themes
      if (!themes || themes.length === 0) {
        console.log(chalk.yellow('⚠️  No themes found from scraping, using sample themes...'));
        themes = this.getSampleThemes().slice(0, limit);
      }
      
      // Analyze each theme for characteristics
      console.log(chalk.blue('🔬 Analyzing theme characteristics...'));
      const analyzedThemes = await this.analyzeThemes(themes);
      
      // Cache the results
      await this.cacheThemes(analyzedThemes);
      
      console.log(chalk.green(`✅ Discovered and analyzed ${analyzedThemes.length} themes`));
      return analyzedThemes;
      
    } catch (error) {
      console.error(chalk.red('❌ Error discovering themes:'), error.message);
      
      // Try to return cached themes as fallback
      const cachedThemes = await this.loadCachedThemes();
      if (cachedThemes) {
        console.log(chalk.yellow('⚠️  Using cached themes as fallback'));
        return cachedThemes.slice(0, limit);
      }
      
      return [];
    }
  }

  /**
   * Scrape theme information from themes.hugo.io using Playwright
   * @param {number} limit - Maximum number of themes to scrape
   * @returns {Promise<Array>} Raw theme data from Hugo themes site
   */
  async scrapeThemesFromHugoSite(limit) {
    console.log(chalk.blue(`🔍 Scraping themes from themes.gohugo.io (limit: ${limit})...`));
    
    // Try to use Playwright if available, fallback to sample themes
    try {
      const playwright = require('playwright');
      const browser = await playwright.chromium.launch();
      const page = await browser.newPage();
      
      try {
        await page.goto('https://themes.gohugo.io', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        console.log(chalk.blue('📄 Page loaded, extracting theme data...'));
        
        const themes = await page.evaluate((limit) => {
          const results = [];
          
          // Use the correct selectors we discovered
          const themeCards = document.querySelectorAll('div.group.overflow-hidden.rounded-lg');
          
          for (let i = 0; i < Math.min(themeCards.length, limit); i++) {
            const card = themeCards[i];
            
            try {
              // Extract theme image
              const img = card.querySelector('img[class*="aspect-10/7"]');
              if (!img) continue;
              
              // Extract theme name from image URL
              const themeName = img.src.match(/\/themes\/([^\/]+)\//)?.[1] || `theme-${i}`;
              
              // Extract theme link
              const themeLink = card.querySelector('a[href*="/themes/"]');
              const themeUrl = themeLink ? themeLink.href : '';
              
              // Extract theme title from link text
              const linkText = themeLink ? themeLink.textContent.trim() : '';
              const themeTitle = linkText.replace('View details for ', '') || themeName;
              
              const theme = {
                name: themeName,
                title: themeTitle,
                description: `A Hugo theme: ${themeTitle}`,
                author: 'Unknown', // Will be extracted from individual theme pages later
                githubUrl: '', // Will be extracted from individual theme pages later
                demoUrl: themeUrl,
                image: img.src,
                detailsUrl: themeUrl,
                tags: [],
                lastUpdated: null,
                stars: 0,
                license: 'Unknown',
                discoveredAt: new Date().toISOString(),
                scrapingMethod: 'playwright'
              };
              
              results.push(theme);
            } catch (error) {
              console.warn(`Error processing theme card ${i}:`, error.message);
            }
          }
          
          return results;
        }, limit);
        
        await browser.close();
        
        if (themes.length > 0) {
          console.log(chalk.green(`✅ Successfully scraped ${themes.length} themes`));
          return themes;
        } else {
          console.log(chalk.yellow('⚠️  No themes found with Playwright, using fallback'));
          return this.getSampleThemes().slice(0, limit);
        }
        
      } finally {
        await browser.close();
      }
      
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Playwright scraping failed, using sample themes:', error.message));
      return this.getSampleThemes().slice(0, limit);
    }
  }

  /**
   * Analyze themes to extract characteristics and categorize them
   * @param {Array} themes - Raw theme data
   * @returns {Promise<Array>} Analyzed themes with intelligence data
   */
  async analyzeThemes(themes) {
    const analyzedThemes = [];
    
    for (const theme of themes) {
      try {
        const analysis = {
          ...theme,
          category: this.categorizeTheme(theme),
          characteristics: this.extractCharacteristics(theme),
          colors: this.extractColors(theme),
          features: this.extractFeatures(theme),
          complexity: this.assessComplexity(theme),
          popularity: this.assessPopularity(theme),
          suitability: this.assessSuitability(theme),
          aiScore: 0 // Will be calculated by matching algorithm
        };
        
        // Calculate overall quality score
        analysis.qualityScore = this.calculateQualityScore(analysis);
        
        analyzedThemes.push(analysis);
        
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not analyze theme ${theme.name}:`, error.message));
      }
    }
    
    return analyzedThemes;
  }

  /**
   * Match themes to user description using AI-powered analysis
   * @param {string} userDescription - Natural language description of desired theme
   * @param {number} maxResults - Maximum number of recommendations (default: 5)
   * @returns {Promise<Array>} Ranked theme recommendations
   */
  async matchThemes(userDescription, maxResults = 5) {
    console.log(chalk.blue(`🎯 Finding themes matching: "${userDescription}"`));
    
    try {
      // Ensure we have theme database
      const themes = await this.getThemeDatabase();
      if (!themes || themes.length === 0) {
        console.warn(chalk.yellow('⚠️  No themes in database. Discovering themes first...'));
        const discoveredThemes = await this.discoverThemes();
        // Use the discovered themes directly instead of recursive call
        if (!discoveredThemes || discoveredThemes.length === 0) {
          console.warn(chalk.red('❌ Could not discover any themes'));
          return [];
        }
        // Set the database and continue with matching
        this.themeDatabase = discoveredThemes;
      }
      
      // Analyze user intent
      const userIntent = this.analyzeUserIntent(userDescription);
      
      // Get the current theme database (might have been updated above)
      const currentThemes = this.themeDatabase || themes;
      
      // Score each theme against user intent
      const scoredThemes = currentThemes.map(theme => ({
        ...theme,
        matchScore: this.calculateMatchScore(theme, userIntent),
        matchReasons: this.generateMatchReasons(theme, userIntent)
      }));
      
      // Sort by match score and return top results
      const recommendations = scoredThemes
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, maxResults);
      
      console.log(chalk.green(`✅ Found ${recommendations.length} theme recommendations`));
      
      return recommendations;
      
    } catch (error) {
      console.error(chalk.red('❌ Error matching themes:'), error.message);
      return [];
    }
  }

  /**
   * Get theme database, loading from cache or discovering if needed
   * @returns {Promise<Array>} Theme database
   */
  async getThemeDatabase() {
    if (!this.themeDatabase) {
      this.themeDatabase = await this.loadCachedThemes();
      
      if (!this.themeDatabase) {
        this.themeDatabase = await this.discoverThemes();
      }
    }
    
    return this.themeDatabase;
  }

  // Theme extraction helper methods
  extractThemeName(card, $) {
    return card.find('.theme-name, .title, h3, h2').first().text().trim() ||
           card.attr('data-theme') ||
           'unknown-theme';
  }

  extractThemeTitle(card, $) {
    return card.find('.theme-title, .title, h3').first().text().trim() ||
           this.extractThemeName(card, $);
  }

  extractThemeDescription(card, $) {
    return card.find('.theme-description, .description, p').first().text().trim() ||
           '';
  }

  extractThemeAuthor(card, $) {
    return card.find('.theme-author, .author, .by').first().text().trim() ||
           'Unknown';
  }

  extractThemeGitHubUrl(card, $) {
    const githubLink = card.find('a[href*="github.com"]').first();
    return githubLink.attr('href') || '';
  }

  extractThemeDemoUrl(card, $) {
    const demoLink = card.find('a[href*="demo"], .demo-link, .preview-link').first();
    return demoLink.attr('href') || '';
  }

  extractThemeTags(card, $) {
    const tags = [];
    card.find('.tag, .label, .category').each((i, el) => {
      tags.push($(el).text().trim());
    });
    return tags;
  }

  extractThemeLastUpdated(card, $) {
    const dateText = card.find('.updated, .date, .last-updated').first().text().trim();
    return dateText || null;
  }

  extractThemeStars(card, $) {
    const starsText = card.find('.stars, .star-count').first().text().trim();
    const match = starsText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  extractThemeLicense(card, $) {
    return card.find('.license').first().text().trim() || 'Unknown';
  }

  // Theme analysis methods
  categorizeTheme(theme) {
    const text = `${theme.name} ${theme.title} ${theme.description} ${theme.tags?.join(' ') || ''}`.toLowerCase();
    
    let bestCategory = 'general';
    let highestScore = 0;
    
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      const score = patterns.keywords.reduce((acc, keyword) => {
        return acc + (text.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    }
    
    return bestCategory;
  }

  extractCharacteristics(theme) {
    const characteristics = {
      responsive: true, // Assume modern themes are responsive
      darkMode: this.hasFeature(theme, ['dark', 'night', 'theme-toggle']),
      search: this.hasFeature(theme, ['search', 'find', 'index']),
      multilingual: this.hasFeature(theme, ['i18n', 'multilingual', 'language']),
      customizable: this.hasFeature(theme, ['custom', 'config', 'theme-color']),
      minimal: this.hasFeature(theme, ['minimal', 'clean', 'simple']),
      modern: this.hasFeature(theme, ['modern', 'contemporary', 'latest'])
    };
    
    return characteristics;
  }

  extractColors(theme) {
    // This would ideally scrape the demo site or analyze CSS
    // For now, infer from name and description
    const text = `${theme.name} ${theme.description}`.toLowerCase();
    
    const colorMappings = {
      dark: ['dark', 'black', 'night'],
      light: ['light', 'white', 'bright'],
      blue: ['blue', 'ocean', 'sky'],
      green: ['green', 'nature', 'forest'],
      red: ['red', 'fire', 'bold'],
      purple: ['purple', 'violet', 'royal'],
      minimal: ['minimal', 'clean', 'simple']
    };
    
    const detectedColors = [];
    for (const [color, keywords] of Object.entries(colorMappings)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedColors.push(color);
      }
    }
    
    return detectedColors.length > 0 ? detectedColors : ['neutral'];
  }

  extractFeatures(theme) {
    const text = `${theme.name} ${theme.title} ${theme.description} ${theme.tags?.join(' ') || ''}`.toLowerCase();
    
    const featureKeywords = {
      blog: ['blog', 'post', 'article'],
      portfolio: ['portfolio', 'gallery', 'showcase'],
      ecommerce: ['shop', 'store', 'product'],
      documentation: ['docs', 'documentation', 'api'],
      landing: ['landing', 'onepage', 'single'],
      multilingual: ['i18n', 'multilingual'],
      search: ['search', 'find'],
      comments: ['comment', 'disqus'],
      analytics: ['analytics', 'tracking'],
      seo: ['seo', 'meta', 'schema']
    };
    
    const detectedFeatures = [];
    for (const [feature, keywords] of Object.entries(featureKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        detectedFeatures.push(feature);
      }
    }
    
    return detectedFeatures;
  }

  hasFeature(theme, keywords) {
    const text = `${theme.name} ${theme.title} ${theme.description} ${theme.tags?.join(' ') || ''}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  assessComplexity(theme) {
    // Assess theme complexity based on features and description
    let complexity = 1; // Base complexity
    
    if (theme.features?.length > 5) complexity += 1;
    if (theme.description?.length > 200) complexity += 1;
    if (this.hasFeature(theme, ['advanced', 'complex', 'full-featured'])) complexity += 1;
    if (this.hasFeature(theme, ['simple', 'minimal', 'lightweight'])) complexity -= 1;
    
    return Math.max(1, Math.min(5, complexity)); // 1-5 scale
  }

  assessPopularity(theme) {
    // Assess popularity based on stars, age, and other factors
    let popularity = 1;
    
    if (theme.stars > 100) popularity += 2;
    else if (theme.stars > 50) popularity += 1;
    
    // More factors could be added: downloads, forks, recent updates, etc.
    
    return Math.max(1, Math.min(5, popularity));
  }

  assessSuitability(theme) {
    // Assess general suitability based on maintenance, documentation, etc.
    let suitability = 3; // Default neutral
    
    if (theme.lastUpdated) {
      const lastUpdate = new Date(theme.lastUpdated);
      const monthsOld = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsOld < 6) suitability += 1;
      else if (monthsOld > 24) suitability -= 1;
    }
    
    if (theme.license && theme.license.toLowerCase().includes('mit')) {
      suitability += 1;
    }
    
    return Math.max(1, Math.min(5, suitability));
  }

  calculateQualityScore(theme) {
    // Overall quality score combining multiple factors
    const weights = {
      popularity: 0.3,
      complexity: 0.2,
      suitability: 0.3,
      features: 0.2
    };
    
    const featureScore = Math.min(5, theme.features?.length || 0);
    
    return (
      theme.popularity * weights.popularity +
      theme.complexity * weights.complexity +
      theme.suitability * weights.suitability +
      featureScore * weights.features
    );
  }

  // User intent analysis
  analyzeUserIntent(description) {
    const lower = description.toLowerCase();
    
    return {
      category: this.detectIntentCategory(lower),
      style: this.detectIntentStyle(lower),
      colors: this.detectIntentColors(lower),
      features: this.detectIntentFeatures(lower),
      complexity: this.detectIntentComplexity(lower),
      industry: this.detectIntentIndustry(lower),
      audience: this.detectIntentAudience(lower)
    };
  }

  detectIntentCategory(text) {
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      if (patterns.keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    return 'general';
  }

  detectIntentStyle(text) {
    const styleKeywords = {
      minimal: ['minimal', 'clean', 'simple', 'stripped'],
      modern: ['modern', 'contemporary', 'sleek', 'cutting-edge'],
      classic: ['classic', 'traditional', 'timeless'],
      bold: ['bold', 'striking', 'dramatic', 'eye-catching'],
      professional: ['professional', 'corporate', 'business'],
      creative: ['creative', 'artistic', 'unique', 'innovative']
    };
    
    for (const [style, keywords] of Object.entries(styleKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return style;
      }
    }
    
    return 'modern'; // Default
  }

  detectIntentColors(text) {
    const colors = [];
    const colorKeywords = {
      dark: ['dark', 'black', 'night', 'noir'],
      light: ['light', 'white', 'bright', 'clean'],
      blue: ['blue', 'azure', 'navy'],
      green: ['green', 'emerald', 'nature'],
      red: ['red', 'crimson', 'bold'],
      purple: ['purple', 'violet', 'royal']
    };
    
    for (const [color, keywords] of Object.entries(colorKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        colors.push(color);
      }
    }
    
    return colors;
  }

  detectIntentFeatures(text) {
    const features = [];
    const featureKeywords = {
      blog: ['blog', 'posts', 'articles', 'writing'],
      portfolio: ['portfolio', 'gallery', 'showcase', 'work'],
      ecommerce: ['shop', 'store', 'sell', 'products'],
      search: ['search', 'find', 'searchable'],
      multilingual: ['multilingual', 'international', 'i18n'],
      comments: ['comments', 'discussion', 'feedback']
    };
    
    for (const [feature, keywords] of Object.entries(featureKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        features.push(feature);
      }
    }
    
    return features;
  }

  detectIntentComplexity(text) {
    if (text.match(/\b(simple|basic|minimal|lightweight|straightforward)\b/)) return 'low';
    if (text.match(/\b(advanced|complex|full-featured|comprehensive|enterprise)\b/)) return 'high';
    return 'medium';
  }

  detectIntentIndustry(text) {
    const industries = {
      tech: ['tech', 'software', 'startup', 'developer', 'programming'],
      design: ['design', 'creative', 'agency', 'studio', 'artistic'],
      business: ['business', 'corporate', 'consulting', 'professional'],
      education: ['education', 'academic', 'university', 'research'],
      healthcare: ['healthcare', 'medical', 'health', 'clinic'],
      finance: ['finance', 'fintech', 'banking', 'investment']
    };
    
    for (const [industry, keywords] of Object.entries(industries)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return industry;
      }
    }
    
    return 'general';
  }

  detectIntentAudience(text) {
    if (text.match(/\b(developer|programmer|technical|engineer)\b/)) return 'technical';
    if (text.match(/\b(business|executive|professional|corporate)\b/)) return 'business';
    if (text.match(/\b(creative|designer|artist|portfolio)\b/)) return 'creative';
    if (text.match(/\b(general|public|everyone|broad)\b/)) return 'general';
    
    return 'general';
  }

  // Theme matching algorithm
  calculateMatchScore(theme, userIntent) {
    let score = 0;
    
    // Category match (highest weight)
    if (theme.category === userIntent.category) {
      score += 40;
    } else if (this.isCategoryCompatible(theme.category, userIntent.category)) {
      score += 20;
    }
    
    // Style match
    if (theme.characteristics?.minimal && userIntent.style === 'minimal') score += 15;
    if (theme.characteristics?.modern && userIntent.style === 'modern') score += 15;
    
    // Color match
    const colorMatches = userIntent.colors.filter(color => 
      theme.colors?.includes(color)
    ).length;
    score += colorMatches * 10;
    
    // Feature match
    const featureMatches = userIntent.features.filter(feature =>
      theme.features?.includes(feature)
    ).length;
    score += featureMatches * 8;
    
    // Complexity match
    const complexityMatch = this.matchComplexity(theme.complexity, userIntent.complexity);
    score += complexityMatch * 5;
    
    // Quality bonus
    score += theme.qualityScore * 2;
    
    // Popularity bonus
    score += theme.popularity * 3;
    
    return Math.round(score);
  }

  generateMatchReasons(theme, userIntent) {
    const reasons = [];
    
    if (theme.category === userIntent.category) {
      reasons.push(`Perfect match for ${userIntent.category} projects`);
    }
    
    if (theme.characteristics?.minimal && userIntent.style === 'minimal') {
      reasons.push('Clean, minimal design as requested');
    }
    
    if (theme.characteristics?.modern && userIntent.style === 'modern') {
      reasons.push('Modern, contemporary styling');
    }
    
    const colorMatches = userIntent.colors.filter(color => 
      theme.colors?.includes(color)
    );
    if (colorMatches.length > 0) {
      reasons.push(`Matches requested colors: ${colorMatches.join(', ')}`);
    }
    
    const featureMatches = userIntent.features.filter(feature =>
      theme.features?.includes(feature)
    );
    if (featureMatches.length > 0) {
      reasons.push(`Includes requested features: ${featureMatches.join(', ')}`);
    }
    
    if (theme.popularity > 3) {
      reasons.push('Popular choice with good community support');
    }
    
    if (theme.qualityScore > 4) {
      reasons.push('High quality, well-maintained theme');
    }
    
    return reasons;
  }

  isCategoryCompatible(themeCategory, intentCategory) {
    const compatibilityMap = {
      portfolio: ['business', 'blog'],
      business: ['portfolio', 'documentation'],
      blog: ['portfolio', 'documentation'],
      documentation: ['business', 'blog']
    };
    
    return compatibilityMap[themeCategory]?.includes(intentCategory) || false;
  }

  matchComplexity(themeComplexity, intentComplexity) {
    const complexityMap = { low: 1, medium: 2, high: 3 };
    const themeLevels = complexityMap[themeComplexity] || 2;
    const intentLevel = complexityMap[intentComplexity] || 2;
    
    const diff = Math.abs(themeLevels - intentLevel);
    return Math.max(0, 3 - diff); // 3 for perfect match, decreasing
  }

  // Caching methods
  async loadCachedThemes() {
    try {
      const exists = await fs.pathExists(this.databasePath);
      if (!exists) return null;
      
      const data = await fs.readJSON(this.databasePath);
      return data.themes || null;
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not load cached themes:', error.message));
      return null;
    }
  }

  async cacheThemes(themes) {
    try {
      const cacheData = {
        themes,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };
      
      await fs.writeJSON(this.databasePath, cacheData, { spaces: 2 });
      
      const updateInfo = {
        lastUpdate: new Date().toISOString(),
        themeCount: themes.length
      };
      
      await fs.writeJSON(this.lastUpdatePath, updateInfo, { spaces: 2 });
      
    } catch (error) {
      console.warn(chalk.yellow('Warning: Could not cache themes:', error.message));
    }
  }

  isCacheValid() {
    try {
      const stats = fs.statSync(this.databasePath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      return ageHours < 24; // Cache valid for 24 hours
    } catch (error) {
      return false;
    }
  }

  // Development sample themes
  getSampleThemes() {
    return [
      {
        name: 'docsy',
        title: 'Docsy',
        description: 'A Hugo theme for technical documentation sites',
        author: 'Google',
        githubUrl: 'https://github.com/google/docsy',
        demoUrl: 'https://docsy.dev',
        tags: ['documentation', 'technical', 'google'],
        stars: 1200,
        license: 'Apache 2.0'
      },
      {
        name: 'ananke',
        title: 'Ananke',
        description: 'Ananke is a simple, clean blog theme for Hugo',
        author: 'Bud Parr',
        githubUrl: 'https://github.com/theNewDynamic/gohugo-theme-ananke',
        demoUrl: 'https://gohugo-ananke-theme-demo.netlify.app',
        tags: ['blog', 'simple', 'clean'],
        stars: 800,
        license: 'MIT'
      },
      {
        name: 'academic',
        title: 'Academic',
        description: 'Build a beautiful academic resume, personal website, or portfolio',
        author: 'George Cushen',
        githubUrl: 'https://github.com/wowchemy/starter-hugo-academic',
        demoUrl: 'https://academic-demo.netlify.app',
        tags: ['academic', 'portfolio', 'research'],
        stars: 2000,
        license: 'MIT'
      },
      {
        name: 'kross',
        title: 'Kross',
        description: 'Kross is a creative portfolio theme',
        author: 'Themefisher',
        githubUrl: 'https://github.com/themefisher/kross-hugo',
        demoUrl: 'https://demo.gethugothemes.com/kross',
        tags: ['portfolio', 'creative', 'personal'],
        stars: 300,
        license: 'MIT'
      },
      {
        name: 'papermod',
        title: 'PaperMod',
        description: 'A fast, clean, responsive Hugo theme',
        author: 'Aditya Telange',
        githubUrl: 'https://github.com/adityatelange/hugo-PaperMod',
        demoUrl: 'https://adityatelange.github.io/hugo-PaperMod',
        tags: ['blog', 'minimal', 'fast'],
        stars: 1500,
        license: 'MIT'
      }
    ];
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods for external use
  async getThemeByName(name) {
    const themes = await this.getThemeDatabase();
    return themes.find(theme => 
      theme.name.toLowerCase() === name.toLowerCase()
    );
  }

  async getThemesByCategory(category) {
    const themes = await this.getThemeDatabase();
    return themes.filter(theme => theme.category === category);
  }

  async getPopularThemes(limit = 10) {
    const themes = await this.getThemeDatabase();
    return themes
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  async searchThemes(query, limit = 10) {
    const themes = await this.getThemeDatabase();
    const lowerQuery = query.toLowerCase();
    
    return themes
      .filter(theme => 
        theme.name.toLowerCase().includes(lowerQuery) ||
        theme.title.toLowerCase().includes(lowerQuery) ||
        theme.description.toLowerCase().includes(lowerQuery) ||
        theme.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  // Statistics and reporting
  async getThemeStats() {
    const themes = await this.getThemeDatabase();
    
    const stats = {
      total: themes.length,
      byCategory: {},
      avgQualityScore: 0,
      avgPopularity: 0,
      topFeatures: {},
      lastUpdated: null
    };
    
    // Calculate category distribution
    themes.forEach(theme => {
      stats.byCategory[theme.category] = (stats.byCategory[theme.category] || 0) + 1;
    });
    
    // Calculate averages
    if (themes.length > 0) {
      stats.avgQualityScore = themes.reduce((sum, theme) => sum + theme.qualityScore, 0) / themes.length;
      stats.avgPopularity = themes.reduce((sum, theme) => sum + theme.popularity, 0) / themes.length;
    }
    
    // Count features
    themes.forEach(theme => {
      theme.features?.forEach(feature => {
        stats.topFeatures[feature] = (stats.topFeatures[feature] || 0) + 1;
      });
    });
    
    // Get last update time
    try {
      const updateInfo = await fs.readJSON(this.lastUpdatePath);
      stats.lastUpdated = updateInfo.lastUpdate;
    } catch (error) {
      // Ignore error
    }
    
    return stats;
  }
}

module.exports = ThemeIntelligence;