---
paths:
  - "**/*.pipe.ts"
  - "**/pipes/**/*.ts"
---

# NestJS Pipes

## Built-in Pipes

```typescript
import {
  ValidationPipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  ParseUUIDPipe,
  ParseEnumPipe,
  DefaultValuePipe,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  // ParseIntPipe
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // ParseUUIDPipe with version
  @Get(':uuid')
  findByUuid(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.usersService.findByUuid(uuid);
  }

  // ParseEnumPipe
  @Get()
  findByStatus(
    @Query('status', new ParseEnumPipe(UserStatus)) status: UserStatus,
  ) {
    return this.usersService.findByStatus(status);
  }

  // DefaultValuePipe
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll({ page, limit });
  }

  // ParseArrayPipe
  @Get()
  findByIds(
    @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
    ids: number[],
  ) {
    return this.usersService.findByIds(ids);
  }
}
```

## Global Validation Pipe

```typescript
// main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip non-decorated properties
      forbidNonWhitelisted: true,   // Throw on extra properties
      transform: true,              // Transform payloads to DTO types
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          constraints: Object.values(error.constraints || {}),
        }));
        return new BadRequestException({ errors: messages });
      },
    }),
  );

  await app.listen(3000);
}
```

## Custom Pipes

### Transform Pipe

```typescript
// pipes/parse-date.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseDatePipe implements PipeTransform<string, Date> {
  transform(value: string): Date {
    const date = new Date(value);

    if (isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date format: ${value}`);
    }

    return date;
  }
}

// Usage
@Get()
findByDate(@Query('date', ParseDatePipe) date: Date) {
  return this.service.findByDate(date);
}
```

### Validation Pipe with Schema

```typescript
// pipes/zod-validation.pipe.ts
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  }
}

// Usage
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

@Post()
create(@Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto) {
  return this.usersService.create(dto);
}
```

### Async Pipe

```typescript
// pipes/user-exists.pipe.ts
import {
  PipeTransform,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';

@Injectable()
export class UserExistsPipe implements PipeTransform<string, Promise<User>> {
  constructor(private readonly usersService: UsersService) {}

  async transform(id: string): Promise<User> {
    const user = await this.usersService.findOne(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
}

// Usage - returns User directly, not ID
@Get(':id')
findOne(@Param('id', UserExistsPipe) user: User) {
  return user;
}
```

### Trim and Sanitize

```typescript
// pipes/trim.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
      return this.trimObject(value);
    }

    return value;
  }

  private trimObject(obj: Record<string, unknown>): Record<string, unknown> {
    const trimmed: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      trimmed[key] = typeof val === 'string' ? val.trim() : val;
    }

    return trimmed;
  }
}
```

### File Validation Pipe

```typescript
// pipes/file-validation.pipe.ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

interface FileValidationOptions {
  maxSize: number;
  allowedMimeTypes: string[];
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions) {}

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.size > this.options.maxSize) {
      throw new BadRequestException(
        `File size exceeds ${this.options.maxSize / 1024 / 1024}MB`,
      );
    }

    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed`,
      );
    }

    return file;
  }
}

// Usage
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
upload(
  @UploadedFile(
    new FileValidationPipe({
      maxSize: 5 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
    }),
  )
  file: Express.Multer.File,
) {
  return this.uploadService.upload(file);
}
```

## Pipe Binding Scopes

```typescript
// Parameter level
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}

// Method level
@Post()
@UsePipes(ValidationPipe)
create(@Body() dto: CreateDto) {}

// Controller level
@Controller('users')
@UsePipes(TrimPipe)
export class UsersController {}

// Global level (main.ts)
app.useGlobalPipes(new ValidationPipe());

// Global with DI
@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule {}
```

## Anti-patterns

```typescript
// BAD: Pipe with side effects
@Injectable()
export class LoggingPipe implements PipeTransform {
  transform(value: unknown) {
    console.log(value); // Use interceptor instead
    this.analyticsService.track(value); // Side effect!
    return value;
  }
}

// GOOD: Pipes are for transformation/validation only

// BAD: Heavy async operations in pipe
@Injectable()
export class HeavyPipe implements PipeTransform {
  async transform(value: string) {
    await this.externalApi.validate(value); // Too slow
    return value;
  }
}

// GOOD: Keep pipes lightweight, use guards for auth checks

// BAD: Not handling validation errors properly
transform(value: string) {
  return new Date(value); // Crashes on invalid input
}

// GOOD: Proper error handling
transform(value: string) {
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new BadRequestException('Invalid date');
  }
  return date;
}
```
