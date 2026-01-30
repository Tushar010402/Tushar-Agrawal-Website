//! Error types for QuantumShield
//!
//! This module provides a unified error type that handles all cryptographic
//! operations while maintaining security by providing uniform error messages
//! where appropriate to prevent information leakage.

#[cfg(not(feature = "std"))]
use alloc::string::String;

use thiserror::Error;

/// Result type alias for QuantumShield operations
pub type Result<T> = core::result::Result<T, QShieldError>;

/// Unified error type for all QuantumShield operations
#[derive(Debug, Error)]
pub enum QShieldError {
    /// Key generation failed
    #[error("Key generation failed")]
    KeyGenerationFailed,

    /// Encapsulation failed
    #[error("Encapsulation failed")]
    EncapsulationFailed,

    /// Decapsulation failed (uniform error to prevent oracle attacks)
    #[error("Decapsulation failed")]
    DecapsulationFailed,

    /// Signature generation failed
    #[error("Signature generation failed")]
    SigningFailed,

    /// Signature verification failed (uniform error)
    #[error("Signature verification failed")]
    VerificationFailed,

    /// Encryption failed
    #[error("Encryption failed")]
    EncryptionFailed,

    /// Decryption failed (uniform error to prevent oracle attacks)
    #[error("Decryption failed")]
    DecryptionFailed,

    /// Key derivation failed
    #[error("Key derivation failed")]
    KeyDerivationFailed,

    /// Invalid key material
    #[error("Invalid key material")]
    InvalidKey,

    /// Invalid ciphertext
    #[error("Invalid ciphertext")]
    InvalidCiphertext,

    /// Invalid signature
    #[error("Invalid signature")]
    InvalidSignature,

    /// Invalid nonce
    #[error("Invalid nonce")]
    InvalidNonce,

    /// Unsupported algorithm or version
    #[error("Unsupported algorithm: {0}")]
    UnsupportedAlgorithm(String),

    /// Protocol version mismatch
    #[error("Protocol version mismatch: expected {expected}, got {actual}")]
    VersionMismatch {
        /// Expected version
        expected: u8,
        /// Actual version received
        actual: u8,
    },

    /// Handshake failed
    #[error("Handshake failed: {0}")]
    HandshakeFailed(String),

    /// Message parsing failed
    #[error("Message parsing failed")]
    ParseError,

    /// Buffer too small
    #[error("Buffer too small: need {needed} bytes, got {got}")]
    BufferTooSmall {
        /// Bytes needed
        needed: usize,
        /// Bytes available
        got: usize,
    },

    /// Random number generation failed
    #[error("RNG failed")]
    RngFailed,

    /// Authentication tag mismatch (uniform error)
    #[error("Authentication failed")]
    AuthenticationFailed,

    /// Operation not supported in current configuration
    #[error("Operation not supported")]
    NotSupported,

    /// Internal error (should never happen in normal operation)
    #[error("Internal error")]
    InternalError,
}

impl QShieldError {
    /// Returns true if this error indicates a potential security issue
    /// that should be logged but with minimal detail
    pub fn is_security_sensitive(&self) -> bool {
        matches!(
            self,
            Self::DecapsulationFailed
                | Self::VerificationFailed
                | Self::DecryptionFailed
                | Self::AuthenticationFailed
        )
    }

    /// Returns a safe error message that doesn't leak information
    pub fn safe_message(&self) -> &'static str {
        if self.is_security_sensitive() {
            "Operation failed"
        } else {
            match self {
                Self::KeyGenerationFailed => "Key generation failed",
                Self::EncapsulationFailed => "Encapsulation failed",
                Self::SigningFailed => "Signing failed",
                Self::EncryptionFailed => "Encryption failed",
                Self::KeyDerivationFailed => "Key derivation failed",
                Self::InvalidKey => "Invalid key",
                Self::InvalidCiphertext => "Invalid ciphertext",
                Self::InvalidSignature => "Invalid signature",
                Self::InvalidNonce => "Invalid nonce",
                Self::UnsupportedAlgorithm(_) => "Unsupported algorithm",
                Self::VersionMismatch { .. } => "Version mismatch",
                Self::HandshakeFailed(_) => "Handshake failed",
                Self::ParseError => "Parse error",
                Self::BufferTooSmall { .. } => "Buffer too small",
                Self::RngFailed => "RNG failed",
                Self::NotSupported => "Not supported",
                Self::InternalError => "Internal error",
                _ => "Operation failed",
            }
        }
    }
}

#[cfg(feature = "std")]
impl From<std::io::Error> for QShieldError {
    fn from(_: std::io::Error) -> Self {
        QShieldError::InternalError
    }
}
