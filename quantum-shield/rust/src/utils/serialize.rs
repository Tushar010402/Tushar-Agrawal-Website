//! Custom serialization formats for QuantumShield
//!
//! This module provides serialization and deserialization for cryptographic
//! objects with versioning support for cryptographic agility.

#[cfg(not(feature = "std"))]
use alloc::{string::String, vec::Vec};

use crate::error::{QShieldError, Result};
use crate::PROTOCOL_VERSION;

/// Magic bytes identifying QuantumShield data
pub const MAGIC: &[u8; 8] = b"QSHIELD\x00";

/// Trait for serializable types
pub trait Serialize {
    /// Serialize to bytes
    fn serialize(&self) -> Result<Vec<u8>>;

    /// Get the serialized size (if known ahead of time)
    fn serialized_size(&self) -> Option<usize> {
        None
    }
}

/// Trait for deserializable types
pub trait Deserialize: Sized {
    /// Deserialize from bytes
    fn deserialize(data: &[u8]) -> Result<Self>;
}

/// Header for serialized data with version information
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Header {
    /// Magic bytes
    pub magic: [u8; 8],
    /// Protocol version
    pub version: u8,
    /// Object type
    pub object_type: ObjectType,
    /// Flags (reserved for future use)
    pub flags: u16,
    /// Payload length
    pub payload_len: u32,
}

impl Header {
    /// Header size in bytes
    pub const SIZE: usize = 16;

    /// Create a new header
    pub fn new(object_type: ObjectType, payload_len: usize) -> Self {
        Self {
            magic: *MAGIC,
            version: PROTOCOL_VERSION,
            object_type,
            flags: 0,
            payload_len: payload_len as u32,
        }
    }

    /// Serialize the header
    pub fn to_bytes(&self) -> [u8; Self::SIZE] {
        let mut buf = [0u8; Self::SIZE];
        buf[0..8].copy_from_slice(&self.magic);
        buf[8] = self.version;
        buf[9] = self.object_type as u8;
        buf[10..12].copy_from_slice(&self.flags.to_le_bytes());
        buf[12..16].copy_from_slice(&self.payload_len.to_le_bytes());
        buf
    }

    /// Deserialize the header
    pub fn from_bytes(data: &[u8]) -> Result<Self> {
        if data.len() < Self::SIZE {
            return Err(QShieldError::BufferTooSmall {
                needed: Self::SIZE,
                got: data.len(),
            });
        }

        let mut magic = [0u8; 8];
        magic.copy_from_slice(&data[0..8]);

        if &magic != MAGIC {
            return Err(QShieldError::ParseError);
        }

        let version = data[8];
        if version != PROTOCOL_VERSION {
            return Err(QShieldError::VersionMismatch {
                expected: PROTOCOL_VERSION,
                actual: version,
            });
        }

        let object_type = ObjectType::try_from(data[9])?;
        let flags = u16::from_le_bytes([data[10], data[11]]);
        let payload_len = u32::from_le_bytes([data[12], data[13], data[14], data[15]]);

        Ok(Self {
            magic,
            version,
            object_type,
            flags,
            payload_len,
        })
    }
}

/// Type of serialized object
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ObjectType {
    /// Public key
    PublicKey = 0x01,
    /// Secret key
    SecretKey = 0x02,
    /// Ciphertext (KEM)
    KemCiphertext = 0x03,
    /// Signature
    Signature = 0x04,
    /// Encrypted message
    EncryptedMessage = 0x05,
    /// Handshake message
    HandshakeMessage = 0x06,
    /// Key pair
    KeyPair = 0x07,
}

impl TryFrom<u8> for ObjectType {
    type Error = QShieldError;

    fn try_from(value: u8) -> Result<Self> {
        match value {
            0x01 => Ok(Self::PublicKey),
            0x02 => Ok(Self::SecretKey),
            0x03 => Ok(Self::KemCiphertext),
            0x04 => Ok(Self::Signature),
            0x05 => Ok(Self::EncryptedMessage),
            0x06 => Ok(Self::HandshakeMessage),
            0x07 => Ok(Self::KeyPair),
            _ => Err(QShieldError::ParseError),
        }
    }
}

/// Write a length-prefixed byte slice
pub fn write_length_prefixed(data: &[u8], buf: &mut Vec<u8>) {
    buf.extend_from_slice(&(data.len() as u32).to_le_bytes());
    buf.extend_from_slice(data);
}

/// Read a length-prefixed byte slice
pub fn read_length_prefixed(data: &[u8], offset: &mut usize) -> Result<Vec<u8>> {
    if *offset + 4 > data.len() {
        return Err(QShieldError::ParseError);
    }

    let len = u32::from_le_bytes([
        data[*offset],
        data[*offset + 1],
        data[*offset + 2],
        data[*offset + 3],
    ]) as usize;

    *offset += 4;

    if *offset + len > data.len() {
        return Err(QShieldError::ParseError);
    }

    let result = data[*offset..*offset + len].to_vec();
    *offset += len;

    Ok(result)
}

/// Write a fixed-size array
pub fn write_fixed<const N: usize>(data: &[u8; N], buf: &mut Vec<u8>) {
    buf.extend_from_slice(data);
}

/// Read a fixed-size array
pub fn read_fixed<const N: usize>(data: &[u8], offset: &mut usize) -> Result<[u8; N]> {
    if *offset + N > data.len() {
        return Err(QShieldError::BufferTooSmall {
            needed: *offset + N,
            got: data.len(),
        });
    }

    let mut result = [0u8; N];
    result.copy_from_slice(&data[*offset..*offset + N]);
    *offset += N;

    Ok(result)
}

/// Write a u64 in little-endian
pub fn write_u64(value: u64, buf: &mut Vec<u8>) {
    buf.extend_from_slice(&value.to_le_bytes());
}

/// Read a u64 in little-endian
pub fn read_u64(data: &[u8], offset: &mut usize) -> Result<u64> {
    let bytes: [u8; 8] = read_fixed(data, offset)?;
    Ok(u64::from_le_bytes(bytes))
}

/// Write a u32 in little-endian
pub fn write_u32(value: u32, buf: &mut Vec<u8>) {
    buf.extend_from_slice(&value.to_le_bytes());
}

/// Read a u32 in little-endian
pub fn read_u32(data: &[u8], offset: &mut usize) -> Result<u32> {
    let bytes: [u8; 4] = read_fixed(data, offset)?;
    Ok(u32::from_le_bytes(bytes))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_header_roundtrip() {
        let header = Header::new(ObjectType::PublicKey, 1234);
        let bytes = header.to_bytes();
        let parsed = Header::from_bytes(&bytes).unwrap();
        assert_eq!(header, parsed);
    }

    #[test]
    fn test_length_prefixed() {
        let data = b"hello world";
        let mut buf = Vec::new();
        write_length_prefixed(data, &mut buf);

        let mut offset = 0;
        let result = read_length_prefixed(&buf, &mut offset).unwrap();
        assert_eq!(result, data);
        assert_eq!(offset, buf.len());
    }

    #[test]
    fn test_fixed_array() {
        let data: [u8; 16] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        let mut buf = Vec::new();
        write_fixed(&data, &mut buf);

        let mut offset = 0;
        let result: [u8; 16] = read_fixed(&buf, &mut offset).unwrap();
        assert_eq!(result, data);
    }
}
