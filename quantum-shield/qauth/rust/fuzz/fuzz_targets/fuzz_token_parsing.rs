//! Fuzz test for QToken parsing
//!
//! This tests that malformed token data doesn't cause panics or undefined behavior.

#![no_main]

use libfuzzer_sys::fuzz_target;
use qauth::token::QToken;

fuzz_target!(|data: &[u8]| {
    // Attempt to parse arbitrary bytes as a QToken
    // This should never panic, only return errors
    let _ = QToken::from_bytes(data);
});
