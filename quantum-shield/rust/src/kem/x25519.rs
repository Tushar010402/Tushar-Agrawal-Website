//! X25519 Key Encapsulation
//!
//! This module wraps X25519 ECDH as a KEM for use in the hybrid scheme.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use x25519_dalek::{EphemeralSecret, PublicKey, StaticSecret};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::utils::rng::SecureRng;
use crate::utils::serialize::{self, Deserialize, ObjectType, Serialize};

/// X25519 public key size in bytes
pub const X25519_PUBLIC_KEY_SIZE: usize = 32;

/// X25519 secret key size in bytes
pub const X25519_SECRET_KEY_SIZE: usize = 32;

/// X25519 shared secret size in bytes
pub const X25519_SHARED_SECRET_SIZE: usize = 32;

/// X25519 public key
#[derive(Clone)]
pub struct X25519PublicKey {
    key: PublicKey,
}

impl X25519PublicKey {
    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != X25519_PUBLIC_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let mut arr = [0u8; 32];
        arr.copy_from_slice(bytes);
        Ok(Self {
            key: PublicKey::from(arr),
        })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> &[u8; 32] {
        self.key.as_bytes()
    }

    /// Get the inner public key
    pub(crate) fn inner(&self) -> &PublicKey {
        &self.key
    }
}

impl Serialize for X25519PublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.key.as_bytes().to_vec())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(X25519_PUBLIC_KEY_SIZE)
    }
}

impl Deserialize for X25519PublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// X25519 secret key with automatic zeroization
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct X25519SecretKey {
    #[zeroize(skip)] // StaticSecret handles its own zeroization
    key: StaticSecret,
}

impl X25519SecretKey {
    /// Generate a new random secret key
    pub fn generate() -> Result<Self> {
        let mut rng = SecureRng::new();
        let key = StaticSecret::random_from_rng(&mut rng);
        Ok(Self { key })
    }

    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != X25519_SECRET_KEY_SIZE {
            return Err(QShieldError::InvalidKey);
        }

        let mut arr = [0u8; 32];
        arr.copy_from_slice(bytes);
        let key = StaticSecret::from(arr);
        arr.zeroize();

        Ok(Self { key })
    }

    /// Get the corresponding public key
    pub fn public_key(&self) -> X25519PublicKey {
        X25519PublicKey {
            key: PublicKey::from(&self.key),
        }
    }

    /// Perform Diffie-Hellman key exchange
    pub fn diffie_hellman(&self, their_public: &X25519PublicKey) -> Result<X25519SharedSecret> {
        let shared = self.key.diffie_hellman(&their_public.key);
        Ok(X25519SharedSecret {
            secret: *shared.as_bytes(),
        })
    }

    /// Get the inner secret key
    pub(crate) fn inner(&self) -> &StaticSecret {
        &self.key
    }

    /// Export as bytes (use with caution)
    pub fn to_bytes(&self) -> [u8; 32] {
        self.key.to_bytes()
    }
}

impl Clone for X25519SecretKey {
    fn clone(&self) -> Self {
        Self {
            key: StaticSecret::from(self.key.to_bytes()),
        }
    }
}

/// X25519 shared secret with automatic zeroization
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct X25519SharedSecret {
    secret: [u8; X25519_SHARED_SECRET_SIZE],
}

impl X25519SharedSecret {
    /// Get the secret bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.secret
    }
}

/// X25519 ciphertext (ephemeral public key)
#[derive(Clone)]
pub struct X25519Ciphertext {
    ephemeral_public: X25519PublicKey,
}

impl X25519Ciphertext {
    /// Create from an ephemeral public key
    pub fn new(ephemeral_public: X25519PublicKey) -> Self {
        Self { ephemeral_public }
    }

    /// Get the ephemeral public key
    pub fn ephemeral_public(&self) -> &X25519PublicKey {
        &self.ephemeral_public
    }

