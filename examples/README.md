# GOdoc Examples

This directory contains example sites and demos showcasing GOdoc capabilities.

## Quick Demo

Try these commands to see GOdoc in action:

```bash
# Install GOdoc locally for testing
npm link

# Create a new directory for testing
mkdir my-test-site && cd my-test-site

# Initialize a new Hugo site
godoc init --describe "API documentation for a payment processing service with dark mode"

# Generate some content
godoc generate --content "Authentication guide with OAuth 2.0 examples"
godoc generate --content "Error handling documentation with status codes"

# Analyze the site
godoc analyze --performance --seo --accessibility

# Try refactoring (if you have existing Hugo site)
# godoc refactor --modernize
```

## Example Workflows

### 1. API Documentation Site
```bash
godoc init --describe "REST API documentation for fintech startup"
godoc generate --content "Getting started guide for developers"
godoc generate --content "Payment endpoints with request/response examples"
godoc generate --content "Webhook setup and verification guide"
```

### 2. Technical Blog
```bash
godoc init --describe "Technical blog about machine learning and AI"
godoc generate --content "Introduction to transformer models" --type post
godoc generate --content "Building your first neural network" --type tutorial
```

### 3. Product Documentation
```bash
godoc init --describe "Product documentation with user guides"
godoc generate --content "Installation and setup guide"
godoc generate --content "Feature overview with screenshots"
godoc generate --content "Troubleshooting common issues"
```

## Expected Output

After running the demo commands, you should see:

1. **Generated Files:**
   - `hugo.toml` - Hugo configuration
   - `content/_index.md` - Homepage
   - `content/docs/` - Documentation pages
   - `.godoc/context.json` - Persistent context

2. **Analysis Reports:**
   - Site structure analysis
   - Content quality metrics  
   - SEO and accessibility scores
   - Performance recommendations

3. **Interactive Experience:**
   - Conversational prompts for missing information
   - Progress indicators with spinners
   - Colorized output with clear next steps

## Demo Sites

Coming soon:
- [ ] Complete API documentation example
- [ ] Blog site example  
- [ ] Corporate documentation example
- [ ] Before/after refactoring examples