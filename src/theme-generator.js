const fs = require('fs-extra');
const path = require('path');

class ThemeGenerator {
  constructor() {
    this.templates = {
      layouts: this.getLayoutTemplates(),
      css: this.getCSSTemplates(),
      js: this.getJSTemplates()
    };
  }

  async generateCustomTheme(sitePath, themeConfig) {
    const { name, style, features, colors } = themeConfig;
    
    // Create theme directory structure
    const themeDir = path.join(sitePath, 'layouts');
    await fs.ensureDir(themeDir);
    
    // Generate layouts
    await this.generateLayouts(themeDir, style, features);
    
    // Generate CSS with custom colors
    await this.generateCSS(sitePath, style, features, colors);
    
    // Generate JavaScript
    await this.generateJS(sitePath, features);
    
    // Generate partials
    await this.generatePartials(themeDir, features);
    
    return {
      name: `hugo-ai-${style}`,
      files: await this.getGeneratedFiles(sitePath)
    };
  }

  async generateLayouts(layoutDir, style, features) {
    const layouts = this.templates.layouts[style] || this.templates.layouts.minimal;
    
    // Base layout
    await fs.ensureDir(path.join(layoutDir, '_default'));
    await fs.writeFile(
      path.join(layoutDir, '_default', 'baseof.html'),
      this.buildBaseLayout(style, features)
    );
    
    // Single page layout
    await fs.writeFile(
      path.join(layoutDir, '_default', 'single.html'),
      this.buildSingleLayout(style, features)
    );
    
    // List layout
    await fs.writeFile(
      path.join(layoutDir, '_default', 'list.html'),
      this.buildListLayout(style, features)
    );
    
    // Homepage layout
    await fs.writeFile(
      path.join(layoutDir, 'index.html'),
      this.buildHomepageLayout(style, features)
    );
    
    // Documentation layout if needed
    if (features.includes('documentation')) {
      await fs.ensureDir(path.join(layoutDir, 'docs'));
      await fs.writeFile(
        path.join(layoutDir, 'docs', 'single.html'),
        this.buildDocsLayout(style, features)
      );
    }
  }

  async generateCSS(sitePath, style, features, colors = null) {
    const assetsDir = path.join(sitePath, 'assets', 'css');
    await fs.ensureDir(assetsDir);
    
    // Main stylesheet
    const mainCSS = this.buildMainCSS(style, features, colors);
    await fs.writeFile(path.join(assetsDir, 'main.css'), mainCSS);
    
    // Component-specific styles
    if (features.includes('dark-mode')) {
      await fs.writeFile(
        path.join(assetsDir, 'dark-mode.css'),
        this.buildDarkModeCSS()
      );
    }
    
    if (features.includes('search')) {
      await fs.writeFile(
        path.join(assetsDir, 'search.css'),
        this.buildSearchCSS()
      );
    }
  }

  async generateJS(sitePath, features) {
    const assetsDir = path.join(sitePath, 'assets', 'js');
    await fs.ensureDir(assetsDir);
    
    // Main JavaScript
    await fs.writeFile(
      path.join(assetsDir, 'main.js'),
      this.buildMainJS(features)
    );
    
    // Feature-specific JS
    if (features.includes('dark-mode')) {
      await fs.writeFile(
        path.join(assetsDir, 'dark-mode.js'),
        this.buildDarkModeJS()
      );
    }
    
    if (features.includes('search')) {
      await fs.writeFile(
        path.join(assetsDir, 'search.js'),
        this.buildSearchJS()
      );
    }
  }

  async generatePartials(layoutDir, features) {
    const partialsDir = path.join(layoutDir, 'partials');
    await fs.ensureDir(partialsDir);
    
    // Header partial
    await fs.writeFile(
      path.join(partialsDir, 'header.html'),
      this.buildHeaderPartial(features)
    );
    
    // Footer partial
    await fs.writeFile(
      path.join(partialsDir, 'footer.html'),
      this.buildFooterPartial(features)
    );
    
    // Navigation partial
    await fs.writeFile(
      path.join(partialsDir, 'nav.html'),
      this.buildNavPartial(features)
    );
    
    if (features.includes('search')) {
      await fs.writeFile(
        path.join(partialsDir, 'search.html'),
        this.buildSearchPartial()
      );
    }

    // Documentation navigation partial
    if (features.includes('documentation')) {
      await fs.writeFile(
        path.join(partialsDir, 'docs-nav.html'),
        this.buildDocsNavPartial()
      );
    }
  }

