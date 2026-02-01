---
paths:
  - "app/validators/**/*.ts"
---

# VineJS Validation

## Basic Validator

```typescript
import vine from '@vinejs/vine'

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8),
    name: vine.string().minLength(2).maxLength(100),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().normalizeEmail().optional(),
    name: vine.string().minLength(2).maxLength(100).optional(),
  })
)
```

## Common Rules

```typescript
vine.object({
  // Strings
  name: vine.string().minLength(2).maxLength(100),
  email: vine.string().email(),
  url: vine.string().url(),
  slug: vine.string().regex(/^[a-z0-9-]+$/),

  // Numbers
  age: vine.number().min(0).max(150),
  price: vine.number().positive().decimal(2),

  // Booleans
  isActive: vine.boolean(),

  // Dates
  birthDate: vine.date({ formats: ['YYYY-MM-DD'] }),

  // Arrays
  tags: vine.array(vine.string()).minLength(1).maxLength(10),

  // Enums
  status: vine.enum(['draft', 'published', 'archived']),

  // Optional & Nullable
  bio: vine.string().optional(),
  deletedAt: vine.date().nullable(),
})
```

## Custom Error Messages

```typescript
export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    password: vine.string().minLength(8),
  })
)

createUserValidator.messagesProvider = new SimpleMessagesProvider({
  'email.required': 'Email is required',
  'email.email': 'Invalid email format',
  'password.minLength': 'Password must be at least 8 characters',
})
```

## Unique Validation

```typescript
import vine from '@vinejs/vine'
import { FieldContext } from '@vinejs/vine/types'
import User from '#models/user'

const uniqueEmail = vine.createRule(async (value: unknown, _options: undefined, field: FieldContext) => {
  if (typeof value !== 'string') return

  const user = await User.findBy('email', value)
  if (user) {
    field.report('Email already exists', 'unique', field)
  }
})

export const createUserValidator = vine.compile(
  vine.object({
    email: vine.string().email().use(uniqueEmail()),
  })
)
```

## Conditional Validation

```typescript
vine.object({
  accountType: vine.enum(['personal', 'business']),
  companyName: vine
    .string()
    .minLength(2)
    .requiredWhen('accountType', '=', 'business'),
  taxId: vine
    .string()
    .optional()
    .requiredWhen('accountType', '=', 'business'),
})
```

## Usage in Controller

```typescript
import { createUserValidator } from '#validators/user'

export default class UsersController {
  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createUserValidator)
    // payload is fully typed: { email: string, password: string, name: string }
    const user = await User.create(payload)
    return response.created(user)
  }
}
```
