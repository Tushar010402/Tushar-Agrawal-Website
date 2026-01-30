//! QShieldMessage - Encrypted Message Format
//!
//! Provides a secure message format with:
//! - Authenticated encryption using QuantumShield
//! - Replay protection via message counters
//! - Message type identification
//! - Timestamp support

#[cfg(not(feature = "std"))]
use alloc::vec::Vec;

use crate::error::{QShieldError, Result};
use crate::symmetric::QuantumShield;
use crate::utils::serialize::{
    read_length_prefixed, read_u64, write_length_prefixed, write_u64,
    Deserialize, Header, ObjectType, Serialize,
};
use crate::PROTOCOL_VERSION;

/// Message type identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum MessageType {
    /// Application data
    Data = 0x01,
    /// Close notification
    Close = 0x02,
    /// Key update request
    KeyUpdate = 0x03,
    /// Heartbeat/keepalive
    Heartbeat = 0x04,
    /// Error notification
    Error = 0x05,
}

impl TryFrom<u8> for MessageType {
    type Error = QShieldError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(Self::Data),
            0x02 => Ok(Self::Close),
            0x03 => Ok(Self::KeyUpdate),
            0x04 => Ok(Self::Heartbeat),
            0x05 => Ok(Self::Error),
            _ => Err(QShieldError::ParseError),
        }
    }
}

/// Inner message content (before encryption)
#[derive(Clone)]
pub struct MessageContent {
    /// Message type
    pub message_type: MessageType,
    /// Message counter for replay protection
    pub counter: u64,
    /// Optional timestamp (Unix epoch in seconds)
    pub timestamp: Option<u64>,
    /// Message payload
    pub payload: Vec<u8>,
}

impl MessageContent {
    /// Create a new data message
    pub fn data(counter: u64, payload: Vec<u8>) -> Self {
        Self {
            message_type: MessageType::Data,
            counter,
            timestamp: None,
            payload,
        }
    }

    /// Create a new data message with timestamp
    pub fn data_with_timestamp(counter: u64, timestamp: u64, payload: Vec<u8>) -> Self {
        Self {
            message_type: MessageType::Data,
            counter,
            timestamp: Some(timestamp),
            payload,
        }
    }

    /// Create a close message
    pub fn close(counter: u64) -> Self {
        Self {
            message_type: MessageType::Close,
            counter,
            timestamp: None,
            payload: Vec::new(),
        }
    }

    /// Create a heartbeat message
    pub fn heartbeat(counter: u64) -> Self {
        Self {
            message_type: MessageType::Heartbeat,
            counter,
            timestamp: None,
            payload: Vec::new(),
        }
    }

    /// Create a key update request
    pub fn key_update(counter: u64) -> Self {
        Self {
            message_type: MessageType::KeyUpdate,
            counter,
            timestamp: None,
            payload: Vec::new(),
        }
    }

    /// Serialize to bytes (for encryption)
    fn to_bytes(&self) -> Vec<u8> {
        let flags: u8 = if self.timestamp.is_some() { 0x01 } else { 0x00 };

        let mut buf = Vec::new();
        buf.push(self.message_type as u8);
        buf.push(flags);
        buf.extend_from_slice(&self.counter.to_le_bytes());

        if let Some(ts) = self.timestamp {
            buf.extend_from_slice(&ts.to_le_bytes());
        }

        buf.extend_from_slice(&(self.payload.len() as u32).to_le_bytes());
        buf.extend_from_slice(&self.payload);

        buf
    }

    /// Deserialize from bytes
    fn from_bytes(data: &[u8]) -> Result<Self> {
        if data.len() < 10 {
            return Err(QShieldError::ParseError);
        }

        let message_type = MessageType::try_from(data[0])?;
        let flags = data[1];
        let counter = u64::from_le_bytes([
            data[2], data[3], data[4], data[5], data[6], data[7], data[8], data[9],
        ]);

        let mut offset = 10;

        let timestamp = if flags & 0x01 != 0 {
            if offset + 8 > data.len() {
                return Err(QShieldError::ParseError);
            }
            let ts = u64::from_le_bytes([
                data[offset],
                data[offset + 1],
                data[offset + 2],
                data[offset + 3],
                data[offset + 4],
                data[offset + 5],
                data[offset + 6],
                data[offset + 7],
            ]);
            offset += 8;
            Some(ts)
        } else {
            None
        };

        if offset + 4 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let payload_len = u32::from_le_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        offset += 4;

        if offset + payload_len > data.len() {
            return Err(QShieldError::ParseError);
        }
        let payload = data[offset..offset + payload_len].to_vec();

        Ok(Self {
            message_type,
            counter,
            timestamp,
            payload,
        })
    }
}

/// Encrypted message with header
#[derive(Clone)]
pub struct QShieldMessage {
    /// Protocol version
    pub version: u8,
    /// Session ID (for multiplexing)
    pub session_id: [u8; 16],
    /// Encrypted content
    pub encrypted: Vec<u8>,
}

