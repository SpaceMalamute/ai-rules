---
description: "Angular accessibility and ARIA patterns"
paths:
  - "**/ui/**/*.component.ts"
  - "**/ui/**/*.component.html"
  - "**/shared/ui/**/*.ts"
  - "**/*-dialog.component.ts"
  - "**/*-modal.component.ts"
---

# Angular ARIA (Accessibility)

The `@angular/cdk-experimental/ui` package provides headless, accessible components.

## Installation

```bash
npm install @angular/cdk-experimental
```

## Listbox

```typescript
import { CdkListbox, CdkOption } from '@angular/cdk-experimental/ui';

@Component({
  selector: 'app-color-picker',
  imports: [CdkListbox, CdkOption],
  template: `
    <ul cdkListbox [(value)]="selectedColor" aria-label="Choose a color">
      @for (color of colors; track color.value) {
        <li [cdkOption]="color.value">
          {{ color.label }}
        </li>
      }
    </ul>
  `,
})
export class ColorPickerComponent {
  protected readonly colors = [
    { value: 'red', label: 'Red' },
    { value: 'green', label: 'Green' },
    { value: 'blue', label: 'Blue' },
  ];

  protected readonly selectedColor = model<string>('red');
}
```

## Tabs

```typescript
import { CdkTabs, CdkTabList, CdkTab, CdkTabPanel } from '@angular/cdk-experimental/ui';

@Component({
  selector: 'app-settings-tabs',
  imports: [CdkTabs, CdkTabList, CdkTab, CdkTabPanel],
  template: `
    <div cdkTabs>
      <div cdkTabList aria-label="Settings sections">
        <button cdkTab="profile">Profile</button>
        <button cdkTab="security">Security</button>
        <button cdkTab="notifications">Notifications</button>
      </div>

      <div cdkTabPanel="profile">
        <app-profile-settings />
      </div>
      <div cdkTabPanel="security">
        <app-security-settings />
      </div>
      <div cdkTabPanel="notifications">
        <app-notification-settings />
      </div>
    </div>
  `,
})
export class SettingsTabsComponent { }
```

## Disclosure (Accordion)

```typescript
import { CdkDisclosure, CdkDisclosureTrigger, CdkDisclosureContent } from '@angular/cdk-experimental/ui';

@Component({
  selector: 'app-faq',
  imports: [CdkDisclosure, CdkDisclosureTrigger, CdkDisclosureContent],
  template: `
    @for (item of faqItems; track item.id) {
      <div cdkDisclosure>
        <button cdkDisclosureTrigger>
          {{ item.question }}
        </button>
        <div cdkDisclosureContent>
          {{ item.answer }}
        </div>
      </div>
    }
  `,
})
export class FaqComponent {
  protected readonly faqItems = [
    { id: 1, question: 'How do I reset my password?', answer: '...' },
    { id: 2, question: 'Where can I find my invoices?', answer: '...' },
  ];
}
```

## Dialog

