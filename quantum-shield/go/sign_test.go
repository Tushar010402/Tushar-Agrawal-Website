package quantumshield

import (
	"bytes"
	"crypto/rand"
	"testing"
)

func TestNewSign(t *testing.T) {
	signer, err := NewSign()
	if err != nil {
		t.Fatalf("NewSign failed: %v", err)
	}
	if signer == nil {
		t.Fatal("NewSign returned nil")
	}
}

func TestSignPublicKeyLength(t *testing.T) {
	signer, err := NewSign()
	if err != nil {
		t.Fatalf("NewSign failed: %v", err)
	}
	pk := signer.PublicKey()
	if len(pk) != 32 {
		t.Fatalf("public key length: got %d, want 32", len(pk))
	}
}

func TestSignPublicKeyImmutable(t *testing.T) {
	signer, _ := NewSign()
	pk1 := signer.PublicKey()
	pk2 := signer.PublicKey()

	if !bytes.Equal(pk1, pk2) {
		t.Fatal("PublicKey() returned different values")
	}

	pk1[0] ^= 0xFF
	pk3 := signer.PublicKey()
	if bytes.Equal(pk1, pk3) {
		t.Fatal("modifying returned public key affected internal state")
	}
}

func TestNewSignFromSeed(t *testing.T) {
	seed := make([]byte, 32)
	rand.Read(seed)

	signer1, err := NewSignFromSeed(seed)
	if err != nil {
		t.Fatalf("NewSignFromSeed failed: %v", err)
	}

	signer2, err := NewSignFromSeed(seed)
	if err != nil {
		t.Fatalf("second NewSignFromSeed failed: %v", err)
	}

	// Same seed produces same key pair
	if !bytes.Equal(signer1.PublicKey(), signer2.PublicKey()) {
		t.Fatal("same seed produced different public keys")
	}

	// Sign with signer1, verify with signer2
	msg := []byte("seed determinism test")
	sig, _ := signer1.Sign(msg)
	ok, _ := signer2.Verify(msg, sig)
	if !ok {
		t.Fatal("cross-signer verification failed with same seed")
	}
}

func TestNewSignFromSeedInvalidLength(t *testing.T) {
	_, err := NewSignFromSeed([]byte{0x01, 0x02, 0x03})
	if err == nil {
		t.Fatal("expected error for invalid seed length")
	}
}

func TestSignAndVerify(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("Hello, QuantumShield!")

	sig, err := signer.Sign(message)
	if err != nil {
		t.Fatalf("Sign failed: %v", err)
	}

	if len(sig) != 64 {
		t.Fatalf("signature length: got %d, want 64", len(sig))
	}

	ok, err := signer.Verify(message, sig)
	if err != nil {
		t.Fatalf("Verify failed: %v", err)
	}
	if !ok {
		t.Fatal("signature verification failed")
	}
}

func TestSignDeterministic(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("deterministic signature")

	sig1, _ := signer.Sign(message)
	sig2, _ := signer.Sign(message)

	// Ed25519 signing is deterministic
	if !bytes.Equal(sig1, sig2) {
		t.Fatal("Ed25519 signatures should be deterministic")
	}
}

func TestVerifyWrongMessage(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("correct message")
	wrong := []byte("wrong message")

	sig, _ := signer.Sign(message)
	ok, _ := signer.Verify(wrong, sig)
	if ok {
		t.Fatal("verification should fail for wrong message")
	}
}

func TestVerifyWrongSignature(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("test message")

	sig, _ := signer.Sign(message)

	// Tamper with signature
	sig[0] ^= 0xFF

	ok, _ := signer.Verify(message, sig)
	if ok {
		t.Fatal("verification should fail for tampered signature")
	}
}

func TestVerifyWrongKey(t *testing.T) {
	signer1, _ := NewSign()
	signer2, _ := NewSign()
	message := []byte("key isolation test")

	sig, _ := signer1.Sign(message)

	// Verify with wrong key
	ok, _ := signer2.Verify(message, sig)
	if ok {
		t.Fatal("verification should fail with wrong public key")
	}
}

func TestVerifyInvalidSignatureLength(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("length test")

	_, err := signer.Verify(message, []byte{0x01, 0x02, 0x03})
	if err == nil {
		t.Fatal("expected error for invalid signature length")
	}
}

func TestVerifyWithPublicKey(t *testing.T) {
	signer, _ := NewSign()
	message := []byte("standalone verify test")

	sig, _ := signer.Sign(message)
	pk := signer.PublicKey()

	ok, err := VerifyWithPublicKey(pk, message, sig)
	if err != nil {
		t.Fatalf("VerifyWithPublicKey failed: %v", err)
	}
	if !ok {
		t.Fatal("standalone verification failed")
	}
}

func TestVerifyWithPublicKeyWrongKey(t *testing.T) {
	signer, _ := NewSign()
	other, _ := NewSign()
	message := []byte("wrong key test")

	sig, _ := signer.Sign(message)

	ok, _ := VerifyWithPublicKey(other.PublicKey(), message, sig)
	if ok {
		t.Fatal("verification should fail with wrong public key")
	}
}

func TestVerifyWithPublicKeyInvalidKeyLength(t *testing.T) {
	_, err := VerifyWithPublicKey([]byte{0x01}, []byte("msg"), make([]byte, 64))
	if err == nil {
		t.Fatal("expected error for invalid public key length")
	}
}

func TestVerifyWithPublicKeyInvalidSigLength(t *testing.T) {
	pk := make([]byte, 32)
	_, err := VerifyWithPublicKey(pk, []byte("msg"), []byte{0x01})
	if err == nil {
		t.Fatal("expected error for invalid signature length")
	}
}

func TestSignatureSize(t *testing.T) {
	if SignatureSize() != 64 {
		t.Fatalf("SignatureSize: got %d, want 64", SignatureSize())
	}
}

func TestSignPublicKeySize(t *testing.T) {
	if SignPublicKeySize() != 32 {
		t.Fatalf("SignPublicKeySize: got %d, want 32", SignPublicKeySize())
	}
}

func TestSignEmptyMessage(t *testing.T) {
	signer, _ := NewSign()

	sig, err := signer.Sign([]byte{})
	if err != nil {
		t.Fatalf("Sign empty message failed: %v", err)
	}

	ok, _ := signer.Verify([]byte{}, sig)
	if !ok {
		t.Fatal("verification of empty message failed")
	}
}

func TestSignLargeMessage(t *testing.T) {
	signer, _ := NewSign()
	message := make([]byte, 1<<20) // 1 MB
	rand.Read(message)

	sig, err := signer.Sign(message)
	if err != nil {
		t.Fatalf("Sign large message failed: %v", err)
	}

	ok, _ := signer.Verify(message, sig)
	if !ok {
		t.Fatal("verification of large message failed")
	}
}

func BenchmarkSign(b *testing.B) {
	signer, _ := NewSign()
	message := []byte("benchmark message for signing")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = signer.Sign(message)
	}
}

func BenchmarkVerify(b *testing.B) {
	signer, _ := NewSign()
	message := []byte("benchmark message for verification")
	sig, _ := signer.Sign(message)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = signer.Verify(message, sig)
	}
}
