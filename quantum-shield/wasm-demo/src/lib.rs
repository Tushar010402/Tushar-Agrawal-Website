//! QuantumShield - Post-Quantum Defense-in-Depth Encryption Library
//!
//! UNIQUE FEATURES that differentiate from other libraries:
//! 1. Cascading dual-layer encryption (AES-256-GCM + ChaCha20-Poly1305)
//! 2. Argon2id memory-hard key derivation (GPU/ASIC resistant)
//! 3. Length hiding with random padding (traffic analysis protection)
//! 4. Associated Data (AAD) support for context binding
//! 5. Forward secrecy sessions with key ratcheting
//! 6. POST-QUANTUM: Hybrid KEM (X25519 + ML-KEM-768 FIPS 203)
//!
//! POST-QUANTUM SECURITY:
//! - ML-KEM-768 provides NIST Level 3 security against quantum computers
//! - Hybrid approach: if either X25519 OR ML-KEM is secure, the system is secure
//! - AES-256 and ChaCha20 remain secure against quantum (Grover only halves security)

use wasm_bindgen::prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, generic_array::GenericArray, Payload},
    Aes256Gcm, Nonce as AesNonce,
};
use chacha20poly1305::{ChaCha20Poly1305, Nonce as ChaChaNonce};
use x25519_dalek::{StaticSecret, PublicKey as X25519PublicKey};
use fips203::ml_kem_768;
use fips203::traits::{Decaps, Encaps, KeyGen, SerDes};
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
const VERSION_BYTE: u8 = 0x04; // Version 4 - Post-Quantum
const HEADER_SIZE: usize = 1 + NONCE_SIZE + NONCE_SIZE; // version + 2 nonces

// Argon2id parameters (memory-hard, GPU resistant)
const ARGON2_MEMORY_KB: u32 = 19456; // 19MB - WASM-safe, still GPU resistant
const ARGON2_ITERATIONS: u32 = 3;
const ARGON2_PARALLELISM: u32 = 1;

// Padding for length hiding
const MIN_PADDING: usize = 16;
const PADDING_BLOCK_SIZE: usize = 64;

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

#[wasm_bindgen]
pub struct QShieldCipher {
    aes_cipher: Aes256Gcm,
    chacha_cipher: ChaCha20Poly1305,
    enable_padding: bool,
}

#[wasm_bindgen]
impl QShieldCipher {
    #[wasm_bindgen(constructor)]
    pub fn new(password: &str) -> Result<QShieldCipher, JsValue> {
        Self::from_password_with_options(password, true)
    }

    #[wasm_bindgen]
    pub fn from_password_with_options(password: &str, enable_padding: bool) -> Result<QShieldCipher, JsValue> {
        let mut salt = [0u8; 16];
        let salt_hkdf = Hkdf::<Sha3_256>::new(None, password.as_bytes());
        salt_hkdf.expand(b"QShield-salt-v4-pq", &mut salt)
            .map_err(|_| JsValue::from_str("Salt derivation failed"))?;

        let params = Params::new(
            ARGON2_MEMORY_KB,
            ARGON2_ITERATIONS,
            ARGON2_PARALLELISM,
            Some(64)
        ).map_err(|_| JsValue::from_str("Invalid Argon2 parameters"))?;

        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

        let mut key_material = [0u8; 64];
        argon2.hash_password_into(password.as_bytes(), &salt, &mut key_material)
            .map_err(|_| JsValue::from_str("Argon2 key derivation failed"))?;

        let aes_cipher = Aes256Gcm::new(GenericArray::from_slice(&key_material[..32]));
        let chacha_cipher = ChaCha20Poly1305::new(GenericArray::from_slice(&key_material[32..]));

        key_material.zeroize();

        Ok(QShieldCipher { aes_cipher, chacha_cipher, enable_padding })
    }

