//! Cryptographic operations for QuantumAuth
//!
//! Implements dual signatures (Ed25519 + ML-DSA-65) and encryption (XChaCha20-Poly1305).

use crate::error::{QAuthError, Result};
use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use ed25519_dalek::{
    Signature as Ed25519Signature, Signer, SigningKey as Ed25519SigningKey,
    Verifier, VerifyingKey as Ed25519VerifyingKey,
};
use pqcrypto_dilithium::dilithium3::{
    self, DetachedSignature as MlDsaSignature, PublicKey as MlDsaPublicKey,
    SecretKey as MlDsaSecretKey,
};
use pqcrypto_traits::sign::{DetachedSignature, PublicKey, SecretKey};
use sha2::{Digest, Sha256};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Size constants
pub const ED25519_SIGNATURE_SIZE: usize = 64;
pub const MLDSA_SIGNATURE_SIZE: usize = 3309; // Dilithium3 signature size
pub const DUAL_SIGNATURE_SIZE: usize = ED25519_SIGNATURE_SIZE + MLDSA_SIGNATURE_SIZE;
pub const XCHACHA20_NONCE_SIZE: usize = 24;
pub const XCHACHA20_TAG_SIZE: usize = 16;
pub const KEY_SIZE: usize = 32;
pub const KEY_ID_SIZE: usize = 32;

/// Ed25519 signing key pair
#[derive(ZeroizeOnDrop)]
pub struct Ed25519KeyPair {
    #[zeroize(skip)]
    signing_key: Ed25519SigningKey,
}

impl Ed25519KeyPair {
    /// Generate a new random keypair
    pub fn generate() -> Self {
        let signing_key = Ed25519SigningKey::generate(&mut OsRng);
        Self { signing_key }
    }

    /// Create from secret key bytes
    pub fn from_bytes(bytes: &[u8; 32]) -> Result<Self> {
        let signing_key = Ed25519SigningKey::from_bytes(bytes);
        Ok(Self { signing_key })
    }

    /// Get the public key bytes
    pub fn public_key_bytes(&self) -> [u8; 32] {
        self.signing_key.verifying_key().to_bytes()
    }

    /// Sign a message
    pub fn sign(&self, message: &[u8]) -> [u8; ED25519_SIGNATURE_SIZE] {
        self.signing_key.sign(message).to_bytes()
    }

    /// Get the private key bytes
    pub fn private_key_bytes(&self) -> [u8; 32] {
        self.signing_key.to_bytes()
    }
}

/// ML-DSA-65 (Dilithium3) signing key pair
#[derive(ZeroizeOnDrop)]
pub struct MlDsaKeyPair {
    #[zeroize(skip)]
    public_key: MlDsaPublicKey,
    #[zeroize(skip)]
    secret_key: MlDsaSecretKey,
}

impl MlDsaKeyPair {
    /// Generate a new random keypair
    pub fn generate() -> Self {
        let (public_key, secret_key) = dilithium3::keypair();
        Self {
            public_key,
            secret_key,
        }
    }

    /// Get the public key bytes
    pub fn public_key_bytes(&self) -> Vec<u8> {
        self.public_key.as_bytes().to_vec()
    }

    /// Sign a message
    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        let sig = dilithium3::detached_sign(message, &self.secret_key);
        sig.as_bytes().to_vec()
    }

    /// Get the private key bytes
    pub fn private_key_bytes(&self) -> Vec<u8> {
        self.secret_key.as_bytes().to_vec()
    }

    /// Create from raw bytes
    pub fn from_bytes(public_bytes: &[u8], secret_bytes: &[u8]) -> Result<Self> {
        let public_key = MlDsaPublicKey::from_bytes(public_bytes)
            .map_err(|_| QAuthError::CryptoError)?;
        let secret_key = MlDsaSecretKey::from_bytes(secret_bytes)
            .map_err(|_| QAuthError::CryptoError)?;
        Ok(Self {
            public_key,
            secret_key,
        })
    }
}

/// Combined issuer signing keys for dual signatures
pub struct IssuerSigningKeys {
    pub ed25519: Ed25519KeyPair,
    pub mldsa: MlDsaKeyPair,
}

impl IssuerSigningKeys {
    /// Generate new issuer signing keys
    pub fn generate() -> Self {
        Self {
            ed25519: Ed25519KeyPair::generate(),
            mldsa: MlDsaKeyPair::generate(),
        }
    }

