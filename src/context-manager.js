const fs = require('fs-extra');
const path = require('path');

class HugoContextManager {
  constructor() {
    this.contextDir = '.godoc';
    this.contextFile = path.join(this.contextDir, 'context.json');
  }

  async init() {
    // Ensure our hidden directory exists
    await fs.ensureDir(this.contextDir);
    
    // If no context exists, create default
    if (!await fs.pathExists(this.contextFile)) {
      await this.saveContext(this.getDefaultContext());
    }
  }

  getDefaultContext() {
    return {
      project: {
        name: path.basename(process.cwd()),
        created: new Date().toISOString(),
        claudeInteractions: 0
      },
      architecture: {
        theme: null,
        contentTypes: []
      }
    };
  }

  async loadContext() {
    try {
      return await fs.readJSON(this.contextFile);
    } catch (error) {
      return this.getDefaultContext();
    }
  }

  async saveContext(context) {
    await fs.ensureDir(this.contextDir);
    await fs.writeJSON(this.contextFile, context, { spaces: 2 });
  }
}

module.exports = HugoContextManager;