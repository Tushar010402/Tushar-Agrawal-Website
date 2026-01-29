# QuantumShield

A quantum-secure cryptographic library implementing hybrid post-quantum encryption with defense-in-depth.

## Features

- **QShieldKEM**: Hybrid key encapsulation (X25519 + ML-KEM-768)
- **QShieldSign**: Dual digital signatures (ML-DSA-65 + SLH-DSA-SHA2-128s)
- **QuantumShield**: Cascading symmetric encryption (AES-256-GCM + ChaCha20-Poly1305)
- **QShieldKDF**: Quantum-resistant key derivation (HKDF-SHA3-512 + Argon2id)
- **QShieldHandshake**: Authenticated key exchange protocol
- **MessageChannel**: Secure messaging with replay protection

## Security Model

QuantumShield uses a defense-in-depth approach:

1. **Classical Security**: X25519 ECDH, AES-256-GCM, ChaCha20-Poly1305
2. **Post-Quantum Security**: ML-KEM-768 (lattice-based KEM)
3. **Hash-Based Security**: SLH-DSA (stateless hash-based signatures)

If any single algorithm is broken, the others still protect your data.

## Installation

### Rust

Add to your `Cargo.toml`:

```toml
[dependencies]
quantum-shield = "0.1"
```

### From Source

```bash
cd quantum-shield/rust
cargo build --release
```

## Quick Start

### Key Exchange

```rust
use quantum_shield::{QShieldKEM, QuantumShield};

// Generate key pairs
let (alice_pk, alice_sk) = QShieldKEM::generate_keypair()?;
let (bob_pk, bob_sk) = QShieldKEM::generate_keypair()?;

// Alice encapsulates to Bob
let (ciphertext, alice_secret) = QShieldKEM::encapsulate(&bob_pk)?;

// Bob decapsulates
let bob_secret = QShieldKEM::decapsulate(&bob_sk, &ciphertext)?;

// Both have the same shared secret
assert_eq!(alice_secret.as_bytes(), bob_secret.as_bytes());

// Use for encryption
let cipher = QuantumShield::new(alice_secret.as_bytes())?;
let encrypted = cipher.encrypt(b"Hello, quantum world!")?;
let decrypted = cipher.decrypt(&encrypted)?;
```

### Digital Signatures

```rust
use quantum_shield::QShieldSign;

// Generate signing keys
let (public_key, secret_key) = QShieldSign::generate_keypair()?;

// Sign a message
let message = b"Important document";
let signature = QShieldSign::sign(&secret_key, message)?;

// Verify (both ML-DSA and SLH-DSA must verify)
let valid = QShieldSign::verify(&public_key, message, &signature)?;
assert!(valid);
```

### Password-Based Encryption

```rust
use quantum_shield::{QShieldKDF, QuantumShield};

let kdf = QShieldKDF::new();

// Generate a random salt
let salt = kdf.generate_salt(32)?;

// Derive key from password
let key = kdf.derive_from_password(b"my secure password", &salt, 64)?;

// Encrypt
let cipher = QuantumShield::new(key.as_bytes())?;
let encrypted = cipher.encrypt(b"Secret data")?;
```

### Handshake Protocol

```rust
use quantum_shield::{QShieldSign, QShieldHandshake};

// Generate long-term signing keys
let (client_pk, client_sk) = QShieldSign::generate_keypair()?;
let (server_pk, server_sk) = QShieldSign::generate_keypair()?;

// Client initiates
let mut client = QShieldHandshake::new_client(client_sk, client_pk)?;
let client_hello = client.client_hello()?;

// Server responds
let mut server = QShieldHandshake::new_server(server_sk, server_pk);
let server_hello = server.server_hello(&client_hello)?;

// Complete handshake...
let client_finished = client.process_server_hello(&server_hello)?;
let server_finished = server.process_client_finished(&client_finished)?;
let client_session = client.process_server_finished(&server_finished)?;
let server_session = server.complete_server()?;

// Both sides now have an encrypted channel
let encrypted = client_session.cipher.encrypt(b"Secure message")?;
let decrypted = server_session.cipher.decrypt(&encrypted)?;
```

## Algorithm Details

| Component | Base Algorithms | Key Size | Ciphertext/Signature |
|-----------|----------------|----------|---------------------|
| QShieldKEM | X25519 + ML-KEM-768 | ~1,248 B | ~1,152 B |
| QShieldSign | ML-DSA-65 + SLH-DSA | ~2,016 B | ~11,181 B |
| QuantumShield | AES-256-GCM + ChaCha20 | 64 B | +56 B overhead |

## Project Structure

```
quantum-shield/
├── rust/                 # Core Rust implementation
│   ├── src/
│   │   ├── kem/         # Key encapsulation
│   │   ├── sign/        # Digital signatures
│   │   ├── symmetric/   # Symmetric encryption
│   │   ├── kdf/         # Key derivation
│   │   ├── protocol/    # Handshake & messages
│   │   └── utils/       # RNG, serialization
│   └── tests/
├── wasm/                # WebAssembly bindings
├── python/              # Python bindings (PyO3)
├── examples/            # Usage examples
└── docs/                # Documentation
    ├── SPECIFICATION.md
    ├── API.md
    └── SECURITY.md
```

## Building

### Rust Library

```bash
cd rust
cargo build --release
cargo test
```

### WebAssembly

```bash
cd wasm
wasm-pack build --target web
```

### Python Bindings

```bash
cd python
maturin develop
```

## Documentation

- [Technical Specification](docs/SPECIFICATION.md)
- [API Reference](docs/API.md)
- [Security Considerations](docs/SECURITY.md)

## Standards

QuantumShield implements NIST-standardized algorithms:

- **FIPS 203**: ML-KEM (Module-Lattice-Based Key-Encapsulation Mechanism)
- **FIPS 204**: ML-DSA (Module-Lattice-Based Digital Signature Algorithm)
- **FIPS 205**: SLH-DSA (Stateless Hash-Based Digital Signature Algorithm)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read the security considerations in [SECURITY.md](docs/SECURITY.md) before contributing cryptographic code.

## Disclaimer

This is an experimental implementation for educational purposes. While it uses NIST-standardized algorithms, it has not undergone formal security audits. Use in production at your own risk.
