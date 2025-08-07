# GOdoc - AI-Powered Hugo Documentation Generator

[![npm version](https://img.shields.io/npm/v/godoc-cli.svg)](https://www.npmjs.com/package/godoc-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Create professional Hugo documentation sites through natural language conversation.**

GOdoc transforms simple descriptions into complete Hugo sites with custom themes, rich content, intelligent search, and deployment workflows. No Hugo expertise required.

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/tbelskie/godoc.git
cd godoc

# Install dependencies and link globally
npm install
npm link
```

### Create Your First Site

```bash
# Initialize a new documentation site
godoc init --describe "API documentation for my fintech product"

# Preview your site
godoc preview

# Generate additional content  
godoc generate --content "OAuth 2.0 authentication guide"

# Create GitHub repository with CI/CD
godoc github
```

**That's it!** GOdoc creates a complete, professional Hugo site with:
- Custom responsive theme with your brand colors
- Rich documentation content with code examples
- Working search functionality
- Deployment-ready configuration

## ✨ Key Features

### 🧠 **Intelligent Site Generation**
- **Natural Language Processing**: Extracts colors, pages, and structure from simple descriptions
- **Industry-Specific Templates**: Automatically adapts content for API docs, product guides, technical blogs
- **Smart Theme Generation**: Creates custom themes with responsive layouts and professional styling

### 📚 **Rich Content Creation**
- **AI-Powered Content**: Generates comprehensive documentation with examples and best practices
- **Multi-Language Code Examples**: JavaScript, Python, cURL, Go examples automatically included
- **Professional Structure**: Proper front matter, navigation, and cross-linking

### 🔍 **Advanced Search**
- **Intelligent Search Index**: Automatically generated JSON search index
- **Real-time Search**: Instant client-side search with content previews
- **Context-Aware Results**: Prioritizes relevant documentation sections

### 🛠️ **Complete Workflow Integration**
- **Hugo Best Practices**: Proper layouts, assets, and configuration out of the box
- **GitHub Integration**: Automatic repository creation with CI/CD workflows
- **Multi-Platform Deployment**: Netlify, Vercel, GitHub Pages support
- **Performance Optimized**: Fast builds, SEO-ready, accessibility compliant

## 📖 Usage Examples

### API Documentation
```bash
godoc init --describe "REST API docs for payment processing with OAuth examples"
```
**Creates**: Complete API reference with authentication guides, endpoint documentation, and interactive examples.

### Product Documentation  
```bash
godoc init --describe "User guide for SaaS platform, clean design, focus on getting started"
```
**Creates**: Professional product docs with onboarding flows, feature guides, and support resources.

### Technical Blog
```bash
godoc init --describe "Developer blog about machine learning, dark theme, code-heavy content"
```
**Creates**: Blog-optimized Hugo site with syntax highlighting, author profiles, and technical content templates.

## 🎯 Commands

| Command | Description | Example |
|---------|-------------|---------|
| `godoc init` | Create new Hugo site | `godoc init --describe "your vision"` |
| `godoc generate` | Add new content | `godoc generate --content "troubleshooting guide"` |
| `godoc preview` | Start development server | `godoc preview` |
| `godoc analyze` | Analyze site performance | `godoc analyze --seo --performance` |
| `godoc github` | Create GitHub repo | `godoc github --deployment netlify` |
| `godoc refactor` | Modernize existing sites | `godoc refactor --modernize` |

## 🏗️ How It Works

### 1. **Natural Language Analysis**
GOdoc parses your description to understand:
- **Content Structure**: Pages, sections, navigation hierarchy  
- **Visual Design**: Colors, themes, styling preferences
- **Target Audience**: Technical level, industry context
- **Functionality**: Search, analytics, deployment needs

### 2. **Intelligent Generation**  
- **Hugo Site Structure**: Proper directories, configuration, and assets
- **Custom Theme**: CSS, layouts, and JavaScript tailored to your needs
- **Rich Content**: Professional documentation with examples and best practices
- **Search Integration**: Automatic index generation and search UI

### 3. **Production Ready**
- **Performance Optimized**: Fast builds, optimized assets, SEO-ready
- **Deployment Workflows**: CI/CD automation for major hosting platforms  
- **Maintenance Tools**: Content analysis, link checking, performance monitoring

## 💼 Perfect For

- **Developer Relations Teams**: Create API documentation that developers actually want to use
- **Product Teams**: Build user guides and knowledge bases without technical overhead  
- **Technical Writers**: Focus on content while GOdoc handles the technical implementation
- **Open Source Projects**: Professional documentation sites that grow with your project

## 🔧 Requirements

- **Node.js**: Version 16.0.0 or higher
- **Hugo**: Auto-installed or install manually for advanced features
- **Git**: For repository management and deployment workflows

## 📁 Generated Site Structure

```
your-site/
├── content/                # Your documentation content
├── layouts/               # Custom Hugo templates  
├── assets/               # CSS, JavaScript, images
├── static/              # Static files (search index, etc.)
├── hugo.toml           # Hugo configuration
├── .godoc/            # GOdoc context and session data
└── .gitignore        # Configured for Hugo and GOdoc
```

## 🎨 Customization

GOdoc generates a complete Hugo site that you can customize using standard Hugo practices:

- **Content**: Edit Markdown files in `content/`
- **Styling**: Modify CSS in `assets/css/`
- **Layouts**: Customize templates in `layouts/`  
- **Configuration**: Update `hugo.toml` for site settings

## 🚀 Deployment Options

GOdoc supports all major hosting platforms with automatic CI/CD setup:

### Netlify (Recommended)
```bash
godoc github --deployment netlify
```

### Vercel
```bash  
godoc github --deployment vercel
```

### GitHub Pages
```bash
godoc github --deployment github-pages
```

## 🎯 Roadmap

GOdoc is actively developed with exciting features planned:

- **Phase 1** ✅: AI-powered Hugo generator (Current)
- **Phase 2** 🔄: Advanced workflow orchestration
- **Phase 3** 📅: Team collaboration features  
- **Phase 4** 📅: Enterprise integrations

## 🤝 Contributing

GOdoc is built with Claude Code and welcomes contributions:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b amazing-feature`
3. **Make your changes** and test thoroughly
4. **Submit a pull request** with a clear description

### Development Setup

```bash
git clone https://github.com/tbelskie/godoc.git
cd godoc
npm install
npm link  # For local testing
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hugo**: The blazing-fast static site generator that powers GOdoc
- **Claude Code**: AI-assisted development that made GOdoc possible
- **Open Source Community**: Hugo themes and tools that inspire GOdoc's design

---

**Ready to revolutionize your documentation workflow?**

```bash
git clone https://github.com/tbelskie/godoc.git
cd godoc && npm install && npm link
godoc init --describe "your documentation vision"
```

*Transform simple descriptions into professional documentation sites in minutes, not hours.*