#!/usr/bin/env node

const chalk = require('chalk');
const inquirer = require('inquirer');
const { execSync } = require('child_process');

/**
 * Natural Language Git Operations - MVP
 * 
 * Transforms natural language into git commands
 * Examples:
 *   "commit my work" → git add . && git commit -m "..."
 *   "create branch for auth" → git checkout -b feature/auth
 *   "push changes" → git push origin [current-branch]
 */
class GitCommand {
  constructor() {
    this.patterns = {
      // Commit operations
      commit: {
        patterns: [
          /commit.*work/i,
          /commit.*changes/i,
          /commit.*this/i,
          /save.*work/i,
          /save.*changes/i
        ],
        action: 'commit'
      },
      
      // Branch operations  
      createBranch: {
        patterns: [
          /create.*branch.*for\s+(.+)/i,
          /new.*branch.*for\s+(.+)/i,
          /branch.*for\s+(.+)/i,
          /start.*working.*on\s+(.+)/i
        ],
        action: 'createBranch'
      },
      
      // Push operations
      push: {
        patterns: [
          /push.*changes/i,
          /push.*work/i,
          /push.*this/i,
          /upload.*changes/i,
          /sync.*changes/i
        ],
        action: 'push'
      },
      
      // Pull operations
      pull: {
        patterns: [
          /pull.*changes/i,
          /get.*latest/i,
          /sync.*from.*remote/i,
          /update.*from.*main/i
        ],
        action: 'pull'
      },
      
      // Status operations
      status: {
        patterns: [
          /what.*changed/i,
          /show.*status/i,
          /check.*status/i,
          /git.*status/i
        ],
        action: 'status'
      },
      
      // Merge operations
      merge: {
        patterns: [
          /merge.*branch/i,
          /merge.*(.+).*into.*(.+)/i,
          /combine.*branches/i
        ],
        action: 'merge'
      }
    };
  }

  /**
   * Execute natural language git command
   * @param {string} naturalCommand - Natural language description
   */
  async execute(naturalCommand) {
    try {
      console.log(chalk.blue.bold('🗣️  NATURAL LANGUAGE GIT'));
      console.log(chalk.blue(`Processing: "${naturalCommand}"`));
      console.log();

      // Parse the natural language command
      const parsedCommand = this.parseCommand(naturalCommand);
      
      if (!parsedCommand) {
        console.log(chalk.yellow('❓ I don\'t understand that command. Try:'));
        this.showExamples();
        return;
      }

      // Generate git commands
      const gitCommands = await this.generateGitCommands(parsedCommand, naturalCommand);
      
      if (!gitCommands || gitCommands.length === 0) {
        console.log(chalk.red('❌ Could not generate git commands'));
        return;
      }

      // Show what will be executed
      console.log(chalk.cyan.bold('📋 Generated Git Commands:'));
      gitCommands.forEach((cmd, index) => {
        console.log(chalk.cyan(`${index + 1}. ${cmd}`));
      });
      console.log();

      // Confirm execution
      const { proceed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'proceed',
        message: 'Execute these git commands?',
        default: true
      }]);

      if (!proceed) {
        console.log(chalk.yellow('⏸️  Cancelled'));
        return;
      }

      // Execute commands
      console.log(chalk.green.bold('🚀 Executing...'));
      console.log();
      
      for (const command of gitCommands) {
        try {
          console.log(chalk.gray(`Running: ${command}`));
          const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
          if (output.trim()) {
            console.log(output.trim());
          }
        } catch (error) {
          console.error(chalk.red(`❌ Error: ${error.message}`));
          break;
        }
      }

