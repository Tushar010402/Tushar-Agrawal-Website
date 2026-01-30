# QuantumAuth Core Protocol Specification

**Version**: 1.0.0
**Status**: Draft
**Last Updated**: 2026-01-30

---

## Abstract

QuantumAuth (QAuth) is a next-generation authentication and authorization protocol designed to replace OAuth 2.0 and JWT. It addresses all known vulnerabilities in existing standards while providing post-quantum cryptographic security, mandatory proof-of-possession, built-in revocation, and privacy-preserving encrypted payloads.

---

## 1. Introduction

### 1.1 Background

OAuth 2.0 and JWT have been the de facto standards for authentication and authorization for over a decade. However, numerous critical vulnerabilities have been discovered:

- **Algorithm confusion attacks** allowing signature bypass
- **Bearer token theft** enabling unauthorized access
- **No built-in revocation** leaving stolen tokens valid
- **Plaintext payloads** leaking sensitive information
- **No post-quantum security** vulnerable to future quantum computers

QuantumAuth addresses ALL these issues by design, not as optional extensions.

### 1.2 Design Goals

1. **Secure by default**: No configuration required to achieve security
2. **Post-quantum ready**: ML-DSA-65 + Ed25519 dual signatures
3. **Privacy-preserving**: Encrypted payloads, not just encoded
4. **Sender-constrained**: Mandatory proof-of-possession
5. **Instantly revocable**: Built-in revocation system
6. **Fine-grained**: Policy references instead of scope explosion
7. **Context-aware**: Environmental factors in authorization decisions

### 1.3 Terminology

| Term | Definition |
|------|------------|
| **QToken** | QuantumAuth token format |
| **QAuth Server** | Authorization server implementing this specification |
| **Client** | Application requesting authorization |
| **Resource Owner** | User granting authorization |
| **Resource Server** | Server hosting protected resources |
| **Proof of Possession (PoP)** | Cryptographic proof that the client possesses a private key |

---

## 2. Protocol Overview

### 2.1 High-Level Flow

```
┌──────────┐                                    ┌─────────────┐
│  Client  │                                    │ QAuth Server│
└────┬─────┘                                    └──────┬──────┘
     │                                                 │
     │ 1. Generate ephemeral keypair (Ed25519 + ML-KEM)│
     │                                                 │
     │ 2. Authorization Request ─────────────────────► │
     │    • client_id                                  │
     │    • redirect_uri                               │
     │    • response_type=code                         │
     │    • code_challenge (PKCE, mandatory)           │
     │    • code_challenge_method=S256                 │
     │    • client_public_key                          │
     │    • device_attestation                         │
     │    • state                                      │
     │                                                 │
     │                           User Authenticates    │
     │                                                 │
     │ 3. Authorization Response ◄───────────────────  │
     │    • code (encrypted, bound to client key)      │
     │    • state                                      │
     │                                                 │
     │ 4. Token Request ─────────────────────────────► │
     │    • grant_type=authorization_code              │
     │    • code                                       │
     │    • code_verifier (PKCE)                       │
     │    • client_public_key                          │
     │    • proof_of_possession                        │
     │                                                 │
     │ 5. Token Response ◄─────────────────────────── │
     │    • access_token (QToken)                      │
     │    • refresh_token (QToken)                     │
     │    • token_type=QAuth                           │
     │    • expires_in                                 │
     │    • revocation_endpoint                        │
     │                                                 │
```

### 2.2 Key Differences from OAuth 2.0

| Aspect | OAuth 2.0 | QuantumAuth |
|--------|-----------|-------------|
| PKCE | Optional | **Mandatory** |
| Token Format | Bearer (JWT) | **QToken (encrypted, bound)** |
| Proof of Possession | Optional (DPoP) | **Mandatory** |
| Algorithm Selection | Client-controlled | **Server-enforced** |
| Revocation | External RFC 7009 | **Built-in** |
| Payload Visibility | Base64 (visible) | **Encrypted** |
| Cryptography | RSA/ECDSA | **Ed25519 + ML-DSA-65 (dual)** |

---

## 3. Authorization Endpoint

### 3.1 Request Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Client identifier |
| `redirect_uri` | Yes | Callback URI (must match registered) |
| `response_type` | Yes | Must be `code` |
| `code_challenge` | Yes | PKCE challenge (SHA-256 of verifier) |
| `code_challenge_method` | Yes | Must be `S256` |
| `client_public_key` | Yes | Client's ephemeral Ed25519 public key (base64url) |
| `device_attestation` | Recommended | Device binding attestation |
| `state` | Yes | CSRF protection token |
| `scope` | No | Deprecated; use `policy_ref` instead |
| `policy_ref` | Recommended | Policy reference URN |

