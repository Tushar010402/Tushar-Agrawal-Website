//! Error types for QuantumAuth
//!
//! Provides unified error handling with security-conscious error messages.

use thiserror::Error;

/// QAuth error codes matching the specification
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    /// E001: Unsupported protocol version
    InvalidVersion,
    /// E002: Unknown token type
    InvalidType,
    /// E003: Signature verification failed
    SignatureFailed,
    /// E004: Payload decryption failed
    DecryptionFailed,
    /// E005: Token has expired
    TokenExpired,
    /// E006: Token not yet valid (nbf)
    TokenNotYetValid,
    /// E007: Audience mismatch
    InvalidAudience,
    /// E008: Unknown or untrusted issuer
    InvalidIssuer,
    /// E009: Proof binding validation failed
    BindingMismatch,
    /// E010: Token has been revoked
    TokenRevoked,
}

impl ErrorCode {
    /// Get the error code string
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidVersion => "E001",
            Self::InvalidType => "E002",
            Self::SignatureFailed => "E003",
            Self::DecryptionFailed => "E004",
            Self::TokenExpired => "E005",
            Self::TokenNotYetValid => "E006",
            Self::InvalidAudience => "E007",
            Self::InvalidIssuer => "E008",
            Self::BindingMismatch => "E009",
            Self::TokenRevoked => "E010",
        }
    }
}

/// Main error type for QAuth operations
#[derive(Error, Debug)]
pub enum QAuthError {
    /// Token validation error with code
    #[error("Token validation failed: {code:?}")]
    TokenValidation { code: ErrorCode },

    /// Cryptographic operation failed
    #[error("Cryptographic operation failed")]
    CryptoError,

    /// Serialization/deserialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// Invalid input data
    #[error("Invalid input: {0}")]
    InvalidInput(String),

    /// Policy evaluation error
    #[error("Policy error: {0}")]
    PolicyError(String),

    /// Revocation check failed
    #[error("Revocation check failed: {0}")]
    RevocationError(String),

    /// Proof of possession invalid
    #[error("Proof of possession invalid")]
    InvalidProof,

    /// Key not found
    #[error("Key not found: {0}")]
    KeyNotFound(String),

    /// Internal error
    #[error("Internal error")]
    InternalError,
}

impl From<ErrorCode> for QAuthError {
    fn from(code: ErrorCode) -> Self {
        QAuthError::TokenValidation { code }
    }
}

/// Result type for QAuth operations
pub type Result<T> = std::result::Result<T, QAuthError>;
