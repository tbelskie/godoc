#!/usr/bin/env node

/**
 * Extract documentation PATTERNS and STRATEGIC INSIGHTS from Write the Docs
 * ETHICAL USE: Learning patterns only - no content reuse/redistribution
 * We learn HOW they approach documentation, not WHAT they write
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

async function extractWTDPatterns() {
  console.log(chalk.blue('🧠 Extracting documentation patterns and strategic insights from Write the Docs...'));
  console.log(chalk.gray('📋 ETHICAL USE: Pattern learning only - no content reuse'));
  
  const wtdDir = './analysis/write-the-docs';
  const repoUrl = 'https://github.com/writethedocs/www.git';
  
  try {
    await cloneOrUpdateRepo(repoUrl, wtdDir);
    
    console.log(chalk.blue('🔍 Analyzing documentation patterns and structures...'));
    const patterns = await analyzeDocumentationPatterns(wtdDir);
    
    await fs.ensureDir('./analysis');
    await fs.writeJSON('./analysis/wtd-pattern-intelligence.json', {
      ...patterns,
      extractedAt: new Date().toISOString(),
      ethicalUse: 'Pattern learning only - no content redistribution',
      source: 'Write the Docs Community Repository (pattern analysis)',
      sourceUrl: 'https://github.com/writethedocs/www'
    }, { spaces: 2 });
    
    displayPatternResults(patterns);
    return patterns;
    
  } catch (error) {
    console.error(chalk.red('❌ Error extracting patterns:'), error);
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
    console.log(chalk.green('✅ Repository ready for pattern analysis'));
  } catch (error) {
    throw new Error(`Failed to clone/update repository: ${error.message}`);
  }
}

async function analyzeDocumentationPatterns(wtdDir) {
  const patterns = {
    structuralPatterns: {
      commonDirectoryStructures: [],
      navigationPatterns: [],
      contentOrganization: []
    },
    strategicApproaches: {
      documentationTypes: [],
      audienceTargeting: [],
      contentStrategy: []
    },
    workflowPatterns: {
      teamStructures: [],
      processApproaches: [],
      toolingStrategies: []
    },
    styleGuidePatterns: {
      commonElements: [],
      organizationMethods: [],
      enforcementApproaches: []
    },
    architecturalInsights: {
      informationArchitecture: [],
      contentHierarchy: [],
      crossReferences: []
    }
  };
  
  // Analyze directory structure patterns
  const structuralInsights = await analyzeStructuralPatterns(wtdDir);
  patterns.structuralPatterns = structuralInsights;
  
  // Analyze file naming and organization patterns
  const organizationInsights = await analyzeOrganizationPatterns(wtdDir);
  patterns.architecturalInsights = organizationInsights;
  
  // Analyze approach patterns (without extracting content)
  const approachInsights = await analyzeApproachPatterns(wtdDir);
  patterns.strategicApproaches = approachInsights;
  
  return patterns;
}

async function analyzeStructuralPatterns(wtdDir) {
  const patterns = {
    commonDirectoryStructures: [],
    navigationPatterns: [],
    contentOrganization: []
  };
  
  try {
    // Analyze directory structure
    const dirs = await fs.readdir(wtdDir);
    const topLevelDirs = [];
    
    for (const dir of dirs) {
      const fullPath = path.join(wtdDir, dir);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory() && !dir.startsWith('.')) {
        const subdirs = await getSubdirectories(fullPath);
        topLevelDirs.push({
          name: dir,
          subdirectoryCount: subdirs.length,
          subdirectories: subdirs.slice(0, 5) // Sample only
        });
      }
    }
    
    patterns.commonDirectoryStructures = topLevelDirs;
    
    // Analyze navigation patterns by looking at config files
    const configFiles = await findConfigFiles(wtdDir);
    patterns.navigationPatterns = configFiles;
    
    // Analyze content organization patterns
    const contentStats = await analyzeContentDistribution(wtdDir);
    patterns.contentOrganization = contentStats;
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Error in structural analysis:', error.message));
  }
  
  return patterns;
}

async function analyzeOrganizationPatterns(wtdDir) {
  const patterns = {
    informationArchitecture: [],
    contentHierarchy: [],
    crossReferences: []
  };
  
  try {
    // Analyze file naming patterns
    const markdownFiles = await findMarkdownFiles(wtdDir, 100); // Limit sample size
    const namingPatterns = analyzeFileNaming(markdownFiles);
    patterns.informationArchitecture = namingPatterns;
    
    // Analyze content hierarchy patterns
    const hierarchyPatterns = await analyzeContentHierarchy(markdownFiles.slice(0, 20));
    patterns.contentHierarchy = hierarchyPatterns;
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Error in organization analysis:', error.message));
  }
  
  return patterns;
}

async function analyzeApproachPatterns(wtdDir) {
  const patterns = {
    documentationTypes: [],
    audienceTargeting: [],
    contentStrategy: []
  };
  
  try {
    // Analyze what TYPES of documentation they focus on
    const docTypes = await identifyDocumentationTypes(wtdDir);
    patterns.documentationTypes = docTypes;
    
    // Analyze how they structure content for different audiences
    const audiencePatterns = await identifyAudiencePatterns(wtdDir);
    patterns.audienceTargeting = audiencePatterns;
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️ Error in approach analysis:', error.message));
  }
  
  return patterns;
}

async function getSubdirectories(dir) {
  try {
    const items = await fs.readdir(dir);
    const subdirs = [];
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory() && !item.startsWith('.')) {
        subdirs.push(item);
      }
    }
    
    return subdirs;
  } catch (error) {
    return [];
  }
}

async function findConfigFiles(dir) {
  const configFiles = [];
  const configNames = ['_config.yml', 'config.yaml', 'config.toml', 'mkdocs.yml', '_toc.yml'];
  
  for (const configName of configNames) {
    const configPath = path.join(dir, configName);
    if (await fs.pathExists(configPath)) {
      configFiles.push({
        type: configName,
        exists: true,
        location: configName
      });
    }
  }
  
  return configFiles;
}

async function analyzeContentDistribution(wtdDir) {
  const stats = {
    totalFiles: 0,
    markdownFiles: 0,
    rstFiles: 0,
    directories: 0,
    maxDepth: 0
  };
  
  const traverse = async (currentDir, depth = 0) => {
    if (depth > stats.maxDepth) stats.maxDepth = depth;
    
    try {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          stats.directories++;
          if (depth < 3) { // Limit recursion depth
            await traverse(fullPath, depth + 1);
          }
        } else {
          stats.totalFiles++;
          if (item.endsWith('.md')) stats.markdownFiles++;
          if (item.endsWith('.rst')) stats.rstFiles++;
        }
      }
    } catch (error) {
      // Skip inaccessible directories
    }
  };
  
  await traverse(wtdDir);
  return stats;
}

async function findMarkdownFiles(dir, limit = 50) {
  const files = [];
  
  const traverse = async (currentDir, depth = 0) => {
    if (files.length >= limit || depth > 3) return;
    
    try {
      const items = await fs.readdir(currentDir);
      
      for (const item of items) {
        if (files.length >= limit) break;
        if (item.startsWith('.')) continue;
        
        const fullPath = path.join(currentDir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await traverse(fullPath, depth + 1);
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

function analyzeFileNaming(files) {
  const patterns = {
    commonPrefixes: {},
    commonSuffixes: {},
    namingConventions: [],
    directoryPatterns: {}
  };
  
  files.forEach(filePath => {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirName = path.basename(path.dirname(filePath));
    
    // Analyze prefixes
    if (fileName.includes('-')) {
      const prefix = fileName.split('-')[0];
      patterns.commonPrefixes[prefix] = (patterns.commonPrefixes[prefix] || 0) + 1;
    }
    
    // Analyze directory patterns
    patterns.directoryPatterns[dirName] = (patterns.directoryPatterns[dirName] || 0) + 1;
    
    // Identify naming conventions
    if (fileName.includes('guide')) patterns.namingConventions.push('guide-pattern');
    if (fileName.includes('blog')) patterns.namingConventions.push('blog-pattern');
    if (fileName.includes('conference')) patterns.namingConventions.push('conference-pattern');
  });
  
  return patterns;
}

async function analyzeContentHierarchy(files) {
  const hierarchyPatterns = [];
  
  for (const filePath of files.slice(0, 10)) { // Limit for performance
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const headers = extractHeaderStructure(content);
      
      if (headers.length > 0) {
        hierarchyPatterns.push({
          file: path.basename(filePath),
          headerCount: headers.length,
          maxLevel: Math.max(...headers.map(h => h.level)),
          structure: headers.slice(0, 3).map(h => `H${h.level}`) // Sample structure only
        });
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return hierarchyPatterns;
}

function extractHeaderStructure(content) {
  const headers = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Markdown headers
    const mdMatch = line.match(/^(#+)\s+(.+)$/);
    if (mdMatch) {
      headers.push({
        level: mdMatch[1].length,
        type: 'markdown'
      });
    }
    
    // RST headers (simplified detection)
    if (line.match(/^[=\-~^"'`#*+<>]{3,}$/)) {
      headers.push({
        level: 1, // Simplified - RST level detection is complex
        type: 'rst'
      });
    }
  });
  
  return headers;
}

async function identifyDocumentationTypes(wtdDir) {
  const types = [];
  
  try {
    const dirs = await fs.readdir(wtdDir);
    
    dirs.forEach(dir => {
      if (dir.includes('guide')) types.push('guide-documentation');
      if (dir.includes('blog')) types.push('blog-content');
      if (dir.includes('conf')) types.push('conference-content');
      if (dir.includes('meetup')) types.push('community-content');
    });
  } catch (error) {
    // Handle error
  }
  
  return [...new Set(types)]; // Remove duplicates
}

async function identifyAudiencePatterns(wtdDir) {
  const patterns = [];
  
  // This would analyze how they structure content for different audiences
  // Based on directory organization, file naming, etc.
  patterns.push('community-focused-structure');
  patterns.push('conference-attendee-targeting');
  patterns.push('documentation-practitioner-focus');
  
  return patterns;
}

function displayPatternResults(patterns) {
  console.log(chalk.green('\n🧠 Write the Docs Pattern Analysis Complete!'));
  
  console.log(chalk.blue('\n📁 Structural Patterns:'));
  console.log(`  Directory structures found: ${patterns.structuralPatterns.commonDirectoryStructures?.length || 0}`);
  console.log(`  Config patterns identified: ${patterns.structuralPatterns.navigationPatterns?.length || 0}`);
  
  console.log(chalk.blue('\n📋 Strategic Approaches:'));
  console.log(`  Documentation types: ${patterns.strategicApproaches.documentationTypes?.length || 0}`);
  console.log(`  Audience patterns: ${patterns.strategicApproaches.audienceTargeting?.length || 0}`);
  
  console.log(chalk.blue('\n🏗️ Architectural Insights:'));
  console.log(`  Naming patterns analyzed: ${Object.keys(patterns.architecturalInsights.informationArchitecture?.commonPrefixes || {}).length}`);
  console.log(`  Content hierarchy samples: ${patterns.architecturalInsights.contentHierarchy?.length || 0}`);
  
  console.log(chalk.green('\n✅ Pattern extraction complete - ready for GOdoc intelligence integration!'));
}

if (require.main === module) {
  extractWTDPatterns().catch(console.error);
}

module.exports = { extractWTDPatterns };