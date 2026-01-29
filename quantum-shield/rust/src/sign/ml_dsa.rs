//! ML-DSA (NIST FIPS 204) Digital Signatures
//!
//! This module wraps ML-DSA-65 (Dilithium3) for use in the dual-signature scheme.
//! ML-DSA provides efficient lattice-based signatures.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use pqcrypto_dilithium::dilithium3;
use pqcrypto_traits::sign::{PublicKey, SecretKey, SignedMessage, DetachedSignature};
use zeroize::ZeroizeOnDrop;

use crate::error::{QShieldError, Result};
use crate::utils::serialize::{Deserialize, Serialize};

/// ML-DSA-65 public key size in bytes
pub const ML_DSA_PUBLIC_KEY_SIZE: usize = 1952;

/// ML-DSA-65 secret key size in bytes
pub const ML_DSA_SECRET_KEY_SIZE: usize = 4016;

/// ML-DSA-65 signature size in bytes (Dilithium3)
pub const ML_DSA_SIGNATURE_SIZE: usize = 3309;

/// ML-DSA public key
#[derive(Clone)]
pub struct MlDsaPublicKey {
    key: dilithium3::PublicKey,
}

impl MlDsaPublicKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_DSA_PUBLIC_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = dilithium3::PublicKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &dilithium3::PublicKey {
        &self.key
    }
}

impl Serialize for MlDsaPublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(ML_DSA_PUBLIC_KEY_SIZE)
    }
}

impl Deserialize for MlDsaPublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// ML-DSA secret key with automatic zeroization
#[derive(ZeroizeOnDrop)]
pub struct MlDsaSecretKey {
    #[zeroize(skip)]
    key: dilithium3::SecretKey,
}

impl MlDsaSecretKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_DSA_SECRET_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = dilithium3::SecretKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes (use with caution)
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &dilithium3::SecretKey {
        &self.key
    }
}

impl Clone for MlDsaSecretKey {
    fn clone(&self) -> Self {
        Self::from_bytes(&self.key.as_bytes()).unwrap()
    }
}

/// ML-DSA signature
#[derive(Clone)]
pub struct MlDsaSignature {
    signature: dilithium3::DetachedSignature,
}

impl MlDsaSignature {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != ML_DSA_SIGNATURE_SIZE {
            return Err(QShieldError::InvalidSignature);
        }

        let signature = dilithium3::DetachedSignature::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidSignature)?;

        Ok(Self { signature })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.signature.as_bytes().to_vec()
    }

    /// Get the inner signature
    pub(crate) fn inner(&self) -> &dilithium3::DetachedSignature {
        &self.signature
    }
}

impl Serialize for MlDsaSignature {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(ML_DSA_SIGNATURE_SIZE)
    }
}

impl Deserialize for MlDsaSignature {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// ML-DSA signing operations
pub struct MlDsa;

impl MlDsa {
    /// Generate a new key pair
    pub fn generate_keypair() -> Result<(MlDsaPublicKey, MlDsaSecretKey)> {
        let (public_key, secret_key) = dilithium3::keypair();

        Ok((
            MlDsaPublicKey { key: public_key },
            MlDsaSecretKey { key: secret_key },
        ))
    }

    /// Sign a message
    pub fn sign(secret_key: &MlDsaSecretKey, message: &[u8]) -> Result<MlDsaSignature> {
        let signature = dilithium3::detached_sign(message, &secret_key.key);
        Ok(MlDsaSignature { signature })
    }

    /// Verify a signature
    pub fn verify(
        public_key: &MlDsaPublicKey,
        message: &[u8],
        signature: &MlDsaSignature,
    ) -> Result<bool> {
        match dilithium3::verify_detached_signature(&signature.signature, message, &public_key.key) {
            Ok(()) => Ok(true),
            Err(_) => Ok(false),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (public_key, _) = MlDsa::generate_keypair().unwrap();
        assert_eq!(public_key.as_bytes().len(), ML_DSA_PUBLIC_KEY_SIZE);
    }

    #[test]
    fn test_sign_verify() {
        let (public_key, secret_key) = MlDsa::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";

        let signature = MlDsa::sign(&secret_key, message).unwrap();
        let valid = MlDsa::verify(&public_key, message, &signature).unwrap();

        assert!(valid);
    }

    #[test]
    fn test_invalid_signature() {
        let (public_key, secret_key) = MlDsa::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";
        let wrong_message = b"Wrong message";

        let signature = MlDsa::sign(&secret_key, message).unwrap();
        let valid = MlDsa::verify(&public_key, wrong_message, &signature).unwrap();

        assert!(!valid);
    }

    #[test]
    fn test_signature_serialization() {
        let (_, secret_key) = MlDsa::generate_keypair().unwrap();
        let message = b"Test message";

        let signature = MlDsa::sign(&secret_key, message).unwrap();
        let serialized = signature.serialize().unwrap();
        let deserialized = MlDsaSignature::deserialize(&serialized).unwrap();

        assert_eq!(signature.as_bytes(), deserialized.as_bytes());
    }
}
