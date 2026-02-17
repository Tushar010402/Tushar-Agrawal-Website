package quantumshield

import (
	"crypto/rand"
	"crypto/sha512"
	"io"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/hkdf"
)

// QShieldKDF provides key derivation functions for QuantumShield.
//
// Two algorithms are available:
//
//   - Argon2id for password-based key derivation (memory-hard, GPU/ASIC
//     resistant). Use DeriveFromPassword for user-supplied passwords.
//
//   - HKDF-SHA-512 for deriving keys from high-entropy input keying
//     material (e.g. a DH shared secret). Use Derive for key expansion.
type QShieldKDF struct{}

// NewKDF creates a new QShieldKDF instance.
func NewKDF() *QShieldKDF {
	return &QShieldKDF{}
}

// DeriveFromPassword derives a key from a password using Argon2id.
//
// Parameters:
//   - password: the user-supplied password
//   - salt: a random salt (16+ bytes recommended). Must be stored alongside
//     the derived key for later re-derivation.
//
// Argon2id parameters: time=3, memory=19456 KiB (19 MB), threads=1.
// These match the WASM SDK and provide a good balance between security
// and performance across constrained environments.
//
// Returns a 32-byte derived key.
func (k *QShieldKDF) DeriveFromPassword(password string, salt []byte) ([]byte, error) {
	if password == "" {
		return nil, newError("DeriveFromPassword", "password must not be empty", nil)
	}
	if len(salt) == 0 {
		return nil, newError("DeriveFromPassword", "salt must not be empty", nil)
	}

	key := argon2.IDKey([]byte(password), salt, argon2Time, argon2Memory, argon2Threads, 32)
	return key, nil
}

// Derive derives a key from input keying material using HKDF-SHA-512.
//
// Parameters:
//   - ikm: input keying material (should be high-entropy, e.g. a DH secret)
//   - salt: optional salt (can be nil for HKDF's default salt)
//   - info: optional context/application-specific info for domain separation
//   - length: desired output key length in bytes (1..8160)
//
// HKDF is NOT suitable for passwords. Use DeriveFromPassword instead.
func (k *QShieldKDF) Derive(ikm, salt, info []byte, length int) ([]byte, error) {
	if len(ikm) == 0 {
		return nil, newError("Derive", "input keying material must not be empty", nil)
	}
	if length <= 0 {
		return nil, newError("Derive", "length must be positive", nil)
	}
	// HKDF-SHA-512 can produce at most 255 * HashLen = 255 * 64 = 16320 bytes
	maxLen := 255 * sha512.Size
	if length > maxLen {
		return nil, newError("Derive", "requested length exceeds HKDF-SHA-512 maximum", nil)
	}

	reader := hkdf.New(sha512.New, ikm, salt, info)
	key := make([]byte, length)
	if _, err := io.ReadFull(reader, key); err != nil {
		return nil, newError("Derive", "HKDF expansion failed", err)
	}

	return key, nil
}

// DeriveFromPasswordWithParams derives a key from a password with custom
// Argon2id parameters.
//
// This is useful when the default parameters are too slow or too fast
// for your use case, or when you need to match parameters from another
// system.
func (k *QShieldKDF) DeriveFromPasswordWithParams(
	password string,
	salt []byte,
	time, memory uint32,
	threads uint8,
	keyLen uint32,
) ([]byte, error) {
	if password == "" {
		return nil, newError("DeriveFromPasswordWithParams", "password must not be empty", nil)
	}
	if len(salt) == 0 {
		return nil, newError("DeriveFromPasswordWithParams", "salt must not be empty", nil)
	}

	key := argon2.IDKey([]byte(password), salt, time, memory, threads, keyLen)
	return key, nil
}

// GenerateSalt generates a cryptographically random salt of the given
// length. Recommended length is 16 bytes.
func GenerateSalt(length int) ([]byte, error) {
	if length <= 0 {
		return nil, newError("GenerateSalt", "length must be positive", nil)
	}
	salt := make([]byte, length)
	if _, err := io.ReadFull(rand.Reader, salt); err != nil {
		return nil, newError("GenerateSalt", "random generation failed", err)
	}
	return salt, nil
}
