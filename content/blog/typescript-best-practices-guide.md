---
title: "TypeScript Best Practices: Write Type-Safe, Maintainable Code"
description: "Master TypeScript with advanced patterns, type utilities, generics, strict mode, error handling, and best practices for building scalable applications. From basics to advanced type manipulation."
date: "2024-12-15"
author: "Tushar Agrawal"
tags: ["TypeScript", "JavaScript", "Backend", "Frontend", "Type Safety", "Best Practices", "Node.js"]
image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop"
published: true
---

## Introduction

TypeScript transforms JavaScript development by adding static types, catching errors at compile time rather than runtime. This guide covers best practices from basic typing to advanced patterns used in production codebases.

## Essential Configuration

### Strict tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Type Fundamentals

### Prefer Interfaces for Objects

```typescript
// Good: Interfaces are extendable and have better error messages
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}

// Type aliases for unions, primitives, and utilities
type UserRole = 'admin' | 'user' | 'guest';
type UserId = string;
type Nullable<T> = T | null;
```

### Const Assertions

```typescript
// Without const assertion - type is string[]
const roles = ['admin', 'user', 'guest'];

// With const assertion - type is readonly ['admin', 'user', 'guest']
const roles = ['admin', 'user', 'guest'] as const;
type Role = typeof roles[number]; // 'admin' | 'user' | 'guest'

// Object const assertion
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
} as const;

type Config = typeof config;
// { readonly apiUrl: "https://api.example.com"; readonly timeout: 5000; readonly retries: 3 }
```

### Discriminated Unions

```typescript
// Define result types with discriminant
interface Success<T> {
  success: true;
  data: T;
}

interface Failure {
  success: false;
  error: string;
  code: number;
}

type Result<T> = Success<T> | Failure;

// Usage with type narrowing
function handleResult<T>(result: Result<T>): T | null {
  if (result.success) {
    // TypeScript knows result is Success<T> here
    return result.data;
  } else {
    // TypeScript knows result is Failure here
    console.error(`Error ${result.code}: ${result.error}`);
    return null;
  }
}

// API response types
interface ApiResponseSuccess<T> {
  status: 'success';
  data: T;
  meta?: {
    page: number;
    total: number;
  };
}

interface ApiResponseError {
  status: 'error';
  message: string;
  errors?: Record<string, string[]>;
}

type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

async function fetchUser(id: string): Promise<ApiResponse<User>> {
  try {
    const response = await fetch(`/api/users/${id}`);
    const data = await response.json();
    return { status: 'success', data };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Advanced Type Patterns

### Generic Constraints

```typescript
// Constrain generic to have specific properties
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Constrain to object keys
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

const user: User = {
  id: '1',
  email: 'john@example.com',
  name: 'John',
  role: 'user',
  createdAt: new Date()
};

const subset = pick(user, ['id', 'email']);
// Type: { id: string; email: string }
```

### Mapped Types

```typescript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Custom mapped types
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

// Rename keys
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// { getName: () => string; getAge: () => number }
```

### Conditional Types

```typescript
// Basic conditional type
type IsString<T> = T extends string ? true : false;

// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type StringArray = string[];
type Element = ArrayElement<StringArray>; // string

// Extract function return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract Promise value
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type NestedPromise = Promise<Promise<string>>;
type Resolved = Awaited<NestedPromise>; // string

// Exclude and Extract
type Exclude<T, U> = T extends U ? never : T;
type Extract<T, U> = T extends U ? T : never;

type Numbers = 1 | 2 | 3 | 4 | 5;
type SmallNumbers = Extract<Numbers, 1 | 2 | 3>; // 1 | 2 | 3
type BigNumbers = Exclude<Numbers, 1 | 2 | 3>;   // 4 | 5
```

### Template Literal Types

```typescript
// HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Route patterns
type ApiRoute = `/api/${string}`;
type UserRoute = `/api/users/${string}`;

