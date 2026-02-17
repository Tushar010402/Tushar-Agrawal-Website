# QuantumShield Go SDK

Production-ready quantum-resistant cryptographic library for Go, providing defense-in-depth encryption with cascading ciphers, hybrid key encapsulation, digital signatures, and forward-secrecy sessions.

## Features

| Feature | Algorithm | Security Level |
|---------|-----------|---------------|
| Symmetric Encryption | AES-256-GCM + ChaCha20-Poly1305 (cascading) | 256-bit |
| Key Encapsulation | X25519 ECDH + HKDF-SHA-512 | 128-bit classical |
| Digital Signatures | Ed25519 | 128-bit classical |
| Password KDF | Argon2id (19 MB, 3 iterations) | Memory-hard |
| Key Derivation | HKDF-SHA-512 | 256-bit |
| Forward Secrecy | HMAC-SHA-256 key ratcheting | Per-message keys |

## Installation

```bash
go get github.com/Tushar010402/quantum-shield-go
```

Requires Go 1.21 or later.

## Quick Start

### Password-Based Encryption

```go
package main

import (
    "fmt"
    qs "github.com/Tushar010402/quantum-shield-go"
)

func main() {
    cipher, _ := qs.NewCipherFromPassword("my-secret-password")

    encrypted, _ := cipher.Encrypt([]byte("Hello, quantum world!"))
    decrypted, _ := cipher.Decrypt(encrypted)

    fmt.Println(string(decrypted)) // Hello, quantum world!
}
```

### Key Exchange + Encryption

```go
alice, _ := qs.NewKEM()
bob, _ := qs.NewKEM()

// Alice encapsulates a shared secret for Bob
ct, aliceSecret, _ := alice.Encapsulate(bob.PublicKey())

// Bob decapsulates to get the same shared secret
bobSecret, _ := bob.Decapsulate(ct)

// Both create ciphers from the shared secret
aliceCipher, _ := qs.NewCipher(aliceSecret)
bobCipher, _ := qs.NewCipher(bobSecret)

encrypted, _ := aliceCipher.Encrypt([]byte("Secret message"))
decrypted, _ := bobCipher.Decrypt(encrypted)
```

### Digital Signatures

```go
signer, _ := qs.NewSign()

signature, _ := signer.Sign([]byte("Important document"))
ok, _ := signer.Verify([]byte("Important document"), signature)

// Standalone verification with just a public key
ok, _ = qs.VerifyWithPublicKey(signer.PublicKey(), []byte("Important document"), signature)
```

### Forward-Secrecy Sessions

```go
// After KEM exchange, create sessions
aliceSession, _ := qs.NewSession(sharedSecret)
bobSession, _ := qs.NewSession(sharedSecret)

// Each message uses a unique key; past keys are irrecoverable
ct1, _ := aliceSession.Encrypt([]byte("Message 1"))
pt1, _ := bobSession.Decrypt(ct1)

ct2, _ := aliceSession.Encrypt([]byte("Message 2"))
pt2, _ := bobSession.Decrypt(ct2)
```

### Key Derivation

```go
kdf := qs.NewKDF()

// From a password (Argon2id)
salt, _ := qs.GenerateSalt(16)
key, _ := kdf.DeriveFromPassword("user-password", salt)

// From high-entropy material (HKDF-SHA-512)
derived, _ := kdf.Derive(ikmBytes, salt, []byte("my-app-context"), 32)
```

## API Reference

### QShieldCipher

Cascading symmetric cipher: AES-256-GCM then ChaCha20-Poly1305.

| Function | Description |
|----------|-------------|
| `NewCipher(sharedSecret)` | Create from shared secret (HKDF key derivation) |
| `NewCipherFromPassword(password)` | Create from password (Argon2id key derivation) |
| `Encrypt(plaintext)` | Encrypt with cascading ciphers |
| `Decrypt(ciphertext)` | Decrypt cascading ciphertext |
| `EncryptWithAAD(plaintext, aad)` | Encrypt with additional authenticated data |
| `DecryptWithAAD(ciphertext, aad)` | Decrypt with AAD verification |
| `Overhead()` | Returns ciphertext overhead in bytes |

### QShieldKEM

X25519-based Key Encapsulation Mechanism.

| Function | Description |
|----------|-------------|
| `NewKEM()` | Generate a new X25519 key pair |
| `PublicKey()` | Get the 32-byte public key |
| `Encapsulate(peerPK)` | Encapsulate: returns ciphertext + shared secret |
| `Decapsulate(ct)` | Decapsulate: recover the shared secret |

### QShieldSign

Ed25519 digital signatures.

| Function | Description |
|----------|-------------|
| `NewSign()` | Generate a new Ed25519 key pair |
| `NewSignFromSeed(seed)` | Deterministic key from 32-byte seed |
| `PublicKey()` | Get the 32-byte public key |
| `Sign(message)` | Sign a message (64-byte signature) |
| `Verify(message, sig)` | Verify a signature |
| `VerifyWithPublicKey(pk, msg, sig)` | Standalone verification |

### QShieldKDF

Key derivation functions.

| Function | Description |
|----------|-------------|
| `DeriveFromPassword(password, salt)` | Argon2id password hashing |
| `Derive(ikm, salt, info, length)` | HKDF-SHA-512 key expansion |
| `GenerateSalt(length)` | Generate random salt |

### QShieldSession

Forward-secrecy encrypted sessions with key ratcheting.

| Function | Description |
|----------|-------------|
| `NewSession(sharedSecret)` | Create from shared secret |
| `Encrypt(plaintext)` | Encrypt with key ratcheting |
| `Decrypt(ciphertext)` | Decrypt with key ratcheting |
| `MessageCount()` | Number of messages processed |

## Security Model

QuantumShield uses defense-in-depth at every layer:

1. **Cascading encryption**: plaintext is encrypted with AES-256-GCM, then the AES ciphertext is encrypted again with ChaCha20-Poly1305. Breaking one cipher is insufficient.

2. **Independent key derivation**: each cipher layer derives its key from independent HKDF-SHA-512 expansions with different domain-separation info strings.

3. **Forward secrecy**: session keys are ratcheted forward after each message using HMAC-SHA-256. Compromising the current key does not reveal past keys.

4. **Memory-hard KDF**: password-based keys use Argon2id with 19 MB memory cost, resisting GPU/ASIC brute-force attacks.

## Wire Format

### Ciphertext

```
[version: 1 byte] [aes_nonce: 12 bytes] [chacha_nonce: 12 bytes] [chacha_ciphertext: variable]
```

The `chacha_ciphertext` contains the AES-256-GCM ciphertext (with its 16-byte auth tag) encrypted under ChaCha20-Poly1305 (adding another 16-byte auth tag).

### Session Message

```
[sequence: 8 bytes LE] [cipher_ciphertext: variable]
```

## Testing

```bash
go test -v ./...
go test -bench=. ./...
```

## Dependencies

- `golang.org/x/crypto` - ChaCha20-Poly1305, X25519, Argon2id, HKDF
- Go standard library - AES-256-GCM, Ed25519, SHA-512, HMAC, crypto/rand

## License

MIT
