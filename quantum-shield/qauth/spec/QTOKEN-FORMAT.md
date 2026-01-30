# QToken Format Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-30

---

## Abstract

This document specifies the QToken format, a secure token format for the QuantumAuth protocol. QTokens provide encrypted payloads, dual post-quantum signatures, and built-in proof-of-possession binding.

---

## 1. Overview

### 1.1 Design Goals

1. **Encrypted payloads** - Claims are never visible in transit
2. **Dual signatures** - Classical (Ed25519) + Post-Quantum (ML-DSA-65)
3. **Fixed structure** - No algorithm negotiation attacks
4. **Built-in binding** - Device and client key binding
5. **Compact representation** - Efficient binary encoding

### 1.2 Token Structure

```
QToken = Header || EncryptedPayload || Signature || ProofBinding
```

All fields are binary-encoded. The token is transmitted as base64url without padding.

---

## 2. Header Format

### 2.1 Structure (42 bytes fixed)

```
Offset  Size  Field         Description
------  ----  -----         -----------
0       1     Version       Protocol version (0x01)
1       1     TokenType     Type of token
2       32    KeyID         SHA-256 of issuer's public signing key
34      8     Timestamp     Token creation time (Unix ms, big-endian)
```

### 2.2 Token Types

| Value | Type | Description |
|-------|------|-------------|
| 0x01 | Access | Short-lived access token |
| 0x02 | Refresh | Long-lived refresh token |
| 0x03 | Identity | Identity/ID token |
| 0x04 | Device | Device registration token |

### 2.3 Key ID Generation

```
KeyID = SHA-256(
  0x51 || 0x41 ||  // "QA" magic bytes
  ed25519_public_key ||
  ml_dsa_public_key
)
```

---

## 3. Encrypted Payload

### 3.1 Plaintext Structure

The payload is a CBOR-encoded map with the following fields:

```cbor
{
  "sub": bytes,      // Subject identifier (user ID)
  "iss": text,       // Issuer identifier
  "aud": [text],     // Audience(s)
  "exp": uint,       // Expiration time (Unix seconds)
  "iat": uint,       // Issued at (Unix seconds)
  "nbf": uint,       // Not before (Unix seconds)
  "jti": bytes,      // Unique token identifier (16 bytes)
  "rid": bytes,      // Revocation ID (16 bytes)
  "pol": text,       // Policy reference URN
  "ctx": bytes,      // Context hash (32 bytes)
  "cst": map         // Custom claims (optional)
}
```

### 3.2 Encryption

Encryption uses XChaCha20-Poly1305:

```
nonce = random(24 bytes)
key = issuer_encryption_key (32 bytes)

ciphertext = XChaCha20-Poly1305.Encrypt(
  key,
  nonce,
  plaintext,
  associated_data = header
)

EncryptedPayload = nonce || ciphertext || tag
```

- **Nonce**: 24 bytes (random)
- **Ciphertext**: Variable length
- **Tag**: 16 bytes (authentication tag)

### 3.3 Associated Data

The header serves as associated data (AAD) for AEAD encryption, ensuring the header cannot be modified without detection.

---

## 4. Signature Format

### 4.1 Structure

```
Signature = Ed25519Signature || MLDSASignature

Ed25519Signature:  64 bytes
MLDSASignature:    3309 bytes (ML-DSA-65)

Total:             3373 bytes
```

### 4.2 Signing Process

Both signatures are computed over the same message:

```
message = Header || EncryptedPayload

ed25519_sig = Ed25519.Sign(ed25519_private_key, message)
mldsa_sig = ML_DSA_65.Sign(mldsa_private_key, message)

Signature = ed25519_sig || mldsa_sig
```

### 4.3 Verification

**BOTH signatures MUST verify** for the token to be valid:

```python
def verify_qtoken(token, issuer_keys):
    header, encrypted_payload, signature, binding = parse(token)
    message = header || encrypted_payload

    ed25519_sig = signature[0:64]
    mldsa_sig = signature[64:]

    ed25519_valid = Ed25519.Verify(
        issuer_keys.ed25519_public,
        message,
        ed25519_sig
    )

    mldsa_valid = ML_DSA_65.Verify(
        issuer_keys.mldsa_public,
        message,
        mldsa_sig
    )

    return ed25519_valid AND mldsa_valid
```

