#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');

const HugoContextManager = require('./src/context-manager');
const HugoExpertise = require('./src/hugo-expertise');
const ClaudeSimulator = require('./src/claude-simulator');

const program = new Command();

program
  .name('hugo-ai')
  .description('Conversational Static Site Generator')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new Hugo site')
  .option('-d, --describe <description>', 'Describe your site')
  .action(async (options) => {
    const InitCommand = require('./src/commands/init');
    const initCmd = new InitCommand();
    await initCmd.execute(options);
  });

program
  .command('generate')
  .description('Generate content conversationally')
  .option('-c, --content <request>', 'Content request in natural language')
  .option('-t, --type <type>', 'Content type (page, post, doc)')
  .action(async (options) => {
    const GenerateCommand = require('./src/commands/generate');
    const generateCmd = new GenerateCommand();
    await generateCmd.execute(options);
  });

program
  .command('analyze')
  .description('Analyze existing Hugo site')
  .option('-p, --path <path>', 'Path to Hugo site (default: current directory)')
  .option('--performance', 'Include performance analysis')
  .option('--seo', 'Include SEO analysis')
  .option('--accessibility', 'Include accessibility checks')
  .action(async (options) => {
    const AnalyzeCommand = require('./src/commands/analyze');
    const analyzeCmd = new AnalyzeCommand();
    await analyzeCmd.execute(options);
  });

program
  .command('refactor')
  .description('Refactor and modernize Hugo sites')
  .option('-p, --path <path>', 'Path to Hugo site')
  .option('--modernize', 'Modernize theme and structure')
  .option('--preserve-urls', 'Maintain existing URL structure')
  .option('--add-search', 'Add search functionality')
  .action(async (options) => {
    const RefactorCommand = require('./src/commands/refactor');
    const refactorCmd = new RefactorCommand();
    await refactorCmd.execute(options);
  });

program.parse(process.argv);