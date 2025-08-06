class ClaudeSimulator {
    async generateContent(prompt, context) {
      // Simulate thinking time
      await this.delay(1500);
      
      // Smart content generation based on prompt analysis
      if (prompt.includes('auth') || prompt.includes('authentication')) {
        return this.getAuthContent();
      }
      
      // Default content
      return this.getDefaultContent(prompt);
    }
  
    getAuthContent() {
      return `---
  title: "Authentication Guide"
  date: ${new Date().toISOString()}
  draft: false
  ---
  
  # Authentication
  
  This API uses OAuth 2.0 for authentication.
  
  ## Quick Start
  
  \`\`\`bash
  curl -H "Authorization: Bearer YOUR_TOKEN" \\
    https://api.example.com/v1/users
  \`\`\`
  
  ## Getting Tokens
  
  1. Register your application
  2. Get client credentials
  3. Exchange for access token
  `;
    }
  
    getDefaultContent(prompt) {
      return `---
  title: "${this.extractTitle(prompt)}"
  date: ${new Date().toISOString()}
  ---
  
  # ${this.extractTitle(prompt)}
  
  Content generated from: "${prompt}"
  `;
    }
  
    extractTitle(prompt) {
      return prompt.split(' ').slice(0, 5).join(' ');
    }
  
    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
  
  module.exports = ClaudeSimulator;