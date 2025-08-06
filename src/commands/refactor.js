const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

const AnalyzeCommand = require('./analyze');

class RefactorCommand {
  constructor() {
    this.analyzer = new AnalyzeCommand();
    this.changes = [];
    this.backupPath = null;
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🔧 Hugo AI Site Refactoring\n'));
    
    const sitePath = options.path || process.cwd();
    const spinner = ora('Analyzing site for refactoring opportunities...').start();
    
    try {
      // Verify Hugo site
      const isHugoSite = await this.analyzer.verifyHugoSite(sitePath);
      if (!isHugoSite) {
        spinner.fail(chalk.red('Not a Hugo site'));
        console.log(chalk.yellow('No Hugo configuration found.'));
        process.exit(1);
      }
      
      // Create backup
      spinner.text = 'Creating backup...';
      await this.createBackup(sitePath);
      
      // Analyze current state
      spinner.text = 'Analyzing current site...';
      const analysis = await this.performAnalysis(sitePath);
      
      // Determine refactoring actions
      spinner.text = 'Planning refactoring actions...';
      const actions = await this.planRefactoring(analysis, options);
      
      // Show refactoring plan
      spinner.stop();
      const proceed = await this.confirmRefactoring(actions);
      
      if (!proceed) {
        console.log(chalk.yellow('\nRefactoring cancelled.'));
        await this.cleanupBackup();
        return;
      }
      
      spinner.start('Applying refactoring changes...');
      
      // Apply refactoring
      for (const action of actions) {
        spinner.text = `Applying: ${action.description}`;
        await this.applyAction(action, sitePath);
        this.changes.push(action);
      }
      
      spinner.succeed(chalk.green('Refactoring complete!'));
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      spinner.fail(chalk.red('Refactoring failed'));
      console.error(chalk.red(error.message));
      
      if (this.backupPath) {
        console.log(chalk.yellow('\nRestoring from backup...'));
        await this.restoreBackup(sitePath);
      }
      
      process.exit(1);
    }
  }

  async createBackup(sitePath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.backupPath = path.join(sitePath, `.hugo-ai-backup-${timestamp}`);
    
    // Backup critical directories and files
    const items = ['content', 'layouts', 'static', 'assets', 'data', 
                   'hugo.toml', 'hugo.yaml', 'config.toml', 'config.yaml'];
    
    await fs.ensureDir(this.backupPath);
    
    for (const item of items) {
      const srcPath = path.join(sitePath, item);
      if (await fs.pathExists(srcPath)) {
        const destPath = path.join(this.backupPath, item);
        await fs.copy(srcPath, destPath);
      }
    }
  }

  async restoreBackup(sitePath) {
    if (!this.backupPath) return;
    
    const items = await fs.readdir(this.backupPath);
    for (const item of items) {
      const srcPath = path.join(this.backupPath, item);
      const destPath = path.join(sitePath, item);
      
      await fs.remove(destPath);
      await fs.copy(srcPath, destPath);
    }
    
    await this.cleanupBackup();
  }

  async cleanupBackup() {
    if (this.backupPath && await fs.pathExists(this.backupPath)) {
      await fs.remove(this.backupPath);
    }
  }

  async performAnalysis(sitePath) {
    return {
      structure: await this.analyzer.analyzeStructure(sitePath),
      content: await this.analyzer.analyzeContent(sitePath),
      config: await this.analyzer.analyzeConfig(sitePath),
      performance: await this.analyzer.analyzePerformance(sitePath),
      seo: await this.analyzer.analyzeSEO(sitePath)
    };
  }

  async planRefactoring(analysis, options) {
    const actions = [];
    
    if (options.modernize) {
      actions.push(...this.planModernization(analysis));
    }
    
    if (options.addSearch) {
      actions.push({
        type: 'feature-add',
        description: 'Add search functionality',
        priority: 1,
        feature: 'search'
      });
    }
    
    if (options.preserveUrls) {
      actions.push({
        type: 'config-update',
        description: 'Configure URL preservation',
        priority: 1,
        changes: { permalinks: { preserveUrls: true } }
      });
    }
    
    // Auto-improvements if no specific options
    if (!options.modernize && !options.addSearch && !options.preserveUrls) {
      actions.push(...this.planAutoImprovements(analysis));
    }
    
    return actions.sort((a, b) => a.priority - b.priority);
  }

  planModernization(analysis) {
    const actions = [];
    
    // Update Hugo configuration
    actions.push({
      type: 'config-update',
      description: 'Update configuration for modern Hugo',
      priority: 1,
      changes: {
        markup: {
          goldmark: { renderer: { unsafe: true } },
          highlight: { codeFences: true, guessSyntax: true }
        }
      }
    });
    
    // Add performance optimizations
    if (!analysis.config.minify) {
      actions.push({
        type: 'config-update',
        description: 'Enable minification for better performance',
        priority: 2,
        changes: {
          minify: {
            minifyOutput: true,
            disableHTML: false,
            disableCSS: false,
            disableJS: false
          }
        }
      });
    }
    
    return actions;
  }

