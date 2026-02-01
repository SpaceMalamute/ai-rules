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

- `rules/core.md` → framework conventions (architecture, stack, commands)
- `rules/*.md` → code patterns with path-based activation
- `settings.json` → permissions

## Principles

**No CLAUDE.md installation**

- The target project's `CLAUDE.md` should contain project-specific info only
- All framework conventions go in `rules/core.md`

**Separation of concerns**

- `rules/core.md` = architecture, stack, conventions (no code examples)
- `rules/*.md` = code examples, GOOD/BAD patterns

**Path scoping**

- Rules use `paths:` globs to activate only on relevant files
- Keep paths narrow to reduce noise

**YAGNI**

- Only technologies actively used
- No hypothetical frameworks or patterns

## Adding a Technology

1. Create `configs/[tech]/rules/core.md` with framework conventions
2. Add rules in `configs/[tech]/rules/`
3. Add `configs/[tech]/settings.json`
4. Update `src/tech-config.json` with `type` and `language`
5. Update this file and README.md

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
