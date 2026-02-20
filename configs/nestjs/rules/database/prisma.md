---
description: "Prisma ORM integration with NestJS"
paths:
  - "**/prisma/**/*.prisma"
  - "**/src/**/*.repository.ts"
  - "**/src/**/prisma*.ts"
---

# NestJS with Prisma

## Setup

### Prisma Module

```typescript
// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

## Schema Design

### Model Conventions

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  posts     Post[]
  profile   Profile?

  @@map("users")
}

model Post {
  id          String   @id @default(uuid())
  title       String
  content     String?
  published   Boolean  @default(false)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  author      User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId    String   @map("author_id")

  categories  Category[]

  @@index([authorId])
  @@map("posts")
}

enum Role {
  USER
  ADMIN
}
```

### Naming Conventions

- Models: PascalCase (`User`, `BlogPost`)
- Fields: camelCase (`createdAt`, `authorId`)
- Database tables: snake_case via `@@map("users")`
- Database columns: snake_case via `@map("created_at")`

## Repository Pattern

```typescript
// users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
```

## Query Patterns

### Select Specific Fields

```typescript
// Return only needed fields
const user = await this.prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true,
    // password excluded
  },
});
```

### Include Relations

```typescript
const userWithPosts = await this.prisma.user.findUnique({
  where: { id },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});
```

### Pagination

```typescript
async findPaginated(page: number, limit: number) {
  const [data, total] = await Promise.all([
    this.prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.user.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Transactions

```typescript
async transferCredits(fromId: string, toId: string, amount: number) {
  return this.prisma.$transaction(async (tx) => {
    const sender = await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });

    if (sender.credits < 0) {
      throw new Error('Insufficient credits');
    }

    await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });

    return { success: true };
  });
}
```

### Soft Delete Pattern

```prisma
model User {
  id        String    @id @default(uuid())
  deletedAt DateTime? @map("deleted_at")
  // ...
}
```

```typescript
// Middleware approach
this.prisma.$use(async (params, next) => {
  if (params.model === 'User') {
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args['where'] = {
        ...params.args['where'],
        deletedAt: null,
      };
    }
  }
  return next(params);
});
```

## Migrations

```bash
# Create migration
npx prisma migrate dev --name add_users_table

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema change
npx prisma generate
```

## Testing with Prisma

```typescript
// Mock PrismaService
const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// E2E: Use test database
// .env.test
DATABASE_URL="postgresql://localhost:5432/myapp_test"
```
