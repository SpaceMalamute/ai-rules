---
name: add-framework
description: Add support for a new framework/technology
argument-hint: <framework-name>
---

# Add Framework Support

Add support for a new framework/technology to ai-rules.

## Input

Framework name: `$ARGUMENTS`

If no argument provided, ask: "Which framework do you want to add? (e.g., adonisjs, remix, sveltekit)"

## Checklist

### 1. Update tech-config.json

Add the technology to `src/tech-config.json`:

```json
{
  "technologies": {
    "<framework>": {
      "type": "frontend" | "backend",
      "language": "typescript" | "python" | "csharp"
    }
  }
}
```

### 2. Create config directory

```
configs/<framework>/
├── settings.json       # Permissions (allow/deny commands)
└── rules/
    └── core.md         # Main conventions (alwaysApply: true)
```

### 3. Create settings.json

Copy from a similar framework and adapt:
- Frontend TS: use `angular` or `nextjs` as reference
- Backend TS: use `nestjs` as reference
- Backend Python: use `fastapi` or `flask` as reference
- Backend C#: use `dotnet` as reference

Include:
- Framework-specific CLI commands in `allow`
- Standard denies (git push, rm -rf, .env files)

### 4. Create rules/core.md

Required frontmatter:
```yaml
---
description: "<Framework> project conventions and architecture"
alwaysApply: true
---
```

Content structure:
1. **Stack** - Framework version, language, runtime, test framework, ORM
2. **Architecture** - Directory structure diagram
3. **Core Principles** - Key patterns and responsibilities
4. **Commands** - Common CLI commands
5. **Code Style** - Framework-specific conventions

### 5. Create additional rules

**Follow the framework's official conventions and best practices.**

Before writing rules:
1. Read the framework's official documentation
2. Identify its core concepts and patterns
3. Create rules that match those concepts

Example: AdonisJS uses Controllers, Models, Validators, Middleware - create rules for those.
Example: Hono uses handlers and middleware - create rules for those.
Example: Next.js uses App Router, Server Components, Server Actions - create rules for those.

Add path-based activation in frontmatter:

```yaml
---
paths:
  - "app/**/*.ts"  # Adapt to framework's structure
---
```

### 6. Update documentation

Update these files:
- `README.md` - Add to supported technologies list
- `CLAUDE.md` - Add to structure section

### 7. Test installation

```bash
# Build and test locally
npm test

# Test in a temp directory
cd /tmp && mkdir test-<framework> && cd test-<framework>
npx /path/to/ai-rules init <framework> --with-rules --with-skills
```

## Reference: Existing Frameworks

| Framework | Type | Language | Reference for |
|-----------|------|----------|---------------|
| angular | frontend | typescript | Signals, standalone components |
| nextjs | frontend | typescript | App Router, RSC |
| nestjs | backend | typescript | Decorators, DI, modules |
| dotnet | backend | csharp | Clean Architecture |
| fastapi | backend | python | Pydantic, async |
| flask | backend | python | Blueprints, Marshmallow |

## Quality Checklist

Before completing:
- [ ] `npm test` passes
- [ ] Installation creates correct structure
- [ ] Rules have proper `paths:` frontmatter
- [ ] core.md has `alwaysApply: true`
- [ ] No code examples in core.md (only in specific rules)
- [ ] Documentation updated
