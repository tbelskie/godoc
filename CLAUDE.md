# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm start` or `node hugo-ai.js` - Run the CLI application
- `npm test` - Run Jest tests (no test files currently implemented)
- `npm link` - Link for local development testing

### CLI Commands
- `hugo-ai init --describe "<description>"` - Initialize a new Hugo site with conversational context
- `hugo-ai generate --content "<request>"` - Generate content conversationally  
- `hugo-ai analyze --site <path>` - Analyze existing Hugo sites
- `hugo-ai refactor` - Refactor legacy Hugo sites

## Architecture

Hugo AI is a conversational static site generator that acts as an orchestration layer between users and Claude Code API, providing Hugo-specific expertise and context persistence.

### Core Components

1. **CLI Entry** (`hugo-ai.js`): Commander-based CLI handling user interactions

2. **Context Management** (`src/context-manager.js`): Maintains persistent state in `.hugo-ai/context.json`:
   - Project metadata and Claude interaction count
   - Architecture preferences (theme, content types)
   - Supports context migration and atomic writes

3. **Hugo Expertise** (`src/hugo-expertise.js`): Domain knowledge layer:
   - Theme recommendations based on project type analysis
   - Knows Docsy (API/technical docs) and Ananke (blogs/personal) themes
   - Natural language project type detection

4. **Claude Simulator** (`src/claude-simulator.js`): Simulates Claude API interactions:
   - Generates Hugo-compatible markdown with proper front matter
   - Provides specialized content templates (e.g., authentication guides)

### Key Design Patterns

- **Context Window Optimization**: Implements compression and summarization to work within Claude's token limits (see DEVELOPMENT.md for detailed implementation)
- **Resilient API Calls**: Exponential backoff with retry logic for Claude API failures
- **Intelligent Caching**: Reduces API calls through deterministic cache keys based on prompt + context

## Context Management Strategy

The system maintains three levels of context (detailed in README.md):
1. Project Level: Site purpose, audience, design preferences
2. Content Level: Content inventory, style guidelines, relationships
3. Technical Level: Hugo configuration, theme customizations, deployment

Context persists in `.hugo-ai/` directory with support for history tracking and migrations.

## Development Notes

- The project demonstrates advanced Claude Code integration patterns built for the Anthropic Documentation Engineer role
- Includes 47 Claude interactions across development phases with detailed metrics in DEVELOPMENT.md
- Token efficiency achieved through context compression: ~72% reduction
- Cache hit rate optimization target: >60% for repeated operations