---

## 5. Proof Binding

### 5.1 Structure (96 bytes)

```
Offset  Size  Field       Description
------  ----  -----       -----------
0       32    DeviceKey   SHA-256 of device public key
32      32    ClientKey   SHA-256 of client ephemeral public key
64      32    IPHash      Salted hash of client IP (or zeros)
```

### 5.2 Device Key

The device key binds the token to a specific device:

```
DeviceKey = SHA-256(device_attestation_public_key)
```

For non-attested devices, use a persistent device identifier:

```
DeviceKey = SHA-256(device_id || device_fingerprint)
```

### 5.3 Client Key

The client key binds to the ephemeral keypair generated during authorization:

```
ClientKey = SHA-256(client_ephemeral_ed25519_public_key)
```

### 5.4 IP Hash (Optional)

For IP binding (when enabled):

```
salt = random(16 bytes)  // Stored server-side
IPHash = SHA-256(salt || client_ip_address)
```

If IP binding is disabled, IPHash is 32 zero bytes.

---

## 6. Complete Token Layout

```
┌─────────────────────────────────────────────────────────────┐
│                         QTOKEN                               │
├─────────────────────────────────────────────────────────────┤
│ Header (42 bytes)                                            │
│ ┌─────────┬─────────┬──────────────────────────┬───────────┐│
│ │ Version │ Type    │ KeyID (32 bytes)         │ Timestamp ││
│ │ 1 byte  │ 1 byte  │                          │ 8 bytes   ││
│ └─────────┴─────────┴──────────────────────────┴───────────┘│
├─────────────────────────────────────────────────────────────┤
│ Encrypted Payload (variable)                                 │
│ ┌────────────────┬─────────────────────────┬───────────────┐│
│ │ Nonce          │ Ciphertext              │ Tag           ││
│ │ 24 bytes       │ variable                │ 16 bytes      ││
│ └────────────────┴─────────────────────────┴───────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Signature (3373 bytes)                                       │
│ ┌────────────────────────────┬──────────────────────────────┐│
│ │ Ed25519 Signature          │ ML-DSA-65 Signature          ││
│ │ 64 bytes                   │ 3309 bytes                   ││
│ └────────────────────────────┴──────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ Proof Binding (96 bytes)                                     │
│ ┌─────────────────┬─────────────────┬──────────────────────┐│
│ │ DeviceKey       │ ClientKey       │ IPHash               ││
│ │ 32 bytes        │ 32 bytes        │ 32 bytes             ││
│ └─────────────────┴─────────────────┴──────────────────────┘│
└─────────────────────────────────────────────────────────────┘

Total minimum size: 42 + 40 + 3373 + 96 = 3551 bytes
Typical size with payload: ~3700-4100 bytes
```

---

## 7. Serialization

### 7.1 Binary Format

All multi-byte integers are big-endian. The token is serialized as:

```
serialized = header || length(encrypted_payload) || encrypted_payload || signature || binding
```

Where `length()` is a 2-byte big-endian unsigned integer.

### 7.2 Transport Encoding

For HTTP transport, use base64url encoding without padding:

```
token_string = base64url_encode(serialized)
```

### 7.3 Magic Bytes

For file storage or binary protocols, prepend magic bytes:

```
QTOKEN_MAGIC = 0x51 0x54 0x4B 0x4E  // "QTKN"
file_format = QTOKEN_MAGIC || serialized
```

---

## 8. Validation Rules

### 8.1 Header Validation

1. Version MUST be 0x01
2. TokenType MUST be valid (0x01-0x04)
3. Timestamp MUST be within acceptable skew (default: 5 minutes)

### 8.2 Signature Validation

1. Ed25519 signature MUST verify
2. ML-DSA-65 signature MUST verify
3. KeyID MUST match known issuer keys

### 8.3 Payload Validation

1. Decryption MUST succeed (valid tag)
2. `exp` MUST be in the future
3. `nbf` MUST be in the past (if present)
4. `aud` MUST contain expected audience
5. `iss` MUST match expected issuer

