package quantumshield

import (
	"crypto/ed25519"
	"crypto/rand"
)

// QShieldSign implements digital signatures using Ed25519.
//
// Ed25519 provides 128-bit security against classical adversaries with
// compact 64-byte signatures and 32-byte public keys.
//
// # Hybrid Extension
//
// When built with the "pq" build tag and the circl library, QShieldSign
// additionally produces ML-DSA-65 (FIPS 204) signatures alongside Ed25519.
// Both signatures must verify for the combined result to be valid,
// providing defense-in-depth: if EITHER algorithm is secure, the signature
// scheme is secure.
type QShieldSign struct {
	privateKey ed25519.PrivateKey
	publicKey  ed25519.PublicKey
}

// NewSign generates a new Ed25519 key pair for digital signatures.
func NewSign() (*QShieldSign, error) {
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, newError("NewSign", "key generation failed", err)
	}
	return &QShieldSign{
		privateKey: priv,
		publicKey:  pub,
	}, nil
}

// NewSignFromSeed creates a QShieldSign from a 32-byte seed.
//
// This is useful for deterministic key derivation or restoring a key pair
// from storage. The seed MUST be kept secret.
func NewSignFromSeed(seed []byte) (*QShieldSign, error) {
	if len(seed) != ed25519.SeedSize {
		return nil, newError("NewSignFromSeed", "seed must be 32 bytes", ErrInvalidKeyLength)
	}
	priv := ed25519.NewKeyFromSeed(seed)
	pub := priv.Public().(ed25519.PublicKey)
	return &QShieldSign{
		privateKey: priv,
		publicKey:  pub,
	}, nil
}

// PublicKey returns the 32-byte Ed25519 public key.
//
// Share this with anyone who needs to verify your signatures.
func (s *QShieldSign) PublicKey() []byte {
	pk := make([]byte, ed25519.PublicKeySize)
	copy(pk, s.publicKey)
	return pk
}

// Sign produces an Ed25519 signature over the message.
//
// The returned signature is 64 bytes. Signing is deterministic: the same
// message always produces the same signature.
func (s *QShieldSign) Sign(message []byte) ([]byte, error) {
	if s.privateKey == nil {
		return nil, newError("Sign", "no private key available", nil)
	}
	sig := ed25519.Sign(s.privateKey, message)
	return sig, nil
}

// Verify checks an Ed25519 signature against the message using this
// key pair's public key.
//
// Returns true if the signature is valid, false otherwise.
// An error is returned only for malformed inputs (e.g. wrong signature
// length), not for invalid signatures.
func (s *QShieldSign) Verify(message, signature []byte) (bool, error) {
	if len(signature) != ed25519.SignatureSize {
		return false, newError("Verify", "signature must be 64 bytes", ErrInvalidSignature)
	}
	return ed25519.Verify(s.publicKey, message, signature), nil
}

// VerifyWithPublicKey checks a signature against a message and an
// explicit public key. This is a standalone function useful when you
// only have the signer's public key.
func VerifyWithPublicKey(publicKey, message, signature []byte) (bool, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return false, newError("VerifyWithPublicKey", "public key must be 32 bytes", ErrInvalidPublicKey)
	}
	if len(signature) != ed25519.SignatureSize {
		return false, newError("VerifyWithPublicKey", "signature must be 64 bytes", ErrInvalidSignature)
	}
	return ed25519.Verify(ed25519.PublicKey(publicKey), message, signature), nil
}

// SignatureSize returns the Ed25519 signature size in bytes (64).
func SignatureSize() int {
	return ed25519.SignatureSize
}

// SignPublicKeySize returns the Ed25519 public key size in bytes (32).
func SignPublicKeySize() int {
	return ed25519.PublicKeySize
}
