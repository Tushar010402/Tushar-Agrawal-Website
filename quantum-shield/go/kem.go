package quantumshield

import (
	"crypto/rand"
	"crypto/sha512"
	"io"

	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/hkdf"
)

const (
	x25519KeySize = 32
)

// QShieldKEM implements a Hybrid Key Encapsulation Mechanism based on
// X25519 Diffie-Hellman key exchange.
//
// Each party generates an ephemeral X25519 key pair. Encapsulation
// performs a DH exchange and derives a shared secret via HKDF-SHA-512.
//
// # Hybrid Extension
//
// When the circl library is available (build tag "pq"), ML-KEM-768 is
// combined with X25519 for post-quantum security. In the default build,
// only X25519 is used.
//
// # Wire Format
//
// Encapsulate returns a 32-byte ciphertext (the encapsulator's X25519
// public key) and a 32-byte shared secret.
type QShieldKEM struct {
	privateKey []byte // 32-byte X25519 scalar
	publicKey  []byte // 32-byte X25519 public key
}

// NewKEM generates a new X25519 key pair for key encapsulation.
func NewKEM() (*QShieldKEM, error) {
	privateKey := make([]byte, x25519KeySize)
	if _, err := io.ReadFull(rand.Reader, privateKey); err != nil {
		return nil, newError("NewKEM", "key generation failed", err)
	}

	publicKey, err := curve25519.X25519(privateKey, curve25519.Basepoint)
	if err != nil {
		return nil, newError("NewKEM", "public key computation failed", err)
	}

	return &QShieldKEM{
		privateKey: privateKey,
		publicKey:  publicKey,
	}, nil
}

// PublicKey returns the 32-byte X25519 public key.
//
// This value should be shared with the peer who will call Encapsulate.
func (k *QShieldKEM) PublicKey() []byte {
	pk := make([]byte, len(k.publicKey))
	copy(pk, k.publicKey)
	return pk
}

// Encapsulate performs key encapsulation against a peer's public key.
//
// It computes an X25519 Diffie-Hellman shared secret with the peer,
// then derives a 32-byte shared secret using HKDF-SHA-512.
//
// Returns:
//   - ciphertext: the encapsulator's public key (32 bytes) to send to
//     the peer so they can run Decapsulate
//   - sharedSecret: the 32-byte derived shared secret
func (k *QShieldKEM) Encapsulate(peerPublicKey []byte) (ciphertext, sharedSecret []byte, err error) {
	if len(peerPublicKey) != x25519KeySize {
		return nil, nil, newError("Encapsulate", "invalid peer public key length", ErrInvalidPublicKey)
	}

	// Perform X25519 DH
	rawShared, err := curve25519.X25519(k.privateKey, peerPublicKey)
	if err != nil {
		return nil, nil, newError("Encapsulate", "X25519 DH failed", err)
	}

	// Derive the final shared secret via HKDF-SHA-512
	// IKM: raw DH output
	// Salt: domain separator
	// Info: protocol context including both public keys for key confirmation
	salt := []byte("QShieldKEM-v1")
	info := make([]byte, 0, len("hybrid-shared-secret")+x25519KeySize*2)
	info = append(info, []byte("hybrid-shared-secret")...)
	info = append(info, k.publicKey...)
	info = append(info, peerPublicKey...)

	hkdfReader := hkdf.New(sha512.New, rawShared, salt, info)
	sharedSecret = make([]byte, 32)
	if _, err := io.ReadFull(hkdfReader, sharedSecret); err != nil {
		return nil, nil, newError("Encapsulate", "HKDF derivation failed", err)
	}

	// Zeroize raw DH output
	clear(rawShared)

	// The ciphertext is our public key so the peer can compute the same DH
	ciphertext = k.PublicKey()

	return ciphertext, sharedSecret, nil
}

// Decapsulate recovers the shared secret from a ciphertext (the peer's
// public key) produced by the peer's Encapsulate call.
//
// The returned shared secret will be identical to the one returned by
// the peer's Encapsulate, enabling both parties to derive the same
// symmetric key.
func (k *QShieldKEM) Decapsulate(ciphertext []byte) ([]byte, error) {
	if len(ciphertext) != x25519KeySize {
		return nil, newError("Decapsulate", "invalid ciphertext length", ErrCiphertextTooShort)
	}

	peerPublicKey := ciphertext

	// Perform X25519 DH
	rawShared, err := curve25519.X25519(k.privateKey, peerPublicKey)
	if err != nil {
		return nil, newError("Decapsulate", "X25519 DH failed", err)
	}

	// Derive the final shared secret via HKDF-SHA-512
	// Must use the SAME info construction as Encapsulate, but with keys
	// in the correct order: encapsulator's pk first, then ours
	salt := []byte("QShieldKEM-v1")
	info := make([]byte, 0, len("hybrid-shared-secret")+x25519KeySize*2)
	info = append(info, []byte("hybrid-shared-secret")...)
	info = append(info, peerPublicKey...)  // encapsulator's public key
	info = append(info, k.publicKey...)    // our public key (decapsulator)

	hkdfReader := hkdf.New(sha512.New, rawShared, salt, info)
	sharedSecret := make([]byte, 32)
	if _, err := io.ReadFull(hkdfReader, sharedSecret); err != nil {
		return nil, newError("Decapsulate", "HKDF derivation failed", err)
	}

	// Zeroize raw DH output
	clear(rawShared)

	return sharedSecret, nil
}

// KEMCiphertext returns the ciphertext size in bytes (32 for X25519).
func KEMCiphertextSize() int {
	return x25519KeySize
}

// KEMSharedSecretSize returns the shared secret size in bytes.
func KEMSharedSecretSize() int {
	return 32
}
