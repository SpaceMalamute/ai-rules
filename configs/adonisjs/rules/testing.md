---
paths:
  - "tests/**/*.ts"
---

# AdonisJS Testing (Japa)

## Test Structure

```
tests/
├── bootstrap.ts      # Test setup
├── unit/
│   └── services/
├── functional/
│   └── controllers/
└── integration/
```

## Unit Test

```typescript
import { test } from '@japa/runner'
import UserService from '#services/user_service'

test.group('UserService', () => {
  test('creates a user with valid data', async ({ assert }) => {
    const service = new UserService()
    const user = await service.create({
      email: 'test@example.com',
      password: 'password123',
    })

    assert.exists(user.id)
    assert.equal(user.email, 'test@example.com')
  })
})
```

## Functional Test (HTTP)

```typescript
import { test } from '@japa/runner'
import { UserFactory } from '#database/factories/user_factory'

test.group('Users Controller', (group) => {
  group.each.setup(async () => {
    // Runs before each test
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('list all users', async ({ client, assert }) => {
    await UserFactory.createMany(3)

    const response = await client.get('/users')

    response.assertStatus(200)
    assert.lengthOf(response.body(), 3)
  })

  test('create a user', async ({ client }) => {
    const response = await client.post('/users').json({
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    })

    response.assertStatus(201)
    response.assertBodyContains({ email: 'new@example.com' })
  })

  test('requires authentication', async ({ client }) => {
    const response = await client.get('/profile')
    response.assertStatus(401)
  })
})
```

## Authenticated Requests

```typescript
test('authenticated user can view profile', async ({ client }) => {
  const user = await UserFactory.create()

  const response = await client
    .get('/profile')
    .loginAs(user)

  response.assertStatus(200)
  response.assertBodyContains({ id: user.id })
})
```

## Database Helpers

```typescript
import Database from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('Database tests', (group) => {
  // Transaction per test (auto rollback)
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  // Or truncate tables
  group.each.setup(async () => {
    await Database.truncate('users')
  })
})
```

## Assertions

```typescript
test('response assertions', async ({ client, assert }) => {
  const response = await client.get('/users/1')

  // Status
  response.assertStatus(200)
  response.assertStatus(201)
  response.assertStatus(404)

  // Body
  response.assertBody({ id: 1, name: 'John' })
  response.assertBodyContains({ name: 'John' })

  // Headers
  response.assertHeader('content-type', 'application/json')

  // Custom assertions
  assert.equal(response.body().email, 'test@example.com')
  assert.lengthOf(response.body().users, 3)
  assert.isTrue(response.body().isActive)
})
```

## Mocking

```typescript
import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'

test('sends welcome email on registration', async ({ client, assert }) => {
  const { mails } = mail.fake()

  await client.post('/auth/register').json({
    email: 'test@example.com',
    password: 'password123',
  })

  assert.lengthOf(mails.sent, 1)
  mails.assertSent(WelcomeMail, (mail) => {
    return mail.to[0].address === 'test@example.com'
  })

  mail.restore()
})
```

## Running Tests

```bash
node ace test              # All tests
node ace test --files="tests/functional/**"
node ace test --tags="@slow"
node ace test --watch      # Watch mode
```