```typescript
import { CdkDialog, CdkDialogTrigger, CdkDialogContent } from '@angular/cdk-experimental/ui';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CdkDialog, CdkDialogTrigger, CdkDialogContent],
  template: `
    <div cdkDialog #dialog>
      <button cdkDialogTrigger>Delete Item</button>

      <div cdkDialogContent role="alertdialog" aria-labelledby="dialog-title">
        <h2 id="dialog-title">Confirm Deletion</h2>
        <p>Are you sure you want to delete this item?</p>
        <div class="actions">
          <button (click)="dialog.close()">Cancel</button>
          <button (click)="onConfirm(); dialog.close()">Delete</button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmDialogComponent {
  public readonly confirmed = output<void>();

  protected onConfirm(): void {
    this.confirmed.emit();
  }
}
```

## Custom Accessible Components

### Focus Management

```typescript
import { FocusMonitor, FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';

@Component({
  selector: 'app-modal',
  template: `
    <div class="modal-backdrop" (click)="close()"></div>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="titleId"
      #modalElement
    >
      <h2 [id]="titleId">{{ title() }}</h2>
      <ng-content />
    </div>
  `,
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly elementRef = inject(ElementRef);

  public readonly title = input.required<string>();
  public readonly closed = output<void>();

  protected readonly titleId = `modal-title-${crypto.randomUUID()}`;

  private focusTrap?: FocusTrap;
  private previouslyFocusedElement?: HTMLElement;

  constructor() {
    afterNextRender(() => {
      this.previouslyFocusedElement = document.activeElement as HTMLElement;
      this.focusTrap = this.focusTrapFactory.create(this.elementRef.nativeElement);
      this.focusTrap.focusInitialElement();
    });
  }

  ngOnDestroy(): void {
    this.focusTrap?.destroy();
    this.previouslyFocusedElement?.focus();
  }

  protected close(): void {
    this.closed.emit();
  }
}
```

### Live Announcements

```typescript
import { LiveAnnouncer } from '@angular/cdk/a11y';

@Component({ ... })
export class NotificationComponent {
  private readonly liveAnnouncer = inject(LiveAnnouncer);

  public async showSuccess(message: string): Promise<void> {
    // Announces to screen readers
    await this.liveAnnouncer.announce(message, 'polite');
  }

  public async showError(message: string): Promise<void> {
    // 'assertive' interrupts current speech
    await this.liveAnnouncer.announce(message, 'assertive');
  }
}
```

### Keyboard Navigation

```typescript
import { ListKeyManager } from '@angular/cdk/a11y';

@Component({
  selector: 'app-menu',
  template: `
    <ul
      role="menu"
      (keydown)="onKeydown($event)"
      #menuElement
    >
      @for (item of items(); track item.id) {
        <li
          role="menuitem"
          [tabindex]="keyManager?.activeItem === item ? 0 : -1"
          (click)="selectItem(item)"
        >
          {{ item.label }}
        </li>
      }
    </ul>
  `,
})
export class MenuComponent implements AfterViewInit {
  public readonly items = input.required<MenuItem[]>();

  @ViewChildren('menuItem') menuItems!: QueryList<ElementRef>;

  protected keyManager?: ListKeyManager<MenuItem>;

  ngAfterViewInit(): void {
    this.keyManager = new ListKeyManager(this.items())
      .withWrap()
      .withHomeAndEnd()
      .withTypeAhead();
  }

  protected onKeydown(event: KeyboardEvent): void {
    this.keyManager?.onKeydown(event);

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const activeItem = this.keyManager?.activeItem;
      if (activeItem) {
        this.selectItem(activeItem);
      }
    }
  }
}
```

## ARIA Attributes

### Common Patterns

```html
<!-- Buttons -->
<button aria-label="Close dialog" aria-describedby="close-hint">
  <app-icon name="close" />
</button>
<span id="close-hint" class="sr-only">Press Escape to close</span>

<!-- Loading states -->
<button [attr.aria-busy]="isLoading()" [attr.aria-disabled]="isLoading()">
  @if (isLoading()) {
    <app-spinner aria-hidden="true" />
    <span class="sr-only">Loading...</span>
  } @else {
    Submit
  }
</button>

<!-- Expandable -->
<button
  [attr.aria-expanded]="isExpanded()"
  [attr.aria-controls]="contentId"
>
  Show Details
</button>
<div [id]="contentId" [hidden]="!isExpanded()">
  <!-- Content -->
</div>

<!-- Form errors -->
<input
  [attr.aria-invalid]="hasError()"
  [attr.aria-describedby]="hasError() ? errorId : null"
/>
@if (hasError()) {
  <span [id]="errorId" role="alert">
    {{ errorMessage() }}
  </span>
}

<!-- Progress -->
<div
  role="progressbar"
  [attr.aria-valuenow]="progress()"
  aria-valuemin="0"
  aria-valuemax="100"
  [attr.aria-label]="'Upload progress: ' + progress() + '%'"
>
</div>
```

### Screen Reader Only Content

```scss
// styles.scss
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```html
<button>
  <app-icon name="delete" aria-hidden="true" />
  <span class="sr-only">Delete item</span>
</button>
```

## Anti-patterns

```html
<!-- BAD: No accessible name -->
<button><app-icon name="close" /></button>

<!-- GOOD: Add aria-label -->
<button aria-label="Close">
  <app-icon name="close" aria-hidden="true" />
</button>


<!-- BAD: Using div as button -->
<div (click)="submit()">Submit</div>

<!-- GOOD: Use semantic elements -->
<button type="submit" (click)="submit()">Submit</button>


<!-- BAD: Missing form labels -->
<input type="email" placeholder="Email" />

<!-- GOOD: Proper labeling -->
<label for="email">Email</label>
<input id="email" type="email" />

<!-- Or with aria-label -->
<input type="email" aria-label="Email address" placeholder="email@example.com" />


<!-- BAD: Non-descriptive link text -->
<a href="/docs">Click here</a>

<!-- GOOD: Descriptive link text -->
<a href="/docs">View documentation</a>


<!-- BAD: Auto-playing content -->
<video autoplay>...</video>

<!-- GOOD: User-controlled -->
<video controls>...</video>
```

## Testing Accessibility

```typescript
// Using @angular-eslint for static analysis
// eslint.config.js
{
  rules: {
    '@angular-eslint/template/accessibility-alt-text': 'error',
    '@angular-eslint/template/accessibility-elements-content': 'error',
    '@angular-eslint/template/accessibility-label-has-associated-control': 'error',
    '@angular-eslint/template/accessibility-valid-aria': 'error',
    '@angular-eslint/template/click-events-have-key-events': 'error',
    '@angular-eslint/template/mouse-events-have-key-events': 'error',
    '@angular-eslint/template/no-autofocus': 'error',
    '@angular-eslint/template/no-positive-tabindex': 'error',
  }
}
```

```typescript
// E2E with Playwright accessibility testing
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```
