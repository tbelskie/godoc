const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class AdvancedContextManager {
  constructor() {
    this.contextDir = '.godoc';
    this.contextFile = path.join(this.contextDir, 'context.json');
    this.sessionHistoryFile = path.join(this.contextDir, 'session-history.jsonl');
    this.workflowStateFile = path.join(this.contextDir, 'workflow-state.json');
    this.backupDir = path.join(this.contextDir, 'backups');
    this.currentSessionId = this.generateSessionId();
  }

  generateSessionId() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `godoc-session-${timestamp}`;
  }

  async init() {
    // Ensure all directories exist
    await fs.ensureDir(this.contextDir);
    await fs.ensureDir(this.backupDir);
    
    // Initialize files if they don't exist
    if (!await fs.pathExists(this.contextFile)) {
      await this.saveContextSafely(this.getDefaultContext());
    }
    
    if (!await fs.pathExists(this.workflowStateFile)) {
      await this.saveWorkflowState(this.getDefaultWorkflowState());
    }

    // Check for interrupted sessions
    await this.checkSessionContinuity();
  }

  async checkSessionContinuity() {
    try {
      const workflowState = await this.loadWorkflowState();
      
      if (workflowState.activeSession) {
        const timeSinceLastActivity = Date.now() - new Date(workflowState.activeSession.lastActivity);
        const isStaleSession = timeSinceLastActivity > 30 * 60 * 1000; // 30 minutes
        
        if (isStaleSession && workflowState.currentWorkflow) {
          console.log(chalk.yellow('🔄 Detected interrupted session from ' + this.formatTimeAgo(timeSinceLastActivity)));
          
          if (workflowState.currentWorkflow.context?.lastCommand) {
            console.log(chalk.cyan(`Last command: ${workflowState.currentWorkflow.context.lastCommand}`));
          }
          
          if (workflowState.currentWorkflow.nextActions?.length > 0) {
            console.log(chalk.cyan('Suggested next actions:'));
            workflowState.currentWorkflow.nextActions.forEach(action => {
              console.log(chalk.cyan(`  - ${action}`));
            });
          }
          
          // Start new session but preserve context
          await this.startNewSession();
        }
      } else {
        // No active session, start fresh
        await this.startNewSession();
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not check session continuity, starting fresh'));
      await this.startNewSession();
    }
  }

  async startNewSession() {
    const workflowState = {
      ...this.getDefaultWorkflowState(),
      activeSession: {
        sessionId: this.currentSessionId,
        startTime: new Date().toISOString(),
        commandCount: 0,
        lastActivity: new Date().toISOString()
      }
    };
    
    await this.saveWorkflowState(workflowState);
  }

  formatTimeAgo(milliseconds) {
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  }

  getDefaultContext() {
    return {
      project: {
        name: path.basename(process.cwd()),
        type: 'documentation',
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: 'active'
      },
      architecture: {
        theme: null,
        contentTypes: [],
        features: [],
        colors: {}
      },
      content: {
        pages: [],
        generatedFiles: {},
        lastContentUpdate: null
      },
      interactions: {
        totalCommands: 0,
        totalSessions: 1,
        commonPatterns: [],
        userPreferences: {
          verboseOutput: true,
          autoCommit: false
        }
      }
    };
  }

  getDefaultWorkflowState() {
    return {
      currentWorkflow: null,
      activeSession: null
    };
  }

  async loadContext() {
    try {
      const context = await fs.readJSON(this.contextFile);
      return context;
    } catch (error) {
      console.log(chalk.yellow('⚠️  Context file corrupted or missing, creating new one'));
      return this.getDefaultContext();
    }
  }

  async loadWorkflowState() {
    try {
      return await fs.readJSON(this.workflowStateFile);
    } catch (error) {
      return this.getDefaultWorkflowState();
    }
  }

  async saveContextSafely(context) {
    const tempFile = `${this.contextFile}.tmp`;
    const timestamp = Date.now();
    const backupFile = path.join(this.backupDir, `context-backup-${timestamp}.json`);
    
    try {
      // Update timestamp
      context.project.lastUpdated = new Date().toISOString();
      
      // Write to temp file first
      await fs.writeJSON(tempFile, context, { spaces: 2 });
      
      // Create backup of existing context
      if (await fs.pathExists(this.contextFile)) {
        await fs.copy(this.contextFile, backupFile);
      }
      
      // Atomic move to final location - use overwrite option
      await fs.move(tempFile, this.contextFile, { overwrite: true });
      
      // Clean up old backups (keep last 10)
      await this.cleanupBackups();
      
    } catch (error) {
      console.error('Context save error:', error.message);
      // Cleanup temp file if it exists
      if (await fs.pathExists(tempFile)) {
        await fs.remove(tempFile);
      }
      
      // Fallback: simple write without atomic operation
      console.log('Attempting fallback context save...');
      try {
        await fs.writeJSON(this.contextFile, context, { spaces: 2 });
        console.log('Fallback save successful');
      } catch (fallbackError) {
        console.error('Fallback save failed:', fallbackError.message);
        throw error; // throw original error
      }
    }
  }

  async saveWorkflowState(workflowState) {
    await fs.writeJSON(this.workflowStateFile, workflowState, { spaces: 2 });
  }

  async logCommand(command, args = [], status = 'started', metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.currentSessionId,
      command,
      args,
      status,
      duration: metadata.duration,
      error: metadata.error
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      // Append-only log for durability
      await fs.appendFile(this.sessionHistoryFile, logLine);
      
      // Update workflow state
      await this.updateWorkflowState(command, args, status, metadata);
      
      // Update interaction count in context
      await this.incrementInteractionCount();
      
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not log command, continuing...'));
    }
  }

  async updateWorkflowState(command, args, status, metadata = {}) {
    try {
      const workflowState = await this.loadWorkflowState();
      
      if (workflowState.activeSession) {
        workflowState.activeSession.commandCount++;
        workflowState.activeSession.lastActivity = new Date().toISOString();
      }
      
      if (status === 'started' || status === 'in_progress') {
        workflowState.currentWorkflow = {
          type: this.determineWorkflowType(command, args),
          step: `${command}-${args.join('-')}`,
          status: status,
          context: {
            lastCommand: `${command} ${args.join(' ')}`,
            startTime: new Date().toISOString(),
            workingDirectory: process.cwd()
          }
        };
      } else if (status === 'completed') {
        if (workflowState.currentWorkflow) {
          workflowState.currentWorkflow.status = 'completed';
          workflowState.currentWorkflow.context.completedTime = new Date().toISOString();
          
          // Clear current workflow after completion
          setTimeout(async () => {
            workflowState.currentWorkflow = null;
            await this.saveWorkflowState(workflowState);
          }, 1000);
        }
      }
      
      await this.saveWorkflowState(workflowState);
    } catch (error) {
      // Non-critical error, continue execution
    }
  }

  determineWorkflowType(command, args) {
    switch (command) {
      case 'init': return 'site-initialization';
      case 'generate': return 'content-generation';
      case 'analyze': return 'site-analysis';
      case 'github': return 'deployment-setup';
      case 'preview': return 'development';
      case 'refactor': return 'site-modernization';
      default: return 'general';
    }
  }

  async incrementInteractionCount() {
    try {
      const context = await this.loadContext();
      context.interactions.totalCommands++;
      await this.saveContextSafely(context);
    } catch (error) {
      // Non-critical error
    }
  }

  async cleanupBackups() {
    try {
      const backupFiles = await fs.readdir(this.backupDir);
      const contextBackups = backupFiles
        .filter(file => file.startsWith('context-backup-'))
        .sort()
        .reverse(); // Most recent first
      
      // Keep only the 10 most recent backups
      if (contextBackups.length > 10) {
        const filesToDelete = contextBackups.slice(10);
        for (const file of filesToDelete) {
          await fs.remove(path.join(this.backupDir, file));
        }
      }
    } catch (error) {
      // Non-critical error, continue
    }
  }

  async getRecentCommandHistory(limit = 10) {
    try {
      if (!await fs.pathExists(this.sessionHistoryFile)) {
        return [];
      }
      
      const content = await fs.readFile(this.sessionHistoryFile, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      const recentLines = lines.slice(-limit);
      
      return recentLines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  // Backward compatibility - keep the old method names
  async saveContext(context) {
    return this.saveContextSafely(context);
  }
}

module.exports = AdvancedContextManager;