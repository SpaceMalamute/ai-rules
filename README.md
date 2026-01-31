# Claude Code Configurations

Boilerplate Claude Code configurations by technology.

## Structure

```
ai/
├── angular/                    # Angular 21 + Nx + NgRx
│   ├── CLAUDE.md
│   └── .claude/
│       ├── settings.json
│       └── rules/
│           ├── components.md
│           ├── state.md
│           └── testing.md
│
├── next/                     # Next.js 15 + React 19 + Nx
│   ├── CLAUDE.md
│   └── .claude/
│       ├── settings.json
│       └── rules/
│           ├── components.md
│           ├── testing.md
│           └── state/          # Choose one
│               ├── zustand.md
│               └── redux-toolkit.md
│
├── nestjs/                   # NestJS 10+ Backend
│   ├── CLAUDE.md
│   └── .claude/
│       ├── settings.json
│       └── rules/
│           ├── modules.md
│           ├── validation.md
│           ├── testing.md
│           ├── auth.md
│           └── database/       # Choose one
│               ├── prisma.md
│               └── typeorm.md
│
├── _shared/                    # Common conventions
│   ├── CLAUDE.md
│   └── .claude/
│       └── skills/
│           └── learning/
│               └── SKILL.md
│
├── CLAUDE.md                   # Repository instructions
└── README.md                   # This file
```

## Usage

### 1. Copy config to your project

```bash
# For an Angular project
cp -r angular/.claude /path/to/your/project/
cp angular/CLAUDE.md /path/to/your/project/

# Also copy shared (or merge content into your CLAUDE.md)
cp -r _shared/.claude/skills /path/to/your/project/.claude/
```

### 2. Adapt CLAUDE.md

The `CLAUDE.md` file imports shared conventions via:

```markdown
@../\_shared/CLAUDE.md
```

If copying to a standalone project, replace this line with the content of `_shared/CLAUDE.md` directly.

### 3. Customize

- **Component prefix**: modify `app-` in rules
- **Commands**: adjust npm/nx scripts for your project
- **Permissions**: edit `.claude/settings.json`

## Available Skills

### `/learning` - Learning Mode

Activates a pedagogical coding mode where Claude:

- Explains before implementing
- Waits for your validation
- Sources all decisions (official docs)
- Shows alternatives

**Usage**:

```
/learning           # General mode
/learning next    # Focused on Next.js
/learning vue       # Focused on Vue
```

**Deactivation**: `exit learning mode` or `normal mode`

To use this skill in a project:

```bash
cp -r _shared/.claude/skills /path/to/your/project/.claude/
```

## Shared Conventions (`_shared/CLAUDE.md`)

| Rule                  | Description                                |
| --------------------- | ------------------------------------------ |
| Explicit naming       | No `c`, `x`, `tmp` - use descriptive names |
| No lint disable       | Unless with justification + ticket         |
| Conventional commits  | `feat:`, `fix:`, `refactor:`, etc.         |
| TypeScript strict     | No `any`, explicit types                   |
| Self-documenting code | Comments = "why", not "what"               |

## Angular - Key Points

| Aspect           | Convention                                        |
| ---------------- | ------------------------------------------------- |
| Components       | `standalone` by default (don't add it)            |
| Templates        | Always in separate `.html` files                  |
| Inputs/Outputs   | `input()`, `output()`, `model()` - not decorators |
| Change Detection | `OnPush` required                                 |
| State            | NgRx + Entity Adapter + Functional Effects        |
| RxJS Tests       | Marble testing only (no `.subscribe()`)           |
| E2E Tests        | Playwright                                        |

## Next.js - Key Points

| Aspect            | Convention                       |
| ----------------- | -------------------------------- |
| Components        | Server Components by default     |
| Client Components | Add `'use client'` directive     |
| Data Fetching     | Server Components with `fetch()` |
| Mutations         | Server Actions                   |
| State (simple)    | Zustand                          |
| State (complex)   | Redux Toolkit                    |
| Tests             | Vitest/Jest + Testing Library    |
| E2E Tests         | Playwright                       |

### State Management

Copy only the state manager you need:

```bash
# For Zustand (small/medium projects)
cp next/.claude/rules/state/zustand.md /your/project/.claude/rules/

# For Redux Toolkit (large projects)
cp next/.claude/rules/state/redux-toolkit.md /your/project/.claude/rules/
```

## NestJS - Key Points

| Aspect          | Convention                                    |
| --------------- | --------------------------------------------- |
| Architecture    | Modular Monolith                              |
| Modules         | Single responsibility, clear boundaries       |
| Controllers     | HTTP only, delegate to services               |
| Services        | All business logic                            |
| Validation      | class-validator + class-transformer           |
| DTOs            | Always validate, use PartialType for variants |
| Database        | Prisma (modern) or TypeORM (decorators)       |
| Auth            | Passport + JWT                                |
| Tests           | Jest + Supertest                              |

### Database Choice

Copy only the ORM you need:

```bash
# For Prisma (recommended for new projects)
cp nestjs/.claude/rules/database/prisma.md /your/project/.claude/rules/

# For TypeORM (Angular-like decorators)
cp nestjs/.claude/rules/database/typeorm.md /your/project/.claude/rules/
```

## Adding a New Technology

1. Create folder: `mkdir -p [tech]/.claude/rules`
2. Create `[tech]/CLAUDE.md` with `@../_shared/CLAUDE.md` import
3. Add technology-specific rules in `.claude/rules/`
4. Optional: `.claude/settings.json` for permissions
5. Update this README

## Roadmap

- [x] Angular (Angular 21 + Nx + NgRx)
- [x] Next.js (App Router, Server Components, Zustand/Redux)
- [ ] Vue 3 (Composition API, Pinia)
- [x] NestJS (Modular Monolith, Prisma/TypeORM, Passport)
- [ ] React (Vite, Zustand/Jotai)
