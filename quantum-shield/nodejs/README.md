# @quantumshield/node

**QuantumShield Node.js SDK** — Post-quantum defense-in-depth encryption for Node.js applications.

## Overview

This SDK provides cascading dual-cipher encryption (AES-256-GCM + ChaCha20-Poly1305), X25519 key exchange, forward secrecy sessions, and HKDF key derivation — all using Node.js built-in `crypto` module with zero external dependencies.

When the WASM module is available, the SDK automatically upgrades to include post-quantum algorithms: ML-KEM-768 hybrid key encapsulation and ML-DSA-65 + SLH-DSA dual digital signatures.

## Features

| Feature | Node.js Fallback | With WASM |
|---------|:---:|:---:|
| Cascading AES-256-GCM + ChaCha20-Poly1305 | Yes | Yes |
| Length-hiding padding | Yes | Yes |
| AAD (additional authenticated data) | Yes | Yes |
| X25519 key exchange | Yes | Yes |
| Forward secrecy sessions (key ratcheting) | Yes | Yes |
| HKDF-SHA512 key derivation | Yes | Yes |
| scrypt / Argon2id password hashing | scrypt | Argon2id |
| ML-KEM-768 hybrid KEM (FIPS 203) | No | Yes |
| ML-DSA-65 + SLH-DSA signatures (FIPS 204/205) | No | Yes |

## Installation

```bash
npm install @quantumshield/node
```

## Quick Start

```typescript
import { init, QShieldCipher, QShieldKeyExchange, QShieldSession } from '@quantumshield/node';

// Initialize (loads WASM if available)
await init();

// --- Symmetric Encryption ---
const cipher = QShieldCipher.fromPassword('my-secret-password');
const encrypted = cipher.encryptString('Hello, quantum world!');
const decrypted = cipher.decryptString(encrypted);
console.log(decrypted); // "Hello, quantum world!"

// --- Key Exchange ---
const alice = new QShieldKeyExchange();
const bob = new QShieldKeyExchange();

const aliceCipher = alice.deriveCipher(bob.publicKey);
const bobCipher = bob.deriveCipher(alice.publicKey);

const secret = aliceCipher.encryptString('Secret message');
const revealed = bobCipher.decryptString(secret);

// --- Forward Secrecy Session ---
const sharedSecret = alice.deriveSharedSecret(bob.publicKey);
const senderSession = new QShieldSession(sharedSecret);
const receiverSession = new QShieldSession(sharedSecret);

const msg = senderSession.encrypt(new TextEncoder().encode('Forward secret!'));
const plain = receiverSession.decrypt(msg);
```

## API Reference

### `init(wasmPath?: string): Promise<void>`

Initialize the SDK. Attempts to load the WASM module for post-quantum support. Falls back to Node.js crypto automatically.

### `QShieldCipher`

Cascading dual-layer symmetric cipher (AES-256-GCM then ChaCha20-Poly1305).

```typescript
// From password (uses scrypt/Argon2id KDF)
const cipher = QShieldCipher.fromPassword('password');
const cipher = QShieldCipher.fromPassword('password', false); // disable padding

// From raw key bytes (uses HKDF-SHA512)
const cipher = QShieldCipher.fromBytes(keyBytes);

// Encrypt/Decrypt
cipher.encrypt(plaintext: Uint8Array): Uint8Array
cipher.decrypt(ciphertext: Uint8Array): Uint8Array
cipher.encryptString(plaintext: string): string  // returns base64
cipher.decryptString(ciphertextB64: string): string

// With AAD
cipher.encryptWithAad(plaintext: Uint8Array, aad: Uint8Array): Uint8Array
cipher.decryptWithAad(ciphertext: Uint8Array, aad: Uint8Array): Uint8Array
```

### `QShieldKeyExchange`

X25519 Diffie-Hellman key exchange.

```typescript
const kx = new QShieldKeyExchange();
kx.publicKey          // Uint8Array (32 bytes)
kx.publicKeyBase64    // string

kx.deriveSharedSecret(peerPublicKey: Uint8Array): Uint8Array
kx.deriveCipher(peerPublicKey: Uint8Array): NodeCipher
```

### `QShieldSession`

Forward secrecy session with HMAC-based key ratcheting.

```typescript
const session = new QShieldSession(sharedSecret);

session.encrypt(plaintext: Uint8Array): Uint8Array
session.decrypt(ciphertext: Uint8Array): Uint8Array
session.messageCount  // number
```

### Standalone Crypto Functions

```typescript
import {
  aesGcmEncrypt, aesGcmDecrypt,
  chachaEncrypt, chachaDecrypt,
  hkdfDerive, hkdfDeriveSync,
  scryptDerive, scryptDeriveSync,
  secureCompare,
  quickEncrypt, quickDecrypt,
} from '@quantumshield/node';
```

### Post-Quantum (WASM required)

```typescript
// Hybrid KEM: X25519 + ML-KEM-768
const alice = new QShieldHybridKEM();
const bob = new QShieldHybridKEM();
const { ciphertext, sharedSecret } = alice.encapsulate(bob.publicKey);
const bobSecret = bob.decapsulate(ciphertext);

// Dual Signatures: ML-DSA-65 + SLH-DSA-SHAKE-128f
const signer = new QShieldSign();
const signature = signer.sign(message);
const valid = signer.verify(message, signature);
```

## Security Model

**Defense in depth:** Data is encrypted with AES-256-GCM first, then the entire AES ciphertext (including its authentication tag) is encrypted again with ChaCha20-Poly1305. An attacker must break BOTH ciphers to recover plaintext.

**Wire format:**
```
[version (1 byte)] [AES nonce (12)] [ChaCha nonce (12)] [ciphertext]
```

**Length hiding:** By default, plaintext is padded to 64-byte boundaries before encryption, preventing traffic analysis based on ciphertext size.

**Forward secrecy:** Sessions ratchet the chain key after each message using HMAC, so compromising the current key cannot decrypt past messages.

## Requirements

- Node.js >= 18.0.0
- No external dependencies (uses built-in `crypto` module)

## License

MIT
