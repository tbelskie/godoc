#!/usr/bin/env node

/**
 * Extract documentation WISDOM from Write the Docs content
 * Mine blog posts, newsletters, and conference content for actual documentation insights
 * ETHICAL USE: Learning from their published insights about documentation practices
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function extractWTDWisdom() {
  console.log(chalk.blue('🧠 Extracting documentation wisdom from Write the Docs content...'));
  console.log(chalk.gray('📋 ETHICAL USE: Learning from published insights about documentation'));
  
  const wtdDir = './analysis/write-the-docs';
  
  try {
    if (!await fs.pathExists(wtdDir)) {
      console.error(chalk.red('❌ Write the Docs repository not found. Run extract-wtd-patterns.js first.'));
      return;
    }
    
    console.log(chalk.blue('🔍 Mining documentation wisdom from blog posts and newsletters...'));
    const wisdom = await mineDocumentationWisdom(wtdDir);
    
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/wtd-documentation-wisdom.json', {
      ...wisdom,
      extractedAt: new Date().toISOString(),
      ethicalUse: 'Learning from published documentation insights',
      source: 'Write the Docs Community Content',
      sourceUrl: 'https://github.com/writethedocs/www',
      note: 'Insights derived from community-published content about documentation practices'
    }, { spaces: 2 });
    
    displayWisdomResults(wisdom);
    return wisdom;
    
  } catch (error) {
    console.error(chalk.red('❌ Error extracting documentation wisdom:'), error);
  }
}

async function mineDocumentationWisdom(wtdDir) {
  const wisdom = {
    documentationStrategies: [],
    toolingRecommendations: [],
    teamWorkflowInsights: [],
    contentCreationBestPractices: [],
    commonChallengesAndSolutions: [],
    industryTrends: [],
    successStories: [],
    lessonsLearned: []
  };
  
  // Focus on blog and newsletter content
  const contentDirs = [
    path.join(wtdDir, 'docs/blog'),
    path.join(wtdDir, 'docs/newsletter') // If it exists
  ];
  
  console.log(chalk.gray('📄 Analyzing blog posts and newsletter content...'));
  
  for (const contentDir of contentDirs) {
    if (await fs.pathExists(contentDir)) {
      const files = await findContentFiles(contentDir);
      console.log(chalk.gray(`   Found ${files.length} content files in ${path.basename(contentDir)}`));
      
      for (const filePath of files.slice(0, 50)) { // Limit for performance
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const insights = extractDocumentationInsights(content, filePath);
          
          // Merge insights
          Object.keys(wisdom).forEach(category => {
            if (insights[category]) {
              wisdom[category].push(...insights[category]);
            }
          });
          
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ Error processing ${filePath}: ${error.message}`));
        }
      }
    }
  }
  
  // Deduplicate and score insights
  Object.keys(wisdom).forEach(category => {
    wisdom[category] = deduplicateAndScore(wisdom[category]);
  });
  
  return wisdom;
}

async function findContentFiles(dir) {
  const files = [];
  
  const traverse = async (currentDir) => {
    try {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await traverse(fullPath);
        } else if (item.endsWith('.md') || item.endsWith('.rst')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  };
  
  await traverse(dir);
  return files;
}

function extractDocumentationInsights(content, filePath) {
  const insights = {
    documentationStrategies: [],
    toolingRecommendations: [],
    teamWorkflowInsights: [],
    contentCreationBestPractices: [],
    commonChallengesAndSolutions: [],
    industryTrends: [],
    successStories: [],
    lessonsLearned: []
  };
  
  const fileName = path.basename(filePath);
  const contentLower = content.toLowerCase();
  
  // Extract insights based on content patterns and keywords
  
  // Documentation Strategies
  if (contentLower.includes('strategy') || contentLower.includes('approach') || contentLower.includes('framework')) {
    const strategies = extractKeyInsights(content, [
      'strategy', 'approach', 'framework', 'methodology', 'plan'
    ]);
    insights.documentationStrategies.push(...strategies.map(s => ({
      insight: s,
      source: fileName,
      category: 'strategy'
    })));
  }
  
  // Tooling Recommendations  
  if (contentLower.includes('tool') || contentLower.includes('software') || contentLower.includes('platform')) {
    const toolInsights = extractToolingInsights(content);
    insights.toolingRecommendations.push(...toolInsights.map(t => ({
      insight: t,
      source: fileName,
      category: 'tooling'
    })));
  }
  
  // Team Workflow Insights
  if (contentLower.includes('team') || contentLower.includes('workflow') || contentLower.includes('process')) {
    const workflowInsights = extractKeyInsights(content, [
      'team', 'workflow', 'process', 'collaboration', 'review'
    ]);
    insights.teamWorkflowInsights.push(...workflowInsights.map(w => ({
      insight: w,
      source: fileName,
      category: 'workflow'
    })));
  }
  
  // Content Creation Best Practices
  if (contentLower.includes('writing') || contentLower.includes('content') || contentLower.includes('guide')) {
    const contentInsights = extractKeyInsights(content, [
      'writing', 'content', 'guide', 'tutorial', 'documentation'
    ]);
    insights.contentCreationBestPractices.push(...contentInsights.map(c => ({
      insight: c,
      source: fileName,
      category: 'content-creation'
    })));
  }
  
  // Common Challenges and Solutions
  if (contentLower.includes('challenge') || contentLower.includes('problem') || contentLower.includes('solution')) {
    const challengeInsights = extractKeyInsights(content, [
      'challenge', 'problem', 'solution', 'issue', 'difficulty'
    ]);
    insights.commonChallengesAndSolutions.push(...challengeInsights.map(c => ({
      insight: c,
      source: fileName,
      category: 'challenges'
    })));
  }
  
  // Success Stories
  if (contentLower.includes('success') || contentLower.includes('improved') || contentLower.includes('better')) {
    const successInsights = extractKeyInsights(content, [
      'success', 'improved', 'better', 'achievement', 'result'
    ]);
    insights.successStories.push(...successInsights.map(s => ({
      insight: s,
      source: fileName,
      category: 'success'
    })));
  }
  
  // Lessons Learned
  if (contentLower.includes('lesson') || contentLower.includes('learned') || contentLower.includes('mistake')) {
    const lessonInsights = extractKeyInsights(content, [
      'lesson', 'learned', 'mistake', 'avoid', 'experience'
    ]);
    insights.lessonsLearned.push(...lessonInsights.map(l => ({
      insight: l,
      source: fileName,
      category: 'lessons'
    })));
  }
  
  return insights;
}

function extractKeyInsights(content, keywords) {
  const insights = [];
  const sentences = content.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 50 || trimmed.length > 300) return;
    
    const lowerSentence = trimmed.toLowerCase();
    const keywordMatch = keywords.some(keyword => lowerSentence.includes(keyword));
    
    if (keywordMatch) {
      // Look for actionable insights
      if (lowerSentence.includes('should') ||
          lowerSentence.includes('must') ||
          lowerSentence.includes('recommend') ||
          lowerSentence.includes('important') ||
          lowerSentence.includes('key') ||
          lowerSentence.includes('critical')) {
        insights.push(trimmed);
      }
    }
  });
  
  return insights.slice(0, 5); // Limit per content piece
}

function extractToolingInsights(content) {
  const insights = [];
  const toolNames = [
    'sphinx', 'hugo', 'jekyll', 'gitbook', 'notion', 'confluence', 
    'markdown', 'rst', 'asciidoc', 'docusaurus', 'mkdocs', 'vuepress'
  ];
  
  const sentences = content.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 30 || trimmed.length > 250) return;
    
    const lowerSentence = trimmed.toLowerCase();
    const hasTool = toolNames.some(tool => lowerSentence.includes(tool));
    
    if (hasTool) {
      // Look for evaluative or comparative statements
      if (lowerSentence.includes('better') ||
          lowerSentence.includes('prefer') ||
          lowerSentence.includes('recommend') ||
          lowerSentence.includes('works well') ||
          lowerSentence.includes('good for') ||
          lowerSentence.includes('use') && lowerSentence.includes('for')) {
        insights.push(trimmed);
      }
    }
  });
  
  return insights.slice(0, 3);
}

function deduplicateAndScore(insights) {
  const unique = [];
  const seen = new Set();
  
  insights.forEach(insight => {
    const key = insight.insight.substring(0, 30).toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key) && insight.insight.length > 20) {
      seen.add(key);
      unique.push({
        ...insight,
        score: calculateInsightScore(insight.insight)
      });
    }
  });
  
  return unique.sort((a, b) => b.score - a.score).slice(0, 20);
}

function calculateInsightScore(text) {
  let score = 0;
  const lower = text.toLowerCase();
  
  // Higher score for actionable insights
  if (lower.includes('should')) score += 2;
  if (lower.includes('must')) score += 3;
  if (lower.includes('recommend')) score += 2;
  if (lower.includes('important')) score += 1;
  if (lower.includes('key')) score += 1;
  
  // Higher score for specific insights
  if (lower.includes('tool') || lower.includes('platform')) score += 1;
  if (lower.includes('team') || lower.includes('workflow')) score += 1;
  if (lower.includes('user') || lower.includes('audience')) score += 1;
  
  return score;
}

function displayWisdomResults(wisdom) {
  console.log(chalk.green('\n🧠 Write the Docs Documentation Wisdom Extracted!'));
  
  Object.entries(wisdom).forEach(([category, insights]) => {
    if (insights.length > 0) {
      const categoryName = category.replace(/([A-Z])/g, ' $1').toUpperCase();
      console.log(chalk.blue(`\n📚 ${categoryName}: ${insights.length} insights`));
      
      // Show top 2 insights for each category
      insights.slice(0, 2).forEach((insight, i) => {
        console.log(chalk.gray(`  ${i + 1}. ${insight.insight.substring(0, 100)}...`));
        console.log(chalk.gray(`     Score: ${insight.score} | Source: ${insight.source}`));
      });
    }
  });
  
  const totalInsights = Object.values(wisdom).reduce((sum, arr) => sum + arr.length, 0);
  console.log(chalk.green(`\n✅ Extracted ${totalInsights} actionable documentation insights!`));
  console.log(chalk.gray('💡 These insights will enhance our Content Planning and Style Guide intelligence'));
}

if (require.main === module) {
  extractWTDWisdom().catch(console.error);
}

module.exports = { extractWTDWisdom };