//! QuantumShield WASM Demo
//!
//! This module provides a browser-compatible demonstration of QuantumShield's
//! cascading encryption using pure-Rust cryptographic primitives.
//!
//! While the full QuantumShield library uses post-quantum algorithms (ML-KEM, ML-DSA),
//! this demo showcases the cascading encryption concept with X25519 + AES-GCM + ChaCha20.

use wasm_bindgen::prelude::*;
use aes_gcm::{Aes256Gcm, Key as AesKey, Nonce as AesNonce};
use aes_gcm::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Key as ChaChaKey, Nonce as ChaChaNonce};
use x25519_dalek::{StaticSecret, PublicKey};
use hkdf::Hkdf;
use sha3::Sha3_512;
use zeroize::Zeroize;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Key pair for key exchange
#[wasm_bindgen]
pub struct QShieldKeyPair {
    secret_key: Vec<u8>,
    public_key: Vec<u8>,
}

#[wasm_bindgen]
impl QShieldKeyPair {
    /// Generate a new key pair for key exchange
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<QShieldKeyPair, JsValue> {
        let secret = StaticSecret::random_from_rng(rand_core::OsRng);
        let public = PublicKey::from(&secret);

        // Store the secret bytes (in real implementation, this would be more secure)
        let secret_bytes = secret.as_bytes().to_vec();
        let public_bytes = public.as_bytes().to_vec();

        Ok(QShieldKeyPair {
            secret_key: secret_bytes,
            public_key: public_bytes,
        })
    }

    /// Get the public key as base64
    #[wasm_bindgen(getter)]
    pub fn public_key_base64(&self) -> String {
        BASE64.encode(&self.public_key)
    }

    /// Get the public key as bytes
    #[wasm_bindgen(getter)]
    pub fn public_key_bytes(&self) -> Vec<u8> {
        self.public_key.clone()
    }
}

impl Default for QShieldKeyPair {
    fn default() -> Self {
        Self::new().expect("Failed to generate key pair")
    }
}

/// Cascading cipher for demonstration
#[wasm_bindgen]
pub struct QShieldCipher {
    aes_key: Vec<u8>,
    chacha_key: Vec<u8>,
}

#[wasm_bindgen]
impl QShieldCipher {
    /// Create a cipher from a shared secret (derived from key exchange)
    #[wasm_bindgen(constructor)]
    pub fn new(shared_secret: &[u8]) -> Result<QShieldCipher, JsValue> {
        if shared_secret.len() < 32 {
            return Err(JsValue::from_str("Shared secret must be at least 32 bytes"));
        }

        // Derive two independent keys using HKDF-SHA3-512
        let hk = Hkdf::<Sha3_512>::new(None, shared_secret);

        let mut aes_key = vec![0u8; 32];
        let mut chacha_key = vec![0u8; 32];

        hk.expand(b"QShield-AES-256-GCM-v1", &mut aes_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;
        hk.expand(b"QShield-ChaCha20-Poly1305-v1", &mut chacha_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;

        Ok(QShieldCipher { aes_key, chacha_key })
    }

    /// Create a cipher from a password (for demonstration)
    #[wasm_bindgen]
    pub fn from_password(password: &str) -> Result<QShieldCipher, JsValue> {
        // Use HKDF to derive key from password (in production, use Argon2)
        let hk = Hkdf::<Sha3_512>::new(Some(b"QShieldDemo"), password.as_bytes());

        let mut master_key = vec![0u8; 64];
        hk.expand(b"QShield-Master-Key-v1", &mut master_key)
            .map_err(|_| JsValue::from_str("Key derivation failed"))?;

        Self::new(&master_key)
    }

    /// Encrypt data using cascading encryption (AES-256-GCM then ChaCha20-Poly1305)
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        // Generate random nonces
        let mut aes_nonce_bytes = [0u8; 12];
        let mut chacha_nonce_bytes = [0u8; 12];
        getrandom::getrandom(&mut aes_nonce_bytes)
            .map_err(|_| JsValue::from_str("Failed to generate random nonce"))?;
        getrandom::getrandom(&mut chacha_nonce_bytes)
            .map_err(|_| JsValue::from_str("Failed to generate random nonce"))?;

        // First layer: AES-256-GCM
        let aes_key = AesKey::<Aes256Gcm>::from_slice(&self.aes_key);
        let aes_cipher = Aes256Gcm::new(aes_key);
        let aes_nonce = AesNonce::from_slice(&aes_nonce_bytes);

        let aes_ciphertext = aes_cipher
            .encrypt(aes_nonce, plaintext)
            .map_err(|_| JsValue::from_str("AES encryption failed"))?;

        // Second layer: ChaCha20-Poly1305
        let chacha_key = ChaChaKey::from_slice(&self.chacha_key);
        let chacha_cipher = ChaCha20Poly1305::new(chacha_key);
        let chacha_nonce = ChaChaNonce::from_slice(&chacha_nonce_bytes);

        let final_ciphertext = chacha_cipher
            .encrypt(chacha_nonce, aes_ciphertext.as_ref())
            .map_err(|_| JsValue::from_str("ChaCha encryption failed"))?;

        // Combine: [version(1) | aes_nonce(12) | chacha_nonce(12) | ciphertext]
        let mut result = Vec::with_capacity(1 + 12 + 12 + final_ciphertext.len());
        result.push(0x01); // Version byte
        result.extend_from_slice(&aes_nonce_bytes);
        result.extend_from_slice(&chacha_nonce_bytes);
        result.extend_from_slice(&final_ciphertext);

        Ok(result)
    }

    /// Decrypt data using cascading decryption (ChaCha20-Poly1305 then AES-256-GCM)
    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() < 25 {
            return Err(JsValue::from_str("Ciphertext too short"));
        }

        // Parse header
        let version = ciphertext[0];
        if version != 0x01 {
            return Err(JsValue::from_str("Unsupported ciphertext version"));
        }

        let aes_nonce_bytes = &ciphertext[1..13];
        let chacha_nonce_bytes = &ciphertext[13..25];
        let encrypted_data = &ciphertext[25..];

        // First: Decrypt ChaCha20-Poly1305 layer
        let chacha_key = ChaChaKey::from_slice(&self.chacha_key);
        let chacha_cipher = ChaCha20Poly1305::new(chacha_key);
        let chacha_nonce = ChaChaNonce::from_slice(chacha_nonce_bytes);

        let aes_ciphertext = chacha_cipher
            .decrypt(chacha_nonce, encrypted_data)
            .map_err(|_| JsValue::from_str("ChaCha decryption failed - invalid key or corrupted data"))?;

        // Second: Decrypt AES-256-GCM layer
        let aes_key = AesKey::<Aes256Gcm>::from_slice(&self.aes_key);
        let aes_cipher = Aes256Gcm::new(aes_key);
        let aes_nonce = AesNonce::from_slice(aes_nonce_bytes);

        let plaintext = aes_cipher
            .decrypt(aes_nonce, aes_ciphertext.as_ref())
            .map_err(|_| JsValue::from_str("AES decryption failed - invalid key or corrupted data"))?;

        Ok(plaintext)
    }

