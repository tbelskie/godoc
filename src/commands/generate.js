const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');

const AdvancedContextManager = require('../context-manager');
const ClaudeSimulator = require('../claude-simulator');

class GenerateCommand {
  constructor() {
    this.contextManager = new AdvancedContextManager();
    this.claude = new ClaudeSimulator();
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🤖 GOdoc Content Generator\n'));
    
    const spinner = ora('Loading project context...').start();
    const startTime = Date.now();
    
    try {
      // Load existing context and log command start
      await this.contextManager.init();
      await this.contextManager.logCommand('generate', options.content ? ['--content', options.content] : [], 'started');
      const context = await this.contextManager.loadContext();
      
      if (!context.project) {
        spinner.fail(chalk.red('No GOdoc project found'));
        console.log(chalk.yellow('Run "godoc init" first to initialize a project'));
        process.exit(1);
      }
      
      spinner.text = 'Preparing content generation...';
      
      // Get content request
      const contentRequest = await this.getContentRequest(options);
      
      spinner.text = 'Generating content with Claude...';
      
      // Generate content based on request and context
      const generatedContent = await this.generateContent(contentRequest, context);
      
      spinner.text = 'Determining optimal file location...';
      
      // Determine where to save the content
      const filePath = await this.determineFilePath(contentRequest, context);
      
      // Save the content
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, generatedContent);
      
      // Update context
      context.project.claudeInteractions++;
      context.lastGenerated = {
        request: contentRequest.description,
        type: contentRequest.type,
        path: filePath,
        timestamp: new Date().toISOString()
      };
      await this.contextManager.saveContext(context);
      
      spinner.succeed(chalk.green('Content generated successfully!'));
      
      spinner.text = 'Updating search index...';
      
      // Update search index with new content
      await this.updateSearchIndex();
      
      // Log successful completion
      const duration = Date.now() - startTime;
      await this.contextManager.logCommand('generate', options.content ? ['--content', options.content] : [], 'completed', { duration });
      
      // Display result
      this.displayResult(filePath, contentRequest);
      
    } catch (error) {
      // Log failed command
      const duration = Date.now() - startTime;
      await this.contextManager.logCommand('generate', options.content ? ['--content', options.content] : [], 'failed', { 
        duration, 
        error: error.message 
      });
      
      spinner.fail(chalk.red('Failed to generate content'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async getContentRequest(options) {
    if (options.content) {
      return {
        description: options.content,
        type: options.type || 'page'
      };
    }
    
    // Interactive mode
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'What content would you like to generate?',
        validate: input => input.length > 0 || 'Please describe the content you need'
      },
      {
        type: 'list',
        name: 'type',
        message: 'What type of content is this?',
        choices: [
          { name: 'Documentation Page', value: 'doc' },
          { name: 'API Reference', value: 'api' },
          { name: 'Tutorial', value: 'tutorial' },
          { name: 'Blog Post', value: 'post' },
          { name: 'Landing Page', value: 'page' }
        ],
        default: 'doc'
      }
    ]);
    
    return answers;
  }

  async generateContent(request, context) {
    // Build enhanced prompt with context
    const enhancedPrompt = this.buildEnhancedPrompt(request, context);
    
    // Generate content using Claude
    const content = await this.claude.generateContent(enhancedPrompt, {
      theme: context.architecture?.theme,
      type: request.type,
      existingContent: context.lastGenerated
    });
    
    return this.postProcessContent(content, request, context);
  }

  buildEnhancedPrompt(request, context) {
    let prompt = request.description;
    
    // Add context information
    if (context.project) {
      prompt += `\n\nProject: ${context.project.name}`;
      prompt += `\nType: ${context.project.type}`;
      
      if (context.project.description) {
        prompt += `\nDescription: ${context.project.description}`;
      }
    }
    
    if (context.architecture?.theme) {
      prompt += `\nTheme: ${context.architecture.theme}`;
    }
    
    // Add content type specific instructions
    const typeInstructions = {
      'doc': 'Create comprehensive documentation with examples',
      'api': 'Include request/response examples and error codes',
      'tutorial': 'Include step-by-step instructions with code samples',
      'post': 'Write engaging content with proper metadata',
      'page': 'Create compelling content with clear call-to-actions'
    };
    
    prompt += `\n\nInstructions: ${typeInstructions[request.type] || 'Create high-quality content'}`;
    
    return prompt;
  }