    #[wasm_bindgen]
    pub fn from_bytes(secret: &[u8]) -> Result<QShieldCipher, JsValue> {
        let hk = Hkdf::<Sha3_512>::new(Some(b"QShield-v4-pq"), secret);

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

    #[wasm_bindgen]
    pub fn encrypt_with_aad(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, JsValue> {
        let padded = if self.enable_padding {
            self.apply_padding(plaintext)
        } else {
            plaintext.to_vec()
        };

        let mut aes_nonce = [0u8; NONCE_SIZE];
        let mut chacha_nonce = [0u8; NONCE_SIZE];
        getrandom::getrandom(&mut aes_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;
        getrandom::getrandom(&mut chacha_nonce)
            .map_err(|_| JsValue::from_str("RNG failed"))?;

        let aes_payload = Payload { msg: &padded, aad };
        let aes_ct = self.aes_cipher
            .encrypt(AesNonce::from_slice(&aes_nonce), aes_payload)
            .map_err(|_| JsValue::from_str("AES encryption failed"))?;

        let chacha_payload = Payload { msg: &aes_ct, aad };
        let chacha_ct = self.chacha_cipher
            .encrypt(ChaChaNonce::from_slice(&chacha_nonce), chacha_payload)
            .map_err(|_| JsValue::from_str("ChaCha encryption failed"))?;

        let mut result = Vec::with_capacity(HEADER_SIZE + chacha_ct.len());
        result.push(VERSION_BYTE);
        result.extend_from_slice(&aes_nonce);
        result.extend_from_slice(&chacha_nonce);
        result.extend_from_slice(&chacha_ct);

        Ok(result)
    }

    #[wasm_bindgen]
    pub fn decrypt_with_aad(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() < HEADER_SIZE + 32 {
            return Err(JsValue::from_str("Ciphertext too short"));
        }

        let version = ciphertext[0];
        if version != VERSION_BYTE && version != 0x03 && version != 0x02 && version != 0x01 {
            return Err(JsValue::from_str("Unsupported version"));
        }

        let aes_nonce = &ciphertext[1..1 + NONCE_SIZE];
        let chacha_nonce = &ciphertext[1 + NONCE_SIZE..HEADER_SIZE];
        let encrypted = &ciphertext[HEADER_SIZE..];

        let chacha_payload = Payload { msg: encrypted, aad };
        let aes_ct = self.chacha_cipher
            .decrypt(ChaChaNonce::from_slice(chacha_nonce), chacha_payload)
            .map_err(|_| JsValue::from_str("Decryption failed"))?;

        let aes_payload = Payload { msg: &aes_ct, aad };
        let padded = self.aes_cipher
            .decrypt(AesNonce::from_slice(aes_nonce), aes_payload)
            .map_err(|_| JsValue::from_str("Decryption failed"))?;

        if self.enable_padding && (version == VERSION_BYTE || version == 0x03) {
            self.remove_padding(&padded)
        } else {
            Ok(padded)
        }
    }

    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.encrypt_with_aad(plaintext, &[])
    }

    #[wasm_bindgen]
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.decrypt_with_aad(ciphertext, &[])
    }

    #[wasm_bindgen]
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, JsValue> {
        let encrypted = self.encrypt(plaintext.as_bytes())?;
        Ok(BASE64.encode(&encrypted))
    }

    #[wasm_bindgen]
    pub fn decrypt_string(&self, ciphertext_b64: &str) -> Result<String, JsValue> {
        let ciphertext = BASE64.decode(ciphertext_b64)
            .map_err(|_| JsValue::from_str("Invalid base64"))?;
        let decrypted = self.decrypt(&ciphertext)?;
        String::from_utf8(decrypted)
            .map_err(|_| JsValue::from_str("Invalid UTF-8"))
    }

    fn apply_padding(&self, data: &[u8]) -> Vec<u8> {
        let content_len = data.len();
        let min_size = content_len + MIN_PADDING + 4;
        let padded_size = ((min_size + PADDING_BLOCK_SIZE - 1) / PADDING_BLOCK_SIZE) * PADDING_BLOCK_SIZE;
        let padding_len = padded_size - content_len - 4;

        let mut result = Vec::with_capacity(padded_size);
        result.extend_from_slice(&(content_len as u32).to_le_bytes());
        result.extend_from_slice(data);

        let mut padding = vec![0u8; padding_len];
        let _ = getrandom::getrandom(&mut padding);
        result.extend_from_slice(&padding);

        result
    }

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

    #[wasm_bindgen]
    pub fn overhead(&self) -> usize {
        if self.enable_padding {
            HEADER_SIZE + 32 + MIN_PADDING + 4
        } else {
            HEADER_SIZE + 32
        }
    }

    #[wasm_bindgen]
    pub fn has_length_hiding(&self) -> bool {
        self.enable_padding
    }
}

// ============================================================================
// FORWARD SECRECY SESSION
// ============================================================================

#[wasm_bindgen]
pub struct QShieldSession {
    chain_key: [u8; 32],
    message_count: u64,
}

#[wasm_bindgen]
impl QShieldSession {
    #[wasm_bindgen(constructor)]
    pub fn new(shared_secret: &[u8]) -> Result<QShieldSession, JsValue> {
        let hk = Hkdf::<Sha3_256>::new(Some(b"QShield-session-v1"), shared_secret);
        let mut chain_key = [0u8; 32];
        hk.expand(b"chain-key-init", &mut chain_key)
            .map_err(|_| JsValue::from_str("Session init failed"))?;

        Ok(QShieldSession { chain_key, message_count: 0 })
    }

