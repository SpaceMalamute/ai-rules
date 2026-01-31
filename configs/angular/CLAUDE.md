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

## Core Principles

### Zoneless & Signals

- No zone.js - signals are the reactivity model
- `ChangeDetectionStrategy.OnPush` on ALL components
- Use `signal()`, `computed()`, `effect()` for state
- Use `input()`, `output()`, `model()` - NOT decorators

### Components

- Standalone by default (don't add `standalone: true`)
- Templates in separate `.html` files always
- Use `inject()` function, not constructor injection
- Smart components in `feature/`, dumb in `ui/`

### Smart vs Dumb

| Smart (feature/) | Dumb (ui/) |
|------------------|------------|
| Inject Store, dispatch actions | Only inputs/outputs |
| Handle routing, side effects | Pure presentation |
| Page-level components | Reusable anywhere |

### NgRx

- `createActionGroup` for related actions
- `createFeature` for reducers
- Entity Adapter for collections
- Functional effects with `{ functional: true }`
- `selectSignal()` in components

### Signals vs RxJS

| Use Signals | Use RxJS |
|-------------|----------|
| Local component state | Async streams, events |
| Derived/computed values | Complex async pipelines |
| Simple reactivity | Race conditions, debounce |

- `toSignal()` - Convert observable to signal
- `toObservable()` - Convert signal to observable
- `effect()` can set signals by default (no `allowSignalWrites` needed)
- `toSignal()` supports custom equality function
- `takeUntilDestroyed()` for cleanup

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
