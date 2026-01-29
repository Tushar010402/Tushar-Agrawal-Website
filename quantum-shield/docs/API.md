# QuantumShield API Reference

## Quick Start

```rust
use quantum_shield::{QShieldKEM, QShieldSign, QuantumShield};

// Key Exchange
let (public_key, secret_key) = QShieldKEM::generate_keypair()?;
let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&public_key)?;
let decapsulated = QShieldKEM::decapsulate(&secret_key, &ciphertext)?;

// Symmetric Encryption
let cipher = QuantumShield::new(shared_secret.as_bytes())?;
let encrypted = cipher.encrypt(b"Hello, quantum world!")?;
let decrypted = cipher.decrypt(&encrypted)?;

// Digital Signatures
let (sign_pk, sign_sk) = QShieldSign::generate_keypair()?;
let signature = QShieldSign::sign(&sign_sk, b"Message to sign")?;
let valid = QShieldSign::verify(&sign_pk, b"Message to sign", &signature)?;
```

---

## QShieldKEM

Hybrid Key Encapsulation Mechanism combining X25519 and ML-KEM-768.

### Types

#### `QShieldKEMPublicKey`
Combined public key for key encapsulation.

```rust
pub struct QShieldKEMPublicKey {
    pub x25519: X25519PublicKey,
    pub ml_kem: MlKemPublicKey,
}
```

#### `QShieldKEMSecretKey`
Combined secret key with automatic zeroization.

```rust
pub struct QShieldKEMSecretKey {
    pub x25519: X25519SecretKey,
    pub ml_kem: MlKemSecretKey,
}
```

#### `QShieldKEMCiphertext`
Combined ciphertext from encapsulation.

```rust
pub struct QShieldKEMCiphertext {
    pub x25519: X25519Ciphertext,
    pub ml_kem: MlKemCiphertext,
}
```

### Methods

#### `generate_keypair()`
Generate a new hybrid key pair.

```rust
pub fn generate_keypair() -> Result<(QShieldKEMPublicKey, QShieldKEMSecretKey)>
```

**Returns:** Tuple of (public key, secret key)

**Example:**
```rust
let (public_key, secret_key) = QShieldKEM::generate_keypair()?;
```

#### `encapsulate()`
Encapsulate a shared secret to a public key.

```rust
pub fn encapsulate(
    public_key: &QShieldKEMPublicKey,
) -> Result<(QShieldKEMCiphertext, QShieldSharedSecret)>
```

**Arguments:**
- `public_key` - Recipient's public key

**Returns:** Tuple of (ciphertext, shared secret)

**Example:**
```rust
let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&recipient_pk)?;
```

#### `decapsulate()`
Decapsulate a shared secret from a ciphertext.

```rust
pub fn decapsulate(
    secret_key: &QShieldKEMSecretKey,
    ciphertext: &QShieldKEMCiphertext,
) -> Result<QShieldSharedSecret>
```

**Arguments:**
- `secret_key` - Recipient's secret key
- `ciphertext` - Ciphertext to decapsulate

**Returns:** Shared secret

---

## QShieldSign

Dual digital signature scheme combining ML-DSA-65 and SLH-DSA-SHA2-128s.

### Types

#### `QShieldSignPublicKey`
Combined public key for signature verification.

#### `QShieldSignSecretKey`
Combined secret key for signing.

#### `QShieldSignature`
Dual signature with optional timestamp.

```rust
pub struct QShieldSignature {
    pub ml_dsa: MlDsaSignature,
    pub slh_dsa: SlhDsaSignature,
    pub timestamp: Option<u64>,
}
```

### Methods

#### `generate_keypair()`
Generate a new dual signing key pair.

```rust
pub fn generate_keypair() -> Result<(QShieldSignPublicKey, QShieldSignSecretKey)>
```

#### `sign()`
Sign a message with both algorithms.

```rust
pub fn sign(
    secret_key: &QShieldSignSecretKey,
    message: &[u8],
) -> Result<QShieldSignature>
```

**Example:**
```rust
let signature = QShieldSign::sign(&secret_key, b"Important document")?;
```

#### `sign_with_timestamp()`
Sign a message with timestamp.

```rust
pub fn sign_with_timestamp(
    secret_key: &QShieldSignSecretKey,
    message: &[u8],
    timestamp: u64,
) -> Result<QShieldSignature>
```

#### `verify()`
Verify a dual signature. Both signatures must be valid.

```rust
pub fn verify(
    public_key: &QShieldSignPublicKey,
    message: &[u8],
    signature: &QShieldSignature,
) -> Result<bool>
```

**Returns:** `true` if both signatures verify, `false` otherwise

---

## QuantumShield

Cascading symmetric encryption using AES-256-GCM and ChaCha20-Poly1305.

### Constructor

#### `new()`
Create a new cipher from a shared secret.

```rust
pub fn new(shared_secret: &[u8]) -> Result<Self>
```

**Arguments:**
- `shared_secret` - Key material (any length, will be expanded)

**Example:**
```rust
let cipher = QuantumShield::new(shared_secret.as_bytes())?;
```

#### `from_keys()`
Create from explicit keys (advanced use).

