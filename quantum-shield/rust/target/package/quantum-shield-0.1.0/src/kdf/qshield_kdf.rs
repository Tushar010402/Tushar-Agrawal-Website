//! QShieldKDF - Quantum-resistant Key Derivation Function
//!
//! A custom key derivation function that provides:
//! - HKDF-SHA3-512 for key material combination
//! - SHAKE-256 for arbitrary-length key expansion
//! - Argon2id for password-based key derivation
//! - Quantum-resistant salt generation
//! - Domain separation for different use cases

#[cfg(not(feature = "std"))]
use alloc::{string::String, vec::Vec};

use argon2::{Argon2, Algorithm, Version, Params};
use hkdf::Hkdf;
use sha3::{Sha3_512, Shake256, digest::{ExtendableOutput, Update, XofReader}};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::utils::rng::quantum_salt;

/// Domain separation contexts
pub mod domains {
    /// KEM key combination
    pub const KEM_COMBINE: &[u8] = b"QShieldKEM-v1";
    /// Encryption key derivation
    pub const ENCRYPTION: &[u8] = b"QShieldEncrypt-v1";
    /// Signing key derivation
    pub const SIGNING: &[u8] = b"QShieldSign-v1";
    /// Handshake key derivation
    pub const HANDSHAKE: &[u8] = b"QShieldHandshake-v1";
    /// Session key derivation
    pub const SESSION: &[u8] = b"QShieldSession-v1";
    /// Password-based key derivation
    pub const PASSWORD: &[u8] = b"QShieldPassword-v1";
}

/// QShieldKDF configuration
#[derive(Debug, Clone)]
pub struct KdfConfig {
    /// Argon2id memory cost (in KiB)
    pub memory_cost: u32,
    /// Argon2id time cost (iterations)
    pub time_cost: u32,
    /// Argon2id parallelism
    pub parallelism: u32,
}

impl Default for KdfConfig {
    fn default() -> Self {
        Self {
            memory_cost: 65536, // 64 MiB
            time_cost: 3,
            parallelism: 4,
        }
    }
}

impl KdfConfig {
    /// High-security configuration
    pub fn high_security() -> Self {
        Self {
            memory_cost: 262144, // 256 MiB
            time_cost: 4,
            parallelism: 4,
        }
    }

    /// Low-memory configuration (for constrained environments)
    pub fn low_memory() -> Self {
        Self {
            memory_cost: 16384, // 16 MiB
            time_cost: 4,
            parallelism: 2,
        }
    }
}

/// Derived key material with automatic zeroization
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct DerivedKey {
    key: Vec<u8>,
}

impl DerivedKey {
    /// Create a new derived key
    pub fn new(key: Vec<u8>) -> Self {
        Self { key }
    }

    /// Get the key bytes
    pub fn as_bytes(&self) -> &[u8] {
        &self.key
    }

    /// Get the key length
    pub fn len(&self) -> usize {
        self.key.len()
    }

    /// Check if empty
    pub fn is_empty(&self) -> bool {
        self.key.is_empty()
    }

    /// Split into multiple keys
    pub fn split(&self, sizes: &[usize]) -> Result<Vec<DerivedKey>> {
        let total: usize = sizes.iter().sum();
        if total > self.key.len() {
            return Err(QShieldError::KeyDerivationFailed);
        }

        let mut keys = Vec::new();
        let mut offset = 0;

        for &size in sizes {
            keys.push(DerivedKey::new(self.key[offset..offset + size].to_vec()));
            offset += size;
        }

        Ok(keys)
    }
}

impl AsRef<[u8]> for DerivedKey {
    fn as_ref(&self) -> &[u8] {
        &self.key
    }
}

/// QShieldKDF - Quantum-resistant Key Derivation Function
pub struct QShieldKDF {
    config: KdfConfig,
}

impl Default for QShieldKDF {
    fn default() -> Self {
        Self::new()
    }
}

impl QShieldKDF {
    /// Create a new QShieldKDF with default configuration
    pub fn new() -> Self {
        Self {
            config: KdfConfig::default(),
        }
    }

    /// Create a new QShieldKDF with custom configuration
    pub fn with_config(config: KdfConfig) -> Self {
        Self { config }
    }