### 3.2 Request Example

```http
GET /authorize?
  client_id=app-12345&
  redirect_uri=https%3A%2F%2Fapp.example%2Fcallback&
  response_type=code&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256&
  client_public_key=MCowBQYDK2VwAyEAGb9F2CMM...&
  device_attestation=eyJhdHRlc3RhdGlvbiI6...&
  state=abc123&
  policy_ref=urn:qauth:policy:read-only
HTTP/1.1
Host: auth.example.com
```

### 3.3 Response

On success, redirect to `redirect_uri` with:

| Parameter | Description |
|-----------|-------------|
| `code` | Authorization code (encrypted, bound to client key) |
| `state` | Echo of request state |

```http
HTTP/1.1 302 Found
Location: https://app.example/callback?
  code=SplxlOBeZQQYbYS6WxSbIA&
  state=abc123
```

### 3.4 Error Response

```http
HTTP/1.1 302 Found
Location: https://app.example/callback?
  error=invalid_request&
  error_description=Missing+required+parameter&
  state=abc123
```

---

## 4. Token Endpoint

### 4.1 Token Request

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "SplxlOBeZQQYbYS6WxSbIA",
  "redirect_uri": "https://app.example/callback",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
  "client_public_key": "MCowBQYDK2VwAyEAGb9F2CMM...",
  "proof_of_possession": {
    "timestamp": 1706620800000,
    "signature": "base64url-encoded-signature"
  }
}
```

### 4.2 Proof of Possession in Token Request

The `proof_of_possession` object must contain:

```json
{
  "timestamp": <Unix milliseconds>,
  "signature": Sign(
    SHA-256(
      timestamp ||
      "POST" ||
      "/token" ||
      SHA-256(request_body) ||
      client_id
    ),
    client_private_key
  )
}
```

- **Timestamp**: Must be within 60 seconds of server time
- **Signature**: Ed25519 signature using client's ephemeral private key

### 4.3 Token Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "<QToken>",
  "refresh_token": "<QToken>",
  "token_type": "QAuth",
  "expires_in": 3600,
  "revocation_endpoint": "https://auth.example.com/revoke",
  "policy_ref": "urn:qauth:policy:12345",
  "policy_endpoint": "https://auth.example.com/policies/12345"
}
```

---

## 5. Using QTokens

### 5.1 API Request with QToken

Every API request MUST include:

1. **Authorization header**: The QToken
2. **X-QAuth-Proof header**: Proof of possession for this specific request

```http
GET /api/resource HTTP/1.1
Host: api.example.com
Authorization: QAuth eyJoZWFkZXIiOiJRVG9rZW4i...
X-QAuth-Proof: eyJ0aW1lc3RhbXAiOjE3MDY2MjA4MDAw...
```

### 5.2 Proof of Possession Structure

```json
{
  "timestamp": 1706620800000,
  "nonce": "unique-request-nonce",
  "method": "GET",
  "uri": "/api/resource",
  "body_hash": "SHA-256 of request body (or null for GET)",
  "token_hash": "SHA-256 of the QToken",
  "signature": "Ed25519 signature of above fields"
}
```

### 5.3 Server Validation Steps

1. **Parse QToken header** - Extract version, token type, key ID
2. **Verify dual signatures** - Both Ed25519 AND ML-DSA-65 must verify
3. **Decrypt payload** - Using server's decryption key
4. **Check expiration** - Token not expired
5. **Validate proof of possession**:
   - Timestamp within 60 seconds
   - Nonce not reused (within window)
   - Method and URI match request
   - Body hash matches (if applicable)
   - Token hash matches
   - Signature verifies with bound client key
6. **Check revocation** - Query revocation endpoint if cache stale
7. **Authorize request** - Fetch and evaluate policy

---

## 6. Revocation

### 6.1 Revocation Request

```http
POST /revoke HTTP/1.1
Host: auth.example.com
Content-Type: application/json
Authorization: QAuth <admin-token>

{
  "revocation_id": "rev-abc123",
  "reason": "user_logout",
  "revoke_all_for_subject": false
}
```

### 6.2 Revocation Check

Resource servers MUST check revocation status:

```http
GET /revocation/status?id=rev-abc123 HTTP/1.1
Host: auth.example.com
```

