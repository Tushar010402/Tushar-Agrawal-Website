//! # QuantumAuth (QAuth)
//!
//! Next-generation authentication and authorization protocol designed to replace
//! OAuth 2.0 and JWT with post-quantum cryptographic security.
//!
//! ## Features
//!
//! - **Dual Signatures**: Ed25519 + ML-DSA-65 for quantum resistance
//! - **Encrypted Payloads**: XChaCha20-Poly1305 encryption for privacy
//! - **Proof of Possession**: Mandatory request signing prevents token theft
//! - **Built-in Revocation**: Fast revocation with bloom filter support
//! - **Fine-grained Authorization**: Policy-based access control (RBAC/ABAC/ReBAC)
//!
//! ## Quick Start
//!
//! ```rust,ignore
//! use qauth::{
//!     crypto::{EncryptionKey, IssuerSigningKeys},
//!     token::{QToken, QTokenBuilder, TokenType},
//!     proof::{ProofGenerator, ProofValidator},
//! };
//!
//! // Generate issuer keys (do this once, store securely)
//! let signing_keys = IssuerSigningKeys::generate();
//! let encryption_key = EncryptionKey::generate();
//!
//! // Create a token
//! let token = QTokenBuilder::access_token()
//!     .subject(b"user-123".to_vec())
//!     .issuer("https://auth.example.com")
//!     .audience("https://api.example.com")
//!     .policy_ref("urn:qauth:policy:default")
//!     .client_key(b"client-public-key")
//!     .validity_seconds(3600)
//!     .build(&signing_keys, &encryption_key)
//!     .unwrap();
//!
//! // Encode for transmission
//! let token_string = token.encode();
//!
//! // Create proof of possession for API request
//! let (proof_generator, client_public_key) = ProofGenerator::generate();
//! let proof = proof_generator.create_proof(
//!     "GET",
//!     "/api/resource",
//!     None,
//!     token_string.as_bytes(),
//! );
//! ```
//!
//! ## Security Model
//!
//! QAuth addresses all known OAuth 2.0 and JWT vulnerabilities:
//!
//! | Issue | QAuth Solution |
//! |-------|----------------|
//! | Algorithm confusion | Server-enforced algorithms (no header-based selection) |
//! | "None" algorithm | Not supported, always rejected |
//! | Bearer token theft | Mandatory proof of possession |
//! | No revocation | Built-in revocation with caching |
//! | Scope explosion | Policy references for fine-grained access |
//! | Payload leakage | Encrypted payloads (XChaCha20-Poly1305) |
//! | Quantum attacks | ML-DSA-65 + Ed25519 dual signatures |
//!
//! ## Token Format
//!
//! QTokens use a fixed binary format:
//!
//! ```text
//! QToken = Header (42 bytes) || EncryptedPayload || Signature (3357 bytes) || ProofBinding (96 bytes)
//! ```
//!
//! See the specification documents for complete details.

#![warn(missing_docs)]
#![warn(rustdoc::missing_crate_level_docs)]

pub mod crypto;
pub mod error;
pub mod policy;
pub mod proof;
pub mod revocation;
pub mod token;

// Re-export commonly used types
pub use crypto::{
    DualSignature, EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys,
};
pub use error::{ErrorCode, QAuthError, Result};
pub use policy::{Effect, EvaluationContext, EvaluationResult, Policy, PolicyEngine, Rule};
pub use proof::{ProofGenerator, ProofOfPossession, ProofValidator};
pub use revocation::{
    InMemoryRevocationStore, RevocationCache, RevocationChecker, RevocationEntry,
    RevocationReason, RevocationStatus, RevocationStore,
};
pub use token::{
    ProofBinding, QToken, QTokenBuilder, QTokenHeader, QTokenPayload, QTokenValidator,
    TokenType, ValidatedToken,
};

/// QAuth protocol version
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// Crate version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg(feature = "wasm")]
mod wasm;

#[cfg(feature = "wasm")]
pub use wasm::*;

/// Prelude module for convenient imports
pub mod prelude {
    pub use crate::crypto::{EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys};
    pub use crate::error::{QAuthError, Result};
    pub use crate::policy::{Effect, EvaluationContext, Policy, PolicyEngine};
    pub use crate::proof::{ProofGenerator, ProofOfPossession, ProofValidator};
    pub use crate::revocation::{RevocationChecker, RevocationEntry, RevocationReason};
    pub use crate::token::{QToken, QTokenBuilder, QTokenValidator, TokenType};
}

#[cfg(test)]
mod integration_tests {
    use super::*;
    use std::sync::Arc;

    /// Complete end-to-end test of the QAuth flow
    #[test]
    fn test_complete_auth_flow() {
        // 1. Setup: Generate issuer keys
        let signing_keys = IssuerSigningKeys::generate();
        let encryption_key = EncryptionKey::generate();

        // 2. Client: Generate ephemeral keypair
        let (proof_generator, client_public_key) = ProofGenerator::generate();

        // 3. Server: Create access token bound to client
        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(&client_public_key)
            .device_key(b"device-attestation-key")
            .validity_seconds(3600)
            .claim("email", serde_json::json!("user@example.com"))
            .claim("roles", serde_json::json!(["user", "premium"]))
            .build(&signing_keys, &encryption_key)
            .unwrap();

        // 4. Encode token for transmission
        let token_string = token.encode();
        println!("Token size: {} bytes", token_string.len());

        // 5. Client: Create proof of possession for API request
        let request_body = b"request data";
        let proof = proof_generator.create_proof(
            "POST",
            "/api/resource",
            Some(request_body),
            token_string.as_bytes(),
        );

        // 6. Server: Validate token
        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        // Decode and verify token
        let decoded_token = QToken::decode(&token_string).unwrap();
        assert!(decoded_token.verify_signatures(&verifying_keys).is_ok());

        // Decrypt payload
        let payload = decoded_token.decrypt_payload(&encryption_key).unwrap();
        assert_eq!(payload.sub, b"user-123");
        assert_eq!(payload.iss, "https://auth.example.com");

        // 7. Server: Validate proof of possession
        let proof_validator = ProofValidator::new(&client_public_key).unwrap();
        assert!(proof_validator
            .validate(
                &proof,
                "POST",
                "/api/resource",
                Some(request_body),
                token_string.as_bytes()
            )
            .is_ok());

        println!("Complete auth flow test passed!");
    }

