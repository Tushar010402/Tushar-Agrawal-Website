// Package quantumshield provides quantum-resistant cryptographic primitives
// using a defense-in-depth approach with cascading encryption, hybrid key
// encapsulation, and dual digital signatures.
//
// # Security Model
//
// QuantumShield uses multiple independent cryptographic algorithms at every
// layer. An attacker must break ALL algorithms in a layer to compromise
// security:
//
//   - Symmetric: AES-256-GCM cascaded with ChaCha20-Poly1305
//   - KEM: X25519 ECDH (with optional ML-KEM-768 hybrid)
//   - Signatures: Ed25519 (with optional ML-DSA-65 dual signing)
//   - KDF: Argon2id for passwords, HKDF-SHA-512 for key material
//
// # Quick Start
//
//	// Password-based encryption
//	cipher, _ := quantumshield.NewCipherFromPassword("my-secret-password")
//	encrypted, _ := cipher.Encrypt([]byte("Hello, quantum world!"))
//	decrypted, _ := cipher.Decrypt(encrypted)
//
//	// Key exchange
//	alice, _ := quantumshield.NewKEM()
//	bob, _ := quantumshield.NewKEM()
//	ct, shared, _ := alice.Encapsulate(bob.PublicKey())
//	bobShared, _ := bob.Decapsulate(ct)
//	// shared == bobShared
package quantumshield

import (
	"errors"
	"fmt"
)

// Version is the library version string.
const Version = "0.1.0"

// ProtocolVersion is the wire protocol version for cryptographic agility.
const ProtocolVersion byte = 0x01

// Internal constants shared across the package.
const (
	aesKeySize    = 32
	chachaKeySize = 32
	nonceSize     = 12
	// Header: [version(1)] [aes_nonce(12)] [chacha_nonce(12)]
	headerSize = 1 + nonceSize + nonceSize

	// Argon2id parameters — matches WASM SDK (19MB, WASM-safe, GPU resistant)
	argon2Time    = 3
	argon2Memory  = 19456 // 19 MB in KiB
	argon2Threads = 1
	argon2KeyLen  = 64
)

// QShieldError represents errors from the QuantumShield library.
type QShieldError struct {
	Op  string // Operation that failed (e.g. "Encrypt", "Decrypt")
	Msg string // Human-readable error description
	Err error  // Underlying error, if any
}

// Error implements the error interface.
func (e *QShieldError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("quantumshield.%s: %s: %v", e.Op, e.Msg, e.Err)
	}
	return fmt.Sprintf("quantumshield.%s: %s", e.Op, e.Msg)
}

// Unwrap returns the underlying error.
func (e *QShieldError) Unwrap() error {
	return e.Err
}

// Sentinel errors for common failure modes.
var (
	ErrCiphertextTooShort = errors.New("ciphertext too short")
	ErrInvalidVersion     = errors.New("unsupported protocol version")
	ErrDecryptionFailed   = errors.New("decryption failed: authentication tag mismatch")
	ErrInvalidKeyLength   = errors.New("invalid key length")
	ErrInvalidPublicKey   = errors.New("invalid public key")
	ErrInvalidSignature   = errors.New("invalid signature")
	ErrMessageOutOfOrder  = errors.New("session message out of order")
)

// newError creates a new QShieldError.
func newError(op, msg string, err error) *QShieldError {
	return &QShieldError{Op: op, Msg: msg, Err: err}
}
