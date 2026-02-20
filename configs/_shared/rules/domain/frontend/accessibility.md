---
description: "Web accessibility and ARIA patterns"
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.html"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/components/**/*.ts"
---

# Accessibility Rules (WCAG 2.1)

## Semantic HTML

### Use Correct Elements
```html
<!-- Bad -->
<div onclick="submit()">Submit</div>
<div class="heading">Title</div>

<!-- Good -->
<button type="submit">Submit</button>
<h1>Title</h1>
```

### Heading Hierarchy
```html
<!-- Bad - skipping levels -->
<h1>Page Title</h1>
<h3>Section</h3>

<!-- Good - sequential -->
<h1>Page Title</h1>
<h2>Section</h2>
<h3>Subsection</h3>
```

### Landmarks
```html
<header role="banner">...</header>
<nav role="navigation">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>
```

## Images

### Alt Text
```html
<!-- Informative image -->
<img src="chart.png" alt="Sales increased 25% in Q4 2024" />

<!-- Decorative image -->
<img src="decoration.png" alt="" role="presentation" />

<!-- Complex image -->
<figure>
  <img src="diagram.png" alt="System architecture diagram" />
  <figcaption>Detailed description of the system architecture...</figcaption>
</figure>
```

## Forms

### Labels
```html
<!-- Bad -->
<input type="email" placeholder="Email" />

<!-- Good -->
<label for="email">Email</label>
<input type="email" id="email" name="email" />

<!-- Or with aria-label -->
<input type="search" aria-label="Search products" />
```

### Error Messages
```html
<label for="email">Email</label>
<input
  type="email"
  id="email"
  aria-describedby="email-error"
  aria-invalid="true"
/>
<span id="email-error" role="alert">
  Please enter a valid email address
</span>
```

### Required Fields
```html
<label for="name">
  Name <span aria-hidden="true">*</span>
</label>
<input type="text" id="name" required aria-required="true" />
```

## Keyboard Navigation

### Focus Management
```typescript
// Trap focus in modals
function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  });
}
```

### Visible Focus
```css
/* Never remove focus outline without replacement */
/* Bad */
*:focus { outline: none; }

/* Good */
*:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Or custom focus styles */
*:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.5);
}
```

### Skip Links
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<style>
.skip-link {
  position: absolute;
  left: -9999px;
}
.skip-link:focus {
  left: 0;
  top: 0;
  z-index: 9999;
}
</style>
```

## ARIA

### When to Use
```html
<!-- Use ARIA only when HTML semantics aren't enough -->

<!-- Custom components need ARIA -->
<div
  role="button"
  tabindex="0"
  aria-pressed="false"
  onkeydown="handleKeyDown(event)"
>
  Toggle
</div>

<!-- Prefer native elements when possible -->
<button type="button">Toggle</button>
```

### Live Regions
```html
<!-- Announce dynamic content changes -->
<div aria-live="polite" aria-atomic="true">
  {{ statusMessage }}
</div>

<!-- Urgent announcements -->
<div role="alert">
  Error: Form submission failed
</div>
```

### State Management
```html
<!-- Expanded/collapsed -->
<button aria-expanded="false" aria-controls="menu">
  Menu
</button>
<ul id="menu" hidden>...</ul>

<!-- Selected -->
<li role="option" aria-selected="true">Option 1</li>

<!-- Loading -->
<button aria-busy="true" aria-disabled="true">
  <span class="spinner" aria-hidden="true"></span>
  Loading...
</button>
```

## Color & Contrast

### Minimum Contrast
- Normal text: 4.5:1 ratio
- Large text (18px+ or 14px+ bold): 3:1 ratio
- UI components: 3:1 ratio

### Don't Rely on Color Alone
```html
<!-- Bad -->
<span class="error" style="color: red;">Invalid</span>

<!-- Good -->
<span class="error" style="color: red;">
  ⚠️ Invalid - please check this field
</span>
```

## Motion

### Respect User Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing

### Automated Tools
- axe-core (browser extension)
- eslint-plugin-jsx-a11y (React)
- @angular-eslint (Angular)

### Manual Testing
1. Navigate with keyboard only (Tab, Enter, Escape, Arrow keys)
2. Test with screen reader (VoiceOver, NVDA)
3. Zoom to 200% - check content reflows
4. Test with high contrast mode

## Quick Checklist

- [ ] All images have appropriate alt text
- [ ] Form inputs have associated labels
- [ ] Heading hierarchy is logical (h1 → h2 → h3)
- [ ] Interactive elements are keyboard accessible
- [ ] Focus is visible and managed correctly
- [ ] Color contrast meets WCAG requirements
- [ ] ARIA is used correctly (roles, states, properties)
- [ ] Dynamic content changes are announced
- [ ] Motion respects prefers-reduced-motion
