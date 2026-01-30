# QAuth - Post-Quantum Authentication

Next-generation authentication and authorization protocol designed to replace OAuth 2.0 and JWT.

## Why QAuth?

| Problem with JWT/OAuth | QAuth Solution |
|------------------------|----------------|
| Algorithm confusion attacks | Server-enforced, no client selection |
| Bearer tokens can be stolen | Proof-of-possession mandatory |
| No built-in revocation | Instant revocation system |
| Payload visible (base64) | Encrypted with XChaCha20-Poly1305 |
| Single signature | Dual: Ed25519 + ML-DSA-65 |
| No post-quantum security | ML-DSA-65 (NIST FIPS 204) |

## Installation

```toml
[dependencies]
qauth = "0.1"
```

## Quick Start

```rust
use qauth::{Server, Client, PolicyEngine};

// Create a QAuth server
let server = Server::new(ServerConfig {
    issuer: "https://auth.example.com".into(),
    audience: "https://api.example.com".into(),
})?;

// Create a token
let token = server.create_token(TokenOptions {
    subject: b"user-123".to_vec(),
    policy_ref: "urn:qauth:policy:default".into(),
    validity_seconds: 3600,
    claims: Default::default(),
})?;

// Validate a token
let payload = server.validate_token(&token)?;
```

## Features

- **Dual Signatures** - Ed25519 (64 bytes) + ML-DSA-65 (3309 bytes)
- **Encrypted Payloads** - XChaCha20-Poly1305
- **Proof of Possession** - Request-bound proofs
- **Built-in Revocation** - Bloom filter-based
- **Policy Engine** - RBAC/ABAC/ReBAC support

## SDKs

- **Rust**: `cargo add qauth`
- **Python**: `pip install qauth`
- **TypeScript**: `npm install @qauth/sdk`
- **Go**: `go get github.com/tushar-agrawal/qauth`

## License

MIT License

## Author

Tushar Agrawal - [tusharagrawal.in](https://tusharagrawal.in)
