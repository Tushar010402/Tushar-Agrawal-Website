//! QToken implementation
//!
//! Implements the QToken format as specified in QTOKEN-FORMAT.md

use crate::crypto::{
    sha256, DualSignature, EncryptedData, EncryptionKey, IssuerSigningKeys, IssuerVerifyingKeys,
    DUAL_SIGNATURE_SIZE, KEY_ID_SIZE,
};
use crate::error::{ErrorCode, QAuthError, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// QToken protocol version
pub const QTOKEN_VERSION: u8 = 0x01;

/// Header size in bytes (fixed)
pub const HEADER_SIZE: usize = 42;

/// Proof binding size in bytes (fixed)
pub const PROOF_BINDING_SIZE: usize = 96;

/// Token types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum TokenType {
    /// Short-lived access token
    Access = 0x01,
    /// Long-lived refresh token
    Refresh = 0x02,
    /// Identity/ID token
    Identity = 0x03,
    /// Device registration token
    Device = 0x04,
}

impl TokenType {
    fn from_byte(byte: u8) -> Result<Self> {
        match byte {
            0x01 => Ok(Self::Access),
            0x02 => Ok(Self::Refresh),
            0x03 => Ok(Self::Identity),
            0x04 => Ok(Self::Device),
            _ => Err(ErrorCode::InvalidType.into()),
        }
    }
}

/// QToken header (42 bytes fixed)
#[derive(Debug, Clone)]
pub struct QTokenHeader {
    /// Protocol version (always 0x01)
    pub version: u8,
    /// Token type
    pub token_type: TokenType,
    /// Key ID (SHA-256 of issuer public keys)
    pub key_id: [u8; KEY_ID_SIZE],
    /// Creation timestamp (Unix milliseconds)
    pub timestamp: u64,
}

impl QTokenHeader {
    /// Create a new header
    pub fn new(token_type: TokenType, key_id: [u8; KEY_ID_SIZE]) -> Self {
        Self {
            version: QTOKEN_VERSION,
            token_type,
            key_id,
            timestamp: Utc::now().timestamp_millis() as u64,
        }
    }

    /// Serialize to bytes
    pub fn to_bytes(&self) -> [u8; HEADER_SIZE] {
        let mut bytes = [0u8; HEADER_SIZE];
        bytes[0] = self.version;
        bytes[1] = self.token_type as u8;
        bytes[2..34].copy_from_slice(&self.key_id);
        bytes[34..42].copy_from_slice(&self.timestamp.to_be_bytes());
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < HEADER_SIZE {
            return Err(QAuthError::InvalidInput("Header too short".into()));
        }

        let version = bytes[0];
        if version != QTOKEN_VERSION {
            return Err(ErrorCode::InvalidVersion.into());
        }

        let token_type = TokenType::from_byte(bytes[1])?;

        let key_id: [u8; KEY_ID_SIZE] = bytes[2..34]
            .try_into()
            .map_err(|_| QAuthError::InvalidInput("Invalid key ID".into()))?;

        let timestamp = u64::from_be_bytes(
            bytes[34..42]
                .try_into()
                .map_err(|_| QAuthError::InvalidInput("Invalid timestamp".into()))?,
        );

        Ok(Self {
            version,
            token_type,
            key_id,
            timestamp,
        })
    }
}

/// QToken payload (encrypted in final token)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QTokenPayload {
    /// Subject identifier (user ID)
    #[serde(with = "serde_bytes")]
    pub sub: Vec<u8>,
    /// Issuer identifier
    pub iss: String,
    /// Audience(s)
    pub aud: Vec<String>,
    /// Expiration time (Unix seconds)
    pub exp: i64,
    /// Issued at (Unix seconds)
    pub iat: i64,
    /// Not before (Unix seconds)
    pub nbf: i64,
    /// Unique token identifier
    #[serde(with = "serde_bytes")]
    pub jti: [u8; 16],
    /// Revocation ID
    #[serde(with = "serde_bytes")]
    pub rid: [u8; 16],
    /// Policy reference URN
    pub pol: String,
    /// Context hash
    #[serde(with = "serde_bytes")]
    pub ctx: [u8; 32],
    /// Custom claims
    #[serde(default)]
    pub cst: HashMap<String, serde_json::Value>,
}

impl QTokenPayload {
    /// Create a new payload
    pub fn new(
        subject: Vec<u8>,
        issuer: String,
        audience: Vec<String>,
        policy_ref: String,
        validity_seconds: i64,
    ) -> Self {
        let now = Utc::now().timestamp();
        Self {
            sub: subject,
            iss: issuer,
            aud: audience,
            exp: now + validity_seconds,
            iat: now,
            nbf: now,
            jti: rand::random(),
            rid: rand::random(),
            pol: policy_ref,
            ctx: [0u8; 32],
            cst: HashMap::new(),
        }
    }