// Event names
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>; // 'onClick'
type SubmitEvent = EventName<'submit'>; // 'onSubmit'

// Build object type from event names
type EventHandlers<Events extends string> = {
  [E in Events as EventName<E>]?: () => void;
};

type MouseEvents = 'click' | 'mouseenter' | 'mouseleave';
type MouseHandlers = EventHandlers<MouseEvents>;
// { onClick?: () => void; onMouseenter?: () => void; onMouseleave?: () => void }

// CSS property types
type CSSValue = `${number}${'px' | 'rem' | 'em' | '%'}`;

function setWidth(element: HTMLElement, width: CSSValue) {
  element.style.width = width;
}

setWidth(element, '100px');  // OK
setWidth(element, '2rem');   // OK
// setWidth(element, '100');  // Error: not a valid CSSValue
```

## Error Handling

### Type-Safe Error Classes

```typescript
// Base error with type discrimination
abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;

  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
  }
}

class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super('Validation failed');
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors
    };
  }
}

class UnauthorizedError extends AppError {
  readonly code = 'UNAUTHORIZED';
  readonly statusCode = 401;

  constructor(message = 'Authentication required') {
    super(message);
  }
}

// Type guard for error handling
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Usage
function handleError(error: unknown): void {
  if (isAppError(error)) {
    // Type-safe access to error properties
    console.log(`[${error.code}] ${error.message}`);

    if (error instanceof ValidationError) {
      // TypeScript knows about errors property
      console.log('Validation errors:', error.errors);
    }
  } else if (error instanceof Error) {
    console.log('Unexpected error:', error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### Result Pattern (No Exceptions)

```typescript
// Result type for explicit error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper functions
function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage in services
interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
}

type CreateUserError =
  | { type: 'EMAIL_EXISTS'; email: string }
  | { type: 'WEAK_PASSWORD'; requirements: string[] }
  | { type: 'INVALID_EMAIL'; email: string };

async function createUser(
  dto: CreateUserDTO
): Promise<Result<User, CreateUserError>> {
  // Validate email format
  if (!isValidEmail(dto.email)) {
    return err({ type: 'INVALID_EMAIL', email: dto.email });
  }

  // Check password strength
  const passwordIssues = validatePassword(dto.password);
  if (passwordIssues.length > 0) {
    return err({ type: 'WEAK_PASSWORD', requirements: passwordIssues });
  }

  // Check if email exists
  const existingUser = await userRepository.findByEmail(dto.email);
  if (existingUser) {
    return err({ type: 'EMAIL_EXISTS', email: dto.email });
  }

  // Create user
  const user = await userRepository.create(dto);
  return ok(user);
}

// Caller handles all cases explicitly
async function handleCreateUser(dto: CreateUserDTO) {
  const result = await createUser(dto);

  if (!result.ok) {
    switch (result.error.type) {
      case 'EMAIL_EXISTS':
        return { status: 400, message: `Email ${result.error.email} already registered` };
      case 'WEAK_PASSWORD':
        return { status: 400, message: 'Password requirements not met', requirements: result.error.requirements };
      case 'INVALID_EMAIL':
        return { status: 400, message: 'Invalid email format' };
    }
  }

  return { status: 201, user: result.value };
}
```

## API Type Safety

### Request/Response Types

```typescript
// Define API contract
interface ApiEndpoints {
  '/users': {
    GET: {
      query: { page?: number; limit?: number };
      response: { users: User[]; total: number };
    };
    POST: {
      body: CreateUserDTO;
      response: User;
    };
  };
  '/users/:id': {
    GET: {
      params: { id: string };
      response: User;
    };
    PUT: {
      params: { id: string };
      body: UpdateUserDTO;
      response: User;
    };
    DELETE: {
      params: { id: string };
      response: void;
    };
  };
}

// Type-safe API client
type ExtractParams<T extends string> = T extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractParams<Rest>]: string }
  : T extends `${infer _Start}:${infer Param}`
  ? { [K in Param]: string }
  : {};

class TypedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<P extends keyof ApiEndpoints>(
    path: P,
    options?: {
      params?: ExtractParams<P>;
      query?: ApiEndpoints[P] extends { GET: { query: infer Q } } ? Q : never;
    }
  ): Promise<ApiEndpoints[P] extends { GET: { response: infer R } } ? R : never> {
    let url = this.baseUrl + path;

    // Replace path params
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url = url.replace(`:${key}`, value);
      }
    }

    // Add query params
    if (options?.query) {
      const queryString = new URLSearchParams(
        options.query as Record<string, string>
      ).toString();
      url += `?${queryString}`;
    }

    const response = await fetch(url);
    return response.json();
  }

  async post<P extends keyof ApiEndpoints>(
    path: P,
    body: ApiEndpoints[P] extends { POST: { body: infer B } } ? B : never,
    options?: { params?: ExtractParams<P> }
  ): Promise<ApiEndpoints[P] extends { POST: { response: infer R } } ? R : never> {
    let url = this.baseUrl + path;

    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url = url.replace(`:${key}`, value);
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }
}

// Usage - fully type-safe
const api = new TypedApiClient('https://api.example.com');

// TypeScript knows the response type
const users = await api.get('/users', { query: { page: 1, limit: 10 } });
// Type: { users: User[]; total: number }

const user = await api.get('/users/:id', { params: { id: '123' } });
// Type: User
```

### Zod for Runtime Validation

```typescript
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.coerce.date()
});

// Infer TypeScript type from schema
type User = z.infer<typeof UserSchema>;

const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true });
type CreateUserDTO = z.infer<typeof CreateUserSchema>;

// Validation with type narrowing
function validateUser(data: unknown): User {
  return UserSchema.parse(data);
}

// Safe validation (doesn't throw)
function safeValidateUser(data: unknown): Result<User, z.ZodError> {
  const result = UserSchema.safeParse(data);
  if (result.success) {
    return ok(result.data);
  }
  return err(result.error);
}

// Express middleware
import { Request, Response, NextFunction } from 'express';

function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      });
    }

    // Attach validated data to request
    req.body = result.data;
    next();
  };
}

// Usage
app.post('/users', validateBody(CreateUserSchema), async (req, res) => {
  // req.body is now typed as CreateUserDTO
  const user = await createUser(req.body);
  res.json(user);
});
```

## Utility Patterns

### Builder Pattern

```typescript
class QueryBuilder<T> {
  private filters: Array<(item: T) => boolean> = [];
  private sortKey?: keyof T;
  private sortOrder: 'asc' | 'desc' = 'asc';
  private limitCount?: number;
  private offsetCount = 0;

  where<K extends keyof T>(key: K, value: T[K]): this {
    this.filters.push(item => item[key] === value);
    return this;
  }

  whereIn<K extends keyof T>(key: K, values: T[K][]): this {
    this.filters.push(item => values.includes(item[key]));
    return this;
  }

  orderBy(key: keyof T, order: 'asc' | 'desc' = 'asc'): this {
    this.sortKey = key;
    this.sortOrder = order;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  offset(count: number): this {
    this.offsetCount = count;
    return this;
  }

  execute(items: T[]): T[] {
    let result = [...items];

    // Apply filters
    for (const filter of this.filters) {
      result = result.filter(filter);
    }

    // Apply sorting
    if (this.sortKey) {
      const key = this.sortKey;
      const order = this.sortOrder;
      result.sort((a, b) => {
        if (a[key] < b[key]) return order === 'asc' ? -1 : 1;
        if (a[key] > b[key]) return order === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    result = result.slice(this.offsetCount);
    if (this.limitCount) {
      result = result.slice(0, this.limitCount);
    }

    return result;
  }
}

// Usage
const query = new QueryBuilder<User>()
  .where('role', 'admin')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .offset(0);

const admins = query.execute(users);
```

### Factory Pattern

```typescript
// Payment processor factory
interface PaymentProcessor {
  processPayment(amount: number): Promise<PaymentResult>;
  refund(transactionId: string): Promise<RefundResult>;
}

interface PaymentConfig {
  type: 'stripe' | 'paypal' | 'razorpay';
  apiKey: string;
  environment: 'sandbox' | 'production';
}

class StripeProcessor implements PaymentProcessor {
  constructor(private config: Omit<PaymentConfig, 'type'>) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    // Stripe implementation
    return { success: true, transactionId: 'str_123' };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    return { success: true };
  }
}

class PayPalProcessor implements PaymentProcessor {
  constructor(private config: Omit<PaymentConfig, 'type'>) {}

  async processPayment(amount: number): Promise<PaymentResult> {
    // PayPal implementation
    return { success: true, transactionId: 'pp_123' };
  }

  async refund(transactionId: string): Promise<RefundResult> {
    return { success: true };
  }
}

class PaymentProcessorFactory {
  static create(config: PaymentConfig): PaymentProcessor {
    switch (config.type) {
      case 'stripe':
        return new StripeProcessor(config);
      case 'paypal':
        return new PayPalProcessor(config);
      case 'razorpay':
        return new RazorpayProcessor(config);
      default:
        const _exhaustive: never = config.type;
        throw new Error(`Unknown payment type: ${_exhaustive}`);
    }
  }
}

// Usage
const processor = PaymentProcessorFactory.create({
  type: 'stripe',
  apiKey: process.env.STRIPE_KEY!,
  environment: 'production'
});

const result = await processor.processPayment(9999);
```

## Common Anti-Patterns to Avoid

### 1. Avoid `any`

```typescript
// Bad
function processData(data: any) {
  return data.value; // No type safety
}

// Good
function processData<T extends { value: unknown }>(data: T): T['value'] {
  return data.value;
}

// Or use unknown with type guards
function processUnknown(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return String((data as { value: unknown }).value);
  }
  throw new Error('Invalid data');
}
```

### 2. Avoid Type Assertions

```typescript
// Bad - bypasses type checking
const user = response.data as User;

// Good - validate at runtime
const user = UserSchema.parse(response.data);

// Good - use type guards
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(response.data)) {
  // response.data is User here
}
```

### 3. Avoid Optional Chaining Abuse

```typescript
// Bad - hides potential issues
const email = user?.profile?.email?.toLowerCase();

// Good - be explicit about what can be undefined
interface User {
  profile: {
    email: string;  // Required
  };
}

// Or handle the undefined case explicitly
function getUserEmail(user: User | undefined): string | undefined {
  if (!user) return undefined;
  return user.profile.email.toLowerCase();
}
```

## Best Practices Summary

1. **Enable strict mode** - All strict options in tsconfig.json
2. **Prefer interfaces** - For object types that may be extended
3. **Use const assertions** - For literal types and immutability
4. **Discriminated unions** - For handling multiple related types
5. **Avoid any** - Use unknown with type guards instead
6. **Runtime validation** - Use Zod for external data
7. **Result types** - For explicit error handling
8. **Generic constraints** - Make functions type-safe and reusable

---

*Building type-safe applications? Connect on [LinkedIn](https://www.linkedin.com/in/tushar-agrawal-91b67a28a) to discuss TypeScript patterns and best practices.*

## Related Articles

- [REST API Design Best Practices](/blog/rest-api-design-best-practices) - Type-safe API design
- [Testing Strategies: Unit, Integration, E2E](/blog/testing-strategies-unit-integration-e2e-guide) - Test TypeScript code
- [Authentication & Authorization Guide](/blog/authentication-authorization-jwt-oauth-guide) - Type-safe auth
- [Python Asyncio Complete Guide](/blog/python-asyncio-complete-guide) - Compare with async TypeScript
