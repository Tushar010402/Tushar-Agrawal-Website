# QuantumShield WASM SDK

Post-quantum defense-in-depth encryption for the browser. Built on NIST FIPS 203/204/205 standards.

## Features

- **Cascading dual-layer encryption** — AES-256-GCM + ChaCha20-Poly1305
- **Argon2id key derivation** — 19MB memory-hard, GPU/ASIC resistant
- **Length hiding** — Random padding defeats traffic analysis
- **Hybrid KEM** — X25519 + ML-KEM-768 (FIPS 203, NIST Level 3)
- **Dual signatures** — ML-DSA-65 (FIPS 204) + SLH-DSA-SHAKE-128f (FIPS 205)
- **Forward secrecy sessions** — HMAC-SHA3-256 key ratcheting
- **Pure Rust / WASM** — No native dependencies, runs in any browser

## Installation

```bash
npm install quantum-shield
```

## Quick Start

```typescript
import init, { QShieldCipher, QShieldHybridKEM, QShieldSign } from 'quantum-shield';

// Initialize WASM (required once)
await init();

// Encrypt a message
const cipher = new QShieldCipher('my-password');
const encrypted = cipher.encrypt_string('Hello, quantum world!');
const decrypted = cipher.decrypt_string(encrypted);
```

## API Reference

### QShieldCipher — Symmetric Encryption

Cascading AES-256-GCM + ChaCha20-Poly1305 with optional length hiding.

```typescript
// From password (Argon2id KDF, padding enabled)
const cipher = new QShieldCipher('password');

// From password with explicit padding control
const cipher = QShieldCipher.from_password_with_options('password', false);

// From raw key bytes (HKDF-SHA3-512)
const cipher = QShieldCipher.from_bytes(keyBytes);

// Encrypt / decrypt bytes
const encrypted = cipher.encrypt(plaintext);       // Uint8Array
const decrypted = cipher.decrypt(encrypted);        // Uint8Array

// With associated data (AAD) for context binding
const encrypted = cipher.encrypt_with_aad(data, aad);
const decrypted = cipher.decrypt_with_aad(encrypted, aad);

// String convenience (base64-encoded ciphertext)
const b64 = cipher.encrypt_string('hello');
const text = cipher.decrypt_string(b64);

// Metadata
cipher.overhead();          // Encryption overhead in bytes
cipher.has_length_hiding(); // Whether padding is enabled
```

### QShieldHybridKEM — Post-Quantum Key Exchange

Hybrid X25519 + ML-KEM-768 key encapsulation. If either algorithm is secure, the system is secure.

```typescript
// Generate keypairs
const alice = new QShieldHybridKEM();
const bob = new QShieldHybridKEM();

// Key encapsulation
const encap = alice.encapsulate(bob.public_key);
const bobSecret = bob.decapsulate(encap.ciphertext);
// encap.shared_secret equals bobSecret (64 bytes)

// One-shot cipher derivation
const result = alice.derive_cipher(bob.public_key);
// Send result.ciphertext to Bob
const encrypted = result.encrypt(plaintext);

// Bob derives cipher from ciphertext
const bobCipher = bob.derive_cipher_from_ciphertext(result.ciphertext);
const decrypted = bobCipher.decrypt(encrypted);

// Properties
alice.public_key;          // Uint8Array (1216 bytes)
alice.public_key_base64;   // string
QShieldHybridKEM.public_key_size(); // 1216
```

### QShieldSign — Dual Post-Quantum Signatures

ML-DSA-65 (lattice) + SLH-DSA-SHAKE-128f (hash-based). Both must verify.

```typescript
// Generate signing keypair
const signer = new QShieldSign();

// Sign
const signature = signer.sign(messageBytes);
const signature = signer.sign_string('message');

// Verify
const valid = signer.verify(messageBytes, signature);
const valid = signer.verify_string('message', signature);

// Properties
signer.public_key;          // Uint8Array (1984 bytes)
signer.public_key_base64;   // string
QShieldSign.public_key_info(); // JSON with size breakdown
```

### QShieldVerifier — Verify Without Private Key

