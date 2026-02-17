package quantumshield

import (
	"bytes"
	"crypto/rand"
	"testing"
)

func TestNewCipher(t *testing.T) {
	secret := []byte("test-shared-secret-for-cipher")
	cipher, err := NewCipher(secret)
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}
	if cipher == nil {
		t.Fatal("NewCipher returned nil")
	}
}

func TestNewCipherEmptySecret(t *testing.T) {
	_, err := NewCipher([]byte{})
	if err == nil {
		t.Fatal("expected error for empty secret")
	}
}

func TestNewCipherFromPassword(t *testing.T) {
	cipher, err := NewCipherFromPassword("my-secret-password")
	if err != nil {
		t.Fatalf("NewCipherFromPassword failed: %v", err)
	}
	if cipher == nil {
		t.Fatal("NewCipherFromPassword returned nil")
	}
}

func TestNewCipherFromPasswordEmpty(t *testing.T) {
	_, err := NewCipherFromPassword("")
	if err == nil {
		t.Fatal("expected error for empty password")
	}
}

func TestNewCipherFromPasswordDeterministic(t *testing.T) {
	password := "deterministic-test"

	cipher1, err := NewCipherFromPassword(password)
	if err != nil {
		t.Fatalf("first NewCipherFromPassword failed: %v", err)
	}

	cipher2, err := NewCipherFromPassword(password)
	if err != nil {
		t.Fatalf("second NewCipherFromPassword failed: %v", err)
	}

	// Encrypt with cipher1, decrypt with cipher2 — should work because
	// the same password derives the same keys.
	plaintext := []byte("deterministic password test")
	ct, err := cipher1.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	pt, err := cipher2.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt with same password failed: %v", err)
	}

	if !bytes.Equal(plaintext, pt) {
		t.Fatalf("decrypted plaintext mismatch: got %q, want %q", pt, plaintext)
	}
}

