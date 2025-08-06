# Hugo AI Examples

This directory contains example sites and demos showcasing Hugo AI capabilities.

## Quick Demo

Try these commands to see Hugo AI in action:

```bash
# Install Hugo AI locally for testing
npm link

# Create a new directory for testing
mkdir my-test-site && cd my-test-site

# Initialize a new Hugo site
hugo-ai init --describe "API documentation for a payment processing service with dark mode"

# Generate some content
hugo-ai generate --content "Authentication guide with OAuth 2.0 examples"
hugo-ai generate --content "Error handling documentation with status codes"

# Analyze the site
hugo-ai analyze --performance --seo --accessibility

# Try refactoring (if you have existing Hugo site)
# hugo-ai refactor --modernize
```

## Example Workflows

### 1. API Documentation Site
```bash
hugo-ai init --describe "REST API documentation for fintech startup"
hugo-ai generate --content "Getting started guide for developers"
hugo-ai generate --content "Payment endpoints with request/response examples"
hugo-ai generate --content "Webhook setup and verification guide"
```

### 2. Technical Blog
```bash
hugo-ai init --describe "Technical blog about machine learning and AI"
hugo-ai generate --content "Introduction to transformer models" --type post
hugo-ai generate --content "Building your first neural network" --type tutorial
```

### 3. Product Documentation
```bash
hugo-ai init --describe "Product documentation with user guides"
hugo-ai generate --content "Installation and setup guide"
hugo-ai generate --content "Feature overview with screenshots"
hugo-ai generate --content "Troubleshooting common issues"
```

## Expected Output

After running the demo commands, you should see:

1. **Generated Files:**
   - `hugo.toml` - Hugo configuration
   - `content/_index.md` - Homepage
   - `content/docs/` - Documentation pages
   - `.hugo-ai/context.json` - Persistent context

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