//! QShieldHandshake - Authenticated Key Exchange Protocol
//!
//! Implements a TLS-like handshake using post-quantum primitives:
//!
//! ```text
//! Client                                Server
//!   |                                      |
//!   |------- ClientHello ----------------->|
//!   |        (client_kem_pk, client_nonce) |
//!   |                                      |
//!   |<------ ServerHello ------------------|
//!   |        (kem_ct, server_sign_pk,      |
//!   |         signature)                   |
//!   |                                      |
//!   |------- ClientFinished -------------->|
//!   |        (signature)                   |
//!   |                                      |
//!   |<------ ServerFinished ---------------|
//!   |        (encrypted confirmation)      |
//!   |                                      |
//!   [======== Encrypted Channel ===========]
//! ```

#[cfg(not(feature = "std"))]
use alloc::{string::String, vec::Vec};

use sha3::{Digest, Sha3_256};
use zeroize::{Zeroize, ZeroizeOnDrop};

use crate::error::{QShieldError, Result};
use crate::kdf::{QShieldKDF, SessionKeys};
use crate::kem::{QShieldKEM, QShieldKEMCiphertext, QShieldKEMPublicKey, QShieldKEMSecretKey};
use crate::sign::{QShieldSign, QShieldSignPublicKey, QShieldSignSecretKey, QShieldSignature};
use crate::symmetric::QuantumShield;
use crate::utils::rng::SecureRng;
use crate::utils::serialize::{
    read_length_prefixed, write_length_prefixed, Deserialize, Header, ObjectType, Serialize,
};
use crate::PROTOCOL_VERSION;

/// Handshake role
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandshakeRole {
    /// Initiator (client)
    Client,
    /// Responder (server)
    Server,
}

/// Handshake state
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HandshakeState {
    /// Initial state
    Initial,
    /// Client hello sent/received
    ClientHelloSent,
    /// Server hello sent/received
    ServerHelloReceived,
    /// Client finished sent/received
    ClientFinishedSent,
    /// Handshake complete
    Complete,
    /// Handshake failed
    Failed,
}

/// Client Hello message
#[derive(Clone)]
pub struct ClientHello {
    /// Protocol version
    pub version: u8,
    /// Client's ephemeral KEM public key
    pub kem_public_key: QShieldKEMPublicKey,
    /// Client's signing public key
    pub sign_public_key: QShieldSignPublicKey,
    /// Random nonce for freshness
    pub nonce: [u8; 32],
}

impl ClientHello {
    /// Create a new ClientHello
    pub fn new(
        kem_public_key: QShieldKEMPublicKey,
        sign_public_key: QShieldSignPublicKey,
    ) -> Result<Self> {
        let mut rng = SecureRng::new();
        let mut nonce = [0u8; 32];
        rng.fill_bytes(&mut nonce)?;

        Ok(Self {
            version: PROTOCOL_VERSION,
            kem_public_key,
            sign_public_key,
            nonce,
        })
    }

    /// Compute transcript hash up to this message
    pub fn transcript_hash(&self) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShield-handshake-v1");
        hasher.update(&[self.version]);
        hasher.update(&self.kem_public_key.serialize().unwrap_or_default());
        hasher.update(&self.sign_public_key.serialize().unwrap_or_default());
        hasher.update(&self.nonce);
        hasher.finalize().to_vec()
    }
}

impl Serialize for ClientHello {
    fn serialize(&self) -> Result<Vec<u8>> {
        let kem_pk = self.kem_public_key.serialize()?;
        let sign_pk = self.sign_public_key.serialize()?;

        let payload_size = 1 + 4 + kem_pk.len() + 4 + sign_pk.len() + 32;
        let header = Header::new(ObjectType::HandshakeMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        buf.push(self.version);
        write_length_prefixed(&kem_pk, &mut buf);
        write_length_prefixed(&sign_pk, &mut buf);
        buf.extend_from_slice(&self.nonce);

        Ok(buf)
    }
}

impl Deserialize for ClientHello {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::HandshakeMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;

        if offset >= data.len() {
            return Err(QShieldError::ParseError);
        }
        let version = data[offset];
        offset += 1;

        if version != PROTOCOL_VERSION {
            return Err(QShieldError::VersionMismatch {
                expected: PROTOCOL_VERSION,
                actual: version,
            });
        }

        let kem_pk_bytes = read_length_prefixed(data, &mut offset)?;
        let sign_pk_bytes = read_length_prefixed(data, &mut offset)?;

        if offset + 32 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&data[offset..offset + 32]);

