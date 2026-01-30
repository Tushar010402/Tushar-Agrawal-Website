//! QuantumShield - Cascading Symmetric Encryption
//!
//! Provides defense-in-depth by encrypting data through multiple independent
//! ciphers. Data is first encrypted with AES-256-GCM, then with ChaCha20-Poly1305.
//!
//! ## Security Properties
//!
//! - If either cipher is broken, the other still protects the data
//! - Different mathematical foundations (substitution-permutation vs ARX)
//! - Independent keys derived from the master key
//! - Separate nonces for each layer

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::kdf::QShieldKDF;
use crate::utils::serialize::{
    read_length_prefixed, write_length_prefixed, Deserialize, Header, ObjectType, Serialize,
};

use super::aes_gcm::{AesGcmCipher, AES_KEY_SIZE, AES_NONCE_SIZE, AES_TAG_SIZE};
use super::chacha::{ChaCha20Cipher, CHACHA_KEY_SIZE, CHACHA_NONCE_SIZE, CHACHA_TAG_SIZE};

/// Total key size needed for cascading encryption (AES + ChaCha20)
pub const QSHIELD_KEY_SIZE: usize = AES_KEY_SIZE + CHACHA_KEY_SIZE;

/// Encryption overhead (nonce + tag for each cipher)
pub const QSHIELD_OVERHEAD: usize = AES_NONCE_SIZE + AES_TAG_SIZE + CHACHA_NONCE_SIZE + CHACHA_TAG_SIZE;

/// Encrypted data with metadata
#[derive(Clone)]
pub struct EncryptedData {
    /// The ciphertext (cascaded encryption result)
    pub ciphertext: Vec<u8>,
    /// Optional message ID for deduplication
    pub message_id: Option<[u8; 16]>,
}

impl EncryptedData {
    /// Create new encrypted data
    pub fn new(ciphertext: Vec<u8>) -> Self {
        Self {
            ciphertext,
            message_id: None,
        }
    }

    /// Create new encrypted data with message ID
    pub fn with_id(ciphertext: Vec<u8>, message_id: [u8; 16]) -> Self {
        Self {
            ciphertext,
            message_id: Some(message_id),
        }
    }
}

impl Serialize for EncryptedData {
    fn serialize(&self) -> Result<Vec<u8>> {
        let flags: u16 = if self.message_id.is_some() { 0x01 } else { 0x00 };

        let payload_size = 2 + 4 + self.ciphertext.len() + if self.message_id.is_some() { 16 } else { 0 };
        let header = Header::new(ObjectType::EncryptedMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        buf.extend_from_slice(&flags.to_le_bytes());
        write_length_prefixed(&self.ciphertext, &mut buf);

        if let Some(id) = &self.message_id {
            buf.extend_from_slice(id);
        }

        Ok(buf)
    }
}

impl Deserialize for EncryptedData {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::EncryptedMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;

        if offset + 2 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let flags = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;

        let ciphertext = read_length_prefixed(data, &mut offset)?;

        let message_id = if flags & 0x01 != 0 {
            if offset + 16 > data.len() {
                return Err(QShieldError::ParseError);
            }
            let mut id = [0u8; 16];
            id.copy_from_slice(&data[offset..offset + 16]);
            Some(id)
        } else {
            None
        };

        Ok(Self {
            ciphertext,
            message_id,
        })
    }
}

/// QuantumShield - Cascading Symmetric Encryption
///
/// Encrypts data through AES-256-GCM then ChaCha20-Poly1305 for defense-in-depth.
#[derive(ZeroizeOnDrop)]
pub struct QuantumShield {
    #[zeroize(skip)]
    aes: AesGcmCipher,
    #[zeroize(skip)]
    chacha: ChaCha20Cipher,
    aes_key: [u8; AES_KEY_SIZE],
    chacha_key: [u8; CHACHA_KEY_SIZE],
}

