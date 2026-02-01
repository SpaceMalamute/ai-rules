# Contributing to AI Rules

## Development Setup

```bash
# Clone the repository
git clone https://github.com/SpaceMalamute/ai-rules.git
cd ai-rules

# Install dependencies
yarn install

# Run tests
yarn test

# Run linter
yarn lint

# Validate rule files
yarn lint:rules
```

## Project Structure

```
ai-rules/
├── bin/cli.js           # CLI entry point
├── src/
│   ├── index.js         # Main exports
│   ├── cli.js           # CLI logic
│   ├── installer.js     # Installation logic
│   ├── merge.js         # File merging utilities
│   ├── config.js        # Configuration
│   └── utils.js         # Helpers
├── configs/
│   ├── angular/         # Angular config
│   ├── nextjs/          # Next.js config
│   ├── nestjs/          # NestJS config
│   ├── dotnet/          # .NET config
│   ├── fastapi/         # FastAPI config
│   ├── flask/           # Flask config
│   └── _shared/         # Shared rules & skills
├── scripts/
│   └── lint-rules.js    # Rule validation script
└── __tests__/
    └── install.test.js  # Tests
```

## Adding a New Technology

1. Create `configs/[tech]/CLAUDE.md` starting with `@../_shared/CLAUDE.md`
2. Add rules in `configs/[tech]/.claude/rules/`
3. Add `configs/[tech]/.claude/settings.json` for permissions
4. Update `src/config.js` to include the new tech in `AVAILABLE_TECHS`
5. Update `src/tech-config.json` if needed
6. Add tests
7. Update README.md

## Release Process

### 1. Prepare the Release

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Run all checks
yarn test
yarn lint
yarn lint:rules
```

### 2. Bump Version

Edit `package.json` and update the version following [semver](https://semver.org/):
- **patch** (1.2.3 → 1.2.4): Bug fixes
- **minor** (1.2.3 → 1.3.0): New features, backward compatible
- **major** (1.2.3 → 2.0.0): Breaking changes

```bash
# Commit the version bump
git add package.json
git commit -m "chore: bump version to x.y.z"
git push origin main
```

### 3. Create GitHub Release

```bash
# Create release with auto-generated notes
gh release create vX.Y.Z --generate-notes

# Or with custom notes
gh release create vX.Y.Z --title "vX.Y.Z" --notes "Release notes here"
```

### 4. Verify Publication

The GitHub Actions workflow automatically publishes to npm when a release is created.

```bash
# Check workflow status
gh run list --workflow=publish.yml --limit=1

# Verify on npm
npm view @malamute/ai-rules version
```

## npm Trusted Publishing

This project uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) with OIDC - no npm tokens required.

**Configuration:**
- Owner: `SpaceMalamute`
- Repository: `ai-rules`
- Workflow: `publish.yml`
- Environment: `release`

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Flask support
fix: correct repository URL for npm publishing
refactor: migrate to ESM modules
docs: add release process documentation
chore: bump version to 1.3.0
test: add backup functionality tests
```

## Code Style

- ESM modules (`import`/`export`)
- No TypeScript (pure JavaScript)
- Vitest for testing
- ESLint for linting

## CI/CD

| Workflow | Trigger | Actions |
|----------|---------|---------|
| `ci.yml` | Push to main, PRs | Lint, Test, Validate rules |
| `publish.yml` | GitHub Release | Publish to npm |
