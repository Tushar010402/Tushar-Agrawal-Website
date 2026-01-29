//! QShieldKEM - Hybrid Key Encapsulation Mechanism
//!
//! Combines X25519 (classical) with ML-KEM-768 (post-quantum) for defense-in-depth.
//! The final shared secret is derived using HKDF-SHA3-512 with domain separation.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::kdf::{domains, QShieldKDF};
use crate::utils::serialize::{
    self, read_length_prefixed, write_length_prefixed, Deserialize, Header, ObjectType, Serialize,
};

use super::ml_kem::{MlKem, MlKemCiphertext, MlKemPublicKey, MlKemSecretKey, ML_KEM_CIPHERTEXT_SIZE, ML_KEM_PUBLIC_KEY_SIZE};
use super::x25519::{X25519Ciphertext, X25519Kem, X25519PublicKey, X25519SecretKey, X25519_PUBLIC_KEY_SIZE};

/// Combined shared secret size
pub const QSHIELD_SHARED_SECRET_SIZE: usize = 64;

/// QShieldKEM public key combining X25519 and ML-KEM
#[derive(Clone)]
pub struct QShieldKEMPublicKey {
    /// X25519 public key
    pub x25519: X25519PublicKey,
    /// ML-KEM public key
    pub ml_kem: MlKemPublicKey,
}

impl QShieldKEMPublicKey {
    /// Create a new combined public key
    pub fn new(x25519: X25519PublicKey, ml_kem: MlKemPublicKey) -> Self {
        Self { x25519, ml_kem }
    }

    /// Get the total serialized size
    pub fn serialized_size() -> usize {
        Header::SIZE + 4 + X25519_PUBLIC_KEY_SIZE + 4 + ML_KEM_PUBLIC_KEY_SIZE
    }
}

