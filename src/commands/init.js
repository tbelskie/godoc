const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const AdvancedContextManager = require('../context-manager');
const HugoExpertise = require('../hugo-expertise');
const ClaudeSimulator = require('../claude-simulator');
const ThemeGenerator = require('../theme-generator');

class InitCommand {
  constructor() {
    this.contextManager = new AdvancedContextManager();
    this.expertise = new HugoExpertise();
    this.claude = new ClaudeSimulator();
    this.themeGenerator = new ThemeGenerator();
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🚀 GOdoc - Conversational Site Generator\n'));
    
    const spinner = ora('Analyzing your requirements...').start();
    const startTime = Date.now();
    
    try {
      // Initialize context manager and log command start
      await this.contextManager.init();
      await this.contextManager.logCommand('init', options.describe ? ['--describe', options.describe] : [], 'started');
      
      spinner.succeed('Context initialized');
      spinner.start('Analyzing your requirements...');
      // Get site details through conversation
      const siteDetails = await this.getSiteDetails(options);
      
      spinner.succeed('Requirements analyzed');
      spinner.start('Determining optimal Hugo configuration...');
      
      // Analyze project type and recommend theme
      const projectType = this.expertise.analyzeDescription(siteDetails.description);
      const recommendedTheme = this.expertise.recommendTheme(projectType);
      
      spinner.succeed('Configuration determined');
      spinner.start('Setting up Hugo site structure...');
      
      // Create Hugo site
      await this.createHugoSite(siteDetails, recommendedTheme);
      
      spinner.succeed('Hugo site structure created');
      
      // Initialize context
      spinner.start('Initializing project context...');
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
      
      spinner.succeed('Project context saved');
      spinner.start('Generating custom theme and layouts...');
      
      // Generate custom theme
      const features = this.determineFeatures(siteDetails, projectType);
      const themeConfig = {
        name: `godoc-${projectType}`,
        style: this.getStyleFromProjectType(projectType),
        features: features,
        colors: siteDetails.colors?.primary ? siteDetails.colors : null
      };
      
      const theme = await this.themeGenerator.generateCustomTheme(siteDetails.path, themeConfig);
      
      spinner.succeed('Custom theme generated');
      
      spinner.start('Generating rich content...');
      
      // Generate initial content with enhanced context
      await this.generateInitialContent(siteDetails, recommendedTheme, context);
      
      spinner.succeed('Rich content generated');
      spinner.start('Building search index...');
      
      // Generate search index
      await this.generateSearchIndex(siteDetails);
      
      spinner.succeed(chalk.green('Hugo site initialized successfully!'));
      
      // Log successful completion
      const duration = Date.now() - startTime;
      await this.contextManager.logCommand('init', options.describe ? ['--describe', options.describe] : [], 'completed', { duration });
      
      // Display summary
      this.displaySummary(siteDetails, recommendedTheme, projectType);
      
    } catch (error) {
      // Log failed command
      const duration = Date.now() - startTime;
      await this.contextManager.logCommand('init', options.describe ? ['--describe', options.describe] : [], 'failed', { 
        duration, 
        error: error.message 
      });
      
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
    
    // Interactive mode - GOdoc workflow
    console.log(chalk.cyan('🚀 Welcome to GOdoc - Your AI Documentation Assistant!'));
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

# GOdoc
.godoc/

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
# Custom theme generated by GOdoc - no external theme needed

[params]
  description = "${siteDetails.description}"
  author = "GOdoc"
  
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
    // Pass the full user description to enable vision-driven content generation
    const fullPrompt = `${siteDetails.description}\n\nGenerate homepage content for this vision.`;
    
    // Create homepage with vision-driven approach
    const homepageContent = await this.claude.generateContent(
      fullPrompt,
      { 
        theme, 
        type: 'homepage', 
        project: context.project,
        siteDetails,
        colors: siteDetails.colors
      }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', '_index.md'),
      homepageContent
    );
    
    // Create getting started guide with full context
    const gettingStartedPrompt = `${siteDetails.description}\n\nGenerate a getting started guide for this vision.`;
    const gettingStartedContent = await this.claude.generateContent(
      gettingStartedPrompt,
      { 
        theme, 
        type: 'tutorial', 
        project: context.project,
        siteDetails,
        colors: siteDetails.colors
      }
    );
    
    await fs.writeFile(
      path.join(siteDetails.path, 'content', 'docs', 'getting-started.md'),
      gettingStartedContent
    );
    
    // Create additional content based on project type with vision context
    const additionalContent = this.getAdditionalContentForType(context.project.type);
    
    for (const content of additionalContent) {
      // Enhance the prompt with the full user vision
      const visionPrompt = `${siteDetails.description}\n\n${content.prompt}`;
      const contentData = await this.claude.generateContent(
        visionPrompt,
        { 
          theme, 
          type: content.type, 
          project: context.project,
          siteDetails,
          colors: siteDetails.colors
        }
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
    console.log(chalk.white('  1. Preview your site:'), chalk.yellow('godoc preview'));
    console.log(chalk.white('  2. Generate more content:'), chalk.yellow('godoc generate --content "your request"'));
    
    // Show GitHub setup option if requested
    if (siteDetails.createGithubRepo) {
      console.log(chalk.white('  3. Create GitHub repository:'), chalk.yellow('godoc github'));
    } else {
      console.log(chalk.white('  3. Create GitHub repository:'), chalk.yellow('godoc github (optional)'));
    }
    
    console.log(chalk.white('  4. Analyze your site:'), chalk.yellow('godoc analyze --performance --seo'));
    console.log(chalk.white('  5. Customize the theme by editing files in layouts/ and assets/'));
    
    console.log(chalk.green('\n✨ Your professional Hugo site is ready!'));
    
    if (siteDetails.createGithubRepo) {
      console.log(chalk.yellow('\n💡 Tip: Run'), chalk.cyan('godoc github'), chalk.yellow('when you\'re ready to create your repository!'));
    }
    
    console.log();
  }

  async generateSearchIndex(siteDetails) {
    try {
      const contentDir = path.join(siteDetails.path, 'content');
      const searchIndex = [];
      
      // Helper function to extract text content from markdown
      const extractTextContent = (markdown) => {
        // Remove front matter
        const content = markdown.replace(/^---[\s\S]*?---/, '');
        // Remove markdown formatting but keep text
        return content
          .replace(/#{1,6}\s+/g, '') // Remove headers
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
          .replace(/\*([^*]+)\*/g, '$1') // Italic
          .replace(/`([^`]+)`/g, '$1') // Inline code
          .replace(/```[\s\S]*?```/g, '') // Code blocks
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
          .replace(/^\s*[-*+]\s+/gm, '') // List items
          .replace(/\n+/g, ' ') // Multiple newlines to space
          .trim();
      };

      // Read all markdown files recursively
      const readDirectory = async (dirPath, urlPrefix = '') => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          
          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
              // Recursively read subdirectories
              const newUrlPrefix = urlPrefix + '/' + entry.name;
              await readDirectory(fullPath, newUrlPrefix);
            } else if (entry.name.endsWith('.md')) {
              // Process markdown files
              try {
                const content = await fs.readFile(fullPath, 'utf8');
                const lines = content.split('\n');
                
                // Extract title from front matter or first header
                let title = entry.name.replace('.md', '');
                let description = '';
                
                // Look for title in front matter
                const frontMatterMatch = content.match(/^---[\s\S]*?title:\s*["']?([^"'\n]+)["']?[\s\S]*?---/);
                if (frontMatterMatch) {
                  title = frontMatterMatch[1];
                }
                
                // Look for description in front matter
                const descriptionMatch = content.match(/^---[\s\S]*?description:\s*["']?([^"'\n]+)["']?[\s\S]*?---/);
                if (descriptionMatch) {
                  description = descriptionMatch[1];
                }
                
                // If no front matter title, look for first h1
                if (title === entry.name.replace('.md', '')) {
                  const h1Match = content.match(/^#\s+(.+)/m);
                  if (h1Match) {
                    title = h1Match[1];
                  }
                }
                
                // Generate URL
                let url = urlPrefix + '/';
                if (entry.name === '_index.md') {
                  // Index files map to the directory URL
                  url = urlPrefix || '/';
                } else {
                  // Regular files map to their name without .md
                  url = urlPrefix + '/' + entry.name.replace('.md', '') + '/';
                }
                
                // Clean up URL
                url = url.replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
                if (!url.startsWith('/')) {
                  url = '/' + url;
                }
                if (url !== '/' && url.endsWith('/')) {
                  url = url.slice(0, -1);
                }
                
                // Extract searchable content
                const textContent = extractTextContent(content);
                const searchableContent = description || textContent.substring(0, 300);
                
                searchIndex.push({
                  title: title,
                  url: url,
                  content: searchableContent,
                  type: urlPrefix.includes('/docs') ? 'documentation' : 'page'
                });
                
              } catch (error) {
                console.warn(`Warning: Could not process ${fullPath}: ${error.message}`);
              }
            }
          }
        } catch (error) {
          // Directory might not exist, which is fine
        }
      };
      
      // Start reading from content directory
      await readDirectory(contentDir);
      
      // Write search index to static directory so it's accessible at /search-index.json
      const staticDir = path.join(siteDetails.path, 'static');
      await fs.ensureDir(staticDir);
      
      const indexPath = path.join(staticDir, 'search-index.json');
      await fs.writeJSON(indexPath, searchIndex, { spaces: 2 });
      
      console.log(chalk.green(`✅ Generated search index with ${searchIndex.length} pages`));
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not generate search index: ${error.message}`));
    }
  }
}

module.exports = InitCommand;