    /// Encrypt a string and return base64-encoded ciphertext
    #[wasm_bindgen]
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, JsValue> {
        let encrypted = self.encrypt(plaintext.as_bytes())?;
        Ok(BASE64.encode(&encrypted))
    }

    /// Decrypt a base64-encoded ciphertext and return the original string
    #[wasm_bindgen]
    pub fn decrypt_string(&self, ciphertext_base64: &str) -> Result<String, JsValue> {
        let ciphertext = BASE64.decode(ciphertext_base64)
            .map_err(|_| JsValue::from_str("Invalid base64 encoding"))?;
        let decrypted = self.decrypt(&ciphertext)?;
        String::from_utf8(decrypted)
            .map_err(|_| JsValue::from_str("Decrypted data is not valid UTF-8"))
    }
}

impl Drop for QShieldCipher {
    fn drop(&mut self) {
        // Securely zeroize keys when cipher is dropped
        self.aes_key.zeroize();
        self.chacha_key.zeroize();
    }
}

/// Simple demo function to test the encryption
#[wasm_bindgen]
pub fn demo_encrypt_decrypt(message: &str, password: &str) -> Result<String, JsValue> {
    let cipher = QShieldCipher::from_password(password)?;

    let encrypted = cipher.encrypt_string(message)?;
    let decrypted = cipher.decrypt_string(&encrypted)?;

    if message != decrypted {
        return Err(JsValue::from_str("Decryption verification failed"));
    }

    Ok(format!(
        "Original: {}\nEncrypted (base64): {}\nDecrypted: {}\n\nEncryption layers:\n1. AES-256-GCM\n2. ChaCha20-Poly1305\n\nKey derivation: HKDF-SHA3-512",
        message,
        &encrypted[..encrypted.len().min(60)],
        decrypted
    ))
}

/// Get library info
#[wasm_bindgen]
pub fn get_library_info() -> String {
    r#"{
        "name": "QuantumShield Demo",
        "version": "0.1.0",
        "algorithms": {
            "keyExchange": "X25519 (classical) + ML-KEM-768 (post-quantum) in full version",
            "encryption": ["AES-256-GCM", "ChaCha20-Poly1305"],
            "kdf": "HKDF-SHA3-512"
        },
        "features": [
            "Cascading encryption (defense-in-depth)",
            "Automatic memory zeroization",
            "Domain-separated key derivation"
        ]
    }"#.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let cipher = QShieldCipher::from_password("test_password").unwrap();
        let message = b"Hello, Quantum World!";

        let encrypted = cipher.encrypt(message).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();

        assert_eq!(message.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_string_encrypt_decrypt() {
        let cipher = QShieldCipher::from_password("secure_password").unwrap();
        let message = "This is a secret message!";

        let encrypted = cipher.encrypt_string(message).unwrap();
        let decrypted = cipher.decrypt_string(&encrypted).unwrap();

        assert_eq!(message, decrypted);
    }

    #[test]
    fn test_different_passwords_different_results() {
        let cipher1 = QShieldCipher::from_password("password1").unwrap();
        let cipher2 = QShieldCipher::from_password("password2").unwrap();

        let message = b"Secret";

        let encrypted1 = cipher1.encrypt(message).unwrap();
        let encrypted2 = cipher2.encrypt(message).unwrap();

        // Same message with different passwords should produce different ciphertexts
        assert_ne!(encrypted1, encrypted2);

        // Decryption with wrong password should fail
        assert!(cipher2.decrypt(&encrypted1).is_err());
    }
}
