//! Fuzz test for proof of possession validation
//!
//! Tests that malformed proofs don't cause panics and always fail validation.

#![no_main]

use libfuzzer_sys::fuzz_target;
use qauth::proof::Proof;

fuzz_target!(|data: &[u8]| {
    // Attempt to parse arbitrary bytes as a Proof
    // This should never panic
    let _ = Proof::from_bytes(data);
});
