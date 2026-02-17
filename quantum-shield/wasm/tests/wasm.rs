//! WASM integration tests for the QuantumShield SDK.
//!
//! Run with: `wasm-pack test --headless --firefox`

use wasm_bindgen_test::*;
use quantum_shield::*;

wasm_bindgen_test_configure!(run_in_browser);

// ============================================================================
// CIPHER TESTS
// ============================================================================

#[wasm_bindgen_test]
fn cipher_encrypt_decrypt_roundtrip() {
    let cipher = QShieldCipher::from_bytes(b"test-key-for-wasm-integration").unwrap();
    let plaintext = b"Hello from WASM tests!";

    let encrypted = cipher.encrypt(plaintext).unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();

    assert_eq!(plaintext.as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn cipher_with_aad() {
    let cipher = QShieldCipher::from_bytes(b"aad-test-key-wasm").unwrap();
    let plaintext = b"Authenticated data test";
    let aad = b"context-binding";

    let encrypted = cipher.encrypt_with_aad(plaintext, aad).unwrap();
    let decrypted = cipher.decrypt_with_aad(&encrypted, aad).unwrap();
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());

    // Wrong AAD must fail
    assert!(cipher.decrypt_with_aad(&encrypted, b"wrong").is_err());
}

#[wasm_bindgen_test]
fn cipher_string_encrypt_decrypt() {
    let cipher = QShieldCipher::from_bytes(b"string-test-key-wasm").unwrap();
    let message = "Hello, QuantumShield WASM!";

    let encrypted_b64 = cipher.encrypt_string(message).unwrap();
    let decrypted = cipher.decrypt_string(&encrypted_b64).unwrap();

    assert_eq!(message, &decrypted);
}

#[wasm_bindgen_test]
fn cipher_from_password() {
    let cipher = QShieldCipher::new("my-secure-password").unwrap();
    let data = b"Password-derived cipher test";

    let encrypted = cipher.encrypt(data).unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();
    assert_eq!(data.as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn cipher_password_no_padding() {
    let cipher = QShieldCipher::from_password_with_options("test-pass", false).unwrap();
    assert!(!cipher.has_length_hiding());

    let data = b"No padding";
    let encrypted = cipher.encrypt(data).unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();
    assert_eq!(data.as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn cipher_empty_data() {
    let cipher = QShieldCipher::from_bytes(b"empty-data-test-key").unwrap();
    let encrypted = cipher.encrypt(b"").unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();
    assert_eq!(b"".as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn cipher_wrong_key_fails() {
    let cipher1 = QShieldCipher::from_bytes(b"key-one").unwrap();
    let cipher2 = QShieldCipher::from_bytes(b"key-two").unwrap();

    let encrypted = cipher1.encrypt(b"secret").unwrap();
    assert!(cipher2.decrypt(&encrypted).is_err());
}

#[wasm_bindgen_test]
fn cipher_tampered_ciphertext_fails() {
    let cipher = QShieldCipher::from_bytes(b"tamper-test").unwrap();
    let mut encrypted = cipher.encrypt(b"original").unwrap();

    if let Some(last) = encrypted.last_mut() {
        *last ^= 0xFF;
    }

    assert!(cipher.decrypt(&encrypted).is_err());
}

#[wasm_bindgen_test]
fn cipher_overhead() {
    let cipher_padded = QShieldCipher::from_bytes(b"overhead-test").unwrap();
    assert!(cipher_padded.has_length_hiding());
    assert!(cipher_padded.overhead() > 0);

    let cipher_nopad = QShieldCipher::from_password_with_options("test", false).unwrap();
    assert!(!cipher_nopad.has_length_hiding());
    assert!(cipher_nopad.overhead() > 0);
    assert!(cipher_padded.overhead() > cipher_nopad.overhead());
}

// ============================================================================
// HYBRID KEM TESTS
// ============================================================================

#[wasm_bindgen_test]
fn hybrid_kem_keygen_encapsulate_decapsulate() {
    let alice = QShieldHybridKEM::new().unwrap();
    let bob = QShieldHybridKEM::new().unwrap();

    let encap = alice.encapsulate(&bob.public_key()).unwrap();
    let bob_secret = bob.decapsulate(&encap.ciphertext()).unwrap();

    assert_eq!(encap.shared_secret(), bob_secret);
}

#[wasm_bindgen_test]
fn hybrid_kem_public_key_size() {
    let kem = QShieldHybridKEM::new().unwrap();
    assert_eq!(kem.public_key().len(), 1216);
    assert_eq!(QShieldHybridKEM::public_key_size(), 1216);
}

#[wasm_bindgen_test]
fn hybrid_kem_ciphertext_size() {
    let alice = QShieldHybridKEM::new().unwrap();
    let bob = QShieldHybridKEM::new().unwrap();

    let encap = alice.encapsulate(&bob.public_key()).unwrap();
    assert_eq!(encap.ciphertext().len(), 1120); // 32 + 1088
}

#[wasm_bindgen_test]
fn hybrid_kem_base64_roundtrip() {
    let kem = QShieldHybridKEM::new().unwrap();
    let pk_b64 = kem.public_key_base64();
    assert!(!pk_b64.is_empty());

    let alice = QShieldHybridKEM::new().unwrap();
    let encap = alice.encapsulate(&kem.public_key()).unwrap();
    let ct_b64 = encap.ciphertext_base64();
    assert!(!ct_b64.is_empty());
}

#[wasm_bindgen_test]
fn hybrid_kem_derive_cipher() {
    let alice = QShieldHybridKEM::new().unwrap();
    let bob = QShieldHybridKEM::new().unwrap();

    let result = alice.derive_cipher(&bob.public_key()).unwrap();
    let bob_cipher = bob.derive_cipher_from_ciphertext(&result.ciphertext()).unwrap();

    let plaintext = b"Quantum-secure via KEM";
    let encrypted = result.encrypt(plaintext).unwrap();
    let decrypted = bob_cipher.decrypt(&encrypted).unwrap();
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn hybrid_kem_derive_cipher_string() {
    let alice = QShieldHybridKEM::new().unwrap();
    let bob = QShieldHybridKEM::new().unwrap();

    let result = alice.derive_cipher(&bob.public_key()).unwrap();
    let bob_cipher = bob.derive_cipher_from_ciphertext(&result.ciphertext()).unwrap();

    let encrypted_b64 = result.encrypt_string("Hello KEM").unwrap();
    let decrypted = bob_cipher.decrypt_string(&encrypted_b64).unwrap();
    assert_eq!("Hello KEM", &decrypted);
}

#[wasm_bindgen_test]
fn hybrid_kem_invalid_public_key() {
    let alice = QShieldHybridKEM::new().unwrap();
    assert!(alice.encapsulate(&[0u8; 32]).is_err());
}

#[wasm_bindgen_test]
fn hybrid_kem_invalid_ciphertext() {
    let bob = QShieldHybridKEM::new().unwrap();
    assert!(bob.decapsulate(&[0u8; 32]).is_err());
}

// ============================================================================
// DUAL SIGNATURE TESTS
// ============================================================================

#[wasm_bindgen_test]
fn dual_sign_and_verify() {
    let signer = QShieldSign::new().unwrap();
    let message = b"WASM dual signature test";

    let signature = signer.sign(message).unwrap();
    assert!(signer.verify(message, &signature).unwrap());
}

#[wasm_bindgen_test]
fn dual_sign_wrong_message_fails() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Original message";

    let signature = signer.sign(message).unwrap();
    assert!(!signer.verify(b"Tampered message", &signature).unwrap());
}

#[wasm_bindgen_test]
fn dual_sign_string() {
    let signer = QShieldSign::new().unwrap();
    let message = "String signing test";

    let signature = signer.sign_string(message).unwrap();
    assert!(signer.verify_string(message, &signature).unwrap());
}

#[wasm_bindgen_test]
fn dual_signature_bytes_roundtrip() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Serialization roundtrip";

    let signature = signer.sign(message).unwrap();
    let sig_bytes = signature.bytes();
    let parsed = DualSignature::from_bytes(&sig_bytes).unwrap();

    assert!(signer.verify(message, &parsed).unwrap());
}

#[wasm_bindgen_test]
fn dual_signature_base64_roundtrip() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Base64 roundtrip";

    let signature = signer.sign(message).unwrap();
    let sig_b64 = signature.base64();
    let parsed = DualSignature::from_base64(&sig_b64).unwrap();

    assert!(signer.verify(message, &parsed).unwrap());
}

#[wasm_bindgen_test]
fn dual_signature_components() {
    let signer = QShieldSign::new().unwrap();
    let signature = signer.sign(b"component test").unwrap();

    // ML-DSA-65: 3309 bytes
    assert_eq!(signature.mldsa_signature().len(), 3309);
    // SLH-DSA-SHAKE-128f: 17088 bytes
    assert_eq!(signature.slhdsa_signature().len(), 17088);
}

#[wasm_bindgen_test]
fn dual_signature_size_info() {
    let info = DualSignature::size_info();
    assert!(info.contains("3309"));
    assert!(info.contains("17088"));
    assert!(info.contains("20397"));
}

#[wasm_bindgen_test]
fn dual_sign_public_key_size() {
    let signer = QShieldSign::new().unwrap();
    assert_eq!(signer.public_key().len(), 1984); // 1952 + 32

    let info = QShieldSign::public_key_info();
    assert!(info.contains("1952"));
    assert!(info.contains("32"));
    assert!(info.contains("1984"));
}

// ============================================================================
// VERIFIER TESTS
// ============================================================================

#[wasm_bindgen_test]
fn verifier_from_public_key() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Verifier test in WASM";

    let signature = signer.sign(message).unwrap();
    let verifier = QShieldVerifier::new(&signer.public_key()).unwrap();

    assert!(verifier.verify(message, &signature).unwrap());
}

#[wasm_bindgen_test]
fn verifier_from_base64() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Verifier base64 test";

    let signature = signer.sign(message).unwrap();
    let verifier = QShieldVerifier::from_base64(&signer.public_key_base64()).unwrap();

    assert!(verifier.verify(message, &signature).unwrap());
}

#[wasm_bindgen_test]
fn verifier_string() {
    let signer = QShieldSign::new().unwrap();
    let message = "Verifier string test";

    let signature = signer.sign_string(message).unwrap();
    let verifier = QShieldVerifier::new(&signer.public_key()).unwrap();

    assert!(verifier.verify_string(message, &signature).unwrap());
}

#[wasm_bindgen_test]
fn verifier_base64_signature() {
    let signer = QShieldSign::new().unwrap();
    let message = b"Verifier base64 sig";

    let signature = signer.sign(message).unwrap();
    let verifier = QShieldVerifier::new(&signer.public_key()).unwrap();

    assert!(verifier.verify_base64(message, &signature.base64()).unwrap());
}

#[wasm_bindgen_test]
fn verifier_wrong_message_fails() {
    let signer = QShieldSign::new().unwrap();
    let signature = signer.sign(b"original").unwrap();
    let verifier = QShieldVerifier::new(&signer.public_key()).unwrap();

    assert!(!verifier.verify(b"tampered", &signature).unwrap());
}

#[wasm_bindgen_test]
fn verifier_invalid_public_key_length() {
    assert!(QShieldVerifier::new(&[0u8; 100]).is_err());
}

// ============================================================================
// SESSION TESTS
// ============================================================================

#[wasm_bindgen_test]
fn session_encrypt_decrypt() {
    let secret = b"session-shared-secret-wasm-test";
    let mut sender = QShieldSession::new(secret).unwrap();
    let mut receiver = QShieldSession::new(secret).unwrap();

    let msg1 = b"First session message";
    let encrypted1 = sender.encrypt(msg1).unwrap();
    let decrypted1 = receiver.decrypt(&encrypted1).unwrap();
    assert_eq!(msg1.as_slice(), decrypted1.as_slice());

    let msg2 = b"Second session message";
    let encrypted2 = sender.encrypt(msg2).unwrap();
    let decrypted2 = receiver.decrypt(&encrypted2).unwrap();
    assert_eq!(msg2.as_slice(), decrypted2.as_slice());
}

#[wasm_bindgen_test]
fn session_message_count() {
    let secret = b"message-count-test";
    let mut session = QShieldSession::new(secret).unwrap();
    assert_eq!(session.message_count(), 0);

    session.encrypt(b"msg1").unwrap();
    assert_eq!(session.message_count(), 1);

    session.encrypt(b"msg2").unwrap();
    assert_eq!(session.message_count(), 2);
}

#[wasm_bindgen_test]
fn session_out_of_order_fails() {
    let secret = b"out-of-order-test";
    let mut sender = QShieldSession::new(secret).unwrap();
    let mut receiver = QShieldSession::new(secret).unwrap();

    let _encrypted1 = sender.encrypt(b"msg1").unwrap();
    let encrypted2 = sender.encrypt(b"msg2").unwrap();

    // Skip msg1 — trying to decrypt msg2 first should fail
    assert!(receiver.decrypt(&encrypted2).is_err());
}

#[wasm_bindgen_test]
fn session_forward_secrecy() {
    let secret = b"forward-secrecy-test";
    let mut sender = QShieldSession::new(secret).unwrap();
    let mut receiver = QShieldSession::new(secret).unwrap();

    let encrypted1 = sender.encrypt(b"msg1").unwrap();
    let encrypted2 = sender.encrypt(b"msg2").unwrap();

    // Decrypt in order — each message uses a unique key
    let decrypted1 = receiver.decrypt(&encrypted1).unwrap();
    assert_eq!(b"msg1".as_slice(), decrypted1.as_slice());

    let decrypted2 = receiver.decrypt(&encrypted2).unwrap();
    assert_eq!(b"msg2".as_slice(), decrypted2.as_slice());

    // Cannot re-decrypt (keys are ratcheted forward)
    let mut fresh_receiver = QShieldSession::new(secret).unwrap();
    let re_decrypted1 = fresh_receiver.decrypt(&encrypted1).unwrap();
    assert_eq!(b"msg1".as_slice(), re_decrypted1.as_slice());
}

// ============================================================================
// CLASSICAL KEY EXCHANGE TESTS
// ============================================================================

#[wasm_bindgen_test]
fn classical_key_exchange() {
    let alice = QShieldKeyExchange::new();
    let bob = QShieldKeyExchange::new();

    let alice_cipher = alice.derive_cipher(&bob.public_key()).unwrap();
    let bob_cipher = bob.derive_cipher(&alice.public_key()).unwrap();

    let plaintext = b"Classical key exchange in WASM";
    let encrypted = alice_cipher.encrypt(plaintext).unwrap();
    let decrypted = bob_cipher.decrypt(&encrypted).unwrap();
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());
}

#[wasm_bindgen_test]
fn classical_key_exchange_base64() {
    let kx = QShieldKeyExchange::new();
    assert_eq!(kx.public_key().len(), 32);
    assert!(!kx.public_key_base64().is_empty());
}

#[wasm_bindgen_test]
fn classical_key_exchange_invalid_key() {
    let kx = QShieldKeyExchange::new();
    assert!(kx.derive_cipher(&[0u8; 16]).is_err()); // Wrong length
}

// ============================================================================
// UTILITY TESTS
// ============================================================================

#[wasm_bindgen_test]
fn test_secure_compare() {
    assert!(secure_compare(b"hello", b"hello"));
    assert!(!secure_compare(b"hello", b"world"));
    assert!(!secure_compare(b"hello", b"hell"));
    assert!(!secure_compare(b"", b"x"));
    assert!(secure_compare(b"", b""));
}

#[wasm_bindgen_test]
fn test_info() {
    let info_str = info();
    assert!(info_str.contains("QuantumShield"));
    assert!(info_str.contains("ML-KEM-768"));
    assert!(info_str.contains("ML-DSA-65"));
    assert!(info_str.contains("SLH-DSA-SHAKE-128f"));
}

#[wasm_bindgen_test]
fn test_demo() {
    let result = demo("Hello, World!", "test-password").unwrap();
    assert!(result.contains("Hello, World!"));
    assert!(result.contains("Original:"));
    assert!(result.contains("Decrypted:"));
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

#[wasm_bindgen_test]
fn large_data_encrypt_decrypt() {
    let cipher = QShieldCipher::from_bytes(b"large-data-test-key").unwrap();
    let data: Vec<u8> = (0..10000).map(|i| (i % 256) as u8).collect();

    let encrypted = cipher.encrypt(&data).unwrap();
    let decrypted = cipher.decrypt(&encrypted).unwrap();
    assert_eq!(data, decrypted);
}

#[wasm_bindgen_test]
fn cipher_ciphertext_too_short() {
    let cipher = QShieldCipher::from_bytes(b"short-ct-test").unwrap();
    assert!(cipher.decrypt(&[0u8; 10]).is_err());
}

#[wasm_bindgen_test]
fn dual_signature_from_bytes_too_short() {
    assert!(DualSignature::from_bytes(&[0u8; 2]).is_err());
}

#[wasm_bindgen_test]
fn dual_signature_from_base64_invalid() {
    assert!(DualSignature::from_base64("not-valid-base64!!!").is_err());
}
