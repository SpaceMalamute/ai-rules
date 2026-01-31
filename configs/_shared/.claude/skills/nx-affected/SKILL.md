---
name: nx-affected
description: Run Nx affected commands to test/build/lint only changed projects
argument-hint: [test|build|lint|e2e] (optional, defaults to test)
---

# Nx Affected Analysis

Analyze and run commands only on affected projects based on git changes.

## Behavior

1. **Determine base branch**
   ```bash
   # Check if main or master
   git rev-parse --verify main 2>/dev/null && echo "main" || echo "master"
   ```

2. **Show affected projects**
   ```bash
   nx show projects --affected --base=<base> --head=HEAD
   ```

3. **Visualize dependencies** (optional)
   ```bash
   nx affected:graph --base=<base> --head=HEAD
   ```

4. **Run the requested target**

   Based on argument (default: `test`):

   | Argument | Command |
   |----------|---------|
   | `test` | `nx affected -t test --base=<base> --head=HEAD` |
   | `build` | `nx affected -t build --base=<base> --head=HEAD` |
   | `lint` | `nx affected -t lint --base=<base> --head=HEAD` |
   | `e2e` | `nx affected -t e2e --base=<base> --head=HEAD` |
   | `all` | Run test, lint, build sequentially |

## Output Format

```
## Affected Projects

Based on changes from `main`:

- `users-feature-list` (3 files changed)
- `users-data-access` (1 file changed)
- `shared-ui-button` (2 files changed)

## Running: nx affected -t test

✓ users-feature-list (2.3s)
✓ users-data-access (1.1s)
✓ shared-ui-button (0.8s)

All 3 affected projects passed.
```

## CI Usage Hint

Suggest adding to CI if not present:

```yaml
# .github/workflows/ci.yml
- name: Test affected
  run: nx affected -t test --base=origin/main --head=HEAD

- name: Build affected
  run: nx affected -t build --base=origin/main --head=HEAD
```
