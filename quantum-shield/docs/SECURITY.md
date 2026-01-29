# QuantumShield Security Considerations

## Overview

QuantumShield is designed with security as the primary concern. This document outlines the security model, threat analysis, and best practices for using the library.

## Threat Model

### Adversary Capabilities

QuantumShield is designed to protect against adversaries with:

1. **Classical Computing Power**: Unlimited classical computational resources
2. **Quantum Computing Power**: Access to fault-tolerant quantum computers capable of running Shor's and Grover's algorithms
3. **Network Access**: Ability to intercept, modify, and inject network traffic
4. **Ciphertext Access**: Access to encrypted data (store-now-decrypt-later attacks)

### Out of Scope

QuantumShield does NOT protect against:

1. **Compromised Endpoints**: If an attacker has access to your system's memory or can execute code, no cryptographic protection is sufficient
2. **Side-Channel Attacks at the Hardware Level**: Physical attacks, power analysis, electromagnetic emissions (though we mitigate timing attacks)
3. **Implementation Bugs in Dependencies**: We rely on well-audited cryptographic libraries, but vulnerabilities may exist
4. **Social Engineering**: Humans remain the weakest link

## Security Properties

### Confidentiality

- **Hybrid Encryption**: Data is protected by both classical (X25519, AES-256-GCM, ChaCha20-Poly1305) and post-quantum (ML-KEM-768) algorithms
- **Defense-in-Depth**: If one algorithm is broken, others still protect the data
- **Forward Secrecy**: Handshake uses ephemeral keys; key rotation provides ongoing forward secrecy

### Integrity

- **Authenticated Encryption**: All encryption uses AEAD modes (GCM, Poly1305)
- **Cascading Authentication**: Both cipher layers provide independent authentication
- **Dual Signatures**: Messages can be signed with both ML-DSA and SLH-DSA

### Authenticity

- **Mutual Authentication**: Handshake protocol verifies both parties' identities
- **Dual Signature Verification**: Both signature algorithms must verify
- **Session Binding**: Messages are bound to session ID preventing cross-session attacks

### Availability

- **Replay Protection**: Message counters prevent replay attacks
- **DoS Resistance**: Computationally expensive operations (Argon2id) are only used where necessary

## Algorithm Security

### ML-KEM-768 (NIST FIPS 203)

| Property | Level |
|----------|-------|
| NIST Security Level | 3 (equivalent to AES-192) |
| Problem | Module Learning With Errors (MLWE) |
| Best Known Attack | Dual lattice attack |
| Quantum Security | Yes |

### ML-DSA-65 (NIST FIPS 204)

| Property | Level |
|----------|-------|
| NIST Security Level | 3 |
| Problem | Module Learning With Errors (MLWE) |
| Quantum Security | Yes |

### SLH-DSA-SHA2-128s (NIST FIPS 205)

| Property | Level |
|----------|-------|
| NIST Security Level | 1 (equivalent to AES-128) |
| Problem | Hash function security |
| Quantum Security | Yes (Grover reduces security by half) |

### Classical Algorithms

| Algorithm | Key Size | Security Level |
|-----------|----------|----------------|
| X25519 | 256-bit | 128-bit classical, broken by quantum |
| AES-256-GCM | 256-bit | 128-bit quantum (Grover) |
| ChaCha20-Poly1305 | 256-bit | 128-bit quantum (Grover) |

## Implementation Security

### Constant-Time Operations

All operations on secret data are implemented in constant time to prevent timing attacks:

- Key comparisons
- Decapsulation
- Decryption
- Signature verification

### Memory Safety

1. **Zeroization**: All secret key material is automatically zeroized when dropped
2. **No Unsafe Code**: The library uses `#![forbid(unsafe_code)]`
3. **Rust Memory Safety**: Prevents buffer overflows, use-after-free, etc.

### Error Handling

Security-sensitive errors return uniform messages to prevent oracle attacks:

```rust
// These errors don't reveal WHY the operation failed
DecapsulationFailed  // Could be invalid ciphertext or wrong key
DecryptionFailed     // Could be wrong key, corrupted data, or wrong AAD
VerificationFailed   // Could be wrong key, wrong message, or invalid signature
```

### Random Number Generation

- Uses OS-provided CSPRNG via `getrandom`
- Additional entropy mixing for "quantum-resistant" salts
- Never reuses nonces

