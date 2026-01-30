# QuantumAuth (QAuth)

**Next-generation authentication and authorization protocol designed to replace OAuth 2.0 and JWT with post-quantum cryptographic security.**

[![Rust](https://img.shields.io/badge/rust-1.70%2B-orange.svg)](https://www.rust-lang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Overview

QuantumAuth addresses ALL known vulnerabilities in OAuth 2.0 and JWT while providing:

- **Post-quantum cryptography** - ML-DSA-65 + Ed25519 dual signatures
- **Encrypted payloads** - XChaCha20-Poly1305 (not just Base64 encoding)
- **Mandatory proof of possession** - Tokens are bound to client keys
- **Built-in revocation** - No external systems needed
- **Fine-grained authorization** - Policy-based access control (RBAC/ABAC/ReBAC)

## Security Comparison

| Issue | OAuth 2.0 / JWT | QuantumAuth |
|-------|-----------------|-------------|
| Algorithm confusion | Vulnerable | Server-enforced algorithms |
| "None" algorithm | Possible | Not supported |
| Bearer token theft | Works anywhere | Proof of possession required |
| No built-in revocation | External RFC 7009 | Built-in with bloom filters |
| Scope explosion | Unmanageable | Policy references |
| Payload visibility | Base64 (visible) | Encrypted |
| Quantum attacks | RSA/ECDSA vulnerable | ML-DSA-65 + Ed25519 |

## Quick Start

### Rust

```rust
use qauth::{
    QAuthServer, QAuthClient, QTokenBuilder,
    IssuerSigningKeys, EncryptionKey, ProofGenerator,
};

// Server: Generate keys and create token
let signing_keys = IssuerSigningKeys::generate();
let encryption_key = EncryptionKey::generate();

let token = QTokenBuilder::access_token()
    .subject(b"user-123".to_vec())
    .issuer("https://auth.example.com")
    .audience("https://api.example.com")
    .policy_ref("urn:qauth:policy:default")
    .validity_seconds(3600)
    .build(&signing_keys, &encryption_key)?;

// Client: Create proof of possession
let (proof_generator, client_public_key) = ProofGenerator::generate();
let proof = proof_generator.create_proof("GET", "/api/resource", None, token.as_bytes());

// Include in API request:
// Authorization: QAuth <token>
// X-QAuth-Proof: <proof>
```

### TypeScript

```typescript
import { initQAuth, QAuthServer, QAuthClient } from '@quantumshield/qauth';

await initQAuth();

// Server
const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

const token = server.createToken({
  subject: 'user-123',
  policyRef: 'urn:qauth:policy:default',
  validitySeconds: 3600,
});

// Client
const client = new QAuthClient();
const proof = client.createProof('GET', '/api/resource', token);
```

### Python

```python
from qauth import QAuthServer, QAuthClient

# Server
server = QAuthServer(
    issuer="https://auth.example.com",
    audience="https://api.example.com"
)

token = server.create_token(
    subject="user-123",
    policy_ref="urn:qauth:policy:default",
    validity_seconds=3600,
)

# Client
client = QAuthClient()
proof = client.create_proof("GET", "/api/resource", token)
```

### Go

```go
import "github.com/tushar-agrawal/quantum-shield/qauth/sdks/go/qauth"

// Server
server, _ := qauth.NewServer(qauth.ServerConfig{
    Issuer:   "https://auth.example.com",
    Audience: "https://api.example.com",
})

token, _ := server.CreateToken(qauth.TokenOptions{
    Subject:         []byte("user-123"),
    PolicyRef:       "urn:qauth:policy:default",
    ValiditySeconds: 3600,
})

// Client
client := qauth.NewClient()
proof, _ := client.CreateProof("GET", "/api/resource", nil, token)
```

## Token Format (QToken)

```
QToken = Header (42 bytes) || EncryptedPayload || Signature (3373 bytes) || ProofBinding (96 bytes)

Header:
  - Version: 1 byte (0x01)
  - TokenType: 1 byte
  - KeyID: 32 bytes (SHA-256 of issuer public keys)
  - Timestamp: 8 bytes (Unix ms)

Signature (Dual):
  - Ed25519: 64 bytes
  - ML-DSA-65: 3309 bytes (post-quantum)

ProofBinding:
  - DeviceKey: 32 bytes
  - ClientKey: 32 bytes
  - IPHash: 32 bytes
```

## Authorization Flow

```
┌──────────┐                                    ┌─────────────┐
│  Client  │                                    │ QAuth Server│
└────┬─────┘                                    └──────┬──────┘
     │ 1. Generate ephemeral keypair                   │
     │                                                 │
     │ 2. Authorization Request ─────────────────────► │
     │    • client_id, redirect_uri                    │
     │    • code_challenge (PKCE mandatory)            │
     │    • client_public_key                          │
     │                                                 │
     │                         User Authenticates      │
     │                                                 │
     │ 3. Authorization Response ◄─────────────────── │
     │    • code (encrypted, bound to client key)      │
     │                                                 │
     │ 4. Token Request ─────────────────────────────► │
     │    • code, code_verifier                        │
     │    • proof_of_possession                        │
     │                                                 │
     │ 5. Token Response ◄───────────────────────────  │
     │    • access_token (QToken)                      │
     │    • refresh_token (QToken)                     │
```

## Policy-Based Authorization

Replace scope explosion with fine-grained policies:

```json
{
  "id": "urn:qauth:policy:api-access",
  "version": "2026-01-30",
  "issuer": "https://auth.example.com",
  "rules": [
    {
      "effect": "allow",
      "resources": ["projects/*"],
      "actions": ["read", "list"],
      "conditions": {
        "time": {
          "after": "09:00",
          "before": "18:00",
          "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
        },
        "mfa": {
          "required": true,
          "methods": ["totp", "webauthn"]
        }
      }
    }
  ]
}
```

## Project Structure

```
qauth/
├── spec/                    # RFC-style specifications
│   ├── QAUTH-CORE.md        # Core protocol
│   ├── QTOKEN-FORMAT.md     # Token format
│   └── QAUTH-POLICY.md      # Policy language
│
├── rust/                    # Reference implementation
│   └── src/
│       ├── lib.rs           # Main entry
│       ├── token.rs         # QToken implementation
│       ├── crypto.rs        # Dual signatures, encryption
│       ├── proof.rs         # Proof of possession
│       ├── revocation.rs    # Revocation system
│       ├── policy.rs        # Policy engine
│       └── wasm.rs          # WASM bindings
│
└── sdks/                    # Language SDKs
    ├── typescript/          # npm: @quantumshield/qauth
    ├── python/              # PyPI: qauth
    └── go/                  # Go module
```

## Specifications

- [QAUTH-CORE.md](spec/QAUTH-CORE.md) - Core protocol specification
- [QTOKEN-FORMAT.md](spec/QTOKEN-FORMAT.md) - Token format specification
- [QAUTH-POLICY.md](spec/QAUTH-POLICY.md) - Policy language specification

## Security Considerations

### Cryptographic Algorithms

| Component | Algorithm | Purpose |
|-----------|-----------|---------|
| Classical Signature | Ed25519 | Immediate security |
| Post-Quantum Signature | ML-DSA-65 (FIPS 204) | Future quantum resistance |
| Encryption | XChaCha20-Poly1305 | Payload confidentiality |
| Key Exchange | X25519 + ML-KEM-768 | Session key establishment |
| Hashing | SHA-256, SHA3-256 | Key derivation, binding |

### Attack Mitigations

- **Algorithm confusion**: Not possible - algorithms are server-enforced
- **Signature bypass**: Dual signatures - both must verify
- **Token replay**: Proof of possession with timestamp and nonce
- **Token theft**: Bound to client key - useless without private key
- **Payload inspection**: Encrypted with AEAD
- **Harvest now, decrypt later**: ML-DSA-65 is quantum-resistant

## Development

### Building

```bash
# Build Rust library
cd qauth/rust
cargo build --release

# Run tests
cargo test

# Build with WASM support (when pqcrypto supports it)
cargo build --features wasm
```

### Testing

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_complete_auth_flow

# Run with output
cargo test -- --nocapture
```

## Contributing

Contributions are welcome! Please read the specifications first, then:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Authors

- Tushar Agrawal - [tusharagrawal.in](https://tusharagrawal.in)

## References

- [NIST FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) - ML-KEM
- [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) - ML-DSA
- [RFC 6749](https://tools.ietf.org/html/rfc6749) - OAuth 2.0
- [RFC 7519](https://tools.ietf.org/html/rfc7519) - JWT
- [RFC 9449](https://tools.ietf.org/html/rfc9449) - OAuth 2.0 DPoP
