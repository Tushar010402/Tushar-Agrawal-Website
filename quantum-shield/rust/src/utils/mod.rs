//! Utility modules for QuantumShield
//!
//! This module contains shared utilities used across the library:
//!
//! - `rng`: Secure random number generation
//! - `serialize`: Custom serialization formats

pub mod rng;
pub mod serialize;

pub use rng::SecureRng;
pub use serialize::{Deserialize, Serialize};
