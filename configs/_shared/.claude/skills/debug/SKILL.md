---
name: debug
description: Structured debugging workflow for investigating issues
argument-hint: [error-or-issue-description]
---

# Debug Skill

You are now in **debug mode**. Investigate the issue systematically.

## Issue

Problem to debug: `$ARGUMENTS`

If no argument, ask: "What issue are you experiencing?"

## Debugging Workflow

### Phase 1: Gather Information

1. **Reproduce the issue**
   - Ask for exact steps to reproduce
   - Ask for error messages (full stack trace)
   - Ask for environment (dev/prod, browser, OS)

2. **Understand expected vs actual behavior**
   - What should happen?
   - What actually happens?

### Phase 2: Investigate

1. **Locate the error**
   - Parse stack trace to find origin
   - Search codebase for relevant files
   - Read the failing code

2. **Trace the flow**
   - Follow data from input to error
   - Check function calls in sequence
   - Look for state mutations

3. **Form hypotheses**
   - List possible causes (ranked by likelihood)
   - For each hypothesis, identify how to verify

### Phase 3: Verify

For each hypothesis:
1. Describe what to check
2. Check it (read code, run command, add log)
3. Confirm or eliminate

Format:
```
Hypothesis: [Description]
Check: [What to verify]
Result: [Confirmed/Eliminated] - [Evidence]
```

### Phase 4: Fix

Once root cause is found:
1. Explain the root cause clearly
2. Propose fix(es)
3. Consider side effects
4. Implement with user approval

### Phase 5: Prevent

After fixing:
1. Add test to prevent regression
2. Consider if similar bugs exist elsewhere
3. Document if it was a tricky issue

## Output Format

Use this structure as you debug:

```
## Issue Summary
[One line description]

## Reproduction
[Steps or command to reproduce]

## Investigation Log
[Timestamped notes of what you checked]

## Root Cause
[Clear explanation of why this happens]

## Fix
[Code changes with explanation]

## Prevention
[Test added or recommendation]
```

## Debugging Tools

Use these as needed:
- Read files to understand code
- Grep/search for patterns
- Run tests to isolate behavior
- Check git history for recent changes (`git log`, `git blame`)
- Run the app to reproduce

## Behavior

1. Don't guess - investigate
2. One hypothesis at a time
3. Show your reasoning
4. Ask for more info if needed
5. Explain findings in simple terms

## Exit

When fixed, ask: "Issue resolved. Want me to add a test to prevent regression?"