    #[wasm_bindgen]
    pub fn encrypt(&mut self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        let (message_key, new_chain_key) = self.ratchet()?;
        self.chain_key = new_chain_key;
        self.message_count += 1;

        let cipher = QShieldCipher::from_bytes(&message_key)?;

        let mut result = Vec::with_capacity(8 + plaintext.len() + cipher.overhead());
        result.extend_from_slice(&(self.message_count - 1).to_le_bytes());
        result.extend_from_slice(&cipher.encrypt(plaintext)?);

        Ok(result)
    }

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
            return Err(JsValue::from_str("Message out of order"));
        }

        let (message_key, new_chain_key) = self.ratchet()?;
        self.chain_key = new_chain_key;
        self.message_count += 1;

        let cipher = QShieldCipher::from_bytes(&message_key)?;
        cipher.decrypt(&ciphertext[8..])
    }

    #[wasm_bindgen]
    pub fn message_count(&self) -> u64 {
        self.message_count
    }

    fn ratchet(&self) -> Result<([u8; 32], [u8; 32]), JsValue> {
        type HmacSha3 = Hmac<Sha3_256>;

        let mut mac = <HmacSha3 as Mac>::new_from_slice(&self.chain_key)
            .map_err(|_| JsValue::from_str("HMAC init failed"))?;
        mac.update(b"message-key");
        mac.update(&self.message_count.to_le_bytes());
        let message_key: [u8; 32] = mac.finalize().into_bytes().into();

        let mut mac = <HmacSha3 as Mac>::new_from_slice(&self.chain_key)
            .map_err(|_| JsValue::from_str("HMAC init failed"))?;
        mac.update(b"chain-key-next");
        let new_chain_key: [u8; 32] = mac.finalize().into_bytes().into();

        Ok((message_key, new_chain_key))
    }
}

// ============================================================================
// CLASSICAL KEY EXCHANGE - X25519 (for backward compatibility)
// ============================================================================

#[wasm_bindgen]
pub struct QShieldKeyExchange {
    secret: StaticSecret,
    public: X25519PublicKey,
}

#[wasm_bindgen]
impl QShieldKeyExchange {
    #[wasm_bindgen(constructor)]
    pub fn new() -> QShieldKeyExchange {
        let secret = StaticSecret::random_from_rng(rand_core::OsRng);
        let public = X25519PublicKey::from(&secret);
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

    #[wasm_bindgen]
    pub fn derive_cipher(&self, peer_public_key: &[u8]) -> Result<QShieldCipher, JsValue> {
        if peer_public_key.len() != 32 {
            return Err(JsValue::from_str("Invalid public key length"));
        }

        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(peer_public_key);
        let peer_pk = X25519PublicKey::from(pk_bytes);
        let shared_secret = self.secret.diffie_hellman(&peer_pk);

        QShieldCipher::from_bytes(shared_secret.as_bytes())
    }
}

impl Default for QShieldKeyExchange {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// POST-QUANTUM HYBRID KEM - X25519 + ML-KEM-768 (FIPS 203)
// ============================================================================

/// Post-Quantum Hybrid Key Encapsulation Mechanism
///
/// Combines X25519 (classical ECDH) with ML-KEM-768 (NIST FIPS 203)
///
/// SECURITY: If EITHER algorithm is secure, the combined system is secure.
/// - X25519: Secure against classical computers
/// - ML-KEM-768: Secure against quantum computers (NIST Level 3)
///
/// This is the recommended approach for post-quantum migration.
#[wasm_bindgen]
pub struct QShieldHybridKEM {
    // Classical: X25519
    x25519_secret: StaticSecret,
    x25519_public: X25519PublicKey,
    // Post-Quantum: ML-KEM-768
    mlkem_dk: ml_kem_768::DecapsKey,
    mlkem_ek: ml_kem_768::EncapsKey,
}

#[wasm_bindgen]
impl QShieldHybridKEM {
    /// Generate new hybrid keypair (X25519 + ML-KEM-768)
    #[wasm_bindgen(constructor)]
    pub fn new() -> Result<QShieldHybridKEM, JsValue> {
        // Generate X25519 keypair
        let x25519_secret = StaticSecret::random_from_rng(rand_core::OsRng);
        let x25519_public = X25519PublicKey::from(&x25519_secret);

        // Generate ML-KEM-768 keypair using OsRng
        let mut rng = rand_core::OsRng;
        let (mlkem_ek, mlkem_dk) = ml_kem_768::KG::try_keygen_with_rng(&mut rng)
            .map_err(|_| JsValue::from_str("ML-KEM key generation failed"))?;

        Ok(QShieldHybridKEM {
            x25519_secret,
            x25519_public,
            mlkem_dk,
            mlkem_ek,
        })
    }