    /// Set custom claims
    pub fn with_claims(mut self, claims: HashMap<String, serde_json::Value>) -> Self {
        self.cst = claims;
        self
    }

    /// Set context hash
    pub fn with_context(mut self, ctx: [u8; 32]) -> Self {
        self.ctx = ctx;
        self
    }

    /// Serialize to CBOR bytes
    pub fn to_cbor(&self) -> Result<Vec<u8>> {
        let mut buf = Vec::new();
        ciborium::into_writer(self, &mut buf)
            .map_err(|e| QAuthError::SerializationError(e.to_string()))?;
        Ok(buf)
    }

    /// Deserialize from CBOR bytes
    pub fn from_cbor(bytes: &[u8]) -> Result<Self> {
        ciborium::from_reader(bytes).map_err(|e| QAuthError::SerializationError(e.to_string()))
    }

    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.exp
    }

    /// Check if token is not yet valid
    pub fn is_not_yet_valid(&self) -> bool {
        Utc::now().timestamp() < self.nbf
    }
}

/// Proof binding (device + client key binding)
#[derive(Debug, Clone)]
pub struct ProofBinding {
    /// SHA-256 of device public key
    pub device_key: [u8; 32],
    /// SHA-256 of client ephemeral public key
    pub client_key: [u8; 32],
    /// Salted hash of client IP (or zeros if disabled)
    pub ip_hash: [u8; 32],
}

impl ProofBinding {
    /// Create a new proof binding
    pub fn new(device_key: [u8; 32], client_key: [u8; 32], ip_hash: Option<[u8; 32]>) -> Self {
        Self {
            device_key,
            client_key,
            ip_hash: ip_hash.unwrap_or([0u8; 32]),
        }
    }

    /// Serialize to bytes
    pub fn to_bytes(&self) -> [u8; PROOF_BINDING_SIZE] {
        let mut bytes = [0u8; PROOF_BINDING_SIZE];
        bytes[0..32].copy_from_slice(&self.device_key);
        bytes[32..64].copy_from_slice(&self.client_key);
        bytes[64..96].copy_from_slice(&self.ip_hash);
        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < PROOF_BINDING_SIZE {
            return Err(QAuthError::InvalidInput("Proof binding too short".into()));
        }

        let device_key: [u8; 32] = bytes[0..32].try_into().unwrap();
        let client_key: [u8; 32] = bytes[32..64].try_into().unwrap();
        let ip_hash: [u8; 32] = bytes[64..96].try_into().unwrap();

        Ok(Self {
            device_key,
            client_key,
            ip_hash,
        })
    }
}

/// Complete QToken
pub struct QToken {
    /// Token header
    pub header: QTokenHeader,
    /// Encrypted payload
    pub(crate) encrypted_payload: EncryptedData,
    /// Dual signature
    pub(crate) signature: DualSignature,
    /// Proof binding
    pub binding: ProofBinding,
}

impl QToken {
    /// Create a new QToken
    pub fn create(
        token_type: TokenType,
        payload: &QTokenPayload,
        binding: ProofBinding,
        signing_keys: &IssuerSigningKeys,
        encryption_key: &EncryptionKey,
    ) -> Result<Self> {
        // Create header
        let header = QTokenHeader::new(token_type, signing_keys.key_id());

        // Serialize payload to CBOR
        let payload_bytes = payload.to_cbor()?;

        // Encrypt payload with header as AAD
        let header_bytes = header.to_bytes();
        let encrypted_payload = encryption_key.encrypt(&payload_bytes, &header_bytes)?;

        // Create message for signing (header || encrypted_payload)
        let mut message = Vec::with_capacity(HEADER_SIZE + encrypted_payload.to_bytes().len());
        message.extend_from_slice(&header_bytes);
        message.extend_from_slice(&encrypted_payload.to_bytes());

        // Sign with dual signature
        let signature = signing_keys.sign(&message);

        Ok(Self {
            header,
            encrypted_payload,
            signature,
            binding,
        })
    }

