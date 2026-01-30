//! QuantumShield WASM Demo - Lightning Fast Edition
//!
//! Optimized for maximum performance while maintaining security:
//! - Inline critical paths
//! - Stack-based buffers (no heap allocation for small data)
//! - Pre-computed key expansion
//! - Batch processing for large data
//! - Zero-copy operations where possible

use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray},
    Aes256Gcm, Nonce as AesNonce,
};
use chacha20poly1305::{ChaCha20Poly1305, Nonce as ChaChaNonce};
use x25519_dalek::{StaticSecret, PublicKey};
use hkdf::Hkdf;
use sha3::Sha3_512;
use zeroize::Zeroize;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

// Constants for optimal performance
const AES_KEY_SIZE: usize = 32;
const CHACHA_KEY_SIZE: usize = 32;
const NONCE_SIZE: usize = 12;
const VERSION_BYTE: u8 = 0x02; // Version 2 - optimized
const HEADER_SIZE: usize = 1 + NONCE_SIZE + NONCE_SIZE; // version + 2 nonces

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// High-performance cipher with pre-expanded keys
#[wasm_bindgen]
pub struct QShieldCipher {
    aes_cipher: Aes256Gcm,
    chacha_cipher: ChaCha20Poly1305,
}

#[wasm_bindgen]
impl QShieldCipher {
    /// Create cipher from password - keys are pre-expanded for speed
    #[wasm_bindgen(constructor)]
    pub fn new(password: &str) -> Result<QShieldCipher, JsValue> {
        Self::from_bytes(password.as_bytes())
    }