  buildBaseLayout(style, features) {
    return `<!DOCTYPE html>
<html lang="{{ .Site.LanguageCode | default "en" }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ if .IsHome }}{{ .Site.Title }}{{ else }}{{ .Title }} - {{ .Site.Title }}{{ end }}</title>
    <meta name="description" content="{{ .Description | default .Site.Params.description }}">
    
    <!-- CSS -->
    {{ $css := resources.Get "css/main.css" | resources.Minify }}
    <link rel="stylesheet" href="{{ $css.Permalink }}">
    
    ${features.includes('dark-mode') ? `{{ $darkMode := resources.Get "css/dark-mode.css" | resources.Minify }}
    <link rel="stylesheet" href="{{ $darkMode.Permalink }}">` : ''}
    
    ${features.includes('search') ? `{{ $search := resources.Get "css/search.css" | resources.Minify }}
    <link rel="stylesheet" href="{{ $search.Permalink }}">` : ''}
    
    <!-- SEO -->
    <link rel="canonical" href="{{ .Permalink }}">
    <meta property="og:title" content="{{ .Title }}">
    <meta property="og:description" content="{{ .Description | default .Site.Params.description }}">
    <meta property="og:url" content="{{ .Permalink }}">
    <meta name="twitter:card" content="summary">
</head>
<body class="${style}-theme"${features.includes('dark-mode') ? ' data-theme="light"' : ''}>
    {{ partial "header.html" . }}
    
    <main class="main-content">
        {{- block "main" . }}{{- end }}
    </main>
    
    {{ partial "footer.html" . }}
    
    <!-- JavaScript -->
    {{ $js := resources.Get "js/main.js" | resources.Minify }}
    <script src="{{ $js.Permalink }}"></script>
    
    ${features.includes('dark-mode') ? `{{ $darkModeJS := resources.Get "js/dark-mode.js" | resources.Minify }}
    <script src="{{ $darkModeJS.Permalink }}"></script>` : ''}
    
    ${features.includes('search') ? `{{ $searchJS := resources.Get "js/search.js" | resources.Minify }}
    <script src="{{ $searchJS.Permalink }}"></script>` : ''}
</body>
</html>`;
  }

  buildSingleLayout(style, features) {
    return `{{ define "main" }}
<article class="article">
    <header class="article-header">
        <h1 class="article-title">{{ .Title }}</h1>
        {{ if .Date }}
        <div class="article-meta">
            <time datetime="{{ .Date.Format "2006-01-02T15:04:05Z07:00" }}">
                {{ .Date.Format "January 2, 2006" }}
            </time>
            {{ if .Params.author }}
            <span class="article-author">by {{ .Params.author }}</span>
            {{ end }}
        </div>
        {{ end }}
    </header>
    
    <div class="article-content">
        {{ .Content }}
    </div>
    
    {{ if .Params.tags }}
    <footer class="article-footer">
        <div class="article-tags">
            {{ range .Params.tags }}
            <a href="{{ "/tags/" | relURL }}{{ . | urlize }}" class="tag">{{ . }}</a>
            {{ end }}
        </div>
    </footer>
    {{ end }}
</article>

${features.includes('navigation') ? `
<nav class="article-nav">
    {{ if .NextInSection }}
    <a href="{{ .NextInSection.Permalink }}" class="nav-next">
        Next: {{ .NextInSection.Title }}
    </a>
    {{ end }}
    {{ if .PrevInSection }}
    <a href="{{ .PrevInSection.Permalink }}" class="nav-prev">
        Previous: {{ .PrevInSection.Title }}
    </a>
    {{ end }}
</nav>
` : ''}
{{ end }}`;
  }

  buildListLayout(style, features) {
    return `{{ define "main" }}
<div class="list-page">
    <header class="page-header">
        <h1>{{ .Title }}</h1>
        {{ if .Content }}
        <div class="page-description">
            {{ .Content }}
        </div>
        {{ end }}
    </header>
    
    <div class="content-list">
        {{ range .Pages }}
        <article class="content-item">
            <h2 class="content-title">
                <a href="{{ .Permalink }}">{{ .Title }}</a>
            </h2>
            {{ if .Date }}
            <div class="content-meta">
                <time datetime="{{ .Date.Format "2006-01-02T15:04:05Z07:00" }}">
                    {{ .Date.Format "January 2, 2006" }}
                </time>
            </div>
            {{ end }}
            {{ if .Summary }}
            <div class="content-summary">
                {{ .Summary }}
            </div>
            {{ end }}
        </article>
        {{ end }}
    </div>
</div>
{{ end }}`;
  }

