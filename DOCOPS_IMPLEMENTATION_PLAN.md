# DocOps Engineer Implementation Plan

## Current State: 30% → Target: 100% "World's Best DocOps Engineer"

**Developer Feedback Summary:**
- Good v0 foundation with themes, patterns, styles, rules
- Missing critical DocOps pillars: CI/CD, diagnostics, style automation, git conventions
- Need pure NLP interface: "godoc build me a site" (no command memorization)
- Must feel like an expert DocOps engineer, not just a theme picker

## Implementation Phases (4.5 Days Total)

### Phase 1: Core Fixes & Pure NLP (2 hours)
**Priority: CRITICAL - Blocks everything else**

#### 1.1 Fix Loader Paths
- [ ] Align `loadIntel.js` paths with actual directory structure
- [ ] Update from `assets/intel/` to correct path
- [ ] Test loading from both dev and installed contexts

#### 1.2 Add Checksums
- [ ] Generate SHA256 checksums for all intel files
- [ ] Add integrity checking to loader
- [ ] Update manifest.json with checksums

#### 1.3 Pure NLP Interface
- [ ] Create `godoc.js` NLP router for all commands
- [ ] Map natural language to commands:
  - "build me a site" → init
  - "fix my build" → diagnose
  - "check my docs" → review
  - "deploy this" → deploy
- [ ] Remove need for command memorization

### Phase 2: Style Automation System (1 day)
**Priority: HIGH - Core DocOps capability**

#### 2.1 Style System Files
```
docs/.style/
├── glossary.json      # Preferred terms, casing, banned words
├── exceptions.json    # Path-specific rule exceptions
└── compiled.md       # Human-readable style guide
```

#### 2.2 Enhanced Rules with Autofix
- [ ] Add `selector` field for path/content-type scoping
- [ ] Add `enforce` field with autofix capabilities:
  - `mustWrap`: italic/bold/code
  - `autoFix`: true/false
  - `transform`: casing/replacement
- [ ] Implement "italicize user inputs" rule as example

#### 2.3 Style Mutation CLI
- [ ] `godoc style add "user inputs italicized"`
- [ ] Compiles to machine rule + updates style guide
- [ ] Bidirectional sync: JSON ↔ Markdown

### Phase 3: Diagnostic Recipes (1 day)
**Priority: HIGH - Fixes builds automatically**

#### 3.1 Create diagnostics.json
```json
{
  "recipes": [
    "hugo.shortcode.missing",
    "hugo.module.notfound",
    "netlify.build.failed",
    "vercel.config.invalid",
    "gitlab.raw.markdown",
    "broken.internal.links",
    "malformed.tables",
    "frontmatter.invalid"
  ]
}
```

#### 3.2 Recipe Structure
- [ ] Pattern matching on error messages
- [ ] Root cause explanation
- [ ] Automated checks to run
- [ ] Suggested patches/fixes
- [ ] Links to documentation

#### 3.3 Auto-fix Framework
- [ ] Patch generation for common issues
- [ ] Dry-run mode for safety
- [ ] Rollback capability

### Phase 4: CI/CD Templates (0.5 day)
**Priority: HIGH - Production readiness**

#### 4.1 GitHub Actions Template
```yaml
name: GOdoc DocOps Pipeline
on: [push, pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx godoc review --report json
      - run: npx godoc diagnose --fix
```

#### 4.2 GitLab CI Template
- [ ] Parallel structure to GitHub
- [ ] Cache optimization
- [ ] Deploy stages

#### 4.3 Configurable Knobs
- [ ] Link checking (on/off, external/internal)
- [ ] Accessibility audit levels
- [ ] Style enforcement severity
- [ ] Fail-on-warning policy
- [ ] Deploy targets (Netlify/Vercel/Pages)

### Phase 5: Git Conventions Pack (0.5 day)
**Priority: MEDIUM - Team scalability**

#### 5.1 Conventional Commits
```json
{
  "types": ["feat", "fix", "docs", "style", "refactor"],
  "scopes": ["content", "theme", "ci", "config"],
  "emojis": {"feat": "✨", "fix": "🐛", "docs": "📚"}
}
```

#### 5.2 PR/Issue Templates
- [ ] pull_request_template.md
- [ ] issue_templates/bug.md
- [ ] issue_templates/feature.md
- [ ] issue_templates/docs.md

#### 5.3 Branch Naming Rules
- [ ] Pattern enforcement
- [ ] Auto-suggestion from issue titles