impl QuantumShield {
    /// Create a new QuantumShield cipher from a shared secret
    ///
    /// The shared secret is expanded into independent keys for each cipher
    /// using HKDF-SHA3-512.
    ///
    /// # Arguments
    /// * `shared_secret` - Key material (any length, will be expanded)
    pub fn new(shared_secret: &[u8]) -> Result<Self> {
        if shared_secret.is_empty() {
            return Err(QShieldError::InvalidKey);
        }

        // Derive independent keys using KDF
        // Use empty salt for deterministic derivation from shared secret
        let kdf = QShieldKDF::new();
        let derived = kdf.derive(
            shared_secret,
            Some(&[]),  // Empty salt - shared secret already has sufficient entropy
            b"QuantumShield-cascade-v1",
            QSHIELD_KEY_SIZE,
        )?;

        let key_bytes = derived.as_bytes();
        let (aes_key_slice, chacha_key_slice) = key_bytes.split_at(AES_KEY_SIZE);

        let mut aes_key = [0u8; AES_KEY_SIZE];
        let mut chacha_key = [0u8; CHACHA_KEY_SIZE];
        aes_key.copy_from_slice(aes_key_slice);
        chacha_key.copy_from_slice(chacha_key_slice);

        let aes = AesGcmCipher::new(&aes_key)?;
        let chacha = ChaCha20Cipher::new(&chacha_key)?;

        Ok(Self {
            aes,
            chacha,
            aes_key,
            chacha_key,
        })
    }

    /// Create from explicit keys (advanced use)
    ///
    /// # Arguments
    /// * `aes_key` - 32-byte key for AES-256-GCM
    /// * `chacha_key` - 32-byte key for ChaCha20-Poly1305
    pub fn from_keys(aes_key: &[u8; AES_KEY_SIZE], chacha_key: &[u8; CHACHA_KEY_SIZE]) -> Result<Self> {
        let aes = AesGcmCipher::new(aes_key)?;
        let chacha = ChaCha20Cipher::new(chacha_key)?;

        Ok(Self {
            aes,
            chacha,
            aes_key: *aes_key,
            chacha_key: *chacha_key,
        })
    }

    /// Encrypt data using cascading encryption
    ///
    /// Data is encrypted first with AES-256-GCM, then with ChaCha20-Poly1305.
    ///
    /// # Arguments
    /// * `plaintext` - Data to encrypt
    ///
    /// # Returns
    /// Cascaded ciphertext
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>> {
        // First layer: AES-256-GCM
        let aes_encrypted = self.aes.encrypt(plaintext, None)?;

        // Second layer: ChaCha20-Poly1305
        let cascade_encrypted = self.chacha.encrypt(&aes_encrypted, None)?;

        Ok(cascade_encrypted)
    }

    /// Encrypt data with additional authenticated data
    ///
    /// AAD is authenticated at both layers.
    ///
    /// # Arguments
    /// * `plaintext` - Data to encrypt
    /// * `aad` - Additional authenticated data
    ///
    /// # Returns
    /// Cascaded ciphertext
    pub fn encrypt_with_aad(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
        // First layer: AES-256-GCM with AAD
        let aes_encrypted = self.aes.encrypt(plaintext, Some(aad))?;

        // Second layer: ChaCha20-Poly1305 with AAD
        let cascade_encrypted = self.chacha.encrypt(&aes_encrypted, Some(aad))?;

        Ok(cascade_encrypted)
    }

    /// Decrypt cascaded ciphertext
    ///
    /// # Arguments
    /// * `ciphertext` - Cascaded ciphertext to decrypt
    ///
    /// # Returns
    /// Decrypted plaintext
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>> {
        // First remove ChaCha20 layer
        let aes_encrypted = self.chacha.decrypt(ciphertext, None)?;

        // Then remove AES layer
        let plaintext = self.aes.decrypt(&aes_encrypted, None)?;

        Ok(plaintext)
    }

