---
description: "OWASP Top 10 security rules"
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
  - "**/*.java"
---

# Security Rules (OWASP Top 10)

## 1. Injection Prevention

### SQL Injection
```typescript
// Bad - string concatenation
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good - parameterized queries
const query = 'SELECT * FROM users WHERE id = $1';
await db.query(query, [userId]);
```

### NoSQL Injection
```typescript
// Bad - user input directly in query
db.users.find({ email: req.body.email });

// Good - validate and sanitize
const email = validateEmail(req.body.email);
db.users.find({ email });
```

### Command Injection
```typescript
// Bad - user input in command
exec(`ls ${userInput}`);

// Good - use safe APIs or sanitize
exec('ls', [sanitize(userInput)]);
```

## 2. Authentication

- Never store plain passwords - use bcrypt/argon2
- Use secure session tokens (cryptographically random)
- Implement account lockout after failed attempts
- Use constant-time comparison for secrets

```typescript
// Bad
if (password === storedPassword) { }

// Good
import { timingSafeEqual } from 'crypto';
if (timingSafeEqual(Buffer.from(a), Buffer.from(b))) { }
```

## 3. Sensitive Data Exposure

### Never log sensitive data
```typescript
// Bad
logger.info('User login', { email, password });

// Good
logger.info('User login', { email, password: '[REDACTED]' });
```

### Never commit secrets
- Use environment variables
- Add to `.gitignore`: `.env`, `*.pem`, `credentials.json`
- Use secret managers in production

### Mask in responses
```typescript
// Bad - return full credit card
{ cardNumber: '4111111111111111' }

// Good - mask sensitive parts
{ cardNumber: '************1111' }
```

## 4. XSS Prevention

```typescript
// Bad - innerHTML with user content
element.innerHTML = userInput;

// Good - use safe methods
element.textContent = userInput;

// React/Angular - avoid dangerouslySetInnerHTML / [innerHTML]
// If needed, sanitize first with DOMPurify
```

## 5. CSRF Protection

- Use anti-CSRF tokens for state-changing operations
- Validate `Origin` and `Referer` headers
- Use `SameSite` cookie attribute

```typescript
// Set secure cookies
res.cookie('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
});
```

## 6. Access Control

```typescript
// Always check ownership
async function getDocument(userId: string, docId: string) {
  const doc = await db.documents.findById(docId);

  // Bad - missing authorization check
  return doc;

  // Good - verify ownership
  if (doc.ownerId !== userId) {
    throw new ForbiddenError();
  }
  return doc;
}
```

## 7. Security Headers

```typescript
// Essential headers
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'",
  'X-XSS-Protection': '1; mode=block',
}
```

## 8. Input Validation

- Validate all inputs on server side (never trust client)
- Use allowlists over denylists
- Validate type, length, format, range

```typescript
// Use schema validation
const schema = z.object({
  email: z.string().email().max(256),
  age: z.number().int().min(0).max(150),
  role: z.enum(['user', 'admin']),
});
```

## 9. Error Handling

```typescript
// Bad - expose internal errors
catch (error) {
  res.status(500).json({ error: error.stack });
}

// Good - generic message, log internally
catch (error) {
  logger.error('Database error', { error });
  res.status(500).json({ error: 'Internal server error' });
}
```

## 10. Dependencies

- Keep dependencies updated
- Audit regularly: `npm audit`, `pip-audit`, `dotnet list package --vulnerable`
- Remove unused dependencies
- Pin versions in production

## Quick Checklist

Before committing, verify:
- [ ] No secrets in code
- [ ] User inputs validated and sanitized
- [ ] SQL/NoSQL queries parameterized
- [ ] Sensitive data not logged
- [ ] Authorization checks in place
- [ ] Error messages don't expose internals
