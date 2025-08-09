#!/usr/bin/env node

/**
 * GOdoc Natural Language Interface
 * 
 * Pure conversational interface - no command memorization required
 * Usage: godoc "build me a fintech API documentation site"
 */

const { Command } = require('commander');
const chalk = require('chalk');
const NLPRouter = require('./src/nlp-router');

const program = new Command();
const nlpRouter = new NLPRouter();

program
  .name('godoc')
  .description('GOdoc - The World\'s Smartest AI Documentation Platform')
  .version('0.1.0')
  .argument('[request]', 'What would you like GOdoc to do? (natural language)')
  .action(async (request) => {
    
    // If no request provided, show interactive help
    if (!request) {
      return showInteractiveHelp();
    }

    console.log(chalk.blue.bold('\n🤖 GOdoc AI DocOps Engineer\n'));
    console.log(chalk.gray(`Understanding: "${request}"`));
    
    // Route natural language to command
    const routing = nlpRouter.route(request);
    
    console.log(chalk.cyan(`→ Detected action: ${routing.action} (${Math.round(routing.confidence * 100)}% confidence)`));
    if (routing.matchedPattern) {
      console.log(chalk.gray(`→ Pattern: ${routing.matchedPattern}`));
    }
    
    // Execute the appropriate command
    try {
      await executeCommand(routing);
    } catch (error) {
      console.error(chalk.red('\n❌ Error executing command:'), error.message);
      console.log(chalk.yellow('\n💡 Try rephrasing your request or ask for help:'));
      console.log(chalk.gray('   godoc "help me build documentation"'));
      process.exit(1);
    }
  });

/**
 * Execute the routed command
 */