        let kem_public_key = QShieldKEMPublicKey::deserialize(&kem_pk_bytes)?;
        let sign_public_key = QShieldSignPublicKey::deserialize(&sign_pk_bytes)?;

        Ok(Self {
            version,
            kem_public_key,
            sign_public_key,
            nonce,
        })
    }
}

/// Server Hello message
#[derive(Clone)]
pub struct ServerHello {
    /// Protocol version
    pub version: u8,
    /// KEM ciphertext (encapsulated shared secret)
    pub kem_ciphertext: QShieldKEMCiphertext,
    /// Server's signing public key
    pub sign_public_key: QShieldSignPublicKey,
    /// Server's signature over transcript
    pub signature: QShieldSignature,
    /// Server nonce
    pub nonce: [u8; 32],
}

impl ServerHello {
    /// Create a new ServerHello
    pub fn new(
        kem_ciphertext: QShieldKEMCiphertext,
        sign_public_key: QShieldSignPublicKey,
        signature: QShieldSignature,
    ) -> Result<Self> {
        let mut rng = SecureRng::new();
        let mut nonce = [0u8; 32];
        rng.fill_bytes(&mut nonce)?;

        Ok(Self {
            version: PROTOCOL_VERSION,
            kem_ciphertext,
            sign_public_key,
            signature,
            nonce,
        })
    }

    /// Compute transcript hash including this message (without signature)
    pub fn transcript_hash(&self, client_hello_hash: &[u8]) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(client_hello_hash);
        hasher.update(&[self.version]);
        hasher.update(&self.kem_ciphertext.serialize().unwrap_or_default());
        hasher.update(&self.sign_public_key.serialize().unwrap_or_default());
        hasher.update(&self.nonce);
        hasher.finalize().to_vec()
    }
}

impl Serialize for ServerHello {
    fn serialize(&self) -> Result<Vec<u8>> {
        let kem_ct = self.kem_ciphertext.serialize()?;
        let sign_pk = self.sign_public_key.serialize()?;
        let sig = self.signature.serialize()?;

        let payload_size = 1 + 4 + kem_ct.len() + 4 + sign_pk.len() + 4 + sig.len() + 32;
        let header = Header::new(ObjectType::HandshakeMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        buf.push(self.version);
        write_length_prefixed(&kem_ct, &mut buf);
        write_length_prefixed(&sign_pk, &mut buf);
        write_length_prefixed(&sig, &mut buf);
        buf.extend_from_slice(&self.nonce);

        Ok(buf)
    }
}

impl Deserialize for ServerHello {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::HandshakeMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;

        if offset >= data.len() {
            return Err(QShieldError::ParseError);
        }
        let version = data[offset];
        offset += 1;

        let kem_ct_bytes = read_length_prefixed(data, &mut offset)?;
        let sign_pk_bytes = read_length_prefixed(data, &mut offset)?;
        let sig_bytes = read_length_prefixed(data, &mut offset)?;

        if offset + 32 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&data[offset..offset + 32]);

        let kem_ciphertext = QShieldKEMCiphertext::deserialize(&kem_ct_bytes)?;
        let sign_public_key = QShieldSignPublicKey::deserialize(&sign_pk_bytes)?;
        let signature = QShieldSignature::deserialize(&sig_bytes)?;

        Ok(Self {
            version,
            kem_ciphertext,
            sign_public_key,
            signature,
            nonce,
        })
    }
}

/// Client Finished message
#[derive(Clone)]
pub struct ClientFinished {
    /// Client's signature over transcript
    pub signature: QShieldSignature,
}

