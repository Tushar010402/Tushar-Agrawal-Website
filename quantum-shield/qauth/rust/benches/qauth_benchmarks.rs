//! QAuth Performance Benchmarks
//!
//! Run with: cargo bench

use criterion::{black_box, criterion_group, criterion_main, Criterion, BenchmarkId};
use qauth::{
    crypto::{EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys},
    policy::{EvaluationContext, PolicyEngine, ResourceContext, RequestContext, SubjectContext},
    proof::{ProofGenerator, ProofValidator},
    token::{QToken, QTokenBuilder},
};

/// Benchmark issuer key generation
fn bench_key_generation(c: &mut Criterion) {
    let mut group = c.benchmark_group("key_generation");

    group.bench_function("issuer_signing_keys", |b| {
        b.iter(|| {
            black_box(IssuerSigningKeys::generate())
        })
    });

    group.bench_function("encryption_key", |b| {
        b.iter(|| {
            black_box(EncryptionKey::generate())
        })
    });

    group.bench_function("proof_generator", |b| {
        b.iter(|| {
            black_box(ProofGenerator::generate())
        })
    });

    group.finish();
}

/// Benchmark token creation with various payload sizes
fn bench_token_creation(c: &mut Criterion) {
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let mut group = c.benchmark_group("token_creation");

    // Minimal token
    group.bench_function("minimal_token", |b| {
        b.iter(|| {
            let token = QTokenBuilder::access_token()
                .subject(b"user-123".to_vec())
                .issuer("https://auth.example.com")
                .audience("https://api.example.com")
                .policy_ref("urn:qauth:policy:default")
                .validity_seconds(3600)
                .build(&signing_keys, &encryption_key)
                .unwrap();
            black_box(token)
        })
    });

    // Token with custom claims
    group.bench_function("token_with_claims", |b| {
        b.iter(|| {
            let token = QTokenBuilder::access_token()
                .subject(b"user-123".to_vec())
                .issuer("https://auth.example.com")
                .audience("https://api.example.com")
                .policy_ref("urn:qauth:policy:default")
                .validity_seconds(3600)
                .claim("email", serde_json::json!("user@example.com"))
                .claim("roles", serde_json::json!(["user", "admin", "premium"]))
                .claim("department", serde_json::json!("engineering"))
                .claim("level", serde_json::json!(5))
                .build(&signing_keys, &encryption_key)
                .unwrap();
            black_box(token)
        })
    });

    // Token with client binding
    group.bench_function("bound_token", |b| {
        let (_, client_public_key) = ProofGenerator::generate();
        b.iter(|| {
            let token = QTokenBuilder::access_token()
                .subject(b"user-123".to_vec())
                .issuer("https://auth.example.com")
                .audience("https://api.example.com")
                .policy_ref("urn:qauth:policy:default")
                .client_key(&client_public_key)
                .device_key(b"device-key-hash")
                .validity_seconds(3600)
                .build(&signing_keys, &encryption_key)
                .unwrap();
            black_box(token)
        })
    });

    group.finish();
}

/// Benchmark token validation
fn bench_token_validation(c: &mut Criterion) {
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let token = QTokenBuilder::access_token()
        .subject(b"user-123".to_vec())
        .issuer("https://auth.example.com")
        .audience("https://api.example.com")
        .policy_ref("urn:qauth:policy:default")
        .validity_seconds(3600)
        .claim("email", serde_json::json!("user@example.com"))
        .build(&signing_keys, &encryption_key)
        .unwrap();

    let token_string = token.encode();

    let verifying_keys = IssuerVerifyingKeys::from_bytes(
        &signing_keys.ed25519.public_key_bytes(),
        &signing_keys.mldsa.public_key_bytes(),
    ).unwrap();

    let mut group = c.benchmark_group("token_validation");

    // Decode only
    group.bench_function("decode", |b| {
        b.iter(|| {
            let decoded = QToken::decode(&token_string).unwrap();
            black_box(decoded)
        })
    });

    // Signature verification (both Ed25519 + ML-DSA-65)
    group.bench_function("verify_signatures", |b| {
        let decoded = QToken::decode(&token_string).unwrap();
        b.iter(|| {
            decoded.verify_signatures(&verifying_keys).unwrap();
        })
    });

    // Decrypt payload
    group.bench_function("decrypt_payload", |b| {
        let decoded = QToken::decode(&token_string).unwrap();
        b.iter(|| {
            let payload = decoded.decrypt_payload(&encryption_key).unwrap();
            black_box(payload)
        })
    });

    // Full validation (decode + verify + decrypt)
    group.bench_function("full_validation", |b| {
        b.iter(|| {
            let decoded = QToken::decode(&token_string).unwrap();
            decoded.verify_signatures(&verifying_keys).unwrap();
            let payload = decoded.decrypt_payload(&encryption_key).unwrap();
            black_box(payload)
        })
    });

    group.finish();
}

/// Benchmark proof of possession
fn bench_proof_of_possession(c: &mut Criterion) {
    let (proof_generator, client_public_key) = ProofGenerator::generate();
    let token = b"eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.sig";

    let mut group = c.benchmark_group("proof_of_possession");

    // Create proof (no body)
    group.bench_function("create_proof_no_body", |b| {
        b.iter(|| {
            let proof = proof_generator.create_proof(
                "GET",
                "/api/resource",
                None,
                token,
            );
            black_box(proof)
        })
    });

    // Create proof with body
    let body = b"request body content here for testing purposes";
    group.bench_function("create_proof_with_body", |b| {
        b.iter(|| {
            let proof = proof_generator.create_proof(
                "POST",
                "/api/resource",
                Some(body),
                token,
            );
            black_box(proof)
        })
    });

    // Validate proof
    let proof = proof_generator.create_proof("POST", "/api/resource", Some(body), token);
    let proof_validator = ProofValidator::new(&client_public_key).unwrap();
    let decoded_proof = qauth::proof::ProofOfPossession::decode(&proof.encode().unwrap()).unwrap();

    group.bench_function("validate_proof", |b| {
        b.iter(|| {
            proof_validator.validate(
                &decoded_proof,
                "POST",
                "/api/resource",
                Some(body),
                token,
            ).unwrap();
        })
    });

    group.finish();
}

