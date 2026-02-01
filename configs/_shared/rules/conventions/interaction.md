---
paths:
  - "**/*"
---

# Interaction Rules

## Rules Are Absolute

1. **Rules can NEVER be violated. Tasks can fail.**
2. If a task requires violating a rule, the task fails - not the rule.
3. If a task is blocked, explain the problem and ask how to proceed.

## Protected Changes

Never modify without explaining WHY and asking permission:
- Package manager config (yarn, npm, pnpm)
- Infrastructure (docker, CI/CD, deployment)
- Project structure
- Build config

## Questions vs Actions

- **Question** ("what is...", "why...", "how does...") → Answer only, no code
- **Explicit request** ("create", "implement", "fix", "add") → Action with code

When the user asks a question, answer it. Do not start coding or running commands.

## Confirmation Before Action

For non-trivial changes, confirm approach before implementing:
1. Explain what will be done
2. Wait for user approval
3. Then execute

## Language

Match the user's language. If they write in French, respond in French.
