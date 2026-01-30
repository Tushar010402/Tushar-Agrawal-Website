//! WASM bindings for QuantumAuth
//!
//! Provides JavaScript/TypeScript bindings for QAuth functionality.

use crate::crypto::{EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys};
use crate::error::QAuthError;
use crate::policy::{Effect, EvaluationContext, PolicyEngine};
use crate::proof::{ProofGenerator, ProofOfPossession, ProofValidator};
use crate::token::{QToken, QTokenBuilder, TokenType};
use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// QAuth issuer keys for token signing
#[wasm_bindgen]
pub struct WasmIssuerKeys {
    signing_keys: IssuerSigningKeys,
    encryption_key: EncryptionKey,
}

#[wasm_bindgen]
impl WasmIssuerKeys {
    /// Generate new issuer keys
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            signing_keys: IssuerSigningKeys::generate(),
            encryption_key: EncryptionKey::generate(),
        }
    }

    /// Get the key ID (for identifying this issuer)
    #[wasm_bindgen(getter)]
    pub fn key_id(&self) -> Vec<u8> {
        self.signing_keys.key_id().to_vec()
    }

    /// Get the Ed25519 public key
    #[wasm_bindgen(getter)]
    pub fn ed25519_public_key(&self) -> Vec<u8> {
        self.signing_keys.ed25519.public_key_bytes().to_vec()
    }

    /// Get the ML-DSA public key
    #[wasm_bindgen(getter)]
    pub fn mldsa_public_key(&self) -> Vec<u8> {
        self.signing_keys.mldsa.public_key_bytes()
    }

    /// Get the encryption key (for token decryption)
    #[wasm_bindgen(getter)]
    pub fn encryption_key(&self) -> Vec<u8> {
        self.encryption_key.to_bytes().to_vec()
    }
}

impl Default for WasmIssuerKeys {
    fn default() -> Self {
        Self::new()
    }
}

/// Client proof generator for API requests
#[wasm_bindgen]
pub struct WasmProofGenerator {
    generator: ProofGenerator,
}

#[wasm_bindgen]
impl WasmProofGenerator {
    /// Generate a new client keypair
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let (generator, _) = ProofGenerator::generate();
        Self { generator }
    }

    /// Get the client's public key
    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> {
        self.generator.public_key().to_vec()
    }

    /// Create a proof of possession for an API request
    #[wasm_bindgen]
    pub fn create_proof(
        &self,
        method: &str,
        uri: &str,
        body: Option<Vec<u8>>,
        token: &str,
    ) -> Result<String, JsError> {
        let body_ref = body.as_deref();
        let proof = self.generator.create_proof(method, uri, body_ref, token.as_bytes());
        proof.encode().map_err(|e| JsError::new(&e.to_string()))
    }
}

impl Default for WasmProofGenerator {
    fn default() -> Self {
        Self::new()
    }
}

/// Token builder for creating QTokens
#[wasm_bindgen]
pub struct WasmTokenBuilder {
    subject: Vec<u8>,
    issuer: String,
    audiences: Vec<String>,
    policy_ref: String,
    validity_seconds: i64,
    client_key: Vec<u8>,
    device_key: Vec<u8>,
    claims: String, // JSON string
}

