---
paths:
  - "**/interceptors/**"
  - "**/services/**/*.service.ts"
  - "**/*.interceptor.ts"
---

# Angular HTTP & Interceptors

## HTTP Client Setup

```typescript
// app.config.ts
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loggingInterceptor } from './core/interceptors/logging.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withInterceptors([
        loggingInterceptor,
        authInterceptor,
        errorInterceptor,
      ])
    ),
  ],
};
```

## Interceptors (Functional)

### Auth Interceptor

```typescript
// interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  if (token && !req.url.includes('/auth/')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
```

### Error Interceptor

```typescript
// interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notification = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          router.navigate(['/login']);
          break;
        case 403:
          notification.error('You do not have permission for this action');
          break;
        case 404:
          notification.error('Resource not found');
          break;
        case 422:
          // Validation errors - let component handle
          break;
        case 500:
          notification.error('Server error. Please try again later.');
          break;
        default:
          notification.error('An unexpected error occurred');
      }

      return throwError(() => error);
    })
  );
};
```

### Retry Interceptor

```typescript
// interceptors/retry.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Only retry GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, retryCount - 1) * 1000;
        console.log(`Retry ${retryCount} after ${delayMs}ms`);
        return timer(delayMs);
      },
      resetOnSuccess: true,
    })
  );
};
```

### Caching Interceptor

```typescript
// interceptors/cache.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

const cache = new Map<string, HttpResponse<unknown>>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return next(req);
  }

  // Check for no-cache header
  if (req.headers.has('x-no-cache')) {
    cache.delete(req.urlWithParams);
    return next(req);
  }

  const cached = cache.get(req.urlWithParams);
  if (cached) {
    return of(cached.clone());
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(req.urlWithParams, event.clone());
      }
    })
  );
};
```

### Loading Interceptor

```typescript
// interceptors/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);

  // Skip for specific requests
  if (req.headers.has('x-skip-loading')) {
    return next(req);
  }

  loadingService.show();

  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
```

### Logging Interceptor

```typescript
// interceptors/logging.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = Date.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type !== 0) { // Skip progress events
          const duration = Date.now() - startTime;
          console.log(`${req.method} ${req.url} - ${duration}ms`);
        }
      },
      error: (error) => {
        const duration = Date.now() - startTime;
        console.error(`${req.method} ${req.url} - FAILED - ${duration}ms`, error);
      },
    })
  );
};
```

## API Service Pattern

```typescript
// services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  public get<T>(path: string, params?: HttpParams): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, { params });
  }

  public post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  public put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  public patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body);
  }

  public delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}

// services/user.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  public getAll(): Observable<User[]> {
    return this.api.get<User[]>('/users');
  }

  public getById(id: string): Observable<User> {
    return this.api.get<User>(`/users/${id}`);
  }

  public create(data: CreateUserDto): Observable<User> {
    return this.api.post<User>('/users', data);
  }

  public update(id: string, data: UpdateUserDto): Observable<User> {
    return this.api.patch<User>(`/users/${id}`, data);
  }

  public delete(id: string): Observable<void> {
    return this.api.delete<void>(`/users/${id}`);
  }
}
```

## Error Handling in Components

```typescript
@Component({ ... })
export class UserFormComponent {
  private readonly userService = inject(UserService);

  protected readonly error = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly isSubmitting = signal(false);

  public async onSubmit(data: CreateUserDto): Promise<void> {
    this.isSubmitting.set(true);
    this.error.set(null);
    this.fieldErrors.set({});

    this.userService.create(data).subscribe({
      next: (user) => {
        this.router.navigate(['/users', user.id]);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 422 && err.error?.errors) {
          // Handle validation errors
          const errors: Record<string, string> = {};
          for (const e of err.error.errors) {
            errors[e.field] = e.message;
          }
          this.fieldErrors.set(errors);
        } else {
          this.error.set('Failed to create user');
        }
        this.isSubmitting.set(false);
      },
    });
  }
}
```

## Anti-patterns

```typescript
// BAD: Class-based interceptors (deprecated)
@Injectable()
export class AuthInterceptor implements HttpInterceptor { ... }

// GOOD: Functional interceptors
export const authInterceptor: HttpInterceptorFn = (req, next) => { ... };

// BAD: Hardcoded URLs
this.http.get('https://api.example.com/users');

// GOOD: Use injection token
this.http.get(`${this.baseUrl}/users`);

// BAD: Not handling errors
this.http.get('/users').subscribe(users => this.users = users);

// GOOD: Handle errors
this.http.get('/users').pipe(
  catchError(err => {
    this.error.set('Failed to load users');
    return of([]);
  })
).subscribe(users => this.users.set(users));
```