impl Serialize for ClientFinished {
    fn serialize(&self) -> Result<Vec<u8>> {
        let sig = self.signature.serialize()?;

        let payload_size = 4 + sig.len();
        let header = Header::new(ObjectType::HandshakeMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&sig, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for ClientFinished {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::HandshakeMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let sig_bytes = read_length_prefixed(data, &mut offset)?;
        let signature = QShieldSignature::deserialize(&sig_bytes)?;

        Ok(Self { signature })
    }
}

/// Server Finished message
#[derive(Clone)]
pub struct ServerFinished {
    /// Encrypted confirmation data
    pub encrypted_confirm: Vec<u8>,
}

impl Serialize for ServerFinished {
    fn serialize(&self) -> Result<Vec<u8>> {
        let payload_size = 4 + self.encrypted_confirm.len();
        let header = Header::new(ObjectType::HandshakeMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        write_length_prefixed(&self.encrypted_confirm, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for ServerFinished {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::HandshakeMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;
        let encrypted_confirm = read_length_prefixed(data, &mut offset)?;

        Ok(Self { encrypted_confirm })
    }
}

/// Established session after handshake
#[derive(ZeroizeOnDrop)]
pub struct EstablishedSession {
    /// Session cipher for encryption
    #[zeroize(skip)]
    pub cipher: QuantumShield,
    /// Peer's signing public key
    #[zeroize(skip)]
    pub peer_sign_key: QShieldSignPublicKey,
    /// Session ID
    pub session_id: [u8; 32],
    /// Message counter for replay protection
    pub send_counter: u64,
    /// Expected receive counter
    pub recv_counter: u64,
}

/// QShieldHandshake - Authenticated Key Exchange
///
/// Manages the handshake state machine for establishing encrypted sessions.
pub struct QShieldHandshake {
    role: HandshakeRole,
    state: HandshakeState,
    // Own keys
    kem_secret_key: Option<QShieldKEMSecretKey>,
    kem_public_key: Option<QShieldKEMPublicKey>,
    sign_secret_key: QShieldSignSecretKey,
    sign_public_key: QShieldSignPublicKey,
    // Peer keys
    peer_kem_public_key: Option<QShieldKEMPublicKey>,
    peer_sign_public_key: Option<QShieldSignPublicKey>,
    // Handshake transcript
    transcript: Vec<u8>,
    // Derived shared secret
    shared_secret: Option<Vec<u8>>,
}

impl QShieldHandshake {
    /// Create a new handshake as client (initiator)
    pub fn new_client(
        sign_secret_key: QShieldSignSecretKey,
        sign_public_key: QShieldSignPublicKey,
    ) -> Result<Self> {
        // Generate ephemeral KEM keypair
        let (kem_public_key, kem_secret_key) = QShieldKEM::generate_keypair()?;

        Ok(Self {
            role: HandshakeRole::Client,
            state: HandshakeState::Initial,
            kem_secret_key: Some(kem_secret_key),
            kem_public_key: Some(kem_public_key),
            sign_secret_key,
            sign_public_key,
            peer_kem_public_key: None,
            peer_sign_public_key: None,
            transcript: Vec::new(),
            shared_secret: None,
        })
    }

    /// Create a new handshake as server (responder)
    pub fn new_server(
        sign_secret_key: QShieldSignSecretKey,
        sign_public_key: QShieldSignPublicKey,
    ) -> Self {
        Self {
            role: HandshakeRole::Server,
            state: HandshakeState::Initial,
            kem_secret_key: None,
            kem_public_key: None,
            sign_secret_key,
            sign_public_key,
            peer_kem_public_key: None,
            peer_sign_public_key: None,
            transcript: Vec::new(),
            shared_secret: None,
        }
    }

    /// Get current handshake state
    pub fn state(&self) -> HandshakeState {
        self.state
    }

    /// Client: Generate ClientHello message
    pub fn client_hello(&mut self) -> Result<ClientHello> {
        if self.role != HandshakeRole::Client || self.state != HandshakeState::Initial {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for client_hello".into(),
            ));
        }

        let kem_pk = self.kem_public_key.as_ref().ok_or(QShieldError::InternalError)?;
        let hello = ClientHello::new(kem_pk.clone(), self.sign_public_key.clone())?;

        // Update transcript
        self.transcript.extend_from_slice(&hello.transcript_hash());

        self.state = HandshakeState::ClientHelloSent;
        Ok(hello)
    }

    /// Server: Process ClientHello and generate ServerHello
    pub fn server_hello(&mut self, client_hello: &ClientHello) -> Result<ServerHello> {
        if self.role != HandshakeRole::Server || self.state != HandshakeState::Initial {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for server_hello".into(),
            ));
        }

        // Store client's keys
        self.peer_kem_public_key = Some(client_hello.kem_public_key.clone());
        self.peer_sign_public_key = Some(client_hello.sign_public_key.clone());

        // Update transcript with client hello
        let client_hello_hash = client_hello.transcript_hash();
        self.transcript.extend_from_slice(&client_hello_hash);

        // Encapsulate shared secret to client's KEM key
        let (kem_ciphertext, shared_secret) =
            QShieldKEM::encapsulate(&client_hello.kem_public_key)?;

        // Store shared secret
        self.shared_secret = Some(shared_secret.as_bytes().to_vec());

        // Generate nonce
        let mut rng = SecureRng::new();
        let mut nonce = [0u8; 32];
        rng.fill_bytes(&mut nonce)?;

        // Compute transcript hash for signing using the same method as transcript_hash()
        let transcript_to_sign = {
            let mut hasher = Sha3_256::new();
            hasher.update(&client_hello_hash);
            hasher.update(&[PROTOCOL_VERSION]);
            hasher.update(&kem_ciphertext.serialize()?);
            hasher.update(&self.sign_public_key.serialize()?);
            hasher.update(&nonce);
            hasher.finalize().to_vec()
        };

        // Sign the transcript
        let signature = QShieldSign::sign(&self.sign_secret_key, &transcript_to_sign)?;

        // Create final ServerHello
        let server_hello = ServerHello {
            version: PROTOCOL_VERSION,
            kem_ciphertext,
            sign_public_key: self.sign_public_key.clone(),
            signature,
            nonce,
        };

        // Update transcript
        self.transcript.extend_from_slice(&transcript_to_sign);

        self.state = HandshakeState::ServerHelloReceived;
        Ok(server_hello)
    }

    /// Client: Process ServerHello and generate ClientFinished
    pub fn process_server_hello(
        &mut self,
        server_hello: &ServerHello,
    ) -> Result<ClientFinished> {
        if self.role != HandshakeRole::Client || self.state != HandshakeState::ClientHelloSent {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for process_server_hello".into(),
            ));
        }

