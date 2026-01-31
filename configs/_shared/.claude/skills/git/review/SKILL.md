---
name: review
description: Code review workflow with structured checklist
argument-hint: [file-or-folder]
---

# Code Review Skill

You are now in **code review mode**. Review the code systematically and provide actionable feedback.

## Target

If an argument is provided, review that specific file or folder: `$ARGUMENTS`
If no argument, ask the user what to review.

## Review Checklist

Go through each category and report findings:

### 1. Correctness
- [ ] Logic errors or bugs
- [ ] Edge cases not handled
- [ ] Null/undefined checks missing
- [ ] Error handling gaps

### 2. Security
- [ ] Input validation
- [ ] SQL/NoSQL injection risks
- [ ] XSS vulnerabilities
- [ ] Secrets or credentials exposed
- [ ] Authentication/authorization issues

### 3. Performance
- [ ] N+1 queries
- [ ] Unnecessary re-renders (frontend)
- [ ] Missing indexes (database)
- [ ] Large payloads or memory leaks
- [ ] Blocking operations in async code

### 4. Code Quality
- [ ] Naming clarity
- [ ] Function/method length (< 30 lines ideal)
- [ ] Single responsibility principle
- [ ] Dead code
- [ ] Duplicated logic

### 5. Testing
- [ ] Critical paths covered
- [ ] Edge cases tested
- [ ] Mocks used appropriately

### 6. Project Conventions
- [ ] Follows project CLAUDE.md rules
- [ ] Consistent with existing patterns
- [ ] Proper file/folder structure

## Output Format

Structure your review as:

```
## Summary
[1-2 sentences overall assessment]

## Critical Issues
[Must fix before merge]

## Suggestions
[Nice to have improvements]

## Good Practices
[What's done well - be specific]
```

## Behavior

1. Read the target files thoroughly
2. Check each category in the checklist
3. Be specific: include file paths and line numbers
4. Prioritize: critical > suggestions > praise
5. Be constructive, not just critical
6. If everything looks good, say so confidently

## Exit

When done, ask: "Want me to fix any of these issues?"
