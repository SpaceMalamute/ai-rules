# TODO

## CLI Improvements

- [ ] Ask for state management library based on tech
  - React: Redux, TanStack Query, Zustand, Jotai, Recoil
  - Angular: NgRx, Akita, Elf
  - Next.js: same as React

- [ ] Ask for CSS preprocessor
  - CSS, SCSS, Sass, Less
  - CSS-in-JS (styled-components, emotion)

- [ ] Ask for UI framework
  - Tailwind CSS
  - Material UI / Angular Material
  - Shadcn/ui
  - Chakra UI
  - Ant Design
  - PrimeNG / PrimeReact

- [ ] Ask for ORM based on backend tech
  - NestJS: Prisma, TypeORM, Drizzle, MikroORM
  - AdonisJS: Lucid (default)
  - FastAPI: SQLAlchemy, SQLModel, Tortoise
  - Flask: SQLAlchemy, Peewee
  - .NET: EF Core, Dapper

## Context Window Optimization

Reduce always-loaded rules to minimize context consumption in long conversations.

6 shared rules use `paths: **/*` (match everything), loading ~743 lines on every file edit. Combined with `alwaysApply: true` core rules, ~920 lines are always in context — even when irrelevant.

| Rule | Lines | Current | Proposed |
|------|-------|---------|----------|
| `git.md` | 267 | `**/*` | `alwaysApply: true` but condense (remove detailed examples) |
| `observability.md` | 240 | `**/*` | Scope to backend files only |
| `testing-patterns.md` | 65 | `**/*` | Scope to `**/*.test.*`, `**/*.spec.*` |
| `logging.md` | 45 | `**/*` | Scope to backend files only |
| `interaction.md` | 78 | `**/*` | Keep as-is (essential, short) |
| `error-handling.md` | 48 | `**/*` | Keep as-is (short) |

Expected: ~920 → ~400 lines always in context.

## Config Changes

- [x] Next.js should be `type: "fullstack"` (frontend + backend)
  - Add Server Actions rules
  - Add API routes rules
  - Include both domain/frontend and domain/backend shared rules

- [x] Next.js yarn issue - fallback to pnpm
  - Detect package manager
  - Add pnpm commands to settings.json

- [x] Nx rules: recommend nested lib structure
  - Nested (`libs/[scope]/[type]/`) recommended, flat documented as legacy
  - Apps = orchestration only section added
  - Both conventions remain valid

- [x] Testing naming convention: BDD-style for TypeScript
  - `should [expected] when [condition]` for TypeScript
  - Updated `testing-patterns.md` and `core.md`

- [x] Interaction rules: language + honesty
  - Communication language = match user, code language = always English
  - Honesty section: assert vs assume behavior

- [x] Claude adapter: fix frontmatter parsing (paths → globs)
  - Claude Code ignores `paths:` YAML arrays (bug #17204)
  - Adapter now converts `paths` array → `globs` CSV string

- [x] Monorepo glob compatibility
  - All fixed-path patterns prefixed with `**/` across ~45 rule files
  - Ensures rules activate in both flat and monorepo structures

- [x] README improvements
  - Added MCP servers reference table
  - Fixed skills count (14 → 16), added `/nx-affected` and `/nx-lib`
  - Fixed `--with-rules` reference (doesn't exist)
  - Expanded shared rules table

## New Configs

- [ ] Add database/SQL rules
  - Transact-SQL conventions
  - PostgreSQL conventions
  - MySQL conventions
  - Query optimization patterns
  - Migration best practices

- [ ] Add ESLint rules
  - ESLint 9 flat config
  - Framework-specific plugins
  - Custom rule recommendations

- [ ] Add Prettier rules
  - Default config
  - Framework-specific overrides
  - Integration with ESLint
