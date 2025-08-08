#!/usr/bin/env node

/**
 * Extract documentation domain expertise from Write the Docs repository
 * This is pure documentation intelligence - strategy, best practices, community wisdom
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

async function extractWTDIntelligence() {
  console.log(chalk.blue('🧠 Extracting documentation domain expertise from Write the Docs...'));
  
  const wtdDir = './analysis/write-the-docs';
  const repoUrl = 'https://github.com/writethedocs/www.git';
  
  try {
    // Clone or update the repository
    await cloneOrUpdateRepo(repoUrl, wtdDir);
    
    // Extract documentation intelligence
    console.log(chalk.blue('🔍 Analyzing Write the Docs content for domain expertise...'));
    const intelligence = await analyzeWTDContent(wtdDir);
    
    // Save the intelligence
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/wtd-domain-intelligence.json', {
      ...intelligence,
      extractedAt: new Date().toISOString(),
      source: 'Write the Docs Community Repository',
      sourceUrl: 'https://github.com/writethedocs/www'
    }, { spaces: 2 });
    
    // Display results
    displayIntelligenceResults(intelligence);
    
    return intelligence;
    
  } catch (error) {
    console.error(chalk.red('❌ Error extracting WTD intelligence:'), error);
  }
}

async function cloneOrUpdateRepo(repoUrl, targetDir) {
  try {
    if (await fs.pathExists(targetDir)) {
      console.log(chalk.gray('📁 Repository exists, updating...'));
      execSync('git pull', { cwd: targetDir, stdio: 'pipe' });
    } else {
      console.log(chalk.blue('📥 Cloning Write the Docs repository...'));
      execSync(`git clone --depth 1 ${repoUrl} "${targetDir}"`, { stdio: 'pipe' });
    }
    console.log(chalk.green('✅ Repository ready for analysis'));
  } catch (error) {
    throw new Error(`Failed to clone/update repository: ${error.message}`);
  }
}

async function analyzeWTDContent(wtdDir) {
  const intelligence = {
    documentationStrategy: [],
    bestPractices: [],
    toolingInsights: [],
    contentPatterns: [],
    workflowPatterns: [],
    industryInsights: [],
    communityWisdom: [],
    styleGuidePatterns: [],
    organizationPatterns: []
  };
  
  // Recursively analyze markdown files
  const markdownFiles = await findMarkdownFiles(wtdDir);
  console.log(chalk.gray(`📄 Found ${markdownFiles.length} markdown files to analyze`));
  
  for (const filePath of markdownFiles) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(wtdDir, filePath);
      
      // Skip very short files (likely not substantive)
      if (content.length < 200) continue;
      
      const fileIntelligence = extractIntelligenceFromContent(content, relativePath);
      
      // Merge intelligence
      Object.keys(intelligence).forEach(category => {
        if (fileIntelligence[category]) {
          intelligence[category].push(...fileIntelligence[category]);
        }
      });
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️ Error analyzing ${filePath}: ${error.message}`));
    }
  }
  
  // Deduplicate and score insights
  Object.keys(intelligence).forEach(category => {
    intelligence[category] = deduplicateInsights(intelligence[category]);
  });
  
  return intelligence;
}

async function findMarkdownFiles(dir) {
  const files = [];
  
  async function traverse(currentDir) {
    const items = await fs.readdir(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        // Skip certain directories
        if (!item.startsWith('.') && !item.includes('node_modules')) {
          await traverse(fullPath);
        }
      } else if (item.endsWith('.md') || item.endsWith('.rst')) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

function extractIntelligenceFromContent(content, filePath) {
  const intelligence = {
    documentationStrategy: [],
    bestPractices: [],
    toolingInsights: [],
    contentPatterns: [],
    workflowPatterns: [],
    industryInsights: [],
    communityWisdom: [],
    styleGuidePatterns: [],
    organizationPatterns: []
  };
  
  const lower = content.toLowerCase();
  const lines = content.split('\n');
  
  // Extract insights based on content patterns
  
  // Documentation Strategy
  if (lower.includes('strategy') || lower.includes('planning') || lower.includes('roadmap')) {
    const strategyInsights = extractSectionContent(content, ['strategy', 'planning', 'roadmap', 'approach']);
    intelligence.documentationStrategy.push(...strategyInsights.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['strategy', 'planning', 'documentation'])
    })));
  }
  
  // Best Practices
  if (lower.includes('best practice') || lower.includes('guideline') || lower.includes('recommendation')) {
    const practiceInsights = extractSectionContent(content, ['best practice', 'guideline', 'recommendation', 'should', 'avoid']);
    intelligence.bestPractices.push(...practiceInsights.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['best', 'practice', 'should', 'must'])
    })));
  }
  
  // Tooling Insights
  if (lower.includes('tool') || lower.includes('software') || lower.includes('platform')) {
    const toolingInsights = extractToolingReferences(content);
    intelligence.toolingInsights.push(...toolingInsights.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['tool', 'platform', 'software'])
    })));
  }
  
  // Content Patterns
  if (lower.includes('structure') || lower.includes('organize') || lower.includes('format')) {
    const contentPatterns = extractSectionContent(content, ['structure', 'organize', 'format', 'layout', 'hierarchy']);
    intelligence.contentPatterns.push(...contentPatterns.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['structure', 'organize', 'format'])
    })));
  }
  
  // Workflow Patterns
  if (lower.includes('workflow') || lower.includes('process') || lower.includes('team')) {
    const workflowPatterns = extractSectionContent(content, ['workflow', 'process', 'team', 'collaboration']);
    intelligence.workflowPatterns.push(...workflowPatterns.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['workflow', 'process', 'team'])
    })));
  }
  
  // Style Guide Patterns
  if (lower.includes('style') || lower.includes('voice') || lower.includes('tone') || lower.includes('writing')) {
    const stylePatterns = extractSectionContent(content, ['style', 'voice', 'tone', 'writing', 'language']);
    intelligence.styleGuidePatterns.push(...stylePatterns.map(insight => ({
      content: insight,
      source: filePath,
      confidence: calculateConfidence(insight, ['style', 'voice', 'tone'])
    })));
  }
  
  // Extract headers as organization patterns
  const headers = lines.filter(line => line.match(/^#+\s/));
  if (headers.length > 0) {
    intelligence.organizationPatterns.push({
      content: `Header structure: ${headers.slice(0, 5).join(' → ')}`,
      source: filePath,
      confidence: 0.7
    });
  }
  
  return intelligence;
}

function extractSectionContent(content, keywords) {
  const insights = [];
  const paragraphs = content.split('\n\n');
  
  paragraphs.forEach(paragraph => {
    const lower = paragraph.toLowerCase();
    if (keywords.some(keyword => lower.includes(keyword)) && paragraph.length > 50 && paragraph.length < 500) {
      insights.push(paragraph.trim().replace(/\n/g, ' ').substring(0, 200));
    }
  });
  
  return insights;
}

function extractToolingReferences(content) {
  const toolingInsights = [];
  const commonTools = ['sphinx', 'hugo', 'jekyll', 'gitbook', 'notion', 'confluence', 'markdown', 'rst', 'asciidoc'];
  
  const paragraphs = content.split('\n\n');
  paragraphs.forEach(paragraph => {
    const lower = paragraph.toLowerCase();
    if (commonTools.some(tool => lower.includes(tool)) && paragraph.length > 50) {
      toolingInsights.push(paragraph.trim().replace(/\n/g, ' ').substring(0, 200));
    }
  });
  
  return toolingInsights;
}

function calculateConfidence(content, relevantWords) {
  const lower = content.toLowerCase();
  const wordCount = relevantWords.reduce((count, word) => {
    return count + (lower.split(word).length - 1);
  }, 0);
  
  return Math.min(0.9, 0.3 + (wordCount * 0.1));
}

function deduplicateInsights(insights) {
  const unique = [];
  const seen = new Set();
  
  insights.forEach(insight => {
    const key = insight.content.substring(0, 50).toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(insight);
    }
  });
  
  // Sort by confidence and keep top items
  return unique.sort((a, b) => b.confidence - a.confidence).slice(0, 50);
}

function displayIntelligenceResults(intelligence) {
  console.log(chalk.green('\n🧠 Write the Docs Intelligence Extraction Complete!'));
  
  Object.entries(intelligence).forEach(([category, insights]) => {
    if (insights.length > 0) {
      console.log(chalk.blue(`\n📚 ${category.toUpperCase()}: ${insights.length} insights`));
      
      // Show top 2 insights for each category
      insights.slice(0, 2).forEach((insight, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${insight.content.substring(0, 80)}...`));
        console.log(chalk.gray(`     Confidence: ${(insight.confidence * 100).toFixed(0)}% | Source: ${insight.source}`));
      });
    }
  });
  
  const totalInsights = Object.values(intelligence).reduce((sum, arr) => sum + arr.length, 0);
  console.log(chalk.green(`\n✅ Extracted ${totalInsights} total documentation domain insights!`));
}

if (require.main === module) {
  extractWTDIntelligence().catch(console.error);
}

module.exports = { extractWTDIntelligence };