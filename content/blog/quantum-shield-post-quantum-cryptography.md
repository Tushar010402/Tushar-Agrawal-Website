---
title: "QuantumShield: Building a Post-Quantum Cryptography Library from Scratch"
description: "Deep dive into implementing hybrid post-quantum encryption using NIST FIPS 203/204/205 standards with defense-in-depth architecture. Learn about ML-KEM, ML-DSA, SLH-DSA, and cascading encryption."
date: "2026-01-29"
author: "Tushar Agrawal"
tags: ["Post-Quantum Cryptography", "Rust", "ML-KEM", "ML-DSA", "Security", "Encryption", "NIST FIPS", "Cryptography"]
image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop"
published: true
---

## Introduction: The Quantum Threat is Real

In 2024, NIST finalized three post-quantum cryptographic standards: FIPS 203 (ML-KEM), FIPS 204 (ML-DSA), and FIPS 205 (SLH-DSA). This wasn't academic exercise—it was an urgent response to a concrete threat: quantum computers capable of breaking RSA and elliptic curve cryptography are expected within the next decade.

The "harvest now, decrypt later" attack is already happening. Nation-state actors collect encrypted data today, storing it until quantum computers can break current encryption. If your data needs to remain confidential for 10+ years, you need post-quantum cryptography **today**.

This is why I built **QuantumShield**—an open-source post-quantum cryptography library implementing defense-in-depth architecture with NIST-approved algorithms.

## The NIST Post-Quantum Standards

### FIPS 203: ML-KEM (Module-Lattice Key Encapsulation Mechanism)

ML-KEM (formerly CRYSTALS-Kyber) is a key encapsulation mechanism based on the hardness of the Module Learning With Errors (MLWE) problem. Key properties:

- **Security levels**: ML-KEM-512 (128-bit), ML-KEM-768 (192-bit), ML-KEM-1024 (256-bit)
- **Performance**: Fast key generation, encapsulation, and decapsulation
- **Key sizes**: Public keys ~1KB, ciphertexts ~1KB

QuantumShield uses ML-KEM-768 for a balance of security and performance.

### FIPS 204: ML-DSA (Module-Lattice Digital Signature Algorithm)

ML-DSA (formerly CRYSTALS-Dilithium) provides digital signatures based on lattice problems:

- **Security levels**: ML-DSA-44 (128-bit), ML-DSA-65 (192-bit), ML-DSA-87 (256-bit)
- **Signature size**: ~2.4KB for ML-DSA-65
- **Fast verification**: Important for high-throughput systems

### FIPS 205: SLH-DSA (Stateless Hash-Based Digital Signature Algorithm)

SLH-DSA (formerly SPHINCS+) offers an alternative based purely on hash functions:

- **Conservative choice**: Security relies only on hash function properties
- **Larger signatures**: ~8KB for SHAKE-128f variant
- **Cryptographic diversity**: Different mathematical foundation than lattice-based schemes

## QuantumShield Architecture

QuantumShield doesn't just implement these algorithms—it layers them for **defense-in-depth**. Even if one algorithm is compromised, your data remains secure.

### Layer 1: Hybrid Key Encapsulation (QShieldKEM)

```rust
pub struct QShieldKEM {
    x25519_keypair: X25519KeyPair,
    mlkem_keypair: MlKem768KeyPair,
}

impl QShieldKEM {
    pub fn generate_keypair() -> Result<(PublicKey, SecretKey), Error> {
        // Generate both X25519 and ML-KEM-768 key pairs
        let x25519 = X25519KeyPair::generate()?;
        let mlkem = MlKem768::keypair()?;

        // Combine public keys
        let public_key = PublicKey::combine(&x25519.public, &mlkem.public);
        let secret_key = SecretKey::combine(&x25519.secret, &mlkem.secret);

        Ok((public_key, secret_key))
    }

    pub fn encapsulate(public_key: &PublicKey) -> Result<(Ciphertext, SharedSecret), Error> {
        // Encapsulate with both algorithms
        let (x25519_ct, x25519_ss) = x25519_encapsulate(&public_key.x25519)?;
        let (mlkem_ct, mlkem_ss) = mlkem768_encapsulate(&public_key.mlkem)?;

        // Combine shared secrets with HKDF
        let combined_secret = hkdf_sha3_512(
            &[x25519_ss.as_bytes(), mlkem_ss.as_bytes()].concat(),
            b"QShieldKEM-v1-shared-secret",
        )?;

        Ok((Ciphertext::combine(x25519_ct, mlkem_ct), combined_secret))
    }
}
```