    /// Get the combined public key (X25519 || ML-KEM encapsulation key)
    /// X25519: 32 bytes, ML-KEM-768 ek: 1184 bytes = 1216 bytes total
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        let mut combined = Vec::with_capacity(32 + 1184);
        combined.extend_from_slice(self.x25519_public.as_bytes());
        combined.extend_from_slice(&self.mlkem_ek.clone().into_bytes());
        combined
    }

    /// Get public key as base64
    #[wasm_bindgen(getter)]
    pub fn public_key_base64(&self) -> String {
        BASE64.encode(&self.public_key())
    }

    /// Get public key size info
    #[wasm_bindgen]
    pub fn public_key_size() -> usize {
        32 + 1184 // X25519 + ML-KEM-768 encapsulation key
    }

    /// Encapsulate: Generate shared secret and ciphertext for a peer's public key
    /// Returns: (ciphertext, shared_secret) where ciphertext should be sent to peer
    #[wasm_bindgen]
    pub fn encapsulate(&self, peer_public_key: &[u8]) -> Result<HybridEncapsulation, JsValue> {
        if peer_public_key.len() != 32 + 1184 {
            return Err(JsValue::from_str(&format!(
                "Invalid hybrid public key length: expected {}, got {}",
                32 + 1184,
                peer_public_key.len()
            )));
        }

        // Split peer's public key
        let peer_x25519_pk = &peer_public_key[..32];
        let peer_mlkem_ek = &peer_public_key[32..];

        // X25519 key exchange
        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(peer_x25519_pk);
        let peer_x25519 = X25519PublicKey::from(pk_bytes);
        let x25519_shared = self.x25519_secret.diffie_hellman(&peer_x25519);

        // ML-KEM encapsulation
        let peer_ek = ml_kem_768::EncapsKey::try_from_bytes(peer_mlkem_ek.try_into().unwrap())
            .map_err(|_| JsValue::from_str("Invalid ML-KEM public key"))?;

        // ML-KEM encapsulation using OsRng
        let mut rng = rand_core::OsRng;
        let (mlkem_shared, mlkem_ct) = peer_ek.try_encaps_with_rng(&mut rng)
            .map_err(|_| JsValue::from_str("ML-KEM encapsulation failed"))?;

        // Combine shared secrets using HKDF
        let mut combined_secret = Vec::with_capacity(32 + 32);
        combined_secret.extend_from_slice(x25519_shared.as_bytes());
        combined_secret.extend_from_slice(&mlkem_shared.into_bytes());

        let hk = Hkdf::<Sha3_512>::new(Some(b"QShield-HybridKEM-v1"), &combined_secret);
        let mut shared_secret = [0u8; 64];
        hk.expand(b"hybrid-shared-secret", &mut shared_secret)
            .map_err(|_| JsValue::from_str("HKDF expansion failed"))?;

        // Build ciphertext: X25519 public key (for this encapsulation) || ML-KEM ciphertext
        // Note: We send our X25519 public key so peer can compute shared secret
        let mut ciphertext = Vec::with_capacity(32 + 1088);
        ciphertext.extend_from_slice(self.x25519_public.as_bytes());
        ciphertext.extend_from_slice(&mlkem_ct.into_bytes());

        combined_secret.zeroize();

        Ok(HybridEncapsulation {
            ciphertext,
            shared_secret: shared_secret.to_vec(),
        })
    }