  postProcessContent(content, request, context) {
    // Add Hugo-specific enhancements
    let processed = content;
    
    // Ensure proper front matter
    if (!processed.startsWith('---')) {
      const frontMatter = this.generateFrontMatter(request, context);
      processed = frontMatter + '\n\n' + processed;
    }
    
    // Add theme-specific shortcodes if applicable
    if (context.architecture?.theme === 'docsy') {
      // Add Docsy-specific shortcodes
      processed = processed.replace(
        /\[!NOTE\]/g,
        '{{< alert title="Note" >}}'
      ).replace(
        /\[!WARNING\]/g,
        '{{< alert color="warning" title="Warning" >}}'
      );
    }
    
    return processed;
  }

  generateFrontMatter(request, context) {
    const title = this.extractTitle(request.description);
    const slug = this.generateSlug(title);
    
    const frontMatter = {
      title: title,
      date: new Date().toISOString(),
      draft: false,
      weight: this.calculateWeight(request.type),
      description: request.description.substring(0, 160)
    };
    
    // Add type-specific front matter
    if (request.type === 'post') {
      frontMatter.categories = ['General'];
      frontMatter.tags = this.extractTags(request.description);
    }
    
    if (request.type === 'api') {
      frontMatter.menu = {
        main: {
          parent: 'API Reference',
          weight: 10
        }
      };
    }
    
    // Convert to YAML
    let yaml = '---\n';
    for (const [key, value] of Object.entries(frontMatter)) {
      if (typeof value === 'object') {
        yaml += `${key}:\n`;
        yaml += this.objectToYaml(value, '  ');
      } else if (Array.isArray(value)) {
        yaml += `${key}:\n`;
        value.forEach(item => {
          yaml += `  - ${item}\n`;
        });
      } else {
        yaml += `${key}: "${value}"\n`;
      }
    }
    yaml += '---';
    
    return yaml;
  }

  objectToYaml(obj, indent = '') {
    let yaml = '';
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object') {
        yaml += `${indent}${key}:\n`;
        yaml += this.objectToYaml(value, indent + '  ');
      } else {
        yaml += `${indent}${key}: ${value}\n`;
      }
    }
    return yaml;
  }

  extractTitle(description) {
    // Extract a title from the description
    const words = description.split(' ').slice(0, 6);
    return words.join(' ').replace(/[.,!?]$/, '');
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  extractTags(description) {
    // Simple tag extraction based on keywords
    const keywords = ['api', 'guide', 'tutorial', 'authentication', 'setup', 'configuration'];
    const tags = [];
    
    const lower = description.toLowerCase();
    keywords.forEach(keyword => {
      if (lower.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags.length > 0 ? tags : ['general'];
  }

  calculateWeight(type) {
    const weights = {
      'page': 10,
      'doc': 20,
      'tutorial': 30,
      'api': 40,
      'post': 50
    };
    return weights[type] || 100;
  }

  async determineFilePath(request, context) {
    const baseDir = process.cwd();
    const contentDir = path.join(baseDir, 'content');
    
    // Determine subdirectory based on content type
    const typeDirectories = {
      'doc': 'docs',
      'api': 'api',
      'tutorial': 'tutorials',
      'post': 'posts',
      'page': ''
    };
    
    const subDir = typeDirectories[request.type] || '';
    const fileName = this.generateFileName(request.description);
    
    if (subDir) {
      await fs.ensureDir(path.join(contentDir, subDir));
      return path.join(contentDir, subDir, fileName);
    }
    
    return path.join(contentDir, fileName);
  }

  generateFileName(description) {
    const slug = this.generateSlug(this.extractTitle(description));
    return `${slug}.md`;
  }

  displayResult(filePath, request) {
    console.log(chalk.cyan('\n📄 Content Generated:'));
    console.log(chalk.white('  • Type:'), request.type);
    console.log(chalk.white('  • File:'), path.relative(process.cwd(), filePath));
    console.log(chalk.white('  • Request:'), request.description);
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log(chalk.white('  1. Review the generated content'));
    console.log(chalk.white('  2. Run'), chalk.yellow('hugo server -D'), chalk.white('to preview'));
    console.log(chalk.white('  3. Generate more content with'), chalk.yellow('godoc generate'));
    
    console.log(chalk.green('\n✨ Content ready for review!\n'));
  }

  async updateSearchIndex() {
    try {
      const contentDir = path.join(process.cwd(), 'content');
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
      
      // Write search index to static directory
      const staticDir = path.join(process.cwd(), 'static');
      await fs.ensureDir(staticDir);
      
      const indexPath = path.join(staticDir, 'search-index.json');
      await fs.writeJSON(indexPath, searchIndex, { spaces: 2 });
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Could not update search index: ${error.message}`));
    }
  }
}

module.exports = GenerateCommand;