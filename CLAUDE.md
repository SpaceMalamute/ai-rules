# AI Rules - Multi-Target AI Tool Configurations

Reusable configurations for AI coding tools (Claude Code, Cursor, Copilot, Windsurf).

## Structure

```
configs/
├── angular/          # Angular 21+, Nx, Signals
├── react/            # React 19+, Vite, Vitest
├── nextjs/           # Next.js 15+, App Router
├── nestjs/           # NestJS 11+, Modular Monolith
├── adonisjs/         # AdonisJS 6+, Lucid, VineJS
├── dotnet/           # .NET 9, Clean Architecture
├── fastapi/          # FastAPI + Pydantic v2
├── flask/            # Flask 3.0+ + Marshmallow
└── _shared/          # Cross-tech conventions

src/
├── adapters/         # Format adapters per AI tool
│   ├── base.js       # Abstract adapter
│   ├── claude.js     # → .claude/rules/*.md
│   ├── cursor.js     # → .cursor/rules/*.mdc
│   ├── copilot.js    # → .github/instructions/*.instructions.md
│   └── windsurf.js   # → .windsurf/rules/*.md
├── transformers/
│   └── frontmatter.js # Parse/serialize YAML frontmatter
├── cli.js            # CLI entry point
├── config.js         # Constants, tech config
├── installer.js      # Multi-target installation logic
├── merge.js          # Settings merge + manifest
└── utils.js          # File utilities
```

Each technology has:

- `rules/core.md` → framework conventions (architecture, stack, commands)
- `rules/*.md` → code patterns with path-based activation
- `settings.json` → permissions (Claude only)

## Principles

**No CLAUDE.md installation**

- The target project's `CLAUDE.md` should contain project-specific info only
- All framework conventions go in `rules/core.md`

**Separation of concerns**

- `rules/core.md` = architecture, stack, conventions (no code examples)
- `rules/*.md` = code examples, GOOD/BAD patterns

**Path scoping**

- Source rules use `paths:` globs (Claude format) to activate only on relevant files
- Adapters transform `paths` → `globs` (Cursor/Windsurf) or `applyTo` (Copilot)
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

## Adapter Format Mapping

| Source (Claude) | Cursor       | Copilot      | Windsurf              |
|-----------------|--------------|--------------|----------------------|
| `paths`         | `globs`      | `applyTo`    | `globs` + `trigger: glob` |
| `alwaysApply`   | `alwaysApply`| aggregated   | `trigger: always`    |
| `.md`           | `.mdc`       | `.instructions.md` | `.md`          |
| skills          | -            | -            | workflows            |
| settings.json   | -            | -            | -                    |

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
