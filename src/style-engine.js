/**
 * Style Engine - Automated style enforcement and mutations
 * 
 * Handles autofix transforms, glossary enforcement, and style mutations
 * Goal: "make all UI elements italic" should just work
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { glob } = require('glob');

class StyleEngine {
  constructor() {
    this.glossary = null;
    this.exceptions = null;
    this.rules = null;
    this.dryRun = false;
  }

  /**
   * Initialize style engine with glossary, exceptions, and rules
   */
  async initialize() {
    try {
      // Load style system files
      const styleDir = path.resolve('docs/.style');
      if (await fs.pathExists(styleDir)) {
        this.glossary = await this.loadStyleFile(path.join(styleDir, 'glossary.json'));
        this.exceptions = await this.loadStyleFile(path.join(styleDir, 'exceptions.json'));
      }

      // Load rules from intel pack
      const IntelLoader = require('./intel/loadIntel');
      const intel = await IntelLoader.loadBundledIntel();
      this.rules = intel.rules.rules;

      console.log(chalk.green('✅ Style engine initialized'));
      console.log(chalk.gray(`   Loaded ${this.rules.length} rules`));
      if (this.glossary) console.log(chalk.gray(`   Loaded glossary with ${Object.keys(this.glossary.preferred).length} preferred terms`));
      if (this.exceptions) console.log(chalk.gray(`   Loaded ${this.exceptions.exceptions.length} exception rules`));

    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not fully initialize style engine:', error.message));
      // Continue with partial initialization
    }
  }

  /**
   * Process natural language style mutation
   * e.g., "make all UI elements italic"
   */
  async processMutation(request) {
    console.log(chalk.blue(`🎨 Processing style mutation: "${request}"`));
    
    const mutation = this.parseMutationRequest(request);
    if (!mutation) {
      throw new Error(`Could not understand style request: "${request}"`);
    }

    console.log(chalk.cyan(`→ Detected: ${mutation.action} ${mutation.target} as ${mutation.format}`));
    
    // Find files to process
    const files = await this.findTargetFiles(mutation.scope);
    console.log(chalk.gray(`   Processing ${files.length} files...`));

    const results = {
      filesProcessed: 0,
      changesApplied: 0,
      errors: []
    };

    for (const file of files) {
      try {
        const changes = await this.applyMutation(file, mutation);
        if (changes > 0) {
          results.filesProcessed++;
          results.changesApplied += changes;
          console.log(chalk.green(`   ✓ ${file}: ${changes} changes`));
        }
      } catch (error) {
        results.errors.push({ file, error: error.message });
        console.error(chalk.red(`   ✗ ${file}: ${error.message}`));
      }
    }

    return results;
  }

  /**
   * Run automated style fixes based on rules
   */
  async runAutofix(options = {}) {
    this.dryRun = options.dryRun || false;
    
    console.log(chalk.blue(`🔧 Running automated style fixes${this.dryRun ? ' (dry run)' : ''}...`));

    const files = await this.findMarkdownFiles();
    const results = {
      filesProcessed: 0,
      changesApplied: 0,
      ruleResults: {},
      errors: []
    };

    for (const file of files) {
      try {
        const fileResults = await this.processFileWithRules(file);
        if (fileResults.changes > 0) {
          results.filesProcessed++;
          results.changesApplied += fileResults.changes;
          
          // Merge rule results
          Object.entries(fileResults.ruleResults).forEach(([ruleId, count]) => {
            results.ruleResults[ruleId] = (results.ruleResults[ruleId] || 0) + count;
          });
          
          console.log(chalk.green(`   ✓ ${file}: ${fileResults.changes} changes`));
        }
      } catch (error) {
        results.errors.push({ file, error: error.message });
        console.error(chalk.red(`   ✗ ${file}: ${error.message}`));
      }
    }

    return results;
  }

  /**
   * Parse natural language mutation requests
   */
  parseMutationRequest(request) {
    const lower = request.toLowerCase();
    
    // Pattern: "make [target] [format]"
    const makePattern = /make\s+(?:all\s+)?(.+?)\s+(italic|bold|code|formatted)/;
    const makeMatch = lower.match(makePattern);
    if (makeMatch) {
      return {
        action: 'format',
        target: makeMatch[1],
        format: makeMatch[2],
        scope: 'all'
      };
    }

    // Pattern: "italicize [target]"
    const italicPattern = /(?:italicize|make\s+italic)\s+(.+)/;
    const italicMatch = lower.match(italicPattern);
    if (italicMatch) {
      return {
        action: 'format',
        target: italicMatch[1],
        format: 'italic',
        scope: 'all'
      };
    }

    // Pattern: "enforce [rule]"
    const enforcePattern = /enforce\s+(.+)/;
    const enforceMatch = lower.match(enforcePattern);
    if (enforceMatch) {
      return {
        action: 'enforce',
        target: enforceMatch[1],
        scope: 'all'
      };
    }

    return null;
  }

  /**
   * Apply mutation to a specific file
   */
  async applyMutation(filePath, mutation) {
    const content = await fs.readFile(filePath, 'utf8');
    let updatedContent = content;
    let changes = 0;

    if (mutation.action === 'format' && mutation.target.includes('ui')) {
      // Apply UI element formatting
      const uiPattern = /\b(Click|Select|Choose|Press|Tap)\s+([A-Z][\w\s-]{1,30})\b/g;
      
      updatedContent = content.replace(uiPattern, (match, action, element) => {
        changes++;
        if (mutation.format === 'italic') {
          return `${action} *${element}*`;
        } else if (mutation.format === 'bold') {
          return `${action} **${element}**`;
        } else if (mutation.format === 'code') {
          return `${action} \`${element}\``;
        }
        return match;
      });
    }

    if (changes > 0 && !this.dryRun) {
      await fs.writeFile(filePath, updatedContent);
    }

    return changes;
  }

  /**
   * Process file with all applicable rules
   */
  async processFileWithRules(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    let updatedContent = content;
    const results = { changes: 0, ruleResults: {} };

    const applicableRules = this.getApplicableRules(filePath);

    for (const rule of applicableRules) {
      if (rule.enforce && rule.enforce.autoFix) {
        const ruleResults = await this.applyRule(updatedContent, rule);
        updatedContent = ruleResults.content;
        const ruleChanges = ruleResults.changes;
        
        if (ruleChanges > 0) {
          results.changes += ruleChanges;
          results.ruleResults[rule.id] = ruleChanges;
        }
      }
    }

    if (results.changes > 0 && !this.dryRun) {
      await fs.writeFile(filePath, updatedContent);
    }

    return results;
  }

  /**
   * Apply a specific rule to content
   */
  async applyRule(content, rule) {
    let updatedContent = content;
    let changes = 0;

    if (rule.type === 'regex' && rule.enforce) {
      const pattern = new RegExp(rule.pattern, 'g');
      
      if (rule.enforce.replacements) {
        // Apply replacements
        Object.entries(rule.enforce.replacements).forEach(([find, replace]) => {
          const findPattern = new RegExp(`\\\\b${find}\\\\b`, 'gi');
          const matches = updatedContent.match(findPattern);
          if (matches) {
            changes += matches.length;
            updatedContent = updatedContent.replace(findPattern, replace);
          }
        });
      } else if (rule.enforce.transform === 'remove') {
        // Remove matches
        const matches = updatedContent.match(pattern);
        if (matches) {
          changes += matches.length;
          updatedContent = updatedContent.replace(pattern, '');
        }
      } else if (rule.enforce.mustWrap) {
        // Wrap matches
        const wrapChar = rule.enforce.mustWrap === 'italic' ? '*' : 
                        rule.enforce.mustWrap === 'bold' ? '**' : '`';
        
        if (rule.detect && rule.detect.pattern) {
          const detectPattern = new RegExp(rule.detect.pattern, rule.detect.flags || 'g');
          updatedContent = updatedContent.replace(detectPattern, (match, action, element) => {
            changes++;
            return `${action} ${wrapChar}${element}${wrapChar}`;
          });
        }
      }
    }

    return { content: updatedContent, changes };
  }

  /**
   * Get rules applicable to a specific file
   */
  getApplicableRules(filePath) {
    return this.rules.filter(rule => {
      if (!rule.selector) return true;

      // Check path patterns
      if (rule.selector.paths) {
        const matchesPath = rule.selector.paths.some(pattern => {
          return this.matchesGlob(filePath, pattern);
        });
        if (!matchesPath) return false;
      }

      // Check exclude paths
      if (rule.selector.excludePaths) {
        const excludedPath = rule.selector.excludePaths.some(pattern => {
          return this.matchesGlob(filePath, pattern);
        });
        if (excludedPath) return false;
      }

      return true;
    });
  }

  /**
   * Check if path matches glob pattern
   */
  matchesGlob(filePath, pattern) {
    const normalizedPath = filePath.replace(/\\\\/g, '/');
    const minimatch = require('minimatch');
    return minimatch(normalizedPath, pattern);
  }

  /**
   * Find markdown files to process
   */
  async findMarkdownFiles() {
    try {
      return await glob('**/*.md', { ignore: ['node_modules/**', '.git/**'] });
    } catch (error) {
      console.error('Error finding markdown files:', error);
      return [];
    }
  }

  /**
   * Find target files based on scope
   */
  async findTargetFiles(scope) {
    if (scope === 'all') {
      return this.findMarkdownFiles();
    }
    // Add more scope options as needed
    return this.findMarkdownFiles();
  }

  /**
   * Load style system file
   */
  async loadStyleFile(filePath) {
    if (!await fs.pathExists(filePath)) {
      return null;
    }
    return await fs.readJSON(filePath);
  }

  /**
   * Generate style guide from current rules and glossary
   */
  async generateStyleGuide() {
    const styleGuidePath = path.resolve('docs/.style/compiled.md');
    
    const content = this.compileStyleGuide();
    await fs.writeFile(styleGuidePath, content);
    
    console.log(chalk.green(`✅ Generated style guide: ${styleGuidePath}`));
    return styleGuidePath;
  }

  /**
   * Compile human-readable style guide from JSON rules
   */
  compileStyleGuide() {
    let content = '# GOdoc Style Guide\\n\\n';
    content += '*Auto-generated from style rules and glossary*\\n\\n';

    // Add glossary section
    if (this.glossary) {
      content += '## Preferred Terms\\n\\n';
      Object.entries(this.glossary.preferred).forEach(([preferred, alternatives]) => {
        content += `**${preferred}** (not: ${alternatives.join(', ')})\\n\\n`;
      });

      content += '## Banned Words\\n\\n';
      content += 'Avoid these filler words:\\n\\n';
      this.glossary.banned.words.forEach(word => {
        content += `- ~~${word}~~\\n`;
      });
      content += '\\n';
    }

    // Add rules section
    content += '## Style Rules\\n\\n';
    this.rules.forEach(rule => {
      content += `### ${rule.id}\\n\\n`;
      content += `${rule.description}\\n\\n`;
      if (rule.enforce && rule.enforce.exampleBefore) {
        content += `**Before:** ${rule.enforce.exampleBefore}\\n\\n`;
        content += `**After:** ${rule.enforce.exampleAfter}\\n\\n`;
      }
    });

    return content;
  }
}

module.exports = StyleEngine;