#[wasm_bindgen]
impl WasmTokenBuilder {
    /// Create a new token builder for access tokens
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            subject: Vec::new(),
            issuer: String::new(),
            audiences: Vec::new(),
            policy_ref: String::new(),
            validity_seconds: 3600,
            client_key: Vec::new(),
            device_key: Vec::new(),
            claims: "{}".to_string(),
        }
    }

    /// Set the subject (user ID)
    #[wasm_bindgen]
    pub fn subject(mut self, sub: &[u8]) -> Self {
        self.subject = sub.to_vec();
        self
    }

    /// Set the issuer
    #[wasm_bindgen]
    pub fn issuer(mut self, iss: &str) -> Self {
        self.issuer = iss.to_string();
        self
    }

    /// Add an audience
    #[wasm_bindgen]
    pub fn audience(mut self, aud: &str) -> Self {
        self.audiences.push(aud.to_string());
        self
    }

    /// Set the policy reference
    #[wasm_bindgen]
    pub fn policy_ref(mut self, pol: &str) -> Self {
        self.policy_ref = pol.to_string();
        self
    }

    /// Set validity in seconds
    #[wasm_bindgen]
    pub fn validity_seconds(mut self, seconds: i64) -> Self {
        self.validity_seconds = seconds;
        self
    }

    /// Set client public key
    #[wasm_bindgen]
    pub fn client_key(mut self, key: &[u8]) -> Self {
        self.client_key = key.to_vec();
        self
    }

    /// Set device key
    #[wasm_bindgen]
    pub fn device_key(mut self, key: &[u8]) -> Self {
        self.device_key = key.to_vec();
        self
    }

    /// Set custom claims as JSON string
    #[wasm_bindgen]
    pub fn claims(mut self, claims_json: &str) -> Self {
        self.claims = claims_json.to_string();
        self
    }

    /// Build the token
    #[wasm_bindgen]
    pub fn build(&self, issuer_keys: &WasmIssuerKeys) -> Result<String, JsError> {
        let claims: std::collections::HashMap<String, serde_json::Value> =
            serde_json::from_str(&self.claims).map_err(|e| JsError::new(&e.to_string()))?;

        let mut builder = QTokenBuilder::access_token()
            .subject(self.subject.clone())
            .issuer(&self.issuer)
            .policy_ref(&self.policy_ref)
            .validity_seconds(self.validity_seconds);

        for aud in &self.audiences {
            builder = builder.audience(aud);
        }

        if !self.client_key.is_empty() {
            builder = builder.client_key(&self.client_key);
        }

        if !self.device_key.is_empty() {
            builder = builder.device_key(&self.device_key);
        }

        for (key, value) in claims {
            builder = builder.claim(key, value);
        }

        let token = builder
            .build(&issuer_keys.signing_keys, &issuer_keys.encryption_key)
            .map_err(|e| JsError::new(&e.to_string()))?;

        Ok(token.encode())
    }
}

impl Default for WasmTokenBuilder {
    fn default() -> Self {
        Self::new()
    }
}

/// Token validator
#[wasm_bindgen]
pub struct WasmTokenValidator {
    ed25519_public_key: Vec<u8>,
    mldsa_public_key: Vec<u8>,
    encryption_key: Vec<u8>,
    expected_issuer: String,
    expected_audience: String,
}

#[wasm_bindgen]
impl WasmTokenValidator {
    /// Create a new token validator
    #[wasm_bindgen(constructor)]
    pub fn new(
        ed25519_public_key: &[u8],
        mldsa_public_key: &[u8],
        encryption_key: &[u8],
        expected_issuer: &str,
        expected_audience: &str,
    ) -> Self {
        Self {
            ed25519_public_key: ed25519_public_key.to_vec(),
            mldsa_public_key: mldsa_public_key.to_vec(),
            encryption_key: encryption_key.to_vec(),
            expected_issuer: expected_issuer.to_string(),
            expected_audience: expected_audience.to_string(),
        }
    }

    /// Validate a token string and return the payload as JSON
    #[wasm_bindgen]
    pub fn validate(&self, token_string: &str) -> Result<String, JsError> {
        // Parse public keys
        let ed25519_pk: [u8; 32] = self
            .ed25519_public_key
            .as_slice()
            .try_into()
            .map_err(|_| JsError::new("Invalid Ed25519 public key size"))?;

        let verifying_keys = IssuerVerifyingKeys::from_bytes(&ed25519_pk, &self.mldsa_public_key)
            .map_err(|e| JsError::new(&e.to_string()))?;

        let enc_key: [u8; 32] = self
            .encryption_key
            .as_slice()
            .try_into()
            .map_err(|_| JsError::new("Invalid encryption key size"))?;

        let encryption_key = EncryptionKey::from_bytes(enc_key);

        // Decode token
        let token = QToken::decode(token_string).map_err(|e| JsError::new(&e.to_string()))?;

        // Verify signatures
        token
            .verify_signatures(&verifying_keys)
            .map_err(|e| JsError::new(&e.to_string()))?;

        // Decrypt payload
        let payload = token
            .decrypt_payload(&encryption_key)
            .map_err(|e| JsError::new(&e.to_string()))?;

        // Check issuer
        if payload.iss != self.expected_issuer {
            return Err(JsError::new("Invalid issuer"));
        }

        // Check audience
        if !payload.aud.contains(&self.expected_audience) {
            return Err(JsError::new("Invalid audience"));
        }

        // Check expiration
        if payload.is_expired() {
            return Err(JsError::new("Token expired"));
        }

        // Return payload as JSON
        let payload_json = serde_json::json!({
            "sub": hex::encode(&payload.sub),
            "iss": payload.iss,
            "aud": payload.aud,
            "exp": payload.exp,
            "iat": payload.iat,
            "nbf": payload.nbf,
            "jti": hex::encode(&payload.jti),
            "rid": hex::encode(&payload.rid),
            "pol": payload.pol,
            "cst": payload.cst,
        });

        Ok(payload_json.to_string())
    }
}

