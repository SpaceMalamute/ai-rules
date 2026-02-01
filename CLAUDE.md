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

## TODO

### Réorganiser _shared/rules/

```
_shared/rules/
├── lang/                    # Langages (sélectif par tech)
│   ├── typescript/
│   │   ├── typescript.md
│   │   ├── generics.md      # NEW
│   │   └── async.md         # NEW
│   ├── python/              # Inclut SQLAlchemy
│   │   ├── python.md
│   │   ├── async.md
│   │   └── sqlalchemy/
│   └── csharp/
│       ├── csharp.md
│       ├── async.md
│       └── linq.md
│
├── domain/
│   ├── frontend/
│   └── backend/
│
├── conventions/             # ex "core"
│   ├── principles.md
│   ├── git.md
│   └── documentation.md
│
├── quality/                 # Inchangé
├── security/                # Inchangé
│
└── devops/                  # ex "infra"
    ├── docker.md
    ├── ci-cd.md
    └── nx.md
```

### Enrichir TypeScript

Ajouter `lang/typescript/generics.md`:
- Generics patterns (`<T extends ...>`, constraints)
- Utility types (`Pick`, `Omit`, `Partial`, `Required`, `Record`)
- Discriminated unions
- Type guards (`is`, `asserts`)
- `as const` / const assertions
- Conditional types

Ajouter `lang/typescript/async.md`:
- Promise patterns
- Async error handling
- Parallel vs sequential execution
- AbortController / cancellation

### Mettre à jour tech-config.json

```json
{
  "angular": { "includeRules": ["lang/typescript", "domain/frontend"] },
  "dotnet": { "includeRules": ["lang/csharp", "domain/backend"] },
  "fastapi": { "includeRules": ["lang/python", "domain/backend"] }
}
```
