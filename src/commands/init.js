const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const HugoContextManager = require('../context-manager');
const HugoExpertise = require('../hugo-expertise');
const ClaudeSimulator = require('../claude-simulator');
const ThemeGenerator = require('../theme-generator');

class InitCommand {
  constructor() {
    this.contextManager = new HugoContextManager();
    this.expertise = new HugoExpertise();
    this.claude = new ClaudeSimulator();
    this.themeGenerator = new ThemeGenerator();
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
      
      spinner.text = 'Generating custom theme and layouts...';
      
      // Generate custom theme
      const features = this.determineFeatures(siteDetails, projectType);
      const themeConfig = {
        name: `hugo-ai-${projectType}`,
        style: this.getStyleFromProjectType(projectType),
        features: features,
        colors: siteDetails.colors?.primary ? siteDetails.colors : null
      };
      
      const theme = await this.themeGenerator.generateCustomTheme(siteDetails.path, themeConfig);
      
      spinner.text = 'Generating rich content...';
      
      // Generate initial content with enhanced context
      await this.generateInitialContent(siteDetails, recommendedTheme, context);
      
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
      // Use provided description - parse for enhanced details
      const siteName = path.basename(process.cwd());
      const enhancedDetails = await this.parseDescription(options.describe);
      return {
        name: siteName,
        description: options.describe,
        path: process.cwd(),
        ...enhancedDetails
      };
    }
    
