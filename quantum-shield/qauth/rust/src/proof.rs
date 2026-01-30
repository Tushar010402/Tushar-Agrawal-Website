//! Proof of Possession implementation
//!
//! Implements mandatory request signing for QAuth tokens.

use crate::crypto::{sha256, sha256_multi, Ed25519KeyPair};
use crate::error::{QAuthError, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::Utc;
use ed25519_dalek::{Signature, Signer, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::Mutex;

/// Maximum age of a proof in seconds
pub const PROOF_MAX_AGE_SECONDS: i64 = 60;

/// Size of the nonce in bytes
pub const NONCE_SIZE: usize = 16;

/// Proof of possession for API requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofOfPossession {
    /// Request timestamp (Unix milliseconds)
    pub timestamp: u64,
    /// Unique nonce for replay protection
    #[serde(with = "hex_serde")]
    pub nonce: [u8; NONCE_SIZE],
    /// HTTP method
    pub method: String,
    /// Request URI (path + query)
    pub uri: String,
    /// SHA-256 of request body (or zeros for GET)
    #[serde(with = "hex_serde")]
    pub body_hash: [u8; 32],
    /// SHA-256 of the QToken
    #[serde(with = "hex_serde")]
    pub token_hash: [u8; 32],
    /// Ed25519 signature
    #[serde(with = "hex_serde")]
    pub signature: [u8; 64],
}

mod hex_serde {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S, const N: usize>(bytes: &[u8; N], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&hex::encode(bytes))
    }

    pub fn deserialize<'de, D, const N: usize>(deserializer: D) -> Result<[u8; N], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = hex::decode(s).map_err(serde::de::Error::custom)?;
        bytes.try_into().map_err(|_| serde::de::Error::custom("Invalid length"))
    }
}

impl ProofOfPossession {
    /// Create a new proof of possession
    pub fn create(
        method: &str,
        uri: &str,
        body: Option<&[u8]>,
        token_bytes: &[u8],
        signing_key: &Ed25519KeyPair,
    ) -> Self {
        let timestamp = Utc::now().timestamp_millis() as u64;
        let nonce: [u8; NONCE_SIZE] = rand::random();
        let body_hash = body.map(sha256).unwrap_or([0u8; 32]);
        let token_hash = sha256(token_bytes);

        // Create message to sign
        let message = Self::create_signing_message(
            timestamp,
            &nonce,
            method,
            uri,
            &body_hash,
            &token_hash,
        );

        // Sign the message
        let signature = signing_key.sign(&message);

        Self {
            timestamp,
            nonce,
            method: method.to_string(),
            uri: uri.to_string(),
            body_hash,
            token_hash,
            signature,
        }
    }

    /// Create the message to be signed
    fn create_signing_message(
        timestamp: u64,
        nonce: &[u8; NONCE_SIZE],
        method: &str,
        uri: &str,
        body_hash: &[u8; 32],
        token_hash: &[u8; 32],
    ) -> Vec<u8> {
        let mut message = Vec::new();
        message.extend_from_slice(&timestamp.to_be_bytes());
        message.extend_from_slice(nonce);
        message.extend_from_slice(method.as_bytes());
        message.extend_from_slice(uri.as_bytes());
        message.extend_from_slice(body_hash);
        message.extend_from_slice(token_hash);
        message
    }

    /// Serialize to JSON
    pub fn to_json(&self) -> Result<String> {
        serde_json::to_string(self).map_err(|e| QAuthError::SerializationError(e.to_string()))
    }

    /// Deserialize from JSON
    pub fn from_json(json: &str) -> Result<Self> {
        serde_json::from_str(json).map_err(|e| QAuthError::SerializationError(e.to_string()))
    }

    /// Encode to base64url for HTTP header
    pub fn encode(&self) -> Result<String> {
        let json = self.to_json()?;
        Ok(URL_SAFE_NO_PAD.encode(json.as_bytes()))
    }

    /// Decode from base64url HTTP header
    pub fn decode(s: &str) -> Result<Self> {
        let json_bytes = URL_SAFE_NO_PAD
            .decode(s)
            .map_err(|e| QAuthError::SerializationError(e.to_string()))?;
        let json = String::from_utf8(json_bytes)
            .map_err(|e| QAuthError::SerializationError(e.to_string()))?;
        Self::from_json(&json)
    }
}

/// Proof validator with replay protection
pub struct ProofValidator {
    /// Client's Ed25519 public key
    client_public_key: VerifyingKey,
    /// Max allowed clock skew in seconds
    max_clock_skew_seconds: i64,
    /// Used nonces for replay protection
    used_nonces: Mutex<NonceCache>,
}

/// Simple time-windowed nonce cache
struct NonceCache {
    nonces: HashSet<[u8; NONCE_SIZE]>,
    window_start: i64,
    window_size_seconds: i64,
}

