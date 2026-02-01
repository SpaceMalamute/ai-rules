---
paths:
  - "libs/**/*"
  - "apps/**/*"
  - "nx.json"
  - "project.json"
  - "*.ts"
---

# Nx Monorepo Rules

## Project Structure

```
workspace/
├── apps/                    # Deployable applications
│   ├── web/                 # Main app
│   └── web-e2e/             # E2E tests
├── libs/                    # Reusable libraries
│   ├── shared/              # Cross-domain (ui, util)
│   └── [domain]/            # Domain-specific
│       ├── feature-*/       # Smart components, pages
│       ├── ui-*/            # Dumb/presentational components
│       ├── data-access-*/   # State, API services
│       └── util-*/          # Pure functions, helpers
├── nx.json
└── tsconfig.base.json
```

## Library Types

| Type | Purpose | Can Import |
|------|---------|------------|
| `feature` | Smart components, routing, pages | ui, data-access, util |
| `ui` | Presentational components | util only |
| `data-access` | State management, API calls | util only |
| `util` | Pure functions, types, constants | util only |

## Naming Convention

```
libs/[scope]/[type]-[name]

# Examples
libs/users/feature-list        # User list page
libs/users/ui-avatar           # Avatar component
libs/users/data-access         # User state/API
libs/users/util-permissions    # Permission helpers
libs/shared/ui-button          # Shared button
libs/shared/util-format        # Format utilities
```

## Tags & Boundaries

### nx.json

```json
{
  "targetDefaults": {
    "build": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["build"] }
  }
}
```

### project.json tags

```json
{
  "tags": ["scope:users", "type:feature"]
}
```

### .eslintrc.json boundaries

```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [
      "error",
      {
        "depConstraints": [
          { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:ui", "type:data-access", "type:util"] },
          { "sourceTag": "type:ui", "onlyDependOnLibsWithTags": ["type:util"] },
          { "sourceTag": "type:data-access", "onlyDependOnLibsWithTags": ["type:util"] },
          { "sourceTag": "type:util", "onlyDependOnLibsWithTags": ["type:util"] },
          { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] },
          { "sourceTag": "scope:users", "onlyDependOnLibsWithTags": ["scope:users", "scope:shared"] }
        ]
      }
    ]
  }
}
```

## Dependency Flow

```
┌─────────────────────────────────────────────┐
│                   apps/                      │
│        (can import any lib)                  │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│              feature libs                    │
│   (pages, smart components, routing)         │
└─────────────────────────────────────────────┘
            │                │
            ▼                ▼
┌──────────────────┐  ┌──────────────────┐
│     ui libs      │  │  data-access     │
│  (presentational)│  │  (state, API)    │
└──────────────────┘  └──────────────────┘
            │                │
            └───────┬────────┘
                    ▼
┌─────────────────────────────────────────────┐
│               util libs                      │
│    (pure functions, types, constants)        │
└─────────────────────────────────────────────┘
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `nx affected -t test` | Test affected projects |
| `nx affected -t build` | Build affected projects |
| `nx affected -t lint` | Lint affected projects |
| `nx run-many -t test --all` | Test all projects |
| `nx graph` | Visualize dependency graph |
| `nx reset` | Clear cache |

## Generator Commands

| Command | Description |
|---------|-------------|
| `nx g @nx/angular:lib [name]` | Generate Angular library |
| `nx g @nx/angular:component [name]` | Generate component |
| `nx g @nx/angular:service [name]` | Generate service |
| `nx g remove [name]` | Remove project |
| `nx g move --project [name] [dest]` | Move project |

## Import Paths

Always use workspace paths, never relative imports across libs:

```typescript
// GOOD - workspace path
import { UserService } from '@myorg/users/data-access';
import { ButtonComponent } from '@myorg/shared/ui-button';

// BAD - relative cross-lib import
import { UserService } from '../../../users/data-access/src';
```

## Anti-patterns

- Never import from `apps/` into `libs/`
- Never create circular dependencies between libs
- Never import `feature` into `ui` or `data-access`
- Never import domain-specific into `shared/` scope
- Never skip the public API (`index.ts`)

## Caching

Nx caches build/test results. To leverage:

```json
// nx.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"]
      }
    }
  }
}
```

## Affected Commands

Always use `affected` in CI:

```bash
# Only test what changed
nx affected -t test --base=main --head=HEAD

# Only build what changed
nx affected -t build --base=main --head=HEAD
```