    /// Create from raw bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        let ephemeral_public = X25519PublicKey::from_bytes(bytes)?;
        Ok(Self { ephemeral_public })
    }

    /// Get the raw bytes
    pub fn as_bytes(&self) -> &[u8; 32] {
        self.ephemeral_public.as_bytes()
    }
}

impl Serialize for X25519Ciphertext {
    fn serialize(&self) -> Result<Vec<u8>> {
        Ok(self.ephemeral_public.as_bytes().to_vec())
    }

    fn serialized_size(&self) -> Option<usize> {
        Some(X25519_PUBLIC_KEY_SIZE)
    }
}

impl Deserialize for X25519Ciphertext {
    fn deserialize(data: &[u8]) -> Result<Self> {
        Self::from_bytes(data)
    }
}

/// X25519 KEM operations
pub struct X25519Kem;

impl X25519Kem {
    /// Generate a new key pair
    pub fn generate_keypair() -> Result<(X25519PublicKey, X25519SecretKey)> {
        let secret_key = X25519SecretKey::generate()?;
        let public_key = secret_key.public_key();
        Ok((public_key, secret_key))
    }

    /// Encapsulate a shared secret to a public key
    ///
    /// Returns (ciphertext, shared_secret)
    pub fn encapsulate(public_key: &X25519PublicKey) -> Result<(X25519Ciphertext, X25519SharedSecret)> {
        let mut rng = SecureRng::new();
        let ephemeral_secret = EphemeralSecret::random_from_rng(&mut rng);
        let ephemeral_public = PublicKey::from(&ephemeral_secret);

        let shared = ephemeral_secret.diffie_hellman(&public_key.key);

        let ciphertext = X25519Ciphertext {
            ephemeral_public: X25519PublicKey { key: ephemeral_public },
        };

        let shared_secret = X25519SharedSecret {
            secret: *shared.as_bytes(),
        };

        Ok((ciphertext, shared_secret))
    }

    /// Decapsulate a shared secret from a ciphertext
    pub fn decapsulate(
        secret_key: &X25519SecretKey,
        ciphertext: &X25519Ciphertext,
    ) -> Result<X25519SharedSecret> {
        secret_key.diffie_hellman(&ciphertext.ephemeral_public)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (public_key, _secret_key) = X25519Kem::generate_keypair().unwrap();
        assert_eq!(public_key.as_bytes().len(), X25519_PUBLIC_KEY_SIZE);
    }

    #[test]
    fn test_encapsulate_decapsulate() {
        let (public_key, secret_key) = X25519Kem::generate_keypair().unwrap();

        let (ciphertext, shared_secret_enc) = X25519Kem::encapsulate(&public_key).unwrap();
        let shared_secret_dec = X25519Kem::decapsulate(&secret_key, &ciphertext).unwrap();

        assert_eq!(shared_secret_enc.as_bytes(), shared_secret_dec.as_bytes());
    }

    #[test]
    fn test_serialization() {
        let (public_key, _) = X25519Kem::generate_keypair().unwrap();

        let serialized = public_key.serialize().unwrap();
        let deserialized = X25519PublicKey::deserialize(&serialized).unwrap();

        assert_eq!(public_key.as_bytes(), deserialized.as_bytes());
    }

    #[test]
    fn test_different_keys_different_secrets() {
        let (public_key1, secret_key1) = X25519Kem::generate_keypair().unwrap();
        let (public_key2, secret_key2) = X25519Kem::generate_keypair().unwrap();

        let (ciphertext, _) = X25519Kem::encapsulate(&public_key1).unwrap();

        // Decapsulating with wrong key should give different result
        let secret1 = X25519Kem::decapsulate(&secret_key1, &ciphertext).unwrap();
        let secret2 = X25519Kem::decapsulate(&secret_key2, &ciphertext).unwrap();

        assert_ne!(secret1.as_bytes(), secret2.as_bytes());
    }
}
