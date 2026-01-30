//! Integration tests for QuantumShield
//!
//! These tests verify the complete system working together,
//! including end-to-end encryption flows.

use quantum_shield::{
    QShieldKEM, QShieldKDF, QShieldSign, QuantumShield,
    QShieldHandshake, QShieldMessage,
    protocol::{MessageChannel, MessageContent, MessageType},
    kdf::domains,
    utils::serialize::{Serialize, Deserialize},
};

/// Test complete key exchange and encryption flow
#[test]
fn test_end_to_end_encryption() {
    // Step 1: Generate key pairs
    let (_alice_kem_pk, _alice_kem_sk) = QShieldKEM::generate_keypair().unwrap();
    let (bob_kem_pk, bob_kem_sk) = QShieldKEM::generate_keypair().unwrap();

    // Step 2: Alice encapsulates to Bob's public key
    let (ciphertext, alice_shared_secret) = QShieldKEM::encapsulate(&bob_kem_pk).unwrap();

    // Step 3: Bob decapsulates to get the same shared secret
    let bob_shared_secret = QShieldKEM::decapsulate(&bob_kem_sk, &ciphertext).unwrap();

    // Verify shared secrets match
    assert_eq!(alice_shared_secret.as_bytes(), bob_shared_secret.as_bytes());

    // Step 4: Create symmetric ciphers from shared secret
    let alice_cipher = QuantumShield::new(alice_shared_secret.as_bytes()).unwrap();
    let bob_cipher = QuantumShield::new(bob_shared_secret.as_bytes()).unwrap();

    // Step 5: Alice encrypts a message
    let plaintext = b"Hello, Bob! This is a quantum-secure message.";
    let ciphertext = alice_cipher.encrypt(plaintext).unwrap();

    // Step 6: Bob decrypts the message
    let decrypted = bob_cipher.decrypt(&ciphertext).unwrap();
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());

    // Step 7: Bob responds
    let response = b"Hi Alice! Message received securely.";
    let encrypted_response = bob_cipher.encrypt(response).unwrap();
    let decrypted_response = alice_cipher.decrypt(&encrypted_response).unwrap();
    assert_eq!(response.as_slice(), decrypted_response.as_slice());
}

/// Test signed and encrypted message flow
#[test]
fn test_signed_encrypted_message() {
    // Generate signing keys
    let (alice_sign_pk, alice_sign_sk) = QShieldSign::generate_keypair().unwrap();
    let (bob_sign_pk, bob_sign_sk) = QShieldSign::generate_keypair().unwrap();

    // Generate KEM keys and establish shared secret
    let (bob_kem_pk, bob_kem_sk) = QShieldKEM::generate_keypair().unwrap();
    let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&bob_kem_pk).unwrap();
    let bob_shared_secret = QShieldKEM::decapsulate(&bob_kem_sk, &ciphertext).unwrap();

    // Create cipher
    let cipher = QuantumShield::new(shared_secret.as_bytes()).unwrap();

    // Alice creates and signs a message
    let message = b"Authenticated message from Alice";
    let signature = QShieldSign::sign(&alice_sign_sk, message).unwrap();

    // Alice encrypts message + signature
    let mut payload = message.to_vec();
    let sig_bytes = signature.serialize().unwrap();
    payload.extend_from_slice(&(sig_bytes.len() as u32).to_le_bytes());
    payload.extend_from_slice(&sig_bytes);

    let encrypted = cipher.encrypt(&payload).unwrap();

    // Bob decrypts
    let decrypted = cipher.decrypt(&encrypted).unwrap();

    // Bob extracts message and signature
    let msg_end = decrypted.len() - 4 - sig_bytes.len();
    let decrypted_message = &decrypted[..msg_end];
    let sig_len = u32::from_le_bytes([
        decrypted[msg_end],
        decrypted[msg_end + 1],
        decrypted[msg_end + 2],
        decrypted[msg_end + 3],
    ]) as usize;
    let sig_start = msg_end + 4;
    let decrypted_sig = quantum_shield::sign::QShieldSignature::deserialize(
        &decrypted[sig_start..sig_start + sig_len],
    )
    .unwrap();

    // Bob verifies signature
    let valid = QShieldSign::verify(&alice_sign_pk, decrypted_message, &decrypted_sig).unwrap();
    assert!(valid);
    assert_eq!(decrypted_message, message);
}

/// Test full handshake protocol
#[test]
fn test_full_handshake_protocol() {
    // Generate long-term signing keys
    let (client_sign_pk, client_sign_sk) = QShieldSign::generate_keypair().unwrap();
    let (server_sign_pk, server_sign_sk) = QShieldSign::generate_keypair().unwrap();

    // Initialize handshakes
    let mut client = QShieldHandshake::new_client(client_sign_sk, client_sign_pk).unwrap();
    let mut server = QShieldHandshake::new_server(server_sign_sk, server_sign_pk);

    // Execute handshake
    let client_hello = client.client_hello().unwrap();
    let server_hello = server.server_hello(&client_hello).unwrap();
    let client_finished = client.process_server_hello(&server_hello).unwrap();
    let server_finished = server.process_client_finished(&client_finished).unwrap();
    let client_session = client.process_server_finished(&server_finished).unwrap();
    let server_session = server.complete_server().unwrap();

    // Verify both sides have same session
    assert_eq!(client_session.session_id, server_session.session_id);

    // Test bidirectional communication
    let messages = [
        b"First message from client".as_slice(),
        b"Response from server".as_slice(),
        b"Another client message".as_slice(),
        b"Final server response".as_slice(),
    ];

    for (i, msg) in messages.iter().enumerate() {
        if i % 2 == 0 {
            // Client to server
            let encrypted = client_session.cipher.encrypt(msg).unwrap();
            let decrypted = server_session.cipher.decrypt(&encrypted).unwrap();
            assert_eq!(*msg, decrypted.as_slice());
        } else {
            // Server to client
            let encrypted = server_session.cipher.encrypt(msg).unwrap();
            let decrypted = client_session.cipher.decrypt(&encrypted).unwrap();
            assert_eq!(*msg, decrypted.as_slice());
        }
    }
}

