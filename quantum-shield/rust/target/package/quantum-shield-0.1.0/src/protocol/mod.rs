//! QuantumShield Protocol Layer
//!
//! This module implements the handshake protocol and secure message format
//! for establishing encrypted channels using QuantumShield primitives.
//!
//! ## Protocol Overview
//!
//! 1. **Handshake**: Authenticated key exchange using QShieldKEM + QShieldSign
//! 2. **Message Format**: Encrypted messages with authentication and replay protection
//!
//! ## Security Properties
//!
//! - Forward secrecy via ephemeral key exchange
//! - Mutual authentication via dual signatures
//! - Replay protection via message counters
//! - Integrity via authenticated encryption

mod handshake;
mod message;

pub use handshake::{
    QShieldHandshake, HandshakeState, HandshakeRole,
    ClientHello, ServerHello, ClientFinished, ServerFinished, EstablishedSession,
};
pub use message::{QShieldMessage, MessageType, MessageContent, MessageChannel};
