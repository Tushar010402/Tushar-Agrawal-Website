package quantumshield

import (
	"bytes"
	"testing"
)

func TestNewKEM(t *testing.T) {
	kem, err := NewKEM()
	if err != nil {
		t.Fatalf("NewKEM failed: %v", err)
	}
	if kem == nil {
		t.Fatal("NewKEM returned nil")
	}
}

func TestKEMPublicKeyLength(t *testing.T) {
	kem, err := NewKEM()
	if err != nil {
		t.Fatalf("NewKEM failed: %v", err)
	}
	pk := kem.PublicKey()
	if len(pk) != 32 {
		t.Fatalf("public key length: got %d, want 32", len(pk))
	}
}

func TestKEMPublicKeyImmutable(t *testing.T) {
	kem, err := NewKEM()
	if err != nil {
		t.Fatalf("NewKEM failed: %v", err)
	}

	pk1 := kem.PublicKey()
	pk2 := kem.PublicKey()

	// Should be equal
	if !bytes.Equal(pk1, pk2) {
		t.Fatal("PublicKey() returned different values")
	}

	// Modifying the returned slice should not affect the internal key
	pk1[0] ^= 0xFF
	pk3 := kem.PublicKey()
	if bytes.Equal(pk1, pk3) {
		t.Fatal("modifying returned public key affected internal state")
	}
}

func TestKEMEncapsulateDecapsulate(t *testing.T) {
	alice, err := NewKEM()
	if err != nil {
		t.Fatalf("NewKEM(alice) failed: %v", err)
	}

	bob, err := NewKEM()
	if err != nil {
		t.Fatalf("NewKEM(bob) failed: %v", err)
	}

	// Alice encapsulates to Bob
	ct, aliceShared, err := alice.Encapsulate(bob.PublicKey())
	if err != nil {
		t.Fatalf("Encapsulate failed: %v", err)
	}

	if len(ct) != 32 {
		t.Fatalf("ciphertext length: got %d, want 32", len(ct))
	}

	if len(aliceShared) != 32 {
		t.Fatalf("shared secret length: got %d, want 32", len(aliceShared))
	}

	// Bob decapsulates
	bobShared, err := bob.Decapsulate(ct)
	if err != nil {
		t.Fatalf("Decapsulate failed: %v", err)
	}

	if !bytes.Equal(aliceShared, bobShared) {
		t.Fatalf("shared secrets do not match:\n  alice: %x\n  bob:   %x", aliceShared, bobShared)
	}
}

func TestKEMDifferentKeysProduceDifferentSecrets(t *testing.T) {
	alice, _ := NewKEM()
	bob1, _ := NewKEM()
	bob2, _ := NewKEM()

	_, shared1, _ := alice.Encapsulate(bob1.PublicKey())
	_, shared2, _ := alice.Encapsulate(bob2.PublicKey())

	if bytes.Equal(shared1, shared2) {
		t.Fatal("different peer keys produced the same shared secret")
	}
}

func TestKEMEncapsulateInvalidKeyLength(t *testing.T) {
	kem, _ := NewKEM()

	// Too short
	_, _, err := kem.Encapsulate([]byte{0x01, 0x02, 0x03})
	if err == nil {
		t.Fatal("expected error for short key")
	}

	// Too long
	longKey := make([]byte, 64)
	_, _, err = kem.Encapsulate(longKey)
	if err == nil {
		t.Fatal("expected error for long key")
	}
}

func TestKEMDecapsulateInvalidCiphertextLength(t *testing.T) {
	kem, _ := NewKEM()

	_, err := kem.Decapsulate([]byte{0x01, 0x02})
	if err == nil {
		t.Fatal("expected error for short ciphertext")
	}
}

func TestKEMEndToEndWithCipher(t *testing.T) {
	alice, _ := NewKEM()
	bob, _ := NewKEM()

	// Key exchange
	ct, aliceSecret, err := alice.Encapsulate(bob.PublicKey())
	if err != nil {
		t.Fatalf("Encapsulate failed: %v", err)
	}

	bobSecret, err := bob.Decapsulate(ct)
	if err != nil {
		t.Fatalf("Decapsulate failed: %v", err)
	}

	// Both parties create ciphers from their shared secrets
	aliceCipher, err := NewCipher(aliceSecret)
	if err != nil {
		t.Fatalf("NewCipher(alice) failed: %v", err)
	}

	bobCipher, err := NewCipher(bobSecret)
	if err != nil {
		t.Fatalf("NewCipher(bob) failed: %v", err)
	}

	// Alice encrypts, Bob decrypts
	plaintext := []byte("Hello from Alice to Bob via KEM!")
	encrypted, err := aliceCipher.Encrypt(plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	decrypted, err := bobCipher.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if !bytes.Equal(plaintext, decrypted) {
		t.Fatalf("end-to-end mismatch: got %q, want %q", decrypted, plaintext)
	}

	// Bob encrypts, Alice decrypts
	bobMessage := []byte("Hello from Bob to Alice via KEM!")
	encrypted2, _ := bobCipher.Encrypt(bobMessage)
	decrypted2, err := aliceCipher.Decrypt(encrypted2)
	if err != nil {
		t.Fatalf("reverse Decrypt failed: %v", err)
	}
	if !bytes.Equal(bobMessage, decrypted2) {
		t.Fatalf("reverse end-to-end mismatch")
	}
}

func TestKEMCiphertextSize(t *testing.T) {
	if KEMCiphertextSize() != 32 {
		t.Fatalf("KEMCiphertextSize: got %d, want 32", KEMCiphertextSize())
	}
}

func TestKEMSharedSecretSize(t *testing.T) {
	if KEMSharedSecretSize() != 32 {
		t.Fatalf("KEMSharedSecretSize: got %d, want 32", KEMSharedSecretSize())
	}
}

func BenchmarkKEMKeyGen(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, _ = NewKEM()
	}
}

func BenchmarkKEMEncapsulate(b *testing.B) {
	alice, _ := NewKEM()
	bob, _ := NewKEM()
	pk := bob.PublicKey()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _, _ = alice.Encapsulate(pk)
	}
}

func BenchmarkKEMDecapsulate(b *testing.B) {
	alice, _ := NewKEM()
	bob, _ := NewKEM()
	ct, _, _ := alice.Encapsulate(bob.PublicKey())

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = bob.Decapsulate(ct)
	}
}