/// Test message channel with replay protection
#[test]
fn test_message_channel_ordering() {
    let shared_secret = b"test shared secret for channel";
    let cipher1 = QuantumShield::new(shared_secret).unwrap();
    let cipher2 = QuantumShield::new(shared_secret).unwrap();
    let session_id = [0u8; 32];

    let mut sender = MessageChannel::new(cipher1, session_id);
    let mut receiver = MessageChannel::new(cipher2, session_id);

    // Send multiple messages
    let messages: Vec<&[u8]> = vec![b"Message 1", b"Message 2", b"Message 3"];
    let mut encrypted_messages = Vec::new();

    for msg in &messages {
        encrypted_messages.push(sender.send(msg).unwrap());
    }

    // Receive in order
    for (i, encrypted) in encrypted_messages.iter().enumerate() {
        let content = receiver.receive(encrypted).unwrap();
        assert_eq!(content.payload, messages[i]);
        assert_eq!(content.counter, i as u64);
    }
}

/// Test KDF domain separation
#[test]
fn test_kdf_domain_separation() {
    let kdf = QShieldKDF::new();
    let ikm = b"input keying material";
    let salt = b"test salt value";

    // Same IKM and salt, different domains should give different keys
    let key1 = kdf.derive(ikm, Some(salt), domains::KEM_COMBINE, 32).unwrap();
    let key2 = kdf.derive(ikm, Some(salt), domains::ENCRYPTION, 32).unwrap();
    let key3 = kdf.derive(ikm, Some(salt), domains::SIGNING, 32).unwrap();

    assert_ne!(key1.as_bytes(), key2.as_bytes());
    assert_ne!(key2.as_bytes(), key3.as_bytes());
    assert_ne!(key1.as_bytes(), key3.as_bytes());
}

/// Test key rotation provides forward secrecy
#[test]
fn test_key_rotation_forward_secrecy() {
    let shared_secret = b"initial shared secret";
    let mut cipher = QuantumShield::new(shared_secret).unwrap();

    // Encrypt with original key
    let msg1 = b"Message before rotation";
    let ct1 = cipher.encrypt(msg1).unwrap();

    // Verify original decryption works
    let pt1 = cipher.decrypt(&ct1).unwrap();
    assert_eq!(msg1.as_slice(), pt1.as_slice());

    // Rotate keys
    cipher.rotate_keys().unwrap();

    // New encryption should work
    let msg2 = b"Message after rotation";
    let ct2 = cipher.encrypt(msg2).unwrap();
    let pt2 = cipher.decrypt(&ct2).unwrap();
    assert_eq!(msg2.as_slice(), pt2.as_slice());

    // Old ciphertext should NOT decrypt with new keys
    let result = cipher.decrypt(&ct1);
    assert!(result.is_err());
}

/// Test large message encryption
#[test]
fn test_large_message() {
    let shared_secret = b"shared secret for large test";
    let cipher = QuantumShield::new(shared_secret).unwrap();

    // Create a 1MB message
    let large_message: Vec<u8> = (0..1_000_000).map(|i| (i % 256) as u8).collect();

    let ciphertext = cipher.encrypt(&large_message).unwrap();
    let decrypted = cipher.decrypt(&ciphertext).unwrap();

    assert_eq!(large_message, decrypted);
}

/// Test serialization roundtrip for all key types
#[test]
fn test_key_serialization_roundtrip() {

    // KEM keys
    let (kem_pk, kem_sk) = QShieldKEM::generate_keypair().unwrap();
    let kem_pk_bytes = kem_pk.serialize().unwrap();
    let kem_pk_restored = quantum_shield::kem::QShieldKEMPublicKey::deserialize(&kem_pk_bytes).unwrap();

    // Sign keys
    let (sign_pk, sign_sk) = QShieldSign::generate_keypair().unwrap();
    let sign_pk_bytes = sign_pk.serialize().unwrap();
    let sign_pk_restored = quantum_shield::sign::QShieldSignPublicKey::deserialize(&sign_pk_bytes).unwrap();

    // Verify restored keys work
    let (ct, ss1) = QShieldKEM::encapsulate(&kem_pk_restored).unwrap();
    let ss2 = QShieldKEM::decapsulate(&kem_sk, &ct).unwrap();
    assert_eq!(ss1.as_bytes(), ss2.as_bytes());

    let message = b"Test signature verification";
    let signature = QShieldSign::sign(&sign_sk, message).unwrap();
    let valid = QShieldSign::verify(&sign_pk_restored, message, &signature).unwrap();
    assert!(valid);
}

/// Test AAD binding in symmetric encryption
#[test]
fn test_aad_binding() {
    let cipher = QuantumShield::new(b"test key").unwrap();
    let plaintext = b"Sensitive data";
    let aad = b"context information";
    let wrong_aad = b"different context";

    let ciphertext = cipher.encrypt_with_aad(plaintext, aad).unwrap();

    // Correct AAD should work
    let decrypted = cipher.decrypt_with_aad(&ciphertext, aad).unwrap();
    assert_eq!(plaintext.as_slice(), decrypted.as_slice());

    // Wrong AAD should fail
    let result = cipher.decrypt_with_aad(&ciphertext, wrong_aad);
    assert!(result.is_err());

    // No AAD should also fail
    let result = cipher.decrypt(&ciphertext);
    assert!(result.is_err());
}
