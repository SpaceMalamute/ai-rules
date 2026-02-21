---
name: add-framework
description: Add support for a new framework/technology
argument-hint: <framework-name>
---

# Add Framework Support

Add support for a new framework/technology to ai-rules.

## Input

Framework name: `$ARGUMENTS`

If no argument provided, ask: "Which framework do you want to add? (e.g., remix, sveltekit, hono)"

## Phase 1: Research

**Before writing any rule, research the framework thoroughly.**

1. Read the framework's **official documentation** (latest stable version)
2. Identify the **current stable version** — never reference deprecated/experimental APIs
3. Map the framework's **core concepts** (controllers, routes, middleware, models, etc.)
4. Understand the **directory conventions** (where do files go, naming patterns)
5. Identify the **recommended test framework** (Vitest, pytest, xUnit, etc.)

## Phase 2: Plan the Rule Architecture

Design rules to **minimize context window usage** while maximizing relevance.

### Guiding Principles

- **`core.md` is the only `alwaysApply: true` rule** — it must be compact (conventions only, zero code)
- **Every other rule uses narrow `paths:`** — activated only when touching relevant files
- **No catch-all patterns** (`**/*`, `**`, `*`) — use specific globs
- **No root-only globs** (`*.ts`) — always prefix with `**/`
- **`description` is mandatory** — the AI tool reads it to decide whether to load the rule
- **Separate concerns** — `core.md` = what to do, other rules = how to do it (GOOD/BAD patterns)
- **Group related rules** — use subdirectories for related concepts (e.g., `database/`, `state/`, `ui/`)

### Rule Sizing

- If a concept can be covered in < 20 lines of patterns, merge it into a related rule
- If a rule exceeds ~150 lines, split it into focused sub-rules
- Number of rules depends on framework complexity — a focused library (React: 6 rules) needs fewer than a full-stack framework (Angular/NestJS: 13 rules). Let the framework's surface area dictate the count, not an arbitrary target

## Phase 3: Implementation

### Step 1 — Update tech-config.json

Add to `src/tech-config.json`:

```json
"<framework>": {
  "type": "frontend" | "backend",
  "language": "typescript" | "python" | "csharp"
}
```

### Step 2 — Create settings.json

Create `configs/<framework>/settings.json`.

Copy from a similar existing framework and adapt:
- Frontend TS → use `angular` or `nextjs` as reference
- Backend TS → use `nestjs` as reference
- Backend Python → use `fastapi` or `flask` as reference
- Backend C# → use `dotnet` as reference

Include:
- Framework-specific CLI commands in `allow`
- Standard denies (git push, rm -rf, .env files)

### Step 3 — Create rules/core.md

```yaml
---
description: "<Framework X.Y+> project conventions and architecture"
alwaysApply: true
---
```

Content (CONVENTIONS ONLY — no code examples):
1. **Stack** — Framework version, language version, runtime, test framework, ORM/DB
2. **Architecture** — Directory structure diagram (ASCII tree)
3. **Core Principles** — Key patterns, responsibilities, naming conventions
4. **Commands** — Common CLI commands (dev, build, test, lint, generate)
5. **Code Style** — Framework-specific conventions (brief, no examples)

**Keep it under 100 lines.** Every line here is loaded into context on every request.

### Step 4 — Create specialized rules

For each rule file:

```yaml
---
description: "<Short description of what this rule covers>"
paths:
  - "<narrow glob 1>"
  - "<narrow glob 2>"
---
```

Each rule contains **code patterns** with GOOD/BAD examples:

```markdown
## Pattern Name

### GOOD

\`\`\`<language>
// Correct, current API usage
\`\`\`

### BAD

\`\`\`<language>
// Deprecated or incorrect pattern
\`\`\`
```

**Path scoping strategy:**
- Match by **file suffix pattern** (`**/*.controller.ts`, `**/*.service.ts`)
- Match by **directory convention** (`**/middleware/**`, `**/database/**`)
- Match by **specific config files** (`**/app.config.ts`, `**/main.ts`)
- Combine when a rule covers multiple related file types

**Content quality rules:**
- Only reference APIs from the **current stable version**
- Never use deprecated APIs (e.g., no `datetime.utcnow()` in Python 3.12+, no `jest` when the stack uses Vitest)
- Verify every import path and function signature exists in the current version
- Use the framework's recommended patterns, not community workarounds

### Step 5 — Update CLI

Update `src/cli.js`:
- Help text in `printUsage()` (Technologies section)
- Interactive choices in `interactiveInit()` (choices array)

### Step 6 — Update documentation

- `README.md` — Add to supported technologies table
- `CLAUDE.md` — Add to structure section

## Phase 4: Validation

### Run linter

```bash
npm run lint:rules
```

Must pass with 0 errors. The linter validates:
- `description` is present and non-empty
- `paths` or `alwaysApply` (mutually exclusive, one required)
- No catch-all patterns (`**/*`, `**`, `*`)
- No root-only globs (`*.ts` → should be `**/*.ts`)
- No unknown frontmatter keys (allowed: `description`, `paths`, `alwaysApply`, `name`, `version`)

### Run tests

```bash
npm test
```

All 92+ tests must pass.

### Manual verification

```bash
# Test in temp directory
cd /tmp && mkdir test-<framework> && cd test-<framework>
npx /path/to/ai-rules init <framework> --with-rules --with-skills
```

Verify:
- `core.md` is compact (conventions only, no code)
- Each rule has narrow `paths:` targeting only relevant files
- Rules contain GOOD/BAD patterns with current API usage
- No rule duplicates content from `core.md`

## Reference

| Framework | Type | Language | Good reference for |
|-----------|------|----------|--------------------|
| angular | frontend | typescript | Signals, subdirectories (state/, ui/) |
| react | frontend | typescript | Hooks, Vite patterns |
| nextjs | frontend | typescript | App Router, RSC |
| nestjs | backend | typescript | Decorators, DI, modules |
| adonisjs | backend | typescript | MVC, Lucid ORM |
| dotnet | backend | csharp | Clean Architecture |
| fastapi | backend | python | Pydantic, async |
| flask | backend | python | Blueprints, extensions |

## Quality Checklist

Before completing:
- [ ] `npm run lint:rules` — 0 errors, 0 warnings
- [ ] `npm test` — all tests pass
- [ ] `core.md` < 100 lines, `alwaysApply: true`, no code examples
- [ ] Every other rule has `description` + narrow `paths:` (no catch-all)
- [ ] All code examples use **current stable** APIs (no deprecated patterns)
- [ ] Each rule is self-contained (no cross-references to other rules)
- [ ] README.md and CLAUDE.md updated
- [ ] tech-config.json and cli.js updated