    /// Create from raw bytes
    pub fn from_bytes(
        ed25519_public: &[u8],
        ed25519_private: &[u8],
        mldsa_public: &[u8],
        mldsa_private: &[u8],
    ) -> Result<Self> {
        if ed25519_private.len() != 32 {
            return Err(QAuthError::CryptoError);
        }
        let mut ed25519_private_arr = [0u8; 32];
        ed25519_private_arr.copy_from_slice(ed25519_private);

        let ed25519 = Ed25519KeyPair::from_bytes(&ed25519_private_arr)?;

        // Verify public key matches
        if ed25519.public_key_bytes() != ed25519_public {
            return Err(QAuthError::CryptoError);
        }

        let mldsa = MlDsaKeyPair::from_bytes(mldsa_public, mldsa_private)?;

        Ok(Self { ed25519, mldsa })
    }

    /// Compute the Key ID (SHA-256 of combined public keys)
    pub fn key_id(&self) -> [u8; KEY_ID_SIZE] {
        let mut hasher = Sha256::new();
        hasher.update(&[0x51, 0x41]); // "QA" magic bytes
        hasher.update(self.ed25519.public_key_bytes());
        hasher.update(self.mldsa.public_key_bytes());
        hasher.finalize().into()
    }

    /// Create dual signature over a message
    pub fn sign(&self, message: &[u8]) -> DualSignature {
        let ed25519_sig = self.ed25519.sign(message);
        let mldsa_sig = self.mldsa.sign(message);
        DualSignature {
            ed25519: ed25519_sig,
            mldsa: mldsa_sig,
        }
    }
}

/// Combined public keys for verification
pub struct IssuerVerifyingKeys {
    pub ed25519: Ed25519VerifyingKey,
    pub mldsa: MlDsaPublicKey,
}

impl IssuerVerifyingKeys {
    /// Create from raw bytes
    pub fn from_bytes(ed25519_bytes: &[u8; 32], mldsa_bytes: &[u8]) -> Result<Self> {
        let ed25519 = Ed25519VerifyingKey::from_bytes(ed25519_bytes)
            .map_err(|_| QAuthError::CryptoError)?;
        let mldsa = MlDsaPublicKey::from_bytes(mldsa_bytes)
            .map_err(|_| QAuthError::CryptoError)?;
        Ok(Self { ed25519, mldsa })
    }

    /// Compute the Key ID
    pub fn key_id(&self) -> [u8; KEY_ID_SIZE] {
        let mut hasher = Sha256::new();
        hasher.update(&[0x51, 0x41]); // "QA" magic bytes
        hasher.update(self.ed25519.to_bytes());
        hasher.update(self.mldsa.as_bytes());
        hasher.finalize().into()
    }

    /// Verify a dual signature
    pub fn verify(&self, message: &[u8], signature: &DualSignature) -> Result<()> {
        // Verify Ed25519 signature
        let ed25519_sig = Ed25519Signature::from_bytes(&signature.ed25519);
        self.ed25519
            .verify(message, &ed25519_sig)
            .map_err(|_| QAuthError::CryptoError)?;

        // Verify ML-DSA signature
        let mldsa_sig = MlDsaSignature::from_bytes(&signature.mldsa)
            .map_err(|_| QAuthError::CryptoError)?;
        dilithium3::verify_detached_signature(&mldsa_sig, message, &self.mldsa)
            .map_err(|_| QAuthError::CryptoError)?;

        Ok(())
    }
}

/// Dual signature (Ed25519 + ML-DSA-65)
#[derive(Clone)]
pub struct DualSignature {
    pub ed25519: [u8; ED25519_SIGNATURE_SIZE],
    pub mldsa: Vec<u8>,
}

impl DualSignature {
    /// Serialize to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(DUAL_SIGNATURE_SIZE);
        bytes.extend_from_slice(&self.ed25519);
        bytes.extend_from_slice(&self.mldsa);
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < DUAL_SIGNATURE_SIZE {
            return Err(QAuthError::InvalidInput("Signature too short".into()));
        }

        let ed25519: [u8; ED25519_SIGNATURE_SIZE] = bytes[..ED25519_SIGNATURE_SIZE]
            .try_into()
            .map_err(|_| QAuthError::InvalidInput("Invalid Ed25519 signature".into()))?;

        // Only take exactly MLDSA_SIGNATURE_SIZE bytes, not the remaining bytes
        let mldsa = bytes[ED25519_SIGNATURE_SIZE..ED25519_SIGNATURE_SIZE + MLDSA_SIGNATURE_SIZE].to_vec();

        Ok(Self { ed25519, mldsa })
    }
}

/// Encryption key for payload encryption
#[derive(ZeroizeOnDrop)]
pub struct EncryptionKey {
    pub(crate) key: [u8; KEY_SIZE],
}

impl EncryptionKey {
    /// Generate a new random encryption key
    pub fn generate() -> Self {
        let key: [u8; KEY_SIZE] = rand::random();
        Self { key }
    }

    /// Create from bytes
    pub fn from_bytes(bytes: [u8; KEY_SIZE]) -> Self {
        Self { key: bytes }
    }