    // Interactive mode - DocGo workflow
    console.log(chalk.cyan('🚀 Welcome to DocGo - Your AI Documentation Assistant!'));
    console.log(chalk.white('Let\'s create your perfect documentation site together.\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '📝 What\'s your project name?',
        default: path.basename(process.cwd()),
        validate: input => input.length > 0 || 'Please provide a project name'
      },
      {
        type: 'input',
        name: 'description',
        message: '💭 Describe your documentation needs:',
        validate: input => input.length > 0 || 'Please describe what kind of documentation you need'
      }
    ]);

    // Parse the description for specific requirements
    const enhancedDetails = await this.parseDescription(answers.description);
    
    // Ask clarifying questions based on what we found
    const clarifications = await this.askClarifyingQuestions(enhancedDetails);
    
    return {
      ...answers,
      ...enhancedDetails,
      ...clarifications,
      path: process.cwd()
    };
  }

  async parseDescription(description) {
    const lower = description.toLowerCase();
    const details = {
      colors: { primary: null, secondary: null },
      pages: [],
      style: 'modern',
      industry: null
    };

    // Extract colors
    const colorMatches = description.match(/(?:use|with|colors?)\s+([^.]+)(?:for|as)\s+(?:primary|main|brand)/i);
    if (colorMatches) {
      const colorText = colorMatches[1];
      if (colorText.includes('black') && colorText.includes('green')) {
        details.colors = { primary: '#1a1a1a', secondary: '#10b981' };
      } else if (colorText.includes('blue') && colorText.includes('white')) {
        details.colors = { primary: '#3b82f6', secondary: '#ffffff' };
      }
    }

    // Extract specific page requests
    const pageKeywords = {
      'home': ['home', 'homepage', 'landing'],
      'overview': ['overview', 'about', 'introduction'],
      'api': ['api', 'reference', 'endpoints'],
      'quickstart': ['quickstart', 'getting started', 'setup', 'installation'],
      'guides': ['guide', 'tutorial', 'how-to'],
      'examples': ['example', 'sample', 'demo']
    };

    Object.entries(pageKeywords).forEach(([pageType, keywords]) => {
      if (keywords.some(keyword => lower.includes(keyword))) {
        details.pages.push(pageType);
      }
    });

    // Detect industry
    if (lower.includes('fintech') || lower.includes('financial') || lower.includes('payment')) {
      details.industry = 'fintech';
    } else if (lower.includes('saas') || lower.includes('software')) {
      details.industry = 'saas';
    } else if (lower.includes('api') || lower.includes('developer')) {
      details.industry = 'developer-tools';
    }

    // Detect style preferences
    if (lower.includes('clean') || lower.includes('minimal')) {
      details.style = 'minimal';
    } else if (lower.includes('modern') || lower.includes('sleek')) {
      details.style = 'modern';
    } else if (lower.includes('corporate') || lower.includes('professional')) {
      details.style = 'corporate';
    }

    return details;
  }

  async askClarifyingQuestions(details) {
    console.log(chalk.cyan('\n🤔 I found some details from your description. Let me clarify a few things:\n'));
    
    const questions = [];

    // Ask about colors if not detected
    if (!details.colors.primary) {
      questions.push({
        type: 'list',
        name: 'colorScheme',
        message: '🎨 What color scheme would you prefer?',
        choices: [
          { name: '🖤 Black & Green (Tech/Fintech)', value: { primary: '#1a1a1a', secondary: '#10b981' } },
          { name: '🔵 Blue & White (Professional)', value: { primary: '#3b82f6', secondary: '#ffffff' } },
          { name: '🟣 Purple & Gray (Modern)', value: { primary: '#8b5cf6', secondary: '#6b7280' } },
          { name: '🔴 Red & Black (Bold)', value: { primary: '#ef4444', secondary: '#1f2937' } },
          { name: '⚪ Default (Let AI choose)', value: null }
        ]
      });
    }

    // Ask about additional pages
    const detectedPages = details.pages.length > 0 ? details.pages.join(', ') : 'none detected';
    questions.push({
      type: 'checkbox',
      name: 'additionalPages',
      message: `📄 I detected these pages: ${detectedPages}. Any others you need?`,
      choices: [
        { name: '📋 Pricing Page', value: 'pricing' },
        { name: '👥 Team/About Page', value: 'team' },
        { name: '📞 Contact Page', value: 'contact' },
        { name: '📚 Blog/News', value: 'blog' },
        { name: '🔧 Troubleshooting', value: 'troubleshooting' },
        { name: '🔐 Authentication Guide', value: 'authentication' },
        { name: '📊 Analytics/Metrics', value: 'analytics' }
      ]
    });

    // Ask about deployment
    questions.push({
      type: 'list',
      name: 'deployment',
      message: '🚀 Where would you like to deploy your site?',
      choices: [
        { name: '🌐 Netlify (Recommended)', value: 'netlify' },
        { name: '▲ Vercel', value: 'vercel' },
        { name: '📑 GitHub Pages', value: 'github-pages' },
        { name: '☁️ Other/Self-hosted', value: 'other' }
      ],
      default: 'netlify'
    });

    // Ask about GitHub integration
    questions.push({
      type: 'confirm',
      name: 'createGithubRepo',
      message: '📦 Would you like me to create a GitHub repository for this project?',
      default: true
    });

    // Ask about CI/CD
    questions.push({
      type: 'confirm',
      name: 'setupCICD',
      message: '⚙️ Set up automated deployment (CI/CD) workflows?',
      default: true
    });

    const answers = await inquirer.prompt(questions);

    // Merge colors
    if (answers.colorScheme) {
      details.colors = answers.colorScheme;
    }

    // Merge additional pages
    if (answers.additionalPages) {
      details.pages = [...new Set([...details.pages, ...answers.additionalPages])];
    }

    return {
      ...details,
      deployment: answers.deployment,
      createGithubRepo: answers.createGithubRepo,
      setupCICD: answers.setupCICD
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
# Custom theme generated by Hugo AI - no external theme needed

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

  async generateInitialContent(siteDetails, theme, context) {
    // Create homepage with full context
    const homepageContent = await this.claude.generateContent(
      `Create homepage content for: ${siteDetails.description}`,
      { theme, type: 'homepage', project: context.project }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', '_index.md'),
      homepageContent
    );
    
    // Create getting started guide
    const gettingStartedContent = await this.claude.generateContent(
      `Create getting started guide for: ${siteDetails.description}`,
      { theme, type: 'tutorial', project: context.project }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', 'docs', 'getting-started.md'),
      gettingStartedContent
    );
    
    // Create additional content based on project type
    const additionalContent = this.getAdditionalContentForType(context.project.type);
    
    for (const content of additionalContent) {
      const contentData = await this.claude.generateContent(
        content.prompt,
        { theme, type: content.type, project: context.project }
      );
      
      const filePath = path.join(siteDetails.path, 'content', content.path);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, contentData);
    }
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

  determineFeatures(siteDetails, projectType) {
    const baseFeatures = ['navigation', 'responsive'];
    
    // Add features based on project type
    switch (projectType) {
      case 'api-docs':
        return [...baseFeatures, 'search', 'dark-mode', 'documentation'];
      case 'technical-docs':
        return [...baseFeatures, 'search', 'documentation'];
      case 'blog':
        return [...baseFeatures, 'dark-mode', 'tags'];
      case 'personal-site':
        return [...baseFeatures, 'dark-mode'];
      default:
        return baseFeatures;
    }
  }

  getStyleFromProjectType(projectType) {
    const styleMap = {
      'api-docs': 'technical',
      'technical-docs': 'minimal',
      'blog': 'modern',
      'personal-site': 'creative'
    };
    
    return styleMap[projectType] || 'minimal';
  }

  getAdditionalContentForType(projectType) {
    const contentMap = {
      'api-docs': [
        {
          prompt: 'Authentication guide with OAuth 2.0 and API keys',
          type: 'authentication',
          path: 'docs/authentication.md'
        },
        {
          prompt: 'API reference with endpoints and examples',
          type: 'api',
          path: 'docs/api-reference.md'
        },
        {
          prompt: 'Error handling and troubleshooting guide',
          type: 'guide',
          path: 'docs/troubleshooting.md'
        }
      ],
      'technical-docs': [
        {
          prompt: 'Installation and setup guide',
          type: 'tutorial',
          path: 'docs/installation.md'
        },
        {
          prompt: 'Configuration and customization guide',
          type: 'guide',
          path: 'docs/configuration.md'
        }
      ],
      'blog': [
        {
          prompt: 'About page with author information',
          type: 'guide',
          path: 'about.md'
        },
        {
          prompt: 'First blog post introduction',
          type: 'guide',
          path: 'posts/welcome.md'
        }
      ],
      'personal-site': [
        {
          prompt: 'About page with personal information',
          type: 'guide',
          path: 'about.md'
        },
        {
          prompt: 'Contact information and social links',
          type: 'guide',
          path: 'contact.md'
        }
      ]
    };
    
    return contentMap[projectType] || [];
  }

  displaySummary(siteDetails, theme, projectType) {
    console.log(chalk.cyan('\n📋 Site Configuration Summary:'));
    console.log(chalk.white('  • Name:'), siteDetails.name);
    console.log(chalk.white('  • Type:'), projectType);
    console.log(chalk.white('  • Theme:'), theme);
    console.log(chalk.white('  • Path:'), siteDetails.path);
    
    if (siteDetails.colors?.primary) {
      console.log(chalk.white('  • Colors:'), `${siteDetails.colors.primary} / ${siteDetails.colors.secondary}`);
    }
    
    console.log(chalk.cyan('\n🎨 Generated Assets:'));
    console.log(chalk.white('  • Custom layouts and templates'));
    console.log(chalk.white('  • Responsive CSS styling'));
    console.log(chalk.white('  • Interactive JavaScript features'));
    console.log(chalk.white('  • Rich content with examples'));
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log(chalk.white('  1. Preview your site:'), chalk.yellow('hugo-ai preview'));
    console.log(chalk.white('  2. Generate more content:'), chalk.yellow('hugo-ai generate --content "your request"'));
    
    // Show GitHub setup option if requested
    if (siteDetails.createGithubRepo) {
      console.log(chalk.white('  3. Create GitHub repository:'), chalk.yellow('hugo-ai github'));
    } else {
      console.log(chalk.white('  3. Create GitHub repository:'), chalk.yellow('hugo-ai github (optional)'));
    }
    
    console.log(chalk.white('  4. Analyze your site:'), chalk.yellow('hugo-ai analyze --performance --seo'));
    console.log(chalk.white('  5. Customize the theme by editing files in layouts/ and assets/'));
    
    console.log(chalk.green('\n✨ Your professional Hugo site is ready!'));
    
    if (siteDetails.createGithubRepo) {
      console.log(chalk.yellow('\n💡 Tip: Run'), chalk.cyan('hugo-ai github'), chalk.yellow('when you\'re ready to create your repository!'));
    }
    
    console.log();
  }
}

module.exports = InitCommand;