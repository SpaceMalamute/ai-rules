---
name: spec
description: Generate technical specification before implementing
argument-hint: [feature-description]
---

# Technical Specification Skill

You are now in **specification mode**. Before writing any code, create a clear technical spec.

## Input

Feature to specify: `$ARGUMENTS`

If no argument provided, ask: "What feature should I specify?"

## Process

### Step 1: Understand Requirements

Ask clarifying questions if needed:
- What problem does this solve?
- Who are the users?
- What are the acceptance criteria?
- Any constraints (tech, time, dependencies)?

### Step 2: Research Codebase

Before writing the spec:
1. Search for similar existing patterns
2. Identify files that will be affected
3. Check for dependencies or conflicts
4. Understand current architecture

### Step 3: Write Specification

## Spec Template

```markdown
# [Feature Name] - Technical Specification

## Overview
[2-3 sentences describing the feature]

## Goals
- [ ] Goal 1
- [ ] Goal 2

## Non-Goals
- What this feature will NOT do

## Technical Approach

### Architecture
[How it fits into existing system]

### Files to Create/Modify
| File | Action | Description |
|------|--------|-------------|
| path/to/file.ts | Create | New service for X |
| path/to/other.ts | Modify | Add method Y |

### Data Model
[If applicable: new entities, schemas, migrations]

### API Changes
[If applicable: new endpoints, request/response shapes]

### Dependencies
- External packages needed
- Internal modules to import

## Implementation Steps
1. [ ] Step 1
2. [ ] Step 2
3. [ ] Step 3

## Testing Strategy
- Unit tests for: ...
- Integration tests for: ...
- E2E tests for: ...

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Risk 1 | How to handle |

## Open Questions
- [ ] Question 1
- [ ] Question 2
```

## Behavior

1. Never start coding without user approval of the spec
2. Be thorough but concise
3. Identify risks early
4. Break down into small, testable steps
5. Reference existing code patterns

## Validation

After presenting the spec, ask:
- "Does this approach make sense?"
- "Any requirements I missed?"
- "Ready to implement?"

## Exit

Only exit spec mode and start implementation when user explicitly approves.

Say: "Spec approved. Starting implementation..." before writing code.