func TestEncryptDecrypt(t *testing.T) {
	cipher, err := NewCipher([]byte("test-key-for-encrypt-decrypt"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	plaintext := []byte("Hello, quantum world!")
	ct, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	// Ciphertext must be larger than plaintext (header + tags)
	if len(ct) <= len(plaintext) {
		t.Fatalf("ciphertext should be larger than plaintext: ct=%d, pt=%d", len(ct), len(plaintext))
	}

	pt, err := cipher.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if !bytes.Equal(plaintext, pt) {
		t.Fatalf("plaintext mismatch: got %q, want %q", pt, plaintext)
	}
}

func TestEncryptDecryptEmpty(t *testing.T) {
	cipher, err := NewCipher([]byte("test-empty-data"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	ct, err := cipher.Encrypt([]byte{})
	if err != nil {
		t.Fatalf("Encrypt empty failed: %v", err)
	}

	pt, err := cipher.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt empty failed: %v", err)
	}

	if len(pt) != 0 {
		t.Fatalf("expected empty plaintext, got %d bytes", len(pt))
	}
}

func TestEncryptDecryptLargeData(t *testing.T) {
	cipher, err := NewCipher([]byte("test-large-data"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	// 1 MB of random data
	plaintext := make([]byte, 1<<20)
	if _, err := rand.Read(plaintext); err != nil {
		t.Fatalf("rand.Read failed: %v", err)
	}

	ct, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt large data failed: %v", err)
	}

	pt, err := cipher.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt large data failed: %v", err)
	}

	if !bytes.Equal(plaintext, pt) {
		t.Fatal("large data plaintext mismatch")
	}
}

func TestEncryptDecryptWithAAD(t *testing.T) {
	cipher, err := NewCipher([]byte("test-aad-key"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	plaintext := []byte("secret message with context")
	aad := []byte("channel-id:12345")

	ct, err := cipher.EncryptWithAAD(plaintext, aad)
	if err != nil {
		t.Fatalf("EncryptWithAAD failed: %v", err)
	}

	// Decrypt with correct AAD
	pt, err := cipher.DecryptWithAAD(ct, aad)
	if err != nil {
		t.Fatalf("DecryptWithAAD failed: %v", err)
	}

	if !bytes.Equal(plaintext, pt) {
		t.Fatalf("plaintext mismatch: got %q, want %q", pt, plaintext)
	}
}

func TestDecryptWithWrongAADFails(t *testing.T) {
	cipher, err := NewCipher([]byte("test-wrong-aad-key"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	plaintext := []byte("context-bound data")
	correctAAD := []byte("correct-context")
	wrongAAD := []byte("wrong-context")

	ct, err := cipher.EncryptWithAAD(plaintext, correctAAD)
	if err != nil {
		t.Fatalf("EncryptWithAAD failed: %v", err)
	}

	// Decrypt with wrong AAD should fail
	_, err = cipher.DecryptWithAAD(ct, wrongAAD)
	if err == nil {
		t.Fatal("expected error when decrypting with wrong AAD")
	}
}

func TestDecryptWithWrongKeyFails(t *testing.T) {
	cipher1, err := NewCipher([]byte("key-one"))
	if err != nil {
		t.Fatalf("NewCipher(key1) failed: %v", err)
	}

	cipher2, err := NewCipher([]byte("key-two"))
	if err != nil {
		t.Fatalf("NewCipher(key2) failed: %v", err)
	}

	ct, err := cipher1.Encrypt([]byte("secret data"))
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = cipher2.Decrypt(ct)
	if err == nil {
		t.Fatal("expected error when decrypting with wrong key")
	}
}

func TestDecryptTamperedCiphertextFails(t *testing.T) {
	cipher, err := NewCipher([]byte("tamper-test-key"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	ct, err := cipher.Encrypt([]byte("original data"))
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	// Tamper with the last byte
	ct[len(ct)-1] ^= 0xFF

	_, err = cipher.Decrypt(ct)
	if err == nil {
		t.Fatal("expected error when decrypting tampered ciphertext")
	}
}

func TestDecryptTruncatedCiphertextFails(t *testing.T) {
	cipher, err := NewCipher([]byte("truncation-test"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	_, err = cipher.Decrypt([]byte{0x01, 0x02, 0x03})
	if err == nil {
		t.Fatal("expected error for truncated ciphertext")
	}
}

func TestDecryptWrongVersionFails(t *testing.T) {
	cipher, err := NewCipher([]byte("version-test"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	ct, err := cipher.Encrypt([]byte("version test"))
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	// Change the version byte
	ct[0] = 0xFF

	_, err = cipher.Decrypt(ct)
	if err == nil {
		t.Fatal("expected error for wrong version byte")
	}
}

func TestEncryptNonDeterministic(t *testing.T) {
	cipher, err := NewCipher([]byte("nondeterministic-test"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	plaintext := []byte("same plaintext")
	ct1, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("first Encrypt failed: %v", err)
	}

	ct2, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("second Encrypt failed: %v", err)
	}

	// Two encryptions of the same plaintext must produce different ciphertexts
	// (because nonces are random)
	if bytes.Equal(ct1, ct2) {
		t.Fatal("two encryptions of the same plaintext produced identical ciphertexts")
	}

	// But both must decrypt to the same plaintext
	pt1, _ := cipher.Decrypt(ct1)
	pt2, _ := cipher.Decrypt(ct2)
	if !bytes.Equal(pt1, pt2) {
		t.Fatal("decrypted plaintexts should match")
	}
}

func TestCipherOverhead(t *testing.T) {
	cipher, err := NewCipher([]byte("overhead-test"))
	if err != nil {
		t.Fatalf("NewCipher failed: %v", err)
	}

	overhead := cipher.Overhead()
	// header (25) + AES-GCM tag (16) + ChaCha-Poly1305 tag (16) = 57
	expected := 25 + 16 + 16
	if overhead != expected {
		t.Fatalf("overhead mismatch: got %d, want %d", overhead, expected)
	}

	// Verify that ciphertext length = plaintext length + overhead
	plaintext := []byte("overhead verification")
	ct, _ := cipher.Encrypt(plaintext)
	if len(ct) != len(plaintext)+overhead {
		t.Fatalf("ciphertext length mismatch: got %d, want %d", len(ct), len(plaintext)+overhead)
	}
}

func TestPasswordBasedEncryptDecrypt(t *testing.T) {
	cipher, err := NewCipherFromPassword("strong-password-123!")
	if err != nil {
		t.Fatalf("NewCipherFromPassword failed: %v", err)
	}

	plaintext := []byte("password-encrypted data")
	ct, err := cipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	pt, err := cipher.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if !bytes.Equal(plaintext, pt) {
		t.Fatalf("plaintext mismatch: got %q, want %q", pt, plaintext)
	}
}

func BenchmarkEncrypt(b *testing.B) {
	cipher, _ := NewCipher([]byte("benchmark-shared-secret-key-123"))
	plaintext := make([]byte, 1024)
	rand.Read(plaintext)

	b.ResetTimer()
	b.SetBytes(int64(len(plaintext)))
	for i := 0; i < b.N; i++ {
		_, _ = cipher.Encrypt(plaintext)
	}
}

func BenchmarkDecrypt(b *testing.B) {
	cipher, _ := NewCipher([]byte("benchmark-shared-secret-key-123"))
	plaintext := make([]byte, 1024)
	rand.Read(plaintext)
	ct, _ := cipher.Encrypt(plaintext)

	b.ResetTimer()
	b.SetBytes(int64(len(plaintext)))
	for i := 0; i < b.N; i++ {
		_, _ = cipher.Decrypt(ct)
	}
}

func BenchmarkEncryptDecrypt4KB(b *testing.B) {
	cipher, _ := NewCipher([]byte("benchmark-4kb-key"))
	plaintext := make([]byte, 4096)
	rand.Read(plaintext)

	b.ResetTimer()
	b.SetBytes(int64(len(plaintext)))
	for i := 0; i < b.N; i++ {
		ct, _ := cipher.Encrypt(plaintext)
		_, _ = cipher.Decrypt(ct)
	}
}