    /// Decapsulate: Recover shared secret from ciphertext
    #[wasm_bindgen]
    pub fn decapsulate(&self, ciphertext: &[u8]) -> Result<Vec<u8>, JsValue> {
        if ciphertext.len() != 32 + 1088 {
            return Err(JsValue::from_str(&format!(
                "Invalid ciphertext length: expected {}, got {}",
                32 + 1088,
                ciphertext.len()
            )));
        }

        // Split ciphertext
        let peer_x25519_pk = &ciphertext[..32];
        let mlkem_ct = &ciphertext[32..];

        // X25519 key exchange
        let mut pk_bytes = [0u8; 32];
        pk_bytes.copy_from_slice(peer_x25519_pk);
        let peer_x25519 = X25519PublicKey::from(pk_bytes);
        let x25519_shared = self.x25519_secret.diffie_hellman(&peer_x25519);

        // ML-KEM decapsulation
        let ct = ml_kem_768::CipherText::try_from_bytes(mlkem_ct.try_into().unwrap())
            .map_err(|_| JsValue::from_str("Invalid ML-KEM ciphertext"))?;

        let mlkem_shared = self.mlkem_dk.clone().try_decaps(&ct)
            .map_err(|_| JsValue::from_str("ML-KEM decapsulation failed"))?;

        // Combine shared secrets
        let mut combined_secret = Vec::with_capacity(32 + 32);
        combined_secret.extend_from_slice(x25519_shared.as_bytes());
        combined_secret.extend_from_slice(&mlkem_shared.into_bytes());

        let hk = Hkdf::<Sha3_512>::new(Some(b"QShield-HybridKEM-v1"), &combined_secret);
        let mut shared_secret = [0u8; 64];
        hk.expand(b"hybrid-shared-secret", &mut shared_secret)
            .map_err(|_| JsValue::from_str("HKDF expansion failed"))?;

        combined_secret.zeroize();

        Ok(shared_secret.to_vec())
    }

    /// Derive a cipher directly from peer's public key (one-shot encryption)
    #[wasm_bindgen]
    pub fn derive_cipher(&self, peer_public_key: &[u8]) -> Result<HybridCipherResult, JsValue> {
        let encap = self.encapsulate(peer_public_key)?;
        let cipher = QShieldCipher::from_bytes(&encap.shared_secret)?;

        Ok(HybridCipherResult {
            cipher,
            ciphertext: encap.ciphertext,
        })
    }

