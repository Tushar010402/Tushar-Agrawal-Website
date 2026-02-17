package quantumshield

import (
	"bytes"
	"testing"
)

func TestNewSession(t *testing.T) {
	session, err := NewSession([]byte("shared-secret"))
	if err != nil {
		t.Fatalf("NewSession failed: %v", err)
	}
	if session == nil {
		t.Fatal("NewSession returned nil")
	}
	if session.MessageCount() != 0 {
		t.Fatalf("initial message count: got %d, want 0", session.MessageCount())
	}
}

func TestNewSessionEmpty(t *testing.T) {
	_, err := NewSession([]byte{})
	if err == nil {
		t.Fatal("expected error for empty shared secret")
	}
}

func TestSessionEncryptDecrypt(t *testing.T) {
	secret := []byte("session-shared-secret-for-testing")

	sender, err := NewSession(secret)
	if err != nil {
		t.Fatalf("NewSession(sender) failed: %v", err)
	}

	receiver, err := NewSession(secret)
	if err != nil {
		t.Fatalf("NewSession(receiver) failed: %v", err)
	}

	msg1 := []byte("First message")
	ct1, err := sender.Encrypt(msg1)
	if err != nil {
		t.Fatalf("Encrypt msg1 failed: %v", err)
	}

	pt1, err := receiver.Decrypt(ct1)
	if err != nil {
		t.Fatalf("Decrypt msg1 failed: %v", err)
	}

	if !bytes.Equal(msg1, pt1) {
		t.Fatalf("msg1 mismatch: got %q, want %q", pt1, msg1)
	}

	msg2 := []byte("Second message")
	ct2, err := sender.Encrypt(msg2)
	if err != nil {
		t.Fatalf("Encrypt msg2 failed: %v", err)
	}

	pt2, err := receiver.Decrypt(ct2)
	if err != nil {
		t.Fatalf("Decrypt msg2 failed: %v", err)
	}

	if !bytes.Equal(msg2, pt2) {
		t.Fatalf("msg2 mismatch: got %q, want %q", pt2, msg2)
	}

	if sender.MessageCount() != 2 {
		t.Fatalf("sender message count: got %d, want 2", sender.MessageCount())
	}
	if receiver.MessageCount() != 2 {
		t.Fatalf("receiver message count: got %d, want 2", receiver.MessageCount())
	}
}

func TestSessionMultipleMessages(t *testing.T) {
	secret := []byte("multi-message-test-secret")
	sender, _ := NewSession(secret)
	receiver, _ := NewSession(secret)

	messages := []string{
		"Hello",
		"World",
		"This is message three",
		"And four",
		"Final message number five",
	}

	for i, msg := range messages {
		ct, err := sender.Encrypt([]byte(msg))
		if err != nil {
			t.Fatalf("Encrypt message %d failed: %v", i, err)
		}

		pt, err := receiver.Decrypt(ct)
		if err != nil {
			t.Fatalf("Decrypt message %d failed: %v", i, err)
		}

		if string(pt) != msg {
			t.Fatalf("message %d mismatch: got %q, want %q", i, pt, msg)
		}
	}

	if sender.MessageCount() != uint64(len(messages)) {
		t.Fatalf("sender count: got %d, want %d", sender.MessageCount(), len(messages))
	}
}

func TestSessionOutOfOrder(t *testing.T) {
	secret := []byte("out-of-order-test")
	sender, _ := NewSession(secret)
	receiver, _ := NewSession(secret)

	ct1, _ := sender.Encrypt([]byte("msg1"))
	ct2, _ := sender.Encrypt([]byte("msg2"))

	// Try to decrypt msg2 first — should fail
	_, err := receiver.Decrypt(ct2)
	if err == nil {
		t.Fatal("expected error for out-of-order message")
	}

	// Decrypt msg1 — should succeed
	pt1, err := receiver.Decrypt(ct1)
	if err != nil {
		t.Fatalf("Decrypt msg1 failed after out-of-order attempt: %v", err)
	}
	if !bytes.Equal(pt1, []byte("msg1")) {
		t.Fatalf("msg1 mismatch: got %q", pt1)
	}
}

