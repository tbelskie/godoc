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
const ThemeIntelligence = require('../theme-intelligence');

class EnhancedInitCommand {
  constructor() {
    this.contextManager = new AdvancedContextManager();
    this.expertise = new HugoExpertise();
    this.claude = new ClaudeSimulator();
    this.themeGenerator = new ThemeGenerator();
    this.themeIntelligence = new ThemeIntelligence();
  }

  async execute(directory, options) {
    console.log(chalk.blue.bold('\n🚀 GOdoc - Complete Documentation Platform\n'));
    
    const spinner = ora('Setting up your documentation site...').start();
    
    try {
      // Step 1: Handle directory creation if specified
      let targetDirectory = process.cwd();
      let projectName = path.basename(targetDirectory);
      
      if (directory) {
        targetDirectory = path.resolve(directory);
        projectName = path.basename(targetDirectory);
        
        if (fs.existsSync(targetDirectory)) {
          spinner.stop();
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `Directory "${directory}" already exists. Continue anyway?`,
            default: false
          }]);
          
          if (!overwrite) {
            console.log(chalk.yellow('Operation cancelled.'));
            return;
          }
        } else {
          spinner.text = `Creating directory "${directory}"...`;
          await fs.ensureDir(targetDirectory);
          spinner.succeed(`Created directory: ${directory}`);
        }
        
