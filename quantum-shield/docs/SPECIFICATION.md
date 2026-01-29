# QuantumShield Technical Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** January 2025

## 1. Introduction

QuantumShield is a hybrid post-quantum cryptographic system designed for defense-in-depth security. It combines NIST-standardized post-quantum algorithms with classical cryptography to provide security against both current and future quantum computing threats.

### 1.1 Design Goals

1. **Quantum Resistance**: Secure against known quantum attacks
2. **Hybrid Security**: Defense-in-depth with classical algorithms
3. **Cryptographic Agility**: Built-in versioning for future upgrades
4. **Memory Safety**: Automatic key material scrubbing
5. **Cross-Platform**: Rust core with bindings for multiple languages

### 1.2 Threat Model

QuantumShield protects against:
- Classical computational adversaries
- Quantum adversaries with access to fault-tolerant quantum computers
- Side-channel attacks (constant-time implementations)
- Replay attacks (message counters)
- Key compromise (forward secrecy via key rotation)

## 2. Algorithms

### 2.1 QShieldKEM (Key Encapsulation Mechanism)

**Base Algorithms:**
- X25519 ECDH (RFC 7748)
- ML-KEM-768 (NIST FIPS 203)

**Key Sizes:**
| Component | Public Key | Secret Key | Ciphertext |
|-----------|------------|------------|------------|
| X25519 | 32 bytes | 32 bytes | 32 bytes |
| ML-KEM-768 | 1,184 bytes | 2,400 bytes | 1,088 bytes |
| **Combined** | ~1,248 bytes | ~2,464 bytes | ~1,152 bytes |

**Key Combination:**
```
shared_secret = HKDF-SHA3-512(
    ikm: len(X25519_ss) || X25519_ss || len(ML-KEM_ss) || ML-KEM_ss || count(2),
    salt: quantum_resistant_salt(64),
    info: "QShieldKEM-v1",
    L: 64
)
```

### 2.2 QShieldSign (Digital Signatures)

**Base Algorithms:**
- ML-DSA-65 (NIST FIPS 204, formerly Dilithium3)
- SLH-DSA-SHA2-128s (NIST FIPS 205, formerly SPHINCS+-SHA2-128s)

**Key and Signature Sizes:**
| Component | Public Key | Secret Key | Signature |
|-----------|------------|------------|-----------|
| ML-DSA-65 | 1,952 bytes | 4,016 bytes | 3,293 bytes |
| SLH-DSA-SHA2-128s | 32 bytes | 64 bytes | 7,856 bytes |
| **Combined** | ~2,016 bytes | ~4,112 bytes | ~11,181 bytes |

**Signature Process:**
1. Hash message with domain separation: `H = SHA3-256("QShieldSign-v1" || len(msg) || msg)`
2. Sign hash with ML-DSA-65: `sig_ml = ML-DSA.Sign(sk_ml, H)`
3. Sign hash with SLH-DSA: `sig_slh = SLH-DSA.Sign(sk_slh, H)`
4. Combine: `signature = sig_ml || sig_slh`

**Verification:**
Both signatures must verify independently. If either fails, the combined signature is invalid.

### 2.3 QuantumShield (Symmetric Encryption)

**Base Algorithms:**
- AES-256-GCM (NIST SP 800-38D)
- ChaCha20-Poly1305 (RFC 8439)

**Cascading Process:**
```
encrypt(plaintext):
    nonce_aes = random(12)
    ct_aes = AES-256-GCM.Encrypt(key_aes, nonce_aes, plaintext)
    nonce_chacha = random(12)
    ct_final = ChaCha20-Poly1305.Encrypt(key_chacha, nonce_chacha, nonce_aes || ct_aes)
    return nonce_chacha || ct_final

decrypt(ciphertext):
    nonce_chacha = ciphertext[0:12]
    ct_chacha = ciphertext[12:]
    inner = ChaCha20-Poly1305.Decrypt(key_chacha, nonce_chacha, ct_chacha)
    nonce_aes = inner[0:12]
    ct_aes = inner[12:]
    plaintext = AES-256-GCM.Decrypt(key_aes, nonce_aes, ct_aes)
    return plaintext
```

**Overhead:** 56 bytes (2 × 12-byte nonce + 2 × 16-byte tag)

### 2.4 QShieldKDF (Key Derivation)

**Base Algorithms:**
- HKDF-SHA3-512 (RFC 5869 with SHA3-512)
- SHAKE-256 (for expansion)
- Argon2id (for password-based derivation)