**Why hybrid?** X25519 is battle-tested and widely deployed. ML-KEM-768 provides quantum resistance. By combining both:

- If X25519 is broken by quantum computers, ML-KEM protects you
- If ML-KEM has an undiscovered vulnerability, X25519 protects you
- An attacker must break **both** to compromise the key exchange

### Layer 2: Dual Signatures (QShieldSign)

```rust
pub struct QShieldSign {
    mldsa_keypair: MlDsa65KeyPair,
    slhdsa_keypair: SlhDsaShake128fKeyPair,
}

impl QShieldSign {
    pub fn sign(message: &[u8], secret_key: &SecretKey) -> Result<Signature, Error> {
        // Sign with both algorithms
        let mldsa_sig = mldsa65_sign(message, &secret_key.mldsa)?;
        let slhdsa_sig = slhdsa_sign(message, &secret_key.slhdsa)?;

        // Combine signatures
        Ok(Signature::combine(mldsa_sig, slhdsa_sig))
    }

    pub fn verify(message: &[u8], signature: &Signature, public_key: &PublicKey) -> Result<bool, Error> {
        // Both signatures must verify
        let mldsa_valid = mldsa65_verify(message, &signature.mldsa, &public_key.mldsa)?;
        let slhdsa_valid = slhdsa_verify(message, &signature.slhdsa, &public_key.slhdsa)?;

        Ok(mldsa_valid && slhdsa_valid)
    }
}
```

**Why dual signatures?** ML-DSA and SLH-DSA use fundamentally different mathematics:

- **ML-DSA**: Based on lattice problems (MLWE)
- **SLH-DSA**: Based purely on hash functions

If a breakthrough breaks lattice cryptography, hash-based signatures remain secure (and vice versa).

### Layer 3: Cascading Encryption (QuantumShield)

```rust
pub struct QuantumShield {
    aes_key: Aes256GcmKey,
    chacha_key: ChaCha20Poly1305Key,
}

impl QuantumShield {
    pub fn new(shared_secret: &SharedSecret) -> Result<Self, Error> {
        // Derive separate keys for each cipher using HKDF with domain separation
        let aes_key = hkdf_sha3_512(
            shared_secret.as_bytes(),
            b"QShield-AES-256-GCM-key",
        )?;
        let chacha_key = hkdf_sha3_512(
            shared_secret.as_bytes(),
            b"QShield-ChaCha20-Poly1305-key",
        )?;

        Ok(Self { aes_key, chacha_key })
    }

    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Ciphertext, Error> {
        // First layer: AES-256-GCM
        let aes_nonce = generate_nonce()?;
        let aes_ciphertext = aes_256_gcm_encrypt(plaintext, &self.aes_key, &aes_nonce)?;

        // Second layer: ChaCha20-Poly1305
        let chacha_nonce = generate_nonce()?;
        let cascaded = chacha20_poly1305_encrypt(&aes_ciphertext, &self.chacha_key, &chacha_nonce)?;

        Ok(Ciphertext::new(aes_nonce, chacha_nonce, cascaded))
    }

    pub fn decrypt(&self, ciphertext: &Ciphertext) -> Result<Vec<u8>, Error> {
        // Reverse order: first ChaCha20, then AES
        let aes_ciphertext = chacha20_poly1305_decrypt(
            &ciphertext.data,
            &self.chacha_key,
            &ciphertext.chacha_nonce,
        )?;

        let plaintext = aes_256_gcm_decrypt(
            &aes_ciphertext,
            &self.aes_key,
            &ciphertext.aes_nonce,
        )?;

        Ok(plaintext)
    }
}
```

**Why cascading encryption?**

- **AES-256-GCM**: NIST-approved, hardware-accelerated, widely analyzed
- **ChaCha20-Poly1305**: IETF standard, excellent software performance, different design

An attacker must break both ciphers to decrypt your data. This protects against:

1. Cryptanalytic breakthroughs in either cipher
2. Implementation vulnerabilities in either library
3. Side-channel attacks that might affect one but not both

## Security Properties

### Constant-Time Operations

