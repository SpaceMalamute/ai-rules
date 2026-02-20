---
paths:
  - "**/app/services/**/*.ts"
---

# AdonisJS Services

## Structure

Services contain business logic. Controllers delegate to services.

```typescript
// app/services/user_service.ts
import { inject } from '@adonisjs/core'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

@inject()
export default class UserService {
  async getAll() {
    return User.query().orderBy('createdAt', 'desc')
  }

  async findOrFail(id: number) {
    return User.findOrFail(id)
  }

  async create(data: { email: string; password: string; name: string }) {
    return User.create({
      ...data,
      password: await hash.make(data.password),
    })
  }

  async update(id: number, data: Partial<{ email: string; name: string }>) {
    const user = await User.findOrFail(id)
    user.merge(data)
    await user.save()
    return user
  }

  async delete(id: number) {
    const user = await User.findOrFail(id)
    await user.delete()
  }
}
```

## Service with Dependencies

```typescript
import { inject } from '@adonisjs/core'
import mail from '@adonisjs/mail/services/main'
import User from '#models/user'
import NotificationService from '#services/notification_service'

@inject()
export default class OrderService {
  constructor(private notificationService: NotificationService) {}

  async create(userId: number, items: OrderItem[]) {
    const user = await User.findOrFail(userId)

    const order = await Order.create({
      userId,
      total: this.calculateTotal(items),
    })

    await order.related('items').createMany(items)

    // Use injected service
    await this.notificationService.sendOrderConfirmation(user, order)

    return order
  }

  private calculateTotal(items: OrderItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }
}
```

## Register in Container (optional)

For complex setup or interfaces:

```typescript
// providers/app_provider.ts
import type { ApplicationService } from '@adonisjs/core/types'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    const { default: PaymentService } = await import('#services/payment_service')

    this.app.container.singleton('payment', () => {
      return new PaymentService(env.get('STRIPE_KEY'))
    })
  }
}
```

## Error Handling

```typescript
import { Exception } from '@adonisjs/core/exceptions'

export class InsufficientFundsException extends Exception {
  static status = 422
  static code = 'E_INSUFFICIENT_FUNDS'
}

export default class WalletService {
  async withdraw(userId: number, amount: number) {
    const wallet = await Wallet.findByOrFail('userId', userId)

    if (wallet.balance < amount) {
      throw new InsufficientFundsException('Insufficient funds')
    }

    wallet.balance -= amount
    await wallet.save()
    return wallet
  }
}
```

## Testing Services

```typescript
import { test } from '@japa/runner'
import UserService from '#services/user_service'
import { UserFactory } from '#database/factories/user_factory'

test.group('UserService', (group) => {
  group.each.setup(async () => {
    await Database.beginGlobalTransaction()
    return () => Database.rollbackGlobalTransaction()
  })

  test('creates user with hashed password', async ({ assert }) => {
    const service = new UserService()

    const user = await service.create({
      email: 'test@example.com',
      password: 'plaintext',
      name: 'Test',
    })

    assert.notEqual(user.password, 'plaintext')
  })
})
```
