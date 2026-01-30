//! Digital Signatures for QuantumShield
//!
//! This module implements QShieldSign, a dual-signature scheme combining:
//! - ML-DSA-65 (NIST FIPS 204) - Lattice-based signatures
//! - SLH-DSA-SHA2-128s (NIST FIPS 205) - Hash-based signatures
//!
//! ## Security Model
//!
//! The dual-signature approach provides:
//! - Lattice-based security from ML-DSA (efficient, compact)
//! - Hash-based security from SLH-DSA (conservative, well-understood)
//!
//! Both signatures must verify for the combined signature to be valid.

mod dual;
mod ml_dsa;
mod slh_dsa;

pub use dual::{
    QShieldSign, QShieldSignPublicKey, QShieldSignSecretKey, QShieldSignature,
};
pub use ml_dsa::{MlDsaPublicKey, MlDsaSecretKey, MlDsaSignature};
pub use slh_dsa::{SlhDsaPublicKey, SlhDsaSecretKey, SlhDsaSignature};
