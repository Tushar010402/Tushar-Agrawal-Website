//! Key Encapsulation Mechanisms for QuantumShield
//!
//! This module implements QShieldKEM, a hybrid key encapsulation mechanism
//! combining X25519 (classical) with ML-KEM-768 (post-quantum).
//!
//! ## Security Model
//!
//! The hybrid approach ensures security as long as *either* algorithm remains secure:
//! - X25519 provides security against classical adversaries
//! - ML-KEM provides security against quantum adversaries
//!
//! ## Key Combination
//!
//! The final shared secret is derived using HKDF-SHA3-512:
//! ```text
//! Final Key = HKDF-SHA3-512(
//!     ikm: X25519_shared || ML-KEM_shared,
//!     salt: quantum_resistant_salt(),
//!     info: "QShieldKEM-v1"
//! )
//! ```

mod hybrid;
mod ml_kem;
mod x25519;

pub use hybrid::{
    QShieldKEM, QShieldKEMCiphertext, QShieldKEMPublicKey, QShieldKEMSecretKey,
};
pub use ml_kem::{MlKemCiphertext, MlKemPublicKey, MlKemSecretKey};
pub use x25519::{X25519Ciphertext, X25519PublicKey, X25519SecretKey};
