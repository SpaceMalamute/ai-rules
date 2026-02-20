---
description: "Documentation standards and API doc conventions"
paths:
  - "**/README.md"
  - "**/CHANGELOG.md"
  - "**/docs/**"
  - "**/ADR/**"
---

# Documentation Standards

## README Structure

```markdown
# Project Name

Brief description (1-2 sentences).

## Quick Start

\`\`\`bash
# Clone and setup
git clone <repo>
cd project
npm install
npm run dev
\`\`\`

## Prerequisites

- Node.js 20+
- Docker
- PostgreSQL 16

## Installation

Step-by-step setup instructions.

## Usage

Basic usage examples.

## API Reference

Link to API docs or brief overview.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | DB connection | required |

## Development

\`\`\`bash
npm run dev      # Start dev server
npm run test     # Run tests
npm run lint     # Lint code
npm run build    # Build for production
\`\`\`

## Deployment

How to deploy to production.

## Contributing

Link to CONTRIBUTING.md or brief guidelines.

## License

MIT / Apache-2.0 / etc.
```

## Architecture Decision Records (ADR)

### Template

```markdown
# ADR-001: Use PostgreSQL as primary database

## Status

Accepted | Proposed | Deprecated | Superseded by ADR-XXX

## Date

2024-01-15

## Context

What is the issue we're facing? What are the constraints?

## Decision

What is the change we're making?

## Consequences

### Positive
- Benefit 1
- Benefit 2

### Negative
- Drawback 1
- Drawback 2

### Risks
- Risk 1 and mitigation

## Alternatives Considered

1. **Alternative A**: Why rejected
2. **Alternative B**: Why rejected
```

### Naming Convention

```
docs/adr/
├── 001-use-postgresql.md
├── 002-adopt-microservices.md
├── 003-authentication-strategy.md
└── README.md  # Index of all ADRs
```

## Changelog

### Format (Keep a Changelog)

```markdown
# Changelog

All notable changes to this project.

## [Unreleased]

### Added
- New feature X

### Changed
- Updated dependency Y

## [1.2.0] - 2024-01-15

### Added
- User authentication (#123)
- Email notifications (#124)

### Fixed
- Login redirect issue (#125)

### Security
- Patched XSS vulnerability (#126)

## [1.1.0] - 2024-01-01

### Added
- Initial release
```

### Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Vulnerability fixes

## API Documentation

### OpenAPI/Swagger

```yaml
openapi: 3.0.3
info:
  title: My API
  version: 1.0.0
  description: API description

paths:
  /users:
    get:
      summary: List users
      description: Returns paginated list of users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
```

### Inline Documentation

```typescript
/**
 * Creates a new user account.
 *
 * @param data - User registration data
 * @returns Created user object
 * @throws {ValidationError} When email is invalid
 * @throws {ConflictError} When email already exists
 *
 * @example
 * const user = await createUser({
 *   email: 'user@example.com',
 *   password: 'secure123'
 * });
 */
async function createUser(data: CreateUserDto): Promise<User> {
  // Implementation
}
```

## Code Comments

### When to Comment

```typescript
// GOOD: Explains WHY, not WHAT
// Using retry with exponential backoff because the external API
// has rate limiting and occasional timeouts
await retryWithBackoff(() => externalApi.call());

// BAD: Explains WHAT (obvious from code)
// Loop through users
for (const user of users) { ... }

// GOOD: Documents non-obvious behavior
// Note: Returns null instead of throwing when user not found
// to support optional user lookups in middleware
async function findUser(id: string): Promise<User | null>

// GOOD: TODO with context
// TODO(#123): Replace with proper caching once Redis is available
const cache = new Map();
```

### Comment Types

```typescript
// TODO: Feature to implement
// FIXME: Known bug to fix
// HACK: Temporary workaround
// NOTE: Important information
// WARN: Potential issue
// DEPRECATED: Will be removed
```

## Project Structure Documentation

```markdown
# Project Structure

\`\`\`
src/
├── modules/           # Feature modules
│   ├── users/         # User management
│   │   ├── dto/       # Data transfer objects
│   │   ├── entities/  # Database entities
│   │   └── users.service.ts
│   └── orders/        # Order management
├── common/            # Shared utilities
│   ├── decorators/    # Custom decorators
│   ├── filters/       # Exception filters
│   └── guards/        # Auth guards
├── config/            # Configuration
└── main.ts            # Entry point
\`\`\`
```

## Runbooks

### Template

```markdown
# Runbook: Database Connection Issues

## Symptoms
- API returning 500 errors
- Logs show "Connection refused"

## Diagnosis
1. Check database status: `docker ps | grep postgres`
2. Check connections: `SELECT count(*) FROM pg_stat_activity;`
3. Check logs: `docker logs postgres`

## Resolution

### If database is down
\`\`\`bash
docker-compose restart db
\`\`\`

### If too many connections
\`\`\`bash
# Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle' AND query_start < now() - interval '1 hour';
\`\`\`

## Escalation
Contact: @database-team in #incidents
```

## Anti-patterns

- No README
- Outdated documentation
- Documenting WHAT instead of WHY
- No ADRs for major decisions
- Missing changelog
- Undocumented environment variables
- No setup instructions
