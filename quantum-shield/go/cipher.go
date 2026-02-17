package quantumshield

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha512"
	"io"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/chacha20poly1305"
	"golang.org/x/crypto/hkdf"
)

// QShieldCipher implements cascading symmetric encryption using
// AES-256-GCM followed by ChaCha20-Poly1305.
//
// Plaintext is first encrypted with AES-256-GCM, then the resulting
// ciphertext (including the AES authentication tag) is encrypted again
// with ChaCha20-Poly1305. An attacker must break BOTH ciphers to
// recover any plaintext.
//
// Two independent keys are derived from a single shared secret using
// HKDF-SHA-512 with domain-separated info strings, ensuring
// cryptographic independence between layers.
type QShieldCipher struct {
	aesGCM    cipher.AEAD
	chachaPoly cipher.AEAD
}

// NewCipher creates a QShieldCipher from a shared secret (e.g. from KEM).
//
// Keys are derived via HKDF-SHA-512:
//
//	AES key    = HKDF(secret, salt="quantum-shield-v1", info="quantum-shield-aes")
//	ChaCha key = HKDF(secret, salt="quantum-shield-v1", info="quantum-shield-chacha")
func NewCipher(sharedSecret []byte) (*QShieldCipher, error) {
	if len(sharedSecret) == 0 {
		return nil, newError("NewCipher", "shared secret must not be empty", nil)
	}

	salt := []byte("quantum-shield-v1")

	// Derive AES-256 key
	aesKeyReader := hkdf.New(sha512.New, sharedSecret, salt, []byte("quantum-shield-aes"))
	aesKey := make([]byte, aesKeySize)
	if _, err := io.ReadFull(aesKeyReader, aesKey); err != nil {
		return nil, newError("NewCipher", "AES key derivation failed", err)
	}

	// Derive ChaCha20-Poly1305 key
	chachaKeyReader := hkdf.New(sha512.New, sharedSecret, salt, []byte("quantum-shield-chacha"))
	chachaKey := make([]byte, chachaKeySize)
	if _, err := io.ReadFull(chachaKeyReader, chachaKey); err != nil {
		return nil, newError("NewCipher", "ChaCha key derivation failed", err)
	}

	// Create AES-256-GCM AEAD
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, newError("NewCipher", "AES cipher creation failed", err)
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, newError("NewCipher", "AES-GCM creation failed", err)
	}

	// Create ChaCha20-Poly1305 AEAD
	chachaPoly, err := chacha20poly1305.New(chachaKey)
	if err != nil {
		return nil, newError("NewCipher", "ChaCha20-Poly1305 creation failed", err)
	}

	// Zeroize key material
	clear(aesKey)
	clear(chachaKey)

	return &QShieldCipher{
		aesGCM:     aesGCM,
		chachaPoly: chachaPoly,
	}, nil
}

// NewCipherFromPassword creates a QShieldCipher from a password using
// Argon2id for key derivation.
//
// Parameters: time=3, memory=19456 KiB (19 MB), threads=1, output=64 bytes.
// The first 32 bytes become the AES-256-GCM key; the last 32 bytes become
// the ChaCha20-Poly1305 key.
//
// A deterministic salt is derived from the password via HKDF-SHA-512 so
// that the same password always produces the same keys (this is intentional
// for password-based encryption where the salt is not stored separately).
func NewCipherFromPassword(password string) (*QShieldCipher, error) {
	if password == "" {
		return nil, newError("NewCipherFromPassword", "password must not be empty", nil)
	}

	// Derive a deterministic salt from the password (matches WASM SDK behaviour)
	saltReader := hkdf.New(sha512.New, []byte(password), nil, []byte("QShield-salt-v1"))
	salt := make([]byte, 16)
	if _, err := io.ReadFull(saltReader, salt); err != nil {
		return nil, newError("NewCipherFromPassword", "salt derivation failed", err)
	}

	// Argon2id: derive 64 bytes of key material
	keyMaterial := argon2.IDKey([]byte(password), salt, argon2Time, argon2Memory, argon2Threads, argon2KeyLen)

	aesKey := keyMaterial[:32]
	chachaKey := keyMaterial[32:]

	// Create AES-256-GCM AEAD
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, newError("NewCipherFromPassword", "AES cipher creation failed", err)
	}
	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return nil, newError("NewCipherFromPassword", "AES-GCM creation failed", err)
	}

	// Create ChaCha20-Poly1305 AEAD
	chachaPoly, err := chacha20poly1305.New(chachaKey)
	if err != nil {
		return nil, newError("NewCipherFromPassword", "ChaCha20-Poly1305 creation failed", err)
	}

	// Zeroize key material
	clear(keyMaterial)

	return &QShieldCipher{
		aesGCM:     aesGCM,
		chachaPoly: chachaPoly,
	}, nil
}