/// Proof validator for API requests
#[wasm_bindgen]
pub struct WasmProofValidator {
    client_public_key: Vec<u8>,
}

#[wasm_bindgen]
impl WasmProofValidator {
    /// Create a new proof validator
    #[wasm_bindgen(constructor)]
    pub fn new(client_public_key: &[u8]) -> Self {
        Self {
            client_public_key: client_public_key.to_vec(),
        }
    }

    /// Validate a proof of possession
    #[wasm_bindgen]
    pub fn validate(
        &self,
        proof_string: &str,
        method: &str,
        uri: &str,
        body: Option<Vec<u8>>,
        token: &str,
    ) -> Result<bool, JsError> {
        let pk: [u8; 32] = self
            .client_public_key
            .as_slice()
            .try_into()
            .map_err(|_| JsError::new("Invalid public key size"))?;

        let validator = ProofValidator::new(&pk).map_err(|e| JsError::new(&e.to_string()))?;

        let proof =
            ProofOfPossession::decode(proof_string).map_err(|e| JsError::new(&e.to_string()))?;

        let body_ref = body.as_deref();

        validator
            .validate(&proof, method, uri, body_ref, token.as_bytes())
            .map_err(|e| JsError::new(&e.to_string()))?;

        Ok(true)
    }
}

/// Policy engine for authorization decisions
#[wasm_bindgen]
pub struct WasmPolicyEngine {
    engine: PolicyEngine,
}

#[wasm_bindgen]
impl WasmPolicyEngine {
    /// Create a new policy engine
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            engine: PolicyEngine::new(),
        }
    }

    /// Load a policy from JSON
    #[wasm_bindgen]
    pub fn load_policy(&mut self, policy_json: &str) -> Result<(), JsError> {
        self.engine
            .load_policy_json(policy_json)
            .map_err(|e| JsError::new(&e.to_string()))
    }

    /// Evaluate a policy
    #[wasm_bindgen]
    pub fn evaluate(&self, policy_id: &str, context_json: &str) -> Result<String, JsError> {
        // Parse context from JSON
        let context_value: serde_json::Value =
            serde_json::from_str(context_json).map_err(|e| JsError::new(&e.to_string()))?;

        // Build evaluation context
        let mut context = EvaluationContext::default();

        if let Some(subject) = context_value.get("subject") {
            if let Some(id) = subject.get("id").and_then(|v| v.as_str()) {
                context.subject.id = id.to_string();
            }
            if let Some(roles) = subject.get("roles").and_then(|v| v.as_array()) {
                context.subject.roles = roles
                    .iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect();
            }
            if let Some(attrs) = subject.get("attributes").and_then(|v| v.as_object()) {
                for (k, v) in attrs {
                    context.subject.attributes.insert(k.clone(), v.clone());
                }
            }
        }

        if let Some(resource) = context_value.get("resource") {
            if let Some(path) = resource.get("path").and_then(|v| v.as_str()) {
                context.resource.path = path.to_string();
            }
            if let Some(owner) = resource.get("owner").and_then(|v| v.as_str()) {
                context.resource.owner = Some(owner.to_string());
            }
        }

        if let Some(request) = context_value.get("request") {
            if let Some(action) = request.get("action").and_then(|v| v.as_str()) {
                context.request.action = action.to_string();
            }
            if let Some(method) = request.get("method").and_then(|v| v.as_str()) {
                context.request.method = Some(method.to_string());
            }
            if let Some(ip) = request.get("ip").and_then(|v| v.as_str()) {
                context.request.ip = Some(ip.to_string());
            }
            if let Some(mfa) = request.get("mfa_verified").and_then(|v| v.as_bool()) {
                context.request.mfa_verified = mfa;
            }
        }

        // Evaluate
        let result = self
            .engine
            .evaluate(policy_id, &context)
            .map_err(|e| JsError::new(&e.to_string()))?;

        // Return result as JSON
        let result_json = serde_json::json!({
            "effect": match result.effect {
                Effect::Allow => "allow",
                Effect::Deny => "deny",
            },
            "matched_rule": result.matched_rule,
            "reason": result.reason,
        });

        Ok(result_json.to_string())
    }
}

impl Default for WasmPolicyEngine {
    fn default() -> Self {
        Self::new()
    }
}

/// Get QAuth version
#[wasm_bindgen]
pub fn qauth_version() -> String {
    crate::VERSION.to_string()
}

/// Get QAuth protocol version
#[wasm_bindgen]
pub fn qauth_protocol_version() -> String {
    crate::PROTOCOL_VERSION.to_string()
}
