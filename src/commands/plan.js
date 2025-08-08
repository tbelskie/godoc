#!/usr/bin/env node

const ContentPlanningIntelligence = require('../content-planning-intelligence');
const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');

/**
 * Plan Command - Generate documentation roadmaps from specifications
 * 
 * Usage:
 *   godoc plan <spec-file> [options]
 * 
 * Examples:
 *   godoc plan feature-spec.md
 *   godoc plan api-spec.yaml --title "API v2 Documentation"
 *   godoc plan requirements.md --output analysis/custom-roadmap.json
 */
class PlanCommand {
  constructor() {
    this.contentPlanning = new ContentPlanningIntelligence();
  }

  /**
   * Execute the plan command
   * @param {string} specPath - Path to specification file
   * @param {Object} options - Command options
   */
  async execute(specPath, options = {}) {
    try {
      // Validate input
      if (!specPath) {
        throw new Error('Specification file path is required');
      }

      const fullSpecPath = path.resolve(specPath);
      const exists = await fs.pathExists(fullSpecPath);
      
      if (!exists) {
        throw new Error(`Specification file not found: ${specPath}`);
      }

      console.log(chalk.blue.bold('🎯 GODOC CONTENT PLANNING INTELLIGENCE'));
      console.log(chalk.blue(`Analyzing: ${path.basename(specPath)}\n`));

      // Generate roadmap
      const roadmapOptions = {
        title: options.title || `Documentation Updates for ${path.basename(specPath, path.extname(specPath))}`,
        outputPath: options.output
      };

      const roadmap = await this.contentPlanning.generateDocumentationRoadmap(fullSpecPath, roadmapOptions);

      // Display summary
      this.displaySummary(roadmap);

      // Display detailed results if requested
      if (options.verbose || options.v) {
        this.displayDetailedResults(roadmap);
      }

      // Copy to clipboard if requested
      if (options.clipboard) {
        await this.copyToClipboard(roadmap);
      }

      console.log(chalk.green.bold('\n✅ PLANNING COMPLETE!'));
      
      if (options.github) {
        console.log(chalk.blue('\nTo create GitHub issues from this roadmap:'));
        console.log(chalk.gray('  godoc plan --github-create <roadmap-file>'));
      }

      return roadmap;

    } catch (error) {
      console.error(chalk.red.bold('❌ Planning failed:'), error.message);
      throw error;
    }
  }

  /**
   * Display roadmap summary
   */
  displaySummary(roadmap) {
    console.log(chalk.cyan.bold('📊 PLANNING SUMMARY:'));
    console.log(chalk.cyan(`📋 Tasks: ${roadmap.summary.totalTasks}`));
    console.log(chalk.cyan(`⏱️  Hours: ${roadmap.summary.estimatedHours}`));
    console.log(chalk.cyan(`📚 Sections: ${roadmap.summary.affectedSections}`));
    console.log(chalk.cyan(`📅 Timeline: ${roadmap.summary.recommendedTimeline}`));

    console.log(chalk.magenta.bold('\n🎯 DOCUMENTATION IMPACTS:'));
    roadmap.specification.impacts.forEach(impact => {
      console.log(chalk.magenta(`• ${impact.type}: ${impact.reason}`));
    });
  }

  /**
   * Display detailed results
   */
  displayDetailedResults(roadmap) {
    console.log(chalk.green.bold('\n📝 DETAILED TASK BREAKDOWN:'));
    roadmap.githubEpic.tasks.forEach((task, index) => {
      console.log(chalk.green(`\n${index + 1}. ${task.title}`));
      console.log(chalk.gray(`   Effort: ${task.estimatedHours}h | Priority: ${task.priority || 'medium'} | Type: ${task.isNew ? 'New' : 'Update'}`));
      
      if (task.dependencies.length > 0) {
        console.log(chalk.yellow(`   Dependencies: ${task.dependencies.join(', ')}`));
      }

      console.log(chalk.blue(`   ${task.description.split('\n')[0]}...`));
    });

    console.log(chalk.blue.bold('\n🧠 APPLIED BEST PRACTICES:'));
    roadmap.enhancedPlan.recommendations.forEach(rec => {
      console.log(chalk.blue(`• ${rec.description}`));
    });

    if (roadmap.enhancedPlan.wisdomInsights && roadmap.enhancedPlan.wisdomInsights.length > 0) {
      console.log(chalk.magenta.bold('\n💡 WRITE THE DOCS INSIGHTS:'));
      roadmap.enhancedPlan.wisdomInsights.slice(0, 3).forEach(insight => {
        console.log(chalk.magenta(`• ${insight.insight.substring(0, 100)}...`));
      });
    }
  }

  /**
   * Copy roadmap to clipboard (simplified version)
   */
  async copyToClipboard(roadmap) {
    const summary = `# ${roadmap.githubEpic.title}

## Summary
- **Tasks:** ${roadmap.summary.totalTasks}
- **Effort:** ${roadmap.summary.estimatedHours} hours
- **Timeline:** ${roadmap.summary.recommendedTimeline}

## Tasks
${roadmap.githubEpic.tasks.map((task, i) => `${i + 1}. ${task.title} (${task.estimatedHours}h)`).join('\n')}`;

    console.log(chalk.green('\n📋 Roadmap summary copied to clipboard format:'));
    console.log(chalk.gray(summary.substring(0, 200) + '...'));
  }

  /**
   * Generate help text for the command
   */
  static getHelp() {
    return `
${chalk.bold('godoc plan')} - Generate documentation roadmaps from specifications

${chalk.bold('USAGE:')}
  godoc plan <spec-file> [options]

${chalk.bold('ARGUMENTS:')}
  spec-file         Path to specification file (supports .md, .yaml, .json, .txt)

${chalk.bold('OPTIONS:')}
  -t, --title <title>       Custom title for the roadmap
  -o, --output <path>       Custom output path for roadmap file
  -v, --verbose             Show detailed task breakdown
  --clipboard               Copy roadmap summary to clipboard format
  --github                  Show GitHub integration instructions

${chalk.bold('EXAMPLES:')}
  godoc plan feature-spec.md
  godoc plan api-changes.yaml --title "API v2 Migration" 
  godoc plan requirements.md --verbose --output my-roadmap.json
  godoc plan spec.md --clipboard --github

${chalk.bold('SUPPORTED FILE FORMATS:')}
  • Markdown (.md) - Feature specs, PRDs, requirements
  • YAML (.yaml, .yml) - OpenAPI specs, configuration specs  
  • JSON (.json) - API schemas, configuration files
  • Text (.txt) - Plain text specifications

${chalk.bold('OUTPUT:')}
  • Detailed JSON roadmap file in analysis/ directory
  • Task breakdown with effort estimates
  • GitHub epic structure with acceptance criteria
  • Integration with Write the Docs best practices
`;
  }

  /**
   * Validate specification file format
   */
  static validateSpecFile(specPath) {
    const supportedExtensions = ['.md', '.yaml', '.yml', '.json', '.txt'];
    const extension = path.extname(specPath).toLowerCase();
    
    if (!supportedExtensions.includes(extension)) {
      throw new Error(`Unsupported file format: ${extension}. Supported formats: ${supportedExtensions.join(', ')}`);
    }

    return true;
  }
}

module.exports = PlanCommand;