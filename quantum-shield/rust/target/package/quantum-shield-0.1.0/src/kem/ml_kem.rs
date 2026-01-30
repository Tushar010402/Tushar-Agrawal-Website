//! ML-KEM (NIST FIPS 203) Key Encapsulation
//!
//! This module wraps ML-KEM-768 for use in the hybrid scheme.
//! ML-KEM provides post-quantum security based on the Module Learning with Errors problem.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use pqcrypto_mlkem::mlkem768;
use pqcrypto_traits::kem::{Ciphertext, PublicKey, SecretKey, SharedSecret};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::utils::serialize::{self, Deserialize, Serialize};

/// ML-KEM-768 public key size in bytes
pub const ML_KEM_PUBLIC_KEY_SIZE: usize = 1184;

/// ML-KEM-768 secret key size in bytes
pub const ML_KEM_SECRET_KEY_SIZE: usize = 2400;

/// ML-KEM-768 ciphertext size in bytes
pub const ML_KEM_CIPHERTEXT_SIZE: usize = 1088;

/// ML-KEM-768 shared secret size in bytes
pub const ML_KEM_SHARED_SECRET_SIZE: usize = 32;

/// ML-KEM public key
#[derive(Clone)]
pub struct MlKemPublicKey {
    key: mlkem768::PublicKey,
}

impl MlKemPublicKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_KEM_PUBLIC_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = mlkem768::PublicKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &mlkem768::PublicKey {
        &self.key
    }
}

impl Serialize for MlKemPublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(ML_KEM_PUBLIC_KEY_SIZE)
    }
}

impl Deserialize for MlKemPublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// ML-KEM secret key with automatic zeroization
#[derive(ZeroizeOnDrop)]
pub struct MlKemSecretKey {
    #[zeroize(skip)]
    key: mlkem768::SecretKey,
}

impl MlKemSecretKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_KEM_SECRET_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = mlkem768::SecretKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes (use with caution)
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &mlkem768::SecretKey {
        &self.key
    }
}

impl Clone for MlKemSecretKey {
    fn clone(&self) -> Self {
        // This is safe because we're cloning the underlying bytes
        Self::from_bytes(&self.key.as_bytes()).unwrap()
    }
}

/// ML-KEM shared secret with automatic zeroization
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct MlKemSharedSecret {
    secret: [u8; ML_KEM_SHARED_SECRET_SIZE],
}

impl MlKemSharedSecret {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_KEM_SHARED_SECRET_SIZE {
            return Err(QShieldError::KeyDerivationFailed);
        }

        let mut secret = [0u8; ML_KEM_SHARED_SECRET_SIZE];
        secret.copy_from_slice(bytes);

        Ok(Self { secret })
    }

    /// Get the secret bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.secret
    }
}

/// ML-KEM ciphertext
#[derive(Clone)]
pub struct MlKemCiphertext {
    ciphertext: mlkem768::Ciphertext,
}

impl MlKemCiphertext {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_KEM_CIPHERTEXT_SIZE {
            return Err(QShieldError::InvalidCiphertext);
        }

        let ciphertext = mlkem768::Ciphertext::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidCiphertext)?;

        Ok(Self { ciphertext })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.ciphertext.as_bytes().to_vec()
    }

    /// Get the inner ciphertext
    pub(crate) fn inner(&self) -> &mlkem768::Ciphertext {
        &self.ciphertext
    }
}

impl Serialize for MlKemCiphertext {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(ML_KEM_CIPHERTEXT_SIZE)
    }
}

impl Deserialize for MlKemCiphertext {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// ML-KEM KEM operations
pub struct MlKem;

impl MlKem {
    /// Generate a new key pair
    pub fn generate_keypair() -> Result<(MlKemPublicKey, MlKemSecretKey)> {
        let (public_key, secret_key) = mlkem768::keypair();

        Ok((
            MlKemPublicKey { key: public_key },
            MlKemSecretKey { key: secret_key },
        ))
    }

    /// Encapsulate a shared secret to a public key
    ///
    /// Returns (ciphertext, shared_secret)
    pub fn encapsulate(public_key: &MlKemPublicKey) -> Result<(MlKemCiphertext, MlKemSharedSecret)> {
        let (shared_secret, ciphertext) = mlkem768::encapsulate(&public_key.key);

        let mut secret_bytes = [0u8; ML_KEM_SHARED_SECRET_SIZE];
        secret_bytes.copy_from_slice(shared_secret.as_bytes());

        Ok((
            MlKemCiphertext { ciphertext },
            MlKemSharedSecret { secret: secret_bytes },
        ))
    }

    /// Decapsulate a shared secret from a ciphertext
    pub fn decapsulate(
        secret_key: &MlKemSecretKey,
        ciphertext: &MlKemCiphertext,
    ) -> Result<MlKemSharedSecret> {
        let shared_secret = mlkem768::decapsulate(&ciphertext.ciphertext, &secret_key.key);

        let mut secret_bytes = [0u8; ML_KEM_SHARED_SECRET_SIZE];
        secret_bytes.copy_from_slice(shared_secret.as_bytes());

        Ok(MlKemSharedSecret { secret: secret_bytes })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (public_key, _secret_key) = MlKem::generate_keypair().unwrap();
        assert_eq!(public_key.as_bytes().len(), ML_KEM_PUBLIC_KEY_SIZE);
    }

    #[test]
    fn test_encapsulate_decapsulate() {
        let (public_key, secret_key) = MlKem::generate_keypair().unwrap();

        let (ciphertext, shared_secret_enc) = MlKem::encapsulate(&public_key).unwrap();
        let shared_secret_dec = MlKem::decapsulate(&secret_key, &ciphertext).unwrap();

        assert_eq!(shared_secret_enc.as_bytes(), shared_secret_dec.as_bytes());
    }

    #[test]
    fn test_ciphertext_size() {
        let (public_key, _) = MlKem::generate_keypair().unwrap();
        let (ciphertext, _) = MlKem::encapsulate(&public_key).unwrap();

        assert_eq!(ciphertext.as_bytes().len(), ML_KEM_CIPHERTEXT_SIZE);
    }

    #[test]
    fn test_serialization() {
        let (public_key, _) = MlKem::generate_keypair().unwrap();

        let serialized = public_key.serialize().unwrap();
        let deserialized = MlKemPublicKey::deserialize(&serialized).unwrap();

        assert_eq!(public_key.as_bytes(), deserialized.as_bytes());
    }
}
