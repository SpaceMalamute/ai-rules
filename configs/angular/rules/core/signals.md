---
description: "Angular Signals and reactivity patterns"
paths:
  - "**/*.component.ts"
  - "**/*.component.html"
  - "**/*.store.ts"
  - "**/+state/**/*.ts"
  - "**/data-access/**/*.ts"
---

# Signals & Reactivity

## Decision Matrix: Derived State

| Need | Use | Why |
|---|---|---|
| Read-only derived value | `computed()` | Pure derivation, auto-tracked, memoized |
| Writable value that resets on source change | `linkedSignal()` | Pagination reset, form defaults from server |
| Side effect (logging, analytics, DOM) | `effect()` | Last resort — prefer computed/linkedSignal first |

## Signal Basics

- DO use `signal()` for local writable state
- DO use `computed()` for any derived value — it is lazy and memoized
- DO NOT set signals inside `computed()` — computed must be pure (no side effects)
- DO NOT use `effect()` where `computed()` or `linkedSignal()` would suffice

## linkedSignal()

- Creates a writable signal that auto-resets when its tracked source changes
- User can still write to it manually between resets

```typescript
protected readonly currentPage = linkedSignal(() => {
  this.searchQuery(); // track dependency
  return 1;           // reset to page 1 on query change
});
```

## effect() — Use Sparingly

- Runs when any read signal inside changes
- DO provide `onCleanup` callback for subscriptions or timers
- Avoid chaining effects — prefer declarative computed/linkedSignal graphs

## Signal Inputs / Outputs / Model

- `input()`, `input.required()` — replaces `@Input()`
- `output()` — replaces `@Output()` + `EventEmitter`
- `model()`, `model.required()` — two-way binding (`[(prop)]`)
- `input(defaultValue, { transform })` for input transforms

## Signal Queries

- `viewChild()` / `viewChild.required()` — replaces `@ViewChild()`
- `viewChildren()` — replaces `@ViewChildren()`
- `contentChild()` / `contentChildren()` — replaces `@ContentChild()` / `@ContentChildren()`

## RxJS Interop

- `toSignal(observable$, { initialValue })` — Observable to signal
- `toObservable(signal)` — signal to Observable (use when you need RxJS operators like `debounceTime`)
- `takeUntilDestroyed(destroyRef)` — auto-unsubscribe on destroy

## Anti-patterns

- DO NOT use `@Input()` / `@Output()` / `@ViewChild()` decorators — use signal APIs
- DO NOT subscribe in `ngOnInit` — use `toSignal()` or `resource()`
- DO NOT use `computed()` for state you need to write — use `linkedSignal()`
- DO NOT chain multiple `effect()` calls — prefer declarative computed/linkedSignal graphs
