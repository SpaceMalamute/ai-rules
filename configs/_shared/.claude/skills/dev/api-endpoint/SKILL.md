---
name: api-endpoint
description: Generate a complete REST API endpoint with validation, tests, and documentation
argument-hint: "<method> <path> [--resource <name>]"
---

# API Endpoint Generator

Generate a complete, production-ready API endpoint.

## Usage Examples

- `/api-endpoint GET /users` - List users endpoint
- `/api-endpoint POST /users` - Create user endpoint
- `/api-endpoint GET /users/:id` - Get user by ID
- `/api-endpoint PUT /users/:id` - Update user
- `/api-endpoint DELETE /users/:id` - Delete user
- `/api-endpoint --resource Order` - Full CRUD for Order resource

## Behavior

1. **Detect Framework**
   - NestJS → Controller, Service, DTO, Spec
   - Next.js → Route handler, Zod schema
   - FastAPI → Router, Pydantic schema
   - .NET → Controller, Service, Request/Response DTOs

2. **Generate Files**

### For Single Endpoint

| File | Content |
|------|---------|
| Route/Controller | HTTP handler with proper decorators |
| Validation Schema | Input validation (Zod/Pydantic/FluentValidation) |
| Service Method | Business logic (if applicable) |
| Test File | Unit and integration tests |

### For Full Resource (--resource)

| File | Content |
|------|---------|
| Controller/Router | All CRUD endpoints |
| DTOs/Schemas | Create, Update, Response, Query schemas |
| Service | Full CRUD operations |
| Repository | Database access layer |
| Tests | Full test coverage |

3. **Include in Generated Code**
   - Input validation
   - Error handling (404, 400, 500)
   - Authentication check (if auth detected)
   - Pagination (for list endpoints)
   - OpenAPI documentation

## Output Format

```
## Files to Create/Modify

### path/to/controller.ts
<code>

### path/to/dto.ts
<code>

### path/to/service.ts
<code>

### path/to/controller.spec.ts
<code>

## API Documentation

- **Method**: POST
- **Path**: /api/users
- **Request Body**: { email, name, password }
- **Response**: 201 Created
- **Errors**: 400 Validation Error, 409 Conflict
```

## Framework-Specific Patterns

### NestJS
```typescript
@Controller('users')
export class UsersController {
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {}
}
```

### Next.js (App Router)
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  const data = schema.parse(body);
  // ...
}
```

### FastAPI
```python
@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    pass
```

### .NET
```csharp
[HttpPost]
[ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
```

## REST Conventions

| Method | Path | Action | Response |
|--------|------|--------|----------|
| GET | /resources | List all | 200 + array |
| POST | /resources | Create | 201 + object |
| GET | /resources/:id | Get one | 200 + object |
| PUT | /resources/:id | Replace | 200 + object |
| PATCH | /resources/:id | Update | 200 + object |
| DELETE | /resources/:id | Delete | 204 No Content |