    /// Serialize to bytes
    pub fn to_bytes(&self) -> Vec<u8> {
        let encrypted_bytes = self.encrypted_payload.to_bytes();
        let signature_bytes = self.signature.to_bytes();
        let binding_bytes = self.binding.to_bytes();

        let encrypted_len = encrypted_bytes.len() as u16;

        let total_size = HEADER_SIZE + 2 + encrypted_bytes.len() + signature_bytes.len() + PROOF_BINDING_SIZE;
        let mut bytes = Vec::with_capacity(total_size);

        // Header
        bytes.extend_from_slice(&self.header.to_bytes());
        // Encrypted payload length (2 bytes big-endian)
        bytes.extend_from_slice(&encrypted_len.to_be_bytes());
        // Encrypted payload
        bytes.extend_from_slice(&encrypted_bytes);
        // Signature
        bytes.extend_from_slice(&signature_bytes);
        // Proof binding
        bytes.extend_from_slice(&binding_bytes);

        bytes
    }

    /// Deserialize from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() < HEADER_SIZE + 2 {
            return Err(QAuthError::InvalidInput("Token too short".into()));
        }

        // Parse header
        let header = QTokenHeader::from_bytes(&bytes[..HEADER_SIZE])?;

        // Parse encrypted payload length
        let encrypted_len = u16::from_be_bytes(
            bytes[HEADER_SIZE..HEADER_SIZE + 2]
                .try_into()
                .map_err(|_| QAuthError::InvalidInput("Invalid length".into()))?,
        ) as usize;

        let encrypted_start = HEADER_SIZE + 2;
        let encrypted_end = encrypted_start + encrypted_len;

        if bytes.len() < encrypted_end + DUAL_SIGNATURE_SIZE + PROOF_BINDING_SIZE {
            return Err(QAuthError::InvalidInput("Token too short".into()));
        }

        // Parse encrypted payload
        let encrypted_payload = EncryptedData::from_bytes(&bytes[encrypted_start..encrypted_end])?;

        // Parse signature
        let sig_start = encrypted_end;
        let sig_end = sig_start + DUAL_SIGNATURE_SIZE;
        let signature = DualSignature::from_bytes(&bytes[sig_start..sig_end])?;

        // Parse proof binding
        let binding = ProofBinding::from_bytes(&bytes[sig_end..])?;

        Ok(Self {
            header,
            encrypted_payload,
            signature,
            binding,
        })
    }

    /// Encode to base64url string
    pub fn encode(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.to_bytes())
    }

    /// Decode from base64url string
    pub fn decode(s: &str) -> Result<Self> {
        let bytes = URL_SAFE_NO_PAD
            .decode(s)
            .map_err(|e| QAuthError::SerializationError(e.to_string()))?;
        Self::from_bytes(&bytes)
    }

    /// Verify the token signatures
    pub fn verify_signatures(&self, verifying_keys: &IssuerVerifyingKeys) -> Result<()> {
        // Verify key ID matches
        if self.header.key_id != verifying_keys.key_id() {
            return Err(ErrorCode::InvalidIssuer.into());
        }

        // Reconstruct the signed message
        let header_bytes = self.header.to_bytes();
        let encrypted_bytes = self.encrypted_payload.to_bytes();

        let mut message = Vec::with_capacity(HEADER_SIZE + encrypted_bytes.len());
        message.extend_from_slice(&header_bytes);
        message.extend_from_slice(&encrypted_bytes);

        // Verify dual signature
        verifying_keys.verify(&message, &self.signature)
            .map_err(|_| ErrorCode::SignatureFailed)?;

        Ok(())
    }

    /// Decrypt and extract the payload
    pub fn decrypt_payload(&self, encryption_key: &EncryptionKey) -> Result<QTokenPayload> {
        let header_bytes = self.header.to_bytes();
        let payload_bytes = encryption_key
            .decrypt(&self.encrypted_payload, &header_bytes)
            .map_err(|_| ErrorCode::DecryptionFailed)?;

        QTokenPayload::from_cbor(&payload_bytes)
    }

    /// Verify binding against provided keys
    pub fn verify_binding(&self, client_key: &[u8; 32], device_key: Option<&[u8; 32]>) -> Result<()> {
        // Verify client key binding
        let expected_client_hash = sha256(client_key);
        if !crate::crypto::constant_time_eq(&self.binding.client_key, &expected_client_hash) {
            return Err(ErrorCode::BindingMismatch.into());
        }

        // Verify device key binding if provided
        if let Some(dk) = device_key {
            let expected_device_hash = sha256(dk);
            if !crate::crypto::constant_time_eq(&self.binding.device_key, &expected_device_hash) {
                return Err(ErrorCode::BindingMismatch.into());
            }
        }

        Ok(())
    }
}