    /// Get the key bytes (for creating validators)
    pub fn to_bytes(&self) -> [u8; KEY_SIZE] {
        self.key
    }

    /// Encrypt data with XChaCha20-Poly1305
    pub fn encrypt(&self, plaintext: &[u8], aad: &[u8]) -> Result<EncryptedData> {
        let cipher = XChaCha20Poly1305::new((&self.key).into());
        let nonce = XChaCha20Poly1305::generate_nonce(&mut OsRng);

        let ciphertext = cipher
            .encrypt(&nonce, chacha20poly1305::aead::Payload { msg: plaintext, aad })
            .map_err(|_| QAuthError::CryptoError)?;

        Ok(EncryptedData {
            nonce: nonce.into(),
            ciphertext,
        })
    }

    /// Decrypt data with XChaCha20-Poly1305
    pub fn decrypt(&self, encrypted: &EncryptedData, aad: &[u8]) -> Result<Vec<u8>> {
        let cipher = XChaCha20Poly1305::new((&self.key).into());
        let nonce = XNonce::from_slice(&encrypted.nonce);

        cipher
            .decrypt(nonce, chacha20poly1305::aead::Payload { msg: &encrypted.ciphertext, aad })
            .map_err(|_| QAuthError::CryptoError)
    }
}

/// Encrypted data with nonce
pub struct EncryptedData {
    pub nonce: [u8; XCHACHA20_NONCE_SIZE],
    pub ciphertext: Vec<u8>,
}

impl EncryptedData {
    /// Serialize to bytes (nonce || ciphertext)
    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(self.nonce.len() + self.ciphertext.len());
        bytes.extend_from_slice(&self.nonce);
        bytes.extend_from_slice(&self.ciphertext);
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < XCHACHA20_NONCE_SIZE {
            return Err(QAuthError::InvalidInput("Encrypted data too short".into()));
        }

        let nonce: [u8; XCHACHA20_NONCE_SIZE] = bytes[..XCHACHA20_NONCE_SIZE]
            .try_into()
            .map_err(|_| QAuthError::InvalidInput("Invalid nonce".into()))?;

        let ciphertext = bytes[XCHACHA20_NONCE_SIZE..].to_vec();

        Ok(Self { nonce, ciphertext })
    }
}

/// Compute SHA-256 hash
pub fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

/// Compute SHA-256 hash of multiple inputs
pub fn sha256_multi(inputs: &[&[u8]]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    for input in inputs {
        hasher.update(input);
    }
    hasher.finalize().into()
}

/// Constant-time comparison
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    use subtle::ConstantTimeEq;
    a.ct_eq(b).into()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ed25519_sign_verify() {
        let keypair = Ed25519KeyPair::generate();
        let message = b"test message";
        let signature = keypair.sign(message);

        let verifying_key = Ed25519VerifyingKey::from_bytes(&keypair.public_key_bytes()).unwrap();
        let sig = Ed25519Signature::from_bytes(&signature);
        assert!(verifying_key.verify(message, &sig).is_ok());
    }

    #[test]
    fn test_mldsa_sign_verify() {
        let keypair = MlDsaKeyPair::generate();
        let message = b"test message";
        let signature = keypair.sign(message);

        let public_key = MlDsaPublicKey::from_bytes(&keypair.public_key_bytes()).unwrap();
        let sig = MlDsaSignature::from_bytes(&signature).unwrap();
        assert!(dilithium3::verify_detached_signature(&sig, message, &public_key).is_ok());
    }

    #[test]
    fn test_dual_signature() {
        let issuer_keys = IssuerSigningKeys::generate();
        let message = b"test message";
        let signature = issuer_keys.sign(message);

        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &issuer_keys.ed25519.public_key_bytes(),
            &issuer_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        assert!(verifying_keys.verify(message, &signature).is_ok());
    }

    #[test]
    fn test_encryption_decryption() {
        let key = EncryptionKey::generate();
        let plaintext = b"sensitive data";
        let aad = b"header";

        let encrypted = key.encrypt(plaintext, aad).unwrap();
        let decrypted = key.decrypt(&encrypted, aad).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_encryption_with_wrong_aad_fails() {
        let key = EncryptionKey::generate();
        let plaintext = b"sensitive data";
        let aad = b"header";

        let encrypted = key.encrypt(plaintext, aad).unwrap();
        let result = key.decrypt(&encrypted, b"wrong aad");

        assert!(result.is_err());
    }

    #[test]
    fn test_key_id_computation() {
        let issuer_keys = IssuerSigningKeys::generate();
        let key_id_1 = issuer_keys.key_id();

        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &issuer_keys.ed25519.public_key_bytes(),
            &issuer_keys.mldsa.public_key_bytes(),
        )
        .unwrap();
        let key_id_2 = verifying_keys.key_id();

        assert_eq!(key_id_1, key_id_2);
    }
}
