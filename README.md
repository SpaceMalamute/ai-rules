# AI Rules

[![npm version](https://badge.fury.io/js/@malamute/ai-rules.svg)](https://www.npmjs.com/package/@malamute/ai-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**Supercharge Claude Code with framework-specific rules, skills, and best practices.**

AI Rules installs curated configuration boilerplates that teach Claude Code your stack's conventions, patterns, and guardrails. Stop explaining the same things over and over — let Claude understand your architecture from the start.

## Why Use This?

| Without AI Rules | With AI Rules |
|------------------|---------------|
| Claude uses generic patterns | Claude follows your framework's idioms |
| You repeat "use signals, not decorators" | Angular 21 patterns are built-in |
| Security issues slip through | OWASP Top 10 rules catch vulnerabilities |
| Inconsistent code style | Consistent conventions across the team |

## Quick Start

```bash
# Interactive setup (recommended)
npx @malamute/ai-rules init

# Or specify your stack directly
npx @malamute/ai-rules init angular nestjs --all
```

That's it. Claude Code now understands your stack.

## Installation

```bash
# Global install
npm install -g @malamute/ai-rules

# Or use with npx (no install needed)
npx @malamute/ai-rules <command>
```

## Supported Technologies

| Technology | Stack | Version |
|------------|-------|---------|
| **Angular** | Nx + NgRx + Signals + Vitest | 21+ |
| **Next.js** | App Router + React 19 + Server Components | 15+ |
| **NestJS** | Prisma/TypeORM + Passport + Vitest | 11+ |
| **.NET** | Clean Architecture + MediatR + EF Core | 9+ |
| **Python** | FastAPI/Flask + SQLAlchemy 2.0 + pytest | 3.12+ |

## Commands

```bash
ai-rules init [tech...]     # Install configs (interactive if no tech)
ai-rules update             # Update to latest rules
ai-rules status             # Show installation info
ai-rules list               # List available technologies
```

### Options

| Option | Description |
|--------|-------------|
| `--with-skills` | Add skills: `/learning`, `/review`, `/debug`, etc. |
| `--with-rules` | Add shared rules: security, performance, accessibility |
| `--all` | Include both skills and rules |
| `--dry-run` | Preview changes without writing files |
| `--target <dir>` | Install to a specific directory |
| `--force` | Overwrite without creating backups |

## What Gets Installed

```
your-project/
├── CLAUDE.md                    # Architecture & conventions
└── .claude/
    ├── settings.json            # Allowed/denied commands
    ├── rules/                   # Framework-specific patterns
    │   ├── components.md
    │   ├── state.md
    │   └── testing.md
    └── skills/                  # Optional workflows
        ├── learning/
        ├── review/
        └── debug/
```

### CLAUDE.md

The main instruction file. Contains:
- Project architecture overview
- Technology stack and versions
- Coding conventions (naming, structure, patterns)
- Commands to run (build, test, lint)

### Rules

Context-aware rules that activate based on file paths:

```markdown
---
paths:
  - "**/*.component.ts"
---
# Angular Component Rules
- Use `ChangeDetectionStrategy.OnPush`
- Use `input()`, `output()`, not decorators
- Template in separate `.html` file
```

### Skills

Interactive workflows invoked with `/skill-name`:

| Skill | Description |
|-------|-------------|
| `/learning` | Pedagogical mode — explains before coding |
| `/review` | Code review with security/perf checklist |
| `/debug` | Structured debugging workflow |
| `/spec` | Write technical spec before implementing |
| `/fix-issue` | Analyze GitHub issue and implement fix |
| `/generate-tests` | Generate comprehensive tests |

<details>
<summary><strong>See all 13 skills</strong></summary>

| Skill | Usage | Description |
|-------|-------|-------------|
| `/learning` | `/learning nextjs` | Explains concepts before implementing |
| `/review` | `/review src/users/` | Code review with checklist |
| `/spec` | `/spec add auth` | Technical specification |
| `/debug` | `/debug TypeError...` | Systematic debugging |
| `/fix-issue` | `/fix-issue 123` | Fix GitHub issue |
| `/review-pr` | `/review-pr 456` | Review pull request |
| `/generate-tests` | `/generate-tests src/user.ts` | Generate tests |
| `/api-endpoint` | `/api-endpoint POST /users` | Generate API endpoint |
| `/migration` | `/migration add users` | Database migration |
| `/security-audit` | `/security-audit` | Security analysis |
| `/docker` | `/docker` | Dockerfile generation |
| `/deploy` | `/deploy` | Deployment config |
| `/explore` | `/explore` | Repository analysis |

</details>

## Shared Rules

Cross-framework rules included with `--with-rules`:

| Rule | What It Covers |
|------|----------------|
| **security.md** | OWASP Top 10: injection, XSS, CSRF, secrets |
| **performance.md** | N+1 queries, caching, lazy loading |
| **accessibility.md** | WCAG 2.1, semantic HTML, ARIA |
| **testing-patterns.md** | AAA pattern, mocking, coverage |
| **error-handling.md** | Error categories, response formats |
| **git.md** | Conventional commits, branching, PRs |
| **observability.md** | Logging, metrics, tracing |

## Examples

### Fullstack Setup

```bash
# Angular frontend + NestJS backend
ai-rules init angular nestjs --all

# Next.js frontend + Python backend
ai-rules init nextjs python --all
```

### Preview Before Installing

```bash
ai-rules init angular --dry-run
```

Output:
```
DRY RUN - No files will be modified

ℹ Would install to: /your/project

ℹ Would install angular...
○   CLAUDE.md (create)
○   settings.json (create)
○   rules/ (8 files)

Summary:
  10 file(s) would be created
  0 file(s) would be modified
```

### Update Configs

```bash
# Check current version
ai-rules status

# Preview updates
ai-rules update --dry-run

# Apply updates (auto-backup enabled)
ai-rules update
```

## Technology Conventions

<details>
<summary><strong>Angular</strong></summary>

| Aspect | Convention |
|--------|------------|
| Components | Standalone, OnPush change detection |
| Signals | `input()`, `output()`, `model()` functions |
| State | NgRx with Entity Adapter + Functional Effects |
| Structure | Nx monorepo with feature/ui/data-access libs |
| Tests | Vitest + Marble testing |

</details>

<details>
<summary><strong>Next.js</strong></summary>

| Aspect | Convention |
|--------|------------|
| Components | Server Components by default |
| Client | `'use client'` directive for interactivity |
| Data | Server Components + fetch, Server Actions |
| State | Zustand (simple) / Redux Toolkit (complex) |
| Structure | App Router with route groups |

</details>

<details>
<summary><strong>NestJS</strong></summary>

| Aspect | Convention |
|--------|------------|
| Architecture | Modular Monolith |
| Validation | class-validator + class-transformer |
| Database | Prisma (modern) / TypeORM (decorators) |
| Auth | Passport + JWT |
| Tests | Vitest + Supertest |

</details>

<details>
<summary><strong>.NET</strong></summary>

| Aspect | Convention |
|--------|------------|
| Architecture | Clean Architecture (Domain → App → Infra) |
| API | Minimal APIs (preferred) or Controllers |
| CQRS | MediatR for Commands/Queries |
| ORM | Entity Framework Core |
| Tests | xUnit + NSubstitute + FluentAssertions |

</details>

<details>
<summary><strong>Python</strong></summary>

| Aspect | Convention |
|--------|------------|
| Framework | FastAPI (async) / Flask (traditional) |
| Validation | Pydantic v2 / Marshmallow |
| ORM | SQLAlchemy 2.0 with async support |
| Tests | pytest + httpx |
| Migrations | Alembic |

</details>

## How It Works

1. **CLAUDE.md** is read by Claude Code at session start
2. **Rules** activate based on file paths you're editing
3. **Skills** are invoked on-demand with `/skill-name`
4. **Settings** define what commands Claude can run

Claude Code sees your conventions as first-class instructions, not just suggestions in the chat.

## Contributing

```bash
# Clone and install
git clone https://github.com/malamute/ai-rules.git
cd ai-rules
npm install

# Run tests
npm test

# Add a new technology
mkdir configs/your-tech
# Add CLAUDE.md and .claude/rules/
```

### Adding a Technology

1. Create `configs/[tech]/CLAUDE.md` — start with `@../_shared/CLAUDE.md`
2. Add rules in `configs/[tech]/.claude/rules/`
3. Add `configs/[tech]/.claude/settings.json` for permissions
4. Add tests
5. Submit a PR

## License

MIT © Mehdi Chaabi
