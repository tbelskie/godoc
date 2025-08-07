const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class GitHubCommand {
  constructor() {}

  async execute(options) {
    console.log(chalk.blue.bold('\n📦 Hugo AI - GitHub Repository Setup\n'));
    
    const spinner = ora('Checking GitHub CLI...').start();
    
    try {
      // Check if gh CLI is installed and authenticated
      await this.checkGitHubCLI();
      
      spinner.text = 'Getting repository details...';
      
      // Get repository details
      const repoDetails = await this.getRepositoryDetails(options);
      
      spinner.text = 'Setting up local git repository...';
      
      // Initialize git if not already done
      await this.initializeGit();
      
      spinner.text = 'Creating GitHub repository...';
      
      // Create GitHub repository
      await this.createGitHubRepository(repoDetails);
      
      spinner.text = 'Setting up CI/CD workflows...';
      
      // Add CI/CD workflows if requested
      if (repoDetails.setupCICD) {
        await this.setupCICDWorkflows(repoDetails);
      }
      
      spinner.text = 'Making initial commit...';
      
      // Create initial commit
      await this.createInitialCommit(repoDetails);
      
      spinner.text = 'Pushing to GitHub...';
      
      // Push to GitHub
      await this.pushToGitHub(repoDetails);
      
      spinner.succeed(chalk.green('GitHub repository created successfully!'));
      
      // Display summary
      this.displaySummary(repoDetails);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to create GitHub repository'));
      console.error(chalk.red(error.message));
      
      if (error.message.includes('gh: command not found')) {
        console.log(chalk.yellow('\n💡 To use GitHub integration, install GitHub CLI:'));
        console.log(chalk.cyan('  brew install gh  # macOS'));
        console.log(chalk.cyan('  sudo apt install gh  # Linux'));
        console.log(chalk.cyan('  winget install GitHub.cli  # Windows'));
        console.log(chalk.cyan('  Then run: gh auth login\n'));
      }
      
      process.exit(1);
    }
  }

  async checkGitHubCLI() {
    try {
      execSync('gh --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('gh: command not found - GitHub CLI is not installed');
    }
    
    try {
      execSync('gh auth status', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('GitHub CLI is not authenticated. Run: gh auth login');
    }
  }

  async getRepositoryDetails(options) {
    const currentDir = path.basename(process.cwd());
    
    if (options.name && options.description) {
      return {
        name: options.name,
        description: options.description,
        visibility: options.private ? 'private' : 'public',
        setupCICD: options.cicd !== false,
        deployment: options.deployment || 'netlify'
      };
    }
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '📦 Repository name:',
        default: currentDir,
        validate: input => input.length > 0 || 'Please provide a repository name'
      },
      {
        type: 'input',
        name: 'description',
        message: '📝 Repository description:',
        default: `Hugo documentation site built with Hugo AI`
      },
      {
        type: 'list',
        name: 'visibility',
        message: '👁️  Repository visibility:',
        choices: [
          { name: '🌐 Public (recommended for open source)', value: 'public' },
          { name: '🔒 Private', value: 'private' }
        ],
        default: 'public'
      },
      {
        type: 'list',
        name: 'deployment',
        message: '🚀 Deployment target:',
        choices: [
          { name: '🌐 Netlify', value: 'netlify' },
          { name: '▲ Vercel', value: 'vercel' },
          { name: '📑 GitHub Pages', value: 'github-pages' },
          { name: '☁️ Other', value: 'other' }
        ],
        default: 'netlify'
      },
      {
        type: 'confirm',
        name: 'setupCICD',
        message: '⚙️  Set up automated deployment workflows?',
        default: true
      }
    ]);
    
    return answers;
  }

  async initializeGit() {
    try {
      execSync('git status', { stdio: 'ignore' });
    } catch (error) {
      // Not a git repository, initialize it
      execSync('git init', { stdio: 'ignore' });
      
      // Add .gitignore if it doesn't exist
      const gitignorePath = '.gitignore';
      if (!await fs.pathExists(gitignorePath)) {
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
        await fs.writeFile(gitignorePath, gitignore);
      }
    }
  }

  async createGitHubRepository(repoDetails) {
    const flags = [
      `--${repoDetails.visibility}`,
      `--description "${repoDetails.description}"`,
      '--clone=false'
    ];
    
    try {
      execSync(`gh repo create ${repoDetails.name} ${flags.join(' ')}`, { stdio: 'ignore' });
      
      // Add remote origin
      const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      const remoteUrl = `https://github.com/${username}/${repoDetails.name}.git`;
      
      try {
        execSync(`git remote add origin ${remoteUrl}`, { stdio: 'ignore' });
      } catch (error) {
        // Remote might already exist
        execSync(`git remote set-url origin ${remoteUrl}`, { stdio: 'ignore' });
      }
      
    } catch (error) {
      throw new Error(`Failed to create GitHub repository: ${error.message}`);
    }
  }

  async setupCICDWorkflows(repoDetails) {
    const workflowsDir = '.github/workflows';
    await fs.ensureDir(workflowsDir);
    
    let workflow;
    
    switch (repoDetails.deployment) {
      case 'netlify':
        workflow = this.createNetlifyWorkflow();
        break;
      case 'vercel':
        workflow = this.createVercelWorkflow();
        break;
      case 'github-pages':
        workflow = this.createGitHubPagesWorkflow();
        break;
      default:
        workflow = this.createGenericWorkflow();
    }
    
    await fs.writeFile(path.join(workflowsDir, 'deploy.yml'), workflow);
    
    // Create a README for workflows
    const workflowReadme = `# Deployment Workflows

This directory contains GitHub Actions workflows for automated deployment.

## Available Workflows

- \`deploy.yml\`: Automated deployment to ${repoDetails.deployment}

## Setup Instructions

${this.getSetupInstructions(repoDetails.deployment)}
`;
    
    await fs.writeFile(path.join(workflowsDir, 'README.md'), workflowReadme);
  }

  createNetlifyWorkflow() {
    return `name: Deploy to Netlify

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0
          
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Build Hugo site
        run: hugo --minify
        
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v3.0
        with:
          publish-dir: './public'
          production-branch: main
          github-token: \${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: \${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: \${{ secrets.NETLIFY_SITE_ID }}
`;
  }

  createVercelWorkflow() {
    return `name: Deploy to Vercel

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0
          
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Build Hugo site
        run: hugo --minify
        
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
`;
  }

  createGitHubPagesWorkflow() {
    return `name: Deploy Hugo site to GitHub Pages

on:
  push:
    branches: [main, master]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

defaults:
  run:
    shell: bash

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0
          
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v4
        
      - name: Build with Hugo
        env:
          HUGO_ENVIRONMENT: production
          HUGO_ENV: production
        run: |
          hugo \\
            --minify \\
            --baseURL "\${{ steps.pages.outputs.base_url }}/"
            
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
  }

  createGenericWorkflow() {
    return `name: Build Hugo Site

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          submodules: recursive
          fetch-depth: 0
          
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
          extended: true
          
      - name: Build Hugo site
        run: hugo --minify
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: hugo-site
          path: public/
`;
  }

  getSetupInstructions(deployment) {
    switch (deployment) {
      case 'netlify':
        return `### Netlify Setup

1. Create a Netlify account and connect your GitHub repository
2. Add the following secrets to your GitHub repository:
   - \`NETLIFY_AUTH_TOKEN\`: Your Netlify personal access token
   - \`NETLIFY_SITE_ID\`: Your Netlify site ID

3. Your site will automatically deploy on every push to main/master branch.`;

      case 'vercel':
        return `### Vercel Setup

1. Create a Vercel account and connect your GitHub repository
2. Add the following secrets to your GitHub repository:
   - \`VERCEL_TOKEN\`: Your Vercel access token
   - \`VERCEL_ORG_ID\`: Your Vercel organization ID
   - \`VERCEL_PROJECT_ID\`: Your Vercel project ID

3. Your site will automatically deploy on every push to main/master branch.`;

      case 'github-pages':
        return `### GitHub Pages Setup

1. Go to your repository Settings > Pages
2. Select "GitHub Actions" as the source
3. Your site will be available at: https://[username].github.io/[repository-name]

No additional setup required - the workflow handles everything automatically.`;

      default:
        return `### Custom Deployment

The workflow will build your Hugo site and create build artifacts.
You can extend this workflow to deploy to your preferred hosting provider.`;
    }
  }

  async createInitialCommit(repoDetails) {
    try {
      execSync('git add .', { stdio: 'ignore' });
      
      const commitMessage = `Initial commit: Hugo AI documentation site

🚀 Generated with Hugo AI
📦 Repository: ${repoDetails.name}
🎯 Deployment: ${repoDetails.deployment}
${repoDetails.setupCICD ? '⚙️ CI/CD: Enabled' : ''}

Built with Hugo AI - AI-powered Hugo site generator`;
      
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'ignore' });
    } catch (error) {
      // Might be nothing to commit
      console.log(chalk.yellow('No changes to commit'));
    }
  }

  async pushToGitHub(repoDetails) {
    try {
      // Check if we have a main or master branch
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      const defaultBranch = currentBranch || 'main';
      
      // Set upstream and push
      execSync(`git push -u origin ${defaultBranch}`, { stdio: 'ignore' });
    } catch (error) {
      throw new Error(`Failed to push to GitHub: ${error.message}`);
    }
  }

  displaySummary(repoDetails) {
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    const repoUrl = `https://github.com/${username}/${repoDetails.name}`;
    
    console.log(chalk.cyan('\n📦 GitHub Repository Summary:'));
    console.log(chalk.white('  • Repository:'), chalk.blue(repoUrl));
    console.log(chalk.white('  • Visibility:'), repoDetails.visibility);
    console.log(chalk.white('  • Deployment:'), repoDetails.deployment);
    console.log(chalk.white('  • CI/CD:'), repoDetails.setupCICD ? 'Enabled' : 'Manual');
    
    if (repoDetails.setupCICD) {
      console.log(chalk.cyan('\n⚙️  CI/CD Setup:'));
      console.log(chalk.white('  • Workflow:'), '.github/workflows/deploy.yml');
      console.log(chalk.white('  • Trigger:'), 'Push to main/master branch');
      console.log(chalk.white('  • Setup:'), chalk.yellow('See .github/workflows/README.md for instructions'));
    }
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log(chalk.white('  1. Visit:'), chalk.blue(repoUrl));
    console.log(chalk.white('  2. Configure deployment secrets (if using CI/CD)'));
    console.log(chalk.white('  3. Push changes:'), chalk.yellow('git push origin main'));
    console.log(chalk.white('  4. Share with your team!'));
    
    console.log(chalk.green('\n✨ Your GitHub repository is ready!\\n'));
  }
}

module.exports = GitHubCommand;