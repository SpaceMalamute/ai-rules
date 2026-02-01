---
paths:
  - "src/**/*.module.ts"
  - "src/**/*.controller.ts"
  - "src/**/*.service.ts"
  - "src/main.ts"
---

# NestJS Module Architecture

## Global Configuration (main.ts)

### ValidationPipe Setup

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error on extra properties
      transform: true,            // Auto-transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3000);
}
```

## Module Design

### Single Responsibility

Each module should own exactly one domain. If a module does multiple things, split it.

```typescript
// Good: Focused modules
@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}

// Bad: Kitchen sink module
@Module({
  controllers: [UsersController, OrdersController, PaymentsController],
  providers: [/* too many */],
})
export class EverythingModule {}
```

### Module Boundaries

- Modules communicate via **exported services only**
- Never import internal providers from other modules
- Use barrel exports (`index.ts`) for clean imports

```typescript
// users/index.ts
export { UsersModule } from './users.module';
export { UsersService } from './users.service';
export { User } from './entities/user.entity';
```

### Dynamic Modules for Configuration

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        {
          provide: DATABASE_OPTIONS,
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}
```

## Controller Rules

### Controllers Handle HTTP Only

- Parse request (params, query, body)
- Call service methods
- Return response
- NO business logic

```typescript
// Good
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}

// Bad: Business logic in controller
@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.userRepository.findOne(id);
    if (!user) throw new NotFoundException();
    if (user.deletedAt) throw new GoneException();
    user.lastAccessed = new Date();
    await this.userRepository.save(user);
    return user;
  }
}
```

### Use Pipes for Transformation/Validation

```typescript
@Get(':id')
findOne(
  @Param('id', ParseUUIDPipe) id: string,
  @Query('include', new ParseArrayPipe({ optional: true })) include?: string[],
) {
  return this.usersService.findOne(id, { include });
}
```

## Service Rules

### Services Contain Business Logic

- Validation rules
- Data transformations
- Orchestration between repositories
- Error handling with appropriate exceptions

```typescript
@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly usersService: UsersService,
    private readonly inventoryService: InventoryService,
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    // Business logic belongs here
    const user = await this.usersService.findOne(userId);

    if (!user.verified) {
      throw new ForbiddenException('Unverified users cannot place orders');
    }

    const available = await this.inventoryService.checkAvailability(dto.items);
    if (!available) {
      throw new ConflictException('Some items are out of stock');
    }

    return this.ordersRepository.create({ userId, ...dto });
  }
}
```

### Use NestJS Exceptions

```typescript
// Use built-in HTTP exceptions
throw new NotFoundException('Resource not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Authentication required');
throw new ForbiddenException('Access denied');
throw new ConflictException('Resource already exists');

// Custom exceptions extend HttpException
export class BusinessRuleException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}
```

## Dependency Injection

### Prefer Constructor Injection

```typescript
// Good
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService,
  ) {}
}

// Avoid property injection
@Injectable()
export class UsersService {
  @Inject()
  private usersRepository: UsersRepository; // Harder to test
}
```

### Use Injection Tokens for Non-Class Dependencies

```typescript
// constants.ts
export const CONFIG_OPTIONS = Symbol('CONFIG_OPTIONS');

// module.ts
@Module({
  providers: [
    {
      provide: CONFIG_OPTIONS,
      useValue: { apiKey: '...' },
    },
  ],
})
export class MyModule {}

// service.ts
@Injectable()
export class MyService {
  constructor(@Inject(CONFIG_OPTIONS) private options: ConfigOptions) {}
}
```
