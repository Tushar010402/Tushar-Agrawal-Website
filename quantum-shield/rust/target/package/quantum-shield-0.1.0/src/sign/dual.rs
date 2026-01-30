//! QShieldSign - Dual Digital Signature Scheme
//!
//! Combines ML-DSA-65 (lattice-based) with SLH-DSA-SHA2-128s (hash-based)
//! for defense-in-depth. Both signatures must verify for the combined
//! signature to be valid.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use sha3::{Digest, Sha3_256};
use zeroize::ZeroizeOnDrop;

use crate::error::{QShieldError, Result};
use crate::utils::serialize::{
    read_length_prefixed, write_length_prefixed, Deserialize, Header, ObjectType, Serialize,
};

use super::ml_dsa::{MlDsa, MlDsaPublicKey, MlDsaSecretKey, MlDsaSignature, ML_DSA_PUBLIC_KEY_SIZE, ML_DSA_SIGNATURE_SIZE};
use super::slh_dsa::{SlhDsa, SlhDsaPublicKey, SlhDsaSecretKey, SlhDsaSignature, SLH_DSA_PUBLIC_KEY_SIZE, SLH_DSA_SIGNATURE_SIZE};

/// QShieldSign public key combining ML-DSA and SLH-DSA
#[derive(Clone)]
pub struct QShieldSignPublicKey {
    /// ML-DSA public key
    pub ml_dsa: MlDsaPublicKey,
    /// SLH-DSA public key
    pub slh_dsa: SlhDsaPublicKey,
}

impl QShieldSignPublicKey {
    /// Create a new combined public key
    pub fn new(ml_dsa: MlDsaPublicKey, slh_dsa: SlhDsaPublicKey) -> Self {
        Self { ml_dsa, slh_dsa }
    }

    /// Get the total serialized size
    pub fn serialized_size() -> usize {
        Header::SIZE + 4 + ML_DSA_PUBLIC_KEY_SIZE + 4 + SLH_DSA_PUBLIC_KEY_SIZE
    }

    /// Compute a fingerprint of the public key
    pub fn fingerprint(&self) -> [u8; 32] {
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShieldSign-fingerprint-v1");
        hasher.update(&self.ml_dsa.as_bytes());
        hasher.update(&self.slh_dsa.as_bytes());
        let result = hasher.finalize();
        let mut fingerprint = [0u8; 32];
        fingerprint.copy_from_slice(&result);
        fingerprint
    }
}

impl Serialize for QShieldSignPublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        let ml_dsa_bytes = self.ml_dsa.as_bytes();
        let slh_dsa_bytes = self.slh_dsa.as_bytes();

        let payload_size = 4 + ml_dsa_bytes.len() + 4 + slh_dsa_bytes.len();
        let header = Header::new(ObjectType::PublicKey, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&ml_dsa_bytes, &mut buf);
        write_length_prefixed(&slh_dsa_bytes, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldSignPublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::PublicKey {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let ml_dsa_bytes = read_length_prefixed(data, &mut offset)?;
        let slh_dsa_bytes = read_length_prefixed(data, &mut offset)?;

        let ml_dsa = MlDsaPublicKey::from_bytes(&ml_dsa_bytes)?;
        let slh_dsa = SlhDsaPublicKey::from_bytes(&slh_dsa_bytes)?;

        Ok(Self { ml_dsa, slh_dsa })
    }
}

/// QShieldSign secret key with automatic zeroization
#[derive(Clone, ZeroizeOnDrop)]
pub struct QShieldSignSecretKey {
    #[zeroize(skip)]
    pub ml_dsa: MlDsaSecretKey,
    #[zeroize(skip)]
    pub slh_dsa: SlhDsaSecretKey,
}

impl QShieldSignSecretKey {
    /// Create a new combined secret key
    pub fn new(ml_dsa: MlDsaSecretKey, slh_dsa: SlhDsaSecretKey) -> Self {
        Self { ml_dsa, slh_dsa }
    }
}

