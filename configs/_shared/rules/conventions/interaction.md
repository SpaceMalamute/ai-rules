---
paths:
  - "**/*"
---

# Interaction Rules

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
