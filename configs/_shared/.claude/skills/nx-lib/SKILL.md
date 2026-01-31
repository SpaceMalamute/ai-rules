---
name: nx-lib
description: Generate an Nx library for any framework with proper structure and tags
argument-hint: <framework> <type> <scope>/<name>
---

# Generate Nx Library

## Syntax

```
/nx-lib <framework> <type> <scope>/<name>
```

## Supported Frameworks

| Framework | Generator Package |
|-----------|-------------------|
| `angular` | `@nx/angular` |
| `react` | `@nx/react` |
| `next` | `@nx/next` |
| `nest` | `@nx/nest` |
| `node` | `@nx/node` |
| `js` | `@nx/js` (pure TypeScript) |
| `dotnet` | `@nx-dotnet/core` |
| `python` | `@nxlv/python` |

## Library Types by Framework

### Angular
| Type | Description | Generator |
|------|-------------|-----------|
| `feature` | Smart components, pages, routing | `@nx/angular:lib --standalone` |
| `ui` | Presentational components | `@nx/angular:lib --standalone` |
| `data-access` | NgRx store, services | `@nx/angular:lib` + NgRx files |
| `util` | Pure functions, types | `@nx/js:lib` |

### React / Next.js
| Type | Description | Generator |
|------|-------------|-----------|
| `feature` | Pages, containers | `@nx/react:lib` or `@nx/next:lib` |
| `ui` | Presentational components | `@nx/react:lib` |
| `data-access` | Zustand/Redux, API hooks | `@nx/react:lib` |
| `util` | Pure functions, types | `@nx/js:lib` |

### NestJS
| Type | Description | Generator |
|------|-------------|-----------|
| `feature` | Module with controller | `@nx/nest:lib` + controller |
| `data-access` | Repository, services | `@nx/nest:lib` |
| `util` | Pure functions, types | `@nx/js:lib` |

### Node / JS
| Type | Description | Generator |
|------|-------------|-----------|
| `util` | Pure functions, types | `@nx/js:lib` |
| `data-access` | Services, repositories | `@nx/js:lib` |

### .NET
| Type | Description | Generator |
|------|-------------|-----------|
| `webapi` | ASP.NET Core Web API | `@nx-dotnet/core:app --template webapi` |
| `classlib` | Class library | `@nx-dotnet/core:lib --template classlib` |
| `feature` | Feature library (CQRS) | `@nx-dotnet/core:lib` + MediatR handlers |
| `data-access` | EF Core repositories | `@nx-dotnet/core:lib` + DbContext |
| `util` | Shared utilities | `@nx-dotnet/core:lib --template classlib` |

### Python
| Type | Description | Generator |
|------|-------------|-----------|
| `app` | FastAPI/Flask app | `@nxlv/python:poetry-project` |
| `lib` | Python library | `@nxlv/python:poetry-project --projectType=library` |
| `util` | Utility functions | `@nxlv/python:poetry-project --projectType=library` |

## Examples

```bash
# Angular feature library
/nx-lib angular feature users/list

# Angular data-access with NgRx
/nx-lib angular data-access users

# React UI component library
/nx-lib react ui shared/button

# NestJS feature module
/nx-lib nest feature orders

# Pure TypeScript utility
/nx-lib js util shared/format

# .NET class library
/nx-lib dotnet classlib shared/domain

# .NET Web API
/nx-lib dotnet webapi orders

# .NET data-access with EF Core
/nx-lib dotnet data-access users

# Python FastAPI app
/nx-lib python app api

# Python library
/nx-lib python lib shared/utils
```

## Execution Steps

### Step 1: Parse Arguments

```
/nx-lib angular data-access users/profile
         │       │           │
         │       │           └── scope: users, name: profile
         │       └── type: data-access
         └── framework: angular
```

### Step 2: Run Generator

Based on framework and type:

```bash
# Angular feature/ui
nx g @nx/angular:lib <name> \
  --directory=libs/<scope>/<type>-<name> \
  --tags="scope:<scope>,type:<type>" \
  --standalone \
  --style=scss \
  --changeDetection=OnPush

# Angular data-access
nx g @nx/angular:lib <name> \
  --directory=libs/<scope>/data-access \
  --tags="scope:<scope>,type:data-access"
# Then generate NgRx: actions, reducer, effects, selectors

# React/Next feature/ui
nx g @nx/react:lib <name> \
  --directory=libs/<scope>/<type>-<name> \
  --tags="scope:<scope>,type:<type>"

# NestJS feature
nx g @nx/nest:lib <name> \
  --directory=libs/<scope>/feature-<name> \
  --tags="scope:<scope>,type:feature"
# Then generate controller

# Pure JS/TS util
nx g @nx/js:lib <name> \
  --directory=libs/<scope>/util-<name> \
  --tags="scope:<scope>,type:util" \
  --bundler=none

# .NET class library
nx g @nx-dotnet/core:lib <name> \
  --directory=libs/<scope>/<type>-<name> \
  --template=classlib \
  --tags="scope:<scope>,type:<type>,framework:dotnet"

# .NET Web API
nx g @nx-dotnet/core:app <name> \
  --directory=apps/<name> \
  --template=webapi \
  --tags="scope:<scope>,type:webapi,framework:dotnet"

# Python library
nx g @nxlv/python:poetry-project <name> \
  --directory=libs/<scope>/<type>-<name> \
  --projectType=library \
  --tags="scope:<scope>,type:<type>,framework:python"

# Python app
nx g @nxlv/python:poetry-project <name> \
  --directory=apps/<name> \
  --projectType=application \
  --tags="scope:<scope>,type:app,framework:python"
```