impl Serialize for QShieldSignSecretKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        let ml_dsa_bytes = self.ml_dsa.as_bytes();
        let slh_dsa_bytes = self.slh_dsa.as_bytes();

        let payload_size = 4 + ml_dsa_bytes.len() + 4 + slh_dsa_bytes.len();
        let header = Header::new(ObjectType::SecretKey, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&ml_dsa_bytes, &mut buf);
        write_length_prefixed(&slh_dsa_bytes, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldSignSecretKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::SecretKey {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let ml_dsa_bytes = read_length_prefixed(data, &mut offset)?;
        let slh_dsa_bytes = read_length_prefixed(data, &mut offset)?;

        let ml_dsa = MlDsaSecretKey::from_bytes(&ml_dsa_bytes)?;
        let slh_dsa = SlhDsaSecretKey::from_bytes(&slh_dsa_bytes)?;

        Ok(Self { ml_dsa, slh_dsa })
    }
}

/// QShieldSign dual signature
#[derive(Clone)]
pub struct QShieldSignature {
    /// ML-DSA signature
    pub ml_dsa: MlDsaSignature,
    /// SLH-DSA signature
    pub slh_dsa: SlhDsaSignature,
    /// Optional timestamp (Unix epoch in seconds)
    pub timestamp: Option<u64>,
}

impl QShieldSignature {
    /// Create a new combined signature
    pub fn new(ml_dsa: MlDsaSignature, slh_dsa: SlhDsaSignature) -> Self {
        Self {
            ml_dsa,
            slh_dsa,
            timestamp: None,
        }
    }

    /// Create a new combined signature with timestamp
    pub fn with_timestamp(ml_dsa: MlDsaSignature, slh_dsa: SlhDsaSignature, timestamp: u64) -> Self {
        Self {
            ml_dsa,
            slh_dsa,
            timestamp: Some(timestamp),
        }
    }

    /// Get the total signature size in bytes
    pub fn size(&self) -> usize {
        ML_DSA_SIGNATURE_SIZE + SLH_DSA_SIGNATURE_SIZE + if self.timestamp.is_some() { 8 } else { 0 }
    }
}

impl Serialize for QShieldSignature {
    fn serialize(&self) -> Result<Vec<u8>> {
        let ml_dsa_bytes = self.ml_dsa.as_bytes();
        let slh_dsa_bytes = self.slh_dsa.as_bytes();

        // Flags: bit 0 = has timestamp
        let flags = if self.timestamp.is_some() { 0x01u16 } else { 0x00u16 };

        let payload_size = 2 + 4 + ml_dsa_bytes.len() + 4 + slh_dsa_bytes.len()
            + if self.timestamp.is_some() { 8 } else { 0 };
        let header = Header::new(ObjectType::Signature, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        buf.extend_from_slice(&flags.to_le_bytes());
        write_length_prefixed(&ml_dsa_bytes, &mut buf);
        write_length_prefixed(&slh_dsa_bytes, &mut buf);

        if let Some(ts) = self.timestamp {
            buf.extend_from_slice(&ts.to_le_bytes());
        }

        Ok(buf)
    }
}

impl Deserialize for QShieldSignature {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::Signature {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;

        // Read flags
        if offset + 2 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let flags = u16::from_le_bytes([data[offset], data[offset + 1]]);
        offset += 2;

        let ml_dsa_bytes = read_length_prefixed(data, &mut offset)?;
        let slh_dsa_bytes = read_length_prefixed(data, &mut offset)?;

        let ml_dsa = MlDsaSignature::from_bytes(&ml_dsa_bytes)?;
        let slh_dsa = SlhDsaSignature::from_bytes(&slh_dsa_bytes)?;

        let timestamp = if flags & 0x01 != 0 {
            if offset + 8 > data.len() {
                return Err(QShieldError::ParseError);
            }
            let ts = u64::from_le_bytes([
                data[offset], data[offset + 1], data[offset + 2], data[offset + 3],
                data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7],
            ]);
            Some(ts)
        } else {
            None
        };

