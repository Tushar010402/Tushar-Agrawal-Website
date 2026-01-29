//! Symmetric Encryption for QuantumShield
//!
//! This module implements QuantumShield symmetric encryption using a
//! cascading cipher approach with AES-256-GCM and ChaCha20-Poly1305.
//!
//! ## Cascading Encryption
//!
//! Data is encrypted through multiple independent algorithms:
//! 1. First layer: AES-256-GCM
//! 2. Second layer: ChaCha20-Poly1305
//!
//! This provides defense-in-depth: if one cipher is broken, the other
//! still protects the data.

mod aes_gcm;
mod cascade;
mod chacha;

pub use aes_gcm::AesGcmCipher;
pub use cascade::{QuantumShield, EncryptedData};
pub use chacha::ChaCha20Cipher;