**Domain Contexts:**
| Domain | Context String |
|--------|----------------|
| KEM Combination | `"QShieldKEM-v1"` |
| Encryption Keys | `"QShieldEncrypt-v1"` |
| Signing Keys | `"QShieldSign-v1"` |
| Handshake | `"QShieldHandshake-v1"` |
| Session Keys | `"QShieldSession-v1"` |
| Password | `"QShieldPassword-v1"` |

**Password-Based Derivation:**
```
key = Argon2id(password, salt, memory=64MB, time=3, parallelism=4, L=output_len)
final = HKDF-SHA3-512(key, "QShieldPassword-v1", "QShieldPassword-final", L)
```

## 3. Serialization Format

### 3.1 Header Format

All serialized objects begin with a 16-byte header:

```
Offset | Size | Field
-------|------|------
0      | 8    | Magic ("QSHIELD\0")
8      | 1    | Protocol version
9      | 1    | Object type
10     | 2    | Flags (reserved)
12     | 4    | Payload length
```

**Object Types:**
| Value | Type |
|-------|------|
| 0x01 | Public Key |
| 0x02 | Secret Key |
| 0x03 | KEM Ciphertext |
| 0x04 | Signature |
| 0x05 | Encrypted Message |
| 0x06 | Handshake Message |
| 0x07 | Key Pair |

### 3.2 Length-Prefixed Fields

Variable-length fields are encoded as:
```
| 4 bytes (u32 LE) | N bytes |
| length           | data    |
```

## 4. Protocol Layer

### 4.1 Handshake Protocol

```
Client                                    Server
  |                                         |
  |-------- ClientHello ------------------->|
  |         version: u8                     |
  |         kem_public_key: QShieldKEMPK    |
  |         sign_public_key: QShieldSignPK  |
  |         nonce: [u8; 32]                 |
  |                                         |
  |<------- ServerHello --------------------|
  |         version: u8                     |
  |         kem_ciphertext: QShieldKEMCT    |
  |         sign_public_key: QShieldSignPK  |
  |         signature: QShieldSig           |
  |         nonce: [u8; 32]                 |
  |                                         |
  |-------- ClientFinished ---------------->|
  |         signature: QShieldSig           |
  |                                         |
  |<------- ServerFinished -----------------|
  |         encrypted_confirm: Vec<u8>      |
  |                                         |
  [========= Encrypted Channel =============]
```

**Transcript Hash:**
```
transcript = SHA3-256("QShield-handshake-v1" || messages...)
```

**Session Keys:**
```
(client_write_key, server_write_key, client_iv, server_iv, resumption_secret) =
    HKDF-SHA3-512(shared_secret, "QShieldSession-v1" || transcript_hash, 128)
```

### 4.2 Message Format

```
| Header (16) | Version (1) | Session ID (16) | Encrypted Content |

Encrypted Content contains:
| Type (1) | Flags (1) | Counter (8) | [Timestamp (8)] | Payload Length (4) | Payload |
```

**Message Types:**
| Value | Type |
|-------|------|
| 0x01 | Data |
| 0x02 | Close |
| 0x03 | Key Update |
| 0x04 | Heartbeat |
| 0x05 | Error |

### 4.3 Replay Protection

- Each message includes a 64-bit counter
- Receivers track expected counter with sliding window (default: 1024)
- Messages with counter < expected are rejected
- Messages with counter > expected + window are rejected

## 5. Security Considerations

### 5.1 Side-Channel Resistance

- All secret operations use constant-time implementations
- Key material is zeroized immediately after use
- No branching on secret data

### 5.2 Quantum Security Levels

| Algorithm | NIST Level | Equivalent AES |
|-----------|------------|----------------|
| ML-KEM-768 | 3 | AES-192 |
| ML-DSA-65 | 3 | AES-192 |
| SLH-DSA-SHA2-128s | 1 | AES-128 |
| Combined | 3+ | AES-192+ |

### 5.3 Hybrid Security

The hybrid approach provides "IND-CCA security if X25519 OR ML-KEM is secure":
- If quantum computers break X25519, ML-KEM protects
- If a breakthrough breaks ML-KEM, X25519 protects
- Both would need to be broken simultaneously

### 5.4 Forward Secrecy

- Handshake uses ephemeral KEM keys
- Key rotation support via `rotate_keys()`
- Session keys derived with unique transcript hash

## 6. References

1. NIST FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard
2. NIST FIPS 204: Module-Lattice-Based Digital Signature Standard
3. NIST FIPS 205: Stateless Hash-Based Digital Signature Standard
4. RFC 7748: Elliptic Curves for Security
5. RFC 8439: ChaCha20 and Poly1305 for IETF Protocols
6. NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: GCM
7. RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)
8. RFC 9106: Argon2 Memory-Hard Function for Password Hashing
