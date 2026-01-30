# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release preparation
- CI/CD pipeline with GitHub Actions
- Security policy and vulnerability reporting process
- Issue and PR templates

## [0.1.0] - 2026-01-30

### Added

#### Core Features
- **Dual Signature System**: Ed25519 (64 bytes) + ML-DSA-65 (3309 bytes)
- **Encrypted Payloads**: XChaCha20-Poly1305 AEAD encryption for token payloads
- **Proof of Possession**: Mandatory request signing with timestamp, nonce, method, URI, body hash
- **Built-in Revocation**: Bloom filter-based revocation with 5-minute propagation
- **Policy Engine**: Fine-grained RBAC/ABAC/ReBAC with conditions (time, IP, MFA, custom)

#### Token Format (QToken)
- Fixed header structure (42 bytes): version, token type, key ID, timestamp
- CBOR-encoded encrypted payload
- Dual signature (3373 bytes total)
- Proof binding (96 bytes): device key, client key, IP hash

#### Rust Implementation
- Core library with full QToken support
- CLI tool (`qauth` binary) for key generation, token creation/validation
- Comprehensive test suite (36 tests)
- Benchmarks for performance testing
- WASM bindings (pending pqcrypto WASM support)

#### SDKs
- **TypeScript/JavaScript**: Full API with type definitions
- **Python**: Complete implementation with 25 tests
- **Go**: Full implementation with 28 tests

#### Documentation
- RFC-style specifications:
  - QAUTH-CORE.md: Core protocol specification
  - QTOKEN-FORMAT.md: Token format specification
  - QAUTH-POLICY.md: Policy language specification
- Integration guide with Express, FastAPI, Axum examples
- Contributing guidelines
- Security policy

### Security
- Server-enforced cryptographic algorithms (no client selection)
- Constant-time signature verification
- Memory zeroization for sensitive data
- Replay protection with timestamps and nonces

### Performance
- Token creation: ~1.3ms (single thread)
- Token validation: ~473µs (single thread)
- Proof generation: ~48µs
- Proof verification: ~52µs

## Comparison with Alternatives

| Feature | QAuth 0.1.0 | OAuth 2.0 | JWT |
|---------|-------------|-----------|-----|
| Post-quantum signatures | Yes (ML-DSA-65) | No | No |
| Encrypted payloads | Yes | N/A | No |
| Proof of possession | Mandatory | Optional (DPoP) | No |
| Built-in revocation | Yes | No | No |
| Algorithm confusion | Impossible | N/A | Vulnerable |

---

[Unreleased]: https://github.com/Tushar010402/quantum-shield/compare/qauth-v0.1.0...HEAD
[0.1.0]: https://github.com/Tushar010402/quantum-shield/releases/tag/qauth-v0.1.0
