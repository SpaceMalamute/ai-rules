---
description: "Angular routing and lazy loading"
paths:
  - "**/*.routes.ts"
  - "**/app.routes.ts"
  - "**/app.config.ts"
---

# Angular Routing (Angular 21)

## Route Configuration

### Basic Routes

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./dashboard/dashboard.component') },
  { path: 'users', loadChildren: () => import('./users/users.routes') },
  { path: '**', loadComponent: () => import('./not-found/not-found.component') },
];
```

### Feature Routes with Lazy Loading

```typescript
// users/users.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '@app/core/guards/auth.guard';
import { userResolver } from './resolvers/user.resolver';

export default [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list.component'),
    canActivate: [authGuard],
  },
  {
    path: ':id',
    loadComponent: () => import('./user-detail/user-detail.component'),
    resolve: { user: userResolver },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./user-edit/user-edit.component'),
    canActivate: [authGuard],
    canDeactivate: [unsavedChangesGuard],
  },
] satisfies Routes;
```

## Guards (Functional)

### Auth Guard

```typescript
// guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: router.url },
  });
};
```

### Role Guard

```typescript
// guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const userRole = authService.currentUser()?.role;

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    return router.createUrlTree(['/forbidden']);
  };
};

// Usage in routes
{
  path: 'admin',
  loadComponent: () => import('./admin/admin.component'),
  canActivate: [authGuard, roleGuard(['admin', 'superadmin'])],
}
```

### Unsaved Changes Guard

```typescript
// guards/unsaved-changes.guard.ts
import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (component.hasUnsavedChanges()) {
    return confirm('You have unsaved changes. Do you really want to leave?');
  }
  return true;
};
```

## Resolvers

```typescript
// resolvers/user.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { catchError, EMPTY } from 'rxjs';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  const router = inject(Router);
  const userId = route.paramMap.get('id')!;

  return userService.getById(userId).pipe(
    catchError(() => {
      router.navigate(['/users']);
      return EMPTY;
    })
  );
};

// Usage in component
@Component({ ... })
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly user = toSignal(
    this.route.data.pipe(map(data => data['user'] as User))
  );
}
```

## Route Parameters

```typescript
@Component({ ... })
export class UserDetailComponent {
  private readonly route = inject(ActivatedRoute);

  // Signal-based params
  protected readonly userId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id')))
  );

  // Query params
  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('tab') ?? 'profile'))
  );
}
```

## Programmatic Navigation

```typescript
@Component({ ... })
export class UserListComponent {
  private readonly router = inject(Router);

  public navigateToUser(userId: string): void {
    this.router.navigate(['/users', userId]);
  }

  public navigateWithQuery(): void {
    this.router.navigate(['/users'], {
      queryParams: { status: 'active', page: 1 },
      queryParamsHandling: 'merge', // or 'preserve'
    });
  }

  public navigateRelative(): void {
    // From /users to /users/123
    this.router.navigate(['123'], { relativeTo: this.route });
  }
}
```

## Route Layout with Named Outlets

```typescript
// routes
{
  path: 'dashboard',
  component: DashboardLayoutComponent,
  children: [
    { path: '', loadComponent: () => import('./main/main.component') },
    { path: '', outlet: 'sidebar', loadComponent: () => import('./sidebar/sidebar.component') },
  ],
}

// template
<router-outlet />
<router-outlet name="sidebar" />
```

## Title & Meta

```typescript
// routes
{
  path: 'users',
  loadComponent: () => import('./users/users.component'),
  title: 'User Management',
  data: {
    meta: {
      description: 'Manage user accounts',
    },
  },
}

// Title strategy (app.config.ts)
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: TitleStrategy,
      useClass: CustomTitleStrategy,
    },
  ],
};
```

## Preloading Strategies

```typescript
// app.config.ts
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withPreloading(PreloadAllModules), // or custom strategy
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),
  ],
};
```

## Anti-patterns

```typescript
// BAD: Class-based guards (deprecated)
@Injectable()
export class AuthGuard implements CanActivate { ... }

// GOOD: Functional guards
export const authGuard: CanActivateFn = () => { ... };

// BAD: Subscribing in component for route params
ngOnInit() {
  this.route.params.subscribe(params => this.id = params['id']);
}

// GOOD: Signal-based
protected readonly id = toSignal(
  this.route.paramMap.pipe(map(p => p.get('id')))
);

// BAD: Hardcoded paths
this.router.navigateByUrl('/users/123/edit');

// GOOD: Relative navigation or route constants
this.router.navigate(['edit'], { relativeTo: this.route });
```