    /// Derive a cipher from received ciphertext (for decryption)
    #[wasm_bindgen]
    pub fn derive_cipher_from_ciphertext(&self, ciphertext: &[u8]) -> Result<QShieldCipher, JsValue> {
        let shared_secret = self.decapsulate(ciphertext)?;
        QShieldCipher::from_bytes(&shared_secret)
    }
}

impl Default for QShieldHybridKEM {
    fn default() -> Self {
        Self::new().expect("Failed to create HybridKEM")
    }
}

/// Result of hybrid encapsulation
#[wasm_bindgen]
pub struct HybridEncapsulation {
    ciphertext: Vec<u8>,
    shared_secret: Vec<u8>,
}

#[wasm_bindgen]
impl HybridEncapsulation {
    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Vec<u8> {
        self.ciphertext.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn ciphertext_base64(&self) -> String {
        BASE64.encode(&self.ciphertext)
    }

    #[wasm_bindgen(getter)]
    pub fn shared_secret(&self) -> Vec<u8> {
        self.shared_secret.clone()
    }
}

/// Result of deriving cipher from hybrid KEM
#[wasm_bindgen]
pub struct HybridCipherResult {
    cipher: QShieldCipher,
    ciphertext: Vec<u8>,
}

#[wasm_bindgen]
impl HybridCipherResult {
    /// Get the ciphertext to send to peer
    #[wasm_bindgen(getter)]
    pub fn ciphertext(&self) -> Vec<u8> {
        self.ciphertext.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn ciphertext_base64(&self) -> String {
        BASE64.encode(&self.ciphertext)
    }

    /// Encrypt data using the derived cipher
    #[wasm_bindgen]
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, JsValue> {
        self.cipher.encrypt(plaintext)
    }

    /// Encrypt string using the derived cipher
    #[wasm_bindgen]
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, JsValue> {
        self.cipher.encrypt_string(plaintext)
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

#[wasm_bindgen]
pub fn secure_compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.ct_eq(b).into()
}

#[wasm_bindgen]
pub fn benchmark(iterations: u32, data_size: usize) -> Result<JsValue, JsValue> {
    let cipher = QShieldCipher::from_bytes(b"benchmark-key-32-bytes-exactly!!")?;
    let data: Vec<u8> = (0..data_size).map(|i| i as u8).collect();

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let performance = window.performance().ok_or_else(|| JsValue::from_str("No performance API"))?;

    let start = performance.now();
    for _ in 0..iterations {
        let _ = cipher.encrypt(&data)?;
    }
    let encrypt_time = performance.now() - start;

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

/// Benchmark hybrid KEM operations
#[wasm_bindgen]
pub fn benchmark_hybrid_kem(iterations: u32) -> Result<JsValue, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("No window"))?;
    let performance = window.performance().ok_or_else(|| JsValue::from_str("No performance API"))?;

    // Key generation benchmark
    let start = performance.now();
    let mut last_kem = None;
    for _ in 0..iterations {
        last_kem = Some(QShieldHybridKEM::new()?);
    }
    let keygen_time = performance.now() - start;
    let kem = last_kem.unwrap();

    // Encapsulation benchmark
    let peer_kem = QShieldHybridKEM::new()?;
    let peer_pk = peer_kem.public_key();

    let start = performance.now();
    let mut last_encap = None;
    for _ in 0..iterations {
        last_encap = Some(kem.encapsulate(&peer_pk)?);
    }
    let encaps_time = performance.now() - start;

    // Decapsulation benchmark
    let encap = last_encap.unwrap();
    let ct = encap.ciphertext();

    let start = performance.now();
    for _ in 0..iterations {
        let _ = peer_kem.decapsulate(&ct)?;
    }
    let decaps_time = performance.now() - start;

    Ok(JsValue::from_str(&format!(
        r#"{{"iterations":{},"keygenTimeMs":{:.2},"encapsTimeMs":{:.2},"decapsTimeMs":{:.2},"avgKeygenMs":{:.3},"avgEncapsMs":{:.3},"avgDecapsMs":{:.3},"publicKeySize":{},"ciphertextSize":{}}}"#,
        iterations,
        keygen_time, encaps_time, decaps_time,
        keygen_time / iterations as f64,
        encaps_time / iterations as f64,
        decaps_time / iterations as f64,
        32 + 1184, // X25519 + ML-KEM-768 ek
        32 + 1088  // X25519 + ML-KEM-768 ct
    )))
}

#[wasm_bindgen]
pub fn info() -> String {
    r#"{"name":"QuantumShield","version":"4.0.0-pq","postQuantum":true,"algorithms":{"symmetric":["AES-256-GCM","ChaCha20-Poly1305"],"kdf":["Argon2id-19MB","HKDF-SHA3-512"],"kem":["X25519","ML-KEM-768"],"hybrid":"X25519+ML-KEM-768"},"nistLevel":3,"uniqueFeatures":["cascading-dual-cipher","argon2id-19mb","length-hiding","aad-context-binding","forward-secrecy","hybrid-pq-kem"]}"#.to_string()
}

#[wasm_bindgen]
pub fn demo(message: &str, password: &str) -> Result<String, JsValue> {
    let cipher = QShieldCipher::new(password)?;
    let encrypted = cipher.encrypt_string(message)?;
    let decrypted = cipher.decrypt_string(&encrypted)?;

    Ok(format!(
        "Original: {}\nEncrypted: {}...\nDecrypted: {}\nFeatures: Argon2id KDF, Dual-cipher, Length hiding, Post-Quantum KEM available",
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
    fn test_hybrid_kem() {
        let alice = QShieldHybridKEM::new().unwrap();
        let bob = QShieldHybridKEM::new().unwrap();

        // Alice encapsulates to Bob
        let encap = alice.encapsulate(&bob.public_key()).unwrap();

        // Bob decapsulates
        let bob_secret = bob.decapsulate(&encap.ciphertext()).unwrap();

        // Shared secrets should match
        assert_eq!(encap.shared_secret(), bob_secret);
    }

    #[test]
    fn test_secure_compare() {
        assert!(secure_compare(b"hello", b"hello"));
        assert!(!secure_compare(b"hello", b"world"));
    }
}