// Encrypt encrypts plaintext using cascading AES-256-GCM then
// ChaCha20-Poly1305 with no additional authenticated data.
//
// The returned ciphertext format is:
//
//	[version(1)] [aes_nonce(12)] [chacha_nonce(12)] [chacha_ciphertext(...)]
//
// where chacha_ciphertext wraps the AES-GCM ciphertext (which includes
// the AES authentication tag).
func (c *QShieldCipher) Encrypt(plaintext []byte) ([]byte, error) {
	return c.EncryptWithAAD(plaintext, nil)
}

// Decrypt decrypts ciphertext produced by Encrypt.
func (c *QShieldCipher) Decrypt(ciphertext []byte) ([]byte, error) {
	return c.DecryptWithAAD(ciphertext, nil)
}

// EncryptWithAAD encrypts plaintext with additional authenticated data.
//
// AAD is authenticated but NOT encrypted. It binds the ciphertext to a
// context (e.g. a user ID, channel name, or message sequence number) so
// that the ciphertext cannot be replayed in a different context.
func (c *QShieldCipher) EncryptWithAAD(plaintext, aad []byte) ([]byte, error) {
	// Generate random nonces
	aesNonce := make([]byte, nonceSize)
	if _, err := io.ReadFull(rand.Reader, aesNonce); err != nil {
		return nil, newError("Encrypt", "nonce generation failed", err)
	}
	chachaNonce := make([]byte, nonceSize)
	if _, err := io.ReadFull(rand.Reader, chachaNonce); err != nil {
		return nil, newError("Encrypt", "nonce generation failed", err)
	}

	// Layer 1: AES-256-GCM
	aesCiphertext := c.aesGCM.Seal(nil, aesNonce, plaintext, aad)

	// Layer 2: ChaCha20-Poly1305 wrapping the AES ciphertext
	chachaCiphertext := c.chachaPoly.Seal(nil, chachaNonce, aesCiphertext, aad)

	// Assemble: [version][aes_nonce][chacha_nonce][chacha_ciphertext]
	result := make([]byte, 0, headerSize+len(chachaCiphertext))
	result = append(result, ProtocolVersion)
	result = append(result, aesNonce...)
	result = append(result, chachaNonce...)
	result = append(result, chachaCiphertext...)

	return result, nil
}

// DecryptWithAAD decrypts ciphertext produced by EncryptWithAAD.
//
// The AAD must match the value used during encryption or decryption
// will fail with an authentication error.
func (c *QShieldCipher) DecryptWithAAD(ciphertext, aad []byte) ([]byte, error) {
	// Minimum: header + at least one AES-GCM block (16-byte tag) + ChaCha tag (16 bytes)
	minLen := headerSize + c.aesGCM.Overhead() + c.chachaPoly.Overhead()
	if len(ciphertext) < minLen {
		return nil, newError("Decrypt", "ciphertext too short", ErrCiphertextTooShort)
	}

	version := ciphertext[0]
	if version != ProtocolVersion {
		return nil, newError("Decrypt", "unsupported version", ErrInvalidVersion)
	}

	aesNonce := ciphertext[1 : 1+nonceSize]
	chachaNonce := ciphertext[1+nonceSize : headerSize]
	encrypted := ciphertext[headerSize:]

	// Reverse order: ChaCha20-Poly1305 first, then AES-256-GCM
	aesCiphertext, err := c.chachaPoly.Open(nil, chachaNonce, encrypted, aad)
	if err != nil {
		return nil, newError("Decrypt", "ChaCha20-Poly1305 decryption failed", ErrDecryptionFailed)
	}

	plaintext, err := c.aesGCM.Open(nil, aesNonce, aesCiphertext, aad)
	if err != nil {
		return nil, newError("Decrypt", "AES-256-GCM decryption failed", ErrDecryptionFailed)
	}

	return plaintext, nil
}

// Overhead returns the total ciphertext overhead in bytes (header + auth tags).
// The ciphertext length equals len(plaintext) + Overhead().
func (c *QShieldCipher) Overhead() int {
	// header + AES-GCM tag (16) + ChaCha-Poly1305 tag (16)
	return headerSize + c.aesGCM.Overhead() + c.chachaPoly.Overhead()
}
