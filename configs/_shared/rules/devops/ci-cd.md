---
description: "CI/CD pipeline best practices"
paths:
  - ".github/workflows/**"
  - ".gitlab-ci.yml"
  - "**/azure-pipelines.yml"
  - "Jenkinsfile"
  - ".circleci/**"
---

# CI/CD Best Practices

## Pipeline Principles

- **Fast feedback**: Run quick checks first (lint, type-check)
- **Fail fast**: Stop pipeline on first failure
- **Parallelization**: Run independent jobs in parallel
- **Caching**: Cache dependencies between runs
- **Artifacts**: Pass build outputs between jobs

## GitHub Actions

### Basic Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: dist/
```

### Nx Monorepo Pipeline

```yaml
name: CI (Nx)

on:
  push:
    branches: [main]
  pull_request:

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - uses: nrwl/nx-set-shas@v4

      # Run affected commands
      - run: npx nx affected -t lint --parallel=3
      - run: npx nx affected -t test --parallel=3 --coverage
      - run: npx nx affected -t build --parallel=3
```

### Deploy Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: |
          docker build -t myapp:${{ github.sha }} .

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push image
        run: |
          docker tag myapp:${{ github.sha }} ghcr.io/${{ github.repository }}:${{ github.sha }}
          docker tag myapp:${{ github.sha }} ghcr.io/${{ github.repository }}:latest
          docker push ghcr.io/${{ github.repository }} --all-tags

      - name: Deploy to production
        run: |
          # kubectl, ssh, or cloud CLI deployment
          echo "Deploying ${{ github.sha }}"
```

## Branch Protection

Configure in GitHub Settings:

- Require PR reviews before merging
- Require status checks (CI must pass)
- Require branches to be up to date
- Enforce linear history (squash or rebase)
- Restrict force pushes

## Secrets Management

```yaml
# Reference secrets (never hardcode!)
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}

# Use environments for different configs
jobs:
  deploy:
    environment: production  # Uses production secrets
```

## Caching Strategies

```yaml
# Node.js
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Built-in caching

# Custom cache
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

# Docker layer caching
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

## Release Automation

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            dist/*.zip
```

## Quality Gates

| Check | Tool | Threshold |
|-------|------|-----------|
| Lint | ESLint/Ruff | 0 errors |
| Type check | TypeScript/mypy | 0 errors |
| Unit tests | Jest/pytest | 100% pass |
| Coverage | Codecov | ≥80% |
| Security | Snyk/Dependabot | 0 critical |
| Build | Framework CLI | Success |

## Anti-patterns

- Running all tests on every commit (use affected)
- Not caching dependencies
- Hardcoding secrets
- Not using concurrency limits
- Deploying without approval gates
- Missing rollback strategy
- No artifact retention policy
