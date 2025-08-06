const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const HugoContextManager = require('../context-manager');
const HugoExpertise = require('../hugo-expertise');
const ClaudeSimulator = require('../claude-simulator');

class InitCommand {
  constructor() {
    this.contextManager = new HugoContextManager();
    this.expertise = new HugoExpertise();
    this.claude = new ClaudeSimulator();
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🚀 Hugo AI - Conversational Site Generator\n'));
    
    const spinner = ora('Analyzing your requirements...').start();
    
    try {
      // Get site details through conversation
      const siteDetails = await this.getSiteDetails(options);
      
      spinner.text = 'Determining optimal Hugo configuration...';
      
      // Analyze project type and recommend theme
      const projectType = this.expertise.analyzeDescription(siteDetails.description);
      const recommendedTheme = this.expertise.recommendTheme(projectType);
      
      spinner.text = 'Setting up Hugo site structure...';
      
      // Create Hugo site
      await this.createHugoSite(siteDetails, recommendedTheme);
      
      // Initialize context
      await this.contextManager.init();
      const context = {
        project: {
          name: siteDetails.name,
          description: siteDetails.description,
          type: projectType,
          created: new Date().toISOString(),
          claudeInteractions: 1
        },
        architecture: {
          theme: recommendedTheme,
          contentTypes: this.getContentTypes(projectType)
        },
        technical: {
          hugo: this.getHugoVersion(),
          deployment: siteDetails.deployment || 'netlify'
        }
      };
      
      await this.contextManager.saveContext(context);
      
      spinner.text = 'Generating initial content structure...';
      
      // Generate initial content
      await this.generateInitialContent(siteDetails, recommendedTheme);
      
      spinner.succeed(chalk.green('Hugo site initialized successfully!'));
      
      // Display summary
      this.displaySummary(siteDetails, recommendedTheme, projectType);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to initialize Hugo site'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async getSiteDetails(options) {
    if (options.describe) {
      // Use provided description
      const siteName = path.basename(process.cwd());
      return {
        name: siteName,
        description: options.describe,
        path: process.cwd()
      };
    }
    
    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is your site name?',
        default: path.basename(process.cwd())
      },
      {
        type: 'input',
        name: 'description',
        message: 'Describe your site (e.g., "API documentation for a fintech startup"):',
        validate: input => input.length > 0 || 'Please provide a description'
      },
      {
        type: 'list',
        name: 'deployment',
        message: 'Where will you deploy this site?',
        choices: ['netlify', 'vercel', 'github-pages', 'other'],
        default: 'netlify'
      }
    ]);
    
    return {
      ...answers,
      path: process.cwd()
    };
  }

  async createHugoSite(siteDetails, theme) {
    const configPath = path.join(siteDetails.path, 'hugo.toml');
    
    // Check if Hugo is installed
    try {
      execSync('hugo version', { stdio: 'ignore' });
    } catch (error) {
      console.log(chalk.yellow('\n⚠️  Hugo is not installed. Please install Hugo first:'));
      console.log(chalk.cyan('  brew install hugo  # macOS'));
      console.log(chalk.cyan('  snap install hugo  # Linux'));
      console.log(chalk.cyan('  choco install hugo # Windows\n'));
      
      // Continue with simulation mode
      console.log(chalk.blue('Continuing in simulation mode...\n'));
    }
    
    // Create basic Hugo structure
    const dirs = [
      'content',
      'content/docs',
      'layouts',
      'static',
      'assets',
      'data',
      'themes'
    ];
    
    for (const dir of dirs) {
      await fs.ensureDir(path.join(siteDetails.path, dir));
    }
    
    // Create Hugo config
    const config = this.generateHugoConfig(siteDetails, theme);
    await fs.writeFile(configPath, config);
    
    // Create .gitignore
    const gitignore = `# Hugo
/public/
/resources/_gen/
/assets/jsconfig.json
hugo_stats.json

# Hugo AI
.hugo-ai/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
*.swp
*.swo
*~`;
    
    await fs.writeFile(path.join(siteDetails.path, '.gitignore'), gitignore);
  }

  generateHugoConfig(siteDetails, theme) {
    return `baseURL = 'https://example.org/'
languageCode = 'en-us'
title = '${siteDetails.name}'
theme = '${theme}'

[params]
  description = "${siteDetails.description}"
  author = "Hugo AI"
  
[menu]
  [[menu.main]]
    name = 'Home'
    url = '/'
    weight = 10
  [[menu.main]]
    name = 'Documentation'
    url = '/docs/'
    weight = 20
  [[menu.main]]
    name = 'API Reference'
    url = '/api/'
    weight = 30

[markup]
  [markup.highlight]
    codeFences = true
    guessSyntax = true
    lineNos = true
    style = 'monokai'`;
  }

  async generateInitialContent(siteDetails, theme) {
    // Create homepage
    const homepageContent = await this.claude.generateContent(
      `Create homepage content for: ${siteDetails.description}`,
      { theme, type: 'homepage' }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', '_index.md'),
      homepageContent
    );
    
    // Create initial documentation page
    const docContent = await this.claude.generateContent(
      `Create getting started documentation for: ${siteDetails.description}`,
      { theme, type: 'documentation' }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', 'docs', 'getting-started.md'),
      docContent
    );
  }

  getContentTypes(projectType) {
    const contentTypeMap = {
      'api-docs': ['api-reference', 'guides', 'tutorials', 'changelog'],
      'technical-docs': ['documentation', 'guides', 'reference', 'examples'],
      'blog': ['posts', 'categories', 'tags', 'authors'],
      'personal-site': ['about', 'portfolio', 'blog', 'contact']
    };
    
    return contentTypeMap[projectType] || ['pages', 'posts'];
  }

  getHugoVersion() {
    try {
      const version = execSync('hugo version', { encoding: 'utf8' });
      const match = version.match(/v([\d.]+)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'not-installed';
    }
  }

  displaySummary(siteDetails, theme, projectType) {
    console.log(chalk.cyan('\n📋 Site Configuration Summary:'));
    console.log(chalk.white('  • Name:'), siteDetails.name);
    console.log(chalk.white('  • Type:'), projectType);
    console.log(chalk.white('  • Theme:'), theme);
    console.log(chalk.white('  • Path:'), siteDetails.path);
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log(chalk.white('  1. Generate more content:'), chalk.yellow('hugo-ai generate --content "your request"'));
    console.log(chalk.white('  2. Analyze your site:'), chalk.yellow('hugo-ai analyze --performance --seo'));
    console.log(chalk.white('  3. Start development server:'), chalk.yellow('hugo server -D'));
    
    console.log(chalk.green('\n✨ Your intelligent Hugo site is ready!\n'));
  }
}

module.exports = InitCommand;