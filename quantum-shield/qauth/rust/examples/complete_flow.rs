//! Complete QAuth Flow Example
//!
//! This example demonstrates the full authentication and authorization flow:
//! 1. Server generates issuer keys
//! 2. Client generates ephemeral keypair
//! 3. Server creates a bound access token
//! 4. Client creates proof of possession for API request
//! 5. Server validates token and proof
//! 6. Server evaluates policy for authorization

use qauth::{
    crypto::{EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys},
    policy::{Effect, EvaluationContext, PolicyEngine},
    proof::{ProofGenerator, ProofValidator},
    revocation::{InMemoryRevocationStore, RevocationChecker, RevocationReason},
    token::{QToken, QTokenBuilder, QTokenValidator},
};
use std::sync::Arc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== QuantumAuth Complete Flow Example ===\n");

    // =========================================
    // STEP 1: Server Setup - Generate Issuer Keys
    // =========================================
    println!("1. Server: Generating issuer keys...");

    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    println!("   - Key ID: {}", hex::encode(signing_keys.key_id()));
    println!("   - Ed25519 public key: {} bytes", 32);
    println!("   - ML-DSA-65 public key: {} bytes", signing_keys.mldsa.public_key_bytes().len());
    println!();

    // =========================================
    // STEP 2: Client Setup - Generate Ephemeral Keypair
    // =========================================
    println!("2. Client: Generating ephemeral keypair for proof of possession...");

    let (proof_generator, client_public_key) = ProofGenerator::generate();
    println!("   - Client public key: {}", hex::encode(&client_public_key));
    println!();

    // =========================================
    // STEP 3: Server Creates Token
    // =========================================
    println!("3. Server: Creating access token bound to client key...");

    let token = QTokenBuilder::access_token()
        .subject(b"user-12345".to_vec())
        .issuer("https://auth.example.com")
        .audience("https://api.example.com")
        .policy_ref("urn:qauth:policy:api-access")
        .client_key(&client_public_key)
        .device_key(b"device-attestation-public-key")
        .validity_seconds(3600)
        .claim("email", serde_json::json!("alice@example.com"))
        .claim("roles", serde_json::json!(["user", "premium"]))
        .claim("department", serde_json::json!("engineering"))
        .build(&signing_keys, &encryption_key)?;

    let token_string = token.encode();
    println!("   - Token created successfully");
    println!("   - Token size: {} bytes ({} chars base64)", token.to_bytes().len(), token_string.len());
    println!();

    // =========================================
    // STEP 4: Client Creates Proof of Possession
    // =========================================
    println!("4. Client: Creating proof of possession for API request...");

    let request_method = "POST";
    let request_uri = "/api/projects/123/files";
    let request_body = b"file content here";

    let proof = proof_generator.create_proof(
        request_method,
        request_uri,
        Some(request_body),
        token_string.as_bytes(),
    );

    let proof_string = proof.encode()?;
    println!("   - Method: {}", request_method);
    println!("   - URI: {}", request_uri);
    println!("   - Proof created: {} bytes", proof_string.len());
    println!();

    // =========================================
    // STEP 5: Server Validates Token
    // =========================================
    println!("5. Server: Validating token...");

    // Create verifying keys from public keys
    let verifying_keys = IssuerVerifyingKeys::from_bytes(
        &signing_keys.ed25519.public_key_bytes(),
        &signing_keys.mldsa.public_key_bytes(),
    )?;

    // Decode and verify token
    let decoded_token = QToken::decode(&token_string)?;

    // Verify dual signatures
    decoded_token.verify_signatures(&verifying_keys)?;
    println!("   - Dual signatures verified (Ed25519 + ML-DSA-65)");

    // Decrypt payload
    let payload = decoded_token.decrypt_payload(&encryption_key)?;
    println!("   - Payload decrypted successfully");
    println!("   - Subject: {}", String::from_utf8_lossy(&payload.sub));
    println!("   - Issuer: {}", payload.iss);
    println!("   - Audience: {:?}", payload.aud);
    println!("   - Policy: {}", payload.pol);
    println!("   - Custom claims: {:?}", payload.cst);

    // Check expiration
    if payload.is_expired() {
        println!("   - ERROR: Token is expired!");
        return Ok(());
    }
    println!("   - Token not expired");
    println!();

    // =========================================
    // STEP 6: Server Validates Proof of Possession
    // =========================================
    println!("6. Server: Validating proof of possession...");

    let proof_validator = ProofValidator::new(&client_public_key)?;
    let decoded_proof = qauth::proof::ProofOfPossession::decode(&proof_string)?;

    proof_validator.validate(
        &decoded_proof,
        request_method,
        request_uri,
        Some(request_body),
        token_string.as_bytes(),
    )?;

    println!("   - Proof of possession verified");
    println!("   - Request is authenticated and bound to token holder");
    println!();

    // =========================================
    // STEP 7: Check Revocation Status
    // =========================================
    println!("7. Server: Checking revocation status...");

    let revocation_store = Arc::new(InMemoryRevocationStore::new());
    let revocation_checker = RevocationChecker::new(revocation_store);

    let is_revoked = revocation_checker.is_revoked(&payload.rid)?;
    println!("   - Revocation ID: {}", hex::encode(&payload.rid));
    println!("   - Is revoked: {}", is_revoked);
    println!();

    // =========================================
    // STEP 8: Policy-Based Authorization
    // =========================================
    println!("8. Server: Evaluating authorization policy...");

    let mut policy_engine = PolicyEngine::new();

    // Load policy
    let policy_json = r#"
    {
        "id": "urn:qauth:policy:api-access",
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
                "resources": ["projects/*/files"],
                "actions": ["write", "create"],
                "conditions": {
                    "custom": {
                        "department": {"eq": "engineering"}
                    }
                },
                "priority": 200
            },
            {
                "id": "premium-features",
                "effect": "allow",
                "resources": ["premium/**"],
                "actions": ["*"],
                "conditions": {
                    "custom": {
                        "roles": {"contains": "premium"}
                    }
                },
                "priority": 150
            }
        ]
    }
    "#;

    policy_engine.load_policy_json(policy_json)?;

    // Build evaluation context from token claims
    let mut subject_attrs = std::collections::HashMap::new();
    if let Some(dept) = payload.cst.get("department") {
        subject_attrs.insert("department".to_string(), dept.clone());
    }
    if let Some(roles) = payload.cst.get("roles") {
        subject_attrs.insert("roles".to_string(), roles.clone());
    }

    let context = EvaluationContext {
        subject: qauth::policy::SubjectContext {
            id: String::from_utf8_lossy(&payload.sub).to_string(),
            email: payload.cst.get("email").and_then(|v| v.as_str()).map(String::from),
            attributes: subject_attrs,
            ..Default::default()
        },
        resource: qauth::policy::ResourceContext {
            path: "projects/123/files".to_string(),
            ..Default::default()
        },
        request: qauth::policy::RequestContext {
            action: "write".to_string(),
            method: Some("POST".to_string()),
            ..Default::default()
        },
        ..Default::default()
    };

    let result = policy_engine.evaluate("urn:qauth:policy:api-access", &context)?;

    println!("   - Resource: {}", context.resource.path);
    println!("   - Action: {}", context.request.action);
    println!("   - Decision: {:?}", result.effect);
    println!("   - Matched rule: {:?}", result.matched_rule);
    println!("   - Reason: {}", result.reason);
    println!();

    if result.effect == Effect::Allow {
        println!("=== ACCESS GRANTED ===");
        println!("User '{}' is authorized to {} on '{}'",
            String::from_utf8_lossy(&payload.sub),
            context.request.action,
            context.resource.path
        );
    } else {
        println!("=== ACCESS DENIED ===");
        println!("Reason: {}", result.reason);
    }

    println!();
    println!("=== Example Complete ===");

    Ok(())
}
