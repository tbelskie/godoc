#!/usr/bin/env node

/**
 * Demo test script for Hugo AI
 * Tests the core commands without requiring Hugo installation
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const DEMO_DIR = path.join(__dirname, 'demo-test-site');

async function runDemo() {
  console.log(chalk.blue.bold('🧪 Hugo AI Demo Test\n'));
  
  try {
    // Clean up previous demo
    if (await fs.pathExists(DEMO_DIR)) {
      console.log('Cleaning up previous demo...');
      await fs.remove(DEMO_DIR);
    }
    
    // Create demo directory
    await fs.ensureDir(DEMO_DIR);
    process.chdir(DEMO_DIR);
    
    console.log(chalk.cyan('📁 Created demo directory:', DEMO_DIR));
    
    // Test 1: Initialize a site
    console.log(chalk.cyan('\n1. Testing hugo-ai init...'));
    execSync('node ../hugo-ai.js init --describe "API documentation for payment processing"', {
      stdio: 'inherit'
    });
    
    // Verify files were created
    const expectedFiles = ['hugo.toml', 'content/_index.md', '.hugo-ai/context.json'];
    for (const file of expectedFiles) {
      if (await fs.pathExists(file)) {
        console.log(chalk.green(`   ✓ Created ${file}`));
      } else {
        console.log(chalk.red(`   ✗ Missing ${file}`));
      }
    }
    
    // Test 2: Generate content
    console.log(chalk.cyan('\n2. Testing hugo-ai generate...'));
    execSync('node ../hugo-ai.js generate --content "Authentication guide" --type doc', {
      stdio: 'inherit'
    });
    
    // Test 3: Analyze site
    console.log(chalk.cyan('\n3. Testing hugo-ai analyze...'));
    execSync('node ../hugo-ai.js analyze', {
      stdio: 'inherit'
    });
    
    console.log(chalk.green('\n✅ Demo completed successfully!'));
    console.log(chalk.cyan('\n📂 Demo files created in:'), DEMO_DIR);
    console.log(chalk.yellow('   You can explore the generated files and run hugo server -D to preview'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ Demo failed:'), error.message);
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n\nDemo interrupted. Cleaning up...'));
  if (await fs.pathExists(DEMO_DIR)) {
    await fs.remove(DEMO_DIR);
  }
  process.exit(0);
});

// Run demo
runDemo().catch(console.error);