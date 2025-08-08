#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');

const HugoContextManager = require('./src/context-manager');
const HugoExpertise = require('./src/hugo-expertise');
const ClaudeSimulator = require('./src/claude-simulator');

const program = new Command();

program
  .name('godoc')
  .description('GOdoc - Conversational Documentation Generator')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new Hugo site')
  .argument('[directory]', 'Directory name to create (optional)')
  .option('-d, --describe <description>', 'Describe your site')
  .option('-t, --theme <name>', 'Use specific Hugo theme (e.g., docsy, academic, ananke)')
  .action(async (directory, options) => {
    // Handle directory creation if specified
    if (directory) {
      const fs = require('fs-extra');
      const path = require('path');
      
      const targetDirectory = path.resolve(directory);
      if (!fs.existsSync(targetDirectory)) {
        console.log(`📁 Creating directory: ${directory}`);
        await fs.ensureDir(targetDirectory);
      }
      
      // Change to target directory
      process.chdir(targetDirectory);
      console.log(`📂 Working in: ${directory}/`);
    }
    
    const InitCommand = require('./src/commands/init');
    const initCmd = new InitCommand();
    await initCmd.execute(options);
  });

program
  .command('generate')
  .description('Generate content conversationally')
  .option('-c, --content <request>', 'Content request in natural language')
  .option('-t, --type <type>', 'Content type (page, post, doc)')
  .action(async (options) => {
    const GenerateCommand = require('./src/commands/generate');
    const generateCmd = new GenerateCommand();
    await generateCmd.execute(options);
  });

program
  .command('analyze')
  .description('Analyze existing Hugo site')
  .option('-p, --path <path>', 'Path to Hugo site (default: current directory)')
  .option('--performance', 'Include performance analysis')
  .option('--seo', 'Include SEO analysis')
  .option('--accessibility', 'Include accessibility checks')
  .action(async (options) => {
    const AnalyzeCommand = require('./src/commands/analyze');
    const analyzeCmd = new AnalyzeCommand();
    await analyzeCmd.execute(options);
  });

program
  .command('refactor')
  .description('Refactor and modernize Hugo sites')
  .option('-p, --path <path>', 'Path to Hugo site')
  .option('--modernize', 'Modernize theme and structure')
  .option('--preserve-urls', 'Maintain existing URL structure')
  .option('--add-search', 'Add search functionality')
  .action(async (options) => {
    const RefactorCommand = require('./src/commands/refactor');
    const refactorCmd = new RefactorCommand();
    await refactorCmd.execute(options);
  });

program
  .command('preview')
  .description('Start live preview server')
  .option('-p, --path <path>', 'Path to Hugo site (default: current directory)')
  .option('--port <port>', 'Server port (default: 1313)', '1313')
  .action(async (options) => {
    const PreviewCommand = require('./src/commands/preview');
    const previewCmd = new PreviewCommand();
    await previewCmd.execute(options);
  });

program
  .command('github')
  .description('Create and configure GitHub repository')
  .option('-n, --name <name>', 'Repository name')
  .option('-d, --description <description>', 'Repository description')
  .option('--private', 'Create private repository')
  .option('--no-cicd', 'Skip CI/CD setup')
  .option('--deployment <platform>', 'Deployment platform (netlify, vercel, github-pages)')
  .action(async (options) => {
    const GitHubCommand = require('./src/commands/github');
    const githubCmd = new GitHubCommand();
    await githubCmd.execute(options);
  });

program
  .command('plan')
  .description('Generate documentation roadmaps from specifications')
  .argument('<spec-file>', 'Path to specification file')
  .option('-t, --title <title>', 'Custom title for the roadmap')
  .option('-o, --output <path>', 'Custom output path for roadmap file')
  .option('-v, --verbose', 'Show detailed task breakdown')
  .option('--clipboard', 'Copy roadmap summary to clipboard format')
  .option('--github', 'Show GitHub integration instructions')
  .action(async (specFile, options) => {
    const PlanCommand = require('./src/commands/plan');
    const planCmd = new PlanCommand();
    await planCmd.execute(specFile, options);
  });

program
  .command('git')
  .description('Natural language git operations')
  .argument('<command>', 'Natural language git command')
  .action(async (naturalCommand) => {
    const GitCommand = require('./src/commands/git');
    const gitCmd = new GitCommand();
    await gitCmd.execute(naturalCommand);
  });

program.parse(process.argv);