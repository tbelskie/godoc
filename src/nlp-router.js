/**
 * Natural Language Processing Router for GOdoc
 * 
 * Transforms natural language into specific GOdoc commands
 * Goal: Users never need to memorize commands - pure conversation
 */

class NLPRouter {
  constructor() {
    this.commandPatterns = this.initializePatterns();
  }

  /**
   * Route natural language to appropriate command
   * @param {string} input - User's natural language input
   * @returns {Object} Parsed command with action and parameters
   */
  route(input) {
    const normalizedInput = input.toLowerCase().trim();
    
    for (const [action, patterns] of Object.entries(this.commandPatterns)) {
      for (const pattern of patterns.patterns) {
        const match = normalizedInput.match(pattern.regex);
        if (match) {
          return {
            action,
            confidence: pattern.confidence,
            parameters: this.extractParameters(match, pattern.params),
            originalInput: input,
            matchedPattern: pattern.description
          };
        }
      }
    }

    // Fallback - suggest possible commands
    return {
      action: 'help',
      confidence: 0.1,
      parameters: { suggestion: this.suggestCommand(normalizedInput) },
      originalInput: input
    };
  }

  /**
   * Initialize command patterns with regex and confidence scores
   */
  initializePatterns() {
    return {
      // Style Operations (highest priority - must come before init)
      style: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:make|ensure)\s+(?:all\s+)?(.+?)\s+(?:are\s+)?(?:italic|bold|code|formatted)$/,
            confidence: 0.95,
            description: "Format specific elements",
            params: ['fullMatch', 'elements']
          },
          {
            regex: /^(?:godoc\s+)?(?:italicize|make\s+italic)\s+(.+)$/,
            confidence: 0.9,
            description: "Italicize elements",
            params: ['fullMatch', 'elements']
          },
          {
            regex: /^(?:godoc\s+)?(?:bold|make\s+bold)\s+(.+)$/,
            confidence: 0.9,
            description: "Bold elements",
            params: ['fullMatch', 'elements']
          },
          {
            regex: /^(?:godoc\s+)?(?:apply|enforce)\s+style\s*(.*)$/,
            confidence: 0.85,
            description: "Apply style rules",
            params: ['fullMatch', 'target']
          }
        ]
      },

      // Site Creation
      init: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(build|create|make|generate|start)\s+(me\s+)?(a\s+)?(.+?)(?:\s+site|\s+documentation|\s+docs)?$/,
            confidence: 0.95,
            description: "Build/create site",
            params: ['fullMatch', 'action', 'me', 'article', 'description']
          },
          {
            regex: /^(?:godoc\s+)?(?:i\s+want|i\s+need|help\s+me)\s+(?:build|create|make)\s+(.+)$/,
            confidence: 0.9,
            description: "I want to build...",
            params: ['fullMatch', 'description']
          },
          {
            regex: /^(?:godoc\s+)?(?:new|fresh)\s+(.*?)(?:\s+project|\s+site)?$/,
            confidence: 0.85,
            description: "New project",
            params: ['fullMatch', 'description']
          },
          {
            regex: /^(?:godoc\s+)?init(?:ialize)?\s+(.+)$/,
            confidence: 0.8,
            description: "Initialize with description", 
            params: ['fullMatch', 'description']
          }
        ]
      },

      // Build Diagnostics & Fixes
      diagnose: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:why|what)(?:\s+is)?\s+(?:my\s+)?build(?:\s+is)?\s+(?:failing|broken|not working)(?:\?)?$/,
            confidence: 0.95,
            description: "Why is my build failing?",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:fix|repair|solve)\s+(?:my\s+)?(?:build|errors?|issues?|problems?)$/,
            confidence: 0.9,
            description: "Fix my build",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:diagnose|debug|troubleshoot)\s*(.*)$/,
            confidence: 0.85,
            description: "Diagnose problems",
            params: ['fullMatch', 'target']
          },
          {
            regex: /^(?:godoc\s+)?(?:help|what)(?:\s+is)?\s+wrong(?:\s+with)?(?:\s+my)?(?:\s+site)?(?:\?)?$/,
            confidence: 0.8,
            description: "What's wrong?",
            params: []
          }
        ]
      },

      // Quality Review & Style
      review: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:check|review|audit|validate)\s+(?:my\s+)?(?:docs?|documentation|style|quality)$/,
            confidence: 0.95,
            description: "Check documentation quality",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:fix|correct)\s+(?:any\s+)?(?:style|grammar|spelling|issues?)\s*(?:in\s+my\s+docs)?$/,
            confidence: 0.9,
            description: "Fix style issues",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:make|ensure)\s+(?:all\s+)?(.+?)\s+(?:are\s+)?(?:italic|bold|code|formatted)$/,
            confidence: 0.85,
            description: "Format specific elements",
            params: ['fullMatch', 'elements']
          },
          {
            regex: /^(?:godoc\s+)?(?:lint|style)\s*(.*)$/,
            confidence: 0.8,
            description: "Style checking",
            params: ['fullMatch', 'target']
          }
        ]
      },

      // Deployment
      deploy: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:deploy|publish|ship)\s+(?:this\s+)?(?:to\s+)?(\w+)?(?:\s+please)?$/,
            confidence: 0.95,
            description: "Deploy to platform",
            params: ['fullMatch', 'platform']
          },
          {
            regex: /^(?:godoc\s+)?(?:set\s+up|setup|configure)\s+(?:ci\/cd|cicd|github\s+actions|gitlab\s+ci)\s*(?:for\s+)?(.+)?$/,
            confidence: 0.9,
            description: "Setup CI/CD pipeline",
            params: ['fullMatch', 'platform']
          },
          {
            regex: /^(?:godoc\s+)?(?:create|generate)\s+(?:github\s+actions?|workflow|pipeline)\s*(?:for\s+)?(.+)?$/,
            confidence: 0.9,
            description: "Generate CI/CD workflow",
            params: ['fullMatch', 'platform']
          },
          {
            regex: /^(?:godoc\s+)?(?:host|deploy)\s+(?:this\s+)?(?:on|to)\s+(netlify|vercel|github\s+pages|aws|s3)$/,
            confidence: 0.95,
            description: "Deploy to specific platform",
            params: ['fullMatch', 'platform']
          },
          {
            regex: /^(?:godoc\s+)?(?:put|host|serve)\s+(?:this\s+)?(?:on|at)\s+(\w+)$/,
            confidence: 0.9,
            description: "Host on platform",
            params: ['fullMatch', 'platform']
          },
          {
            regex: /^(?:godoc\s+)?(?:go\s+live|make\s+live|launch)(?:\s+on\s+(\w+))?$/,
            confidence: 0.85,
            description: "Go live",
            params: ['fullMatch', 'platform']
          }
        ]
      },

      // Content Generation
      generate: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:add|create|generate|write)\s+(.+?)(?:\s+(?:page|content|section|docs?))?$/,
            confidence: 0.9,
            description: "Generate content",
            params: ['fullMatch', 'content']
          },
          {
            regex: /^(?:godoc\s+)?(?:i\s+need|help\s+me\s+write)\s+(.+)$/,
            confidence: 0.85,
            description: "Help write content",
            params: ['fullMatch', 'content']
          }
        ]
      },

      // Preview/Development
      preview: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:show|preview|serve|start|run)\s*(?:my\s+)?(?:site|docs?)?$/,
            confidence: 0.95,
            description: "Preview site",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:local\s+)?(?:server|development)(?:\s+mode)?$/,
            confidence: 0.85,
            description: "Development server",
            params: []
          }
        ]
      },

      // Analysis
      analyze: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:analyze|report\s+on|check\s+the)\s+(.+?)(?:\s+of\s+my\s+site)?$/,
            confidence: 0.9,
            description: "Analyze aspect of site",
            params: ['fullMatch', 'aspect']
          },
          {
            regex: /^(?:godoc\s+)?(?:how|what)(?:\s+is)?\s+(?:my\s+)?(?:performance|seo|accessibility)(?:\s+score)?(?:\?)?$/,
            confidence: 0.85,
            description: "Check performance metrics",
            params: []
          }
        ]
      },

      // Git Operations
      git: {
        patterns: [
          {
            regex: /^(?:godoc\s+)?(?:commit|save)\s+(?:my\s+)?(?:work|changes)(?:\s+as\s+)?(.*)$/,
            confidence: 0.9,
            description: "Commit work",
            params: ['fullMatch', 'message']
          },
          {
            regex: /^(?:godoc\s+)?(?:push|sync)\s+(?:my\s+)?changes$/,
            confidence: 0.9,
            description: "Push changes",
            params: []
          },
          {
            regex: /^(?:godoc\s+)?(?:create|make)\s+(?:a\s+)?(?:branch|pr|pull\s+request)\s*(.*)$/,
            confidence: 0.85,
            description: "Create branch or PR",
            params: ['fullMatch', 'name']
          }
        ]
      }
    };
  }

  /**
   * Extract parameters from regex match
   */
  extractParameters(match, paramNames) {
    const params = {};
    paramNames.forEach((name, index) => {
      if (match[index]) {
        params[name] = match[index].trim();
      }
    });
    return params;
  }

  /**
   * Suggest commands when no match found
   */
  suggestCommand(input) {
    const keywords = input.split(' ');
    const suggestions = [];

    // Check for key terms
    if (keywords.some(word => ['build', 'create', 'make', 'new', 'start'].includes(word))) {
      suggestions.push('Try: "build me a [type] documentation site"');
    }
    
    if (keywords.some(word => ['fix', 'broken', 'error', 'problem'].includes(word))) {
      suggestions.push('Try: "fix my build" or "why is my build failing?"');
    }
    
    if (keywords.some(word => ['deploy', 'publish', 'host'].includes(word))) {
      suggestions.push('Try: "deploy this to netlify" or "publish to github pages"');
    }
    
    if (keywords.some(word => ['check', 'review', 'style'].includes(word))) {
      suggestions.push('Try: "check my docs" or "fix any style issues"');
    }

    return suggestions.length > 0 ? suggestions : [
      'Try: "build me a [description] site"',
      'Try: "fix my build"', 
      'Try: "check my docs"',
      'Try: "deploy this"'
    ];
  }

  /**
   * Get help text for all supported commands
   */
  getHelp() {
    return {
      title: "GOdoc Natural Language Interface",
      description: "Just tell GOdoc what you want to do - no commands to memorize!",
      examples: {
        "Site Creation": [
          "build me a fintech API documentation site",
          "create a personal blog about cooking", 
          "I need a technical documentation site",
          "make me a developer onboarding guide"
        ],
        "Build Fixes": [
          "why is my build failing?",
          "fix my build errors",
          "help troubleshoot my site",
          "what's wrong with my documentation?"
        ],
        "Quality & Style": [
          "check my documentation quality",
          "fix any style issues in my docs",
          "make all UI elements italic",
          "review my writing style"
        ],
        "Deployment": [
          "deploy this to netlify",
          "publish to github pages",
          "host this on vercel",
          "go live on netlify"
        ],
        "Content": [
          "add an API reference page",
          "generate a quickstart guide",
          "create authentication documentation",
          "write troubleshooting docs"
        ],
        "Development": [
          "show me my site",
          "start the preview server",
          "serve my documentation locally"
        ],
        "Git Operations": [
          "commit my work as 'Added new content'",
          "push my changes",
          "create a branch for new feature"
        ]
      }
    };
  }
}

module.exports = NLPRouter;