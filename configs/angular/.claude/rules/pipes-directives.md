---
paths:
  - "**/*.pipe.ts"
  - "**/*.directive.ts"
  - "**/pipes/**"
  - "**/directives/**"
---

# Angular Pipes & Directives

## Custom Pipes

### Pure Pipe (default, memoized)

```typescript
// pipes/time-ago.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {
  public transform(value: Date | string | number): string {
    const date = new Date(value);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
  }
}

// Usage: {{ createdAt | timeAgo }}
```

### Pipe with Parameters

```typescript
// pipes/truncate.pipe.ts
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {
  public transform(
    value: string,
    limit: number = 100,
    trail: string = '...'
  ): string {
    if (!value || value.length <= limit) {
      return value;
    }
    return value.substring(0, limit).trim() + trail;
  }
}

// Usage: {{ description | truncate:50:'…' }}
```

### Filter Pipe

```typescript
// pipes/filter.pipe.ts
@Pipe({
  name: 'filter',
  standalone: true,
})
export class FilterPipe implements PipeTransform {
  public transform<T>(
    items: T[],
    field: keyof T,
    value: unknown
  ): T[] {
    if (!items || !field || value === undefined) {
      return items;
    }
    return items.filter(item => item[field] === value);
  }
}

// Usage: @for (user of users() | filter:'status':'active'; track user.id)
```

### Safe HTML Pipe

```typescript
// pipes/safe-html.pipe.ts
import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  public transform(value: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}

// Usage: <div [innerHTML]="content | safeHtml"></div>
// ⚠️ Only use with trusted content!
```

## Custom Directives

### Attribute Directive

```typescript
// directives/highlight.directive.ts
import { Directive, ElementRef, HostListener, input, inject } from '@angular/core';

@Directive({
  selector: '[appHighlight]',
  standalone: true,
})
export class HighlightDirective {
  private readonly el = inject(ElementRef);

  public readonly appHighlight = input<string>('#ffff00');
  public readonly defaultColor = input<string>('transparent');

  @HostListener('mouseenter')
  public onMouseEnter(): void {
    this.highlight(this.appHighlight() || '#ffff00');
  }

  @HostListener('mouseleave')
  public onMouseLeave(): void {
    this.highlight(this.defaultColor());
  }

  private highlight(color: string): void {
    this.el.nativeElement.style.backgroundColor = color;
  }
}

// Usage: <p appHighlight="#e0e0e0">Hover me</p>
```

### Click Outside Directive

```typescript
// directives/click-outside.directive.ts
import { Directive, ElementRef, output, inject } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective {
  private readonly el = inject(ElementRef);

  public readonly appClickOutside = output<void>();

  constructor() {
    fromEvent<MouseEvent>(document, 'click')
      .pipe(
        filter(event => !this.el.nativeElement.contains(event.target)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.appClickOutside.emit());
  }
}

// Usage: <div appClickOutside (appClickOutside)="closeDropdown()">
```

### Auto Focus Directive

```typescript
// directives/auto-focus.directive.ts
import { Directive, ElementRef, AfterViewInit, input, inject } from '@angular/core';

@Directive({
  selector: '[appAutoFocus]',
  standalone: true,
})
export class AutoFocusDirective implements AfterViewInit {
  private readonly el = inject(ElementRef);

  public readonly appAutoFocus = input<boolean>(true);

  public ngAfterViewInit(): void {
    if (this.appAutoFocus()) {
      setTimeout(() => this.el.nativeElement.focus(), 0);
    }
  }
}

// Usage: <input appAutoFocus />
```

### Structural Directive

```typescript
// directives/permission.directive.ts
import { Directive, TemplateRef, ViewContainerRef, input, effect, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  public readonly appHasPermission = input.required<string | string[]>();

  private hasView = false;

  constructor() {
    effect(() => {
      const permissions = this.appHasPermission();
      const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = this.authService.hasAnyPermission(permissionArray);

      if (hasPermission && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      } else if (!hasPermission && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }
}

// Usage: <button *appHasPermission="'users.create'">Create User</button>
```

### Debounce Input Directive

```typescript
// directives/debounce-input.directive.ts
import { Directive, ElementRef, output, input, inject, OnInit, DestroyRef } from '@angular/core';
import { fromEvent, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Directive({
  selector: 'input[appDebounce]',
  standalone: true,
})
export class DebounceInputDirective implements OnInit {
  private readonly el = inject(ElementRef<HTMLInputElement>);
  private readonly destroyRef = inject(DestroyRef);

  public readonly appDebounce = input<number>(300);
  public readonly debounceValue = output<string>();

  public ngOnInit(): void {
    fromEvent<Event>(this.el.nativeElement, 'input')
      .pipe(
        map(event => (event.target as HTMLInputElement).value),
        debounceTime(this.appDebounce()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(value => this.debounceValue.emit(value));
  }
}

// Usage: <input appDebounce [appDebounce]="500" (debounceValue)="onSearch($event)" />
```

## Composition

```typescript
// components/user-list.component.ts
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    TimeAgoPipe,
    TruncatePipe,
    FilterPipe,
    HighlightDirective,
    HasPermissionDirective,
  ],
  template: `
    @for (user of users() | filter:'status':'active'; track user.id) {
      <div appHighlight="#f0f0f0">
        <h3>{{ user.name }}</h3>
        <p>{{ user.bio | truncate:100 }}</p>
        <span>{{ user.createdAt | timeAgo }}</span>

        <button *appHasPermission="'users.delete'">Delete</button>
      </div>
    }
  `,
})
export class UserListComponent {
  protected readonly users = input.required<User[]>();
}
```

## Anti-patterns

```typescript
// BAD: Impure pipe for filtering (causes performance issues)
@Pipe({ name: 'filter', pure: false })

// GOOD: Use pure pipe + signal for reactivity
@Pipe({ name: 'filter', standalone: true })
// And update source data via signals

// BAD: Direct DOM manipulation
this.el.nativeElement.innerHTML = '<b>text</b>';

// GOOD: Use Renderer2 or Angular bindings
@HostBinding('innerHTML') content = '<b>text</b>';

// BAD: Not using standalone
@Pipe({ name: 'myPipe' })  // Missing standalone: true

// GOOD: Always standalone
@Pipe({ name: 'myPipe', standalone: true })
```
