---
description: "NestJS DTO validation with class-validator"
paths:
  - "**/src/**/*.dto.ts"
  - "**/src/**/dto/*.ts"
---

# NestJS Validation & DTOs

## DTO Rules

### Always Use class-validator

Every DTO property must have validation decorators.

```typescript
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUUID,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}
```

### Use Mapped Types for Variants

```typescript
import { PartialType, PickType, OmitType, IntersectionType } from '@nestjs/mapped-types';

// All fields optional
export class UpdateUserDto extends PartialType(CreateUserDto) {}

// Only specific fields
export class LoginDto extends PickType(CreateUserDto, ['email', 'password']) {}

// Exclude fields
export class PublicUserDto extends OmitType(CreateUserDto, ['password']) {}

// Combine DTOs
export class CreateUserWithAddressDto extends IntersectionType(
  CreateUserDto,
  CreateAddressDto,
) {}
```

### Validate Nested Objects

```typescript
export class CreateOrderDto {
  @IsUUID()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;
}

export class OrderItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity: number;
}
```

### Transform Input Data

```typescript
import { Transform, Type } from 'class-transformer';

export class QueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  active?: boolean;
}
```

## Validation Groups

Use groups for conditional validation:

```typescript
export class UserDto {
  @IsUUID({ groups: ['update'] })
  @IsOptional({ groups: ['create'] })
  id?: string;

  @IsEmail({ groups: ['create', 'update'] })
  email: string;

  @IsString({ groups: ['create'] })
  @MinLength(8, { groups: ['create'] })
  password: string;
}

// Controller usage
@Post()
create(
  @Body(new ValidationPipe({ groups: ['create'] }))
  dto: UserDto,
) {}

@Patch(':id')
update(
  @Body(new ValidationPipe({ groups: ['update'] }))
  dto: UserDto,
) {}
```

## Custom Validators

```typescript
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ async: true })
export class IsUniqueEmailConstraint implements ValidatorConstraintInterface {
  constructor(private readonly usersService: UsersService) {}

  async validate(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);
    return !user;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Email already exists';
  }
}

// Decorator factory
export function IsUniqueEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsUniqueEmailConstraint,
    });
  };
}

// Usage
export class CreateUserDto {
  @IsEmail()
  @IsUniqueEmail()
  email: string;
}
```

## API Documentation with Swagger

Combine validation with OpenAPI documentation:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    minLength: 8,
    description: 'User password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  name?: string;
}
```

## Response DTOs

Use separate DTOs for responses to control exposed data:

```typescript
import { Exclude, Expose, Type } from 'class-transformer';

export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Exclude()
  password: string;

  @Expose()
  @Type(() => Date)
  createdAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}

// Service usage with ClassSerializerInterceptor
@UseInterceptors(ClassSerializerInterceptor)
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(id);
  return new UserResponseDto(user);
}
```