### Phase 6: Expand Theme & SSG Coverage (0.5 day)
**Priority: MEDIUM - Market coverage**

#### 6.1 Double Theme Count
- [ ] Add 6 more Hugo themes (total: 12)
- [ ] Include enterprise themes
- [ ] Add multilingual themes

#### 6.2 Docusaurus Support
- [ ] Basic metadata structure
- [ ] Routing logic
- [ ] Scaffolding templates

#### 6.3 MkDocs Support
- [ ] Basic metadata structure
- [ ] Material theme configuration
- [ ] Plugin recommendations

### Phase 7: Report Schema & CI Integration (0.5 day)
**Priority: HIGH - Machine readability**

#### 7.1 JSON Report Schema
```json
{
  "version": "1.0.0",
  "timestamp": "2025-08-09T10:00:00Z",
  "summary": {
    "errors": 0,
    "warnings": 3,
    "info": 12
  },
  "issues": [...]
}
```

#### 7.2 Exit Codes
- [ ] 0: Success, no issues
- [ ] 1: Errors found
- [ ] 2: Warnings (when strict mode)
- [ ] 3: Build failure

## Command Evolution: Pure NLP

### Before (Command-based):
```bash
godoc init --describe "fintech API"
godoc review --fix
godoc deploy --platform netlify
```

### After (Pure NLP):
```bash
godoc "build me a fintech API documentation site"
godoc "fix any style issues in my docs"
godoc "deploy this to netlify"
godoc "why is my build failing"
godoc "make all UI elements italic"
```

## Success Metrics

### Week 1 (After 4.5 days):
- ✅ Pure NLP interface working
- ✅ 8-12 diagnostic recipes fixing builds
- ✅ Style automation with autofix
- ✅ CI/CD templates for GitHub/GitLab
- ✅ Git conventions established
- ✅ 12+ themes available

### Week 2:
- ✅ Docusaurus/MkDocs basic support
- ✅ 20+ diagnostic recipes
- ✅ Style guide bidirectional sync
- ✅ Advanced autofix patterns

### Month 1:
- ✅ Full DocOps engineer replacement
- ✅ 95% build failure auto-resolution
- ✅ Complete style enforcement
- ✅ Multi-SSG support

## File Structure After Implementation

```
assets/intel/
├── manifest.json          # With checksums
├── themes.json           # 12+ themes
├── styles.json           # Industry styles
├── patterns.json         # Content patterns
├── rules.json            # Enhanced with autofix
├── diagnostics.json      # NEW: Build fix recipes
├── ci/                   # NEW: CI/CD templates
│   ├── github-actions.yml
│   └── gitlab-ci.yml
└── git/                  # NEW: Git conventions
    ├── conventional.json
    └── templates/

docs/.style/              # NEW: Style system
├── glossary.json
├── exceptions.json
└── compiled.md

src/
├── nlp-router.js        # NEW: Natural language processor
├── diagnostics.js       # NEW: Build fixer
├── style-engine.js      # NEW: Style automation
└── intel/loadIntel.js   # FIXED: Correct paths
```

## Implementation Order

1. **Day 1 Morning**: Phase 1 (Core fixes + NLP)
2. **Day 1 Afternoon**: Phase 2 (Style automation)
3. **Day 2**: Phase 3 (Diagnostics)
4. **Day 3 Morning**: Phase 4 (CI/CD)
5. **Day 3 Afternoon**: Phase 5 (Git conventions)
6. **Day 4 Morning**: Phase 6 (Expand coverage)
7. **Day 4 Afternoon**: Phase 7 (Report schema)
8. **Day 5**: Testing, integration, documentation

## Risk Mitigation

1. **NLP Complexity**: Start with simple keyword mapping, evolve gradually
2. **Autofix Safety**: Always dry-run first, require confirmation for destructive changes
3. **Multi-SSG Support**: Focus on metadata/routing first, full support later
4. **Breaking Changes**: Version the intel pack, support migration

## Definition of Done

The intel pack becomes a "World's Best DocOps Engineer" when:
1. Users never need to read documentation to use it
2. It fixes 95% of build failures automatically
3. It enforces style consistently without human intervention
4. It integrates seamlessly with existing CI/CD pipelines
5. It feels like having an expert on the team

---

**Next Step**: Begin Phase 1 - Core fixes and pure NLP interface
**Estimated Completion**: 4.5 days of focused development
**Outcome**: From 30% → 100% DocOps engineer capability