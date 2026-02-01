---
name: migration
description: Generate and manage database migrations
argument-hint: "<action> [name]"
---

# Database Migration Manager

Generate and manage database migrations across different ORMs.

## Usage

- `/migration create add_users_table` - Create new migration
- `/migration status` - Show migration status
- `/migration up` - Apply pending migrations
- `/migration down` - Rollback last migration
- `/migration reset` - Reset database (dev only)

## Behavior

1. **Detect ORM/Migration Tool**
   - Prisma → `prisma migrate`
   - TypeORM → TypeORM migrations
   - Drizzle → Drizzle Kit
   - Alembic → Alembic migrations
   - EF Core → Entity Framework migrations
   - Django → Django migrations

2. **Create Migration**

### Prisma
```bash
npx prisma migrate dev --name <name>
```

### Alembic
```bash
alembic revision --autogenerate -m "<name>"
```

### EF Core
```bash
dotnet ef migrations add <name>
```

3. **Migration File Template**

Generate migration with:
- Descriptive name with timestamp
- Up migration (forward)
- Down migration (rollback)
- Safe operations (transactions where supported)

## Actions

### `create <name>`

1. Analyze schema changes (if ORM detected)
2. Generate migration file
3. Show what will be migrated

**Output:**
```
## Migration Created

File: migrations/20240115_add_users_table.ts

### Changes Detected
- CREATE TABLE users (id, email, name, created_at)
- CREATE INDEX ix_users_email ON users(email)

### Commands
- Apply: npm run migrate
- Rollback: npm run migrate:down
```

### `status`

Show current migration status:
```
## Migration Status

Applied:
✓ 20240110_initial
✓ 20240112_add_posts

Pending:
○ 20240115_add_comments

Current: 20240112_add_posts
```

### `up`

Apply pending migrations with safety checks:
1. Backup reminder for production
2. Show what will be applied
3. Confirm before applying
4. Run migrations
5. Verify success

### `down`

Rollback with safety:
1. Show what will be rolled back
2. Warn about data loss
3. Confirm before rolling back
4. Run rollback
5. Verify success

## Common Migration Patterns

### Add Column (Nullable First)
```sql
-- Up
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- Down
ALTER TABLE users DROP COLUMN phone;
```

### Add Column (Non-Nullable)
```sql
-- Up
ALTER TABLE users ADD COLUMN role VARCHAR(20);
UPDATE users SET role = 'user' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

-- Down
ALTER TABLE users DROP COLUMN role;
```

### Rename Column
```sql
-- Up
ALTER TABLE users RENAME COLUMN name TO full_name;

-- Down
ALTER TABLE users RENAME COLUMN full_name TO name;
```

### Add Index
```sql
-- Up
CREATE INDEX CONCURRENTLY ix_users_email ON users(email);

-- Down
DROP INDEX ix_users_email;
```

## Safety Guidelines

- Always provide rollback path
- Use `CONCURRENTLY` for index creation (PostgreSQL)
- Avoid locks on large tables
- Split large data migrations into batches
- Test migrations on copy of production data
- Never modify applied migrations