/// Benchmark policy evaluation
fn bench_policy_evaluation(c: &mut Criterion) {
    let mut engine = PolicyEngine::new();

    // Load a policy with multiple rules
    let policy_json = r#"
    {
        "id": "urn:qauth:policy:api-access",
        "version": "2026-01-30",
        "issuer": "https://auth.example.com",
        "rules": [
            {
                "id": "read-public",
                "effect": "allow",
                "resources": ["public/*"],
                "actions": ["read"],
                "priority": 50
            },
            {
                "id": "read-projects",
                "effect": "allow",
                "resources": ["projects/*"],
                "actions": ["read", "list"],
                "priority": 100
            },
            {
                "id": "write-projects",
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
                "id": "admin-access",
                "effect": "allow",
                "resources": ["admin/**"],
                "actions": ["*"],
                "conditions": {
                    "custom": {
                        "roles": {"contains": "admin"}
                    }
                },
                "priority": 300
            }
        ]
    }
    "#;

    engine.load_policy_json(policy_json).unwrap();

    let mut group = c.benchmark_group("policy_evaluation");

    // Simple match (first rule)
    group.bench_function("simple_match", |b| {
        let context = EvaluationContext {
            subject: SubjectContext {
                id: "user-123".to_string(),
                ..Default::default()
            },
            resource: ResourceContext {
                path: "public/docs".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        b.iter(|| {
            let result = engine.evaluate("urn:qauth:policy:api-access", &context).unwrap();
            black_box(result)
        })
    });

    // Match with conditions
    group.bench_function("match_with_conditions", |b| {
        let mut attrs = std::collections::HashMap::new();
        attrs.insert("department".to_string(), serde_json::json!("engineering"));

        let context = EvaluationContext {
            subject: SubjectContext {
                id: "user-123".to_string(),
                attributes: attrs,
                ..Default::default()
            },
            resource: ResourceContext {
                path: "projects/456/files".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "write".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        b.iter(|| {
            let result = engine.evaluate("urn:qauth:policy:api-access", &context).unwrap();
            black_box(result)
        })
    });

    // No match (default deny)
    group.bench_function("no_match_deny", |b| {
        let context = EvaluationContext {
            subject: SubjectContext {
                id: "user-123".to_string(),
                ..Default::default()
            },
            resource: ResourceContext {
                path: "secret/data".to_string(),
                ..Default::default()
            },
            request: RequestContext {
                action: "read".to_string(),
                ..Default::default()
            },
            ..Default::default()
        };

        b.iter(|| {
            let result = engine.evaluate("urn:qauth:policy:api-access", &context).unwrap();
            black_box(result)
        })
    });

    group.finish();
}

/// Benchmark token encoding/decoding throughput
fn bench_throughput(c: &mut Criterion) {
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let token = QTokenBuilder::access_token()
        .subject(b"user-123".to_vec())
        .issuer("https://auth.example.com")
        .audience("https://api.example.com")
        .policy_ref("urn:qauth:policy:default")
        .validity_seconds(3600)
        .build(&signing_keys, &encryption_key)
        .unwrap();

    let token_bytes = token.to_bytes();
    let token_string = token.encode();

    let mut group = c.benchmark_group("throughput");

    group.throughput(criterion::Throughput::Bytes(token_bytes.len() as u64));

    group.bench_function("encode_base64", |b| {
        b.iter(|| {
            let encoded = base64::Engine::encode(
                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                &token_bytes,
            );
            black_box(encoded)
        })
    });

    group.bench_function("decode_base64", |b| {
        b.iter(|| {
            let decoded = base64::Engine::decode(
                &base64::engine::general_purpose::URL_SAFE_NO_PAD,
                &token_string,
            ).unwrap();
            black_box(decoded)
        })
    });

    group.finish();
}

/// Benchmark comparison of different token sizes
fn bench_token_sizes(c: &mut Criterion) {
    let signing_keys = IssuerSigningKeys::generate();
    let encryption_key = EncryptionKey::generate();

    let mut group = c.benchmark_group("token_sizes");

    // Different claim sizes
    for num_claims in [0, 5, 10, 20].iter() {
        group.bench_with_input(
            BenchmarkId::new("create_with_claims", num_claims),
            num_claims,
            |b, &n| {
                b.iter(|| {
                    let mut builder = QTokenBuilder::access_token()
                        .subject(b"user-123".to_vec())
                        .issuer("https://auth.example.com")
                        .audience("https://api.example.com")
                        .policy_ref("urn:qauth:policy:default")
                        .validity_seconds(3600);

                    for i in 0..n {
                        builder = builder.claim(
                            &format!("claim_{}", i),
                            serde_json::json!(format!("value_{}", i)),
                        );
                    }

                    let token = builder.build(&signing_keys, &encryption_key).unwrap();
                    black_box(token)
                })
            },
        );
    }

    group.finish();
}

criterion_group!(
    benches,
    bench_key_generation,
    bench_token_creation,
    bench_token_validation,
    bench_proof_of_possession,
    bench_policy_evaluation,
    bench_throughput,
    bench_token_sizes,
);

criterion_main!(benches);
