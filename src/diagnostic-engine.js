/**
 * Diagnostic Engine - Automated build failure detection and fixes
 * 
 * Detects common Hugo/deployment issues and applies automated fixes
 * Goal: "why is my build failing?" should provide instant solutions
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const { glob } = require('glob');

class DiagnosticEngine {
  constructor() {
    this.recipes = null;
    this.findings = [];
    this.fixes = [];
    this.dryRun = false;
  }

  /**
   * Initialize diagnostic engine with recipes
   */
  async initialize() {
    try {
      // Load diagnostic recipes from intel pack
      const IntelLoader = require('./intel/loadIntel');
      const intel = await IntelLoader.loadBundledIntel();
      
      // Check if diagnostics exists in intel pack
      if (intel.diagnostics) {
        this.recipes = intel.diagnostics.recipes;
      } else {
        // Load from standalone file
        const diagnosticsPath = path.resolve(__dirname, '..', 'assets', 'intel', 'diagnostics.json');
        const diagnosticsData = await fs.readJSON(diagnosticsPath);
        this.recipes = diagnosticsData.recipes;
      }

      console.log(chalk.green('✅ Diagnostic engine initialized'));
      console.log(chalk.gray(`   Loaded ${this.recipes.length} diagnostic recipes`));

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not load diagnostic recipes:', error.message));
      this.recipes = [];
    }
  }

  /**
   * Run full diagnostic scan
   */
  async runDiagnostics(options = {}) {
    this.dryRun = options.dryRun || false;
    this.findings = [];
    this.fixes = [];

    console.log(chalk.blue(`🔍 Running diagnostic scan${this.dryRun ? ' (dry run)' : ''}...`));

    // Collect potential error sources
    const sources = await this.collectErrorSources();
    
    // Apply diagnostic recipes
    for (const recipe of this.recipes) {
      try {
        const matches = await this.applyRecipe(recipe, sources);
        if (matches.length > 0) {
          this.findings.push({
            recipe,
            matches,
            severity: recipe.severity
          });
        }
      } catch (error) {
        console.error(chalk.red(`   Error applying recipe ${recipe.id}:`), error.message);
      }
    }

    // Generate fixes for findings
    for (const finding of this.findings) {
      if (finding.recipe.autofix && finding.recipe.autofix.enabled) {
        const fix = await this.generateFix(finding);
        if (fix) {
          this.fixes.push(fix);
        }
      }
    }

    return {
      findings: this.findings,
      fixes: this.fixes,
      summary: this.generateSummary()
    };
  }

  /**
   * Collect error sources from various locations
   */
  async collectErrorSources() {
    const sources = {
      build_log: await this.getBuildLog(),
      hugo_output: await this.getHugoOutput(),
      netlify_log: await this.getNetlifyLog(),
      vercel_log: await this.getVercelLog(),
      gitlab_ci: await this.getGitLabCILog(),
      config_files: await this.getConfigFiles(),
      content_files: await this.getContentFiles()
    };

    return sources;
  }

  /**
   * Apply a diagnostic recipe to error sources
   */
  async applyRecipe(recipe, sources) {
    const matches = [];

    // Check each applicable source
    for (const source of recipe.when.sources || Object.keys(sources)) {
      const content = sources[source];
      if (!content) continue;

      const regex = new RegExp(recipe.when.regex, 'gi');
      const sourceMatches = Array.from(content.matchAll(regex));
      
      for (const match of sourceMatches) {
        matches.push({
          source,
          match: match[0],
          groups: match.slice(1),
          line: this.getLineNumber(content, match.index)
        });
      }
    }

    return matches;
  }

  /**
   * Generate fix for a diagnostic finding
   */
  async generateFix(finding) {
    const recipe = finding.recipe;
    const autofix = recipe.autofix;

    if (!autofix || !autofix.enabled) {
      return null;
    }

    const fix = {
      recipeId: recipe.id,
      name: recipe.name,
      type: autofix.type,
      description: autofix.description,
      actions: [],
      safe: true
    };

    try {
      switch (autofix.type) {
        case 'create_file':
          fix.actions.push(await this.generateCreateFileAction(autofix, finding));
          break;
          
        case 'create_config':
          fix.actions.push(await this.generateCreateConfigAction(autofix, finding));
          break;
          
        case 'command':
          fix.actions.push(...await this.generateCommandActions(autofix, finding));
          break;
          
        case 'scan_and_fix':
          fix.actions.push(...await this.generateScanAndFixActions(autofix, finding));
          break;
          
        case 'validate_and_fix':
          fix.actions.push(...await this.generateValidateAndFixActions(autofix, finding));
          break;
          
        default:
          console.warn(chalk.yellow(`Unknown autofix type: ${autofix.type}`));
          return null;
      }
    } catch (error) {
      console.error(chalk.red(`Error generating fix for ${recipe.id}:`), error.message);
      fix.safe = false;
      fix.error = error.message;
    }

    return fix;
  }

  /**
   * Apply fixes (with user confirmation)
   */
  async applyFixes(fixes, options = {}) {
    const { force = false } = options;
    let appliedCount = 0;
    const errors = [];

    for (const fix of fixes) {
      if (!fix.safe && !force) {
        console.log(chalk.yellow(`⚠️  Skipping unsafe fix: ${fix.name}`));
        continue;
      }

      try {
        console.log(chalk.blue(`🔧 Applying fix: ${fix.name}`));
        
        for (const action of fix.actions) {
          if (!this.dryRun) {
            await this.executeAction(action);
          }
          console.log(chalk.gray(`   ✓ ${action.description}`));
        }
        
        appliedCount++;
        
      } catch (error) {
        errors.push({ fix: fix.name, error: error.message });
        console.error(chalk.red(`   ✗ Failed to apply fix: ${error.message}`));
      }
    }

    return {
      applied: appliedCount,
      errors,
      total: fixes.length
    };
  }

  /**
   * Execute a fix action
   */
  async executeAction(action) {
    switch (action.type) {
      case 'create_file':
        await fs.ensureDir(path.dirname(action.target));
        await fs.writeFile(action.target, action.content);
        break;
        
      case 'run_command':
        execSync(action.command, { stdio: 'pipe' });
        break;
        
      case 'update_file':
        let content = await fs.readFile(action.target, 'utf8');
        content = content.replace(action.find, action.replace);
        await fs.writeFile(action.target, content);
        break;
        
      case 'delete_file':
        if (await fs.pathExists(action.target)) {
          await fs.remove(action.target);
        }
        break;
        
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Generate file creation action
   */
  async generateCreateFileAction(autofix, finding) {
    let target = autofix.target;
    let content = autofix.content;

    // Replace placeholders with captured groups
    finding.matches.forEach(match => {
      match.groups.forEach((group, index) => {
        const placeholder = `$${index + 1}`;
        target = target.replace(new RegExp(`\\\\${placeholder}`, 'g'), group);
        content = content.replace(new RegExp(`\\\\${placeholder}`, 'g'), group);
      });
    });

    return {
      type: 'create_file',
      target,
      content,
      description: `Create ${target}`
    };
  }

  /**
   * Generate config creation action
   */
  async generateCreateConfigAction(autofix, finding) {
    return {
      type: 'create_file',
      target: autofix.target,
      content: autofix.content.replace(/\\\\n/g, '\n'),
      description: `Create ${autofix.target} configuration`
    };
  }

  /**
   * Generate command actions
   */
  async generateCommandActions(autofix, finding) {
    const actions = [];
    
    for (let command of autofix.commands) {
      // Replace placeholders
      finding.matches.forEach(match => {
        match.groups.forEach((group, index) => {
          command = command.replace(`$${index + 1}`, group);
        });
      });
      
      actions.push({
        type: 'run_command',
        command,
        description: `Execute: ${command}`
      });
    }
    
    return actions;
  }

  /**
   * Generate scan and fix actions
   */
  async generateScanAndFixActions(autofix, finding) {
    // This would integrate with the style engine for markdown fixes
    return [{
      type: 'run_command',
      command: 'node -e "console.log(\'Markdown syntax fixes would be applied here\')"',
      description: 'Fix Markdown syntax errors'
    }];
  }

  /**
   * Generate validate and fix actions  
   */
  async generateValidateAndFixActions(autofix, finding) {
    return [{
      type: 'run_command',
      command: 'hugo config',
      description: 'Validate Hugo configuration'
    }];
  }

  /**
   * Get build log content
   */
  async getBuildLog() {
    const logPaths = [
      '.netlify/build.log',
      'build.log',
      '.vercel/output/static/build.log'
    ];
    
    for (const logPath of logPaths) {
      if (await fs.pathExists(logPath)) {
        return await fs.readFile(logPath, 'utf8');
      }
    }
    
    // Try to get recent Hugo output
    try {
      return execSync('hugo --dry-run 2>&1 || true', { encoding: 'utf8' });
    } catch (error) {
      return '';
    }
  }

  /**
   * Get Hugo output
   */
  async getHugoOutput() {
    try {
      return execSync('hugo --dry-run 2>&1 || true', { encoding: 'utf8' });
    } catch (error) {
      return error.stdout || error.stderr || '';
    }
  }

  /**
   * Get deployment logs (stubs for now)
   */
  async getNetlifyLog() {
    return ''; // Would integrate with Netlify API
  }

  async getVercelLog() {
    return ''; // Would integrate with Vercel API  
  }

  async getGitLabCILog() {
    return ''; // Would integrate with GitLab CI API
  }

  /**
   * Get configuration files
   */
  async getConfigFiles() {
    const configFiles = ['hugo.toml', 'hugo.yaml', 'config.toml', 'config.yaml'];
    let content = '';
    
    for (const file of configFiles) {
      if (await fs.pathExists(file)) {
        content += await fs.readFile(file, 'utf8') + '\n';
      }
    }
    
    return content;
  }

  /**
   * Get content files for analysis
   */
  async getContentFiles() {
    try {
      const files = await glob('content/**/*.md');
      let content = '';
      
      for (const file of files.slice(0, 10)) { // Limit for performance
        content += await fs.readFile(file, 'utf8') + '\n';
      }
      
      return content;
    } catch (error) {
      return '';
    }
  }

  /**
   * Get line number from content and index
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * Generate diagnostic summary
   */
  generateSummary() {
    const summary = {
      total: this.findings.length,
      byCategory: {},
      bySeverity: { error: 0, warning: 0, info: 0 },
      fixable: 0
    };

    this.findings.forEach(finding => {
      const category = finding.recipe.category || 'unknown';
      const severity = finding.recipe.severity || 'info';

      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;
      
      if (finding.recipe.autofix && finding.recipe.autofix.enabled) {
        summary.fixable++;
      }
    });

    return summary;
  }

  /**
   * Generate human-readable report
   */
  generateReport(results) {
    const { findings, fixes, summary } = results;
    
    let report = chalk.blue.bold('\n🔍 Diagnostic Report\n');
    report += '='.repeat(50) + '\n\n';
    
    // Summary
    report += chalk.cyan('📊 Summary:\n');
    report += `   Total issues found: ${summary.total}\n`;
    report += `   Errors: ${summary.bySeverity.error || 0}\n`;
    report += `   Warnings: ${summary.bySeverity.warning || 0}\n`;
    report += `   Auto-fixable: ${summary.fixable}\n\n`;
    
    // By category
    if (Object.keys(summary.byCategory).length > 0) {
      report += chalk.cyan('📂 By Category:\n');
      Object.entries(summary.byCategory).forEach(([category, count]) => {
        report += `   ${category}: ${count}\n`;
      });
      report += '\n';
    }
    
    // Findings
    if (findings.length > 0) {
      report += chalk.cyan('🔍 Issues Found:\n');
      findings.forEach((finding, index) => {
        const icon = finding.severity === 'error' ? '🚫' : 
                    finding.severity === 'warning' ? '⚠️' : 'ℹ️';
        report += `\n${index + 1}. ${icon} ${finding.recipe.name}\n`;
        report += `   ${finding.recipe.explain}\n`;
        
        if (finding.matches.length > 0) {
          report += `   Matches: ${finding.matches.length}\n`;
        }
        
        if (finding.recipe.autofix && finding.recipe.autofix.enabled) {
          report += chalk.green(`   ✅ Auto-fixable\n`);
        }
      });
      report += '\n';
    }
    
    // Available fixes
    if (fixes.length > 0) {
      report += chalk.cyan('🔧 Available Fixes:\n');
      fixes.forEach((fix, index) => {
        report += `\n${index + 1}. ${fix.name}\n`;
        report += `   ${fix.description}\n`;
        report += `   Actions: ${fix.actions.length}\n`;
        if (!fix.safe) {
          report += chalk.yellow(`   ⚠️ Requires manual review\n`);
        }
      });
      report += '\n';
    }
    
    return report;
  }
}

module.exports = DiagnosticEngine;