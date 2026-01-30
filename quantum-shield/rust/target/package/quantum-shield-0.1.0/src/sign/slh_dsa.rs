//! SLH-DSA (NIST FIPS 205) Digital Signatures
//!
//! This module wraps SLH-DSA-SHA2-128s (SPHINCS+-SHA2-128s) for use in the dual-signature scheme.
//! SLH-DSA provides hash-based signatures with conservative security assumptions.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use pqcrypto_sphincsplus::sphincssha2128ssimple as sphincs;
use pqcrypto_traits::sign::{PublicKey, SecretKey, DetachedSignature};
use zeroize::ZeroizeOnDrop;

use crate::error::{QShieldError, Result};
use crate::utils::serialize::{Deserialize, Serialize};

/// SLH-DSA-SHA2-128s public key size in bytes
pub const SLH_DSA_PUBLIC_KEY_SIZE: usize = 32;

/// SLH-DSA-SHA2-128s secret key size in bytes
pub const SLH_DSA_SECRET_KEY_SIZE: usize = 64;

/// SLH-DSA-SHA2-128s signature size in bytes
pub const SLH_DSA_SIGNATURE_SIZE: usize = 7856;

/// SLH-DSA public key
#[derive(Clone)]
pub struct SlhDsaPublicKey {
    key: sphincs::PublicKey,
}

impl SlhDsaPublicKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != SLH_DSA_PUBLIC_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = sphincs::PublicKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &sphincs::PublicKey {
        &self.key
    }
}

impl Serialize for SlhDsaPublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(SLH_DSA_PUBLIC_KEY_SIZE)
    }
}

impl Deserialize for SlhDsaPublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// SLH-DSA secret key with automatic zeroization
#[derive(ZeroizeOnDrop)]
pub struct SlhDsaSecretKey {
    #[zeroize(skip)]
    key: sphincs::SecretKey,
}

impl SlhDsaSecretKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != SLH_DSA_SECRET_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let key = sphincs::SecretKey::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidKey)?;

        Ok(Self { key })
    }

    /// Get the raw bytes (use with caution)
    pub fn as_bytes(&self) -> Vec<u8> {
        self.key.as_bytes().to_vec()
    }

    /// Get the inner key
    pub(crate) fn inner(&self) -> &sphincs::SecretKey {
        &self.key
    }
}

impl Clone for SlhDsaSecretKey {
    fn clone(&self) -> Self {
        Self::from_bytes(&self.key.as_bytes()).unwrap()
    }
}

/// SLH-DSA signature
#[derive(Clone)]
pub struct SlhDsaSignature {
    signature: sphincs::DetachedSignature,
}

impl SlhDsaSignature {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != SLH_DSA_SIGNATURE_SIZE {
            return Err(QShieldError::InvalidSignature);
        }

        let signature = sphincs::DetachedSignature::from_bytes(bytes)
            .map_err(|_| QShieldError::InvalidSignature)?;

        Ok(Self { signature })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> Vec<u8> {
        self.signature.as_bytes().to_vec()
    }

    /// Get the inner signature
    pub(crate) fn inner(&self) -> &sphincs::DetachedSignature {
        &self.signature
    }
}

impl Serialize for SlhDsaSignature {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.as_bytes())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(SLH_DSA_SIGNATURE_SIZE)
    }
}

impl Deserialize for SlhDsaSignature {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// SLH-DSA signing operations
pub struct SlhDsa;

impl SlhDsa {
    /// Generate a new key pair
    pub fn generate_keypair() -> Result<(SlhDsaPublicKey, SlhDsaSecretKey)> {
        let (public_key, secret_key) = sphincs::keypair();

        Ok((
            SlhDsaPublicKey { key: public_key },
            SlhDsaSecretKey { key: secret_key },
        ))
    }

    /// Sign a message
    pub fn sign(secret_key: &SlhDsaSecretKey, message: &[u8]) -> Result<SlhDsaSignature> {
        let signature = sphincs::detached_sign(message, &secret_key.key);
        Ok(SlhDsaSignature { signature })
    }

    /// Verify a signature
    pub fn verify(
        public_key: &SlhDsaPublicKey,
        message: &[u8],
        signature: &SlhDsaSignature,
    ) -> Result<bool> {
        match sphincs::verify_detached_signature(&signature.signature, message, &public_key.key) {
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
        let (public_key, _) = SlhDsa::generate_keypair().unwrap();
        assert_eq!(public_key.as_bytes().len(), SLH_DSA_PUBLIC_KEY_SIZE);
    }

    #[test]
    fn test_sign_verify() {
        let (public_key, secret_key) = SlhDsa::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";

        let signature = SlhDsa::sign(&secret_key, message).unwrap();
        let valid = SlhDsa::verify(&public_key, message, &signature).unwrap();

        assert!(valid);
    }

    #[test]
    fn test_invalid_signature() {
        let (public_key, secret_key) = SlhDsa::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";
        let wrong_message = b"Wrong message";

        let signature = SlhDsa::sign(&secret_key, message).unwrap();
        let valid = SlhDsa::verify(&public_key, wrong_message, &signature).unwrap();

        assert!(!valid);
    }

    #[test]
    fn test_signature_size() {
        let (_, secret_key) = SlhDsa::generate_keypair().unwrap();
        let message = b"Test message";

        let signature = SlhDsa::sign(&secret_key, message).unwrap();
        assert_eq!(signature.as_bytes().len(), SLH_DSA_SIGNATURE_SIZE);
    }
}
