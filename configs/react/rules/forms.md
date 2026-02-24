---
description: "React form handling patterns"
paths:
  - "**/src/components/forms/**/*.tsx"
  - "**/src/**/form*.tsx"
  - "**/src/**/*-form.tsx"
---

# React Forms

## Decision Matrix

| Complexity | Solution | When |
|-----------|----------|------|
| Simple (1-3 fields, no client validation) | `<form action={fn}>` + `useActionState` | Contact, search, simple CRUD |
| Medium (validation, dynamic fields) | React Hook Form + Zod | Login, settings, profiles |
| Complex (multi-step, arrays, conditionals) | React Hook Form + Zod + `useFieldArray` | Wizards, dynamic lists, nested forms |

## useActionState (React 19 Default)

- Use for simple forms: `const [state, formAction, isPending] = useActionState(action, initialState)`
- Action signature: `async (prevState, formData) => newState`
- Return error/success state from the action — render based on returned state
- Wire to `<form action={formAction}>` for progressive enhancement

## React Hook Form + Zod (Complex Forms)

- Always use `zodResolver(schema)` — single source of truth for validation
- Infer TypeScript types from Zod schema with `z.infer<typeof schema>`
- Use `register()` for simple inputs, `Controller` for third-party UI components
- Access `formState.errors` and `isSubmitting` for UI feedback

## Accessibility (All Forms)

- Every input MUST have an associated `<label>` with `htmlFor`
- Link errors to inputs with `aria-describedby` and `aria-invalid`
- Error messages MUST use `role="alert"`
- Submit triggers MUST be `<button type="submit">` — never a `<div>` or `<span>`

## Controlled vs Uncontrolled

- Default to uncontrolled (`<form action>` + FormData) — simpler, fewer re-renders
- Use controlled inputs only when real-time feedback is needed (debounced search, live preview, character count)

## Anti-Patterns

- Do NOT use `useFormState` — it is deprecated, use `useActionState`
- Do NOT use controlled inputs for every form — most forms work fine with FormData
- Do NOT validate only on the client — always validate server-side too
- Do NOT skip error `aria` attributes — screen readers depend on them
- Do NOT use `onChange` + `useState` per field when React Hook Form or native actions suffice