/// Token builder for convenient token creation
pub struct QTokenBuilder {
    token_type: TokenType,
    subject: Vec<u8>,
    issuer: String,
    audience: Vec<String>,
    policy_ref: String,
    validity_seconds: i64,
    claims: HashMap<String, serde_json::Value>,
    context: [u8; 32],
    device_key: [u8; 32],
    client_key: [u8; 32],
    ip_hash: Option<[u8; 32]>,
}

impl QTokenBuilder {
    /// Create a new access token builder
    pub fn access_token() -> Self {
        Self {
            token_type: TokenType::Access,
            subject: Vec::new(),
            issuer: String::new(),
            audience: Vec::new(),
            policy_ref: String::new(),
            validity_seconds: 3600, // 1 hour default
            claims: HashMap::new(),
            context: [0u8; 32],
            device_key: [0u8; 32],
            client_key: [0u8; 32],
            ip_hash: None,
        }
    }

    /// Create a new refresh token builder
    pub fn refresh_token() -> Self {
        Self {
            token_type: TokenType::Refresh,
            validity_seconds: 7 * 24 * 3600, // 7 days default
            ..Self::access_token()
        }
    }

    /// Set token type
    pub fn token_type(mut self, tt: TokenType) -> Self {
        self.token_type = tt;
        self
    }

    /// Set subject
    pub fn subject(mut self, sub: Vec<u8>) -> Self {
        self.subject = sub;
        self
    }

    /// Set issuer
    pub fn issuer(mut self, iss: impl Into<String>) -> Self {
        self.issuer = iss.into();
        self
    }

    /// Add audience
    pub fn audience(mut self, aud: impl Into<String>) -> Self {
        self.audience.push(aud.into());
        self
    }

    /// Set policy reference
    pub fn policy_ref(mut self, pol: impl Into<String>) -> Self {
        self.policy_ref = pol.into();
        self
    }

    /// Set validity in seconds
    pub fn validity_seconds(mut self, seconds: i64) -> Self {
        self.validity_seconds = seconds;
        self
    }

    /// Add custom claim
    pub fn claim(mut self, key: impl Into<String>, value: serde_json::Value) -> Self {
        self.claims.insert(key.into(), value);
        self
    }

    /// Set context hash
    pub fn context(mut self, ctx: [u8; 32]) -> Self {
        self.context = ctx;
        self
    }

    /// Set device key (will be hashed)
    pub fn device_key(mut self, key: &[u8]) -> Self {
        self.device_key = sha256(key);
        self
    }

    /// Set client key (will be hashed)
    pub fn client_key(mut self, key: &[u8]) -> Self {
        self.client_key = sha256(key);
        self
    }

    /// Set IP hash
    pub fn ip_hash(mut self, hash: [u8; 32]) -> Self {
        self.ip_hash = Some(hash);
        self
    }

    /// Build the token
    pub fn build(
        self,
        signing_keys: &IssuerSigningKeys,
        encryption_key: &EncryptionKey,
    ) -> Result<QToken> {
        let payload = QTokenPayload::new(
            self.subject,
            self.issuer,
            self.audience,
            self.policy_ref,
            self.validity_seconds,
        )
        .with_claims(self.claims)
        .with_context(self.context);

        let binding = ProofBinding::new(self.device_key, self.client_key, self.ip_hash);

        QToken::create(self.token_type, &payload, binding, signing_keys, encryption_key)
    }
}

/// Token validation result
pub struct ValidatedToken {
    pub header: QTokenHeader,
    pub payload: QTokenPayload,
    pub binding: ProofBinding,
}

/// Token validator
pub struct QTokenValidator {
    verifying_keys: IssuerVerifyingKeys,
    encryption_key: EncryptionKey,
    expected_issuer: String,
    expected_audience: String,
    clock_skew_seconds: i64,
}

impl QTokenValidator {
    /// Create a new validator
    pub fn new(
        verifying_keys: IssuerVerifyingKeys,
        encryption_key: EncryptionKey,
        expected_issuer: String,
        expected_audience: String,
    ) -> Self {
        Self {
            verifying_keys,
            encryption_key,
            expected_issuer,
            expected_audience,
            clock_skew_seconds: 60, // 1 minute default
        }
    }

    /// Set allowed clock skew
    pub fn with_clock_skew(mut self, seconds: i64) -> Self {
        self.clock_skew_seconds = seconds;
        self
    }

