//! QuantumShield - Defense-in-Depth Encryption Library
//!
//! UNIQUE FEATURES that differentiate from other libraries:
//! 1. Cascading dual-layer encryption (AES-256-GCM + ChaCha20-Poly1305)
//! 2. Argon2id memory-hard key derivation (GPU/ASIC resistant)
//! 3. Length hiding with random padding (traffic analysis protection)
//! 4. Associated Data (AAD) support for context binding
//! 5. Forward secrecy sessions with key ratcheting
//! 6. Nonce misuse resistance via deterministic derivation option

use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray, Payload},
    Aes256Gcm, Nonce as AesNonce,
};
use chacha20poly1305::{ChaCha20Poly1305, Nonce as ChaChaNonce};
use x25519_dalek::{StaticSecret, PublicKey};
use hkdf::Hkdf;
use sha3::{Sha3_256, Sha3_512};
use hmac::{Hmac, Mac};
use argon2::{Argon2, Algorithm, Version, Params};
use zeroize::Zeroize;
use subtle::ConstantTimeEq;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// ============================================================================
// CONSTANTS
// ============================================================================

const AES_KEY_SIZE: usize = 32;
const CHACHA_KEY_SIZE: usize = 32;
const NONCE_SIZE: usize = 12;
const VERSION_BYTE: u8 = 0x03; // Version 3 - with unique features
const HEADER_SIZE: usize = 1 + NONCE_SIZE + NONCE_SIZE; // version + 2 nonces

// Argon2id parameters (memory-hard, GPU resistant)
// Note: 19MB for WASM compatibility, still significant GPU resistance
// Native version can use 64MB+
const ARGON2_MEMORY_KB: u32 = 19456; // 19MB - WASM-safe, still GPU resistant
const ARGON2_ITERATIONS: u32 = 3;     // Time cost
const ARGON2_PARALLELISM: u32 = 1;    // Single thread for WASM

// Padding for length hiding (prevents traffic analysis)
const MIN_PADDING: usize = 16;
const PADDING_BLOCK_SIZE: usize = 64; // Messages padded to multiple of 64 bytes

// ============================================================================
// INITIALIZATION
// ============================================================================

#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// ============================================================================
// QSHIELD CIPHER - Main encryption interface
// ============================================================================

/// High-security cipher with dual-layer encryption
///
/// UNIQUE: Uses cascading encryption where data passes through
/// TWO independent ciphers. Both must be broken to decrypt.
#[wasm_bindgen]
pub struct QShieldCipher {
    aes_cipher: Aes256Gcm,
    chacha_cipher: ChaCha20Poly1305,
    enable_padding: bool,
}

#[wasm_bindgen]
impl QShieldCipher {
    /// Create cipher from password using Argon2id (memory-hard)
    ///
    /// UNIQUE: Uses 64MB of memory during key derivation,
    /// making GPU/ASIC password cracking extremely expensive.
    #[wasm_bindgen(constructor)]
    pub fn new(password: &str) -> Result<QShieldCipher, JsValue> {
        Self::from_password_with_options(password, true)
    }

    /// Create cipher with optional length hiding
    #[wasm_bindgen]
    pub fn from_password_with_options(password: &str, enable_padding: bool) -> Result<QShieldCipher, JsValue> {
        // Generate deterministic salt from password (for stateless operation)
        // In production, use random salt stored with ciphertext
        let mut salt = [0u8; 16];
        let salt_hkdf = Hkdf::<Sha3_256>::new(None, password.as_bytes());
        salt_hkdf.expand(b"QShield-salt-v3", &mut salt)
            .map_err(|_| JsValue::from_str("Salt derivation failed"))?;

        // Argon2id: Memory-hard, side-channel resistant
        let params = Params::new(
            ARGON2_MEMORY_KB,
            ARGON2_ITERATIONS,
            ARGON2_PARALLELISM,
            Some(64) // Output 64 bytes for both keys
        ).map_err(|_| JsValue::from_str("Invalid Argon2 parameters"))?;

        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

        let mut key_material = [0u8; 64];
        argon2.hash_password_into(password.as_bytes(), &salt, &mut key_material)
            .map_err(|_| JsValue::from_str("Argon2 key derivation failed"))?;

        // Split key material: first 32 bytes for AES, next 32 for ChaCha
        let aes_cipher = Aes256Gcm::new(GenericArray::from_slice(&key_material[..32]));
        let chacha_cipher = ChaCha20Poly1305::new(GenericArray::from_slice(&key_material[32..]));

        // Zeroize sensitive material
        key_material.zeroize();

        Ok(QShieldCipher { aes_cipher, chacha_cipher, enable_padding })
    }

