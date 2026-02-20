---
description: "AdonisJS controller patterns"
paths:
  - "**/app/controllers/**/*.ts"
---

# AdonisJS Controllers

## Structure

Controllers handle HTTP concerns only. Delegate business logic to services.

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import UserService from '#services/user_service'
import { createUserValidator, updateUserValidator } from '#validators/user'

@inject()
export default class UsersController {
  constructor(private userService: UserService) {}

  async index({ response }: HttpContext) {
    const users = await this.userService.getAll()
    return response.ok(users)
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    const user = await this.userService.create(payload)
    return response.created(user)
  }

  async show({ params, response }: HttpContext) {
    const user = await this.userService.findOrFail(params.id)
    return response.ok(user)
  }

  async update({ params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateUserValidator)
    const user = await this.userService.update(params.id, payload)
    return response.ok(user)
  }

  async destroy({ params, response }: HttpContext) {
    await this.userService.delete(params.id)
    return response.noContent()
  }
}
```

## Best Practices

### Use Dependency Injection

```typescript
// Good
@inject()
export default class OrdersController {
  constructor(
    private orderService: OrderService,
    private notificationService: NotificationService
  ) {}
}

// Avoid: instantiating services manually
export default class OrdersController {
  private orderService = new OrderService() // Hard to test
}
```

### Validate Input

Always validate using VineJS validators:

```typescript
async store({ request }: HttpContext) {
  // Validates and returns typed payload
  const payload = await request.validateUsing(createOrderValidator)
  // payload is now typed and validated
}
```

### Use Response Helpers

```typescript
response.ok(data)           // 200
response.created(data)      // 201
response.noContent()        // 204
response.badRequest(error)  // 400
response.unauthorized()     // 401
response.forbidden()        // 403
response.notFound()         // 404
```

### Resource Routes

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'

const UsersController = () => import('#controllers/users_controller')

router.resource('users', UsersController).apiOnly()

// Generates:
// GET    /users          → index
// POST   /users          → store
// GET    /users/:id      → show
// PUT    /users/:id      → update
// DELETE /users/:id      → destroy
```
