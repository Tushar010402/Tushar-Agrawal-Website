//! Key Derivation Functions for QuantumShield
//!
//! This module implements QShieldKDF, a quantum-resistant key derivation function
//! that combines HKDF-SHA3-512, SHAKE-256 expansion, and Argon2id for password-based
//! key derivation.

mod qshield_kdf;

pub use qshield_kdf::{domains, DerivedKey, KdfConfig, QShieldKDF, SessionKeys};
