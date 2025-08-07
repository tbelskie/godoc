const chalk = require('chalk');
const ora = require('ora');
const { spawn, execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class PreviewCommand {
  constructor() {
    this.serverProcess = null;
  }

  async execute(options) {
    console.log(chalk.blue.bold('\n🌐 Hugo AI Site Preview\n'));
    
    const sitePath = options.path || process.cwd();
    const port = options.port || 1313;
    const spinner = ora('Starting preview server...').start();
    
    try {
      // Check if it's a Hugo site
      const isHugoSite = await this.verifyHugoSite(sitePath);
      if (!isHugoSite) {
        spinner.fail(chalk.red('Not a Hugo site'));
        console.log(chalk.yellow('Run "hugo-ai init" first to initialize a site'));
        process.exit(1);
      }
      
      // Check if Hugo is installed
      try {
        execSync('hugo version', { stdio: 'ignore' });
      } catch (error) {
        spinner.fail(chalk.red('Hugo is not installed'));
        console.log(chalk.yellow('Please install Hugo:'));
        console.log(chalk.cyan('  brew install hugo  # macOS'));
        console.log(chalk.cyan('  snap install hugo  # Linux'));
        console.log(chalk.cyan('  choco install hugo # Windows'));
        process.exit(1);
      }
      
      // Fix theme configuration if needed
      await this.fixThemeConfig(sitePath);
      
      // Ensure all required partials exist
      await this.ensureRequiredPartials(sitePath);
      
      spinner.text = 'Building site...';
      
      // Test build first
      try {
        execSync('hugo build', { 
          cwd: sitePath, 
          stdio: 'pipe'
        });
      } catch (buildError) {
        spinner.fail(chalk.red('Site build failed'));
        console.error(chalk.red('Build error:'), buildError.message);
        process.exit(1);
      }
      
      spinner.text = `Starting development server on port ${port}...`;
      
      // Start the Hugo server
      await this.startServer(sitePath, port);
      
      spinner.succeed(chalk.green('Preview server started successfully!'));
      
      // Display server info
      this.displayServerInfo(port);
      
      // Handle cleanup on exit
      this.setupCleanup();
      
      // Keep the process alive
      await this.keepAlive();
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to start preview'));
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  }

  async verifyHugoSite(sitePath) {
    const configFiles = ['hugo.toml', 'hugo.yaml', 'hugo.json', 'config.toml', 'config.yaml', 'config.json'];
    
    for (const configFile of configFiles) {
      if (await fs.pathExists(path.join(sitePath, configFile))) {
        return true;
      }
    }
    
    return false;
  }

  async fixThemeConfig(sitePath) {
    const configPath = path.join(sitePath, 'hugo.toml');
    
    if (await fs.pathExists(configPath)) {
      let config = await fs.readFile(configPath, 'utf8');
      
      // Remove theme reference if we have custom layouts
      const layoutsPath = path.join(sitePath, 'layouts');
      if (await fs.pathExists(layoutsPath)) {
        // Check if there's a theme reference
        if (config.includes('theme = ')) {
          config = config.replace(/theme\s*=\s*['"][^'"]*['"][\s\r\n]*/g, '');
          await fs.writeFile(configPath, config);
        }
      }
    }
  }

  async ensureRequiredPartials(sitePath) {
    const partialsPath = path.join(sitePath, 'layouts', 'partials');
    
    if (await fs.pathExists(partialsPath)) {
      // Check for docs-nav.html if there's a docs layout
      const docsLayoutPath = path.join(sitePath, 'layouts', 'docs', 'single.html');
      const docsNavPath = path.join(partialsPath, 'docs-nav.html');
      
      if (await fs.pathExists(docsLayoutPath) && !await fs.pathExists(docsNavPath)) {
        // Create a basic docs navigation
        const docsNav = `<nav class="docs-nav">
    <h3>Documentation</h3>
    <ul class="docs-menu">
        {{ range where .Site.RegularPages "Section" "docs" }}
        <li class="docs-menu-item">
            <a href="{{ .Permalink }}" class="docs-link{{ if eq $.Permalink .Permalink }} active{{ end }}">
                {{ .Title }}
            </a>
        </li>
        {{ end }}
    </ul>
</nav>`;
        await fs.writeFile(docsNavPath, docsNav);
      }
    }
  }

  async startServer(sitePath, port) {
    return new Promise((resolve, reject) => {
      // Start Hugo server
      this.serverProcess = spawn('hugo', ['server', '-D', '--port', port.toString()], {
        cwd: sitePath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let serverReady = false;
      
      // Listen for server ready
      this.serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (output.includes('Web Server is available') && !serverReady) {
          serverReady = true;
          resolve();
        }
        
        // Show important messages
        if (output.includes('ERROR') || output.includes('WARN')) {
          console.log(chalk.yellow(output.trim()));
        }
      });
      
      // Handle errors
      this.serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        if (output.includes('ERROR')) {
          console.error(chalk.red(output.trim()));
        }
      });
      
      this.serverProcess.on('error', (error) => {
        if (!serverReady) {
          reject(new Error(`Failed to start server: ${error.message}`));
        }
      });
      
      this.serverProcess.on('exit', (code) => {
        if (!serverReady && code !== 0) {
          reject(new Error(`Hugo server exited with code ${code}`));
        }
      });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server failed to start within 10 seconds'));
        }
      }, 10000);
    });
  }

  displayServerInfo(port) {
    console.log(chalk.cyan('\n🎯 Preview Server Running:'));
    console.log(chalk.white('  • URL:'), chalk.yellow(`http://localhost:${port}/`));
    console.log(chalk.white('  • Environment:'), 'Development');
    console.log(chalk.white('  • Auto-reload:'), 'Enabled');
    
    console.log(chalk.cyan('\n⌨️  Commands:'));
    console.log(chalk.white('  • Press'), chalk.yellow('Ctrl+C'), chalk.white('to stop the server'));
    console.log(chalk.white('  • Edit files to see live changes'));
    
    console.log(chalk.cyan('\n📝 Quick Actions:'));
    console.log(chalk.white('  • Generate content:'), chalk.yellow('hugo-ai generate --content "new page"'));
    console.log(chalk.white('  • Analyze site:'), chalk.yellow('hugo-ai analyze --performance'));
    console.log(chalk.white('  • Refactor site:'), chalk.yellow('hugo-ai refactor --modernize'));
    
    console.log(chalk.green('\n✨ Happy previewing! Your changes will appear automatically.\n'));
  }

  setupCleanup() {
    // Handle process termination
    const cleanup = () => {
      if (this.serverProcess && !this.serverProcess.killed) {
        console.log(chalk.yellow('\n\nShutting down preview server...'));
        this.serverProcess.kill('SIGTERM');
        
        // Force kill after 5 seconds if it doesn't stop gracefully
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
          }
          process.exit(0);
        }, 5000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  async keepAlive() {
    // Keep the process alive and handle server output
    return new Promise((resolve) => {
      if (this.serverProcess) {
        this.serverProcess.on('exit', () => {
          console.log(chalk.yellow('\nPreview server stopped.'));
          resolve();
        });
      }
    });
  }
}

module.exports = PreviewCommand;