---
name: fix-issue
description: Analyze and fix a GitHub issue with structured workflow
argument-hint: <issue-number>
---

# Fix GitHub Issue

Fix the GitHub issue #$ARGUMENTS

## Steps

1. **Fetch the issue**
   ```bash
   gh issue view $ARGUMENTS
   ```

2. **Analyze the issue**
   - Understand what's being reported
   - Identify acceptance criteria
   - Note any labels (bug, feature, etc.)

3. **Investigate the codebase**
   - Find relevant files
   - Understand current behavior
   - Identify root cause (if bug)

4. **Plan the fix**
   - List files to modify
   - Describe the approach
   - Ask for confirmation before implementing

5. **Implement**
   - Make minimal, focused changes
   - Follow project conventions
   - Add/update tests if needed

6. **Verify**
   - Run tests
   - Manually verify the fix addresses the issue

7. **Prepare for PR**
   - Summarize changes
   - Reference the issue number in commit message: `fix: description (#$ARGUMENTS)`