async function executeCommand(routing) {
  const { action, parameters } = routing;
  
  switch (action) {
    case 'init':
      return await executeInit(parameters);
      
    case 'diagnose':
      return await executeDiagnose(parameters);
      
    case 'review':
      return await executeReview(parameters);
      
    case 'style':
      return await executeStyleMutation(routing.originalInput);
      
    case 'deploy':
      return await executeDeploy(parameters);
      
    case 'generate':
      return await executeGenerate(parameters);
      
    case 'preview':
      return await executePreview(parameters);
      
    case 'analyze':
      return await executeAnalyze(parameters);
      
    case 'git':
      return await executeGit(parameters);
      
    case 'help':
      return showHelp(parameters.suggestion);
      
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Execute site initialization
 */
async function executeInit(params) {
  console.log(chalk.green('\n✨ Creating your documentation site...\n'));
  
  const description = params.description || params.fullMatch;
  if (!description) {
    throw new Error('Could not determine what type of site to create');
  }
  
  // Use existing init command
  const InitCommand = require('./src/commands/init');
  const initCmd = new InitCommand();
  
  // Auto-generate directory name from description if not specified
  let targetDir = null;
  if (description.includes('fintech')) {
    targetDir = 'fintech-docs';
  } else if (description.includes('api')) {
    targetDir = 'api-docs';
  } else if (description.includes('blog')) {
    targetDir = 'blog-site';
  } else {
    targetDir = 'documentation-site';
  }
  
  // Create directory if it doesn't exist
  const fs = require('fs-extra');
  const path = require('path');
  const targetPath = path.resolve(targetDir);
  
  if (!await fs.pathExists(targetPath)) {
    console.log(chalk.blue(`📁 Creating directory: ${targetDir}`));
    await fs.ensureDir(targetPath);
    process.chdir(targetPath);
    console.log(chalk.blue(`📂 Working in: ${targetDir}/`));
  }
  
  await initCmd.execute({ describe: description });
}

/**
 * Execute build diagnostics
 */
async function executeDiagnose(params) {
  console.log(chalk.yellow('\n🔍 Diagnosing your documentation build...\n'));
  
  // Future: Use diagnostics engine
  console.log(chalk.yellow('🚧 Diagnostics engine coming soon!'));
  console.log(chalk.gray('   Will automatically detect and fix common build issues'));
  console.log(chalk.gray('   Including Hugo errors, broken links, config problems, etc.'));
}

/**
 * Execute quality review
 */
async function executeReview(params) {
  console.log(chalk.cyan('\n📋 Reviewing your documentation quality...\n'));
  
  // Check if this is a style mutation request
  if (params.elements) {
    return await executeStyleMutation(`make all ${params.elements} italic`);
  }
  
  // Use style engine for automated fixes
  const StyleEngine = require('./src/style-engine');
  const styleEngine = new StyleEngine();
  
  try {
    await styleEngine.initialize();
    const results = await styleEngine.runAutofix({ dryRun: false });
    
    console.log(chalk.green(`\n✅ Style fixes complete!`));
    console.log(chalk.gray(`   Files processed: ${results.filesProcessed}`));
    console.log(chalk.gray(`   Changes applied: ${results.changesApplied}`));
    
    if (Object.keys(results.ruleResults).length > 0) {
      console.log(chalk.cyan('\n📊 Rules applied:'));
      Object.entries(results.ruleResults).forEach(([ruleId, count]) => {
        console.log(chalk.gray(`   • ${ruleId}: ${count} fixes`));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Error during style review:', error.message));
  }
}

/**
 * Execute style mutations (new function)
 */
async function executeStyleMutation(request) {
  console.log(chalk.magenta(`\n🎨 Applying style changes...\n`));
  
  const StyleEngine = require('./src/style-engine');
  const styleEngine = new StyleEngine();
  
  try {
    await styleEngine.initialize();
    const results = await styleEngine.processMutation(request);
    
    console.log(chalk.green(`\n✅ Style mutation complete!`));
    console.log(chalk.gray(`   Files processed: ${results.filesProcessed}`));
    console.log(chalk.gray(`   Changes applied: ${results.changesApplied}`));
    
    if (results.errors.length > 0) {
      console.log(chalk.yellow(`\n⚠️  ${results.errors.length} errors encountered:`));
      results.errors.forEach(error => {
        console.log(chalk.red(`   • ${error.file}: ${error.error}`));
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Error applying style mutation:', error.message));
  }
}

/**
 * Execute deployment
 */
async function executeDeploy(params) {
  const platform = params.platform || 'netlify';
  console.log(chalk.green(`\n🚀 Deploying to ${platform}...\n`));
  
  // Use existing github command as base
  const GitHubCommand = require('./src/commands/github');
  const githubCmd = new GitHubCommand();
  
  await githubCmd.execute({ deployment: platform });
}

/**
 * Execute content generation
 */
async function executeGenerate(params) {
  const content = params.content || params.fullMatch;
  console.log(chalk.green(`\n📝 Generating: ${content}...\n`));
  
  // Use existing generate command
  const GenerateCommand = require('./src/commands/generate');
  const generateCmd = new GenerateCommand();
  
  await generateCmd.execute({ content });
}

/**
 * Execute preview server
 */
async function executePreview(params) {
  console.log(chalk.blue('\n👀 Starting preview server...\n'));
  
  // Use existing preview command
  const PreviewCommand = require('./src/commands/preview');
  const previewCmd = new PreviewCommand();
  
  await previewCmd.execute({});
}

/**
 * Execute site analysis
 */
async function executeAnalyze(params) {
  const aspect = params.aspect || 'performance';
  console.log(chalk.cyan(`\n📊 Analyzing ${aspect}...\n`));
  
  // Use existing analyze command
  const AnalyzeCommand = require('./src/commands/analyze');
  const analyzeCmd = new AnalyzeCommand();
  
  await analyzeCmd.execute({ [aspect]: true });
}

/**
 * Execute git operations
 */
async function executeGit(params) {
  console.log(chalk.blue('\n🔄 Git operation...\n'));
  
  // Use existing git command
  const GitCommand = require('./src/commands/git');
  const gitCmd = new GitCommand();
  
  const message = params.message || params.name || 'GOdoc changes';
  await gitCmd.execute(message);
}

/**
 * Show interactive help
 */
async function showInteractiveHelp() {
  const inquirer = require('inquirer');
  
  console.log(chalk.blue.bold('\n🤖 GOdoc AI DocOps Engineer\n'));
  console.log(chalk.white('Just tell me what you want to do - no commands to memorize!\n'));
  
  const { request } = await inquirer.prompt([
    {
      type: 'input',
      name: 'request',
      message: 'What would you like to do?',
      default: 'build me a documentation site'
    }
  ]);
  
  // Re-run with the provided request
  process.argv.push(request);
  return program.parse();
}

/**
 * Show help with suggestions
 */
function showHelp(suggestions = []) {
  const help = nlpRouter.getHelp();
  
  console.log(chalk.red('\n❓ I didn\'t understand that request\n'));
  
  if (suggestions.length > 0) {
    console.log(chalk.yellow('💡 Did you mean:\n'));
    suggestions.forEach(suggestion => {
      console.log(chalk.gray(`   ${suggestion}`));
    });
    console.log();
  }
  
  console.log(chalk.blue.bold(help.title));
  console.log(chalk.white(help.description + '\n'));
  
  Object.entries(help.examples).forEach(([category, examples]) => {
    console.log(chalk.cyan(`${category}:`));
    examples.forEach(example => {
      console.log(chalk.gray(`  "${example}"`));
    });
    console.log();
  });
}

// Parse command line arguments
program.parse(process.argv);