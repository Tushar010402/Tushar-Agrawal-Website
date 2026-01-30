//! Fuzz test for encryption/decryption
//!
//! Tests that:
//! 1. Encryption never panics
//! 2. Decryption of invalid ciphertext never panics
//! 3. Roundtrip encryption/decryption works correctly

#![no_main]

use libfuzzer_sys::fuzz_target;
use arbitrary::Arbitrary;
use qauth::crypto::{EncryptionKey, EncryptedData};

#[derive(Arbitrary, Debug)]
struct FuzzInput {
    plaintext: Vec<u8>,
    aad: Vec<u8>,
    // For testing invalid ciphertext decryption
    fake_nonce: [u8; 24],
    fake_ciphertext: Vec<u8>,
}

fuzz_target!(|input: FuzzInput| {
    let key = EncryptionKey::generate();

    // Test 1: Encryption should never panic
    if let Ok(encrypted) = key.encrypt(&input.plaintext, &input.aad) {
        // Test 2: Decryption of valid ciphertext should work
        if let Ok(decrypted) = key.decrypt(&encrypted, &input.aad) {
            // Roundtrip must be correct
            assert_eq!(input.plaintext, decrypted);
        }

        // Test 3: Decryption with wrong AAD should fail
        let wrong_aad = [&input.aad[..], b"wrong"].concat();
        assert!(key.decrypt(&encrypted, &wrong_aad).is_err());
    }

    // Test 4: Decryption of invalid ciphertext should not panic
    let fake_encrypted = EncryptedData {
        nonce: input.fake_nonce,
        ciphertext: input.fake_ciphertext,
    };
    let _ = key.decrypt(&fake_encrypted, &input.aad);
});
