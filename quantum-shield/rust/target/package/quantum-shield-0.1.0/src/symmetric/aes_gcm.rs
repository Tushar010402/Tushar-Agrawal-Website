//! AES-256-GCM Authenticated Encryption
//!
//! This module provides AES-256-GCM encryption for use in the cascading scheme.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Nonce,
};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::utils::rng::SecureRng;

/// AES-256 key size in bytes
pub const AES_KEY_SIZE: usize = 32;

/// AES-GCM nonce size in bytes
pub const AES_NONCE_SIZE: usize = 12;

/// AES-GCM authentication tag size in bytes
pub const AES_TAG_SIZE: usize = 16;

/// AES-256-GCM cipher with automatic key zeroization
#[derive(ZeroizeOnDrop)]
pub struct AesGcmCipher {
    #[zeroize(skip)]
    cipher: Aes256Gcm,
    key: [u8; AES_KEY_SIZE],
}

impl AesGcmCipher {
    /// Create a new cipher from a key
    ///
    /// # Arguments
    /// * `key` - 32-byte key
    pub fn new(key: &[u8]) -> Result<Self> {
        if key.len() != AES_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let mut key_arr = [0u8; AES_KEY_SIZE];
        key_arr.copy_from_slice(key);

        let cipher = Aes256Gcm::new_from_slice(key)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self {
            cipher,
            key: key_arr,
        })
    }

    /// Encrypt data with optional associated data
    ///
    /// # Arguments
    /// * `plaintext` - Data to encrypt
    /// * `aad` - Optional additional authenticated data
    ///
    /// # Returns
    /// Ciphertext with nonce prepended: `nonce || ciphertext || tag`
    pub fn encrypt(&self, plaintext: &[u8], aad: Option<&[u8]>) -> Result<Vec<u8>> {
        let mut rng = SecureRng::new();
        let mut nonce_bytes = [0u8; AES_NONCE_SIZE];
        rng.fill_bytes(&mut nonce_bytes)?;

        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = if let Some(aad) = aad {
            let payload = Payload {
                msg: plaintext,
                aad,
            };
            self.cipher
                .encrypt(nonce, payload)
                .map_err(|_| QShieldError::EncryptionFailed)?
        } else {
            self.cipher
                .encrypt(nonce, plaintext)
                .map_err(|_| QShieldError::EncryptionFailed)?
        };

        // Prepend nonce to ciphertext
        let mut result = Vec::with_capacity(AES_NONCE_SIZE + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// Decrypt data with optional associated data
    ///
    /// # Arguments
    /// * `ciphertext` - Data to decrypt (nonce || ciphertext || tag)
    /// * `aad` - Optional additional authenticated data (must match encryption)
    ///
    /// # Returns
    /// Decrypted plaintext
    pub fn decrypt(&self, ciphertext: &[u8], aad: Option<&[u8]>) -> Result<Vec<u8>> {
        if ciphertext.len() < AES_NONCE_SIZE + AES_TAG_SIZE {
            return Err(QShieldError::InvalidCiphertext);
        }

        let (nonce_bytes, ct) = ciphertext.split_at(AES_NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        let plaintext = if let Some(aad) = aad {
            let payload = Payload { msg: ct, aad };
            self.cipher
                .decrypt(nonce, payload)
                .map_err(|_| QShieldError::DecryptionFailed)?
        } else {
            self.cipher
                .decrypt(nonce, ct)
                .map_err(|_| QShieldError::DecryptionFailed)?
        };

        Ok(plaintext)
    }

    /// Encrypt with a specific nonce (for deterministic encryption)
    ///
    /// # Warning
    /// Never reuse a nonce with the same key. This is only for special cases
    /// where nonce uniqueness is guaranteed externally.
    pub fn encrypt_with_nonce(
        &self,
        plaintext: &[u8],
        nonce: &[u8; AES_NONCE_SIZE],
        aad: Option<&[u8]>,
    ) -> Result<Vec<u8>> {
        let nonce = Nonce::from_slice(nonce);

        let ciphertext = if let Some(aad) = aad {
            let payload = Payload {
                msg: plaintext,
                aad,
            };
            self.cipher
                .encrypt(nonce, payload)
                .map_err(|_| QShieldError::EncryptionFailed)?
        } else {
            self.cipher
                .encrypt(nonce, plaintext)
                .map_err(|_| QShieldError::EncryptionFailed)?
        };

        Ok(ciphertext)
    }

    /// Decrypt with a specific nonce
    pub fn decrypt_with_nonce(
        &self,
        ciphertext: &[u8],
        nonce: &[u8; AES_NONCE_SIZE],
        aad: Option<&[u8]>,
    ) -> Result<Vec<u8>> {
        if ciphertext.len() < AES_TAG_SIZE {
            return Err(QShieldError::InvalidCiphertext);
        }

        let nonce = Nonce::from_slice(nonce);

        let plaintext = if let Some(aad) = aad {
            let payload = Payload {
                msg: ciphertext,
                aad,
            };
            self.cipher
                .decrypt(nonce, payload)
                .map_err(|_| QShieldError::DecryptionFailed)?
        } else {
            self.cipher
                .decrypt(nonce, ciphertext)
                .map_err(|_| QShieldError::DecryptionFailed)?
        };

        Ok(plaintext)
    }

    /// Get the overhead added by encryption (nonce + tag)
    pub fn overhead() -> usize {
        AES_NONCE_SIZE + AES_TAG_SIZE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_key() -> [u8; AES_KEY_SIZE] {
        [
            0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
            0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
            0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17,
            0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
        ]
    }

    #[test]
    fn test_encrypt_decrypt() {
        let cipher = AesGcmCipher::new(&test_key()).unwrap();
        let plaintext = b"Hello, quantum world!";

        let ciphertext = cipher.encrypt(plaintext, None).unwrap();
        let decrypted = cipher.decrypt(&ciphertext, None).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_encrypt_decrypt_with_aad() {
        let cipher = AesGcmCipher::new(&test_key()).unwrap();
        let plaintext = b"Hello, quantum world!";
        let aad = b"additional authenticated data";

        let ciphertext = cipher.encrypt(plaintext, Some(aad)).unwrap();
        let decrypted = cipher.decrypt(&ciphertext, Some(aad)).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_wrong_aad_fails() {
        let cipher = AesGcmCipher::new(&test_key()).unwrap();
        let plaintext = b"Hello, quantum world!";
        let aad = b"additional authenticated data";
        let wrong_aad = b"wrong aad";

        let ciphertext = cipher.encrypt(plaintext, Some(aad)).unwrap();
        let result = cipher.decrypt(&ciphertext, Some(wrong_aad));

        assert!(result.is_err());
    }

    #[test]
    fn test_ciphertext_overhead() {
        let cipher = AesGcmCipher::new(&test_key()).unwrap();
        let plaintext = b"Hello!";

        let ciphertext = cipher.encrypt(plaintext, None).unwrap();

        assert_eq!(ciphertext.len(), plaintext.len() + AesGcmCipher::overhead());
    }

    #[test]
    fn test_different_nonces() {
        let cipher = AesGcmCipher::new(&test_key()).unwrap();
        let plaintext = b"Hello!";

        let ct1 = cipher.encrypt(plaintext, None).unwrap();
        let ct2 = cipher.encrypt(plaintext, None).unwrap();

        // Same plaintext should produce different ciphertexts (different nonces)
        assert_ne!(ct1, ct2);

        // But both should decrypt correctly
        let pt1 = cipher.decrypt(&ct1, None).unwrap();
        let pt2 = cipher.decrypt(&ct2, None).unwrap();

        assert_eq!(pt1, pt2);
    }
}