  buildHomepageLayout(style, features) {
    return `{{ define "main" }}
<div class="homepage">
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">{{ .Site.Title }}</h1>
            <p class="hero-description">{{ .Site.Params.description }}</p>
            <div class="hero-actions">
                <a href="/docs/" class="btn btn-primary">Get Started</a>
                <a href="/about/" class="btn btn-secondary">Learn More</a>
            </div>
        </div>
    </section>
    
    {{ if .Content }}
    <section class="homepage-content">
        {{ .Content }}
    </section>
    {{ end }}
    
    <section class="recent-content">
        <h2>Recent Updates</h2>
        <div class="content-grid">
            {{ range first 6 (where .Site.RegularPages "Type" "!=" "page") }}
            <article class="content-card">
                <h3><a href="{{ .Permalink }}">{{ .Title }}</a></h3>
                <p>{{ .Summary }}</p>
                <small>{{ .Date.Format "Jan 2, 2006" }}</small>
            </article>
            {{ end }}
        </div>
    </section>
</div>
{{ end }}`;
  }

  buildDocsLayout(style, features) {
    return `{{ define "main" }}
<div class="docs-layout">
    <aside class="docs-sidebar">
        {{ partial "docs-nav.html" . }}
    </aside>
    
    <article class="docs-content">
        <header class="docs-header">
            <h1>{{ .Title }}</h1>
            {{ if .Description }}
            <p class="docs-description">{{ .Description }}</p>
            {{ end }}
        </header>
        
        <div class="docs-body">
            {{ .Content }}
        </div>
        
        <footer class="docs-footer">
            <div class="docs-nav">
                {{ if .NextInSection }}
                <a href="{{ .NextInSection.Permalink }}" class="docs-nav-next">
                    Next: {{ .NextInSection.Title }} →
                </a>
                {{ end }}
                {{ if .PrevInSection }}
                <a href="{{ .PrevInSection.Permalink }}" class="docs-nav-prev">
                    ← Previous: {{ .PrevInSection.Title }}
                </a>
                {{ end }}
            </div>
        </footer>
    </article>
</div>
{{ end }}`;
  }

  buildHeaderPartial(features) {
    return `<header class="site-header">
    <div class="header-content">
        <div class="site-branding">
            <a href="{{ .Site.BaseURL }}" class="site-title">{{ .Site.Title }}</a>
        </div>
        
        <nav class="main-nav">
            {{ partial "nav.html" . }}
        </nav>
        
        <div class="header-actions">
            ${features.includes('search') ? '{{ partial "search.html" . }}' : ''}
            ${features.includes('dark-mode') ? '<button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">🌓</button>' : ''}
        </div>
    </div>
</header>`;
  }

  buildFooterPartial(features) {
    return `<footer class="site-footer">
    <div class="footer-content">
        <div class="footer-info">
            <p>&copy; {{ now.Year }} {{ .Site.Title }}. Built with Hugo AI.</p>
        </div>
        
        {{ if .Site.Menus.social }}
        <div class="footer-social">
            {{ range .Site.Menus.social }}
            <a href="{{ .URL }}" class="social-link" target="_blank" rel="noopener">
                {{ .Name }}
            </a>
            {{ end }}
        </div>
        {{ end }}
    </div>
</footer>`;
  }

  buildNavPartial(features) {
    return `{{ range .Site.Menus.main }}
<a href="{{ .URL }}" class="nav-link{{ if $.IsMenuCurrent "main" . }} active{{ end }}">
    {{ .Name }}
</a>
{{ end }}`;
  }

  buildSearchPartial() {
    return `<div class="search-widget">
    <input type="search" id="search-input" placeholder="Search..." class="search-input">
    <div id="search-results" class="search-results"></div>
</div>`;
  }