        // Store server's signing key
        self.peer_sign_public_key = Some(server_hello.sign_public_key.clone());

        // Compute transcript hash (using stored client hello hash)
        let client_hello_hash = self.transcript.clone();
        let transcript_to_verify = server_hello.transcript_hash(&client_hello_hash);

        // Verify server's signature
        let valid = QShieldSign::verify(
            &server_hello.sign_public_key,
            &transcript_to_verify,
            &server_hello.signature,
        )?;

        if !valid {
            self.state = HandshakeState::Failed;
            return Err(QShieldError::HandshakeFailed(
                "Server signature verification failed".into(),
            ));
        }

        // Decapsulate shared secret
        let kem_sk = self.kem_secret_key.as_ref().ok_or(QShieldError::InternalError)?;
        let shared_secret = QShieldKEM::decapsulate(kem_sk, &server_hello.kem_ciphertext)?;
        self.shared_secret = Some(shared_secret.as_bytes().to_vec());

        // Update transcript
        self.transcript.extend_from_slice(&transcript_to_verify);

        // Create client finished signature
        let client_finished_hash = self.compute_finished_hash();
        let signature = QShieldSign::sign(&self.sign_secret_key, &client_finished_hash)?;

        // Update transcript
        self.transcript.extend_from_slice(&client_finished_hash);