## Best Practices

### Key Management

1. **Generate Keys Securely**
   ```rust
   // Good: Generate fresh keys
   let (pk, sk) = QShieldKEM::generate_keypair()?;

   // Bad: Derive keys from weak entropy
   let sk = QShieldKEMSecretKey::from_bytes(&weak_source)?;
   ```

2. **Store Keys Securely**
   - Use secure key storage (HSM, secure enclave, encrypted at rest)
   - Never log or print secret keys
   - Implement key backup procedures

3. **Rotate Keys Regularly**
   ```rust
   cipher.rotate_keys()?;  // Creates new keys, destroys old ones
   ```

### Password-Based Encryption

1. **Use Strong Passwords**
   - Minimum 16 characters
   - Mix of character types
   - Consider passphrases

2. **Use Appropriate KDF Parameters**
   ```rust
   // For interactive use (login)
   let config = KdfConfig::default();

   // For high-security use (file encryption)
   let config = KdfConfig::high_security();

   // For constrained devices
   let config = KdfConfig::low_memory();
   ```

3. **Store Salts Properly**
   - Always generate random salts
   - Store salt with encrypted data (not secret)
   - Never reuse salts

### Network Protocol

1. **Always Complete Handshake**
   - Don't skip steps in the handshake protocol
   - Verify all signatures
   - Check protocol version

2. **Use Message Counters**
   - The `MessageChannel` handles this automatically
   - Don't disable replay protection

3. **Handle Errors Carefully**
   ```rust
   // Good: Generic error to user
   match result {
       Ok(_) => ...,
       Err(_) => return HttpResponse::Unauthorized(),
   }

   // Bad: Detailed error to user
   match result {
       Ok(_) => ...,
       Err(e) => return HttpResponse::BadRequest().body(e.to_string()),
   }
   ```

### Session Management

1. **Verify Session IDs**
   - Check session ID matches expected value
   - Use secure session ID generation

2. **Implement Timeouts**
   - Sessions should expire
   - Force re-authentication periodically

3. **Clean Up Sessions**
   - Remove expired sessions
   - Properly close sessions when done

## Known Limitations

### Signature Size

SLH-DSA signatures are large (~8 KB). Consider:
- Using ML-DSA alone if signature size is critical
- Compression for storage
- Alternative signature schemes for constrained environments

### Performance

Post-quantum algorithms are generally slower than classical equivalents:
- ML-KEM: ~10x slower than X25519
- ML-DSA: ~50x slower than Ed25519
- SLH-DSA: ~100x slower than Ed25519

Consider using hybrid mode selectively based on threat model.

### Algorithm Maturity

While NIST has standardized these algorithms, they are newer than classical counterparts:
- Classical (RSA, ECDH): 30+ years of analysis
- Post-quantum (ML-KEM, ML-DSA): ~10 years of public analysis

The hybrid approach mitigates this risk.

## Incident Response

### If You Discover a Vulnerability

1. **Do Not Disclose Publicly**
2. **Contact**: security@example.com
3. **Provide**: Detailed description, proof of concept, affected versions
4. **Wait**: For patch before disclosure

### If Your Keys Are Compromised

1. **Revoke** affected keys immediately
2. **Generate** new key pairs
3. **Re-encrypt** data with new keys
4. **Notify** affected parties
5. **Investigate** how compromise occurred

## Compliance Notes

### NIST Standards

QuantumShield uses NIST-standardized algorithms:
- FIPS 203 (ML-KEM)
- FIPS 204 (ML-DSA)
- FIPS 205 (SLH-DSA)

### CNSA 2.0

The Commercial National Security Algorithm Suite 2.0 timeline:
- 2025: Prefer quantum-resistant algorithms
- 2030: Require quantum-resistant algorithms

QuantumShield is designed to meet CNSA 2.0 requirements.

## References

1. [NIST Post-Quantum Cryptography](https://csrc.nist.gov/projects/post-quantum-cryptography)
2. [Hybrid Public Key Encryption](https://datatracker.ietf.org/doc/draft-ietf-pqc-hpke/)
3. [CNSA 2.0](https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS_.PDF)
4. [Side-Channel Attacks](https://csrc.nist.gov/Projects/Post-Quantum-Cryptography/faqs)