    /// Create cipher from raw bytes
    #[wasm_bindgen]
    pub fn from_bytes(secret: &[u8]) -> Result<QShieldCipher, JsValue> {
        // Derive keys using HKDF-SHA3-512
        let hk = Hkdf::<Sha3_512>::new(Some(b"QShield-v2"), secret);

        let mut aes_key = [0u8; AES_KEY_SIZE];
        let mut chacha_key = [0u8; CHACHA_KEY_SIZE];

        hk.expand(b"AES-256-GCM", &mut aes_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;
        hk.expand(b"ChaCha20-Poly1305", &mut chacha_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;

        // Pre-expand keys for faster encryption/decryption
        let aes_cipher = Aes256Gcm::new(GenericArray::from_slice(&aes_key));
        let chacha_cipher = ChaCha20Poly1305::new(GenericArray::from_slice(&chacha_key));

        // Zeroize raw key material
        aes_key.zeroize();
        chacha_key.zeroize();

        Ok(QShieldCipher { aes_cipher, chacha_cipher })
    }

    /// Encrypt data - optimized hot path
    #[inline]
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        // Generate random nonces (stack allocated)
        let mut aes_nonce = [0u8; NONCE_SIZE];
        let mut chacha_nonce = [0u8; NONCE_SIZE];

        getrandom::getrandom(&mut aes_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;
        getrandom::getrandom(&mut chacha_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;

        // Layer 1: AES-256-GCM
        let aes_ct = self.aes_cipher
            .encrypt(AesNonce::from_slice(&aes_nonce), plaintext)
            .map_err(|_| JsValue::from_str("AES encryption failed"))?;

        // Layer 2: ChaCha20-Poly1305
        let chacha_ct = self.chacha_cipher
            .encrypt(ChaChaNonce::from_slice(&chacha_nonce), aes_ct.as_ref())
            .map_err(|_| JsValue::from_str("ChaCha encryption failed"))?;

        // Build output: [version | aes_nonce | chacha_nonce | ciphertext]
        let mut result = Vec::with_capacity(HEADER_SIZE + chacha_ct.len());
        result.push(VERSION_BYTE);
        result.extend_from_slice(&aes_nonce);
        result.extend_from_slice(&chacha_nonce);
        result.extend_from_slice(&chacha_ct);

        Ok(result)
    }

    /// Decrypt data - optimized hot path
    #[inline]
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() < HEADER_SIZE + 16 {
            return Err(JsValue::from_str("Ciphertext too short"));
        }

        let version = ciphertext[0];
        if version != VERSION_BYTE && version != 0x01 {
            return Err(JsValue::from_str("Unsupported version"));
        }

        // Extract nonces (zero-copy slice references)
        let aes_nonce = &ciphertext[1..1 + NONCE_SIZE];
        let chacha_nonce = &ciphertext[1 + NONCE_SIZE..HEADER_SIZE];
        let encrypted = &ciphertext[HEADER_SIZE..];

        // Layer 2: Decrypt ChaCha20-Poly1305
        let aes_ct = self.chacha_cipher
            .decrypt(ChaChaNonce::from_slice(chacha_nonce), encrypted)
            .map_err(|_| JsValue::from_str("Decryption failed - wrong key or corrupted"))?;

        // Layer 1: Decrypt AES-256-GCM
        let plaintext = self.aes_cipher
            .decrypt(AesNonce::from_slice(aes_nonce), aes_ct.as_ref())
            .map_err(|_| JsValue::from_str("Decryption failed - wrong key or corrupted"))?;

        Ok(plaintext)
    }

    /// Encrypt string to base64 - convenience method
    #[wasm_bindgen]
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, JsValue> {
        let encrypted = self.encrypt(plaintext.as_bytes())?;
        Ok(BASE64.encode(&encrypted))
    }

    /// Decrypt base64 to string - convenience method
    #[wasm_bindgen]
    pub fn decrypt_string(&self, ciphertext_b64: &str) -> Result<String, JsValue> {
        let ciphertext = BASE64.decode(ciphertext_b64)
            .map_err(|_| JsValue::from_str("Invalid base64"))?;
        let decrypted = self.decrypt(&ciphertext)?;
        String::from_utf8(decrypted)
            .map_err(|_| JsValue::from_str("Invalid UTF-8"))
    }

    /// Encrypt multiple chunks in sequence (for large data)
    #[wasm_bindgen]
    pub fn encrypt_chunks(&self, data: &[u8], chunk_size: usize) -> Result<Vec<u8>, JsValue> {
        let chunk_size = if chunk_size == 0 { 64 * 1024 } else { chunk_size }; // Default 64KB
        let num_chunks = (data.len() + chunk_size - 1) / chunk_size;

        // Pre-allocate output buffer
        let overhead_per_chunk = HEADER_SIZE + 16 + 16; // nonces + 2 auth tags
        let mut result = Vec::with_capacity(4 + num_chunks * (chunk_size + overhead_per_chunk));

        // Write number of chunks
        result.extend_from_slice(&(num_chunks as u32).to_le_bytes());

        for chunk in data.chunks(chunk_size) {
            let encrypted = self.encrypt(chunk)?;
            result.extend_from_slice(&(encrypted.len() as u32).to_le_bytes());
            result.extend_from_slice(&encrypted);
        }

        Ok(result)
    }

    /// Decrypt chunked data
    #[wasm_bindgen]
    pub fn decrypt_chunks(&self, data: &[u8]) -> Result<Vec<u8>, JsValue> {
        if data.len() < 4 {
            return Err(JsValue::from_str("Invalid chunked data"));
        }

        let num_chunks = u32::from_le_bytes([data[0], data[1], data[2], data[3]]) as usize;
        let mut result = Vec::new();
        let mut offset = 4;

        for _ in 0..num_chunks {
            if offset + 4 > data.len() {
                return Err(JsValue::from_str("Corrupted chunk data"));
            }

            let chunk_len = u32::from_le_bytes([
                data[offset], data[offset + 1], data[offset + 2], data[offset + 3]
            ]) as usize;
            offset += 4;

            if offset + chunk_len > data.len() {
                return Err(JsValue::from_str("Corrupted chunk data"));
            }

            let decrypted = self.decrypt(&data[offset..offset + chunk_len])?;
            result.extend_from_slice(&decrypted);
            offset += chunk_len;
        }

        Ok(result)
    }

    /// Get overhead per encryption (for performance calculations)
    #[wasm_bindgen]
    pub fn overhead(&self) -> usize {
        HEADER_SIZE + 16 + 16 // version + nonces + 2 auth tags
    }
}

/// X25519 Key Exchange for secure key establishment
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

    /// Derive shared secret and create cipher
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
}

impl Default for QShieldKeyExchange {
    fn default() -> Self {
        Self::new()
    }
}

/// Performance benchmark utility
#[wasm_bindgen]
pub fn benchmark(iterations: u32, data_size: usize) -> Result<JsValue, JsValue> {
    let cipher = QShieldCipher::new("benchmark-key")?;
    let data: Vec<u8> = (0..data_size).map(|i| i as u8).collect();

    // Get performance timer
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

/// Quick demo function
#[wasm_bindgen]
pub fn demo(message: &str, password: &str) -> Result<String, JsValue> {
    let cipher = QShieldCipher::new(password)?;
    let encrypted = cipher.encrypt_string(message)?;
    let decrypted = cipher.decrypt_string(&encrypted)?;

    Ok(format!(
        "Original: {}\nEncrypted: {}...\nDecrypted: {}\nOverhead: {} bytes",
        message,
        &encrypted[..encrypted.len().min(40)],
        decrypted,
        cipher.overhead()
    ))
}

/// Library info
#[wasm_bindgen]
pub fn info() -> String {
    r#"{"name":"QuantumShield","version":"2.0.0-turbo","algorithms":["AES-256-GCM","ChaCha20-Poly1305","HKDF-SHA3-512","X25519"],"optimizations":["pre-expanded-keys","zero-copy","inline-critical-path","stack-buffers"]}"#.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let cipher = QShieldCipher::new("test").unwrap();
        let data = b"Hello, World!";
        let encrypted = cipher.encrypt(data).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();
        assert_eq!(data.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_chunks() {
        let cipher = QShieldCipher::new("test").unwrap();
        let data: Vec<u8> = (0..10000).map(|i| i as u8).collect();
        let encrypted = cipher.encrypt_chunks(&data, 1024).unwrap();
        let decrypted = cipher.decrypt_chunks(&encrypted).unwrap();
        assert_eq!(data, decrypted);
    }
}