  planAutoImprovements(analysis) {
    const actions = [];
    
    // Fix missing critical directories
    ['content', 'layouts'].forEach(dir => {
      if (!analysis.structure.directories[dir]?.exists) {
        actions.push({
          type: 'directory-create',
          description: `Create missing ${dir} directory`,
          priority: 1,
          path: dir
        });
      }
    });
    
    // Add robots.txt if missing
    if (!analysis.seo.robotsTxt) {
      actions.push({
        type: 'file-create',
        description: 'Create robots.txt for SEO',
        priority: 3,
        path: 'static/robots.txt',
        content: `User-agent: *\nAllow: /\n\nSitemap: /sitemap.xml`
      });
    }
    
    // Fix missing metadata
    if (analysis.content.missingMetadata?.length > 0) {
      actions.push({
        type: 'metadata-fix',
        description: `Add missing metadata to ${analysis.content.missingMetadata.length} pages`,
        priority: 2,
        files: analysis.content.missingMetadata
      });
    }
    
    return actions;
  }

  async confirmRefactoring(actions) {
    if (actions.length === 0) {
      console.log(chalk.yellow('No refactoring actions needed. Site is already optimized!'));
      return false;
    }
    
    console.log(chalk.cyan('\n📋 Refactoring Plan:\n'));
    
    actions.forEach((action, index) => {
      console.log(chalk.white(`${index + 1}. ${action.description}`));
    });
    
    console.log(chalk.blue(`\nTotal changes: ${actions.length}`));
    
    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Do you want to proceed with these changes?',
      default: true
    }]);
    
    return proceed;
  }

  async applyAction(action, sitePath) {
    switch (action.type) {
      case 'config-update':
        await this.updateConfig(action, sitePath);
        break;
      case 'directory-create':
        await fs.ensureDir(path.join(sitePath, action.path));
        break;
      case 'file-create':
        await fs.ensureDir(path.dirname(path.join(sitePath, action.path)));
        await fs.writeFile(path.join(sitePath, action.path), action.content);
        break;
      case 'feature-add':
        await this.addFeature(action, sitePath);
        break;
      case 'metadata-fix':
        await this.fixMetadata(action, sitePath);
        break;
    }
  }

  async updateConfig(action, sitePath) {
    const configFiles = ['hugo.toml', 'config.toml'];
    let configPath = null;
    
    for (const file of configFiles) {
      const filePath = path.join(sitePath, file);
      if (await fs.pathExists(filePath)) {
        configPath = filePath;
        break;
      }
    }
    
    if (!configPath) {
      configPath = path.join(sitePath, 'hugo.toml');
      await fs.writeFile(configPath, '');
    }
    
    let config = await fs.readFile(configPath, 'utf8');
    
    // Append changes as TOML
    config += '\n\n# Added by Hugo AI Refactor\n';
    config += this.objectToToml(action.changes);
    
    await fs.writeFile(configPath, config);
  }

  async addFeature(action, sitePath) {
    if (action.feature === 'search') {
      // Create search page
      const searchContent = `---
title: "Search"
layout: "search"
---

Search our documentation.`;
      
      await fs.ensureDir(path.join(sitePath, 'content'));
      await fs.writeFile(path.join(sitePath, 'content', 'search.md'), searchContent);
      
      // Create basic search layout
      const searchLayout = `{{ define "main" }}
<div class="search-container">
  <h1>{{ .Title }}</h1>
  <input type="text" id="search-input" placeholder="Type to search...">
  <div id="search-results"></div>
</div>

<script>
// Basic search functionality
document.getElementById('search-input').addEventListener('input', function(e) {
  const query = e.target.value.toLowerCase();
  // Search implementation would go here
  console.log('Searching for:', query);
});
</script>
{{ end }}`;
      
      await fs.ensureDir(path.join(sitePath, 'layouts', '_default'));
      await fs.writeFile(path.join(sitePath, 'layouts', '_default', 'search.html'), searchLayout);
    }
  }

  async fixMetadata(action, sitePath) {
    for (const fileInfo of action.files) {
      const filePath = path.join(sitePath, fileInfo.file);
      if (await fs.pathExists(filePath)) {
        let content = await fs.readFile(filePath, 'utf8');
        
        // Check if front matter exists
        if (!content.startsWith('---')) {
          // Add front matter
          const title = path.basename(fileInfo.file, '.md')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
          
          const frontMatter = `---
title: "${title}"
date: ${new Date().toISOString()}
draft: false
---

`;
          content = frontMatter + content;
          await fs.writeFile(filePath, content);
        }
      }
    }
  }

  objectToToml(obj, prefix = '') {
    let toml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        toml += `[${prefix}${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          if (typeof subValue === 'boolean') {
            toml += `  ${subKey} = ${subValue}\n`;
          } else {
            toml += `  ${subKey} = "${subValue}"\n`;
          }
        }
      } else {
        toml += `${key} = ${JSON.stringify(value)}\n`;
      }
    }
    
    return toml;
  }

  generateReport() {
    console.log(chalk.cyan('\n📊 Refactoring Report\n'));
    
    console.log(chalk.green('✅ Changes Applied:'));
    this.changes.forEach(change => {
      console.log(chalk.white(`  • ${change.description}`));
    });
    
    if (this.backupPath) {
      console.log(chalk.cyan('\n💾 Backup saved at:'));
      console.log(chalk.white(`  ${this.backupPath}`));
      console.log(chalk.yellow('  Delete backup when satisfied with changes'));
    }
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log(chalk.white('  1. Test your site:'), chalk.yellow('hugo server -D'));
    console.log(chalk.white('  2. Verify improvements:'), chalk.yellow('hugo-ai analyze'));
    console.log(chalk.white('  3. Generate content:'), chalk.yellow('hugo-ai generate'));
    
    console.log(chalk.green('\n✨ Refactoring complete!\n'));
  }
}

module.exports = RefactorCommand;