All cryptographic operations in QuantumShield are implemented in constant time to prevent timing side-channel attacks:

```rust
// BAD: Variable-time comparison
fn insecure_compare(a: &[u8], b: &[u8]) -> bool {
    a == b  // Short-circuits on first difference
}

// GOOD: Constant-time comparison
fn secure_compare(a: &[u8], b: &[u8]) -> bool {
    use subtle::ConstantTimeEq;
    a.ct_eq(b).into()  // Always examines all bytes
}
```

### Automatic Memory Zeroization

Secrets are automatically scrubbed from memory when no longer needed:

```rust
use zeroize::{Zeroize, ZeroizeOnDrop};

#[derive(Zeroize, ZeroizeOnDrop)]
pub struct SecretKey {
    x25519: [u8; 32],
    mlkem: [u8; 2400],
}

// When SecretKey goes out of scope, memory is automatically zeroed
```

### Domain-Separated Key Derivation

Every derived key uses a unique domain separator to prevent key confusion attacks:

```rust
let encryption_key = hkdf_sha3_512(master_secret, b"QShield-v1-encryption");
let mac_key = hkdf_sha3_512(master_secret, b"QShield-v1-authentication");
let signing_key = hkdf_sha3_512(master_secret, b"QShield-v1-signature");
```

### Perfect Forward Secrecy

QuantumShield generates ephemeral keys for each session. If long-term keys are compromised, past communications remain secure:

```rust
pub struct Session {
    ephemeral_keypair: QShieldKEM,
    session_key: SharedSecret,
}

impl Session {
    pub fn new(peer_public_key: &PublicKey) -> Result<Self, Error> {
        // Generate fresh ephemeral keypair for this session
        let (ephemeral_public, ephemeral_secret) = QShieldKEM::generate_keypair()?;

        // Derive session key using both parties' ephemeral keys
        let (_, session_key) = QShieldKEM::encapsulate(peer_public_key)?;

        Ok(Self {
            ephemeral_keypair: (ephemeral_public, ephemeral_secret),
            session_key,
        })
    }
}
```

## Performance Considerations

Post-quantum algorithms have larger keys and signatures than classical cryptography. Here's how QuantumShield's sizes compare:

| Component | Classical | QuantumShield | Overhead |
|-----------|-----------|---------------|----------|
| Public Key | ~32 bytes (X25519) | ~1.2 KB | ~37x |
| Secret Key | ~32 bytes | ~2.5 KB | ~78x |
| Ciphertext | ~32 bytes | ~1.1 KB | ~34x |
| Signature | ~64 bytes (Ed25519) | ~10.5 KB | ~164x |

**Performance tradeoffs:**

- Key generation: ~10x slower than classical
- Encryption/Decryption: ~2x slower due to cascading
- Signature creation: ~5x slower
- Signature verification: ~3x slower

For most applications, these overheads are acceptable. Network latency typically dominates over cryptographic operations.

## Use Cases

### Healthcare (HIPAA)

Protected Health Information (PHI) must remain confidential for decades. A 30-year-old patient's records from 2026 might still be relevant in 2076. QuantumShield ensures that data encrypted today cannot be decrypted by quantum computers in the future.

### Financial Services

Transaction records, account data, and trading algorithms require long-term confidentiality. Regulatory requirements often mandate data retention for 7+ years—well within the quantum threat window.

### Government & Defense

Classified information often remains sensitive for 25-75 years. The "harvest now, decrypt later" threat is particularly acute for national security applications.

### Long-term Archives

Legal documents, intellectual property, research data, and personal records that must remain confidential for 50+ years need quantum-safe encryption from day one.

## Honest Assessment: What QuantumShield Is (and Isn't)

Transparency is essential in cryptography. Let me be upfront about QuantumShield's current state:

### What It Does Well

1. **Real NIST algorithms**: The hybrid KEM uses ML-KEM-768 from the `fips203` crate—a pure Rust implementation of FIPS 203. This isn't a toy implementation; it's the actual standardized algorithm.

2. **Battle-tested primitives**: The underlying cryptographic primitives (AES-GCM, ChaCha20-Poly1305, X25519, Argon2id) come from well-audited Rust crates maintained by the RustCrypto team.

3. **Defense-in-depth architecture**: The hybrid approach (combining classical + post-quantum) follows NIST's own recommendations for migration strategies.

