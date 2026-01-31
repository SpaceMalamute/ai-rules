# Angular Project Guidelines

@../_shared/CLAUDE.md

## Stack

- Angular 21+ (Zoneless, Signals)
- Nx monorepo
- NgRx (Entity Adapter, Functional Effects)
- Vitest, Playwright
- TypeScript strict mode

## Architecture - Nx

```
apps/[app-name]/

libs/
  [domain]/                   # users, products, checkout
    feature/                  # Smart components, pages (lazy-loaded)
    data-access/              # NgRx store, API services
      src/lib/+state/         # Actions, reducers, effects, selectors
    ui/                       # Dumb/presentational components
    util/                     # Domain helpers

  shared/
    ui/                       # Design system components
    data-access/              # Auth, interceptors
    util/                     # Pure functions
```

### Dependency Rules (Nx tags)

| Type | Can import |
|------|------------|
| `feature` | Everything |
| `ui` | `ui`, `util` only |
| `data-access` | `data-access`, `util` only |
| `util` | `util` only |

## Commands

```bash
nx serve [app]                    # Dev server
nx build [app] --configuration=production
nx test [lib]                     # Unit tests
nx affected -t test               # Test affected
nx e2e [app]-e2e                  # E2E tests
nx g @nx/angular:component [name] --project=[lib]
nx g @nx/angular:library [name] --directory=libs/[domain]
```

## Code Style

- Folder-based structure: `user-list/user-list.component.ts`
- Explicit return types on public methods
- `readonly` for injected services
- `track` required in `@for` loops
- Prefix configurable per project (default: `app`)
