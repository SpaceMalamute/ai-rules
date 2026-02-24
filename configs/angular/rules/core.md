---
description: "Angular 21+ project conventions and architecture"
alwaysApply: true
---

# Angular Project Guidelines

## Stack

- Angular 19+ (standalone implicit, Signals, OnPush)
- Nx monorepo with enforced boundaries
- Vitest (unit) + Playwright (E2E)
- TypeScript strict mode
- Zoneless change detection (`provideZonelessChangeDetection()`) — stable since v20.2, default in v21

## Architecture — Nx

| Library type | Purpose | Can import |
|---|---|---|
| `feature/` | Smart components, pages (lazy-loaded) | Everything |
| `data-access/` | Stores, API services, NgRx `+state/` | `data-access`, `util` |
| `ui/` | Presentational components | `ui`, `util` |
| `util/` | Pure functions, helpers | `util` only |

Shared libraries live under `libs/shared/{ui,data-access,util}`.

## Commands

```bash
nx serve [app]                    # Dev server
nx build [app] --configuration=production
nx test [lib]                     # Unit tests (Vitest)
nx affected -t test               # Test affected
nx e2e [app]-e2e                  # E2E (Playwright)
nx g @nx/angular:component [name] --project=[lib]
nx g @nx/angular:library [name] --directory=libs/[domain]
```

## Code Style

- DO use folder-based structure: `user-list/user-list.component.ts`
- DO add explicit return types on public methods
- DO mark injected services as `private readonly`
- DO add `track` on every `@for` loop — Angular enforces it
- DO use `inject()` function — never constructor injection
- DO NOT add `standalone: true` — it is the default since Angular 19
- DO NOT reference NgModules — they are legacy
- DO NOT use `@Input()`, `@Output()`, `@ViewChild()` decorators — use signal-based APIs
- Prefix is configurable per project (default: `app`)