        // Change to target directory
        process.chdir(targetDirectory);
        spinner.start('Initializing in new directory...');
      }

      // Step 2: Get site requirements (enhanced with better defaults)
      spinner.stop();
      const siteDetails = await this.getSiteDetailsEnhanced(options, projectName);
      
      spinner.start('🧠 Analyzing documentation requirements...');
      
      // Step 3: Use Theme Intelligence for smart theme selection
      let selectedTheme;
      if (options.theme) {
        selectedTheme = await this.themeIntelligence.getThemeByName(options.theme);
        if (!selectedTheme) {
          spinner.warn(`Theme "${options.theme}" not found, using intelligent selection...`);
          const recommendations = await this.themeIntelligence.matchThemes(siteDetails.description, 1);
          selectedTheme = recommendations[0];
        }
      } else {
        spinner.text = '🎯 Finding perfect theme match...';
        const recommendations = await this.themeIntelligence.matchThemes(siteDetails.description, 1);
        selectedTheme = recommendations[0];
      }

      if (selectedTheme) {
        spinner.succeed(`Selected theme: ${selectedTheme.title} (${selectedTheme.matchScore || 'N/A'} match)`);
        console.log(chalk.cyan(`   Theme: ${selectedTheme.name} - ${selectedTheme.description}`));
        if (selectedTheme.matchReasons) {
          selectedTheme.matchReasons.forEach(reason => {
            console.log(chalk.gray(`   • ${reason}`));
          });
        }
      }

      // Step 4: Initialize Hugo site
      spinner.start('🏗️  Creating Hugo site structure...');
      
      // Initialize git first
      try {
        execSync('git init', { stdio: 'pipe' });
        spinner.text = '🏗️  Hugo + Git initialization...';
      } catch (error) {
        // Git might already be initialized
      }
      
      // Create Hugo site
      const projectType = this.expertise.analyzeDescription(siteDetails.description);
      await this.createHugoSite(siteDetails, selectedTheme, projectType);
      
      spinner.succeed('Hugo site created');

      // Step 5: Generate initial content
      spinner.start('✨ Generating documentation structure...');
      await this.generateInitialContent(siteDetails, projectType);
      spinner.succeed('Documentation structure generated');

      // Step 6: Show completion and next steps
      this.showCompletionMessage(projectName, directory);

    } catch (error) {
      spinner.fail('Initialization failed');
      console.error(chalk.red('Error:'), error.message);
      throw error;
    }
  }

  async getSiteDetailsEnhanced(options, projectName) {
    if (options.describe) {
      return {
        siteName: this.generateSiteName(projectName),
        description: options.describe,
        author: 'GOdoc Team'
      };
    }

    console.log(chalk.yellow('\n💬 Let\'s create your documentation site!\n'));
    
    const questions = [
      {
        type: 'input',
        name: 'siteName',
        message: 'What should we call your documentation site?',
        default: this.generateSiteName(projectName)
      },
      {
        type: 'input',
        name: 'description',
        message: 'Describe what kind of documentation you need:',
        default: 'Internal developer documentation with guides, references, and processes'
      },
      {
        type: 'input',
        name: 'author',
        message: 'Author/Organization:',
        default: 'Documentation Team'
      }
    ];

    return await inquirer.prompt(questions);
  }

  generateSiteName(projectName) {
    return projectName
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .concat(' Documentation');
  }

  async createHugoSite(siteDetails, selectedTheme, projectType) {
    // Create basic Hugo structure
    const dirs = ['content', 'static', 'layouts', 'data', 'assets'];
    for (const dir of dirs) {
      await fs.ensureDir(dir);
    }

    // Create config file
    const config = this.generateHugoConfig(siteDetails, selectedTheme, projectType);
    await fs.writeFile('config.toml', config);

    // Initialize context manager
    await this.contextManager.init();
    await this.contextManager.saveContext({
      siteName: siteDetails.siteName,
      description: siteDetails.description,
      theme: selectedTheme?.name || 'default',
      projectType: projectType
    });
  }

  generateHugoConfig(siteDetails, selectedTheme, projectType) {
    return `baseURL = 'https://example.org/'
languageCode = 'en-us'
title = '${siteDetails.siteName}'
theme = '${selectedTheme?.name || 'default'}'

[params]
  description = "${siteDetails.description}"
  author = "${siteDetails.author}"
  version = "1.0.0"
  
[markup]
  [markup.highlight]
    codeFences = true
    guessSyntax = true
    lineNos = true
    style = 'github'
    
[menu]
  [[menu.main]]
    name = "Home"
    url = "/"
    weight = 10
  
  [[menu.main]]
    name = "Documentation"
    url = "/docs/"
    weight = 20
`;
  }

  async generateInitialContent(siteDetails, projectType) {
    // Create index page
    const indexContent = `---
title: "${siteDetails.siteName}"
date: ${new Date().toISOString()}
draft: false
---

# Welcome to ${siteDetails.siteName}

${siteDetails.description}

## Getting Started

This documentation site was generated using GOdoc. Here's what you can do:

- Browse the documentation sections in the menu
- Use the search functionality (if available)
- Contribute to the documentation by editing the files

## Quick Links

- [Documentation](/docs/)
- [Getting Started](/docs/getting-started/)
- [API Reference](/docs/api/)

---

*Generated with [GOdoc](https://github.com/tbelskie/godoc)*
`;

    await fs.writeFile('content/_index.md', indexContent);

    // Create docs section
    await fs.ensureDir('content/docs');
    
    const docsIndex = `---
title: "Documentation"
date: ${new Date().toISOString()}
draft: false
---

# Documentation

Welcome to the documentation section.

## Sections

- [Getting Started](getting-started/)
- [Architecture](architecture/)
- [API Reference](api/)
- [Guides](guides/)
`;

    await fs.writeFile('content/docs/_index.md', docsIndex);

    // Create placeholder pages
    const placeholderPages = [
      { path: 'content/docs/getting-started.md', title: 'Getting Started' },
      { path: 'content/docs/architecture.md', title: 'Architecture' },
      { path: 'content/docs/api.md', title: 'API Reference' },
      { path: 'content/docs/guides.md', title: 'Guides' }
    ];

    for (const page of placeholderPages) {
      const content = `---
title: "${page.title}"
date: ${new Date().toISOString()}
draft: false
weight: 10
---

# ${page.title}

Content coming soon...

*This page was generated by GOdoc. Edit this file to add your content.*
`;
      await fs.writeFile(page.path, content);
    }
  }

  showCompletionMessage(projectName, directory) {
    console.log(chalk.green.bold('\n🎉 Documentation site created successfully!\n'));
    
    if (directory) {
      console.log(chalk.cyan(`📁 Project: ${projectName} (in ${directory}/)`));
    } else {
      console.log(chalk.cyan(`📁 Project: ${projectName} (in current directory)`));
    }

    console.log(chalk.blue.bold('\n🚀 Next Steps:\n'));
    
    // Contextual suggestions based on what was created
    console.log(chalk.blue('1. Preview your site:'));
    console.log(chalk.gray('   godoc preview'));
    
    console.log(chalk.blue('\n2. Create GitHub repository:'));
    console.log(chalk.gray('   godoc github'));
    
    console.log(chalk.blue('\n3. Make changes using natural language:'));
    console.log(chalk.gray('   godoc git "commit my initial documentation setup"'));
    
    console.log(chalk.blue('\n4. Generate additional content:'));
    console.log(chalk.gray('   godoc generate --content "API authentication guide"'));
    
    console.log(chalk.blue('\n5. Plan documentation from specifications:'));
    console.log(chalk.gray('   godoc plan <your-spec-file.md>'));

    console.log(chalk.green.bold('\n✨ Your documentation workflow is ready!\n'));
    
    if (directory) {
      console.log(chalk.yellow(`💡 Don't forget to: cd ${directory}`));
    }
  }
}

module.exports = EnhancedInitCommand;