    /// Derive a key using HKDF-SHA3-512
    ///
    /// This is the primary key derivation method for combining key materials.
    ///
    /// # Arguments
    /// * `ikm` - Input keying material
    /// * `salt` - Optional salt (quantum-resistant salt is generated if None)
    /// * `info` - Context/domain separation string
    /// * `len` - Desired output length in bytes
    ///
    /// # Returns
    /// Derived key material
    pub fn derive(
        &self,
        ikm: &[u8],
        salt: Option<&[u8]>,
        info: &[u8],
        len: usize,
    ) -> Result<DerivedKey> {
        // Use quantum-resistant salt if none provided
        let generated_salt;
        let salt = match salt {
            Some(s) => s,
            None => {
                generated_salt = quantum_salt(64)?;
                &generated_salt
            }
        };

        let hk = Hkdf::<Sha3_512>::new(Some(salt), ikm);
        let mut okm = vec![0u8; len];

        hk.expand(info, &mut okm)
            .map_err(|_| QShieldError::KeyDerivationFailed)?;

        Ok(DerivedKey::new(okm))
    }

    /// Derive a key with quantum-resistant salt generation
    ///
    /// This variant always generates a fresh quantum-resistant salt and
    /// returns it alongside the derived key.
    pub fn derive_with_salt(
        &self,
        ikm: &[u8],
        info: &[u8],
        len: usize,
    ) -> Result<(DerivedKey, Vec<u8>)> {
        let salt = quantum_salt(64)?;
        let key = self.derive(ikm, Some(&salt), info, len)?;
        Ok((key, salt))
    }

    /// Combine multiple key materials into a single key
    ///
    /// This is used for hybrid KEM key combination.
    ///
    /// # Arguments
    /// * `keys` - Slice of key materials to combine
    /// * `info` - Context/domain separation string
    /// * `len` - Desired output length in bytes
    pub fn combine(&self, keys: &[&[u8]], info: &[u8], len: usize) -> Result<DerivedKey> {
        // Concatenate all keys with length prefixes
        let mut combined = Vec::new();
        for key in keys {
            combined.extend_from_slice(&(key.len() as u32).to_le_bytes());
            combined.extend_from_slice(key);
        }

        // Add number of keys for domain separation
        combined.extend_from_slice(&(keys.len() as u32).to_le_bytes());

        // Use empty salt for deterministic key combination
        // The input key materials already contain sufficient entropy
        self.derive(&combined, Some(&[]), info, len)
    }

    /// Expand a key to arbitrary length using SHAKE-256
    ///
    /// # Arguments
    /// * `key` - Input key material
    /// * `info` - Context/domain separation string
    /// * `len` - Desired output length in bytes
    pub fn expand(&self, key: &[u8], info: &[u8], len: usize) -> Result<DerivedKey> {
        let mut hasher = Shake256::default();
        hasher.update(key);
        hasher.update(info);
        hasher.update(&(len as u64).to_le_bytes());

        let mut output = vec![0u8; len];
        let mut reader = hasher.finalize_xof();
        reader.read(&mut output);

        Ok(DerivedKey::new(output))
    }

    /// Derive a key from a password using Argon2id
    ///
    /// # Arguments
    /// * `password` - The password to derive from
    /// * `salt` - Salt (should be at least 16 bytes, randomly generated)
    /// * `len` - Desired output length in bytes (max 1024)
    ///
    /// # Security Note
    /// The salt should be generated using `quantum_salt()` and stored alongside
    /// the derived key material.
    pub fn derive_from_password(
        &self,
        password: &[u8],
        salt: &[u8],
        len: usize,
    ) -> Result<DerivedKey> {
        if len > 1024 {
            return Err(QShieldError::KeyDerivationFailed);
        }

        let params = Params::new(
            self.config.memory_cost,
            self.config.time_cost,
            self.config.parallelism,
            Some(len),
        )
        .map_err(|_| QShieldError::KeyDerivationFailed)?;

        let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);

        let mut output = vec![0u8; len];
        argon2
            .hash_password_into(password, salt, &mut output)
            .map_err(|_| QShieldError::KeyDerivationFailed)?;

        // Apply additional HKDF step with domain separation
        let hk = Hkdf::<Sha3_512>::new(Some(domains::PASSWORD), &output);
        let mut final_key = vec![0u8; len];
        hk.expand(b"QShieldPassword-final", &mut final_key)
            .map_err(|_| QShieldError::KeyDerivationFailed)?;

        output.zeroize();

