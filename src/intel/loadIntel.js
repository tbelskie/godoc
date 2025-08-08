const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

/**
 * Intel Pack Loader - Load bundled intelligence data
 * 
 * Provides offline-first intelligence for theme selection,
 * style generation, content patterns, and review rules.
 */
class IntelLoader {
  constructor() {
    this.intelPath = path.resolve(__dirname, '..', '..', 'assets', 'intel');
    this.cache = {};
  }

  /**
   * Load all bundled intelligence data
   * @returns {Promise<Object>} Complete intel pack
   */
  async loadBundledIntel() {
    if (this.cache.full) {
      return this.cache.full;
    }

    try {
      const intel = {
        manifest: await this.loadIntelFile('manifest.json'),
        themes: await this.loadIntelFile('themes.json'),
        styles: await this.loadIntelFile('styles.json'),
        patterns: await this.loadIntelFile('patterns.json'),
        rules: await this.loadIntelFile('rules.json')
      };

      this.cache.full = intel;
      return intel;

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not load bundled intelligence:', error.message));
      throw new Error('Intel pack missing or corrupted. Try reinstalling GOdoc.');
    }
  }

  /**
   * Load specific intel file
   * @param {string} filename - Intel file to load
   * @returns {Promise<Object>} Parsed JSON data
   */
  async loadIntelFile(filename) {
    const filePath = path.join(this.intelPath, filename);
    
    if (!await fs.pathExists(filePath)) {
      throw new Error(`Intel file missing: ${filename}`);
    }

    return await fs.readJSON(filePath);
  }

  /**
   * Get theme recommendations based on description
   * @param {string} description - User's site description
   * @returns {Promise<Array>} Recommended themes with scores
   */
  async getThemeRecommendations(description, limit = 3) {
    const intel = await this.loadBundledIntel();
    const themes = intel.themes.themes;
    const matchRules = intel.themes.matchRules;

    // Extract keywords and context from description
    const context = this.parseDescription(description);

    // Score themes using match rules
    const scoredThemes = themes.map(theme => {
      const score = this.scoreTheme(theme, context, matchRules);
      return {
        ...theme,
        matchScore: score,
        matchReasons: this.generateMatchReasons(theme, context)
      };
    });

    // Sort by score and return top recommendations
    return scoredThemes
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }

  /**
   * Get style seed for industry/context
   * @param {string} description - User's site description
   * @returns {Promise<Object>} Style seed configuration
   */
  async getStyleSeed(description) {
    const intel = await this.loadBundledIntel();
    const styles = intel.styles.styles;
    const context = this.parseDescription(description);

    // Match style based on industry/context
    for (const style of styles) {
      if (this.matchesStyle(style, context)) {
        return style;
      }
    }

    // Return defaults if no specific match
    return {
      id: 'default',
      name: 'Default Style',
      ...intel.styles.defaults
    };
  }

  /**
   * Get content pattern for type
   * @param {string} contentType - Type of content (quickstart, api-docs, etc.)
   * @returns {Promise<Object>} Content pattern structure
   */
  async getContentPattern(contentType) {
    const intel = await this.loadBundledIntel();
    return intel.patterns.contentPatterns[contentType] || null;
  }

  /**
   * Get all available content patterns
   * @returns {Promise<Object>} All content patterns
   */
  async getContentPatterns() {
    const intel = await this.loadBundledIntel();
    return intel.patterns.contentPatterns;
  }

  /**
   * Get review rules for linting
   * @returns {Promise<Array>} Review rules
   */
  async getReviewRules() {
    const intel = await this.loadBundledIntel();
    return intel.rules.rules;
  }

  /**
   * Parse description to extract context
   * @private
   */
  parseDescription(description) {
    const lower = description.toLowerCase();
    
    return {
      keywords: this.extractKeywords(lower),
      industry: this.detectIndustry(lower),
      contentType: this.detectContentType(lower),
      teamSize: this.estimateTeamSize(lower),
      complexity: this.estimateComplexity(lower)
    };
  }

