# QuantumShield

Post-quantum cryptographic library implementing NIST FIPS 203/204/205 standards.

## Features

- **ML-KEM-768** - Post-quantum key encapsulation (FIPS 203)
- **ML-DSA-65** - Post-quantum digital signatures (FIPS 204)
- **SLH-DSA** - Stateless hash-based signatures (FIPS 205)
- **Hybrid Encryption** - X25519 + ML-KEM for quantum resistance
- **Dual Signatures** - Ed25519 + ML-DSA for defense in depth

## Installation

```toml
[dependencies]
quantum-shield = "0.1"
```

## Quick Start

```rust
use quantum_shield::{KeyPair, encrypt, decrypt};

// Generate a post-quantum key pair
let keypair = KeyPair::generate()?;

// Encrypt a message
let ciphertext = encrypt(&keypair.public_key, b"Secret message")?;

// Decrypt the message
let plaintext = decrypt(&keypair.secret_key, &ciphertext)?;
```

## Security

This library implements NIST-approved post-quantum algorithms designed to resist attacks from both classical and quantum computers.

**Algorithms:**
| Algorithm | Type | Security Level |
|-----------|------|----------------|
| ML-KEM-768 | Key Encapsulation | NIST Level 3 |
| ML-DSA-65 | Digital Signature | NIST Level 3 |
| SLH-DSA-SHA2-128s | Hash-based Signature | NIST Level 1 |

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

Tushar Agrawal - [tusharagrawal.in](https://tusharagrawal.in)
