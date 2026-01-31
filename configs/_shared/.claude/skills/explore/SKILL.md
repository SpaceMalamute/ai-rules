---
name: explore
description: Deep analysis of a repository with detailed documentation
argument-hint: [path-or-depth]
---

# Explore Repository Skill

You are now in **deep analysis mode**. Analyze the codebase thoroughly and produce comprehensive documentation.

## Target

If an argument is provided, analyze that path: `$ARGUMENTS`
If no argument, analyze the current working directory.

## Analysis Process

### Phase 1: Discovery

Gather raw information:

1. **Project Metadata**
   - `package.json`, `pyproject.toml`, `*.csproj`, `Cargo.toml`, etc.
   - README files
   - License

2. **File Structure**
   - Top-level directories
   - Key configuration files
   - Total file count by extension

3. **Git History** (if available)
   - Number of commits
   - Contributors count
   - Most active files
   - Recent activity

### Phase 2: Technology Stack

Identify all technologies:

| Category | What to Find |
|----------|--------------|
| Language(s) | Primary + secondary languages |
| Framework(s) | Web, API, CLI frameworks |
| Database | ORM, drivers, migrations |
| Testing | Test framework, coverage tools |
| Build | Bundler, compiler, task runner |
| CI/CD | Pipeline configs |
| Infrastructure | Docker, K8s, cloud configs |
| Code Quality | Linters, formatters, type checkers |

### Phase 3: Architecture Analysis

Understand the design:

1. **Architecture Pattern**
   - Monolith / Microservices / Monorepo
   - Clean Architecture / Hexagonal / MVC / etc.
   - Module organization

2. **Entry Points**
   - Main files
   - CLI commands
   - API routes
   - Event handlers

3. **Data Flow**
   - How data enters the system
   - Processing layers
   - Storage mechanisms
   - External integrations

4. **Dependencies Graph**
   - Internal module dependencies
   - External service integrations
   - Circular dependency detection

### Phase 4: Code Patterns

Document coding conventions:

1. **Naming Conventions**
   - File naming patterns
   - Class/function naming style
   - Variable conventions

2. **Common Patterns**
   - Dependency injection
   - Repository pattern
   - Factory pattern
   - Observer/Event patterns
   - Error handling approach

3. **Testing Strategy**
   - Test organization
   - Coverage targets
   - Mocking approach

### Phase 5: Documentation Review

Assess existing documentation:

- README completeness
- API documentation
- Code comments quality
- Architecture Decision Records (ADRs)

## Output Format

Generate a structured report:

```markdown
# Repository Analysis: [Project Name]

## Overview
[2-3 paragraph executive summary]

## Quick Facts
| Metric | Value |
|--------|-------|
| Primary Language | |
| Framework | |
| Architecture | |
| Test Coverage | |
| Last Updated | |
| Contributors | |

## Technology Stack

### Core
- **Language**: [version]
- **Framework**: [version]
- **Runtime**: [version]

### Data
- **Database**:
- **ORM/Driver**:
- **Cache**:

### DevOps
- **CI/CD**:
- **Container**:
- **Deployment**:

### Quality
- **Linter**:
- **Formatter**:
- **Type Checker**:

## Architecture

### High-Level Structure
```
[ASCII diagram or tree view]
```

### Key Modules
| Module | Purpose | Key Files |
|--------|---------|-----------|
| | | |

### Data Flow
[Description of how data moves through the system]

### External Integrations
| Service | Purpose | Location |
|---------|---------|----------|
| | | |

## Code Patterns

### Conventions Used
- [Pattern 1]: [Where/How]
- [Pattern 2]: [Where/How]

### Strengths
- [What's done well]

### Areas for Improvement
- [Potential improvements]

## Entry Points

| Type | File | Description |
|------|------|-------------|
| Main | | |
| API | | |
| CLI | | |

## Getting Started

### Prerequisites
- [Requirement 1]
- [Requirement 2]

### Setup
```bash
[Setup commands]
```

### Development
```bash
[Dev commands]
```

### Testing
```bash
[Test commands]
```

## File Statistics

| Extension | Count | % of Codebase |
|-----------|-------|---------------|
| | | |

## Recommendations

### For New Contributors
1. [Start here]
2. [Then explore]
3. [Key files to understand]

### Technical Debt
| Issue | Severity | Location |
|-------|----------|----------|
| | | |
```

## Behavior

1. **Be thorough** - Read actual files, don't assume
2. **Be accurate** - Verify versions and configurations
3. **Be useful** - Focus on actionable insights
4. **Be objective** - Note both strengths and weaknesses
5. **Show evidence** - Include file paths and line references

## Tools to Use

- `Glob` - Find files by pattern
- `Grep` - Search code content
- `Read` - Read file contents
- `Bash` - Run commands (git log, package managers)

## Depth Levels

If user specifies depth:
- **quick**: Overview + tech stack only
- **standard**: Full analysis (default)
- **deep**: Include dependency analysis, security scan, performance patterns

## Exit

After presenting the analysis, ask:
- "Want me to generate a CLAUDE.md based on this analysis?"
- "Any specific area you'd like me to explore deeper?"
