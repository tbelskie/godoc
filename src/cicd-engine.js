/**
 * CI/CD Engine - Automated deployment pipeline generation
 * 
 * Generates GitHub Actions, GitLab CI, and deployment configs
 * Goal: "deploy to netlify" should create complete CI/CD pipeline
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class CICDEngine {
  constructor() {
    this.templates = null;
    this.dryRun = false;
  }

  /**
   * Initialize CI/CD engine with templates
   */
  async initialize() {
    try {
      // Load CI/CD templates from intel pack
      const IntelLoader = require('./intel/loadIntel');
      const intel = await IntelLoader.loadBundledIntel();
      
      // Check if cicd-templates exists in intel pack
      if (intel['cicd-templates']) {
        this.templates = intel['cicd-templates'];
      } else {
        // Load from standalone file
        const templatesPath = path.resolve(__dirname, '..', 'assets', 'intel', 'cicd-templates.json');
        this.templates = await fs.readJSON(templatesPath);
      }

      console.log(chalk.green('✅ CI/CD engine initialized'));
      console.log(chalk.gray(`   Loaded ${Object.keys(this.templates.templates.github_actions).length} GitHub Actions templates`));
      console.log(chalk.gray(`   Loaded ${Object.keys(this.templates.templates.gitlab_ci).length} GitLab CI templates`));
      console.log(chalk.gray(`   Loaded ${Object.keys(this.templates.presets).length} deployment presets`));

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not load CI/CD templates:', error.message));
      this.templates = { templates: {}, presets: {} };
    }
  }

  /**
   * Process natural language deployment request
   * e.g., "deploy to netlify", "set up github actions"
   */
  async processDeploymentRequest(request) {
    console.log(chalk.blue(`🚀 Processing deployment request: "${request}"`));
    
    const deployment = this.parseDeploymentRequest(request);
    if (!deployment) {
      throw new Error(`Could not understand deployment request: "${request}"`);
    }

    console.log(chalk.cyan(`→ Detected: Deploy to ${deployment.platform} using ${deployment.ci_platform}`));
    
    // Generate deployment files
    const results = await this.generateDeploymentFiles(deployment);
    
    return results;
  }

  /**
   * Parse natural language deployment requests
   */
  parseDeploymentRequest(request) {
    const lower = request.toLowerCase();
    
    // Check for specific platform patterns first (more specific)
    const patterns = this.templates.nlp_patterns;
    
    for (const [platform, phrases] of Object.entries(patterns)) {
      for (const phrase of phrases) {
        if (lower.includes(phrase)) {
          const platformName = platform.replace('deploy_to_', '');
          return {
            platform: platformName,
            ci_platform: this.detectCIPlatform(lower),
            preset: this.determinePreset(platformName, lower)
          };
        }
      }
    }
    
    // Check for platform names directly
    if (lower.includes('vercel')) {
      return {
        platform: 'vercel',
        ci_platform: this.detectCIPlatform(lower),
        preset: 'professional'
      };
    }
    
    if (lower.includes('netlify')) {
      return {
        platform: 'netlify',
        ci_platform: this.detectCIPlatform(lower),
        preset: 'professional'
      };
    }
    
    if (lower.includes('aws') || lower.includes('s3')) {
      return {
        platform: 'aws',
        ci_platform: this.detectCIPlatform(lower),
        preset: 'enterprise'
      };
    }
    
    // Default GitHub Actions deployment
    if (lower.includes('github') || lower.includes('actions')) {
      return {
        platform: 'github',
        ci_platform: 'github_actions',
        preset: 'starter'
      };
    }
    
    return null;
  }

  /**
   * Detect CI platform preference
   */
  detectCIPlatform(request) {
    if (request.includes('gitlab')) return 'gitlab_ci';
    if (request.includes('github') || request.includes('actions')) return 'github_actions';
    
    // Default to GitHub Actions
    return 'github_actions';
  }

  /**
   * Determine appropriate preset based on request
   */
  determinePreset(platform, request) {
    if (request.includes('enterprise') || request.includes('aws') || request.includes('s3')) {
      return 'enterprise';
    }
    if (request.includes('professional') || request.includes('production')) {
      return 'professional';
    }
    if (request.includes('multi') || request.includes('multiple')) {
      return 'multi_platform';
    }
    
    // Map platform to appropriate preset
    const platformPresets = {
      'netlify': 'professional',
      'vercel': 'professional', 
      'github': 'starter',
      'aws': 'enterprise',
      'gitlab': 'starter'
    };
    
    return platformPresets[platform] || 'starter';
  }

  /**
   * Generate deployment files based on deployment configuration
   */
  async generateDeploymentFiles(deployment) {
    const results = {
      filesCreated: [],
      secretsRequired: [],
      variablesConfigured: {},
      instructions: []
    };

    // Get preset configuration
    const preset = this.templates.presets[deployment.preset];
    if (!preset) {
      throw new Error(`Unknown preset: ${deployment.preset}`);
    }

    console.log(chalk.cyan(`🎯 Using preset: ${preset.name}`));
    console.log(chalk.gray(`   ${preset.description}`));

    // Process each template in the preset
    for (const templatePath of preset.includes) {
      const template = this.getTemplate(templatePath);
      if (!template) {
        console.warn(chalk.yellow(`⚠️  Template not found: ${templatePath}`));
        continue;
      }

      // Generate file
      const filePath = template.path;
      const content = await this.processTemplate(template, deployment);

      if (!this.dryRun) {
        await this.writeTemplateFile(filePath, content);
      }

      results.filesCreated.push({
        path: filePath,
        name: template.name,
        description: template.description
      });

      // Collect secrets and variables
      if (template.secrets) {
        results.secretsRequired.push(...template.secrets);
      }
      if (template.variables) {
        Object.assign(results.variablesConfigured, template.variables);
      }
    }

    // Remove duplicate secrets
    results.secretsRequired = [...new Set(results.secretsRequired)];

    // Generate setup instructions
    results.instructions = this.generateSetupInstructions(deployment, results);

    return results;
  }

  /**
   * Get template by path (e.g., "github_actions.netlify")
   */
  getTemplate(templatePath) {
    const parts = templatePath.split('.');
    let template = this.templates.templates;

    for (const part of parts) {
      if (template[part]) {
        template = template[part];
      } else {
        return null;
      }
    }

    return template;
  }

  /**
   * Process template with variable substitution
   */
  async processTemplate(template, deployment) {
    let content = template.content;
    
    // Replace variables with values
    if (template.variables) {
      Object.entries(template.variables).forEach(([key, value]) => {
        const placeholder = `{{ ${key} }}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    // Platform-specific processing
    content = await this.applyPlatformCustomizations(content, deployment);

    return content;
  }

  /**
   * Apply platform-specific customizations
   */
  async applyPlatformCustomizations(content, deployment) {
    // Check if Hugo config exists to customize build command
    const hugoConfigExists = await this.checkHugoConfig();
    if (hugoConfigExists) {
      // Add submodule handling if themes directory exists
      const themesExist = await fs.pathExists('themes');
      if (themesExist) {
        content = content.replace(
          'submodules: true',
          'submodules: recursive'
        );
      }
    }

    return content;
  }

  /**
   * Write template file to filesystem
   */
  async writeTemplateFile(filePath, content) {
    const fullPath = path.resolve(filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
    
    console.log(chalk.green(`   ✓ Created: ${filePath}`));
  }

  /**
   * Generate setup instructions
   */
  generateSetupInstructions(deployment, results) {
    const instructions = [];

    // Repository secrets setup
    if (results.secretsRequired.length > 0) {
      instructions.push({
        step: 'Configure Repository Secrets',
        details: `Add these secrets to your GitHub/GitLab repository settings:`,
        items: results.secretsRequired.map(secret => `${secret}: [Your ${secret} value]`)
      });
    }

    // Platform-specific instructions
    if (deployment.platform === 'netlify') {
      instructions.push({
        step: 'Netlify Setup', 
        details: 'Complete Netlify configuration:',
        items: [
          'Create a new site in Netlify dashboard',
          'Copy Site ID from Site settings → General → Site details',
          'Generate Personal Access Token from User settings → Applications',
          'Add NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID as repository secrets'
        ]
      });
    }

    if (deployment.platform === 'vercel') {
      instructions.push({
        step: 'Vercel Setup',
        details: 'Complete Vercel configuration:',
        items: [
          'Install Vercel CLI: npm i -g vercel',
          'Run "vercel" in your project directory',
          'Copy Team ID and Project ID from project settings',
          'Generate token from Account Settings → Tokens',
          'Add VERCEL_TOKEN, ORG_ID, PROJECT_ID as repository secrets'
        ]
      });
    }

    // Build setup
    instructions.push({
      step: 'Verify Build',
      details: 'Test your deployment locally:',
      items: [
        'Run: hugo --minify',
        'Check that public/ directory is generated',
        'Verify all assets and pages work correctly'
      ]
    });

    return instructions;
  }

  /**
   * Check if Hugo config exists
   */
  async checkHugoConfig() {
    const configFiles = ['hugo.toml', 'hugo.yaml', 'hugo.yml', 'config.toml', 'config.yaml', 'config.yml'];
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * List available deployment options
   */
  getAvailableDeployments() {
    const deployments = [];
    
    Object.entries(this.templates.presets).forEach(([key, preset]) => {
      deployments.push({
        key,
        name: preset.name,
        description: preset.description,
        includes: preset.includes
      });
    });

    return deployments;
  }

  /**
   * Generate deployment report
   */
  generateDeploymentReport(results) {
    let report = chalk.blue.bold('\n🚀 Deployment Configuration Complete\n');
    report += '='.repeat(50) + '\n\n';
    
    // Files created
    if (results.filesCreated.length > 0) {
      report += chalk.cyan('📁 Files Created:\n');
      results.filesCreated.forEach(file => {
        report += `   ✓ ${file.path} - ${file.description}\n`;
      });
      report += '\n';
    }
    
    // Secrets required
    if (results.secretsRequired.length > 0) {
      report += chalk.yellow('🔐 Repository Secrets Required:\n');
      results.secretsRequired.forEach(secret => {
        report += `   • ${secret}\n`;
      });
      report += '\n';
    }
    
    // Setup instructions
    if (results.instructions.length > 0) {
      report += chalk.cyan('📋 Setup Instructions:\n\n');
      results.instructions.forEach((instruction, index) => {
        report += chalk.white(`${index + 1}. ${instruction.step}\n`);
        report += chalk.gray(`   ${instruction.details}\n`);
        if (instruction.items) {
          instruction.items.forEach(item => {
            report += chalk.gray(`   • ${item}\n`);
          });
        }
        report += '\n';
      });
    }
    
    return report;
  }

  /**
   * Deploy preset by name
   */
  async deployPreset(presetName, options = {}) {
    const preset = this.templates.presets[presetName];
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }

    // Determine platform from preset
    const platform = this.detectPlatformFromPreset(preset);
    
    const deployment = {
      platform,
      ci_platform: options.ci_platform || 'github_actions',
      preset: presetName
    };

    return await this.generateDeploymentFiles(deployment);
  }

  /**
   * Detect platform from preset includes
   */
  detectPlatformFromPreset(preset) {
    const includes = preset.includes.join(' ');
    
    if (includes.includes('netlify')) return 'netlify';
    if (includes.includes('vercel')) return 'vercel';
    if (includes.includes('github_pages')) return 'github';
    if (includes.includes('aws')) return 'aws';
    if (includes.includes('gitlab')) return 'gitlab';
    
    return 'github';
  }
}

module.exports = CICDEngine;