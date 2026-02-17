package quantumshield

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/sha512"
	"encoding/binary"
	"io"
	"sync"

	"golang.org/x/crypto/hkdf"
)

// QShieldSession provides forward-secrecy encrypted messaging with
// automatic key ratcheting.
//
// Each message is encrypted with a unique derived key. After each
// encryption or decryption, the chain key is ratcheted forward using
// HMAC-SHA-256, making it computationally infeasible to derive past
// message keys from the current chain key.
//
// # Forward Secrecy
//
// Even if the current chain key is compromised, an attacker cannot
// recover keys used for previous messages because the HMAC ratchet
// is a one-way function.
//
// # Usage
//
// Both parties must create a session from the same shared secret (e.g.
// from QShieldKEM) and must process messages in order.
//
//	alice, _ := quantumshield.NewSession(sharedSecret)
//	bob, _ := quantumshield.NewSession(sharedSecret)
//
//	ct, _ := alice.Encrypt([]byte("hello"))
//	pt, _ := bob.Decrypt(ct)
type QShieldSession struct {
	mu           sync.Mutex
	chainKey     []byte // 32 bytes, ratcheted after each message
	messageCount uint64
}

// NewSession creates a new forward-secrecy session from a shared secret.
//
// The shared secret is typically obtained from QShieldKEM.Encapsulate or
// QShieldKEM.Decapsulate. The initial chain key is derived via
// HKDF-SHA-512.
func NewSession(sharedSecret []byte) (*QShieldSession, error) {
	if len(sharedSecret) == 0 {
		return nil, newError("NewSession", "shared secret must not be empty", nil)
	}

	// Derive the initial chain key via HKDF-SHA-512
	salt := []byte("QShield-session-v1")
	info := []byte("chain-key-init")
	reader := hkdf.New(sha512.New, sharedSecret, salt, info)

	chainKey := make([]byte, 32)
	if _, err := io.ReadFull(reader, chainKey); err != nil {
		return nil, newError("NewSession", "chain key derivation failed", err)
	}

	return &QShieldSession{
		chainKey:     chainKey,
		messageCount: 0,
	}, nil
}

// Encrypt encrypts a message with forward secrecy.
//
// A unique message key is derived from the chain key using HMAC-SHA-256.
// After deriving the key, the chain key is ratcheted forward so past
// keys cannot be recovered.
//
// The returned ciphertext includes an 8-byte message sequence number
// prefix followed by the encrypted payload:
//
//	[sequence(8)] [cipher_ciphertext(...)]
//
// Messages must be decrypted in the same order they were encrypted.
func (s *QShieldSession) Encrypt(plaintext []byte) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	messageKey, newChainKey, err := s.ratchet()
	if err != nil {
		return nil, err
	}

	// Create a one-time cipher from the message key
	cipher, err := NewCipher(messageKey)
	if err != nil {
		return nil, newError("SessionEncrypt", "cipher creation failed", err)
	}

	encrypted, err := cipher.Encrypt(plaintext)
	if err != nil {
		return nil, newError("SessionEncrypt", "encryption failed", err)
	}

	// Prepend the message sequence number
	seqBytes := make([]byte, 8)
	binary.LittleEndian.PutUint64(seqBytes, s.messageCount)

	result := make([]byte, 0, 8+len(encrypted))
	result = append(result, seqBytes...)
	result = append(result, encrypted...)

	// Ratchet the chain key forward
	s.chainKey = newChainKey
	s.messageCount++

	// Zeroize the message key
	clear(messageKey)

	return result, nil
}

// Decrypt decrypts a message produced by the peer's Encrypt.
//
// Messages must be decrypted in order. If a message is received out of
// order, an error is returned.
func (s *QShieldSession) Decrypt(ciphertext []byte) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(ciphertext) < 8 {
		return nil, newError("SessionDecrypt", "ciphertext too short", ErrCiphertextTooShort)
	}

	// Read the message sequence number
	msgNum := binary.LittleEndian.Uint64(ciphertext[:8])
	if msgNum != s.messageCount {
		return nil, newError("SessionDecrypt", "message out of order", ErrMessageOutOfOrder)
	}

	messageKey, newChainKey, err := s.ratchet()
	if err != nil {
		return nil, err
	}

	// Create a one-time cipher from the message key
	cipher, err := NewCipher(messageKey)
	if err != nil {
		return nil, newError("SessionDecrypt", "cipher creation failed", err)
	}

	plaintext, err := cipher.Decrypt(ciphertext[8:])
	if err != nil {
		return nil, newError("SessionDecrypt", "decryption failed", err)
	}

	// Ratchet the chain key forward
	s.chainKey = newChainKey
	s.messageCount++

	// Zeroize the message key
	clear(messageKey)

	return plaintext, nil
}

// MessageCount returns the number of messages processed (encrypted or
// decrypted) by this session.
func (s *QShieldSession) MessageCount() uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.messageCount
}

// ratchet derives a message key and the next chain key from the current
// chain key using HMAC-SHA-256.
//
// messageKey  = HMAC-SHA-256(chainKey, "message-key" || counter_le_bytes)
// newChainKey = HMAC-SHA-256(chainKey, "chain-key-next")
//
// This is a one-way derivation: knowing the new chain key, one cannot
// recover the old chain key or any previous message keys.
func (s *QShieldSession) ratchet() (messageKey, newChainKey []byte, err error) {
	// Derive message key
	msgMac := hmac.New(sha256.New, s.chainKey)
	msgMac.Write([]byte("message-key"))
	counterBytes := make([]byte, 8)
	binary.LittleEndian.PutUint64(counterBytes, s.messageCount)
	msgMac.Write(counterBytes)
	messageKey = msgMac.Sum(nil)

	// Derive next chain key
	chainMac := hmac.New(sha256.New, s.chainKey)
	chainMac.Write([]byte("chain-key-next"))
	newChainKey = chainMac.Sum(nil)

	return messageKey, newChainKey, nil
}
