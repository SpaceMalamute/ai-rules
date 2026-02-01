# Claude Code Configuration Boilerplates

Reusable configurations for Claude Code projects. Copy `configs/[tech]/` to your project root.

## Structure

```
configs/
├── angular/          # Angular 21+, Nx, Signals
├── nextjs/           # Next.js 15+, App Router
├── nestjs/           # NestJS 11+, Modular Monolith
├── dotnet/           # .NET 9, Clean Architecture
├── fastapi/          # FastAPI + Pydantic v2
├── flask/            # Flask 3.0+ + Marshmallow
└── _shared/          # Cross-tech conventions
```

Each technology has:
- `CLAUDE.md` → imports `_shared` + framework-specific concepts
- `.claude/rules/` → code patterns with path-based activation
- `.claude/settings.json` → permissions

## Principles

**Separation of concerns**
- `CLAUDE.md` = architecture, tables, diagrams (no code)
- `rules/*.md` = code examples, GOOD/BAD patterns

**Path scoping**
- Rules use `paths:` globs to activate only on relevant files
- Keep paths narrow to reduce noise

**YAGNI**
- Only technologies actively used
- No hypothetical frameworks or patterns

## Adding a Technology

1. Create `configs/[tech]/CLAUDE.md` starting with `@../_shared/CLAUDE.md`
2. Add rules in `configs/[tech]/.claude/rules/`
3. Update this file and README.md

## Git

- **No `Co-Authored-By`** in commit messages
- Follow conventional commits format

## Language

All files in **English**.

## Shared Rules Structure

```
_shared/rules/
├── lang/           # Language-specific (typescript, python, csharp)
├── domain/         # Domain-specific (frontend, backend)
├── conventions/    # Git, principles, documentation
├── quality/        # Testing, logging, error handling
├── security/       # Security, secrets management
└── devops/         # Docker, CI/CD, Nx
```