impl QShieldMessage {
    /// Create a new message by encrypting content
    pub fn seal(
        cipher: &QuantumShield,
        session_id: &[u8; 16],
        content: &MessageContent,
    ) -> Result<Self> {
        let plaintext = content.to_bytes();

        // Use session_id as AAD for additional binding
        let encrypted = cipher.encrypt_with_aad(&plaintext, session_id)?;

        Ok(Self {
            version: PROTOCOL_VERSION,
            session_id: *session_id,
            encrypted,
        })
    }

    /// Decrypt and verify message content
    pub fn open(&self, cipher: &QuantumShield) -> Result<MessageContent> {
        if self.version != PROTOCOL_VERSION {
            return Err(QShieldError::VersionMismatch {
                expected: PROTOCOL_VERSION,
                actual: self.version,
            });
        }

        // Decrypt with session_id as AAD
        let plaintext = cipher.decrypt_with_aad(&self.encrypted, &self.session_id)?;

        MessageContent::from_bytes(&plaintext)
    }

    /// Get the truncated session ID for display
    pub fn session_id_short(&self) -> [u8; 8] {
        let mut short = [0u8; 8];
        short.copy_from_slice(&self.session_id[..8]);
        short
    }
}

impl Serialize for QShieldMessage {
    fn serialize(&self) -> Result<Vec<u8>> {
        let payload_size = 1 + 16 + 4 + self.encrypted.len();
        let header = Header::new(ObjectType::EncryptedMessage, payload_size);

        let mut buf = Vec::with_capacity(Header::SIZE + payload_size);
        buf.extend_from_slice(&header.to_bytes());
        buf.push(self.version);
        buf.extend_from_slice(&self.session_id);
        write_length_prefixed(&self.encrypted, &mut buf);

        Ok(buf)
    }
}

impl Deserialize for QShieldMessage {
    fn deserialize(data: &[u8]) -> Result<Self> {
        let header = Header::from_bytes(data)?;
        if header.object_type != ObjectType::EncryptedMessage {
            return Err(QShieldError::ParseError);
        }

        let mut offset = Header::SIZE;

        if offset >= data.len() {
            return Err(QShieldError::ParseError);
        }
        let version = data[offset];
        offset += 1;

        if offset + 16 > data.len() {
            return Err(QShieldError::ParseError);
        }
        let mut session_id = [0u8; 16];
        session_id.copy_from_slice(&data[offset..offset + 16]);
        offset += 16;

        let encrypted = read_length_prefixed(data, &mut offset)?;

        Ok(Self {
            version,
            session_id,
            encrypted,
        })
    }
}

/// Message channel for send/receive with replay protection
pub struct MessageChannel {
    cipher: QuantumShield,
    session_id: [u8; 16],
    send_counter: u64,
    recv_counter: u64,
    recv_window: u64,
}

impl MessageChannel {
    /// Create a new message channel
    pub fn new(cipher: QuantumShield, session_id: [u8; 32]) -> Self {
        // Use first 16 bytes of session ID
        let mut short_id = [0u8; 16];
        short_id.copy_from_slice(&session_id[..16]);

        Self {
            cipher,
            session_id: short_id,
            send_counter: 0,
            recv_counter: 0,
            recv_window: 1024, // Accept messages up to 1024 ahead
        }
    }

    /// Send a data message
    pub fn send(&mut self, data: &[u8]) -> Result<QShieldMessage> {
        let content = MessageContent::data(self.send_counter, data.to_vec());
        let msg = QShieldMessage::seal(&self.cipher, &self.session_id, &content)?;
        self.send_counter += 1;
        Ok(msg)
    }

    /// Send a data message with timestamp
    pub fn send_with_timestamp(&mut self, data: &[u8], timestamp: u64) -> Result<QShieldMessage> {
        let content =
            MessageContent::data_with_timestamp(self.send_counter, timestamp, data.to_vec());
        let msg = QShieldMessage::seal(&self.cipher, &self.session_id, &content)?;
        self.send_counter += 1;
        Ok(msg)
    }

    /// Send a control message
    pub fn send_control(&mut self, msg_type: MessageType) -> Result<QShieldMessage> {
        let content = match msg_type {
            MessageType::Close => MessageContent::close(self.send_counter),
            MessageType::Heartbeat => MessageContent::heartbeat(self.send_counter),
            MessageType::KeyUpdate => MessageContent::key_update(self.send_counter),
            _ => return Err(QShieldError::NotSupported),
        };
        let msg = QShieldMessage::seal(&self.cipher, &self.session_id, &content)?;
        self.send_counter += 1;
        Ok(msg)
    }