        self.state = HandshakeState::ClientFinishedSent;
        Ok(ClientFinished { signature })
    }

    /// Server: Process ClientFinished and generate ServerFinished
    pub fn process_client_finished(
        &mut self,
        client_finished: &ClientFinished,
    ) -> Result<ServerFinished> {
        if self.role != HandshakeRole::Server || self.state != HandshakeState::ServerHelloReceived {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for process_client_finished".into(),
            ));
        }

        let peer_sign_pk = self
            .peer_sign_public_key
            .as_ref()
            .ok_or(QShieldError::InternalError)?;

        // Compute expected transcript hash
        let client_finished_hash = self.compute_finished_hash();

        // Verify client's signature
        let valid =
            QShieldSign::verify(peer_sign_pk, &client_finished_hash, &client_finished.signature)?;

        if !valid {
            self.state = HandshakeState::Failed;
            return Err(QShieldError::HandshakeFailed(
                "Client signature verification failed".into(),
            ));
        }

        // Update transcript
        self.transcript.extend_from_slice(&client_finished_hash);

        // Create encrypted confirmation
        let shared_secret = self
            .shared_secret
            .as_ref()
            .ok_or(QShieldError::InternalError)?;
        let cipher = QuantumShield::new(shared_secret)?;

        let confirm_data = b"HANDSHAKE_COMPLETE";
        let encrypted_confirm = cipher.encrypt(confirm_data)?;

        self.state = HandshakeState::Complete;
        Ok(ServerFinished { encrypted_confirm })
    }

    /// Client: Process ServerFinished and complete handshake
    pub fn process_server_finished(
        &mut self,
        server_finished: &ServerFinished,
    ) -> Result<EstablishedSession> {
        if self.role != HandshakeRole::Client || self.state != HandshakeState::ClientFinishedSent {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for process_server_finished".into(),
            ));
        }

        let shared_secret = self
            .shared_secret
            .as_ref()
            .ok_or(QShieldError::InternalError)?;
        let cipher = QuantumShield::new(shared_secret)?;

        // Decrypt and verify confirmation
        let confirm_data = cipher.decrypt(&server_finished.encrypted_confirm)?;
        if confirm_data != b"HANDSHAKE_COMPLETE" {
            self.state = HandshakeState::Failed;
            return Err(QShieldError::HandshakeFailed(
                "Invalid server confirmation".into(),
            ));
        }

        self.state = HandshakeState::Complete;
        self.create_session()
    }

    /// Server: Complete handshake and create session
    pub fn complete_server(&self) -> Result<EstablishedSession> {
        if self.role != HandshakeRole::Server || self.state != HandshakeState::Complete {
            return Err(QShieldError::HandshakeFailed(
                "Invalid state for complete_server".into(),
            ));
        }

        self.create_session()
    }

    /// Create established session from handshake state
    fn create_session(&self) -> Result<EstablishedSession> {
        let shared_secret = self
            .shared_secret
            .as_ref()
            .ok_or(QShieldError::InternalError)?;
        let peer_sign_key = self
            .peer_sign_public_key
            .clone()
            .ok_or(QShieldError::InternalError)?;

        let cipher = QuantumShield::new(shared_secret)?;

        // Derive session ID from transcript
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShield-session-id-v1");
        hasher.update(&self.transcript);
        let session_id_vec = hasher.finalize();
        let mut session_id = [0u8; 32];
        session_id.copy_from_slice(&session_id_vec);

        Ok(EstablishedSession {
            cipher,
            peer_sign_key,
            session_id,
            send_counter: 0,
            recv_counter: 0,
        })
    }

    /// Compute hash for finished messages
    fn compute_finished_hash(&self) -> Vec<u8> {
        let mut hasher = Sha3_256::new();
        hasher.update(b"QShield-finished-v1");
        hasher.update(&self.transcript);
        hasher.finalize().to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn generate_test_keys() -> (QShieldSignPublicKey, QShieldSignSecretKey) {
        QShieldSign::generate_keypair().unwrap()
    }

    #[test]
    fn test_full_handshake() {
        // Generate keys for client and server
        let (client_sign_pk, client_sign_sk) = generate_test_keys();
        let (server_sign_pk, server_sign_sk) = generate_test_keys();

        // Create handshake instances
        let mut client = QShieldHandshake::new_client(client_sign_sk, client_sign_pk).unwrap();
        let mut server = QShieldHandshake::new_server(server_sign_sk, server_sign_pk);

        // Step 1: Client sends ClientHello
        let client_hello = client.client_hello().unwrap();
        assert_eq!(client.state(), HandshakeState::ClientHelloSent);

        // Step 2: Server processes ClientHello and sends ServerHello
        let server_hello = server.server_hello(&client_hello).unwrap();
        assert_eq!(server.state(), HandshakeState::ServerHelloReceived);

        // Step 3: Client processes ServerHello and sends ClientFinished
        let client_finished = client.process_server_hello(&server_hello).unwrap();
        assert_eq!(client.state(), HandshakeState::ClientFinishedSent);

        // Step 4: Server processes ClientFinished and sends ServerFinished
        let server_finished = server.process_client_finished(&client_finished).unwrap();
        assert_eq!(server.state(), HandshakeState::Complete);

        // Step 5: Client processes ServerFinished
        let client_session = client.process_server_finished(&server_finished).unwrap();
        assert_eq!(client.state(), HandshakeState::Complete);

        // Step 6: Server creates session
        let server_session = server.complete_server().unwrap();

        // Verify sessions have same ID
        assert_eq!(client_session.session_id, server_session.session_id);

        // Verify bidirectional encryption works
        let test_message = b"Hello from client!";
        let encrypted = client_session.cipher.encrypt(test_message).unwrap();
        let decrypted = server_session.cipher.decrypt(&encrypted).unwrap();
        assert_eq!(test_message.as_slice(), decrypted.as_slice());

        let response = b"Hello from server!";
        let encrypted = server_session.cipher.encrypt(response).unwrap();
        let decrypted = client_session.cipher.decrypt(&encrypted).unwrap();
        assert_eq!(response.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_client_hello_serialization() {
        let (sign_pk, sign_sk) = generate_test_keys();
        let mut handshake = QShieldHandshake::new_client(sign_sk, sign_pk).unwrap();

        let hello = handshake.client_hello().unwrap();
        let serialized = hello.serialize().unwrap();
        let deserialized = ClientHello::deserialize(&serialized).unwrap();

        assert_eq!(hello.version, deserialized.version);
        assert_eq!(hello.nonce, deserialized.nonce);
    }
}