  /**
   * Extract relevant keywords from description
   * @private
   */
  extractKeywords(text) {
    const keywords = [];
    const keywordPatterns = [
      'api', 'technical', 'developer', 'reference', 'documentation',
      'guide', 'handbook', 'internal', 'onboarding', 'tutorial',
      'blog', 'writing', 'content', 'marketing', 'news',
      'portfolio', 'resume', 'personal', 'academic', 'research',
      'simple', 'minimal', 'lightweight', 'clean', 'professional'
    ];

    keywordPatterns.forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * Detect industry from description
   * @private
   */
  detectIndustry(text) {
    const industries = {
      fintech: ['fintech', 'financial', 'payment', 'banking', 'crypto'],
      saas: ['saas', 'software', 'platform', 'service', 'application'],
      devtools: ['devtools', 'developer tools', 'cli', 'sdk', 'framework'],
      enterprise: ['enterprise', 'corporate', 'organization', 'business'],
      opensource: ['open source', 'oss', 'community', 'github']
    };

    for (const [industry, terms] of Object.entries(industries)) {
      if (terms.some(term => text.includes(term))) {
        return industry;
      }
    }

    return 'general';
  }

  /**
   * Detect content type from description
   * @private
   */
  detectContentType(text) {
    if (text.includes('api') || text.includes('reference')) return 'api-docs';
    if (text.includes('tutorial') || text.includes('guide')) return 'tutorial';
    if (text.includes('onboarding') || text.includes('internal')) return 'onboarding';
    if (text.includes('blog') || text.includes('writing')) return 'blog';
    if (text.includes('portfolio') || text.includes('resume')) return 'portfolio';
    
    return 'documentation';
  }

  /**
   * Estimate team size from description
   * @private
   */
  estimateTeamSize(text) {
    if (text.includes('large') || text.includes('enterprise')) return 'large';
    if (text.includes('small') || text.includes('startup')) return 'small';
    return 'medium';
  }

  /**
   * Estimate complexity from description
   * @private
   */
  estimateComplexity(text) {
    if (text.includes('simple') || text.includes('basic')) return 'low';
    if (text.includes('complex') || text.includes('advanced')) return 'high';
    return 'medium';
  }

  /**
   * Score theme against context using match rules
   * @private
   */
  scoreTheme(theme, context, matchRules) {
    let score = 0;

    // Check match rules
    for (const rule of matchRules) {
      if (this.matchesRule(rule.when, context)) {
        if (rule.recommend.includes(theme.id)) {
          score += 40; // High score for rule match
        }
      }
    }

    // Keyword matching
    const keywordMatches = context.keywords.filter(keyword => 
      theme.bestFor.some(use => use.includes(keyword)) ||
      theme.features.some(feature => feature.includes(keyword))
    ).length;
    score += keywordMatches * 10;

    // Industry fit
    if (theme.bestFor.includes(context.contentType)) {
      score += 20;
    }

    // Complexity match
    const complexityMap = { beginner: 'low', intermediate: 'medium', advanced: 'high' };
    if (complexityMap[theme.complexity] === context.complexity) {
      score += 15;
    }

    // Base quality score
    score += theme.score.docsFit * 20;

    return Math.round(score);
  }

  /**
   * Generate human-readable match reasons
   * @private
   */
  generateMatchReasons(theme, context) {
    const reasons = [];

    if (theme.bestFor.includes(context.contentType)) {
      reasons.push(`Perfect for ${context.contentType}`);
    }

    const keywordMatches = context.keywords.filter(keyword => 
      theme.features.some(feature => feature.includes(keyword))
    );
    if (keywordMatches.length > 0) {
      reasons.push(`Includes ${keywordMatches.join(', ')} features`);
    }

    if (theme.score.docsFit > 0.9) {
      reasons.push('Excellent documentation fit');
    }

    if (theme.stars > 1500) {
      reasons.push('Popular, well-maintained theme');
    }

    return reasons.slice(0, 3); // Limit to top 3 reasons
  }

  /**
   * Check if context matches a rule
   * @private
   */
  matchesRule(ruleCondition, context) {
    if (ruleCondition.keywords) {
      const hasKeyword = ruleCondition.keywords.some(keyword => 
        context.keywords.includes(keyword)
      );
      if (!hasKeyword) return false;
    }

    if (ruleCondition.industry) {
      if (!ruleCondition.industry.includes(context.industry)) return false;
    }

    return true;
  }

  /**
   * Check if style matches context
   * @private
   */
  matchesStyle(style, context) {
    const styleMap = {
      'fintech-devfriendly': ['fintech'],
      'devtools-crisp': ['devtools'],
      'saas-friendly': ['saas'],
      'enterprise-formal': ['enterprise'],
      'opensource-community': ['opensource']
    };

    const industries = styleMap[style.id] || [];
    return industries.includes(context.industry);
  }

  /**
   * Get intel pack version info
   */
  async getVersion() {
    const manifest = await this.loadIntelFile('manifest.json');
    return {
      version: manifest.version,
      generatedAt: manifest.generatedAt,
      schemaVersion: manifest.schemaVersion
    };
  }
}

// Export singleton instance
module.exports = new IntelLoader();