impl Serialize for QShieldKEMPublicKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        let x25519_bytes = self.x25519.as_bytes();
        let ml_kem_bytes = self.ml_kem.as_bytes();

        let payload_size = 4 + x25519_bytes.len() + 4 + ml_kem_bytes.len();
        let header = Header::new(ObjectType::PublicKey, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(x25519_bytes, &mut buf);
        write_length_prefixed(&ml_kem_bytes, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldKEMPublicKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::PublicKey {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let x25519_bytes = read_length_prefixed(data, &mut offset)?;
        let ml_kem_bytes = read_length_prefixed(data, &mut offset)?;

        let x25519 = X25519PublicKey::from_bytes(&x25519_bytes)?;
        let ml_kem = MlKemPublicKey::from_bytes(&ml_kem_bytes)?;

        Ok(Self { x25519, ml_kem })
    }
}

/// QShieldKEM secret key with automatic zeroization
#[derive(Clone, ZeroizeOnDrop)]
pub struct QShieldKEMSecretKey {
    #[zeroize(skip)]
    pub x25519: X25519SecretKey,
    #[zeroize(skip)]
    pub ml_kem: MlKemSecretKey,
}

impl QShieldKEMSecretKey {
    /// Create a new combined secret key
    pub fn new(x25519: X25519SecretKey, ml_kem: MlKemSecretKey) -> Self {
        Self { x25519, ml_kem }
    }

    /// Get the corresponding public key
    pub fn public_key(&self) -> QShieldKEMPublicKey {
        QShieldKEMPublicKey {
            x25519: self.x25519.public_key(),
            ml_kem: MlKemPublicKey::from_bytes(&self.ml_kem.as_bytes()[..ML_KEM_PUBLIC_KEY_SIZE]).unwrap(),
        }
    }
}

impl Serialize for QShieldKEMSecretKey {
    fn serialize(&self) -> Result<Vec<u8>> {
        let x25519_bytes = self.x25519.to_bytes();
        let ml_kem_bytes = self.ml_kem.as_bytes();

        let payload_size = 4 + x25519_bytes.len() + 4 + ml_kem_bytes.len();
        let header = Header::new(ObjectType::SecretKey, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&x25519_bytes, &mut buf);
        write_length_prefixed(&ml_kem_bytes, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldKEMSecretKey {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::SecretKey {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let x25519_bytes = read_length_prefixed(data, &mut offset)?;
        let ml_kem_bytes = read_length_prefixed(data, &mut offset)?;

        let x25519 = X25519SecretKey::from_bytes(&x25519_bytes)?;
        let ml_kem = MlKemSecretKey::from_bytes(&ml_kem_bytes)?;

        Ok(Self { x25519, ml_kem })
    }
}

/// QShieldKEM ciphertext combining both KEM ciphertexts
#[derive(Clone)]
pub struct QShieldKEMCiphertext {
    /// X25519 ciphertext (ephemeral public key)
    pub x25519: X25519Ciphertext,
    /// ML-KEM ciphertext
    pub ml_kem: MlKemCiphertext,
}

impl QShieldKEMCiphertext {
    /// Create a new combined ciphertext
    pub fn new(x25519: X25519Ciphertext, ml_kem: MlKemCiphertext) -> Self {
        Self { x25519, ml_kem }
    }
}

impl Serialize for QShieldKEMCiphertext {
    fn serialize(&self) -> Result<Vec<u8>> {
        let x25519_bytes = self.x25519.serialize()?;
        let ml_kem_bytes = self.ml_kem.serialize()?;

        let payload_size = 4 + x25519_bytes.len() + 4 + ml_kem_bytes.len();
        let header = Header::new(ObjectType::KemCiphertext, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&x25519_bytes, &mut buf);
        write_length_prefixed(&ml_kem_bytes, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldKEMCiphertext {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::KemCiphertext {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let x25519_bytes = read_length_prefixed(data, &mut offset)?;
        let ml_kem_bytes = read_length_prefixed(data, &mut offset)?;

        let x25519 = X25519Ciphertext::deserialize(&x25519_bytes)?;
        let ml_kem = MlKemCiphertext::deserialize(&ml_kem_bytes)?;

        Ok(Self { x25519, ml_kem })
    }
}

/// Combined shared secret with automatic zeroization
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct QShieldSharedSecret {
    secret: [u8; QSHIELD_SHARED_SECRET_SIZE],
}

impl QShieldSharedSecret {
    /// Create from derived bytes
    pub(crate) fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != QSHIELD_SHARED_SECRET_SIZE {
            return Err(QShieldError::KeyDerivationFailed);
        }

        let mut secret = [0u8; QSHIELD_SHARED_SECRET_SIZE];
        secret.copy_from_slice(bytes);

        Ok(Self { secret })
    }

    /// Get the secret bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.secret
    }
}

/// QShieldKEM - Hybrid Key Encapsulation Mechanism
///
/// Combines X25519 and ML-KEM-768 with HKDF-SHA3-512 key combination.
pub struct QShieldKEM;

impl QShieldKEM {
    /// Generate a new hybrid key pair
    ///
    /// # Returns
    /// A tuple of (public_key, secret_key)
    pub fn generate_keypair() -> Result<(QShieldKEMPublicKey, QShieldKEMSecretKey)> {
        let (x25519_public, x25519_secret) = X25519Kem::generate_keypair()?;
        let (ml_kem_public, ml_kem_secret) = MlKem::generate_keypair()?;

        Ok((
            QShieldKEMPublicKey::new(x25519_public, ml_kem_public),
            QShieldKEMSecretKey::new(x25519_secret, ml_kem_secret),
        ))
    }

    /// Encapsulate a shared secret to a public key
    ///
    /// This performs both X25519 and ML-KEM encapsulation, then combines
    /// the shared secrets using HKDF-SHA3-512 with domain separation.
    ///
    /// # Arguments
    /// * `public_key` - The recipient's public key
    ///
    /// # Returns
    /// A tuple of (ciphertext, shared_secret)
    pub fn encapsulate(
        public_key: &QShieldKEMPublicKey,
    ) -> Result<(QShieldKEMCiphertext, QShieldSharedSecret)> {
        // Perform X25519 encapsulation
        let (x25519_ct, x25519_ss) = X25519Kem::encapsulate(&public_key.x25519)?;

        // Perform ML-KEM encapsulation
        let (ml_kem_ct, ml_kem_ss) = MlKem::encapsulate(&public_key.ml_kem)?;

        // Combine shared secrets using HKDF-SHA3-512
        let combined_secret = Self::combine_secrets(x25519_ss.as_bytes(), ml_kem_ss.as_bytes())?;

        let ciphertext = QShieldKEMCiphertext::new(x25519_ct, ml_kem_ct);

        Ok((ciphertext, combined_secret))
    }

    /// Decapsulate a shared secret from a ciphertext
    ///
    /// This performs both X25519 and ML-KEM decapsulation, then combines
    /// the shared secrets using the same HKDF-SHA3-512 derivation.
    ///
    /// # Arguments
    /// * `secret_key` - The recipient's secret key
    /// * `ciphertext` - The ciphertext to decapsulate
    ///
    /// # Returns
    /// The shared secret
    pub fn decapsulate(
        secret_key: &QShieldKEMSecretKey,
        ciphertext: &QShieldKEMCiphertext,
    ) -> Result<QShieldSharedSecret> {
        // Perform X25519 decapsulation
        let x25519_ss = X25519Kem::decapsulate(&secret_key.x25519, &ciphertext.x25519)?;

        // Perform ML-KEM decapsulation
        let ml_kem_ss = MlKem::decapsulate(&secret_key.ml_kem, &ciphertext.ml_kem)?;

        // Combine shared secrets using HKDF-SHA3-512
        Self::combine_secrets(x25519_ss.as_bytes(), ml_kem_ss.as_bytes())
    }

    /// Combine two shared secrets using HKDF-SHA3-512
    ///
    /// Final Key = HKDF-SHA3-512(
    ///     ikm: X25519_shared || ML-KEM_shared,
    ///     salt: <generated>,
    ///     info: "QShieldKEM-v1"
    /// )
    fn combine_secrets(x25519_ss: &[u8], ml_kem_ss: &[u8]) -> Result<QShieldSharedSecret> {
        let kdf = QShieldKDF::new();
        let combined = kdf.combine(
            &[x25519_ss, ml_kem_ss],
            domains::KEM_COMBINE,
            QSHIELD_SHARED_SECRET_SIZE,
        )?;

        QShieldSharedSecret::from_bytes(combined.as_bytes())
    }

    /// Get the public key size in bytes
    pub fn public_key_size() -> usize {
        QShieldKEMPublicKey::serialized_size()
    }

    /// Get the ciphertext size in bytes
    pub fn ciphertext_size() -> usize {
        Header::SIZE + 4 + X25519_PUBLIC_KEY_SIZE + 4 + ML_KEM_CIPHERTEXT_SIZE
    }

    /// Get the shared secret size in bytes
    pub fn shared_secret_size() -> usize {
        QSHIELD_SHARED_SECRET_SIZE
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keypair_generation() {
        let (public_key, secret_key) = QShieldKEM::generate_keypair().unwrap();

        // Verify we can serialize and deserialize
        let pk_bytes = public_key.serialize().unwrap();
        let pk_restored = QShieldKEMPublicKey::deserialize(&pk_bytes).unwrap();

        assert_eq!(public_key.x25519.as_bytes(), pk_restored.x25519.as_bytes());
    }

    #[test]
    fn test_encapsulate_decapsulate() {
        let (public_key, secret_key) = QShieldKEM::generate_keypair().unwrap();

        let (ciphertext, shared_secret_enc) = QShieldKEM::encapsulate(&public_key).unwrap();
        let shared_secret_dec = QShieldKEM::decapsulate(&secret_key, &ciphertext).unwrap();

        assert_eq!(shared_secret_enc.as_bytes(), shared_secret_dec.as_bytes());
    }

    #[test]
    fn test_ciphertext_serialization() {
        let (public_key, secret_key) = QShieldKEM::generate_keypair().unwrap();
        let (ciphertext, _) = QShieldKEM::encapsulate(&public_key).unwrap();

        let ct_bytes = ciphertext.serialize().unwrap();
        let ct_restored = QShieldKEMCiphertext::deserialize(&ct_bytes).unwrap();

        // Verify decapsulation works with restored ciphertext
        let ss1 = QShieldKEM::decapsulate(&secret_key, &ciphertext).unwrap();
        let ss2 = QShieldKEM::decapsulate(&secret_key, &ct_restored).unwrap();

        assert_eq!(ss1.as_bytes(), ss2.as_bytes());
    }

    #[test]
    fn test_different_keys_different_secrets() {
        let (pk1, sk1) = QShieldKEM::generate_keypair().unwrap();
        let (pk2, sk2) = QShieldKEM::generate_keypair().unwrap();

        let (ct1, ss1) = QShieldKEM::encapsulate(&pk1).unwrap();
        let (ct2, ss2) = QShieldKEM::encapsulate(&pk2).unwrap();

        // Different public keys should give different secrets
        assert_ne!(ss1.as_bytes(), ss2.as_bytes());

        // Decapsulating with wrong key should give different result
        let ss1_dec = QShieldKEM::decapsulate(&sk1, &ct1).unwrap();
        let ss2_wrong = QShieldKEM::decapsulate(&sk2, &ct1).unwrap();

        assert_eq!(ss1.as_bytes(), ss1_dec.as_bytes());
        assert_ne!(ss1.as_bytes(), ss2_wrong.as_bytes());
    }

    #[test]
    fn test_shared_secret_size() {
        let (public_key, _) = QShieldKEM::generate_keypair().unwrap();
        let (_, shared_secret) = QShieldKEM::encapsulate(&public_key).unwrap();

        assert_eq!(shared_secret.as_bytes().len(), QSHIELD_SHARED_SECRET_SIZE);
    }
}
