---
description: "ASP.NET Core API conventions and controllers"
paths:
  - "**/src/WebApi/**/*.cs"
  - "**/src/**/Controllers/**/*.cs"
  - "**/src/**/Endpoints/**/*.cs"
---

# ASP.NET Core API Rules

## Endpoint Strategy

| Approach | When to use |
|----------|-------------|
| Minimal APIs (default) | New endpoints, simple routing, CRUD |
| Controllers | Complex model binding, content negotiation, OData |

## Minimal API Directives

- Organize endpoints in static extension methods per feature: `MapUserEndpoints()`
- Use `MapGroup()` to share prefix, tags, and auth per feature
- Use `[AsParameters]` to bind complex query objects
- Use `TypedResults.Ok()`, `TypedResults.NotFound()`, etc. for compile-time response type checking
- Use `WithName()` on GET endpoints to enable `CreatedAtRoute` links

## Response Conventions

- Return `ProblemDetails` (RFC 9457) for all error responses
- Map exceptions to status codes in a global exception handler or `IExceptionHandler`
- Use `Results.ValidationProblem()` for 400 validation errors
- DO NOT return raw strings or anonymous objects for errors

## Authentication & Authorization

- Register `AddAuthentication()` + `AddAuthorization()` in services
- Middleware order: `UseAuthentication()` before `UseAuthorization()`
- Use policy-based authorization over role checks: `RequireAuthorization("PolicyName")`

## Versioning

- Use `Asp.Versioning.Http` with URL segment reader as primary strategy
- Group versioned endpoints: `/api/v{version:apiVersion}/resource`

## Rate Limiting

- Use built-in `AddRateLimiter()` with fixed window or token bucket
- Apply per-endpoint with `RequireRateLimiting("policyName")`
- Set rejection status to 429

## Anti-patterns

- DO NOT use `IActionResult` in Minimal APIs -- use `TypedResults` or `Results`
- DO NOT put business logic in endpoints -- delegate to MediatR/services
- DO NOT skip `CancellationToken` propagation in endpoint handlers
