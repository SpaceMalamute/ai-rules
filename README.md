# AI Rules

[![npm version](https://badge.fury.io/js/@malamute/ai-rules.svg)](https://www.npmjs.com/package/@malamute/ai-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

**Supercharge your AI coding tools with framework-specific rules, skills, and best practices.**

AI Rules installs curated configuration boilerplates that teach your AI tools your stack's conventions, patterns, and guardrails. Works with **Claude Code**, **Cursor**, **GitHub Copilot**, and **Windsurf**. Stop explaining the same things over and over — let your AI understand your architecture from the start.

## Why Use This?

| Without AI Rules                         | With AI Rules                                |
| ---------------------------------------- | -------------------------------------------- |
| You repeat the same conventions to each tool | Configure once, apply to Claude, Cursor, Copilot, Windsurf |
| Generic patterns, outdated idioms        | Framework-specific rules (Angular 21, React 19, ...) |
| Security issues slip through             | OWASP Top 10 rules catch vulnerabilities     |
| Different style per developer per tool   | Consistent conventions across the team       |

## Quick Start

```bash
# Interactive setup (recommended)
npx @malamute/ai-rules init

# Or specify your stack directly
npx @malamute/ai-rules init angular nestjs

# Multi-tool setup
npx @malamute/ai-rules init angular --targets claude,cursor
```

That's it. Your AI tools now understand your stack.

## Installation

```bash
# Global install
npm install -g @malamute/ai-rules

# Or use with npx (no install needed)
npx @malamute/ai-rules <command>
```

## Supported AI Tools

| Tool             | Output Directory           | Rules | Skills | Settings |
| ---------------- | -------------------------- | ----- | ------ | -------- |
| **Claude Code**  | `.claude/rules/`           | yes   | yes    | yes      |
| **Cursor**       | `.cursor/rules/`           | yes   | -      | -        |
| **GitHub Copilot** | `.github/instructions/`  | yes   | -      | -        |
| **Windsurf**     | `.windsurf/rules/`         | yes   | workflows | -     |

## Supported Technologies

| Technology   | Stack                                     | Version |
| ------------ | ----------------------------------------- | ------- |
| **Angular**  | Nx + NgRx + Signals + Vitest              | 21+     |
| **React**    | Vite + Vitest + Testing Library           | 19+     |
| **Next.js**  | App Router + React 19 + Server Components | 15+     |
| **NestJS**   | Prisma/TypeORM + Passport + Vitest        | 11+     |
| **AdonisJS** | Lucid ORM + VineJS + Japa                 | 6+      |
| **.NET**     | Clean Architecture + MediatR + EF Core    | 9+      |
| **FastAPI**  | Pydantic v2 + SQLAlchemy 2.0 + pytest     | 0.115+  |
| **Flask**    | Marshmallow + SQLAlchemy 2.0 + pytest     | 3.0+    |
| **Hono**     | Zod + Vitest + Multi-runtime              | 4+      |
| **Elysia**   | TypeBox + Bun + Eden Treaty               | 1.4+    |

## Commands

```bash
ai-rules init [tech...]     # Install configs (interactive if no tech)
ai-rules add <tech>         # Add technology to existing installation
ai-rules update             # Update to latest rules
ai-rules status             # Show installation info
ai-rules list               # List available technologies
```

### Options

| Option              | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `--targets <t1,t2>` | AI tools to target (default: `claude`)                    |
| `--minimal`         | Skip skills and shared rules (only tech rules + settings) |
| `--dry-run`         | Preview changes without writing files                     |
| `--dir <directory>` | Install to a specific directory                           |
| `--force`           | Overwrite without creating backups                        |

By default, `init` installs everything (skills + shared rules) for Claude Code. Use `--targets` to install for multiple AI tools, and `--minimal` to skip extras.

## What Gets Installed

### Claude Code (default)

```
your-project/
├── CLAUDE.md                    # Your project-specific info (not touched)
└── .claude/
    ├── settings.json            # Allowed/denied commands
    ├── rules/                   # Framework-specific patterns
    │   ├── nextjs/
    │   │   ├── core.md          # Stack, architecture, conventions
    │   │   ├── components.md
    │   │   └── ...
    │   ├── conventions/         # Shared conventions
    │   │   └── core.md
    │   └── security/
    └── skills/                  # Optional workflows
        ├── learning/
        ├── review/
        └── debug/
```

### Multi-target (e.g. `--targets claude,cursor,copilot`)

```
your-project/
├── .claude/                     # Claude Code
│   ├── settings.json
│   ├── rules/angular/core.md
│   └── skills/
├── .cursor/                     # Cursor
│   ├── rules/angular/core.mdc  # .mdc extension, paths → globs
│   └── .cursorrules             # Aggregated global rules
├── .github/                     # GitHub Copilot
│   ├── instructions/angular/core.instructions.md
│   └── copilot-instructions.md  # Aggregated global rules
└── .windsurf/                   # Windsurf
    ├── rules/angular/core.md    # paths → globs + trigger
    ├── global_rules.md          # Aggregated global rules
    └── workflows/               # Skills → Workflows
```

> **Note:** Your project's `CLAUDE.md` is never modified. Use it for project-specific context (business domain, team conventions, etc.).

### Rules

Context-aware rules that activate based on file paths:

```markdown
---
description: "Angular component patterns and @defer"
paths:
  - '**/*.component.ts'
---

# Angular Component Rules

- Use `ChangeDetectionStrategy.OnPush`
- Use `input()`, `output()`, not decorators
- Template in separate `.html` file
```

### Skills

Interactive workflows invoked with `/skill-name`:

| Skill             | Description                               |
| ----------------- | ----------------------------------------- |
| `/learning`       | Pedagogical mode — explains before coding |
| `/review`         | Code review with security/perf checklist  |
| `/debug`          | Structured debugging workflow             |
| `/spec`           | Write technical spec before implementing  |
| `/sudden-death`   | Kill indecision with rapid-fire questions |
| `/fix-issue`      | Analyze GitHub issue and implement fix    |
| `/generate-tests` | Generate comprehensive tests              |

<details>
<summary><strong>See all 16 skills</strong></summary>

| Skill             | Usage                         | Description                           |
| ----------------- | ----------------------------- | ------------------------------------- |
| `/learning`       | `/learning nextjs`            | Explains concepts before implementing |
| `/review`         | `/review src/users/`          | Code review with checklist            |
| `/spec`           | `/spec add auth`              | Technical specification               |
| `/sudden-death`   | `/sudden-death backend`       | Kill indecision, get a verdict        |
| `/debug`          | `/debug TypeError...`         | Systematic debugging                  |
| `/fix-issue`      | `/fix-issue 123`              | Fix GitHub issue                      |
| `/review-pr`      | `/review-pr 456`              | Review pull request                   |
| `/generate-tests` | `/generate-tests src/user.ts` | Generate tests                        |
| `/api-endpoint`   | `/api-endpoint POST /users`   | Generate API endpoint                 |
| `/migration`      | `/migration add users`        | Database migration                    |
| `/security-audit` | `/security-audit`             | Security analysis                     |
| `/docker`         | `/docker`                     | Dockerfile generation                 |
| `/deploy`         | `/deploy`                     | Deployment config                     |
| `/explore`        | `/explore`                    | Repository analysis                   |
| `/nx-affected`    | `/nx-affected`                | Run affected commands on changes      |
| `/nx-lib`         | `/nx-lib users-feature`       | Generate Nx library                   |

</details>

## Shared Rules

Cross-framework rules included by default (use `--minimal` to skip):

| Category | Rules | What They Cover |
| -------- | ----- | --------------- |
| **conventions** | core, git, interaction, principles, documentation, npm, performance | Naming, commits, communication, SOLID, docs |
| **quality** | testing-patterns, observability | AAA pattern, mocking, structured logging, tracing |
| **security** | security, secrets-management | OWASP Top 10, env vars, vault patterns |
| **devops** | docker, ci-cd, nx | Dockerfile, GitHub Actions, Nx monorepo |
| **domain** | accessibility, api-design | WCAG 2.1, REST conventions |
| **lang** | typescript (3), python (10), csharp (3) | Language-specific patterns (auto-selected by tech) |

## Recommended MCP Servers

MCP (Model Context Protocol) servers extend your AI tool's capabilities with framework-specific context. These are **not installed by AI Rules** — set them up manually via `claude mcp add` or `~/.claude/settings.json`.

| Server | Technologies | Purpose | Setup |
|--------|-------------|---------|-------|
| [GitHub](https://github.com/github/github-mcp-server) | All | Repository management, PRs, issues | `claude mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp"}'` |
| [Next.js DevTools](https://www.npmjs.com/package/next-devtools-mcp) | Next.js | Project context, diagnostics | `claude mcp add next-devtools -- npx -y next-devtools-mcp@latest` |
| [Angular CLI](https://angular.dev/tools/cli/mcp) | Angular | Best practices, docs search | `claude mcp add angular-cli -- npx -y @angular/cli mcp` |
| [Clerk](https://clerk.com/docs/mcp) | All (auth) | Authentication patterns, SDK snippets | `claude mcp add-json clerk '{"type":"http","url":"https://mcp.clerk.com/sse"}'` |

> **Tip:** After adding an MCP server, verify with `claude mcp list`.

## Examples

### Fullstack Setup

```bash
# Angular frontend + NestJS backend
ai-rules init angular nestjs

# Next.js frontend + FastAPI backend
ai-rules init nextjs fastapi

# Add a technology to existing installation
ai-rules add nestjs

# Minimal install (no skills/shared rules)
ai-rules init angular --minimal
```

### Multi-Tool Setup

```bash
# Install for Claude Code + Cursor
ai-rules init angular --targets claude,cursor

# Install for all supported tools
ai-rules init angular --targets claude,cursor,copilot,windsurf

# Install for Cursor only
ai-rules init angular --targets cursor
```

### Preview Before Installing

```bash
ai-rules init angular --targets claude,cursor --dry-run
```

Output:

```
DRY RUN - No files will be modified

ℹ Would install to: /your/project
ℹ Targets: claude, cursor

ℹ Would install for Claude Code...
○   settings.json (create)
○   rules/angular/ (13 files)

ℹ Would install for Cursor...
○   rules/angular/ (13 files)
○   .cursorrules (aggregated global rules)

Summary:
  27 file(s) would be created
  0 file(s) would be modified
```

### Update Configs

```bash
# Check current version
ai-rules status

# Preview updates
ai-rules update --dry-run

# Apply updates (auto-backup enabled, reinstalls all targets)
ai-rules update
```

## Technology Conventions

<details>
<summary><strong>Angular</strong></summary>

| Aspect     | Convention                                    |
| ---------- | --------------------------------------------- |
| Components | Standalone, OnPush change detection           |
| Signals    | `input()`, `output()`, `model()` functions    |
| State      | NgRx with Entity Adapter + Functional Effects |
| Structure  | Nx monorepo with feature/ui/data-access libs  |
| Tests      | Vitest + Marble testing                       |

</details>

<details>
<summary><strong>React</strong></summary>

| Aspect     | Convention                                |
| ---------- | ----------------------------------------- |
| Components | Functional components with hooks          |
| State      | useState, Context, Zustand/Jotai          |
| Server     | TanStack Query for server state           |
| Forms      | React 19 actions, useActionState          |
| Tests      | Vitest + React Testing Library            |

</details>

<details>
<summary><strong>Next.js</strong></summary>

| Aspect     | Convention                                 |
| ---------- | ------------------------------------------ |
| Components | Server Components by default               |
| Client     | `'use client'` directive for interactivity |
| Data       | Server Components + fetch, Server Actions  |
| State      | Zustand (simple) / Redux Toolkit (complex) |
| Structure  | App Router with route groups               |

</details>

<details>
<summary><strong>NestJS</strong></summary>

| Aspect       | Convention                             |
| ------------ | -------------------------------------- |
| Architecture | Modular Monolith                       |
| Validation   | class-validator + class-transformer    |
| Database     | Prisma (modern) / TypeORM (decorators) |
| Auth         | Passport + JWT                         |
| Tests        | Vitest + Supertest                     |

</details>

<details>
<summary><strong>AdonisJS</strong></summary>

| Aspect       | Convention                          |
| ------------ | ----------------------------------- |
| Architecture | MVC with Services layer             |
| Validation   | VineJS                              |
| ORM          | Lucid (Active Record)               |
| Auth         | Access Tokens / Session-based       |
| Tests        | Japa                                |

</details>

<details>
<summary><strong>.NET</strong></summary>

| Aspect       | Convention                                |
| ------------ | ----------------------------------------- |
| Architecture | Clean Architecture (Domain → App → Infra) |
| API          | Minimal APIs (preferred) or Controllers   |
| CQRS         | MediatR for Commands/Queries              |
| ORM          | Entity Framework Core                     |
| Tests        | xUnit + NSubstitute + FluentAssertions    |

</details>

<details>
<summary><strong>FastAPI</strong></summary>

| Aspect     | Convention                        |
| ---------- | --------------------------------- |
| Framework  | FastAPI with async/await          |
| Validation | Pydantic v2                       |
| ORM        | SQLAlchemy 2.0 with async support |
| Tests      | pytest + httpx                    |
| Migrations | Alembic                           |

</details>

<details>
<summary><strong>Flask</strong></summary>

| Aspect     | Convention                                          |
| ---------- | --------------------------------------------------- |
| Framework  | Flask 3.0 with Application Factory                  |
| Validation | Marshmallow schemas                                 |
| ORM        | SQLAlchemy 2.0                                      |
| Tests      | pytest                                              |
| Extensions | Flask-SQLAlchemy, Flask-Migrate, Flask-JWT-Extended |

</details>

<details>
<summary><strong>Hono</strong></summary>

| Aspect     | Convention                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Hono v4 with Web Standard APIs                  |
| Validation | Zod + @hono/zod-validator                       |
| Routing    | Chained route modules with RPC type inference   |
| Tests      | Vitest + app.request() / testClient()           |
| Runtimes   | Cloudflare Workers, Node.js, Bun, Deno          |

</details>

<details>
<summary><strong>Elysia</strong></summary>

| Aspect     | Convention                                      |
| ---------- | ----------------------------------------------- |
| Framework  | Elysia v1.4 with Bun runtime                   |
| Validation | TypeBox (built-in Elysia.t) + Standard Schema   |
| Routing    | Method chaining with end-to-end type inference  |
| Tests      | bun:test + .handle() / Eden Treaty              |
| Client     | Eden Treaty for type-safe client-server         |

</details>

## How It Works

1. **Rules** are loaded by your AI tool based on file paths you're editing
2. **`rules/core.md`** with `alwaysApply: true` provides framework conventions
3. **Skills** are invoked on-demand with `/skill-name` (Claude Code only)
4. **Settings** define what commands Claude can run (Claude Code only)
5. **Adapters** transform rules to each tool's format automatically:
   - Claude: `paths` frontmatter, `.md` extension
   - Cursor: `globs` frontmatter, `.mdc` extension
   - Copilot: `applyTo` frontmatter, `.instructions.md` extension
   - Windsurf: `globs` + `trigger: glob` frontmatter, `.md` extension

Your project's `CLAUDE.md` stays clean for project-specific context, while framework conventions live in rules.

## Contributing

```bash
# Clone and install
git clone https://github.com/malamute/ai-rules.git
cd ai-rules
npm install

# Run tests
npm test

# Add a new technology
mkdir -p configs/your-tech/rules
# Add rules/core.md and other rules
```

### Adding a Technology

1. Create `configs/[tech]/rules/core.md` with framework conventions
2. Add rules in `configs/[tech]/rules/`
3. Add `configs/[tech]/settings.json` for permissions
4. Add tests
5. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on skills structure.

## License

MIT © Mehdi Chaabi