  buildDocsNavPartial() {
    return `<nav class="docs-navigation">
    <ul class="docs-nav-list">
        {{ range .Site.Menus.docs }}
        <li class="docs-nav-item">
            <a href="{{ .URL }}" class="docs-nav-link{{ if $.IsMenuCurrent "docs" . }} active{{ end }}">
                {{ .Name }}
            </a>
            {{ if .HasChildren }}
            <ul class="docs-nav-children">
                {{ range .Children }}
                <li>
                    <a href="{{ .URL }}" class="docs-nav-child{{ if $.IsMenuCurrent "docs" . }} active{{ end }}">
                        {{ .Name }}
                    </a>
                </li>
                {{ end }}
            </ul>
            {{ end }}
        </li>
        {{ end }}
    </ul>
</nav>`;
  }

  buildMainCSS(style, features, colors = null) {
    const primaryColor = colors?.primary || '#007bff';
    const secondaryColor = colors?.secondary || '#6c757d';
    
    return `/* Hugo AI Generated Theme - ${style} */
:root {
    --primary-color: ${primaryColor};
    --secondary-color: ${secondaryColor};
    --success-color: #28a745;
    --danger-color: #dc3545;
    --warning-color: #ffc107;
    --info-color: #17a2b8;
    --light-color: #f8f9fa;
    --dark-color: #343a40;
    
    --bg-color: #ffffff;
    --text-color: #333333;
    --border-color: #e9ecef;
    --link-color: var(--primary-color);
    --link-hover-color: #0056b3;
    
    --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', monospace;
    
    --border-radius: 0.375rem;
    --box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.075);
    --transition: all 0.15s ease-in-out;
}

/* Base styles */
* {
    box-sizing: border-box;
}

body {
    font-family: var(--font-family);
    line-height: 1.6;
    color: var(--text-color);
    background-color: var(--bg-color);
    margin: 0;
    padding: 0;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-weight: 600;
    line-height: 1.25;
}

h1 { font-size: 2.5rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.5rem; }
h5 { font-size: 1.25rem; }
h6 { font-size: 1rem; }

p {
    margin-top: 0;
    margin-bottom: 1rem;
}

a {
    color: var(--link-color);
    text-decoration: none;
    transition: var(--transition);
}

a:hover {
    color: var(--link-hover-color);
    text-decoration: underline;
}

/* Layout */
.site-header {
    background-color: var(--bg-color);
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 0;
    position: sticky;
    top: 0;
    z-index: 100;
}

.header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.site-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
}

.main-nav {
    display: flex;
    gap: 2rem;
}

.nav-link {
    padding: 0.5rem 0;
    font-weight: 500;
}

.nav-link.active {
    color: var(--primary-color);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.main-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem 1rem;
    min-height: 70vh;
}

/* Homepage */
.hero {
    text-align: center;
    padding: 4rem 0;
    margin-bottom: 4rem;
}

.hero-title {
    font-size: 3.5rem;
    margin-bottom: 1rem;
}

.hero-description {
    font-size: 1.25rem;
    color: var(--secondary-color);
    margin-bottom: 2rem;
}

.hero-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

/* Buttons */
.btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
    border: 1px solid transparent;
    border-radius: var(--border-radius);
    transition: var(--transition);
    cursor: pointer;
    text-decoration: none;
}

.btn-primary {
    color: white;
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}

.btn-primary:hover {
    background-color: var(--link-hover-color);
    border-color: var(--link-hover-color);
    text-decoration: none;
}

.btn-secondary {
    color: var(--secondary-color);
    border-color: var(--secondary-color);
}

.btn-secondary:hover {
    color: white;
    background-color: var(--secondary-color);
}

/* Content */
.content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-top: 2rem;
}

.content-card {
    padding: 1.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--bg-color);
    box-shadow: var(--box-shadow);
    transition: var(--transition);
}

.content-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
}

/* Articles */
.article {
    max-width: 800px;
}

.article-header {
    margin-bottom: 2rem;
}

.article-title {
    margin-bottom: 1rem;
}

.article-meta {
    color: var(--secondary-color);
    font-size: 0.9rem;
}

.article-content {
    margin-bottom: 2rem;
}

.article-content img {
    max-width: 100%;
    height: auto;
    border-radius: var(--border-radius);
}

.article-content pre {
    background-color: var(--light-color);
    padding: 1rem;
    border-radius: var(--border-radius);
    overflow-x: auto;
    font-family: var(--font-mono);
}

.article-content code {
    font-family: var(--font-mono);
    font-size: 0.9em;
    padding: 0.2rem 0.4rem;
    background-color: var(--light-color);
    border-radius: 0.25rem;
}

/* Tags */
.article-tags {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
}

.tag {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    font-size: 0.8rem;
    background-color: var(--light-color);
    color: var(--text-color);
    border-radius: 1rem;
    text-decoration: none;
}

.tag:hover {
    background-color: var(--primary-color);
    color: white;
}

/* Footer */
.site-footer {
    background-color: var(--light-color);
    border-top: 1px solid var(--border-color);
    padding: 2rem 0;
    margin-top: 4rem;
}

.footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
    text-align: center;
}

/* Responsive */
@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
        gap: 1rem;
    }
    
    .main-nav {
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .hero-title {
        font-size: 2.5rem;
    }
    
    .hero-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .content-grid {
        grid-template-columns: 1fr;
    }
}`;
  }