impl NonceCache {
    fn new(window_size_seconds: i64) -> Self {
        Self {
            nonces: HashSet::new(),
            window_start: Utc::now().timestamp(),
            window_size_seconds,
        }
    }

    /// Check if nonce was already used, and mark it as used
    fn check_and_mark(&mut self, nonce: &[u8; NONCE_SIZE]) -> bool {
        let now = Utc::now().timestamp();

        // Rotate window if needed
        if now - self.window_start > self.window_size_seconds {
            self.nonces.clear();
            self.window_start = now;
        }

        // Check and insert
        self.nonces.insert(*nonce)
    }
}

impl ProofValidator {
    /// Create a new proof validator
    pub fn new(client_public_key_bytes: &[u8; 32]) -> Result<Self> {
        let client_public_key = VerifyingKey::from_bytes(client_public_key_bytes)
            .map_err(|_| QAuthError::InvalidInput("Invalid public key".into()))?;

        Ok(Self {
            client_public_key,
            max_clock_skew_seconds: PROOF_MAX_AGE_SECONDS,
            used_nonces: Mutex::new(NonceCache::new(PROOF_MAX_AGE_SECONDS * 2)),
        })
    }

    /// Set maximum allowed clock skew
    pub fn with_max_clock_skew(mut self, seconds: i64) -> Self {
        self.max_clock_skew_seconds = seconds;
        self
    }

    /// Validate a proof of possession
    pub fn validate(
        &self,
        proof: &ProofOfPossession,
        expected_method: &str,
        expected_uri: &str,
        body: Option<&[u8]>,
        token_bytes: &[u8],
    ) -> Result<()> {
        // 1. Check timestamp (within allowed window)
        let now_ms = Utc::now().timestamp_millis() as u64;
        let proof_age_ms = now_ms.saturating_sub(proof.timestamp);
        let max_age_ms = (self.max_clock_skew_seconds * 1000) as u64;

        if proof_age_ms > max_age_ms {
            return Err(QAuthError::InvalidProof);
        }

        // Also check for future timestamps (clock skew)
        if proof.timestamp > now_ms + max_age_ms {
            return Err(QAuthError::InvalidProof);
        }

        // 2. Check nonce for replay protection
        {
            let mut cache = self.used_nonces.lock().unwrap();
            if !cache.check_and_mark(&proof.nonce) {
                return Err(QAuthError::InvalidProof); // Nonce reuse
            }
        }

        // 3. Verify method matches
        if proof.method != expected_method {
            return Err(QAuthError::InvalidProof);
        }

        // 4. Verify URI matches
        if proof.uri != expected_uri {
            return Err(QAuthError::InvalidProof);
        }

        // 5. Verify body hash
        let expected_body_hash = body.map(sha256).unwrap_or([0u8; 32]);
        if proof.body_hash != expected_body_hash {
            return Err(QAuthError::InvalidProof);
        }

        // 6. Verify token hash
        let expected_token_hash = sha256(token_bytes);
        if proof.token_hash != expected_token_hash {
            return Err(QAuthError::InvalidProof);
        }

        // 7. Verify signature
        let message = ProofOfPossession::create_signing_message(
            proof.timestamp,
            &proof.nonce,
            &proof.method,
            &proof.uri,
            &proof.body_hash,
            &proof.token_hash,
        );

        let signature = Signature::from_bytes(&proof.signature);
        self.client_public_key
            .verify(&message, &signature)
            .map_err(|_| QAuthError::InvalidProof)?;

        Ok(())
    }
}

/// Client-side proof generator
pub struct ProofGenerator {
    signing_key: Ed25519KeyPair,
}

impl ProofGenerator {
    /// Create a new proof generator from a private key
    pub fn new(private_key: &[u8; 32]) -> Result<Self> {
        let signing_key = Ed25519KeyPair::from_bytes(private_key)?;
        Ok(Self { signing_key })
    }

    /// Generate a new keypair and return the proof generator
    pub fn generate() -> (Self, [u8; 32]) {
        let signing_key = Ed25519KeyPair::generate();
        let public_key = signing_key.public_key_bytes();
        (Self { signing_key }, public_key)
    }

    /// Get the public key
    pub fn public_key(&self) -> [u8; 32] {
        self.signing_key.public_key_bytes()
    }

    /// Create a proof for a request
    pub fn create_proof(
        &self,
        method: &str,
        uri: &str,
        body: Option<&[u8]>,
        token_bytes: &[u8],
    ) -> ProofOfPossession {
        ProofOfPossession::create(method, uri, body, token_bytes, &self.signing_key)
    }
}

/// Token request proof for the token endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenRequestProof {
    /// Request timestamp (Unix milliseconds)
    pub timestamp: u64,
    /// Ed25519 signature
    #[serde(with = "base64_serde")]
    pub signature: [u8; 64],
}

