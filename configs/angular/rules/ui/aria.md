---
description: "Angular accessibility and ARIA patterns"
paths:
  - "**/ui/**/*.component.ts"
  - "**/ui/**/*.component.html"
  - "**/shared/ui/**/*.ts"
  - "**/*-dialog.component.ts"
  - "**/*-modal.component.ts"
---

# Accessibility (ARIA)

## CDK Primitives

- DO prefer headless CDK components for standard patterns:
  - `CdkListbox` (`@angular/cdk/listbox`) — stable
  - `CdkDialog` (`@angular/cdk/dialog`) — stable
  - `CdkTabs` (`@angular/cdk-experimental`) — prototype only, not production-ready
- They provide keyboard navigation, focus management, and ARIA attributes out of the box

## Focus Management

- DO trap focus in modals/dialogs (`FocusTrapFactory` from `@angular/cdk/a11y`)
- DO restore focus to the previously focused element on modal close
- DO use `LiveAnnouncer` for dynamic status messages (toast, save confirmation)
  - `'polite'` for non-urgent, `'assertive'` for errors/critical

## Keyboard Navigation

- DO support keyboard interaction on all interactive custom components
- DO use `ListKeyManager` from CDK for list/menu keyboard nav with wrap, home/end, typeahead

## ARIA Attributes in Templates

- DO add `aria-label` on icon-only buttons
- DO bind `[attr.aria-expanded]`, `[attr.aria-controls]` on expandable triggers
- DO bind `[attr.aria-invalid]`, `[attr.aria-describedby]` on form inputs with errors
- DO use `role="alert"` on dynamically shown error messages
- DO use `aria-hidden="true"` on decorative icons
- DO use `.sr-only` class for screen-reader-only text

## Semantic HTML

- DO use `<button>` for actions, `<a>` for navigation — never `<div (click)>`
- DO use `<label for="id">` or `aria-label` on every form input
- DO use descriptive link text — never "click here"

## Testing

- DO enable `@angular-eslint/template/accessibility-*` rules
- DO run `@axe-core/playwright` in E2E tests for automated audits

## Anti-patterns

- DO NOT use `<div>` or `<span>` as interactive elements — use semantic HTML
- DO NOT rely on placeholder as the only label for inputs
- DO NOT use `autoplay` on media — let users control playback
- DO NOT use positive `tabindex` — it breaks natural tab order