### Step 3: Generate Boilerplate by Type

#### Angular `data-access`
```
libs/<scope>/data-access/src/lib/
├── +state/
│   ├── <name>.actions.ts
│   ├── <name>.reducer.ts
│   ├── <name>.effects.ts
│   ├── <name>.selectors.ts
│   └── <name>.state.ts
├── services/
│   └── <name>.service.ts
└── index.ts
```

#### Angular `feature`
```
libs/<scope>/feature-<name>/src/lib/
├── <name>.component.ts
├── <name>.component.html
├── <name>.component.scss
├── <name>.routes.ts
└── index.ts
```

#### Angular `ui`
```
libs/<scope>/ui-<name>/src/lib/
├── <name>.component.ts
├── <name>.component.html
├── <name>.component.scss
└── index.ts
```

#### React `data-access`
```
libs/<scope>/data-access/src/lib/
├── store/
│   └── <name>.store.ts      # Zustand store
├── hooks/
│   └── use-<name>.ts        # Custom hooks
├── api/
│   └── <name>.api.ts        # API calls
└── index.ts
```

#### NestJS `feature`
```
libs/<scope>/feature-<name>/src/lib/
├── <name>.module.ts
├── <name>.controller.ts
├── <name>.service.ts
├── dto/
│   ├── create-<name>.dto.ts
│   └── update-<name>.dto.ts
└── index.ts
```

#### JS/TS `util`
```
libs/<scope>/util-<name>/src/lib/
├── <name>.ts                # Functions
├── <name>.types.ts          # Types/interfaces
├── <name>.spec.ts           # Tests
└── index.ts
```

#### .NET `webapi`
```
apps/<name>/
├── Controllers/
│   └── <Name>Controller.cs
├── Program.cs
├── appsettings.json
├── <Name>.Api.csproj
└── project.json
```

#### .NET `classlib`
```
libs/<scope>/<type>-<name>/
├── src/
│   └── <Name>.cs
├── <Scope>.<Type>.<Name>.csproj
└── project.json
```

#### .NET `data-access`
```
libs/<scope>/data-access/
├── src/
│   ├── DbContext/
│   │   └── AppDbContext.cs
│   ├── Repositories/
│   │   ├── I<Name>Repository.cs
│   │   └── <Name>Repository.cs
│   └── Entities/
│       └── <Name>.cs
├── <Scope>.DataAccess.csproj
└── project.json
```

#### .NET `feature` (CQRS)
```
libs/<scope>/feature-<name>/
├── src/
│   ├── Commands/
│   │   ├── Create<Name>/
│   │   │   ├── Create<Name>Command.cs
│   │   │   └── Create<Name>Handler.cs
│   │   └── Update<Name>/
│   │       ├── Update<Name>Command.cs
│   │       └── Update<Name>Handler.cs
│   ├── Queries/
│   │   └── Get<Name>/
│   │       ├── Get<Name>Query.cs
│   │       └── Get<Name>Handler.cs
│   └── DependencyInjection.cs
├── <Scope>.Feature.<Name>.csproj
└── project.json
```

#### Python `app` (FastAPI)
```
apps/<name>/
├── src/
│   └── <name>/
│       ├── __init__.py
│       ├── main.py
│       ├── routers/
│       │   └── <name>_router.py
│       ├── schemas/
│       │   └── <name>_schema.py
│       └── services/
│           └── <name>_service.py
├── tests/
│   └── test_<name>.py
├── pyproject.toml
└── project.json
```

#### Python `lib`
```
libs/<scope>/<type>-<name>/
├── src/
│   └── <name>/
│       ├── __init__.py
│       └── <name>.py
├── tests/
│   └── test_<name>.py
├── pyproject.toml
└── project.json
```

### Step 4: Configure project.json

```json
{
  "name": "<scope>-<type>-<name>",
  "tags": ["scope:<scope>", "type:<type>", "framework:<framework>"]
}
```

### Step 5: Update Public API (index.ts)

Export all public items appropriately for the type.

### Step 6: Verify

```bash
nx lint <project-name>
nx test <project-name>
```

## Output Summary

```
✓ Created library: libs/<scope>/<type>-<name>

  Import path: @<org>/<scope>/<type>-<name>
  Project name: <scope>-<type>-<name>
  Tags: scope:<scope>, type:<type>, framework:<framework>

  Files created:
  - libs/<scope>/<type>-<name>/src/index.ts
  - libs/<scope>/<type>-<name>/src/lib/...
  - libs/<scope>/<type>-<name>/project.json

  Next steps:
  - Add business logic
  - Export public API from index.ts
  - Run: nx test <scope>-<type>-<name>
```