    /// Test token revocation
    #[test]
    fn test_revocation_flow() {
        let signing_keys = IssuerSigningKeys::generate();
        let encryption_key = EncryptionKey::generate();

        // Create token
        let token = QTokenBuilder::access_token()
            .subject(b"user-456".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .build(&signing_keys, &encryption_key)
            .unwrap();

        // Get revocation ID from payload
        let payload = token.decrypt_payload(&encryption_key).unwrap();
        let revocation_id = payload.rid;

        // Setup revocation checker
        let store = Arc::new(InMemoryRevocationStore::new());
        let checker = RevocationChecker::new(store);

        // Initially not revoked
        assert!(!checker.is_revoked(&revocation_id).unwrap());

        // Revoke the token
        checker
            .revoke(
                revocation_id,
                RevocationReason::UserLogout,
                chrono::Utc::now() + chrono::Duration::hours(1),
            )
            .unwrap();

        // Now it's revoked
        assert!(checker.is_revoked(&revocation_id).unwrap());

        println!("Revocation flow test passed!");
    }

    /// Test policy evaluation
    #[test]
    fn test_policy_flow() {
        let mut engine = PolicyEngine::new();

        // Load a policy
        let policy_json = r#"
        {
            "id": "urn:qauth:policy:test-api",
            "version": "2026-01-30",
            "issuer": "https://auth.example.com",
            "rules": [
                {
                    "id": "read-projects",
                    "effect": "allow",
                    "resources": ["projects/*"],
                    "actions": ["read", "list"],
                    "priority": 100
                },
                {
                    "id": "write-own-projects",
                    "effect": "allow",
                    "resources": ["projects/*"],
                    "actions": ["write", "delete"],
                    "conditions": {
                        "custom": {
                            "role": {"in": ["admin", "owner"]}
                        }
                    },
                    "priority": 200
                }
            ]
        }
        "#;

        engine.load_policy_json(policy_json).unwrap();

        // Test read access (should be allowed for everyone)
        let read_context = EvaluationContext {
            resource: policy::ResourceContext {
                path: "projects/123".to_string(),
                ..Default::default()
            },
            request: policy::RequestContext {
                action: "read".to_string(),
                timestamp: chrono::Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test-api", &read_context).unwrap();
        assert_eq!(result.effect, Effect::Allow);

        // Test write access without admin role (should be denied)
        let write_context = EvaluationContext {
            subject: policy::SubjectContext {
                attributes: {
                    let mut attrs = std::collections::HashMap::new();
                    attrs.insert("role".to_string(), serde_json::json!("user"));
                    attrs
                },
                ..Default::default()
            },
            resource: policy::ResourceContext {
                path: "projects/123".to_string(),
                ..Default::default()
            },
            request: policy::RequestContext {
                action: "write".to_string(),
                timestamp: chrono::Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test-api", &write_context).unwrap();
        assert_eq!(result.effect, Effect::Deny);

        // Test write access with admin role (should be allowed)
        let admin_context = EvaluationContext {
            subject: policy::SubjectContext {
                attributes: {
                    let mut attrs = std::collections::HashMap::new();
                    attrs.insert("role".to_string(), serde_json::json!("admin"));
                    attrs
                },
                ..Default::default()
            },
            resource: policy::ResourceContext {
                path: "projects/123".to_string(),
                ..Default::default()
            },
            request: policy::RequestContext {
                action: "write".to_string(),
                timestamp: chrono::Utc::now(),
                ..Default::default()
            },
            ..Default::default()
        };

        let result = engine.evaluate("urn:qauth:policy:test-api", &admin_context).unwrap();
        assert_eq!(result.effect, Effect::Allow);

        println!("Policy flow test passed!");
    }

    /// Test dual signature verification
    #[test]
    fn test_dual_signature_both_must_verify() {
        let signing_keys = IssuerSigningKeys::generate();
        let encryption_key = EncryptionKey::generate();

        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .build(&signing_keys, &encryption_key)
            .unwrap();

        // Create verifying keys from the signing keys
        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        // Verification should succeed
        assert!(token.verify_signatures(&verifying_keys).is_ok());

        // Try with wrong Ed25519 key (should fail)
        let wrong_ed25519_keys = IssuerSigningKeys::generate();
        let wrong_verifying_keys = IssuerVerifyingKeys::from_bytes(
            &wrong_ed25519_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        assert!(token.verify_signatures(&wrong_verifying_keys).is_err());

        // Try with wrong ML-DSA key (should fail)
        let wrong_mldsa_keys = IssuerSigningKeys::generate();
        let wrong_verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &wrong_mldsa_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        assert!(token.verify_signatures(&wrong_verifying_keys).is_err());

        println!("Dual signature test passed!");
    }
}
