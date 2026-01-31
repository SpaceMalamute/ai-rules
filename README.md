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
# Single technology
ai-rules init angular
ai-rules init nestjs
ai-rules init python

# Fullstack (combines multiple configs)
ai-rules init angular nestjs
ai-rules init nextjs python
ai-rules init nextjs dotnet

# With extras
ai-rules init angular --with-skills              # /learning, /review, /spec, /debug
ai-rules init angular nestjs --with-commands     # fix-issue, review-pr, generate-tests
ai-rules init nextjs --with-rules                # security, performance, accessibility
ai-rules init angular nestjs --all               # Everything

# Custom target directory
ai-rules init dotnet --target ./my-project

# List available technologies
ai-rules list
```

## Available Technologies

| Technology | Stack                                 |
| ---------- | ------------------------------------- |
| `angular`  | Angular 21 + Nx + NgRx + Signals      |
| `nextjs`   | Next.js 15 + React 19 + App Router    |
| `nestjs`   | NestJS 10 + Prisma/TypeORM + Passport |
| `dotnet`   | .NET 8 + ASP.NET Core + EF Core       |
| `python`   | FastAPI/Flask + SQLAlchemy 2.0        |

## What Gets Installed

```
your-project/
├── CLAUDE.md              # Main instructions for Claude
└── .claude/
    ├── settings.json      # Permissions
    ├── rules/             # Technology-specific rules
    ├── skills/            # Optional: /learning, /review, /spec, /debug
    └── commands/          # Optional: fix-issue, review-pr, generate-tests
```

## Available Skills

| Skill       | Usage                 | Description                                     |
| ----------- | --------------------- | ----------------------------------------------- |
| `/learning` | `/learning nextjs`    | Pedagogical mode - explains before implementing |
| `/review`   | `/review src/users/`  | Code review with structured checklist           |
| `/spec`     | `/spec add auth`      | Technical specification before implementing     |
| `/debug`    | `/debug TypeError...` | Systematic debugging workflow                   |

## Available Commands

| Command          | Usage                                | Description                          |
| ---------------- | ------------------------------------ | ------------------------------------ |
| `fix-issue`      | `/project:fix-issue 123`             | Fetch GitHub issue and implement fix |
| `review-pr`      | `/project:review-pr 456`             | Review PR diff with checklist        |
| `generate-tests` | `/project:generate-tests src/users/` | Generate tests for a file            |

## Shared Rules

When using `--with-rules` or `--all`, these transversal rules are included:

- **security.md** - OWASP Top 10 (injection, XSS, CSRF, auth, secrets)
- **performance.md** - N+1 queries, caching, memoization, lazy loading
- **accessibility.md** - WCAG 2.1 (semantic HTML, ARIA, keyboard nav)

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
| Tests        | Jest + Supertest                       |

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
claude-code-configs/
├── package.json
├── bin/
│   └── cli.js              # CLI entry point
├── src/
│   └── install.js          # Installation logic
└── configs/
    ├── angular/
    ├── nextjs/
    ├── nestjs/
    ├── dotnet/
    ├── python/
    └── _shared/
        ├── CLAUDE.md
        └── .claude/
            ├── skills/
            └── rules/
```

## Contributing

1. Fork the repository
2. Create a new technology folder in `configs/`
3. Add `CLAUDE.md` and `.claude/rules/`
4. Submit a PR

## License

MIT
