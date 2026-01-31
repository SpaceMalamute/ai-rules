---
name: security-audit
description: Perform security audit on the codebase and generate recommendations
argument-hint: "[--focus <area>]"
---

# Security Audit

Perform a comprehensive security audit of the codebase.

## Usage

- `/security-audit` - Full security audit
- `/security-audit --focus auth` - Focus on authentication
- `/security-audit --focus api` - Focus on API security
- `/security-audit --focus deps` - Focus on dependencies
- `/security-audit --focus secrets` - Focus on secret detection

## Behavior

1. **Scan Codebase**
   - Search for common vulnerability patterns
   - Check dependency versions
   - Analyze authentication/authorization
   - Review API endpoints
   - Check for hardcoded secrets

2. **Generate Report**
   - Severity ratings (Critical, High, Medium, Low)
   - Location of issues
   - Remediation steps
   - Code examples for fixes

## Audit Categories

### 1. Authentication & Authorization

| Check | What to Look For |
|-------|------------------|
| Password Storage | bcrypt/argon2, no plain text |
| JWT Security | Proper signing, expiration, refresh |
| Session Management | Secure cookies, CSRF protection |
| Authorization | Role checks, resource ownership |

### 2. Input Validation

| Check | What to Look For |
|-------|------------------|
| SQL Injection | Parameterized queries, ORM usage |
| XSS | Output encoding, CSP headers |
| Command Injection | Input sanitization |
| Path Traversal | Path validation |

### 3. API Security

| Check | What to Look For |
|-------|------------------|
| Rate Limiting | Request throttling |
| CORS | Proper origin restrictions |
| Headers | Security headers (HSTS, CSP, etc.) |
| Error Handling | No stack traces in production |

### 4. Secrets Management

| Check | What to Look For |
|-------|------------------|
| Hardcoded Secrets | API keys, passwords in code |
| .env Files | Not committed, proper .gitignore |
| Config Files | No secrets in config |

### 5. Dependencies

| Check | What to Look For |
|-------|------------------|
| Known Vulnerabilities | CVE database check |
| Outdated Packages | Security patches |
| License Compliance | Compatible licenses |

## Output Format

```
# Security Audit Report

**Date:** 2024-01-15
**Scope:** Full codebase
**Risk Level:** Medium

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 5 |
| 🔵 Low | 8 |

## Critical/High Findings

### [HIGH] SQL Injection in User Search
**File:** src/users/users.service.ts:45
**Issue:** Raw SQL query with user input
**Current Code:**
```typescript
db.query(`SELECT * FROM users WHERE name = '${name}'`)
```
**Remediation:**
```typescript
db.query('SELECT * FROM users WHERE name = $1', [name])
```

### [HIGH] Missing Rate Limiting on Login
**File:** src/auth/auth.controller.ts
**Issue:** No rate limiting on /auth/login endpoint
**Remediation:** Add rate limiting middleware

## Medium Findings

### [MEDIUM] Missing Security Headers
**Issue:** CSP, X-Frame-Options not set
**Remediation:** Add helmet middleware

## Low Findings

### [LOW] Verbose Error Messages
**File:** src/app.module.ts
**Issue:** Stack traces visible in production
**Remediation:** Use exception filter

## Recommendations

1. **Immediate:** Fix SQL injection vulnerability
2. **This Sprint:** Add rate limiting to auth endpoints
3. **Backlog:** Implement security headers
4. **Ongoing:** Set up automated dependency scanning

## Commands to Run

```bash
# Check dependencies
npm audit
# or
pip-audit

# Scan for secrets
gitleaks detect

# Scan for vulnerabilities
snyk test
```
```

## Patterns to Detect

### SQL Injection
```javascript
// Bad
`SELECT * FROM users WHERE id = ${id}`
// Good
'SELECT * FROM users WHERE id = $1', [id]
```

### XSS
```javascript
// Bad
element.innerHTML = userInput
// Good
element.textContent = userInput
```

### Hardcoded Secrets
```javascript
// Bad
const apiKey = 'sk-1234567890'
// Good
const apiKey = process.env.API_KEY
```

### Insecure Password Storage
```javascript
// Bad
const hash = md5(password)
// Good
const hash = await bcrypt.hash(password, 12)
```