  buildDarkModeCSS() {
    return `/* Dark Mode Styles */
[data-theme="dark"] {
    --bg-color: #1a1a1a;
    --text-color: #e0e0e0;
    --border-color: #333333;
    --light-color: #2a2a2a;
    --dark-color: #e0e0e0;
}

.theme-toggle {
    background: none;
    border: 1px solid var(--border-color);
    padding: 0.5rem;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 1rem;
    transition: var(--transition);
}

.theme-toggle:hover {
    background-color: var(--light-color);
}`;
  }

  buildSearchCSS() {
    return `/* Search Styles */
.search-widget {
    position: relative;
    width: 300px;
}

.search-input {
    width: 100%;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--bg-color);
    color: var(--text-color);
}

.search-results {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--bg-color);
    border: 1px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 var(--border-radius) var(--border-radius);
    max-height: 400px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
}

.search-result {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
}

.search-result:hover {
    background-color: var(--light-color);
}

.search-result:last-child {
    border-bottom: none;
}`;
  }

  buildMainJS(features) {
    return `// Hugo AI Generated JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hugo AI site loaded');
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Mobile menu toggle (if needed)
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });
    }
});`;
  }

  buildDarkModeJS() {
    return `// Dark Mode Toggle
function initDarkMode() {
    const toggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    if (toggle) {
        toggle.addEventListener('click', function() {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
}

document.addEventListener('DOMContentLoaded', initDarkMode);`;
  }

  buildSearchJS() {
    return `// Simple Search Implementation
let searchIndex = [];

async function initSearch() {
    try {
        const response = await fetch('/search-index.json');
        searchIndex = await response.json();
    } catch (error) {
        console.warn('Search index not found');
    }
    
    const searchInput = document.getElementById('search-input');
    const searchResults = document.querySelector('.search-results');
    
    if (searchInput && searchResults) {
        searchInput.addEventListener('input', handleSearch);
        
        // Hide results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.style.display = 'none';
            }
        });
    }
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const results = document.querySelector('.search-results');
    
    if (query.length < 2) {
        results.style.display = 'none';
        return;
    }
    
    const matches = searchIndex.filter(page => 
        page.title.toLowerCase().includes(query) ||
        page.content.toLowerCase().includes(query)
    ).slice(0, 5);
    
    if (matches.length > 0) {
        results.innerHTML = matches.map(page => 
            '<div class="search-result" onclick="window.location.href=\\'' + page.url + '\\'">' +
            '<strong>' + page.title + '</strong><br>' +
            '<small>' + page.content.substring(0, 100) + '...</small>' +
            '</div>'
        ).join('');
        results.style.display = 'block';
    } else {
        results.innerHTML = '<div class="search-result">No results found</div>';
        results.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', initSearch);`;
  }

  getLayoutTemplates() {
    return {
      minimal: 'clean and simple',
      modern: 'contemporary with animations',
      technical: 'focused on documentation',
      creative: 'artistic and colorful'
    };
  }

  getCSSTemplates() {
    return {
      minimal: 'clean typography and whitespace',
      modern: 'gradients and shadows',
      technical: 'monospace and syntax highlighting',
      creative: 'bold colors and animations'
    };
  }

  getJSTemplates() {
    return {
      basic: 'essential interactions',
      enhanced: 'animations and effects',
      advanced: 'dynamic content loading'
    };
  }

  async getGeneratedFiles(sitePath) {
    const files = [];
    const findFiles = async (dir) => {
      const items = await fs.readdir(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          await findFiles(fullPath);
        } else {
          files.push(path.relative(sitePath, fullPath));
        }
      }
    };
    
    await findFiles(sitePath);
    return files.filter(f => f.startsWith('layouts/') || f.startsWith('assets/'));
  }
}

module.exports = ThemeGenerator;