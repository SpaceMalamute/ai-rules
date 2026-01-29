# Claude Configuration Repository

This repository contains Claude Code configuration boilerplates for different technologies.

## Repository Purpose

Create and maintain Claude Code configuration files (CLAUDE.md, settings.json, rules, skills) that can be copied into projects.

## Structure Convention

```
ai/
├── [technology]/              # e.g., angular, next, vue
│   ├── CLAUDE.md              # Main instructions (import _shared)
│   └── .claude/
│       ├── settings.json      # Permissions, hooks
│       └── rules/
│           └── [topic].md     # Path-specific rules
│
├── _shared/                   # Cross-technology conventions
│   ├── CLAUDE.md              # Git, TypeScript, code quality
│   └── .claude/
│       └── skills/
│           └── [skill]/
│               └── SKILL.md
│
├── CLAUDE.md                  # This file (repo instructions)
└── README.md                  # User documentation
```

## Writing Configuration Files

### CLAUDE.md Format

```markdown
# [Technology] Project Guidelines

@../\_shared/CLAUDE.md # Always import shared conventions

## Stack

- List technologies and versions

## Architecture

- Folder structure
- Naming conventions
- Patterns (smart/dumb, server/client, etc.)

## Code Style

- Framework-specific rules
- What to use, what to avoid

## Commands

- Build, test, lint commands

## Common Patterns

- Code examples for frequent tasks
```

### Rules Files (.claude/rules/\*.md)

Rules apply only to files matching the `paths` glob patterns.

```markdown
---
paths:
  - "src/**/*.tsx"
  - "app/**/*.ts"
---

# Rule Title

## When This Applies

Explain the context

## Rules

- Rule 1 with example
- Rule 2 with example

## Examples

Show good and bad patterns
```

### Skills (.claude/skills/[name]/SKILL.md)

```markdown
---
name: skill-name
description: When to use this skill
argument-hint: [optional-args]
---

# Skill Instructions

What Claude should do when this skill is invoked.

## Behavior

- Step 1
- Step 2

## Format

How to structure responses
```

### settings.json

```json
{
  "permissions": {
    "allow": ["Bash(npm run *)", "Read", "Edit"],
    "deny": ["Bash(rm -rf *)", "Read(.env)"]
  }
}
```

## Guidelines for Writing Configs

1. **Be specific** - Include exact syntax, not vague guidelines
2. **Show examples** - Good and bad patterns with code
3. **Source claims** - Link to official docs when possible
4. **Stay current** - Use latest framework versions and patterns
5. **Import shared** - Always start with `@../_shared/CLAUDE.md`
6. **Test patterns** - Verify code examples are valid

## Adding a New Technology

1. Create folder: `mkdir -p [tech]/.claude/rules`
2. Create `[tech]/CLAUDE.md` with `@../_shared/CLAUDE.md` import
3. Add technology-specific rules in `.claude/rules/`
4. Add permissions in `.claude/settings.json` if needed
5. Update `README.md` with the new technology

## Language

All files in this repository must be written in **English**.