    /// Receive and verify a message
    pub fn receive(&mut self, msg: &QShieldMessage) -> Result<MessageContent> {
        // Verify session ID
        if msg.session_id != self.session_id {
            return Err(QShieldError::AuthenticationFailed);
        }

        // Decrypt
        let content = msg.open(&self.cipher)?;

        // Check replay protection
        if content.counter < self.recv_counter {
            // Message is old - could be replay
            return Err(QShieldError::AuthenticationFailed);
        }

        if content.counter > self.recv_counter + self.recv_window {
            // Message is too far ahead - likely out of order or attack
            return Err(QShieldError::AuthenticationFailed);
        }

        // Update counter (sliding window would be more sophisticated)
        if content.counter >= self.recv_counter {
            self.recv_counter = content.counter + 1;
        }

        Ok(content)
    }

    /// Get current send counter
    pub fn send_counter(&self) -> u64 {
        self.send_counter
    }

    /// Get expected receive counter
    pub fn recv_counter(&self) -> u64 {
        self.recv_counter
    }

    /// Get session ID
    pub fn session_id(&self) -> &[u8; 16] {
        &self.session_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_cipher() -> QuantumShield {
        QuantumShield::new(b"test shared secret for messages").unwrap()
    }

    fn test_session_id() -> [u8; 16] {
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
    }

    #[test]
    fn test_message_seal_open() {
        let cipher = test_cipher();
        let session_id = test_session_id();

        let content = MessageContent::data(0, b"Hello, world!".to_vec());
        let msg = QShieldMessage::seal(&cipher, &session_id, &content).unwrap();

        let opened = msg.open(&cipher).unwrap();
        assert_eq!(opened.message_type, MessageType::Data);
        assert_eq!(opened.counter, 0);
        assert_eq!(opened.payload, b"Hello, world!");
    }

    #[test]
    fn test_message_serialization() {
        let cipher = test_cipher();
        let session_id = test_session_id();

        let content = MessageContent::data(42, b"Test payload".to_vec());
        let msg = QShieldMessage::seal(&cipher, &session_id, &content).unwrap();

        let serialized = msg.serialize().unwrap();
        let deserialized = QShieldMessage::deserialize(&serialized).unwrap();

        assert_eq!(msg.version, deserialized.version);
        assert_eq!(msg.session_id, deserialized.session_id);

        let opened = deserialized.open(&cipher).unwrap();
        assert_eq!(opened.counter, 42);
        assert_eq!(opened.payload, b"Test payload");
    }

    #[test]
    fn test_message_channel() {
        let cipher1 = test_cipher();
        let cipher2 = test_cipher();
        let session_id = [0u8; 32];

        let mut sender = MessageChannel::new(cipher1, session_id);
        let mut receiver = MessageChannel::new(cipher2, session_id);

        // Send a message
        let msg = sender.send(b"Hello from sender").unwrap();
        assert_eq!(sender.send_counter(), 1);

        // Receive the message
        let content = receiver.receive(&msg).unwrap();
        assert_eq!(content.payload, b"Hello from sender");
        assert_eq!(content.counter, 0);
        assert_eq!(receiver.recv_counter(), 1);
    }

    #[test]
    fn test_replay_protection() {
        let cipher1 = test_cipher();
        let cipher2 = test_cipher();
        let session_id = [0u8; 32];

        let mut sender = MessageChannel::new(cipher1, session_id);
        let mut receiver = MessageChannel::new(cipher2, session_id);

        // Send and receive first message
        let msg1 = sender.send(b"First").unwrap();
        receiver.receive(&msg1).unwrap();

        // Try to replay the same message - should fail
        let result = receiver.receive(&msg1);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_session_id() {
        let cipher1 = test_cipher();
        let cipher2 = test_cipher();
        let session_id1 = [1u8; 32];
        let session_id2 = [2u8; 32];

        let mut sender = MessageChannel::new(cipher1, session_id1);
        let mut receiver = MessageChannel::new(cipher2, session_id2);

        let msg = sender.send(b"Test").unwrap();
        let result = receiver.receive(&msg);
        assert!(result.is_err());
    }

    #[test]
    fn test_message_with_timestamp() {
        let cipher = test_cipher();
        let session_id = test_session_id();

        let timestamp = 1704067200u64; // 2024-01-01 00:00:00 UTC
        let content = MessageContent::data_with_timestamp(0, timestamp, b"Timed message".to_vec());

        let msg = QShieldMessage::seal(&cipher, &session_id, &content).unwrap();
        let opened = msg.open(&cipher).unwrap();

        assert_eq!(opened.timestamp, Some(timestamp));
        assert_eq!(opened.payload, b"Timed message");
    }

    #[test]
    fn test_control_messages() {
        let cipher1 = test_cipher();
        let cipher2 = test_cipher();
        let session_id = [0u8; 32];

        let mut sender = MessageChannel::new(cipher1, session_id);
        let mut receiver = MessageChannel::new(cipher2, session_id);

        // Test heartbeat
        let heartbeat = sender.send_control(MessageType::Heartbeat).unwrap();
        let content = receiver.receive(&heartbeat).unwrap();
        assert_eq!(content.message_type, MessageType::Heartbeat);

        // Test close
        let close = sender.send_control(MessageType::Close).unwrap();
        let content = receiver.receive(&close).unwrap();
        assert_eq!(content.message_type, MessageType::Close);
    }
}
