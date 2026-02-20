---
description: "AdonisJS authentication and session management"
paths:
  - "**/app/controllers/auth/**/*.ts"
  - "**/app/middleware/**/*.ts"
  - "**/config/auth.ts"
---

# AdonisJS Authentication

## Access Tokens (API)

### Configuration

```typescript
// config/auth.ts
import { defineConfig } from '@adonisjs/auth'
import { tokensGuard, tokensUserProvider } from '@adonisjs/auth/access_tokens'

export default defineConfig({
  default: 'api',
  guards: {
    api: tokensGuard({
      provider: tokensUserProvider({
        tokens: 'accessTokens',
        model: () => import('#models/user'),
      }),
    }),
  },
})
```

### User Model Setup

```typescript
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

export default class User extends BaseModel {
  // ... other columns

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
```

### Auth Controller

```typescript
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'
import { loginValidator, registerValidator } from '#validators/auth'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)
    const user = await User.create(payload)
    const token = await User.accessTokens.create(user)

    return response.created({
      user,
      token: token.value!.release(),
    })
  }

  async login({ request, response }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)

    const user = await User.findBy('email', email)
    if (!user) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    const isValid = await hash.verify(user.password, password)
    if (!isValid) {
      return response.unauthorized({ message: 'Invalid credentials' })
    }

    const token = await User.accessTokens.create(user)

    return response.ok({
      user,
      token: token.value!.release(),
    })
  }

  async logout({ auth, response }: HttpContext) {
    const user = auth.user!
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return response.noContent()
  }

  async me({ auth, response }: HttpContext) {
    return response.ok(auth.user)
  }
}
```

### Routes

```typescript
// start/routes.ts
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')

router.group(() => {
  router.post('register', [AuthController, 'register'])
  router.post('login', [AuthController, 'login'])

  router.group(() => {
    router.delete('logout', [AuthController, 'logout'])
    router.get('me', [AuthController, 'me'])
  }).use(middleware.auth())
}).prefix('auth')
```

## Middleware

### Auth Middleware

```typescript
// Protect routes
router.get('profile', [ProfileController, 'show']).use(middleware.auth())

// In controller, access user
async show({ auth }: HttpContext) {
  const user = auth.user! // Typed as User
}
```

### Custom Middleware

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

### Register Middleware

```typescript
// start/kernel.ts
import router from '@adonisjs/core/services/router'

router.named({
  auth: () => import('#middleware/auth_middleware'),
  admin: () => import('#middleware/admin_middleware'),
})
```

## Password Hashing

```typescript
import hash from '@adonisjs/core/services/hash'

// Hash password
const hashed = await hash.make('password')

// Verify password
const isValid = await hash.verify(hashed, 'password')
```

## Auth Validators

```typescript
// app/validators/auth.ts
import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).confirmed(),
    name: vine.string().minLength(2),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string(),
  })
)
```
