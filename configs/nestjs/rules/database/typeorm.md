---
paths:
  - "**/src/**/*.entity.ts"
  - "**/src/**/*.repository.ts"
  - "**/src/**/typeorm*.ts"
---

# NestJS with TypeORM

## Setup

### TypeORM Module

```typescript
// app.module.ts
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow('DB_HOST'),
        port: config.get('DB_PORT', 5432),
        username: config.getOrThrow('DB_USER'),
        password: config.getOrThrow('DB_PASSWORD'),
        database: config.getOrThrow('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class AppModule {}
```

## Entity Design

### Entity Conventions

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  name?: string;

  @Column({
    type: 'enum',
    enum: ['user', 'admin'],
    default: 'user',
  })
  role: 'user' | 'admin';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User, (user) => user.posts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  @Index()
  authorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### Naming Conventions

- Entities: PascalCase (`User`, `BlogPost`)
- Properties: camelCase (`createdAt`, `authorId`)
- Tables: snake_case via `@Entity('users')`
- Columns: snake_case via `{ name: 'created_at' }`

## Repository Pattern

### Custom Repository

```typescript
// users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findMany(options: {
    skip?: number;
    take?: number;
    where?: Partial<User>;
  }): Promise<User[]> {
    return this.repository.find(options);
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.repository.create(data);
    return this.repository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
```

### Module Registration

```typescript
// users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersRepository, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

## Query Patterns

### QueryBuilder

```typescript
async findWithFilters(filters: UserFilters) {
  const qb = this.repository.createQueryBuilder('user');

  if (filters.search) {
    qb.andWhere(
      '(user.name ILIKE :search OR user.email ILIKE :search)',
      { search: `%${filters.search}%` },
    );
  }

  if (filters.role) {
    qb.andWhere('user.role = :role', { role: filters.role });
  }

  if (filters.createdAfter) {
    qb.andWhere('user.createdAt >= :date', { date: filters.createdAfter });
  }

  return qb
    .orderBy('user.createdAt', 'DESC')
    .skip(filters.skip ?? 0)
    .take(filters.take ?? 20)
    .getMany();
}
```

### Relations

```typescript
// Eager loading
const user = await this.repository.findOne({
  where: { id },
  relations: ['posts', 'profile'],
});

// QueryBuilder with relations
const users = await this.repository
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post', 'post.published = :published', {
    published: true,
  })
  .where('user.role = :role', { role: 'admin' })
  .getMany();
```

### Pagination

```typescript
async findPaginated(page: number, limit: number) {
  const [data, total] = await this.repository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

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
import { DataSource } from 'typeorm';

@Injectable()
export class TransferService {
  constructor(private readonly dataSource: DataSource) {}

  async transferCredits(fromId: string, toId: string, amount: number) {
    return this.dataSource.transaction(async (manager) => {
      const sender = await manager.findOne(User, { where: { id: fromId } });
      const receiver = await manager.findOne(User, { where: { id: toId } });

      if (sender.credits < amount) {
        throw new Error('Insufficient credits');
      }

      sender.credits -= amount;
      receiver.credits += amount;

      await manager.save([sender, receiver]);

      return { success: true };
    });
  }
}
```

### Soft Delete

```typescript
import { DeleteDateColumn } from 'typeorm';

@Entity('users')
export class User {
  // ...

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;
}

// Soft delete
await this.repository.softDelete(id);

// Restore
await this.repository.restore(id);

// Include soft-deleted in query
await this.repository.find({ withDeleted: true });
```

## Migrations

```bash
# Generate migration from entity changes
npx typeorm migration:generate src/migrations/AddUsersTable -d src/data-source.ts

# Create empty migration
npx typeorm migration:create src/migrations/SeedData

# Run migrations
npx typeorm migration:run -d src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d src/data-source.ts
```

### Migration Example

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersTable1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
```

## Testing with TypeORM

```typescript
import { getRepositoryToken } from '@nestjs/typeorm';

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const module = await Test.createTestingModule({
  providers: [
    UsersService,
    {
      provide: getRepositoryToken(User),
      useValue: mockRepository,
    },
  ],
}).compile();
```
