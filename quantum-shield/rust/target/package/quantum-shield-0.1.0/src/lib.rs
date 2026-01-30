//! # QuantumShield
//!
//! A quantum-secure cryptographic library implementing hybrid post-quantum encryption.
//!
//! ## Features
//!
//! - **QShieldKEM**: Hybrid key encapsulation (X25519 + ML-KEM-768)
//! - **QShieldSign**: Dual digital signatures (ML-DSA-65 + SLH-DSA)
//! - **QuantumShield**: Cascading symmetric encryption (AES-256-GCM + ChaCha20-Poly1305)
//! - **QShieldKDF**: Quantum-resistant key derivation
//!
//! ## Security Model
//!
//! QuantumShield uses a defense-in-depth approach with multiple cryptographic layers:
//!
//! 1. Classical security via X25519 ECDH
//! 2. Post-quantum security via ML-KEM (lattice-based)
//! 3. Hash-based signatures via SLH-DSA for long-term security
//!
//! ## Example
//!
//! ```rust,ignore
//! use quantum_shield::{QShieldKEM, QuantumShield};
//!
//! // Generate a key pair
//! let (public_key, secret_key) = QShieldKEM::generate_keypair()?;
//!
//! // Encapsulate a shared secret
//! let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&public_key)?;
//!
//! // Decapsulate
//! let decapsulated = QShieldKEM::decapsulate(&secret_key, &ciphertext)?;
//!
//! // Use for symmetric encryption
//! let cipher = QuantumShield::new(&shared_secret)?;
//! let encrypted = cipher.encrypt(b"Hello, quantum world!")?;
//! ```

#![cfg_attr(not(feature = "std"), no_std)]
#![forbid(unsafe_code)]
#![warn(missing_docs, rust_2018_idioms)]

#[cfg(not(feature = "std"))]
extern crate alloc;

pub mod error;
pub mod kdf;
pub mod kem;
pub mod protocol;
pub mod sign;
pub mod symmetric;
pub mod utils;

// Re-export main types for convenience
pub use error::{QShieldError, Result};
pub use kdf::QShieldKDF;
pub use kem::QShieldKEM;
pub use protocol::{QShieldHandshake, QShieldMessage};
pub use sign::QShieldSign;
pub use symmetric::QuantumShield;

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Protocol version for cryptographic agility
pub const PROTOCOL_VERSION: u8 = 1;

/// Supported algorithm suite identifiers
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum AlgorithmSuite {
    /// Default: ML-KEM-768 + X25519 + ML-DSA-65 + SLH-DSA + AES-GCM + ChaCha20
    Default = 0x01,
    /// High security: ML-KEM-1024 + X25519 + ML-DSA-87 + SLH-DSA-256s
    HighSecurity = 0x02,
    /// Compact: ML-KEM-512 + X25519 + ML-DSA-44
    Compact = 0x03,
}

impl Default for AlgorithmSuite {
    fn default() -> Self {
        Self::Default
    }
}

impl TryFrom<u8> for AlgorithmSuite {
    type Error = QShieldError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(Self::Default),
            0x02 => Ok(Self::HighSecurity),
            0x03 => Ok(Self::Compact),
            _ => Err(QShieldError::UnsupportedAlgorithm(format!(
                "Unknown algorithm suite: 0x{:02x}",
                value
            ))),
        }
    }
}
