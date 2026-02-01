---
paths:
  - "**/*"
---

# Git Rules

## Commit Messages (Conventional Commits)

Format: `type(scope): description`

**No `Co-Authored-By`** - Do not add Co-Authored-By trailers to commits.

```bash
# Types
feat     # New feature
fix      # Bug fix
docs     # Documentation only
style    # Formatting, no code change
refactor # Code change, no feature/fix
perf     # Performance improvement
test     # Adding/updating tests
chore    # Build, CI, dependencies
```

```bash
# Good examples
feat(auth): add OAuth2 login with Google
fix(cart): resolve race condition in checkout
refactor(api): simplify error handling middleware
perf(db): add index on users.email column
test(orders): add integration tests for payment flow
chore(deps): upgrade typescript to 5.3

# Bad examples
fix: bug fix                    # Too vague
updated stuff                   # No type, unclear
feat: Add new feature for users # Capitalized, vague
```

## Branch Naming

```bash
# Pattern: type/description or type/TICKET-description
feat/user-authentication
feat/JIRA-123-oauth-login
fix/cart-total-calculation
fix/BUG-456-null-pointer
refactor/api-error-handling
chore/upgrade-dependencies
```

## Workflow

```bash
# Start new feature
git checkout main
git pull --rebase
git checkout -b feat/my-feature

# Regular commits during work
git add -p                    # Stage interactively
git commit -m "feat(scope): description"

# Before pushing - rebase on main
git fetch origin
git rebase origin/main

# Push (first time)
git push -u origin feat/my-feature

# Push (subsequent)
git push
```

## Rebase vs Merge

```bash
# ALWAYS rebase local changes on remote
git pull --rebase origin main

# NEVER merge main into feature branch
git merge main    # Creates ugly merge commits

# Interactive rebase to clean up commits before PR
git rebase -i HEAD~3
```

## Interactive Rebase

```bash
# Clean up last 3 commits
git rebase -i HEAD~3

# In editor:
pick abc1234 feat(auth): add login endpoint
squash def5678 fix typo              # Squash into previous
fixup ghi9012 more fixes             # Squash, discard message
reword jkl3456 wip                   # Edit commit message
```

## Stashing

```bash
# Save work in progress
git stash push -m "WIP: feature description"

# List stashes
git stash list

# Apply and drop
git stash pop

# Apply specific stash
git stash apply stash@{2}

# Drop stash
git stash drop stash@{0}
```

## Undoing Changes

```bash
# Unstage file (keep changes)
git restore --staged file.ts

# Discard local changes (DESTRUCTIVE)
git restore file.ts

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Undo last commit (keep changes unstaged)
git reset HEAD~1

# Completely undo last commit (DESTRUCTIVE)
git reset --hard HEAD~1

# Create new commit that undoes previous
git revert abc1234
```

## Viewing History

```bash
# Compact log
git log --oneline -20

# With graph
git log --oneline --graph --all

# Changes in commit
git show abc1234

# Who changed this line
git blame file.ts

# Search commits by message
git log --grep="fix auth"

# Search commits by code change
git log -S "functionName" --oneline
```

## Cherry-Pick

```bash
# Apply specific commit to current branch
git cherry-pick abc1234

# Cherry-pick without committing
git cherry-pick --no-commit abc1234

# Cherry-pick range
git cherry-pick abc1234..def5678
```

## Tags

```bash
# Create annotated tag
git tag -a v1.2.0 -m "Release 1.2.0"

# Push tags
git push origin v1.2.0
git push origin --tags

# List tags
git tag -l "v1.*"

# Delete tag
git tag -d v1.2.0
git push origin :refs/tags/v1.2.0
```

## Hooks (Husky)

```bash
# .husky/pre-commit
npm run lint-staged

# .husky/commit-msg
npx commitlint --edit $1

# .husky/pre-push
npm run test
```

## .gitignore Essentials

```gitignore
# Dependencies
node_modules/
.venv/
vendor/

# Build
dist/
build/
*.dll
*.exe

# IDE
.idea/
.vscode/
*.swp

# Environment
.env
.env.local
*.local

# Secrets (NEVER commit)
*.pem
*.key
credentials.json
secrets.yaml

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test
coverage/
.nyc_output/
```

## PR Best Practices

```bash
# Keep PRs small and focused
# - One feature/fix per PR
# - <400 lines changed ideal
# - Split large changes into stacked PRs

# Before creating PR
git rebase -i origin/main    # Clean history
npm run lint                  # Pass lint
npm run test                  # Pass tests

# PR title follows commit convention
feat(auth): add OAuth2 login with Google
```