```rust
pub fn from_keys(
    aes_key: &[u8; 32],
    chacha_key: &[u8; 32],
) -> Result<Self>
```

### Methods

#### `encrypt()`
Encrypt data with cascading encryption.

```rust
pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>>
```

#### `encrypt_with_aad()`
Encrypt with additional authenticated data.

```rust
pub fn encrypt_with_aad(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>>
```

#### `decrypt()`
Decrypt cascaded ciphertext.

```rust
pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>>
```

#### `decrypt_with_aad()`
Decrypt with additional authenticated data.

```rust
pub fn decrypt_with_aad(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>>
```

#### `rotate_keys()`
Rotate to new keys for forward secrecy.

```rust
pub fn rotate_keys(&mut self) -> Result<()>
```

**Warning:** Old ciphertexts cannot be decrypted after rotation.

#### `overhead()`
Get the encryption overhead in bytes.

```rust
pub fn overhead() -> usize  // Returns 56
```

---

## QShieldKDF

Key derivation functions with domain separation.

### Constructor

```rust
pub fn new() -> Self
pub fn with_config(config: KdfConfig) -> Self
```

### Methods

#### `derive()`
Derive a key using HKDF-SHA3-512.

```rust
pub fn derive(
    &self,
    ikm: &[u8],
    salt: Option<&[u8]>,
    info: &[u8],
    len: usize,
) -> Result<DerivedKey>
```

#### `combine()`
Combine multiple key materials.

```rust
pub fn combine(
    &self,
    keys: &[&[u8]],
    info: &[u8],
    len: usize,
) -> Result<DerivedKey>
```

#### `derive_from_password()`
Derive a key from password using Argon2id.

```rust
pub fn derive_from_password(
    &self,
    password: &[u8],
    salt: &[u8],
    len: usize,
) -> Result<DerivedKey>
```

**Example:**
```rust
let kdf = QShieldKDF::new();
let salt = kdf.generate_salt(32)?;
let key = kdf.derive_from_password(b"my password", &salt, 32)?;
```

---

## QShieldHandshake

Authenticated key exchange protocol.

### Constructor

```rust
// As client (initiator)
pub fn new_client(
    sign_secret_key: QShieldSignSecretKey,
    sign_public_key: QShieldSignPublicKey,
) -> Result<Self>

// As server (responder)
pub fn new_server(
    sign_secret_key: QShieldSignSecretKey,
    sign_public_key: QShieldSignPublicKey,
) -> Self
```

### Handshake Flow

```rust
// Client side
let mut client = QShieldHandshake::new_client(sign_sk, sign_pk)?;
let client_hello = client.client_hello()?;
// Send client_hello to server...
// Receive server_hello...
let client_finished = client.process_server_hello(&server_hello)?;
// Send client_finished to server...
// Receive server_finished...
let session = client.process_server_finished(&server_finished)?;

// Server side
let mut server = QShieldHandshake::new_server(sign_sk, sign_pk);
// Receive client_hello...
let server_hello = server.server_hello(&client_hello)?;
// Send server_hello to client...
// Receive client_finished...
let server_finished = server.process_client_finished(&client_finished)?;
// Send server_finished to client...
let session = server.complete_server()?;
```

---

## MessageChannel

Secure message channel with replay protection.

### Constructor

```rust
pub fn new(cipher: QuantumShield, session_id: [u8; 32]) -> Self
```

### Methods

#### `send()`
Send a data message.

```rust
pub fn send(&mut self, data: &[u8]) -> Result<QShieldMessage>
```

#### `receive()`
Receive and verify a message.

```rust
pub fn receive(&mut self, msg: &QShieldMessage) -> Result<MessageContent>
```

**Example:**
```rust
let mut channel = MessageChannel::new(cipher, session_id);

// Send
let msg = channel.send(b"Hello!")?;

// Receive
let content = channel.receive(&msg)?;
assert_eq!(content.payload, b"Hello!");
```

---

## Error Handling

All operations return `Result<T, QShieldError>`.

### Error Types

```rust
pub enum QShieldError {
    KeyGenerationFailed,
    EncapsulationFailed,
    DecapsulationFailed,
    SigningFailed,
    VerificationFailed,
    EncryptionFailed,
    DecryptionFailed,
    KeyDerivationFailed,
    InvalidKey,
    InvalidCiphertext,
    InvalidSignature,
    InvalidNonce,
    UnsupportedAlgorithm(String),
    VersionMismatch { expected: u8, actual: u8 },
    HandshakeFailed(String),
    ParseError,
    BufferTooSmall { needed: usize, got: usize },
    RngFailed,
    AuthenticationFailed,
    NotSupported,
    InternalError,
}
```

### Security-Sensitive Errors

Some errors are intentionally vague to prevent oracle attacks:
- `DecapsulationFailed`
- `VerificationFailed`
- `DecryptionFailed`
- `AuthenticationFailed`

Use `error.is_security_sensitive()` to check.

---

## Serialization

All key types implement `Serialize` and `Deserialize` traits.

```rust
use quantum_shield::utils::serialize::{Serialize, Deserialize};

// Serialize
let bytes = public_key.serialize()?;

// Deserialize
let restored = QShieldKEMPublicKey::deserialize(&bytes)?;
```
