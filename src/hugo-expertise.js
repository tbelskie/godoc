class HugoExpertise {
    constructor() {
      // This is our "brain" - Hugo-specific knowledge
      this.themes = {
        'docsy': {
          description: 'Google\'s documentation theme',
          bestFor: ['api-docs', 'technical-docs'],
          features: ['search', 'versioning', 'multi-language']
        },
        'ananke': {
          description: 'Clean, simple theme',
          bestFor: ['blog', 'personal-site'],
          features: ['responsive', 'minimal', 'fast']
        }
      };
    }
  
    recommendTheme(projectType) {
      // Smart theme recommendation based on project type
      for (const [theme, info] of Object.entries(this.themes)) {
        if (info.bestFor.includes(projectType)) {
          return theme;
        }
      }
      return 'ananke'; // default
    }
  
    analyzeDescription(description) {
      // Extract project type from natural language
      const lower = description.toLowerCase();
      
      if (lower.includes('api') || lower.includes('documentation')) {
        return 'api-docs';
      } else if (lower.includes('blog')) {
        return 'blog';
      } else if (lower.includes('personal')) {
        return 'personal-site';
      }
      
      return 'technical-docs'; // default
    }
  }
  
  module.exports = HugoExpertise;