Response:

```json
{
  "revoked": true,
  "revoked_at": "2026-01-30T12:00:00Z",
  "reason": "user_logout"
}
```

### 6.3 Revocation Caching

- **Max cache TTL**: 5 minutes (configurable)
- **Push updates**: WebSocket/SSE subscription available
- **Bloom filter**: Compact revocation list for offline checking

---

## 7. Grant Types

### 7.1 Supported Grant Types

| Grant Type | Status | Notes |
|------------|--------|-------|
| `authorization_code` | **Required** | With mandatory PKCE |
| `refresh_token` | **Required** | With proof of possession |
| `client_credentials` | Optional | Machine-to-machine |
| `implicit` | **NOT SUPPORTED** | Deprecated, insecure |
| `password` | **NOT SUPPORTED** | Deprecated, insecure |

### 7.2 Refresh Token Flow

```http
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "<QToken>",
  "client_public_key": "MCowBQYDK2VwAyEAGb9F2CMM...",
  "proof_of_possession": {
    "timestamp": 1706620800000,
    "signature": "base64url-encoded-signature"
  }
}
```

---

## 8. Security Considerations

### 8.1 Mitigations for Known Attacks

| Attack | OAuth 2.0 Vulnerability | QAuth Mitigation |
|--------|------------------------|------------------|
| Authorization code interception | Codes can be stolen | Codes encrypted, bound to client key |
| Token replay | Bearer tokens work anywhere | Proof of possession required |
| Token theft | No binding | Device + client key binding |
| Algorithm confusion | Client chooses algorithm | Server-enforced algorithms |
| "None" algorithm | Accepted by some libraries | Not supported, rejected |
| Redirect URI manipulation | Open redirectors | Strict matching, cryptographic binding |
| PKCE downgrade | Optional PKCE | Mandatory PKCE |
| Payload inspection | Base64 visible | Encrypted payloads |
| Quantum attacks | RSA/ECDSA vulnerable | ML-DSA-65 + Ed25519 dual |

### 8.2 Cryptographic Requirements

- **Key Exchange**: X25519 + ML-KEM-768 (hybrid)
- **Signatures**: Ed25519 + ML-DSA-65 (both must verify)
- **Encryption**: XChaCha20-Poly1305 (or AES-256-GCM fallback)
- **Hashing**: SHA-256, SHA3-256
- **KDF**: HKDF-SHA3-512

### 8.3 Implementation Requirements

1. **TLS 1.3 required** for all endpoints
2. **Certificate pinning** recommended for mobile clients
3. **Constant-time comparisons** for all cryptographic operations
4. **Secure random generation** for all nonces and keys
5. **Memory zeroization** for sensitive data

---

## 9. IANA Considerations

### 9.1 OAuth Token Type Registration

- **Token Type**: QAuth
- **Description**: QuantumAuth token with proof of possession

### 9.2 HTTP Header Registration

- **X-QAuth-Proof**: Proof of possession header

---

## 10. Appendix

### 10.1 Example QToken (Annotated)

```
Header (42 bytes):
  Version:    0x01
  TokenType:  0x01 (access)
  KeyID:      <32 bytes SHA-256 of server public key>
  Timestamp:  <8 bytes Unix milliseconds>

EncryptedPayload (variable):
  [XChaCha20-Poly1305 encrypted JSON]

Signature (3373 bytes):
  Ed25519:    <64 bytes>
  ML-DSA-65:  <3309 bytes>

ProofBinding (96 bytes):
  DeviceKey:  <32 bytes SHA-256>
  ClientKey:  <32 bytes SHA-256>
  IPHash:     <32 bytes salted hash>
```

### 10.2 Test Vectors

See `QTOKEN-FORMAT.md` for complete test vectors.

### 10.3 Reference Implementation

Available at: https://github.com/quantum-shield/qauth

---

## 11. References

- [RFC 6749] OAuth 2.0 Authorization Framework
- [RFC 7519] JSON Web Token (JWT)
- [RFC 7636] Proof Key for Code Exchange (PKCE)
- [RFC 9449] OAuth 2.0 Demonstrating Proof of Possession (DPoP)
- [FIPS 203] ML-KEM (Kyber)
- [FIPS 204] ML-DSA (Dilithium)
- [RFC 8032] Edwards-Curve Digital Signature Algorithm (Ed25519)

---

**Authors**: QuantumShield Team
**Copyright**: 2026 QuantumShield. This specification is released under CC BY 4.0.
