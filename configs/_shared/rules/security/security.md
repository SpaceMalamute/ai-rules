---
description: "OWASP Top 10 security rules"
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
  - "**/*.java"
---

# Security Rules (OWASP Top 10 2025)

## A01:2025 — Broken Access Control

- Always verify resource ownership — never trust client-provided IDs alone
- Check authorization at every endpoint — not just at the route level
- Deny by default — explicitly grant access, never assume it
- Use anti-CSRF tokens for all state-changing operations
- Set cookies: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`

## A02:2025 — Security Misconfiguration

- Set: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`
- Use `helmet` (Node.js), `django-csp` (Python), or equivalent middleware
- DO NOT disable CORS for convenience — configure allowed origins explicitly

## A03:2025 — Software Supply Chain Failures

- Audit dependencies regularly: `npm audit`, `pip-audit`, `dotnet list package --vulnerable`
- Use lockfiles (`package-lock.json`, `poetry.lock`) — commit them
- Remove unused dependencies — smaller surface area = fewer vulnerabilities
- Pin exact versions in production — no `^` or `~` for critical deps

## A04:2025 — Cryptographic Failures

- Never store plain passwords — use bcrypt (cost 12+) or argon2id
- Use TLS everywhere — no exceptions in production
- Never log passwords, tokens, API keys, PII, or credit card numbers
- DO NOT use MD5/SHA1 for passwords — use bcrypt/argon2id

## A05:2025 — Injection

- ALL database queries must be parameterized — never concatenate user input
- Use ORM/query builder exclusively — raw SQL only with parameterized queries
- Sanitize user input before shell commands — prefer safe APIs over `exec()`
- Never use `innerHTML` / `dangerouslySetInnerHTML` with user content — sanitize with DOMPurify

## A06:2025 — Insecure Design

- Validate all inputs server-side — never trust client validation
- Use allowlists over denylists — explicitly define what's accepted
- Validate type, length, format, and range with schema validation (Zod, Pydantic, FluentValidation)

## A07:2025 — Authentication Failures

- Use cryptographically random session tokens (min 128-bit entropy)
- Implement account lockout after 5 failed attempts with exponential backoff
- Use constant-time comparison for secrets (`timingSafeEqual`, `hmac.compare_digest`)
- DO NOT store JWT in localStorage — use httpOnly cookies (XSS-proof)

## A08:2025 — Software or Data Integrity Failures

- Mask sensitive data in API responses (`****1111` not full card number)
- DO NOT skip auth checks on "internal" endpoints — zero trust
- Use framework-provided escaping (React JSX, Angular template binding)

## A09:2025 — Security Logging & Alerting Failures

- Never expose stack traces to users — log internally, return generic message
- Validate error responses don't leak internal paths, versions, or query details
- DO NOT log secrets even accidentally — redact sensitive fields in serializers

## A10:2025 — Mishandling of Exceptional Conditions

- Always catch at boundaries (middleware, error handler) — no unhandled rejections
- Fail securely — errors must not bypass security controls or leave resources in an insecure state
- Validate required configuration at startup — fail fast if missing