        Ok(DerivedKey::new(final_key))
    }

    /// Derive encryption and authentication keys from a shared secret
    ///
    /// Returns (encryption_key, auth_key)
    pub fn derive_encryption_keys(
        &self,
        shared_secret: &[u8],
        context: &[u8],
    ) -> Result<(DerivedKey, DerivedKey)> {
        // Derive a master key first
        let master = self.derive(shared_secret, None, domains::ENCRYPTION, 96)?;

        // Split into encryption (32 bytes) and authentication (64 bytes) keys
        let keys = master.split(&[32, 64])?;

        Ok((keys[0].clone(), keys[1].clone()))
    }

    /// Derive session keys for the handshake protocol
    ///
    /// Returns (client_write_key, server_write_key, client_iv, server_iv)
    pub fn derive_session_keys(
        &self,
        shared_secret: &[u8],
        handshake_hash: &[u8],
    ) -> Result<SessionKeys> {
        let mut context = Vec::new();
        context.extend_from_slice(domains::SESSION);
        context.extend_from_slice(handshake_hash);

        let master = self.derive(shared_secret, None, &context, 128)?;

        let keys = master.split(&[32, 32, 12, 12, 32])?;

        Ok(SessionKeys {
            client_write_key: keys[0].clone(),
            server_write_key: keys[1].clone(),
            client_iv: keys[2].clone(),
            server_iv: keys[3].clone(),
            resumption_secret: keys[4].clone(),
        })
    }

    /// Generate a quantum-resistant salt
    pub fn generate_salt(&self, len: usize) -> Result<Vec<u8>> {
        quantum_salt(len)
    }
}

/// Session keys derived for the handshake protocol
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct SessionKeys {
    /// Client write encryption key
    pub client_write_key: DerivedKey,
    /// Server write encryption key
    pub server_write_key: DerivedKey,
    /// Client initialization vector
    pub client_iv: DerivedKey,
    /// Server initialization vector
    pub server_iv: DerivedKey,
    /// Resumption secret for session resumption
    pub resumption_secret: DerivedKey,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic_derive() {
        let kdf = QShieldKDF::new();
        let ikm = b"test input keying material";
        let salt = b"test salt for derivation";
        let info = b"test context";

        let key = kdf.derive(ikm, Some(salt), info, 32).unwrap();
        assert_eq!(key.len(), 32);

        // Deterministic with same inputs
        let key2 = kdf.derive(ikm, Some(salt), info, 32).unwrap();
        assert_eq!(key.as_bytes(), key2.as_bytes());

        // Different with different info
        let key3 = kdf.derive(ikm, Some(salt), b"other context", 32).unwrap();
        assert_ne!(key.as_bytes(), key3.as_bytes());
    }

    #[test]
    fn test_combine() {
        let kdf = QShieldKDF::new();
        let key1 = b"first key material";
        let key2 = b"second key material";

        let combined = kdf
            .combine(&[key1, key2], domains::KEM_COMBINE, 32)
            .unwrap();
        assert_eq!(combined.len(), 32);
    }

    #[test]
    fn test_expand() {
        let kdf = QShieldKDF::new();
        let key = b"seed key material";

        let expanded = kdf.expand(key, b"expansion context", 128).unwrap();
        assert_eq!(expanded.len(), 128);
    }

    #[test]
    fn test_password_derive() {
        let kdf = QShieldKDF::with_config(KdfConfig::low_memory());
        let password = b"my secure password";
        let salt = quantum_salt(32).unwrap();

        let key = kdf.derive_from_password(password, &salt, 32).unwrap();
        assert_eq!(key.len(), 32);

        // Deterministic with same inputs
        let key2 = kdf.derive_from_password(password, &salt, 32).unwrap();
        assert_eq!(key.as_bytes(), key2.as_bytes());
    }

    #[test]
    fn test_encryption_keys() {
        let kdf = QShieldKDF::new();
        let shared_secret = b"shared secret from key exchange";

        let (enc_key, auth_key) = kdf
            .derive_encryption_keys(shared_secret, b"test context")
            .unwrap();

        assert_eq!(enc_key.len(), 32);
        assert_eq!(auth_key.len(), 64);
    }

    #[test]
    fn test_session_keys() {
        let kdf = QShieldKDF::new();
        let shared_secret = b"shared secret from handshake";
        let handshake_hash = b"hash of handshake transcript";

        let session_keys = kdf
            .derive_session_keys(shared_secret, handshake_hash)
            .unwrap();

        assert_eq!(session_keys.client_write_key.len(), 32);
        assert_eq!(session_keys.server_write_key.len(), 32);
        assert_eq!(session_keys.client_iv.len(), 12);
        assert_eq!(session_keys.server_iv.len(), 12);
        assert_eq!(session_keys.resumption_secret.len(), 32);
    }

    #[test]
    fn test_key_split() {
        let kdf = QShieldKDF::new();
        let key = kdf.derive(b"test", Some(b"salt"), b"info", 64).unwrap();

        let parts = key.split(&[16, 16, 32]).unwrap();
        assert_eq!(parts.len(), 3);
        assert_eq!(parts[0].len(), 16);
        assert_eq!(parts[1].len(), 16);
        assert_eq!(parts[2].len(), 32);
    }
}