    /// Validate a token
    pub fn validate(&self, token: &QToken) -> Result<ValidatedToken> {
        // 1. Verify signatures
        token.verify_signatures(&self.verifying_keys)?;

        // 2. Decrypt payload
        let payload = token.decrypt_payload(&self.encryption_key)?;

        // 3. Check expiration (with clock skew)
        let now = Utc::now().timestamp();
        if now > payload.exp + self.clock_skew_seconds {
            return Err(ErrorCode::TokenExpired.into());
        }

        // 4. Check not-before (with clock skew)
        if now < payload.nbf - self.clock_skew_seconds {
            return Err(ErrorCode::TokenNotYetValid.into());
        }

        // 5. Verify issuer
        if payload.iss != self.expected_issuer {
            return Err(ErrorCode::InvalidIssuer.into());
        }

        // 6. Verify audience
        if !payload.aud.contains(&self.expected_audience) {
            return Err(ErrorCode::InvalidAudience.into());
        }

        Ok(ValidatedToken {
            header: token.header.clone(),
            payload,
            binding: token.binding.clone(),
        })
    }

    /// Validate a token string
    pub fn validate_string(&self, token_str: &str) -> Result<ValidatedToken> {
        let token = QToken::decode(token_str)?;
        self.validate(&token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_keys() -> (IssuerSigningKeys, EncryptionKey) {
        let signing_keys = IssuerSigningKeys::generate();
        let encryption_key = EncryptionKey::generate();
        (signing_keys, encryption_key)
    }

    #[test]
    fn test_token_creation_and_validation() {
        let (signing_keys, encryption_key) = setup_keys();

        // Create token
        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-public-key")
            .device_key(b"device-public-key")
            .validity_seconds(3600)
            .claim("email", serde_json::json!("user@example.com"))
            .build(&signing_keys, &encryption_key)
            .unwrap();

        // Verify signatures
        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        assert!(token.verify_signatures(&verifying_keys).is_ok());

        // Decrypt payload
        let payload = token.decrypt_payload(&encryption_key).unwrap();
        assert_eq!(payload.sub, b"user-123");
        assert_eq!(payload.iss, "https://auth.example.com");
    }

    #[test]
    fn test_token_serialization() {
        let (signing_keys, encryption_key) = setup_keys();

        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .build(&signing_keys, &encryption_key)
            .unwrap();

        // Encode and decode
        let encoded = token.encode();
        let decoded = QToken::decode(&encoded).unwrap();

        // Verify bytes round-trip correctly
        assert_eq!(token.to_bytes(), decoded.to_bytes());

        // Verify decoded token
        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        assert!(decoded.verify_signatures(&verifying_keys).is_ok());
    }

    #[test]
    fn test_full_validation() {
        let (signing_keys, encryption_key) = setup_keys();

        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .build(&signing_keys, &encryption_key)
            .unwrap();

        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        let validator = QTokenValidator::new(
            verifying_keys,
            EncryptionKey::from_bytes(encryption_key.to_bytes()),
            "https://auth.example.com".into(),
            "https://api.example.com".into(),
        );

        let validated = validator.validate(&token).unwrap();
        assert_eq!(validated.payload.sub, b"user-123");
    }

    #[test]
    fn test_wrong_audience_fails() {
        let (signing_keys, encryption_key) = setup_keys();

        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .build(&signing_keys, &encryption_key)
            .unwrap();

        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        let validator = QTokenValidator::new(
            verifying_keys,
            EncryptionKey::from_bytes(encryption_key.to_bytes()),
            "https://auth.example.com".into(),
            "https://wrong-api.example.com".into(), // Wrong audience
        );

        let result = validator.validate(&token);
        assert!(matches!(
            result,
            Err(QAuthError::TokenValidation { code: ErrorCode::InvalidAudience })
        ));
    }

    #[test]
    fn test_expired_token_fails() {
        let (signing_keys, encryption_key) = setup_keys();

        let token = QTokenBuilder::access_token()
            .subject(b"user-123".to_vec())
            .issuer("https://auth.example.com")
            .audience("https://api.example.com")
            .policy_ref("urn:qauth:policy:default")
            .client_key(b"client-key")
            .validity_seconds(-3600) // Already expired
            .build(&signing_keys, &encryption_key)
            .unwrap();

        let verifying_keys = IssuerVerifyingKeys::from_bytes(
            &signing_keys.ed25519.public_key_bytes(),
            &signing_keys.mldsa.public_key_bytes(),
        )
        .unwrap();

        let validator = QTokenValidator::new(
            verifying_keys,
            EncryptionKey::from_bytes(encryption_key.to_bytes()),
            "https://auth.example.com".into(),
            "https://api.example.com".into(),
        );

        let result = validator.validate(&token);
        assert!(matches!(
            result,
            Err(QAuthError::TokenValidation { code: ErrorCode::TokenExpired })
        ));
    }
}
