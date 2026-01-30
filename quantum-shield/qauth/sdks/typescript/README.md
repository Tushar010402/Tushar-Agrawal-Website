# @quantumshield/qauth

TypeScript/JavaScript SDK for QuantumAuth - next-generation authentication with post-quantum security.

## Installation

```bash
npm install @quantumshield/qauth
# or
yarn add @quantumshield/qauth
# or
pnpm add @quantumshield/qauth
```

## Quick Start

```typescript
import {
  initQAuth,
  QAuthServer,
  QAuthClient,
  PolicyEngine,
} from '@quantumshield/qauth';

// Initialize the WASM module (required before any operations)
await initQAuth();

// Create a server instance
const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// Create an access token
const token = server.createToken({
  subject: 'user-123',
  policyRef: 'urn:qauth:policy:default',
  validitySeconds: 3600,
  claims: {
    email: 'user@example.com',
    roles: ['user', 'premium'],
  },
});

// Validate a token
const payload = server.validateToken(token);
console.log('Subject:', payload.sub);
console.log('Expires:', new Date(payload.exp * 1000));
```

## Client-Side Usage

```typescript
import { initQAuth, QAuthClient } from '@quantumshield/qauth';

await initQAuth();

// Create a client instance (generates a new keypair)
const client = new QAuthClient();

// Get the client's public key (send to server during auth)
const publicKey = client.getPublicKey();

// Create proof of possession for API requests
const proof = client.createProof('GET', '/api/resource', token);

// Make API request with token and proof
const response = await fetch('/api/resource', {
  headers: {
    'Authorization': `QAuth ${token}`,
    'X-QAuth-Proof': proof,
  },
});
```

## Server-Side Validation

```typescript
import {
  initQAuth,
  QAuthValidator,
  ProofValidator,
  type IssuerKeys,
} from '@quantumshield/qauth';

await initQAuth();

// Create a validator with pre-shared issuer keys
const validator = new QAuthValidator(issuerKeys, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// Validate token
try {
  const payload = validator.validate(token);
  console.log('Token valid for user:', payload.sub);
} catch (error) {
  console.error('Token validation failed:', error);
}

// Validate proof of possession
const proofValidator = new ProofValidator(clientPublicKey);
try {
  proofValidator.validate(proof, 'GET', '/api/resource', token);
  console.log('Proof valid');
} catch (error) {
  console.error('Proof validation failed:', error);
}
```

## Policy-Based Authorization

```typescript
import { initQAuth, PolicyEngine } from '@quantumshield/qauth';

await initQAuth();

const engine = new PolicyEngine();

// Load a policy
engine.loadPolicy({
  id: 'urn:qauth:policy:api-access',
  version: '2026-01-30',
  issuer: 'https://auth.example.com',
  rules: [
    {
      id: 'read-projects',
      effect: 'allow',
      resources: ['projects/*'],
      actions: ['read', 'list'],
    },
    {
      id: 'admin-only',
      effect: 'allow',
      resources: ['admin/**'],
      actions: ['*'],
      conditions: {
        custom: {
          role: { in: ['admin'] },
        },
      },
    },
  ],
});

// Evaluate authorization
const result = engine.evaluate('urn:qauth:policy:api-access', {
  subject: {
    id: 'user-123',
    attributes: { role: 'user' },
  },
  resource: {
    path: 'projects/456',
  },
  request: {
    action: 'read',
  },
});

if (result.effect === 'allow') {
  console.log('Access granted');
} else {
  console.log('Access denied:', result.reason);
}
```

## API Reference

### `initQAuth()`

Initialize the QAuth WASM module. Must be called before using any other functions.

### `QAuthServer`

Server-side class for token creation and validation.

```typescript
const server = new QAuthServer(config: QAuthConfig);

// Get public keys for sharing with validators
const keys = server.getPublicKeys(): IssuerKeys;

// Create a token
const token = server.createToken(options: TokenOptions): string;

// Validate a token
const payload = server.validateToken(token: string): TokenPayload;
```

### `QAuthClient`

Client-side class for proof of possession.

```typescript
const client = new QAuthClient();

// Get client's public key
const publicKey = client.getPublicKey(): Uint8Array;

// Create proof for API request
const proof = client.createProof(
  method: string,
  uri: string,
  token: string,
  body?: Uint8Array | string
): string;
```

### `QAuthValidator`

Validate tokens with pre-shared issuer keys.

```typescript
const validator = new QAuthValidator(keys: IssuerKeys, config: QAuthConfig);

// Validate a token
const payload = validator.validate(token: string): TokenPayload;
```

### `ProofValidator`

Validate proofs of possession.

```typescript
const validator = new ProofValidator(clientPublicKey: Uint8Array);

// Validate a proof
const isValid = validator.validate(
  proof: string,
  method: string,
  uri: string,
  token: string,
  body?: Uint8Array | string
): boolean;
```

### `PolicyEngine`

Evaluate authorization policies.

```typescript
const engine = new PolicyEngine();

// Load a policy
engine.loadPolicy(policy: Policy): void;

// Evaluate authorization
const result = engine.evaluate(
  policyId: string,
  context: EvaluationContext
): EvaluationResult;
```

## Types

```typescript
interface QAuthConfig {
  issuer: string;
  audience: string;
}

interface TokenOptions {
  subject: string | Uint8Array;
  audience?: string | string[];
  policyRef: string;
  validitySeconds?: number;
  clientKey?: Uint8Array;
  deviceKey?: Uint8Array;
  claims?: Record<string, unknown>;
}

interface TokenPayload {
  sub: string;
  iss: string;
  aud: string[];
  exp: number;
  iat: number;
  nbf: number;
  jti: string;
  rid: string;
  pol: string;
  cst: Record<string, unknown>;
}

interface EvaluationResult {
  effect: 'allow' | 'deny';
  matched_rule: string | null;
  reason: string;
}
```

## Browser Support

This package uses WebAssembly and requires a modern browser with WASM support:

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## Node.js Support

Node.js 18+ with WASM support.

## License

MIT
