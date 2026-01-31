# AI Rules

[![npm version](https://badge.fury.io/js/@malamute/ai-rules.svg)](https://www.npmjs.com/package/@malamute/ai-rules)

CLI to install Claude Code configuration boilerplates for Angular, Next.js, NestJS, .NET, Python and more.

## Installation

```bash
# Global install
npm install -g @malamute/ai-rules

# Or use directly with npx
npx @malamute/ai-rules init angular
```

## Usage

```bash
# Interactive mode (recommended for first time)
ai-rules init

# Single technology
ai-rules init angular
ai-rules init nestjs
ai-rules init python

# Fullstack (combines multiple configs)
ai-rules init angular nestjs
ai-rules init nextjs python
ai-rules init nextjs dotnet

# With extras
ai-rules init angular --with-skills     # /learning, /review, /spec, /debug, etc.
ai-rules init nextjs --with-rules       # security, performance, accessibility
ai-rules init angular nestjs --all      # Everything

# Preview changes without modifying files
ai-rules init angular --dry-run

# Custom target directory
ai-rules init dotnet --target ./my-project

# Check installation status
ai-rules status

# Update to latest configs
ai-rules update
ai-rules update --dry-run    # Preview update
ai-rules update --force      # Update without backup

# List available technologies
ai-rules list
```

## Commands

| Command  | Description                                         |
| -------- | --------------------------------------------------- |
| `init`   | Install configuration (interactive if no tech)      |
| `update` | Update installed configs to latest version          |
| `status` | Show current installation status                    |
| `list`   | List available technologies                         |

## Options

| Option           | Description                                    |
| ---------------- | ---------------------------------------------- |
| `--with-skills`  | Include skills (/learning, /review, etc.)      |
| `--with-rules`   | Include shared rules (security, performance)   |
| `--all`          | Include skills and rules                       |
| `--target <dir>` | Target directory (default: current directory)  |
| `--dry-run`      | Preview changes without writing files          |
| `--force`        | Overwrite files without backup                 |

## Available Technologies

| Technology | Stack                                 |
| ---------- | ------------------------------------- |
| `angular`  | Angular 21 + Nx + NgRx + Signals      |
| `nextjs`   | Next.js 15 + React 19 + App Router    |
| `nestjs`   | NestJS 11 + Prisma/TypeORM + Passport |
| `dotnet`   | .NET 9 + ASP.NET Core + EF Core       |
| `python`   | FastAPI/Flask + SQLAlchemy 2.0        |

## What Gets Installed

```
your-project/
├── CLAUDE.md              # Main instructions for Claude
└── .claude/
    ├── settings.json      # Permissions (allow/deny)
    ├── .ai-rules.json     # Installation manifest (version tracking)
    ├── rules/             # Technology-specific rules
    ├── skills/            # Optional: /learning, /review, /spec, etc.
    └── backups/           # Auto-backup of overwritten files
```

## Available Skills

When using `--with-skills` or `--all`, these skills are included:

| Skill             | Usage                       | Description                                     |
| ----------------- | --------------------------- | ----------------------------------------------- |
| `/learning`       | `/learning nextjs`          | Pedagogical mode - explains before implementing |
| `/review`         | `/review src/users/`        | Code review with structured checklist           |
| `/spec`           | `/spec add auth`            | Technical specification before implementing     |
| `/debug`          | `/debug TypeError...`       | Systematic debugging workflow                   |
| `/fix-issue`      | `/fix-issue 123`            | Fetch GitHub issue and implement fix            |
| `/review-pr`      | `/review-pr 456`            | Review PR diff with checklist                   |
| `/generate-tests` | `/generate-tests src/user/` | Generate tests for a file                       |
| `/api-endpoint`   | `/api-endpoint POST /users` | Generate complete API endpoint                  |
| `/migration`      | `/migration add users`      | Generate database migration                     |
| `/security-audit` | `/security-audit`           | Security audit of the codebase                  |
| `/docker`         | `/docker`                   | Generate Dockerfile and docker-compose          |
| `/deploy`         | `/deploy`                   | Generate deployment configuration               |
| `/explore`        | `/explore`                  | Deep repository analysis                        |

## Shared Rules

When using `--with-rules` or `--all`, these transversal rules are included:

- **security.md** - OWASP Top 10 (injection, XSS, CSRF, auth, secrets)
- **performance.md** - N+1 queries, caching, memoization, lazy loading
- **accessibility.md** - WCAG 2.1 (semantic HTML, ARIA, keyboard nav)
- **testing-patterns.md** - AAA pattern, mocking, coverage guidelines
- **error-handling.md** - Error categories, response formats
- **logging.md** - Log levels, structured logging
- **observability.md** - Metrics, traces, health checks
- **git.md** - Conventional commits, branching, PRs

## Technology Details

### Angular

| Aspect         | Convention                                  |
| -------------- | ------------------------------------------- |
| Components     | Standalone by default, OnPush required      |
| Templates      | Always in separate `.html` files            |
| Inputs/Outputs | `input()`, `output()`, `model()` functions  |
| State          | NgRx + Entity Adapter + Functional Effects  |
| Tests          | Vitest + Marble testing (no `.subscribe()`) |

### Next.js

| Aspect            | Convention                                 |
| ----------------- | ------------------------------------------ |
| Components        | Server Components by default               |
| Client Components | Add `'use client'` directive               |
| Data Fetching     | Server Components + `fetch()`              |
| Mutations         | Server Actions                             |
| State             | Zustand (simple) / Redux Toolkit (complex) |

### NestJS

| Aspect       | Convention                             |
| ------------ | -------------------------------------- |
| Architecture | Modular Monolith                       |
| Validation   | class-validator + class-transformer    |
| Database     | Prisma (modern) / TypeORM (decorators) |
| Auth         | Passport + JWT                         |
| Tests        | Vitest + Supertest                     |

### .NET

| Aspect       | Convention                                |
| ------------ | ----------------------------------------- |
| Architecture | Clean Architecture (Domain → App → Infra) |
| API Style    | Minimal APIs or Controllers               |
| CQRS         | MediatR (Commands/Queries)                |
| ORM          | Entity Framework Core                     |
| Tests        | xUnit + NSubstitute + FluentAssertions    |

### Python

| Aspect     | Convention                                  |
| ---------- | ------------------------------------------- |
| Frameworks | FastAPI (async) / Flask (traditional)       |
| Validation | Pydantic v2 (FastAPI) / Marshmallow (Flask) |
| ORM        | SQLAlchemy 2.0 (async support)              |
| Tests      | pytest + httpx                              |
| Migrations | Alembic                                     |

## Package Structure

```
ai-rules/
├── package.json
├── bin/
│   └── cli.js              # CLI entry point
├── src/
│   └── install.js          # Installation logic
├── __tests__/              # Unit tests
└── configs/
    ├── angular/
    ├── nextjs/
    ├── nestjs/
    ├── dotnet/
    ├── python/
    └── _shared/
        ├── CLAUDE.md       # Base conventions
        └── .claude/
            ├── skills/     # Shared skills
            └── rules/      # Shared rules
```

## Updating Configs

When a new version of ai-rules is released with updated rules:

```bash
# Check current status
ai-rules status

# Preview what would change
ai-rules update --dry-run

# Apply update (creates backups automatically)
ai-rules update

# Force update without backups
ai-rules update --force
```

Backups are stored in `.claude/backups/` with timestamps.

## Contributing

1. Fork the repository
2. Create a new technology folder in `configs/`
3. Add `CLAUDE.md` and `.claude/rules/`
4. Add tests in `__tests__/`
5. Submit a PR

## License

MIT
