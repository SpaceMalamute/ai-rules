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

## Config Changes

- [x] Next.js should be `type: "fullstack"` (frontend + backend)
  - Add Server Actions rules
  - Add API routes rules
  - Include both domain/frontend and domain/backend shared rules

- [x] Next.js yarn issue - fallback to pnpm
  - Detect package manager
  - Add pnpm commands to settings.json

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
