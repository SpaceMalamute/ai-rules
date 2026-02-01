---
paths:
  - "**/app.config.ts"
  - "**/app.config.server.ts"
  - "**/app.routes.server.ts"
  - "**/server.ts"
  - "**/main.server.ts"
---

# Angular SSR & Hydration

## Server Configuration

```typescript
// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
  ],
};
```

```typescript
// app.config.server.ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';

import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

## Server Routes Configuration

```typescript
// app.routes.server.ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,  // Static at build time
  },
  {
    path: 'products',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      // Return params for prerendering
      return [{ id: '1' }, { id: '2' }, { id: '3' }];
    },
  },
  {
    path: 'dashboard/**',
    renderMode: RenderMode.Client,  // Client-only, no SSR
  },
  {
    path: '**',
    renderMode: RenderMode.Server,  // SSR at request time
  },
];
```

## Render Modes

| Mode | When to Use | SEO | Performance |
|------|-------------|-----|-------------|
| `Prerender` | Static content, marketing pages | Best | Best (cached) |
| `Server` | Dynamic content, user-specific | Good | Good |
| `Client` | Dashboards, authenticated areas | None | Fastest initial |

## Platform Detection

```typescript
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

@Component({ ... })
export class MyComponent {
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly isBrowser = isPlatformBrowser(this.platformId);
  protected readonly isServer = isPlatformServer(this.platformId);

  constructor() {
    if (this.isBrowser) {
      // Browser-only code (localStorage, window, etc.)
    }
  }
}
```

## afterNextRender / afterRender

Use these for DOM manipulation that should only happen in browser:

```typescript
import { afterNextRender, afterRender, Component, ElementRef, viewChild } from '@angular/core';

@Component({ ... })
export class ChartComponent {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('chart');

  constructor() {
    // Runs once after first render (browser only)
    afterNextRender(() => {
      this.initChart(this.canvas().nativeElement);
    });

    // Runs after every render (browser only)
    afterRender(() => {
      this.updateChart();
    });
  }

  private initChart(canvas: HTMLCanvasElement): void {
    // Safe to use browser APIs here
    const ctx = canvas.getContext('2d');
    // Initialize chart library...
  }
}
```

## Transfer State

Share data between server and client to avoid duplicate requests:

```typescript
import { makeStateKey, TransferState } from '@angular/core';

const USERS_KEY = makeStateKey<User[]>('users');

@Component({ ... })
export class UserListComponent {
  private readonly transferState = inject(TransferState);
  private readonly userService = inject(UserService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly users = signal<User[]>([]);

  constructor() {
    afterNextRender(() => {
      this.loadUsers();
    });

    // On server, load and store
    if (isPlatformServer(this.platformId)) {
      this.loadUsersServer();
    }

    // On client, retrieve from transfer state first
    if (isPlatformBrowser(this.platformId)) {
      const cached = this.transferState.get(USERS_KEY, null);
      if (cached) {
        this.users.set(cached);
        this.transferState.remove(USERS_KEY);
      }
    }
  }

  private async loadUsersServer(): Promise<void> {
    const users = await firstValueFrom(this.userService.getAll());
    this.users.set(users);
    this.transferState.set(USERS_KEY, users);
  }
}
```

## Hydration Best Practices

### Avoid Hydration Mismatch

```typescript
// BAD: Different content on server vs client
@Component({
  template: `<p>Current time: {{ now }}</p>`,
})
export class TimeComponent {
  now = new Date().toISOString();  // Different on server vs client!
}

// GOOD: Use consistent initial state
@Component({
  template: `<p>Current time: {{ now() }}</p>`,
})
export class TimeComponent {
  protected readonly now = signal<string>('');

  constructor() {
    afterNextRender(() => {
      this.now.set(new Date().toISOString());
    });
  }
}
```

### Skip Hydration for Dynamic Content

```html
<!-- Skip hydration for parts that will differ -->
<div ngSkipHydration>
  <app-live-clock />
  <app-user-presence />
</div>
```

```typescript
// Or in component
@Component({
  host: { ngSkipHydration: 'true' },
})
export class LiveClockComponent { }
```

## HTTP Caching with Transfer State

```typescript
// interceptors/transfer-state.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { makeStateKey, TransferState } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { of, tap } from 'rxjs';

export const transferStateInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') {
    return next(req);
  }

  const transferState = inject(TransferState);
  const platformId = inject(PLATFORM_ID);
  const key = makeStateKey<unknown>(req.urlWithParams);

  if (isPlatformServer(platformId)) {
    return next(req).pipe(
      tap((response) => {
        transferState.set(key, response);
      })
    );
  }

  const cached = transferState.get(key, null);
  if (cached) {
    transferState.remove(key);
    return of(cached);
  }

  return next(req);
};
```

## Anti-patterns

```typescript
// BAD: Direct DOM access without platform check
@Component({ ... })
export class MyComponent {
  constructor() {
    window.addEventListener('scroll', this.onScroll);  // Crashes on server!
  }
}

// GOOD: Use afterNextRender
@Component({ ... })
export class MyComponent {
  constructor() {
    afterNextRender(() => {
      window.addEventListener('scroll', this.onScroll);
    });
  }
}


// BAD: localStorage without platform check
const token = localStorage.getItem('token');  // Crashes on server!

// GOOD: Check platform or use afterNextRender
constructor() {
  afterNextRender(() => {
    const token = localStorage.getItem('token');
    this.token.set(token);
  });
}


// BAD: Using setTimeout for "after render"
setTimeout(() => {
  this.initChart();
}, 0);

// GOOD: Use afterNextRender
afterNextRender(() => {
  this.initChart();
});
```