mod base64_serde {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S, const N: usize>(bytes: &[u8; N], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&URL_SAFE_NO_PAD.encode(bytes))
    }

    pub fn deserialize<'de, D, const N: usize>(deserializer: D) -> Result<[u8; N], D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = URL_SAFE_NO_PAD.decode(s).map_err(serde::de::Error::custom)?;
        bytes.try_into().map_err(|_| serde::de::Error::custom("Invalid length"))
    }
}

impl TokenRequestProof {
    /// Create a token request proof
    pub fn create(
        method: &str,
        path: &str,
        body_hash: &[u8; 32],
        client_id: &str,
        signing_key: &Ed25519KeyPair,
    ) -> Self {
        let timestamp = Utc::now().timestamp_millis() as u64;

        // Create message: SHA-256(timestamp || method || path || body_hash || client_id)
        let message = sha256_multi(&[
            &timestamp.to_be_bytes(),
            method.as_bytes(),
            path.as_bytes(),
            body_hash,
            client_id.as_bytes(),
        ]);

        let signature = signing_key.sign(&message);

        Self {
            timestamp,
            signature,
        }
    }

    /// Verify a token request proof
    pub fn verify(
        &self,
        method: &str,
        path: &str,
        body_hash: &[u8; 32],
        client_id: &str,
        public_key: &VerifyingKey,
        max_age_seconds: i64,
    ) -> Result<()> {
        // Check timestamp
        let now_ms = Utc::now().timestamp_millis() as u64;
        let proof_age_ms = now_ms.saturating_sub(self.timestamp);
        let max_age_ms = (max_age_seconds * 1000) as u64;

        if proof_age_ms > max_age_ms {
            return Err(QAuthError::InvalidProof);
        }

        // Recreate message
        let message = sha256_multi(&[
            &self.timestamp.to_be_bytes(),
            method.as_bytes(),
            path.as_bytes(),
            body_hash,
            client_id.as_bytes(),
        ]);

        // Verify signature
        let signature = Signature::from_bytes(&self.signature);
        public_key
            .verify(&message, &signature)
            .map_err(|_| QAuthError::InvalidProof)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proof_creation_and_validation() {
        let (generator, public_key) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let body = b"request body";

        let proof = generator.create_proof("POST", "/api/resource", Some(body), token);

        let validator = ProofValidator::new(&public_key).unwrap();
        let result = validator.validate(&proof, "POST", "/api/resource", Some(body), token);

        assert!(result.is_ok());
    }

    #[test]
    fn test_proof_wrong_method_fails() {
        let (generator, public_key) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let proof = generator.create_proof("POST", "/api/resource", None, token);

        let validator = ProofValidator::new(&public_key).unwrap();
        let result = validator.validate(&proof, "GET", "/api/resource", None, token);

        assert!(matches!(result, Err(QAuthError::InvalidProof)));
    }

    #[test]
    fn test_proof_wrong_uri_fails() {
        let (generator, public_key) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let proof = generator.create_proof("GET", "/api/resource", None, token);

        let validator = ProofValidator::new(&public_key).unwrap();
        let result = validator.validate(&proof, "GET", "/api/other", None, token);

        assert!(matches!(result, Err(QAuthError::InvalidProof)));
    }

    #[test]
    fn test_proof_wrong_body_fails() {
        let (generator, public_key) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let proof = generator.create_proof("POST", "/api/resource", Some(b"body1"), token);

        let validator = ProofValidator::new(&public_key).unwrap();
        let result = validator.validate(&proof, "POST", "/api/resource", Some(b"body2"), token);

        assert!(matches!(result, Err(QAuthError::InvalidProof)));
    }

    #[test]
    fn test_replay_protection() {
        let (generator, public_key) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let proof = generator.create_proof("GET", "/api/resource", None, token);

        let validator = ProofValidator::new(&public_key).unwrap();

        // First use should succeed
        assert!(validator.validate(&proof, "GET", "/api/resource", None, token).is_ok());

        // Second use (replay) should fail
        assert!(validator.validate(&proof, "GET", "/api/resource", None, token).is_err());
    }

    #[test]
    fn test_proof_serialization() {
        let (generator, _) = ProofGenerator::generate();

        let token = b"sample-qtoken-bytes";
        let proof = generator.create_proof("GET", "/api/resource", None, token);

        let encoded = proof.encode().unwrap();
        let decoded = ProofOfPossession::decode(&encoded).unwrap();

        assert_eq!(proof.timestamp, decoded.timestamp);
        assert_eq!(proof.nonce, decoded.nonce);
        assert_eq!(proof.method, decoded.method);
        assert_eq!(proof.uri, decoded.uri);
    }

    #[test]
    fn test_token_request_proof() {
        let keypair = Ed25519KeyPair::generate();
        let body_hash = sha256(b"request body");

        let proof = TokenRequestProof::create("POST", "/token", &body_hash, "client-123", &keypair);

        let public_key = VerifyingKey::from_bytes(&keypair.public_key_bytes()).unwrap();
        let result = proof.verify("POST", "/token", &body_hash, "client-123", &public_key, 60);

        assert!(result.is_ok());
    }
}
