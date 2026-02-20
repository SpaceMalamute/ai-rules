---
paths:
  - "**/app/models/**/*.ts"
  - "database/migrations/**/*.ts"
  - "database/seeders/**/*.ts"
  - "database/factories/**/*.ts"
---

# Lucid ORM

## Models

```typescript
import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import Post from '#models/post'
import Role from '#models/role'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare roleId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relationships
  @hasMany(() => Post)
  declare posts: HasMany<typeof Post>

  @belongsTo(() => Role)
  declare role: BelongsTo<typeof Role>
}
```

## Relationships

```typescript
// One to Many
@hasMany(() => Post)
declare posts: HasMany<typeof Post>

// Belongs To
@belongsTo(() => User)
declare user: BelongsTo<typeof User>

// Many to Many
@manyToMany(() => Tag, {
  pivotTable: 'post_tags',
  pivotTimestamps: true,
})
declare tags: ManyToMany<typeof Tag>

// Has One
@hasOne(() => Profile)
declare profile: HasOne<typeof Profile>
```

## Queries

```typescript
// Find
const user = await User.find(1)
const user = await User.findOrFail(1)
const user = await User.findBy('email', 'user@example.com')

// Query builder
const users = await User.query()
  .where('isActive', true)
  .whereNotNull('verifiedAt')
  .orderBy('createdAt', 'desc')
  .limit(10)

// With relationships
const user = await User.query()
  .where('id', 1)
  .preload('posts', (query) => {
    query.where('isPublished', true)
  })
  .firstOrFail()

// Aggregates
const count = await User.query().count('* as total')
```

## Migrations

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('email').notNullable().unique()
      table.string('password').notNullable()
      table.integer('role_id').unsigned().references('roles.id').onDelete('CASCADE')
      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

## Factories

```typescript
import Factory from '@adonisjs/lucid/factories'
import User from '#models/user'

export const UserFactory = Factory.define(User, ({ faker }) => ({
  email: faker.internet.email(),
  password: faker.internet.password(),
}))
  .relation('posts', () => PostFactory)
  .build()

// Usage
const user = await UserFactory.create()
const users = await UserFactory.createMany(5)
const userWithPosts = await UserFactory.with('posts', 3).create()
```

## Hooks

```typescript
import { beforeSave } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'

export default class User extends BaseModel {
  @beforeSave()
  static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await hash.make(user.password)
    }
  }
}
```

## Transactions

```typescript
import db from '@adonisjs/lucid/services/db'

await db.transaction(async (trx) => {
  const user = await User.create({ email, password }, { client: trx })
  await Profile.create({ userId: user.id }, { client: trx })
})
```
