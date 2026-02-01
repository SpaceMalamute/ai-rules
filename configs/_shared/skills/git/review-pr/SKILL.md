---
name: review-pr
description: Review a GitHub PR with security, performance, and quality checks
argument-hint: <pr-number>
---

# Review Pull Request

Review the GitHub PR #$ARGUMENTS

## Steps

1. **Fetch PR details**
   ```bash
   gh pr view $ARGUMENTS
   gh pr diff $ARGUMENTS
   ```

2. **Understand context**
   - Read PR title and description
   - Check linked issues
   - Note the scope of changes

3. **Review the diff**
   Go through each changed file and check:

   ### Correctness
   - Logic errors
   - Edge cases
   - Error handling

   ### Security
   - Input validation
   - Injection risks
   - Auth/authz issues

   ### Performance
   - N+1 queries
   - Unnecessary operations
   - Memory concerns

   ### Code Quality
   - Naming clarity
   - Single responsibility
   - Code duplication

   ### Tests
   - Coverage of new code
   - Edge cases tested

   ### Conventions
   - Project style followed
   - Consistent with codebase

4. **Provide feedback**

   Format your review as:

   ```
   ## Summary
   [Overall assessment: approve/request changes/comment]

   ## Critical (must fix)
   - [ ] Issue 1 (file:line)
   - [ ] Issue 2 (file:line)

   ## Suggestions (nice to have)
   - [ ] Suggestion 1
   - [ ] Suggestion 2

   ## Questions
   - Question about design choice?

   ## Positive
   - What's done well
   ```

5. **Optional: Submit review via CLI**
   ```bash
   gh pr review $ARGUMENTS --approve
   gh pr review $ARGUMENTS --request-changes --body "..."
   gh pr review $ARGUMENTS --comment --body "..."
   ```
