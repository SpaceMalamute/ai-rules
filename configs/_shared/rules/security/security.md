---
description: "OWASP Top 10 security rules"
paths:
  - "**/*.ts"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
  - "**/*.java"
---

# Security Rules (OWASP Top 10 2021)

## A01:2021 — Broken Access Control

- Always verify resource ownership — never trust client-provided IDs alone
- Check authorization at every endpoint — not just at the route level
- Deny by default — explicitly grant access, never assume it
- Use anti-CSRF tokens for all state-changing operations
- Set cookies: `httpOnly: true`, `secure: true`, `sameSite: 'strict'`

## A02:2021 — Cryptographic Failures

- Never store plain passwords — use bcrypt (cost 12+) or argon2id
- Use TLS everywhere — no exceptions in production
- DO NOT use MD5/SHA1 for passwords — use bcrypt/argon2id

## A03:2021 — Injection

- ALL database queries must be parameterized — never concatenate user input
- Use ORM/query builder exclusively — raw SQL only with parameterized queries
- Sanitize user input before shell commands — prefer safe APIs over `exec()`
- Never use `innerHTML` / `dangerouslySetInnerHTML` with user content — sanitize with DOMPurify

## A04:2021 — Insecure Design

- Validate all inputs server-side — never trust client validation
- Use allowlists over denylists — explicitly define what's accepted
- Validate type, length, format, and range with schema validation (Zod, Pydantic, FluentValidation)

## A05:2021 — Security Misconfiguration

- Set: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`
- Use `helmet` (Node.js), `django-csp` (Python), or equivalent middleware
- DO NOT disable CORS for convenience — configure allowed origins explicitly

## A06:2021 — Vulnerable and Outdated Components

- Audit dependencies regularly: `npm audit`, `pip-audit`, `dotnet list package --vulnerable`
- Use lockfiles (`package-lock.json`, `poetry.lock`) — commit them
- Remove unused dependencies — smaller surface area = fewer vulnerabilities
- Pin exact versions in production — no `^` or `~` for critical deps

## A07:2021 — Identification and Authentication Failures

- Use cryptographically random session tokens (min 128-bit entropy)
- Implement account lockout after 5 failed attempts with exponential backoff
- Use constant-time comparison for secrets (`timingSafeEqual`, `hmac.compare_digest`)
- DO NOT store JWT in localStorage — use httpOnly cookies (prevents cookie theft via XSS)

## A08:2021 — Software and Data Integrity Failures

- Verify integrity of software updates and CI/CD pipelines — sign artifacts
- DO NOT deserialize untrusted data without validation — use safe serialization formats
- Use Subresource Integrity (SRI) for third-party scripts and CDN resources
- Use framework-provided escaping (React JSX, Angular template binding)

## A09:2021 — Security Logging and Monitoring Failures

- Never expose stack traces to users — log internally, return generic message
- Validate error responses don't leak internal paths, versions, or query details

## A10:2021 — Server-Side Request Forgery (SSRF)

- Validate and allowlist URLs in server-side HTTP requests — never let user input control destinations
- Restrict outbound traffic with network-level controls (firewall, egress rules)
- DO NOT expose internal service responses to clients — sanitize and filter before returning
