const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class AnalyzeCommand {
  constructor() {
    this.issues = [];
    this.suggestions = [];
    this.metrics = {};
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🔍 GOdoc Site Analyzer\n'));
    
    const sitePath = options.path || process.cwd();
    const spinner = ora('Analyzing Hugo site...').start();
    
    try {
      // Check if it's a Hugo site
      const isHugoSite = await this.verifyHugoSite(sitePath);
      if (!isHugoSite) {
        spinner.fail(chalk.red('Not a Hugo site'));
        console.log(chalk.yellow('No Hugo configuration found. Run "godoc init" to create a new site.'));
        process.exit(1);
      }
      
      spinner.text = 'Analyzing site structure...';
      const structure = await this.analyzeStructure(sitePath);
      
      spinner.text = 'Analyzing content...';
      const content = await this.analyzeContent(sitePath);
      
      spinner.text = 'Analyzing configuration...';
      const config = await this.analyzeConfig(sitePath);
      
      if (options.performance) {
        spinner.text = 'Running performance analysis...';
        const performance = await this.analyzePerformance(sitePath);
        this.metrics.performance = performance;
      }
      
      if (options.seo) {
        spinner.text = 'Running SEO analysis...';
        const seo = await this.analyzeSEO(sitePath);
        this.metrics.seo = seo;
      }
      
      if (options.accessibility) {
        spinner.text = 'Running accessibility checks...';
        const accessibility = await this.analyzeAccessibility(sitePath);
        this.metrics.accessibility = accessibility;
      }
      
      spinner.succeed(chalk.green('Analysis complete!'));
      
      // Generate report
      this.generateReport({
        structure,
        content,
        config,
        ...this.metrics
      });
      
    } catch (error) {
      spinner.fail(chalk.red('Analysis failed'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async verifyHugoSite(sitePath) {
    const configFiles = ['hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml', 'config.yaml', 'config.json'];
    
    for (const configFile of configFiles) {
      if (await fs.pathExists(path.join(sitePath, configFile))) {
        return true;
      }
    }
    
    return false;
  }

  async analyzeStructure(sitePath) {
    const structure = {
      directories: {},
      files: {},
      stats: {}
    };
    
    // Check standard Hugo directories
    const standardDirs = ['content', 'layouts', 'static', 'assets', 'data', 'themes', 'public'];
    
    for (const dir of standardDirs) {
      const dirPath = path.join(sitePath, dir);
      if (await fs.pathExists(dirPath)) {
        const stats = await fs.stat(dirPath);
        structure.directories[dir] = {
          exists: true,
          modified: stats.mtime,
          size: await this.getDirectorySize(dirPath)
        };
      } else {
        structure.directories[dir] = { exists: false };
        if (['content', 'layouts'].includes(dir)) {
          this.issues.push(`Missing critical directory: ${dir}`);
        }
      }
    }
    
    // Count content files
    const contentPath = path.join(sitePath, 'content');
    if (await fs.pathExists(contentPath)) {
      structure.stats.contentFiles = await this.countMarkdownFiles(contentPath);
      structure.stats.totalWords = await this.countWords(contentPath);
    }
    
    return structure;
  }

  async analyzeContent(sitePath) {
    const contentPath = path.join(sitePath, 'content');
    const analysis = {
      totalPages: 0,
      sections: [],
      orphanedPages: [],
      missingMetadata: [],
      contentTypes: {}
    };
    
    if (!await fs.pathExists(contentPath)) {
      this.issues.push('No content directory found');
      return analysis;
    }
    
    // Analyze content structure
    const files = await this.getAllMarkdownFiles(contentPath);
    analysis.totalPages = files.length;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const metadata = this.extractFrontMatter(content);
      
      // Check for missing metadata
      if (!metadata.title) {
        analysis.missingMetadata.push({
          file: path.relative(sitePath, file),
          missing: 'title'
        });
      }
      
      // Categorize content types
      const relPath = path.relative(contentPath, file);
      const section = relPath.split(path.sep)[0];
      
      if (!analysis.contentTypes[section]) {
        analysis.contentTypes[section] = 0;
      }
      analysis.contentTypes[section]++;
      
      // Check for orphaned pages (no menu entry)
      if (!metadata.menu && !file.includes('_index')) {
        analysis.orphanedPages.push(path.relative(sitePath, file));
      }
    }
    
    // Add suggestions based on content analysis
    if (analysis.orphanedPages.length > 0) {
      this.suggestions.push(`${analysis.orphanedPages.length} pages are not linked in navigation. Consider adding menu entries.`);
    }
    
    if (analysis.missingMetadata.length > 0) {
      this.suggestions.push(`${analysis.missingMetadata.length} pages are missing important metadata.`);
    }
    
    return analysis;
  }

  async analyzeConfig(sitePath) {
    const analysis = {
      theme: null,
      baseURL: null,
      language: null,
      params: {},
      menus: {},
      issues: []
    };
    
    // Find and read config file
    const configFiles = ['hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml', 'config.yaml', 'config.json'];
    let configContent = null;
    let configFile = null;
    
    for (const file of configFiles) {
      const filePath = path.join(sitePath, file);
      if (await fs.pathExists(filePath)) {
        configFile = file;
        configContent = await fs.readFile(filePath, 'utf8');
        break;
      }
    }
    
    if (!configContent) {
      this.issues.push('No Hugo configuration file found');
      return analysis;
    }
    
    // Parse config (simplified - would need proper TOML/YAML parser)
    if (configFile.endsWith('.toml')) {
      // Basic TOML parsing
      const themeMatch = configContent.match(/theme\s*=\s*['"]([^'"]+)['"]/);
      if (themeMatch) {
        analysis.theme = themeMatch[1];
      } else {
        this.issues.push('No theme configured');
      }
      
      const baseURLMatch = configContent.match(/baseURL\s*=\s*['"]([^'"]+)['"]/);
      if (baseURLMatch) {
        analysis.baseURL = baseURLMatch[1];
        if (analysis.baseURL === 'https://example.org/') {
          this.suggestions.push('Update baseURL from the default example.org');
        }
      }
    }
    
    // Check theme existence
    if (analysis.theme) {
      const themePath = path.join(sitePath, 'themes', analysis.theme);
      if (!await fs.pathExists(themePath)) {
        this.issues.push(`Theme "${analysis.theme}" is configured but not installed`);
      }
    }
    
    return analysis;
  }

  async analyzePerformance(sitePath) {
    const performance = {
      buildTime: null,
      publicSize: null,
      imageOptimization: [],
      suggestions: []
    };
    
    // Check if public directory exists and measure size
    const publicPath = path.join(sitePath, 'public');
    if (await fs.pathExists(publicPath)) {
      performance.publicSize = await this.getDirectorySize(publicPath);
      
      if (performance.publicSize > 50 * 1024 * 1024) { // 50MB
        performance.suggestions.push('Site size is large (>50MB). Consider optimizing images and assets.');
      }
    }
    
    // Check for unoptimized images
    const staticPath = path.join(sitePath, 'static');
    if (await fs.pathExists(staticPath)) {
      const images = await this.findLargeImages(staticPath);
      if (images.length > 0) {
        performance.imageOptimization = images;
        performance.suggestions.push(`Found ${images.length} large images that could be optimized`);
      }
    }
    
    // Try to measure build time
    try {
      const startTime = Date.now();
      execSync('hugo --quiet', { cwd: sitePath, stdio: 'ignore' });
      performance.buildTime = Date.now() - startTime;
      
      if (performance.buildTime > 5000) {
        performance.suggestions.push('Build time is slow (>5s). Consider optimizing templates and content.');
      }
    } catch (error) {
      // Hugo not available or build failed
    }
    
    return performance;
  }

  async analyzeSEO(sitePath) {
    const seo = {
      sitemap: false,
      robotsTxt: false,
      metaTags: {
        complete: 0,
        incomplete: 0
      },
      suggestions: []
    };
    
    // Check for sitemap
    const sitemapPath = path.join(sitePath, 'public', 'sitemap.xml');
    seo.sitemap = await fs.pathExists(sitemapPath);
    if (!seo.sitemap) {
      seo.suggestions.push('No sitemap.xml found. Hugo generates this automatically when built.');
    }
    
    // Check for robots.txt
    const robotsPath = path.join(sitePath, 'static', 'robots.txt');
    seo.robotsTxt = await fs.pathExists(robotsPath);
    if (!seo.robotsTxt) {
      seo.suggestions.push('Consider adding a robots.txt file for search engine guidance.');
    }
    
    // Check content for SEO metadata
    const contentPath = path.join(sitePath, 'content');
    if (await fs.pathExists(contentPath)) {
      const files = await this.getAllMarkdownFiles(contentPath);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const metadata = this.extractFrontMatter(content);
        
        if (metadata.title && metadata.description) {
          seo.metaTags.complete++;
        } else {
          seo.metaTags.incomplete++;
        }
      }
      
      if (seo.metaTags.incomplete > 0) {
        seo.suggestions.push(`${seo.metaTags.incomplete} pages lack complete SEO metadata (title/description)`);
      }
    }
    
    return seo;
  }

  async analyzeAccessibility(sitePath) {
    const accessibility = {
      altTags: {
        present: 0,
        missing: 0
      },
      headingStructure: {
        proper: 0,
        issues: 0
      },
      suggestions: []
    };
    
    const contentPath = path.join(sitePath, 'content');
    if (await fs.pathExists(contentPath)) {
      const files = await this.getAllMarkdownFiles(contentPath);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        
        // Check for images without alt text
        const images = content.match(/!\[([^\]]*)\]/g) || [];
        images.forEach(img => {
          const alt = img.match(/!\[([^\]]*)\]/)[1];
          if (alt && alt.length > 0) {
            accessibility.altTags.present++;
          } else {
            accessibility.altTags.missing++;
          }
        });
        
        // Check heading structure
        const headings = content.match(/^#+\s/gm) || [];
        if (this.checkHeadingStructure(headings)) {
          accessibility.headingStructure.proper++;
        } else {
          accessibility.headingStructure.issues++;
        }
      }
      
      if (accessibility.altTags.missing > 0) {
        accessibility.suggestions.push(`${accessibility.altTags.missing} images lack alt text for accessibility`);
      }
      
      if (accessibility.headingStructure.issues > 0) {
        accessibility.suggestions.push(`${accessibility.headingStructure.issues} pages have improper heading hierarchy`);
      }
    }
    
    return accessibility;
  }

  // Helper methods
  async getDirectorySize(dirPath) {
    let size = 0;
    const files = await fs.readdir(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isDirectory()) {
        size += await this.getDirectorySize(filePath);
      } else {
        size += stats.size;
      }
    }
    
    return size;
  }

  async countMarkdownFiles(dirPath) {
    const files = await this.getAllMarkdownFiles(dirPath);
    return files.length;
  }

  async getAllMarkdownFiles(dirPath, files = []) {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        await this.getAllMarkdownFiles(itemPath, files);
      } else if (item.endsWith('.md') || item.endsWith('.markdown')) {
        files.push(itemPath);
      }
    }
    
    return files;
  }

  async countWords(dirPath) {
    const files = await this.getAllMarkdownFiles(dirPath);
    let totalWords = 0;
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      // Remove front matter
      const textContent = content.replace(/^---[\s\S]*?---/, '');
      // Count words
      const words = textContent.match(/\b\w+\b/g) || [];
      totalWords += words.length;
    }
    
    return totalWords;
  }

  extractFrontMatter(content) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return {};
    
    const frontMatter = {};
    const lines = frontMatterMatch[1].split('\n');
    
    lines.forEach(line => {
      const match = line.match(/^(\w+):\s*(.*)$/);
      if (match) {
        frontMatter[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
    
    return frontMatter;
  }

  async findLargeImages(dirPath, threshold = 500000) { // 500KB
    const largeImages = [];
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        const subImages = await this.findLargeImages(itemPath, threshold);
        largeImages.push(...subImages);
      } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
        if (stats.size > threshold) {
          largeImages.push({
            path: itemPath,
            size: stats.size
          });
        }
      }
    }
    
    return largeImages;
  }

  checkHeadingStructure(headings) {
    if (headings.length === 0) return true;
    
    let lastLevel = 0;
    for (const heading of headings) {
      const level = heading.match(/^(#+)/)[1].length;
      if (level > lastLevel + 1) {
        return false; // Skipped heading level
      }
      lastLevel = level;
    }
    
    return true;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  generateReport(analysis) {
    console.log(chalk.cyan('\n📊 Site Analysis Report\n'));
    
    // Structure Report
    console.log(chalk.yellow('📁 Structure:'));
    console.log(chalk.white('  • Content files:'), analysis.structure.stats.contentFiles || 0);
    console.log(chalk.white('  • Total words:'), analysis.structure.stats.totalWords || 0);
    
    // Content Report
    console.log(chalk.yellow('\n📝 Content:'));
    console.log(chalk.white('  • Total pages:'), analysis.content.totalPages);
    if (Object.keys(analysis.content.contentTypes).length > 0) {
      console.log(chalk.white('  • Sections:'));
      for (const [section, count] of Object.entries(analysis.content.contentTypes)) {
        console.log(chalk.gray(`    - ${section}: ${count} pages`));
      }
    }
    
    // Configuration Report
    console.log(chalk.yellow('\n⚙️  Configuration:'));
    console.log(chalk.white('  • Theme:'), analysis.config.theme || 'Not configured');
    console.log(chalk.white('  • Base URL:'), analysis.config.baseURL || 'Not set');
    
    // Performance Report
    if (analysis.performance) {
      console.log(chalk.yellow('\n⚡ Performance:'));
      if (analysis.performance.buildTime) {
        console.log(chalk.white('  • Build time:'), `${analysis.performance.buildTime}ms`);
      }
      if (analysis.performance.publicSize) {
        console.log(chalk.white('  • Site size:'), this.formatBytes(analysis.performance.publicSize));
      }
    }
    
    // SEO Report
    if (analysis.seo) {
      console.log(chalk.yellow('\n🔍 SEO:'));
      console.log(chalk.white('  • Sitemap:'), analysis.seo.sitemap ? '✓' : '✗');
      console.log(chalk.white('  • Robots.txt:'), analysis.seo.robotsTxt ? '✓' : '✗');
      console.log(chalk.white('  • Pages with SEO metadata:'), 
        `${analysis.seo.metaTags.complete}/${analysis.seo.metaTags.complete + analysis.seo.metaTags.incomplete}`);
    }
    
    // Accessibility Report
    if (analysis.accessibility) {
      console.log(chalk.yellow('\n♿ Accessibility:'));
      console.log(chalk.white('  • Images with alt text:'), 
        `${analysis.accessibility.altTags.present}/${analysis.accessibility.altTags.present + analysis.accessibility.altTags.missing}`);
      console.log(chalk.white('  • Proper heading structure:'), 
        `${analysis.accessibility.headingStructure.proper}/${analysis.accessibility.headingStructure.proper + analysis.accessibility.headingStructure.issues}`);
    }
    
    // Issues
    if (this.issues.length > 0) {
      console.log(chalk.red('\n❌ Issues Found:'));
      this.issues.forEach(issue => {
        console.log(chalk.red('  •'), issue);
      });
    }
    
    // Suggestions
    const allSuggestions = [
      ...this.suggestions,
      ...(analysis.performance?.suggestions || []),
      ...(analysis.seo?.suggestions || []),
      ...(analysis.accessibility?.suggestions || [])
    ];
    
    if (allSuggestions.length > 0) {
      console.log(chalk.yellow('\n💡 Suggestions:'));
      allSuggestions.forEach(suggestion => {
        console.log(chalk.yellow('  •'), suggestion);
      });
    }
    
    // Summary
    const score = this.calculateHealthScore(analysis);
    console.log(chalk.cyan('\n📈 Site Health Score:'), this.getScoreColor(score)(`${score}/100`));
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    if (this.issues.length > 0) {
      console.log(chalk.white('  1. Fix critical issues with'), chalk.yellow('godoc refactor'));
    }
    console.log(chalk.white('  2. Generate missing content with'), chalk.yellow('godoc generate'));
    console.log(chalk.white('  3. Optimize performance with'), chalk.yellow('godoc refactor --modernize'));
    
    console.log(chalk.green('\n✨ Analysis complete!\n'));
  }

  calculateHealthScore(analysis) {
    let score = 100;
    
    // Deduct for issues
    score -= this.issues.length * 10;
    
    // Deduct for missing content
    if (analysis.content.totalPages === 0) score -= 20;
    if (analysis.content.orphanedPages.length > 0) score -= 5;
    if (analysis.content.missingMetadata.length > 0) score -= 5;
    
    // Deduct for missing SEO
    if (analysis.seo) {
      if (!analysis.seo.sitemap) score -= 5;
      if (!analysis.seo.robotsTxt) score -= 5;
      if (analysis.seo.metaTags.incomplete > 0) score -= 5;
    }
    
    // Deduct for accessibility issues
    if (analysis.accessibility) {
      if (analysis.accessibility.altTags.missing > 0) score -= 5;
      if (analysis.accessibility.headingStructure.issues > 0) score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  getScoreColor(score) {
    if (score >= 80) return chalk.green;
    if (score >= 60) return chalk.yellow;
    return chalk.red;
  }
}

module.exports = AnalyzeCommand;