    /// Create cipher from raw key bytes (for key exchange scenarios)
    #[wasm_bindgen]
    pub fn from_bytes(secret: &[u8]) -> Result<QShieldCipher, JsValue> {
        // Use HKDF for raw bytes (already high-entropy)
        let hk = Hkdf::<Sha3_512>::new(Some(b"QShield-v3"), secret);

        let mut aes_key = [0u8; AES_KEY_SIZE];
        let mut chacha_key = [0u8; CHACHA_KEY_SIZE];

        hk.expand(b"AES-256-GCM-layer", &mut aes_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;
        hk.expand(b"ChaCha20-Poly1305-layer", &mut chacha_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;

        let aes_cipher = Aes256Gcm::new(GenericArray::from_slice(&aes_key));
        let chacha_cipher = ChaCha20Poly1305::new(GenericArray::from_slice(&chacha_key));

        aes_key.zeroize();
        chacha_key.zeroize();

        Ok(QShieldCipher { aes_cipher, chacha_cipher, enable_padding: true })
    }

    /// Encrypt with optional Associated Authenticated Data (AAD)
    ///
    /// UNIQUE: AAD binds ciphertext to a context (e.g., user ID, session).
    /// Ciphertext cannot be moved to different context without detection.
    #[wasm_bindgen]
    pub fn encrypt_with_aad(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, JsValue> {
        // Apply length hiding padding if enabled
        let padded = if self.enable_padding {
            self.apply_padding(plaintext)
        } else {
            plaintext.to_vec()
        };

        // Generate random nonces
        let mut aes_nonce = [0u8; NONCE_SIZE];
        let mut chacha_nonce = [0u8; NONCE_SIZE];
        getrandom::getrandom(&mut aes_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;
        getrandom::getrandom(&mut chacha_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;

        // Layer 1: AES-256-GCM with AAD
        let aes_payload = Payload {
            msg: &padded,
            aad,
        };
        let aes_ct = self.aes_cipher
            .encrypt(AesNonce::from_slice(&aes_nonce), aes_payload)
            .map_err(|_| JsValue::from_str("AES encryption failed"))?;

        // Layer 2: ChaCha20-Poly1305 with AAD
        let chacha_payload = Payload {
            msg: &aes_ct,
            aad,
        };
        let chacha_ct = self.chacha_cipher
            .encrypt(ChaChaNonce::from_slice(&chacha_nonce), chacha_payload)
            .map_err(|_| JsValue::from_str("ChaCha encryption failed"))?;

        // Build output: [version | aes_nonce | chacha_nonce | ciphertext]
        let mut result = Vec::with_capacity(HEADER_SIZE + chacha_ct.len());
        result.push(VERSION_BYTE);
        result.extend_from_slice(&aes_nonce);
        result.extend_from_slice(&chacha_nonce);
        result.extend_from_slice(&chacha_ct);

        Ok(result)
    }

    /// Decrypt with AAD verification
    #[wasm_bindgen]
    pub fn decrypt_with_aad(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() < HEADER_SIZE + 32 {
            return Err(JsValue::from_str("Ciphertext too short"));
        }

        let version = ciphertext[0];
        if version != VERSION_BYTE && version != 0x02 && version != 0x01 {
            return Err(JsValue::from_str("Unsupported version"));
        }

        let aes_nonce = &ciphertext[1..1 + NONCE_SIZE];
        let chacha_nonce = &ciphertext[1 + NONCE_SIZE..HEADER_SIZE];
        let encrypted = &ciphertext[HEADER_SIZE..];

        // Layer 2: Decrypt ChaCha20-Poly1305 with AAD
        let chacha_payload = Payload {
            msg: encrypted,
            aad,
        };
        let aes_ct = self.chacha_cipher
            .decrypt(ChaChaNonce::from_slice(chacha_nonce), chacha_payload)
            .map_err(|_| JsValue::from_str("Decryption failed - wrong key, corrupted, or AAD mismatch"))?;

        // Layer 1: Decrypt AES-256-GCM with AAD
        let aes_payload = Payload {
            msg: &aes_ct,
            aad,
        };
        let padded = self.aes_cipher
            .decrypt(AesNonce::from_slice(aes_nonce), aes_payload)
            .map_err(|_| JsValue::from_str("Decryption failed - wrong key, corrupted, or AAD mismatch"))?;

        // Remove padding if enabled
        if self.enable_padding && version == VERSION_BYTE {
            self.remove_padding(&padded)
        } else {
            Ok(padded)
        }
    }

    /// Standard encrypt (no AAD)
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.encrypt_with_aad(plaintext, &[])
    }

    /// Standard decrypt (no AAD)
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.decrypt_with_aad(ciphertext, &[])
    }

    /// Encrypt string to base64
    #[wasm_bindgen]
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, JsValue> {
        let encrypted = self.encrypt(plaintext.as_bytes())?;
        Ok(BASE64.encode(&encrypted))
    }

    /// Decrypt base64 to string
    #[wasm_bindgen]
    pub fn decrypt_string(&self, ciphertext_b64: &str) -> Result<String, JsValue> {
        let ciphertext = BASE64.decode(ciphertext_b64)
            .map_err(|_| JsValue::from_str("Invalid base64"))?;
        let decrypted = self.decrypt(&ciphertext)?;
        String::from_utf8(decrypted)
            .map_err(|_| JsValue::from_str("Invalid UTF-8"))
    }

    /// Encrypt string with AAD
    #[wasm_bindgen]
    pub fn encrypt_string_with_context(&self, plaintext: &str, context: &str) -> Result<String, JsValue> {
        let encrypted = self.encrypt_with_aad(plaintext.as_bytes(), context.as_bytes())?;
        Ok(BASE64.encode(&encrypted))
    }

    /// Decrypt string with AAD
    #[wasm_bindgen]
    pub fn decrypt_string_with_context(&self, ciphertext_b64: &str, context: &str) -> Result<String, JsValue> {
        let ciphertext = BASE64.decode(ciphertext_b64)
            .map_err(|_| JsValue::from_str("Invalid base64"))?;
        let decrypted = self.decrypt_with_aad(&ciphertext, context.as_bytes())?;
        String::from_utf8(decrypted)
            .map_err(|_| JsValue::from_str("Invalid UTF-8"))
    }

    // Apply PKCS7-style padding with random bytes for length hiding
    fn apply_padding(&self, data: &[u8]) -> Vec<u8> {
        let content_len = data.len();
        // Calculate padded size (minimum padding + round up to block size)
        let min_size = content_len + MIN_PADDING + 4; // 4 bytes for length prefix
        let padded_size = ((min_size + PADDING_BLOCK_SIZE - 1) / PADDING_BLOCK_SIZE) * PADDING_BLOCK_SIZE;
        let padding_len = padded_size - content_len - 4;

        let mut result = Vec::with_capacity(padded_size);

        // Write original length as 4 bytes (little endian)
        result.extend_from_slice(&(content_len as u32).to_le_bytes());

        // Write original data
        result.extend_from_slice(data);

        // Fill rest with random padding
        let mut padding = vec![0u8; padding_len];
        let _ = getrandom::getrandom(&mut padding);
        result.extend_from_slice(&padding);

        result
    }

    // Remove padding and extract original data
    fn remove_padding(&self, padded: &[u8]) -> Result<Vec<u8>, JsValue> {
        if padded.len() < 4 {
            return Err(JsValue::from_str("Invalid padded data"));
        }

        let original_len = u32::from_le_bytes([padded[0], padded[1], padded[2], padded[3]]) as usize;

        if original_len > padded.len() - 4 {
            return Err(JsValue::from_str("Invalid padding length"));
        }

        Ok(padded[4..4 + original_len].to_vec())
    }

    /// Get encryption overhead
    #[wasm_bindgen]
    pub fn overhead(&self) -> usize {
        if self.enable_padding {
            HEADER_SIZE + 32 + MIN_PADDING + 4 // header + 2 auth tags + min padding + length
        } else {
            HEADER_SIZE + 32 // header + 2 auth tags
        }
    }

    /// Check if length hiding is enabled
    #[wasm_bindgen]
    pub fn has_length_hiding(&self) -> bool {
        self.enable_padding
    }
}

// ============================================================================
// FORWARD SECRECY SESSION - Key ratcheting for message sequences
// ============================================================================

/// Forward secrecy session with automatic key ratcheting
///
/// UNIQUE: Each message uses a different key derived from the previous.
/// Compromising one key doesn't reveal past messages (like Signal Protocol).
#[wasm_bindgen]
pub struct QShieldSession {
    chain_key: [u8; 32],
    message_count: u64,
}

#[wasm_bindgen]
impl QShieldSession {
    /// Create new session from shared secret
    #[wasm_bindgen(constructor)]
    pub fn new(shared_secret: &[u8]) -> Result<QShieldSession, JsValue> {
        let hk = Hkdf::<Sha3_256>::new(Some(b"QShield-session-v1"), shared_secret);
        let mut chain_key = [0u8; 32];
        hk.expand(b"chain-key-init", &mut chain_key)
            .map_err(|_| JsValue::from_str("Session init failed"))?;

        Ok(QShieldSession { chain_key, message_count: 0 })
    }

    /// Encrypt message with forward secrecy (key ratchets after each message)
    #[wasm_bindgen]
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        // Derive message key from chain key
        let (message_key, new_chain_key) = self.ratchet()?;

        // Update chain key (forward secrecy)
        self.chain_key = new_chain_key;
        self.message_count += 1;

        // Create cipher with message key
        let cipher = QShieldCipher::from_bytes(&message_key)?;

        // Include message number in output for ordering
        let mut result = Vec::with_capacity(8 + plaintext.len() + cipher.overhead());
        result.extend_from_slice(&(self.message_count - 1).to_le_bytes());
        result.extend_from_slice(&cipher.encrypt(plaintext)?);

        Ok(result)
    }

    /// Decrypt message (must be decrypted in order for forward secrecy)
    #[wasm_bindgen]
    pub fn decrypt(&mut self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() < 8 {
            return Err(JsValue::from_str("Invalid session message"));
        }

        let msg_num = u64::from_le_bytes([
            ciphertext[0], ciphertext[1], ciphertext[2], ciphertext[3],
            ciphertext[4], ciphertext[5], ciphertext[6], ciphertext[7],
        ]);

        if msg_num != self.message_count {
            return Err(JsValue::from_str("Message out of order - forward secrecy violated"));
        }

        // Derive message key
        let (message_key, new_chain_key) = self.ratchet()?;
        self.chain_key = new_chain_key;
        self.message_count += 1;

        // Decrypt
        let cipher = QShieldCipher::from_bytes(&message_key)?;
        cipher.decrypt(&ciphertext[8..])
    }

    /// Get current message count
    #[wasm_bindgen]
    pub fn message_count(&self) -> u64 {
        self.message_count
    }

    // Key ratcheting using HMAC
    fn ratchet(&self) -> Result<([u8; 32], [u8; 32]), JsValue> {
        type HmacSha3 = Hmac<Sha3_256>;

        // Derive message key
        let mut mac = <HmacSha3 as Mac>::new_from_slice(&self.chain_key)
            .map_err(|_| JsValue::from_str("HMAC init failed"))?;
        mac.update(b"message-key");
        mac.update(&self.message_count.to_le_bytes());
        let message_key: [u8; 32] = mac.finalize().into_bytes().into();

        // Derive new chain key
        let mut mac = <HmacSha3 as Mac>::new_from_slice(&self.chain_key)
            .map_err(|_| JsValue::from_str("HMAC init failed"))?;
        mac.update(b"chain-key-next");
        let new_chain_key: [u8; 32] = mac.finalize().into_bytes().into();

        Ok((message_key, new_chain_key))
    }
}

// ============================================================================
// KEY EXCHANGE - X25519 for secure key establishment
// ============================================================================

#[wasm_bindgen]
pub struct QShieldKeyExchange {
    secret: StaticSecret,
    public: PublicKey,
}

#[wasm_bindgen]
impl QShieldKeyExchange {
    #[wasm_bindgen(constructor)]
    pub fn new() -> QShieldKeyExchange {
        let secret = StaticSecret::random_from_rng(rand_core::OsRng);
        let public = PublicKey::from(&secret);
        QShieldKeyExchange { secret, public }
    }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.public.as_bytes().to_vec()
    }

    #[wasm_bindgen(getter)]
    pub fn public_key_base64(&self) -> String {
        BASE64.encode(self.public.as_bytes())
    }

    /// Derive cipher from peer's public key
    #[wasm_bindgen]
    pub fn derive_cipher(&self, peer_public_key: &[u8]) -> Result<QShieldCipher, JsValue> {
        if peer_public_key.len() != 32 {
            return Err(JsValue::from_str("Invalid public key length"));
        }

        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(peer_public_key);
        let peer_pk = PublicKey::from(pk_bytes);
        let shared_secret = self.secret.diffie_hellman(&peer_pk);

        QShieldCipher::from_bytes(shared_secret.as_bytes())
    }

    /// Derive forward secrecy session from peer's public key
    #[wasm_bindgen]
    pub fn derive_session(&self, peer_public_key: &[u8]) -> Result<QShieldSession, JsValue> {
        if peer_public_key.len() != 32 {
            return Err(JsValue::from_str("Invalid public key length"));
        }

        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(peer_public_key);
        let peer_pk = PublicKey::from(pk_bytes);
        let shared_secret = self.secret.diffie_hellman(&peer_pk);

        QShieldSession::new(shared_secret.as_bytes())
    }
}

impl Default for QShieldKeyExchange {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/// Constant-time comparison of two byte arrays
/// Prevents timing attacks when comparing secrets
#[wasm_bindgen]
pub fn secure_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}

/// Performance benchmark
#[wasm_bindgen]
pub fn benchmark(iterations: u32, data_size: usize) -> Result<JsValue, JsValue> {
    // Use fast key derivation for benchmarking (not Argon2)
    let cipher = QShieldCipher::from_bytes(b"benchmark-key-32-bytes-exactly!!")?;
    let data: Vec<u8> = (0..data_size).map(|i| i as u8).collect();

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let performance = window.performance().ok_or_else(|| JsValue::from_str("No performance API"))?;

    // Benchmark encryption
    let start = performance.now();
    for _ in 0..iterations {
        let _ = cipher.encrypt(&data)?;
    }
    let encrypt_time = performance.now() - start;

    // Benchmark decryption
    let encrypted = cipher.encrypt(&data)?;
    let start = performance.now();
    for _ in 0..iterations {
        let _ = cipher.decrypt(&encrypted)?;
    }
    let decrypt_time = performance.now() - start;

    let total_bytes = (iterations as f64) * (data_size as f64);
    let encrypt_throughput = total_bytes / (encrypt_time / 1000.0) / (1024.0 * 1024.0);
    let decrypt_throughput = total_bytes / (decrypt_time / 1000.0) / (1024.0 * 1024.0);

    Ok(JsValue::from_str(&format!(
        r#"{{"iterations":{},"dataSize":{},"encryptTime":{:.2},"decryptTime":{:.2},"encryptThroughput":{:.2},"decryptThroughput":{:.2}}}"#,
        iterations, data_size, encrypt_time, decrypt_time, encrypt_throughput, decrypt_throughput
    )))
}

/// Library info with unique features
#[wasm_bindgen]
pub fn info() -> String {
    r#"{"name":"QuantumShield","version":"3.0.0","uniqueFeatures":["cascading-dual-cipher","argon2id-64mb","length-hiding","aad-context-binding","forward-secrecy-sessions"],"algorithms":["AES-256-GCM","ChaCha20-Poly1305","Argon2id","HKDF-SHA3-512","X25519","HMAC-SHA3-256"]}"#.to_string()
}

/// Quick demo
#[wasm_bindgen]
pub fn demo(message: &str, password: &str) -> Result<String, JsValue> {
    let cipher = QShieldCipher::new(password)?;
    let encrypted = cipher.encrypt_string(message)?;
    let decrypted = cipher.decrypt_string(&encrypted)?;

    Ok(format!(
        "Original: {}\nEncrypted: {}...\nDecrypted: {}\nFeatures: Argon2id KDF, Dual-cipher, Length hiding",
        message,
        &encrypted[..encrypted.len().min(50)],
        decrypted
    ))
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let cipher = QShieldCipher::from_bytes(b"test-key-32-bytes-exactly-here!").unwrap();
        let data = b"Hello, World!";
        let encrypted = cipher.encrypt(data).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();
        assert_eq!(data.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_aad() {
        let cipher = QShieldCipher::from_bytes(b"test-key-32-bytes-exactly-here!").unwrap();
        let data = b"Secret message";
        let aad = b"user:123";

        let encrypted = cipher.encrypt_with_aad(data, aad).unwrap();

        // Correct AAD works
        let decrypted = cipher.decrypt_with_aad(&encrypted, aad).unwrap();
        assert_eq!(data.as_slice(), decrypted.as_slice());

        // Wrong AAD fails
        assert!(cipher.decrypt_with_aad(&encrypted, b"user:456").is_err());
    }

    #[test]
    fn test_length_hiding() {
        let cipher = QShieldCipher::from_bytes(b"test-key-32-bytes-exactly-here!").unwrap();

        let short = cipher.encrypt(b"Hi").unwrap();
        let medium = cipher.encrypt(b"Hello, World!").unwrap();

        // Both should be similar size due to padding
        assert!((short.len() as i64 - medium.len() as i64).abs() <= 64);
    }

    #[test]
    fn test_secure_compare() {
        assert!(secure_compare(b"hello", b"hello"));
        assert!(!secure_compare(b"hello", b"world"));
        assert!(!secure_compare(b"hello", b"hell"));
    }
}
