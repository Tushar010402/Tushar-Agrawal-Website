//! Secure random number generation for QuantumShield
//!
//! This module provides cryptographically secure random number generation
//! with additional entropy mixing for defense-in-depth.

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use rand::{CryptoRng, RngCore};
use sha3::{Digest, Sha3_256};
use zeroize::Zeroize;

use crate::error::{QShieldError, Result};

/// Secure random number generator with entropy pooling
pub struct SecureRng {
    inner: rand::rngs::OsRng,
}

impl Default for SecureRng {
    fn default() -> Self {
        Self::new()
    }
}

impl SecureRng {
    /// Create a new SecureRng instance
    pub fn new() -> Self {
        Self {
            inner: rand::rngs::OsRng,
        }
    }

    /// Generate random bytes
    pub fn random_bytes(&mut self, len: usize) -> Result<Vec<u8>> {
        let mut buf = vec![0u8; len];
        self.inner
            .try_fill_bytes(&mut buf)
            .map_err(|_| QShieldError::RngFailed)?;
        Ok(buf)
    }

    /// Generate random bytes into a provided buffer
    pub fn fill_bytes(&mut self, buf: &mut [u8]) -> Result<()> {
        self.inner
            .try_fill_bytes(buf)
            .map_err(|_| QShieldError::RngFailed)
    }

    /// Generate a quantum-resistant salt
    ///
    /// This generates a salt by hashing multiple RNG outputs together,
    /// providing defense against potential RNG weaknesses.
    pub fn quantum_resistant_salt(&mut self, len: usize) -> Result<Vec<u8>> {
        // Generate extra entropy rounds
        let rounds = 4;
        let mut hasher = Sha3_256::new();

        for _ in 0..rounds {
            let mut entropy = [0u8; 64];
            self.fill_bytes(&mut entropy)?;
            hasher.update(&entropy);
            entropy.zeroize();
        }

        // Add a counter for domain separation
        hasher.update(b"QShield-salt-v1");
        hasher.update(&(len as u64).to_le_bytes());

        let hash = hasher.finalize();

        // Expand if needed using SHAKE-like construction
        if len <= 32 {
            Ok(hash[..len].to_vec())
        } else {
            self.expand_hash(&hash, len)
        }
    }

    /// Expand a hash to arbitrary length using SHAKE-like construction
    fn expand_hash(&mut self, seed: &[u8], len: usize) -> Result<Vec<u8>> {
        use sha3::{Shake256, digest::{ExtendableOutput, Update, XofReader}};

        let mut hasher = Shake256::default();
        hasher.update(seed);
        hasher.update(b"QShield-expand");

        let mut output = vec![0u8; len];
        let mut reader = hasher.finalize_xof();
        reader.read(&mut output);

        Ok(output)
    }

    /// Generate a nonce for AEAD operations
    pub fn nonce(&mut self, len: usize) -> Result<Vec<u8>> {
        self.random_bytes(len)
    }

    /// Generate a random u64
    pub fn random_u64(&mut self) -> Result<u64> {
        let mut buf = [0u8; 8];
        self.fill_bytes(&mut buf)?;
        Ok(u64::from_le_bytes(buf))
    }
}

impl RngCore for SecureRng {
    fn next_u32(&mut self) -> u32 {
        self.inner.next_u32()
    }

    fn next_u64(&mut self) -> u64 {
        self.inner.next_u64()
    }

    fn fill_bytes(&mut self, dest: &mut [u8]) {
        self.inner.fill_bytes(dest)
    }

    fn try_fill_bytes(&mut self, dest: &mut [u8]) -> core::result::Result<(), rand::Error> {
        self.inner.try_fill_bytes(dest)
    }
}

impl CryptoRng for SecureRng {}

/// Generate random bytes using the global RNG
pub fn random_bytes(len: usize) -> Result<Vec<u8>> {
    SecureRng::new().random_bytes(len)
}

/// Fill a buffer with random bytes using the global RNG
pub fn fill_random(buf: &mut [u8]) -> Result<()> {
    SecureRng::new().fill_bytes(buf)
}

/// Generate a quantum-resistant salt
pub fn quantum_salt(len: usize) -> Result<Vec<u8>> {
    SecureRng::new().quantum_resistant_salt(len)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_random_bytes() {
        let bytes = random_bytes(32).unwrap();
        assert_eq!(bytes.len(), 32);

        // Check it's not all zeros (extremely unlikely with good RNG)
        assert!(bytes.iter().any(|&b| b != 0));
    }

    #[test]
    fn test_quantum_salt() {
        let salt1 = quantum_salt(32).unwrap();
        let salt2 = quantum_salt(32).unwrap();

        assert_eq!(salt1.len(), 32);
        assert_eq!(salt2.len(), 32);
        assert_ne!(salt1, salt2);
    }

    #[test]
    fn test_expanded_salt() {
        let salt = quantum_salt(64).unwrap();
        assert_eq!(salt.len(), 64);
    }
}