```typescript
// From raw public key
const verifier = new QShieldVerifier(publicKeyBytes);

// From base64
const verifier = QShieldVerifier.from_base64(pkBase64);

// Verify
const valid = verifier.verify(message, signature);
const valid = verifier.verify_string('message', signature);
const valid = verifier.verify_base64(message, signatureBase64);
```

### DualSignature — Signature Serialization

```typescript
// Accessors
signature.bytes;              // Combined bytes (length-prefixed)
signature.base64;             // Base64 encoding
signature.mldsa_signature;    // ML-DSA-65 component (3309 bytes)
signature.slhdsa_signature;   // SLH-DSA component (17088 bytes)

// Parse
const sig = DualSignature.from_bytes(data);
const sig = DualSignature.from_base64(b64String);

DualSignature.size_info();    // JSON with size breakdown
```

### QShieldSession — Forward Secrecy

Each message uses a unique key. Past messages cannot be decrypted after ratcheting.

```typescript
const sender = new QShieldSession(sharedSecret);
const receiver = new QShieldSession(sharedSecret);

const encrypted = sender.encrypt(plaintext);
const decrypted = receiver.decrypt(encrypted);
// Messages must be decrypted in order

sender.message_count; // number of messages sent
```

### QShieldKeyExchange — Classical X25519

For backward compatibility. Prefer `QShieldHybridKEM` for new applications.

```typescript
const alice = new QShieldKeyExchange();
const bob = new QShieldKeyExchange();

const cipher = alice.derive_cipher(bob.public_key);
```

### Utility Functions

```typescript
secure_compare(a, b);                    // Constant-time comparison
info();                                   // Library info as JSON string
demo('message', 'password');             // Quick demo
benchmark(iterations, dataSize);          // Encryption throughput
benchmark_hybrid_kem(iterations);         // KEM performance
benchmark_dual_signatures(iterations);    // Signature performance
```

## Build from Source

Prerequisites: [Rust](https://rustup.rs/), [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

```bash
# Build WASM package
cd quantum-shield/wasm
npm run build

# Run tests (requires Firefox or Chrome)
npm test

# Build for Node.js
npm run build:node

# Build for bundlers (webpack, etc.)
npm run build:bundler
```

## Browser Usage

```html
<script type="module">
  import init, { QShieldCipher } from './pkg/quantum_shield.js';

  await init();
  const cipher = new QShieldCipher('password');
  const encrypted = cipher.encrypt_string('Hello!');
  console.log('Encrypted:', encrypted);
</script>
```

## Bundler Usage (Webpack, Vite, etc.)

```typescript
import init, { QShieldCipher } from 'quantum-shield';

async function main() {
  await init();
  const cipher = new QShieldCipher('password');
  // ...
}
```

## Size and Performance

| Metric | Value |
|--------|-------|
| WASM binary | ~1.5 MB (gzipped ~500 KB) |
| Argon2id memory | 19 MB (safe for browsers) |
| Hybrid KEM keygen | ~5–15 ms |
| Encapsulate/Decapsulate | ~2–5 ms |
| Signature keygen | ~10–30 ms |
| Sign (dual) | ~20–50 ms |
| Verify (dual) | ~5–15 ms |
| Symmetric encrypt (1 KB) | < 1 ms |

*Performance varies by device and browser. Use `benchmark*()` functions to measure.*

## Security

- **Argon2id at 19 MB** — Lower than the recommended 64 MB for native apps, but necessary for WASM memory constraints. Still provides strong GPU/ASIC resistance.
- **Length hiding** — Enabled by default. Pads messages to 64-byte boundaries with random data.
- **Constant-time comparison** — `secure_compare()` uses the `subtle` crate for timing-attack resistance.
- **Zeroize** — Key material is zeroed from memory after use.
- **No side-channel leaks** — All crypto operations use constant-time implementations.

## NIST Standards

| Standard | Algorithm | Use |
|----------|-----------|-----|
| FIPS 203 | ML-KEM-768 | Key encapsulation (Level 3) |
| FIPS 204 | ML-DSA-65 | Digital signatures (lattice-based) |
| FIPS 205 | SLH-DSA-SHAKE-128f | Digital signatures (hash-based) |

## License

MIT
