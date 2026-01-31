---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.py"
  - "**/*.cs"
---

# Software Engineering Principles

## YAGNI - You Aren't Gonna Need It

Don't implement features until they're actually needed.

```typescript
// BAD - Building for hypothetical future
interface UserService {
  getUser(id: string): User;
  getUserWithCache(id: string, ttl?: number): User;
  getUserAsync(id: string): Promise<User>;
  getUserBatch(ids: string[]): User[];
  getUserByEmail(email: string): User;
  getUserByPhone(phone: string): User;  // No one asked for this
  getUserBySSN(ssn: string): User;      // No one asked for this
}

// GOOD - Only what's needed now
interface UserService {
  getUser(id: string): Promise<User>;
  getUserByEmail(email: string): Promise<User>;
}
```

```typescript
// BAD - Premature abstraction
class AbstractDataProcessor<T, R, C extends Config> {
  // 200 lines of "flexible" code no one uses
}

// GOOD - Concrete implementation
function processUserData(users: User[]): ProcessedUser[] {
  return users.map(u => ({ ...u, fullName: `${u.first} ${u.last}` }));
}
```

## KISS - Keep It Simple, Stupid

Choose the simplest solution that works.

```typescript
// BAD - Over-engineered
class StringUtils {
  private static instance: StringUtils;
  private constructor() {}

  static getInstance(): StringUtils {
    if (!this.instance) this.instance = new StringUtils();
    return this.instance;
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
// Usage: StringUtils.getInstance().capitalize('hello')

// GOOD - Simple function
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
// Usage: capitalize('hello')
```

```typescript
// BAD - Unnecessary complexity
const isAdult = (age: number) =>
  new AgeValidator(new AgePolicy(18)).validate(age).isValid();

// GOOD - Direct and clear
const isAdult = (age: number) => age >= 18;
```

## SOLID Principles

### S - Single Responsibility

A class/function should have only one reason to change.

```typescript
// BAD - Multiple responsibilities
class UserService {
  createUser(data: UserData) { /* ... */ }
  sendWelcomeEmail(user: User) { /* ... */ }
  generatePDF(user: User) { /* ... */ }
  validateCreditCard(card: Card) { /* ... */ }
}

// GOOD - Single responsibility each
class UserService {
  createUser(data: UserData) { /* ... */ }
}

class EmailService {
  sendWelcomeEmail(user: User) { /* ... */ }
}

class PDFService {
  generateUserReport(user: User) { /* ... */ }
}
```

### O - Open/Closed

Open for extension, closed for modification.

```typescript
// BAD - Must modify to add new types
function calculateArea(shape: Shape) {
  if (shape.type === 'circle') {
    return Math.PI * shape.radius ** 2;
  } else if (shape.type === 'rectangle') {
    return shape.width * shape.height;
  }
  // Must add new else-if for each shape
}

// GOOD - Extend without modifying
interface Shape {
  area(): number;
}

class Circle implements Shape {
  constructor(private radius: number) {}
  area() { return Math.PI * this.radius ** 2; }
}

class Rectangle implements Shape {
  constructor(private width: number, private height: number) {}
  area() { return this.width * this.height; }
}

// Add new shapes without changing existing code
class Triangle implements Shape {
  constructor(private base: number, private height: number) {}
  area() { return 0.5 * this.base * this.height; }
}
```

### L - Liskov Substitution

Subtypes must be substitutable for their base types.

```typescript
// BAD - Violates LSP
class Bird {
  fly() { /* ... */ }
}

class Penguin extends Bird {
  fly() { throw new Error("Can't fly!"); } // Breaks substitutability
}

// GOOD - Proper hierarchy
interface Bird {
  move(): void;
}

class FlyingBird implements Bird {
  move() { this.fly(); }
  private fly() { /* ... */ }
}

class Penguin implements Bird {
  move() { this.swim(); }
  private swim() { /* ... */ }
}
```

### I - Interface Segregation

Clients shouldn't depend on interfaces they don't use.

```typescript
// BAD - Fat interface
interface Worker {
  work(): void;
  eat(): void;
  sleep(): void;
  attendMeeting(): void;
  writeReport(): void;
}

// GOOD - Segregated interfaces
interface Workable {
  work(): void;
}

interface Meetable {
  attendMeeting(): void;
}

interface Reportable {
  writeReport(): void;
}

class Developer implements Workable, Meetable {
  work() { /* ... */ }
  attendMeeting() { /* ... */ }
}

class Robot implements Workable {
  work() { /* ... */ }
  // Doesn't need eat, sleep, or meetings
}
```

### D - Dependency Inversion

Depend on abstractions, not concretions.

```typescript
// BAD - Depends on concrete implementation
class OrderService {
  private db = new MySQLDatabase();
  private mailer = new SendGridMailer();

  createOrder(order: Order) {
    this.db.save(order);
    this.mailer.send(order.userEmail, 'Order confirmed');
  }
}

// GOOD - Depends on abstractions
class OrderService {
  constructor(
    private repository: OrderRepository,
    private notifier: Notifier,
  ) {}

  createOrder(order: Order) {
    this.repository.save(order);
    this.notifier.notify(order.userEmail, 'Order confirmed');
  }
}

// Can inject any implementation
new OrderService(new PostgresOrderRepo(), new EmailNotifier());
new OrderService(new MongoOrderRepo(), new SMSNotifier());
```

## SoC - Separation of Concerns

Separate code into distinct sections, each handling a specific concern.

```typescript
// BAD - Mixed concerns
async function handleUserRegistration(req: Request, res: Response) {
  // Validation
  if (!req.body.email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  // Business logic
  const hashedPassword = await bcrypt.hash(req.body.password, 10);

  // Data access
  const user = await db.query(
    'INSERT INTO users (email, password) VALUES ($1, $2)',
    [req.body.email, hashedPassword]
  );

  // Presentation
  return res.json({ id: user.id, email: user.email });
}

// GOOD - Separated concerns
// validation.ts
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// user.service.ts
class UserService {
  async register(data: CreateUserDto): Promise<User> {
    const hashedPassword = await this.hashPassword(data.password);
    return this.userRepository.create({ ...data, password: hashedPassword });
  }
}

// user.controller.ts
async function register(req: Request, res: Response) {
  const data = userSchema.parse(req.body);
  const user = await userService.register(data);
  return res.json(toUserResponse(user));
}
```

## DRY - Don't Repeat Yourself

But don't over-apply it. Duplication is better than the wrong abstraction.

```typescript
// BAD - Premature DRY (wrong abstraction)
function processEntity(entity: User | Product | Order, action: string) {
  // 100 lines of if/else handling all cases
}

// GOOD - Some duplication is OK when contexts differ
function processUser(user: User) { /* user-specific logic */ }
function processProduct(product: Product) { /* product-specific logic */ }
function processOrder(order: Order) { /* order-specific logic */ }

// GOOD - DRY when truly duplicated
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
// Use everywhere instead of repeating the formatting logic
```

## Summary

| Principle | Remember |
|-----------|----------|
| YAGNI | Build what you need now, not what you might need |
| KISS | Simple > Clever. If it's hard to explain, simplify it |
| SRP | One reason to change per class/function |
| OCP | Add new code, don't modify existing code |
| LSP | Subtypes must honor parent contracts |
| ISP | Small, focused interfaces > large, general ones |
| DIP | Inject dependencies, don't instantiate them |
| SoC | Validation, business logic, data access = separate |
| DRY | Avoid duplication, but not at the cost of clarity |
