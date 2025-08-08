#!/usr/bin/env node

/**
 * Content Planning Intelligence - The Game Changer
 * Upload spec/feature → Get complete documentation roadmap with GitHub epics
 * 
 * REVOLUTIONARY WORKFLOW:
 * 1. Analyze spec for documentation impacts
 * 2. Map to existing documentation structure  
 * 3. Generate GitHub epic with effort estimates
 * 4. Apply Write the Docs wisdom
 * 5. Create dependency mapping and timeline
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ContentPlanningIntelligence {
  constructor() {
    this.wtdWisdom = null;
    this.themeIntelligence = null;
    this.documentationPatterns = {
      api: {
        requiredSections: ['authentication', 'endpoints', 'examples', 'errors'],
        optionalSections: ['sdks', 'webhooks', 'testing', 'migration'],
        estimatedEffort: { 
          authentication: '4 hours',
          endpoints: '2 hours per endpoint', 
          examples: '1 hour per language',
          errors: '2 hours'
        }
      },
      feature: {
        requiredSections: ['overview', 'setup', 'usage', 'troubleshooting'],
        optionalSections: ['advanced', 'examples', 'faq'],
        estimatedEffort: {
          overview: '2 hours',
          setup: '3 hours',
          usage: '4 hours',
          troubleshooting: '2 hours'
        }
      },
      integration: {
        requiredSections: ['prerequisites', 'installation', 'configuration', 'testing'],
        optionalSections: ['advanced-config', 'monitoring', 'security'],
        estimatedEffort: {
          prerequisites: '1 hour',
          installation: '3 hours',
          configuration: '4 hours',
          testing: '2 hours'
        }
      }
    };
  }

  /**
   * Main entry point: Analyze spec and generate documentation roadmap
   * @param {string} specPath - Path to specification file
   * @param {Object} options - Planning options
   * @returns {Promise<Object>} Complete documentation roadmap
   */
  async generateDocumentationRoadmap(specPath, options = {}) {
    console.log(chalk.blue('🎯 Generating documentation roadmap from spec...'));
    
    try {
      // Step 1: Parse and analyze the specification
      const specAnalysis = await this.analyzeSpecification(specPath);
      console.log(chalk.green(`✅ Spec analyzed: ${specAnalysis.type} with ${specAnalysis.impacts.length} doc impacts`));
      
      // Step 2: Map impacts to documentation structure
      const impactMapping = await this.mapDocumentationImpacts(specAnalysis);
      console.log(chalk.green(`✅ Mapped ${impactMapping.affectedSections.length} affected documentation sections`));
      
      // Step 3: Generate effort estimates using patterns
      const effortEstimates = await this.generateEffortEstimates(impactMapping);
      console.log(chalk.green(`✅ Estimated total effort: ${effortEstimates.totalHours} hours across ${effortEstimates.tasks.length} tasks`));
      
      // Step 4: Apply Write the Docs wisdom
      const enhancedPlan = await this.applyWTDWisdom(effortEstimates);
      console.log(chalk.green(`✅ Applied ${enhancedPlan.wisdomInsights.length} documentation best practices`));
      
      // Step 5: Generate GitHub epic structure
      const githubEpic = await this.generateGitHubEpic(enhancedPlan, options);
      console.log(chalk.green(`✅ Generated GitHub epic with ${githubEpic.tasks.length} tasks`));
      
      const roadmap = {
        specification: specAnalysis,
        impactMapping,
        effortEstimates,
        enhancedPlan,
        githubEpic,
        generatedAt: new Date().toISOString(),
        summary: {
          totalTasks: githubEpic.tasks.length,
          estimatedHours: effortEstimates.totalHours,
          affectedSections: impactMapping.affectedSections.length,
          recommendedTimeline: this.calculateTimeline(effortEstimates.totalHours)
        }
      };
      
      // Save the roadmap
      await this.saveRoadmap(roadmap, specPath);
      
      return roadmap;
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating documentation roadmap:'), error);
      throw error;
    }
  }

  /**
   * Analyze specification file for content and impacts
   */
  async analyzeSpecification(specPath) {
    console.log(chalk.gray('  🔍 Analyzing specification content...'));
    
    const content = await fs.readFile(specPath, 'utf8');
    const fileName = path.basename(specPath);
    const extension = path.extname(specPath).toLowerCase();
    
    const analysis = {
      fileName,
      type: this.detectSpecificationType(content, extension),
      content: content.substring(0, 2000), // Store sample for context
      impacts: [],
      features: [],
      changes: [],
      complexity: 'medium'
    };
    
    // Detect documentation impacts
    analysis.impacts = this.detectDocumentationImpacts(content);
    
    // Extract features mentioned
    analysis.features = this.extractFeatures(content);
    
    // Detect changes (new/modified/deprecated)
    analysis.changes = this.detectChanges(content);
    
    // Assess complexity
    analysis.complexity = this.assessSpecComplexity(content, analysis.impacts.length);
    
    return analysis;
  }

  /**
   * Detect what type of specification this is
   */
  detectSpecificationType(content, extension) {
    const lower = content.toLowerCase();
    
    if (extension === '.json' || lower.includes('openapi') || lower.includes('swagger')) {
      return 'api';
    }
    if (lower.includes('feature') || lower.includes('prd') || lower.includes('product requirement')) {
      return 'feature';
    }
    if (lower.includes('integration') || lower.includes('webhook') || lower.includes('sdk')) {
      return 'integration';
    }
    if (lower.includes('auth') || lower.includes('authentication') || lower.includes('oauth')) {
      return 'authentication';
    }
    
    return 'general';
  }

  /**
   * Detect what documentation will be impacted
   */
  detectDocumentationImpacts(content) {
    const impacts = [];
    const lower = content.toLowerCase();
    
    // API-related impacts
    if (lower.includes('endpoint') || lower.includes('api')) {
      impacts.push({
        type: 'api-reference',
        reason: 'New or modified API endpoints detected',
        sections: ['endpoints', 'examples'],
        priority: 'high'
      });
    }
    
    // Authentication impacts
    if (lower.includes('auth') || lower.includes('token') || lower.includes('oauth')) {
      impacts.push({
        type: 'authentication',
        reason: 'Authentication changes detected',
        sections: ['authentication', 'security'],
        priority: 'high'
      });
    }
    
    // SDK impacts
    if (lower.includes('sdk') || lower.includes('library') || lower.includes('client')) {
      impacts.push({
        type: 'sdk-documentation',
        reason: 'SDK changes detected',
        sections: ['sdks', 'examples', 'integration'],
        priority: 'medium'
      });
    }
    
    // Integration impacts
    if (lower.includes('integration') || lower.includes('webhook') || lower.includes('callback')) {
      impacts.push({
        type: 'integration-guide',
        reason: 'Integration changes detected',
        sections: ['integration', 'webhooks', 'setup'],
        priority: 'medium'
      });
    }
    
    // Error handling impacts
    if (lower.includes('error') || lower.includes('exception') || lower.includes('status code')) {
      impacts.push({
        type: 'error-documentation',
        reason: 'Error handling changes detected',
        sections: ['errors', 'troubleshooting'],
        priority: 'low'
      });
    }
    
    return impacts;
  }

  /**
   * Extract features mentioned in the spec
   */
  extractFeatures(content) {
    const features = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Look for feature-like patterns
      if (line.toLowerCase().includes('feature:') || line.toLowerCase().includes('add ') || line.toLowerCase().includes('new ')) {
        const feature = line.trim().substring(0, 100);
        if (feature.length > 10) {
          features.push(feature);
        }
      }
    });
    
    return features.slice(0, 5); // Limit to top 5
  }

  /**
   * Detect what's changing (new/modified/deprecated)
   */
  detectChanges(content) {
    const changes = [];
    const lower = content.toLowerCase();
    
    if (lower.includes('new ') || lower.includes('add ') || lower.includes('introduce ')) {
      changes.push({ type: 'addition', description: 'New functionality being added' });
    }
    if (lower.includes('modify ') || lower.includes('update ') || lower.includes('change ')) {
      changes.push({ type: 'modification', description: 'Existing functionality being modified' });
    }
    if (lower.includes('deprecat') || lower.includes('remov') || lower.includes('delete ')) {
      changes.push({ type: 'deprecation', description: 'Functionality being deprecated or removed' });
    }
    if (lower.includes('breaking') || lower.includes('breaking change')) {
      changes.push({ type: 'breaking', description: 'Breaking changes detected' });
    }
    
    return changes;
  }

  /**
   * Assess complexity of the specification
   */
  assessSpecComplexity(content, impactCount) {
    let complexity = 1;
    
    // Factor in content length
    if (content.length > 2000) complexity += 1;
    if (content.length > 5000) complexity += 1;
    
    // Factor in impact count
    complexity += impactCount * 0.5;
    
    // Factor in technical complexity indicators
    const lower = content.toLowerCase();
    if (lower.includes('oauth') || lower.includes('webhook') || lower.includes('encryption')) complexity += 1;
    if (lower.includes('breaking change') || lower.includes('migration')) complexity += 2;
    
    if (complexity <= 2) return 'low';
    if (complexity <= 4) return 'medium';
    return 'high';
  }

  /**
   * Map impacts to existing documentation structure
   */
  async mapDocumentationImpacts(specAnalysis) {
    console.log(chalk.gray('  🗺️  Mapping documentation impacts...'));
    
    const mapping = {
      affectedSections: [],
      newSections: [],
      modifiedSections: [],
      dependencies: [],
      priority: 'medium'
    };
    
    // Get patterns for this spec type
    const patterns = this.documentationPatterns[specAnalysis.type] || this.documentationPatterns.general;
    
    // Map each impact to documentation sections
    specAnalysis.impacts.forEach(impact => {
      impact.sections.forEach(section => {
        if (!mapping.affectedSections.includes(section)) {
          mapping.affectedSections.push(section);
        }
        
        // Determine if this is new or modified
        if (this.isNewSection(section, specAnalysis)) {
          mapping.newSections.push(section);
        } else {
          mapping.modifiedSections.push(section);
        }
      });
    });
    
    // Add required sections based on patterns
    if (patterns && patterns.requiredSections) {
      patterns.requiredSections.forEach(section => {
        if (!mapping.affectedSections.includes(section)) {
          mapping.affectedSections.push(section);
          mapping.newSections.push(section);
        }
      });
    }
    
    // Generate dependencies
    mapping.dependencies = this.generateSectionDependencies(mapping.affectedSections);
    
    // Set overall priority
    mapping.priority = this.calculateOverallPriority(specAnalysis.impacts);
    
    return mapping;
  }

  /**
   * Check if a section is new (simple heuristic for now)
   */
  isNewSection(section, specAnalysis) {
    // Simple logic: if the spec mentions "new" or "add" and the section, it's probably new
    const lower = specAnalysis.content.toLowerCase();
    return lower.includes('new') || lower.includes('add') || specAnalysis.changes.some(c => c.type === 'addition');
  }

  /**
   * Generate section dependencies
   */
  generateSectionDependencies(sections) {
    const dependencies = [];
    
    // Common dependency patterns
    const dependencyRules = {
      'endpoints': ['authentication'],
      'examples': ['endpoints', 'authentication'],
      'sdks': ['endpoints', 'authentication'],
      'integration': ['authentication', 'endpoints'],
      'testing': ['endpoints', 'examples'],
      'troubleshooting': ['endpoints', 'examples']
    };
    
    sections.forEach(section => {
      if (dependencyRules[section]) {
        dependencyRules[section].forEach(dependency => {
          if (sections.includes(dependency)) {
            dependencies.push({
              task: section,
              dependsOn: dependency,
              reason: `${section} documentation requires ${dependency} to be complete first`
            });
          }
        });
      }
    });
    
    return dependencies;
  }

  /**
   * Calculate overall priority from impacts
   */
  calculateOverallPriority(impacts) {
    const priorities = impacts.map(i => i.priority);
    
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * Generate effort estimates for each task
   */
  async generateEffortEstimates(impactMapping) {
    console.log(chalk.gray('  ⏱️  Generating effort estimates...'));
    
    const estimates = {
      tasks: [],
      totalHours: 0,
      timeline: null
    };
    
    // Get base estimates from patterns
    const baseEfforts = this.documentationPatterns.api.estimatedEffort; // Using API as baseline
    
    impactMapping.affectedSections.forEach(section => {
      const baseEffort = this.extractHoursFromEffort(baseEfforts[section] || '2 hours');
      
      // Apply complexity multipliers
      let adjustedEffort = baseEffort;
      if (impactMapping.priority === 'high') adjustedEffort *= 1.5;
      if (impactMapping.priority === 'low') adjustedEffort *= 0.8;
      
      const task = {
        section,
        estimatedHours: Math.ceil(adjustedEffort),
        isNew: impactMapping.newSections.includes(section),
        priority: this.getSectionPriority(section, impactMapping),
        dependencies: impactMapping.dependencies.filter(d => d.task === section).map(d => d.dependsOn)
      };
      
      estimates.tasks.push(task);
      estimates.totalHours += task.estimatedHours;
    });
    
    // Sort tasks by priority and dependencies
    estimates.tasks = this.sortTasksByPriority(estimates.tasks);
    
    return estimates;
  }

  /**
   * Extract hours from effort strings like "2 hours" or "1 hour per endpoint"
   */
  extractHoursFromEffort(effortString) {
    const match = effortString.match(/(\d+)\s*hour/);
    return match ? parseInt(match[1]) : 2; // Default to 2 hours
  }

  /**
   * Get priority for a specific section
   */
  getSectionPriority(section, impactMapping) {
    const highPrioritySections = ['authentication', 'endpoints'];
    const lowPrioritySections = ['troubleshooting', 'faq'];
    
    if (highPrioritySections.includes(section)) return 'high';
    if (lowPrioritySections.includes(section)) return 'low';
    return 'medium';
  }

  /**
   * Sort tasks by priority and dependencies
   */
  sortTasksByPriority(tasks) {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    return tasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by dependencies (tasks with no dependencies first)
      return a.dependencies.length - b.dependencies.length;
    });
  }

  /**
   * Apply Write the Docs wisdom to enhance the plan
   */
  async applyWTDWisdom(effortEstimates) {
    console.log(chalk.gray('  🧠 Applying Write the Docs wisdom...'));
    
    // Load WTD wisdom if not already loaded
    if (!this.wtdWisdom) {
      this.wtdWisdom = await this.loadWTDWisdom();
    }
    
    const enhanced = {
      ...effortEstimates,
      wisdomInsights: [],
      recommendations: [],
      bestPractices: []
    };
    
    // Apply specific insights
    if (this.wtdWisdom && this.wtdWisdom.contentCreationBestPractices) {
      this.wtdWisdom.contentCreationBestPractices.slice(0, 3).forEach(practice => {
        enhanced.wisdomInsights.push({
          category: 'content-creation',
          insight: practice.insight,
          application: 'Apply this approach to content generation'
        });
      });
    }
    
    // Add README-first recommendation (from WTD insight)
    enhanced.recommendations.push({
      type: 'README-first',
      description: 'Write README and outline first to see from user perspective',
      basedOn: 'Write the Docs community insight'
    });
    
    // Add simplicity recommendation
    enhanced.recommendations.push({
      type: 'simplicity-first',
      description: 'Prefer simple markdown over complex formatting tools',
      basedOn: 'Write the Docs community preference for markdown constraints'
    });
    
    return enhanced;
  }

  /**
   * Load Write the Docs wisdom
   */
  async loadWTDWisdom() {
    try {
      const wisdomPath = path.join(__dirname, '..', 'analysis', 'wtd-documentation-wisdom.json');
      if (await fs.pathExists(wisdomPath)) {
        const data = await fs.readJSON(wisdomPath);
        return data;
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not load Write the Docs wisdom'));
    }
    return null;
  }

  /**
   * Generate GitHub epic structure
   */
  async generateGitHubEpic(enhancedPlan, options = {}) {
    console.log(chalk.gray('  📋 Generating GitHub epic...'));
    
    const epic = {
      title: options.title || 'Documentation Updates',
      description: this.generateEpicDescription(enhancedPlan),
      labels: ['documentation', 'epic'],
      tasks: [],
      totalEffort: enhancedPlan.totalHours,
      timeline: this.calculateTimeline(enhancedPlan.totalHours)
    };
    
    // Generate individual tasks
    enhancedPlan.tasks.forEach((task, index) => {
      epic.tasks.push({
        title: `${task.isNew ? 'Create' : 'Update'} ${task.section} documentation`,
        description: this.generateTaskDescription(task, enhancedPlan.wisdomInsights),
        labels: ['documentation', task.priority],
        estimatedHours: task.estimatedHours,
        dependencies: task.dependencies,
        acceptanceCriteria: this.generateAcceptanceCriteria(task),
        assignee: null // To be assigned by team
      });
    });
    
    return epic;
  }

  /**
   * Generate epic description
   */
  generateEpicDescription(enhancedPlan) {
    return `## Documentation Update Epic

**Total Estimated Effort:** ${enhancedPlan.totalHours} hours
**Tasks:** ${enhancedPlan.tasks.length}
**Timeline:** ${this.calculateTimeline(enhancedPlan.totalHours)}

### Write the Docs Best Practices Applied:
${enhancedPlan.recommendations.map(r => `- ${r.description}`).join('\\n')}

### Task Dependencies:
Dependencies have been mapped to ensure proper sequencing.

**Generated by GOdoc Content Planning Intelligence** 🤖`;
  }

  /**
   * Generate task description
   */
  generateTaskDescription(task, wisdomInsights) {
    let description = `## ${task.section.charAt(0).toUpperCase() + task.section.slice(1)} Documentation

**Estimated Effort:** ${task.estimatedHours} hours
**Priority:** ${task.priority}
**Type:** ${task.isNew ? 'New documentation' : 'Update existing documentation'}

### Requirements:
- Follow established style guide
- Include code examples where relevant
- Ensure mobile responsiveness
- Add cross-references to related sections

`;

    // Add wisdom insights
    if (wisdomInsights && wisdomInsights.length > 0) {
      description += `### Best Practices to Apply:
${wisdomInsights.slice(0, 2).map(w => `- ${w.insight.substring(0, 100)}...`).join('\\n')}

`;
    }

    if (task.dependencies.length > 0) {
      description += `### Dependencies:
This task depends on: ${task.dependencies.join(', ')}

`;
    }

    description += `**Generated by GOdoc Content Planning Intelligence** 🤖`;
    
    return description;
  }

  /**
   * Generate acceptance criteria for a task
   */
  generateAcceptanceCriteria(task) {
    const criteria = [
      'Documentation is complete and accurate',
      'All code examples are tested and working',
      'Content follows established style guide',
      'Cross-references are updated',
      'Content is reviewed by team lead'
    ];
    
    // Add section-specific criteria
    if (task.section === 'authentication') {
      criteria.push('Security considerations are documented');
      criteria.push('Token handling is explained clearly');
    }
    
    if (task.section === 'endpoints') {
      criteria.push('All parameters are documented');
      criteria.push('Response examples are provided');
      criteria.push('Error cases are covered');
    }
    
    return criteria;
  }

  /**
   * Calculate timeline based on total hours
   */
  calculateTimeline(totalHours) {
    const daysEstimate = Math.ceil(totalHours / 6); // 6 productive hours per day
    
    if (daysEstimate <= 3) return `${daysEstimate} days`;
    if (daysEstimate <= 10) return `${Math.ceil(daysEstimate / 5)} week${Math.ceil(daysEstimate / 5) > 1 ? 's' : ''}`;
    return `${Math.ceil(daysEstimate / 5)} weeks`;
  }

  /**
   * Save roadmap to file
   */
  async saveRoadmap(roadmap, specPath) {
    const fileName = path.basename(specPath, path.extname(specPath));
    const roadmapPath = path.join('analysis', `roadmap-${fileName}-${Date.now()}.json`);
    
    await fs.ensureDir('analysis');
    await fs.writeJSON(roadmapPath, roadmap, { spaces: 2 });
    
    console.log(chalk.blue(`💾 Roadmap saved to: ${roadmapPath}`));
  }
}

module.exports = ContentPlanningIntelligence;