### 8.4 Binding Validation

1. ClientKey MUST match the key used for proof of possession
2. DeviceKey MUST match attested device (if attestation required)
3. IPHash MUST match client IP (if IP binding enabled)

---

## 9. Error Codes

| Code | Name | Description |
|------|------|-------------|
| E001 | INVALID_VERSION | Unsupported protocol version |
| E002 | INVALID_TYPE | Unknown token type |
| E003 | SIGNATURE_FAILED | Signature verification failed |
| E004 | DECRYPTION_FAILED | Payload decryption failed |
| E005 | TOKEN_EXPIRED | Token has expired |
| E006 | TOKEN_NOT_YET_VALID | Token not yet valid (nbf) |
| E007 | INVALID_AUDIENCE | Audience mismatch |
| E008 | INVALID_ISSUER | Unknown or untrusted issuer |
| E009 | BINDING_MISMATCH | Proof binding validation failed |
| E010 | TOKEN_REVOKED | Token has been revoked |

---

## 10. Test Vectors

### 10.1 Sample Token (Hex)

```
Header (42 bytes):
01 01 a1b2c3d4e5f6... (32 bytes KeyID) ...00000194e8f2a400

Encrypted Payload (example, 150 bytes):
0096 (length)
[24 bytes nonce][~110 bytes ciphertext][16 bytes tag]

Signature (3373 bytes):
[64 bytes Ed25519][3309 bytes ML-DSA-65]

Proof Binding (96 bytes):
[32 bytes DeviceKey][32 bytes ClientKey][32 bytes IPHash]
```

### 10.2 Sample Payload (Before Encryption)

```cbor
{
  "sub": h'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
  "iss": "https://auth.example.com",
  "aud": ["https://api.example.com"],
  "exp": 1706624400,
  "iat": 1706620800,
  "nbf": 1706620800,
  "jti": h'f47ac10b58cc4372a5670e02b2c3d479',
  "rid": h'550e8400e29b41d4a716446655440000',
  "pol": "urn:qauth:policy:12345",
  "ctx": h'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  "cst": {
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

---

## 11. Security Considerations

### 11.1 Quantum Resistance

The dual signature scheme provides:
- **Immediate security**: Ed25519 remains secure against classical computers
- **Future security**: ML-DSA-65 is secure against quantum computers
- **Defense in depth**: If either algorithm is broken, update implementation

### 11.2 Forward Secrecy

QTokens themselves don't provide forward secrecy. For long-term security:
- Use ephemeral encryption keys per session
- Implement key rotation for issuer keys
- Short token lifetimes (recommended: 1 hour access, 7 days refresh)

### 11.3 Side-Channel Resistance

Implementations MUST:
- Use constant-time comparisons for all cryptographic operations
- Zeroize sensitive key material after use
- Avoid branching on secret data

### 11.4 Comparison with JWT

| Aspect | JWT | QToken |
|--------|-----|--------|
| Algorithm in header | Yes (vulnerable) | No (server-enforced) |
| "none" algorithm | Possible | Not supported |
| Payload visibility | Base64 (visible) | Encrypted |
| Signature | Single | Dual (classical + PQ) |
| Key binding | None (bearer) | Device + Client |
| Size | ~500-1000 bytes | ~3500-4000 bytes |
| Offline verification | Yes | Yes (with revocation cache) |

---

## 12. IANA Considerations

### 12.1 Media Type Registration

- **Type name**: application
- **Subtype name**: qtoken
- **Required parameters**: None
- **Encoding considerations**: Binary (base64url for text contexts)

---

## 13. References

- [RFC 8949] Concise Binary Object Representation (CBOR)
- [RFC 8439] ChaCha20 and Poly1305 for IETF Protocols
- [RFC 8032] Edwards-Curve Digital Signature Algorithm (EdDSA)
- [FIPS 204] Module-Lattice-Based Digital Signature Standard (ML-DSA)

---

**Authors**: QuantumShield Team
**Copyright**: 2026 QuantumShield. This specification is released under CC BY 4.0.