      console.log(chalk.green.bold('\n✅ Git operations completed!'));

    } catch (error) {
      console.error(chalk.red.bold('❌ Git command failed:'), error.message);
    }
  }

  /**
   * Parse natural language into structured command
   * @param {string} naturalCommand 
   * @returns {Object|null} Parsed command object
   */
  parseCommand(naturalCommand) {
    for (const [operationType, config] of Object.entries(this.patterns)) {
      for (const pattern of config.patterns) {
        const match = naturalCommand.match(pattern);
        if (match) {
          return {
            type: config.action,
            originalCommand: naturalCommand,
            matches: match,
            parameters: match.length > 1 ? match.slice(1) : []
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Generate git commands from parsed natural language
   * @param {Object} parsedCommand 
   * @param {string} originalCommand 
   * @returns {Array} Array of git commands to execute
   */
  async generateGitCommands(parsedCommand, originalCommand) {
    switch (parsedCommand.type) {
      case 'commit':
        return this.generateCommitCommands(originalCommand);
        
      case 'createBranch':
        return this.generateBranchCommands(parsedCommand.parameters[0]);
        
      case 'push':
        return this.generatePushCommands();
        
      case 'pull':
        return this.generatePullCommands();
        
      case 'status':
        return ['git status'];
        
      case 'merge':
        return this.generateMergeCommands(parsedCommand.parameters);
        
      default:
        return null;
    }
  }

  /**
   * Generate commit commands
   */
  generateCommitCommands(originalCommand) {
    // Extract meaningful commit message from natural language
    let commitMessage = originalCommand
      .replace(/commit\s*/i, '')
      .replace(/my\s*/i, '')
      .replace(/this\s*/i, '')
      .replace(/work\s*/i, 'work')
      .replace(/changes\s*/i, 'changes')
      .trim();
    
    if (!commitMessage || commitMessage.length < 3) {
      commitMessage = 'Update files';
    }
    
    // Capitalize first letter
    commitMessage = commitMessage.charAt(0).toUpperCase() + commitMessage.slice(1);
    
    return [
      'git add .',
      `git commit -m "${commitMessage}"`
    ];
  }

  /**
   * Generate branch creation commands
   */
  generateBranchCommands(branchDescription) {
    if (!branchDescription) {
      return ['git checkout -b feature/new-feature'];
    }
    
    // Convert description to branch name
    const branchName = 'feature/' + branchDescription
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 50);
    
    return [`git checkout -b ${branchName}`];
  }

  /**
   * Generate push commands
   */
  generatePushCommands() {
    try {
      // Get current branch name
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      return [`git push origin ${currentBranch}`];
    } catch (error) {
      return ['git push origin main'];
    }
  }

  /**
   * Generate pull commands
   */
  generatePullCommands() {
    try {
      // Get current branch name
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      return [`git pull origin ${currentBranch}`];
    } catch (error) {
      return ['git pull origin main'];
    }
  }

  /**
   * Generate merge commands
   */
  generateMergeCommands(parameters) {
    if (parameters && parameters.length >= 2) {
      const [sourceBranch, targetBranch] = parameters;
      return [
        `git checkout ${targetBranch}`,
        `git merge ${sourceBranch}`
      ];
    }
    
    // Default: merge current branch to main
    return [
      'git checkout main',
      'git merge -'
    ];
  }

  /**
   * Show example commands
   */
  showExamples() {
    const examples = [
      '"commit my work" - Commits all changes',
      '"create branch for user authentication" - Creates feature/user-authentication branch',
      '"push changes" - Pushes to current branch',
      '"pull latest" - Pulls from current branch',
      '"show status" - Shows git status'
    ];
    
    console.log(chalk.yellow.bold('\n💡 Try these examples:'));
    examples.forEach(example => {
      console.log(chalk.yellow(`  godoc git ${example}`));
    });
  }

  /**
   * Get help text
   */
  static getHelp() {
    return `
${chalk.bold('godoc git')} - Natural Language Git Operations

${chalk.bold('USAGE:')}
  godoc git "<natural language command>"

${chalk.bold('EXAMPLES:')}
  godoc git "commit my work"
  godoc git "create branch for user authentication" 
  godoc git "push changes"
  godoc git "pull latest"
  godoc git "show status"
  godoc git "merge feature branch into main"

${chalk.bold('SUPPORTED OPERATIONS:')}
  • Commit: "commit work", "save changes", "commit this"
  • Branch: "create branch for [feature]", "new branch for [feature]"
  • Push: "push changes", "upload work", "sync changes"
  • Pull: "pull changes", "get latest", "sync from remote"
  • Status: "show status", "what changed", "check status"
  • Merge: "merge branch", "combine branches"

${chalk.bold('SAFETY:')}
  • Always shows generated git commands before execution
  • Requires confirmation before running
  • Safe defaults for ambiguous commands
`;
  }
}

module.exports = GitCommand;