func TestSessionForwardSecrecy(t *testing.T) {
	// Verify that each message uses a different key by ensuring that
	// ciphertexts of the same plaintext are different.
	secret := []byte("forward-secrecy-test")
	sender, _ := NewSession(secret)

	plaintext := []byte("same plaintext every time")
	ct1, _ := sender.Encrypt(plaintext)
	ct2, _ := sender.Encrypt(plaintext)
	ct3, _ := sender.Encrypt(plaintext)

	if bytes.Equal(ct1, ct2) || bytes.Equal(ct2, ct3) || bytes.Equal(ct1, ct3) {
		t.Fatal("session ciphertexts should differ even for identical plaintexts (key ratcheting)")
	}
}

func TestSessionDifferentSecretsIncompatible(t *testing.T) {
	sender, _ := NewSession([]byte("secret-A"))
	receiver, _ := NewSession([]byte("secret-B"))

	ct, _ := sender.Encrypt([]byte("test"))
	_, err := receiver.Decrypt(ct)
	if err == nil {
		t.Fatal("expected error when decrypting with different shared secret")
	}
}

func TestSessionEmptyMessage(t *testing.T) {
	secret := []byte("empty-message-test")
	sender, _ := NewSession(secret)
	receiver, _ := NewSession(secret)

	ct, err := sender.Encrypt([]byte{})
	if err != nil {
		t.Fatalf("Encrypt empty failed: %v", err)
	}

	pt, err := receiver.Decrypt(ct)
	if err != nil {
		t.Fatalf("Decrypt empty failed: %v", err)
	}

	if len(pt) != 0 {
		t.Fatalf("expected empty plaintext, got %d bytes", len(pt))
	}
}

func TestSessionDecryptTooShort(t *testing.T) {
	receiver, _ := NewSession([]byte("short-test"))

	_, err := receiver.Decrypt([]byte{0x01, 0x02})
	if err == nil {
		t.Fatal("expected error for ciphertext shorter than 8 bytes")
	}
}

func TestSessionMessageCountIncrementsOnBothSides(t *testing.T) {
	secret := []byte("count-test")
	sender, _ := NewSession(secret)
	receiver, _ := NewSession(secret)

	for i := 0; i < 10; i++ {
		ct, _ := sender.Encrypt([]byte("msg"))
		_, _ = receiver.Decrypt(ct)
	}

	if sender.MessageCount() != 10 {
		t.Fatalf("sender count: got %d, want 10", sender.MessageCount())
	}
	if receiver.MessageCount() != 10 {
		t.Fatalf("receiver count: got %d, want 10", receiver.MessageCount())
	}
}

func TestSessionWithKEM(t *testing.T) {
	// Full end-to-end: KEM key exchange -> Session -> Encrypt/Decrypt
	alice, _ := NewKEM()
	bob, _ := NewKEM()

	ct, aliceSecret, _ := alice.Encapsulate(bob.PublicKey())
	bobSecret, _ := bob.Decapsulate(ct)

	aliceSession, err := NewSession(aliceSecret)
	if err != nil {
		t.Fatalf("NewSession(alice) failed: %v", err)
	}

	bobSession, err := NewSession(bobSecret)
	if err != nil {
		t.Fatalf("NewSession(bob) failed: %v", err)
	}

	// Alice sends to Bob
	msg := []byte("Quantum-secure forward-secret message!")
	encrypted, err := aliceSession.Encrypt(msg)
	if err != nil {
		t.Fatalf("Session Encrypt failed: %v", err)
	}

	decrypted, err := bobSession.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("Session Decrypt failed: %v", err)
	}

	if !bytes.Equal(msg, decrypted) {
		t.Fatalf("KEM+Session end-to-end mismatch: got %q, want %q", decrypted, msg)
	}
}

func BenchmarkSessionEncrypt(b *testing.B) {
	sender, _ := NewSession([]byte("bench-session-secret"))
	plaintext := []byte("benchmark session message content")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = sender.Encrypt(plaintext)
	}
}

func BenchmarkSessionRoundTrip(b *testing.B) {
	secret := []byte("bench-roundtrip-secret")
	sender, _ := NewSession(secret)
	receiver, _ := NewSession(secret)
	plaintext := []byte("benchmark roundtrip message")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ct, _ := sender.Encrypt(plaintext)
		_, _ = receiver.Decrypt(ct)
	}
}