4. **Memory safety**: Rust's ownership model and automatic zeroization provide real security benefits that are hard to achieve in C/C++.

### Important Caveats

1. **Not professionally audited**: This is a personal project. While the underlying algorithm implementations are from reputable sources, the *integration* hasn't been reviewed by professional cryptographers.

2. **Large signature sizes**: The dual signature system (ML-DSA-65 + SLH-DSA-SHAKE-128f) produces ~20KB signatures. This is a tradeoff for defense-in-depth security.

3. **Not production-ready**: For systems protecting sensitive data in production, use established libraries like [liboqs](https://github.com/open-quantum-safe/liboqs) from Open Quantum Safe, or wait for major libraries like OpenSSL/BoringSSL to integrate PQC.

4. **Algorithm composition is new**: While individual algorithms are NIST-approved, combining them in novel ways creates new attack surfaces that haven't been formally analyzed.

5. **Performance vs. security tradeoffs**: The cascading encryption approach adds overhead. For most applications, a single well-implemented cipher is sufficient.

### When to Use QuantumShield

- **Learning**: Excellent for understanding how PQC works in practice
- **Prototyping**: Testing PQC integration in non-critical systems
- **Research**: Exploring hybrid cryptography approaches
- **Personal projects**: Where you understand and accept the risks

### When NOT to Use QuantumShield

- **Production systems** handling sensitive user data
- **Healthcare/financial** applications with regulatory requirements
- **Any system** where cryptographic failure has serious consequences

The goal of this project is to demonstrate that post-quantum cryptography is accessible and practical—not to replace battle-hardened production libraries. Consider it a learning tool and a proof-of-concept, not a drop-in security solution.

## Getting Started

QuantumShield is open source and MIT licensed. To explore the implementation:

```rust
use quantum_shield::{QShieldKEM, QuantumShield};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Generate quantum-secure key pair
    let (public_key, secret_key) = QShieldKEM::generate_keypair()?;

    // Sender: encapsulate shared secret
    let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&public_key)?;

    // Create cascading cipher
    let cipher = QuantumShield::new(&shared_secret)?;

    // Encrypt sensitive data
    let plaintext = b"Quantum-secure message";
    let encrypted = cipher.encrypt(plaintext)?;

    // Receiver: decapsulate shared secret
    let receiver_secret = QShieldKEM::decapsulate(&ciphertext, &secret_key)?;
    let receiver_cipher = QuantumShield::new(&receiver_secret)?;

    // Decrypt
    let decrypted = receiver_cipher.decrypt(&encrypted)?;
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());

    Ok(())
}
```

## Roadmap

QuantumShield is actively developed. Upcoming features:

1. **Python SDK** - Native bindings for Python applications
2. **WebAssembly build** - Browser and Node.js support
3. **Node.js SDK** - Native addon for JavaScript/TypeScript
4. **Go bindings** - For backend services
5. **Key management** - Secure key storage and rotation
6. **TLS integration** - Drop-in replacement for TLS 1.3 key exchange

## Join the Waitlist

Want early access to Python, WebAssembly, and Node.js SDKs? [Join the QuantumShield waitlist](/quantum-shield) to be notified when new language bindings are released.

## Conclusion

The quantum computing threat isn't science fiction—it's an engineering timeline. NIST has finalized the standards (FIPS 203/204/205). The algorithms are ready. Organizations should begin planning their migration strategies now.

QuantumShield demonstrates one approach: defense-in-depth architecture combining hybrid key exchange, cascading encryption, and (soon) dual signatures. It's built to show that post-quantum cryptography is accessible to Rust developers today.

**My honest take**: Building this taught me that PQC is more approachable than I expected. The algorithms work, the performance is acceptable, and the tooling is maturing. But cryptography is hard, and getting it right in production requires more than just calling the right APIs—it requires professional review, formal verification, and continuous security monitoring.

If you're building systems today that need long-term confidentiality (10+ years), start evaluating PQC options now. But use established, audited implementations from organizations like Open Quantum Safe, not personal projects like this one.

QuantumShield's value is in education and experimentation—demonstrating that the post-quantum future is buildable today, one hybrid key exchange at a time.

---

*QuantumShield is open source under the MIT license. [View on GitHub](https://github.com/Tushar010402/QuantumShield) or [try the live demo](/quantum-shield/demo) to see ML-KEM-768 running in your browser.*