    /// Decrypt ciphertext with additional authenticated data
    ///
    /// # Arguments
    /// * `ciphertext` - Cascaded ciphertext to decrypt
    /// * `aad` - Additional authenticated data (must match encryption)
    ///
    /// # Returns
    /// Decrypted plaintext
    pub fn decrypt_with_aad(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>> {
        // First remove ChaCha20 layer
        let aes_encrypted = self.chacha.decrypt(ciphertext, Some(aad))?;

        // Then remove AES layer
        let plaintext = self.aes.decrypt(&aes_encrypted, Some(aad))?;

        Ok(plaintext)
    }

    /// Encrypt into an EncryptedData structure
    pub fn seal(&self, plaintext: &[u8]) -> Result<EncryptedData> {
        let ciphertext = self.encrypt(plaintext)?;
        Ok(EncryptedData::new(ciphertext))
    }

    /// Decrypt from an EncryptedData structure
    pub fn open(&self, data: &EncryptedData) -> Result<Vec<u8>> {
        self.decrypt(&data.ciphertext)
    }

    /// Get the encryption overhead
    pub fn overhead() -> usize {
        QSHIELD_OVERHEAD
    }

    /// Rotate to new keys derived from the current state
    ///
    /// This provides forward secrecy by deriving new keys and erasing the old ones.
    pub fn rotate_keys(&mut self) -> Result<()> {
        // Derive new keys from current keys
        let kdf = QShieldKDF::new();

        let mut current_keys = Vec::with_capacity(QSHIELD_KEY_SIZE);
        current_keys.extend_from_slice(&self.aes_key);
        current_keys.extend_from_slice(&self.chacha_key);

        let new_keys = kdf.derive(
            &current_keys,
            None,
            b"QuantumShield-rotate-v1",
            QSHIELD_KEY_SIZE,
        )?;

        current_keys.zeroize();

        let key_bytes = new_keys.as_bytes();
        let (new_aes_key, new_chacha_key) = key_bytes.split_at(AES_KEY_SIZE);

        // Zeroize old keys
        self.aes_key.zeroize();
        self.chacha_key.zeroize();

        // Set new keys
        self.aes_key.copy_from_slice(new_aes_key);
        self.chacha_key.copy_from_slice(new_chacha_key);

        // Recreate ciphers
        self.aes = AesGcmCipher::new(&self.aes_key)?;
        self.chacha = ChaCha20Cipher::new(&self.chacha_key)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let shared_secret = b"this is a test shared secret for encryption";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Hello, quantum world!";
        let ciphertext = cipher.encrypt(plaintext).unwrap();
        let decrypted = cipher.decrypt(&ciphertext).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_encrypt_decrypt_with_aad() {
        let shared_secret = b"test key material";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Hello, quantum world!";
        let aad = b"additional authenticated data";

        let ciphertext = cipher.encrypt_with_aad(plaintext, aad).unwrap();
        let decrypted = cipher.decrypt_with_aad(&ciphertext, aad).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_wrong_aad_fails() {
        let shared_secret = b"test key material";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Hello!";
        let aad = b"correct aad";
        let wrong_aad = b"wrong aad";

        let ciphertext = cipher.encrypt_with_aad(plaintext, aad).unwrap();
        let result = cipher.decrypt_with_aad(&ciphertext, wrong_aad);

        assert!(result.is_err());
    }

    #[test]
    fn test_cascade_overhead() {
        let shared_secret = b"test key";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Hello!";
        let ciphertext = cipher.encrypt(plaintext).unwrap();

        assert_eq!(ciphertext.len(), plaintext.len() + QuantumShield::overhead());
    }

    #[test]
    fn test_seal_open() {
        let shared_secret = b"test key material";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Test message";
        let encrypted = cipher.seal(plaintext).unwrap();
        let decrypted = cipher.open(&encrypted).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_encrypted_data_serialization() {
        let shared_secret = b"test key";
        let cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Test message";
        let encrypted = cipher.seal(plaintext).unwrap();

        let serialized = encrypted.serialize().unwrap();
        let deserialized = EncryptedData::deserialize(&serialized).unwrap();

        let decrypted = cipher.open(&deserialized).unwrap();
        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_key_rotation() {
        let shared_secret = b"test key material";
        let mut cipher = QuantumShield::new(shared_secret).unwrap();

        let plaintext = b"Test message";
        let ct1 = cipher.encrypt(plaintext).unwrap();

        // Rotate keys
        cipher.rotate_keys().unwrap();

        // Old ciphertext should fail with new keys
        let result = cipher.decrypt(&ct1);
        assert!(result.is_err());

        // New encryption should work
        let ct2 = cipher.encrypt(plaintext).unwrap();
        let decrypted = cipher.decrypt(&ct2).unwrap();
        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_different_shared_secrets() {
        let cipher1 = QuantumShield::new(b"secret one").unwrap();
        let cipher2 = QuantumShield::new(b"secret two").unwrap();

        let plaintext = b"Test message";
        let ciphertext = cipher1.encrypt(plaintext).unwrap();

        // Decrypting with wrong key should fail
        let result = cipher2.decrypt(&ciphertext);
        assert!(result.is_err());
    }
}