        Ok(Self {
            ml_dsa,
            slh_dsa,
            timestamp,
        })
    }
}

/// QShieldSign - Dual Digital Signature Scheme
///
/// Combines ML-DSA-65 and SLH-DSA-SHA2-128s for defense-in-depth.
pub struct QShieldSign;

impl QShieldSign {
    /// Generate a new dual key pair
    ///
    /// # Returns
    /// A tuple of (public_key, secret_key)
    pub fn generate_keypair() -> Result<(QShieldSignPublicKey, QShieldSignSecretKey)> {
        let (ml_dsa_public, ml_dsa_secret) = MlDsa::generate_keypair()?;
        let (slh_dsa_public, slh_dsa_secret) = SlhDsa::generate_keypair()?;

        Ok((
            QShieldSignPublicKey::new(ml_dsa_public, slh_dsa_public),
            QShieldSignSecretKey::new(ml_dsa_secret, slh_dsa_secret),
        ))
    }

    /// Sign a message with both algorithms
    ///
    /// # Arguments
    /// * `secret_key` - The signing key
    /// * `message` - The message to sign
    ///
    /// # Returns
    /// A combined signature
    pub fn sign(secret_key: &QShieldSignSecretKey, message: &[u8]) -> Result<QShieldSignature> {
        // Create the message hash for signing
        let message_hash = Self::hash_message(message);

        // Sign with both algorithms
        let ml_dsa_sig = MlDsa::sign(&secret_key.ml_dsa, &message_hash)?;
        let slh_dsa_sig = SlhDsa::sign(&secret_key.slh_dsa, &message_hash)?;

        Ok(QShieldSignature::new(ml_dsa_sig, slh_dsa_sig))
    }

    /// Sign a message with both algorithms and a timestamp
    ///
    /// # Arguments
    /// * `secret_key` - The signing key
    /// * `message` - The message to sign
    /// * `timestamp` - Unix timestamp in seconds
    ///
    /// # Returns
    /// A combined signature with timestamp
    pub fn sign_with_timestamp(
        secret_key: &QShieldSignSecretKey,
        message: &[u8],
        timestamp: u64,
    ) -> Result<QShieldSignature> {
        // Create the message hash including timestamp
        let message_hash = Self::hash_message_with_timestamp(message, timestamp);

        // Sign with both algorithms
        let ml_dsa_sig = MlDsa::sign(&secret_key.ml_dsa, &message_hash)?;
        let slh_dsa_sig = SlhDsa::sign(&secret_key.slh_dsa, &message_hash)?;

        Ok(QShieldSignature::with_timestamp(ml_dsa_sig, slh_dsa_sig, timestamp))
    }

    /// Verify a dual signature
    ///
    /// Both signatures must verify for the combined signature to be valid.
    ///
    /// # Arguments
    /// * `public_key` - The verification key
    /// * `message` - The message that was signed
    /// * `signature` - The signature to verify
    ///
    /// # Returns
    /// `true` if both signatures are valid, `false` otherwise
    pub fn verify(
        public_key: &QShieldSignPublicKey,
        message: &[u8],
        signature: &QShieldSignature,
    ) -> Result<bool> {
        // Recreate the message hash
        let message_hash = if let Some(timestamp) = signature.timestamp {
            Self::hash_message_with_timestamp(message, timestamp)
        } else {
            Self::hash_message(message)
        };

        // Verify both signatures - both must pass
        let ml_dsa_valid = MlDsa::verify(&public_key.ml_dsa, &message_hash, &signature.ml_dsa)?;
        let slh_dsa_valid = SlhDsa::verify(&public_key.slh_dsa, &message_hash, &signature.slh_dsa)?;

        Ok(ml_dsa_valid && slh_dsa_valid)
    }

