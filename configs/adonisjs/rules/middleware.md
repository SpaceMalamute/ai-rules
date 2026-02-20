---
paths:
  - "**/app/middleware/**/*.ts"
  - "**/start/kernel.ts"
---

# AdonisJS Middleware

## Creating Middleware

```typescript
// app/middleware/admin_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    if (auth.user?.role !== 'admin') {
      return response.forbidden({ message: 'Admin access required' })
    }

    await next()
  }
}
```

## Register Middleware

```typescript
// start/kernel.ts
import router from '@adonisjs/core/services/router'

// Named middleware (use on specific routes)
router.named({
  auth: () => import('#middleware/auth_middleware'),
  admin: () => import('#middleware/admin_middleware'),
  verified: () => import('#middleware/verified_middleware'),
})
```

## Using Middleware

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Single middleware
router.get('dashboard', [DashboardController, 'index'])
  .use(middleware.auth())

// Multiple middleware
router.get('admin', [AdminController, 'index'])
  .use([middleware.auth(), middleware.admin()])

// Group middleware
router.group(() => {
  router.get('profile', [ProfileController, 'show'])
  router.put('profile', [ProfileController, 'update'])
}).use(middleware.auth())
```

## Middleware with Parameters

```typescript
// app/middleware/role_middleware.ts
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class RoleMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn, options: { roles: string[] }) {
    if (!options.roles.includes(auth.user!.role)) {
      return response.forbidden({ message: 'Insufficient permissions' })
    }

    await next()
  }
}

// Usage
router.get('reports', [ReportsController, 'index'])
  .use(middleware.role({ roles: ['admin', 'manager'] }))
```

## Request Logging Middleware

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import logger from '@adonisjs/core/services/logger'

export default class RequestLoggerMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    logger.info(`${request.method()} ${request.url()} - ${duration}ms`)
  }
}
```

## Global Middleware

```typescript
// start/kernel.ts
import server from '@adonisjs/core/services/server'

// Server middleware (runs for every request)
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('#middleware/force_json_response_middleware'),
])

// Router middleware (runs for routes only)
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('#middleware/request_logger_middleware'),
])
```

## Terminate Hook

```typescript
export default class AnalyticsMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    await next()
  }

  // Runs after response is sent
  async terminate(ctx: HttpContext) {
    await Analytics.track({
      path: ctx.request.url(),
      userId: ctx.auth.user?.id,
      duration: ctx.response.getResponseTime(),
    })
  }
}
```