    /// Hash a message for signing
    fn hash_message(message: &[u8]) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShieldSign-v1");
        hasher.update(&(message.len() as u64).to_le_bytes());
        hasher.update(message);
        hasher.finalize().to_vec()
    }

    /// Hash a message with timestamp for signing
    fn hash_message_with_timestamp(message: &[u8], timestamp: u64) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShieldSign-ts-v1");
        hasher.update(&timestamp.to_le_bytes());
        hasher.update(&(message.len() as u64).to_le_bytes());
        hasher.update(message);
        hasher.finalize().to_vec()
    }

    /// Get the public key size in bytes
    pub fn public_key_size() -> usize {
        QShieldSignPublicKey::serialized_size()
    }

    /// Get the signature size in bytes (without timestamp)
    pub fn signature_size() -> usize {
        Header::SIZE + 2 + 4 + ML_DSA_SIGNATURE_SIZE + 4 + SLH_DSA_SIGNATURE_SIZE
    }

    /// Get the signature size in bytes (with timestamp)
    pub fn signature_size_with_timestamp() -> usize {
        Self::signature_size() + 8
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (public_key, _) = QShieldSign::generate_keypair().unwrap();

        // Verify serialization works
        let serialized = public_key.serialize().unwrap();
        let deserialized = QShieldSignPublicKey::deserialize(&serialized).unwrap();

        assert_eq!(public_key.ml_dsa.as_bytes(), deserialized.ml_dsa.as_bytes());
        assert_eq!(public_key.slh_dsa.as_bytes(), deserialized.slh_dsa.as_bytes());
    }

    #[test]
    fn test_sign_verify() {
        let (public_key, secret_key) = QShieldSign::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";

        let signature = QShieldSign::sign(&secret_key, message).unwrap();
        let valid = QShieldSign::verify(&public_key, message, &signature).unwrap();

        assert!(valid);
    }

    #[test]
    fn test_sign_verify_with_timestamp() {
        let (public_key, secret_key) = QShieldSign::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";
        let timestamp = 1704067200; // 2024-01-01 00:00:00 UTC

        let signature = QShieldSign::sign_with_timestamp(&secret_key, message, timestamp).unwrap();
        assert_eq!(signature.timestamp, Some(timestamp));

        let valid = QShieldSign::verify(&public_key, message, &signature).unwrap();
        assert!(valid);
    }

    #[test]
    fn test_invalid_signature() {
        let (public_key, secret_key) = QShieldSign::generate_keypair().unwrap();
        let message = b"Hello, quantum world!";
        let wrong_message = b"Wrong message";

        let signature = QShieldSign::sign(&secret_key, message).unwrap();
        let valid = QShieldSign::verify(&public_key, wrong_message, &signature).unwrap();

        assert!(!valid);
    }

    #[test]
    fn test_signature_serialization() {
        let (_, secret_key) = QShieldSign::generate_keypair().unwrap();
        let message = b"Test message";

        let signature = QShieldSign::sign(&secret_key, message).unwrap();
        let serialized = signature.serialize().unwrap();
        let deserialized = QShieldSignature::deserialize(&serialized).unwrap();

        assert_eq!(signature.ml_dsa.as_bytes(), deserialized.ml_dsa.as_bytes());
        assert_eq!(signature.slh_dsa.as_bytes(), deserialized.slh_dsa.as_bytes());
    }

    #[test]
    fn test_wrong_key_verification() {
        let (_, secret_key1) = QShieldSign::generate_keypair().unwrap();
        let (public_key2, _) = QShieldSign::generate_keypair().unwrap();
        let message = b"Test message";

        let signature = QShieldSign::sign(&secret_key1, message).unwrap();
        let valid = QShieldSign::verify(&public_key2, message, &signature).unwrap();

        assert!(!valid);
    }

    #[test]
    fn test_fingerprint() {
        let (pk1, _) = QShieldSign::generate_keypair().unwrap();
        let (pk2, _) = QShieldSign::generate_keypair().unwrap();

        let fp1 = pk1.fingerprint();
        let fp2 = pk2.fingerprint();

        // Different keys should have different fingerprints
        assert_ne!(fp1, fp2);

        // Same key should have same fingerprint
        let fp1_again = pk1.fingerprint();
        assert_eq!(fp1, fp1_again);
    }
}
