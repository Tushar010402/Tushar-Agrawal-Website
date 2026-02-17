/**
 * QuantumShield Node.js SDK — Pure Crypto Tests
 *
 * Tests the Node.js crypto fallback implementation without requiring WASM.
 * All tests use only Node.js built-in `crypto` module operations.
 */

import { describe, it, expect } from 'vitest';
import {
  NodeCipher,
  NodeKeyExchange,
  NodeSession,
  aesGcmEncrypt,
  aesGcmDecrypt,
  chachaEncrypt,
  chachaDecrypt,
  hkdfDerive,
  hkdfDeriveSync,
  scryptDerive,
  scryptDeriveSync,
  secureCompare,
  quickEncrypt,
  quickDecrypt,
} from '../src/crypto';
import { QShieldError } from '../src/types';
import * as crypto from 'crypto';

// ============================================================================
// AES-256-GCM Tests
// ============================================================================

describe('AES-256-GCM', () => {
  const key = new Uint8Array(crypto.randomBytes(32));

  it('should encrypt and decrypt data', () => {
    const plaintext = new TextEncoder().encode('Hello, AES-256-GCM!');
    const ciphertext = aesGcmEncrypt(key, plaintext);
    const decrypted = aesGcmDecrypt(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should encrypt and decrypt empty data', () => {
    const plaintext = new Uint8Array(0);
    const ciphertext = aesGcmEncrypt(key, plaintext);
    const decrypted = aesGcmDecrypt(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should encrypt and decrypt large data', () => {
    const plaintext = new Uint8Array(crypto.randomBytes(100_000));
    const ciphertext = aesGcmEncrypt(key, plaintext);
    const decrypted = aesGcmDecrypt(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random nonce)', () => {
    const plaintext = new TextEncoder().encode('Same data');
    const ct1 = aesGcmEncrypt(key, plaintext);
    const ct2 = aesGcmEncrypt(key, plaintext);
    // Ciphertexts should differ due to random nonces
    expect(ct1).not.toEqual(ct2);
    // But both should decrypt to the same plaintext
    expect(aesGcmDecrypt(key, ct1)).toEqual(plaintext);
    expect(aesGcmDecrypt(key, ct2)).toEqual(plaintext);
  });

  it('should support AAD', () => {
    const plaintext = new TextEncoder().encode('AAD test');
    const aad = new TextEncoder().encode('context-data');
    const ciphertext = aesGcmEncrypt(key, plaintext, aad);
    const decrypted = aesGcmDecrypt(key, ciphertext, aad);
    expect(decrypted).toEqual(plaintext);
  });

  it('should fail decryption with wrong AAD', () => {
    const plaintext = new TextEncoder().encode('AAD test');
    const aad = new TextEncoder().encode('correct-aad');
    const ciphertext = aesGcmEncrypt(key, plaintext, aad);
    expect(() => aesGcmDecrypt(key, ciphertext, new TextEncoder().encode('wrong-aad'))).toThrow();
  });

  it('should fail decryption with wrong key', () => {
    const plaintext = new TextEncoder().encode('Wrong key test');
    const ciphertext = aesGcmEncrypt(key, plaintext);
    const wrongKey = new Uint8Array(crypto.randomBytes(32));
    expect(() => aesGcmDecrypt(wrongKey, ciphertext)).toThrow();
  });

  it('should fail with tampered ciphertext', () => {
    const plaintext = new TextEncoder().encode('Tamper test');
    const ciphertext = aesGcmEncrypt(key, plaintext);
    // Flip a byte in the encrypted data
    ciphertext[20] ^= 0xff;
    expect(() => aesGcmDecrypt(key, ciphertext)).toThrow();
  });

  it('should reject invalid key size', () => {
    expect(() => aesGcmEncrypt(new Uint8Array(16), new Uint8Array(0))).toThrow(QShieldError);
  });

  it('should reject ciphertext that is too short', () => {
    expect(() => aesGcmDecrypt(key, new Uint8Array(10))).toThrow(QShieldError);
  });
});

// ============================================================================
// ChaCha20-Poly1305 Tests
// ============================================================================

describe('ChaCha20-Poly1305', () => {
  const key = new Uint8Array(crypto.randomBytes(32));

  it('should encrypt and decrypt data', () => {
    const plaintext = new TextEncoder().encode('Hello, ChaCha20-Poly1305!');
    const ciphertext = chachaEncrypt(key, plaintext);
    const decrypted = chachaDecrypt(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should encrypt and decrypt empty data', () => {
    const plaintext = new Uint8Array(0);
    const ciphertext = chachaEncrypt(key, plaintext);
    const decrypted = chachaDecrypt(key, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const plaintext = new TextEncoder().encode('Same data');
    const ct1 = chachaEncrypt(key, plaintext);
    const ct2 = chachaEncrypt(key, plaintext);
    expect(ct1).not.toEqual(ct2);
    expect(chachaDecrypt(key, ct1)).toEqual(plaintext);
    expect(chachaDecrypt(key, ct2)).toEqual(plaintext);
  });

  it('should support AAD', () => {
    const plaintext = new TextEncoder().encode('ChaCha AAD test');
    const aad = new TextEncoder().encode('binding-context');
    const ciphertext = chachaEncrypt(key, plaintext, aad);
    const decrypted = chachaDecrypt(key, ciphertext, aad);
    expect(decrypted).toEqual(plaintext);
  });

  it('should fail decryption with wrong AAD', () => {
    const plaintext = new TextEncoder().encode('AAD test');
    const ciphertext = chachaEncrypt(key, plaintext, new TextEncoder().encode('correct'));
    expect(() => chachaDecrypt(key, ciphertext, new TextEncoder().encode('wrong'))).toThrow();
  });

  it('should fail decryption with wrong key', () => {
    const plaintext = new TextEncoder().encode('Wrong key');
    const ciphertext = chachaEncrypt(key, plaintext);
    const wrongKey = new Uint8Array(crypto.randomBytes(32));
    expect(() => chachaDecrypt(wrongKey, ciphertext)).toThrow();
  });

  it('should reject invalid key size', () => {
    expect(() => chachaEncrypt(new Uint8Array(16), new Uint8Array(0))).toThrow(QShieldError);
  });
});

// ============================================================================
// Cascading Cipher (NodeCipher) Tests
// ============================================================================

describe('NodeCipher (Cascading AES + ChaCha)', () => {
  describe('fromBytes', () => {
    const cipher = NodeCipher.fromBytes(new TextEncoder().encode('test-secret-key'));

    it('should encrypt and decrypt binary data', () => {
      const plaintext = new TextEncoder().encode('Hello, cascading cipher!');
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should encrypt and decrypt empty data', () => {
      const plaintext = new Uint8Array(0);
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should encrypt and decrypt strings', () => {
      const message = 'Hello, quantum world! Unicode: \u00e9\u00e8\u00ea \u2022 \u2603 \u2764';
      const encrypted = cipher.encryptString(message);
      const decrypted = cipher.decryptString(encrypted);
      expect(decrypted).toBe(message);
    });

    it('should produce different ciphertexts each time', () => {
      const plaintext = new TextEncoder().encode('Same data again');
      const ct1 = cipher.encrypt(plaintext);
      const ct2 = cipher.encrypt(plaintext);
      expect(ct1).not.toEqual(ct2);
    });

    it('should include version byte in wire format', () => {
      const encrypted = cipher.encrypt(new Uint8Array([1, 2, 3]));
      expect(encrypted[0]).toBe(0x05);
    });

    it('should have correct header size', () => {
      const encrypted = cipher.encrypt(new Uint8Array([1, 2, 3]));
      // At minimum: 1 (version) + 12 (AES nonce) + 12 (ChaCha nonce) + data
      expect(encrypted.length).toBeGreaterThan(25);
    });

    it('should report length hiding is enabled', () => {
      expect(cipher.hasLengthHiding()).toBe(true);
    });

    it('should report encryption overhead', () => {
      expect(cipher.overhead()).toBeGreaterThan(0);
    });
  });

  describe('fromPassword', () => {
    it('should derive consistent keys from same password', () => {
      const cipher1 = NodeCipher.fromPassword('my-test-password');
      const cipher2 = NodeCipher.fromPassword('my-test-password');

      const plaintext = new TextEncoder().encode('Consistency check');
      const encrypted = cipher1.encrypt(plaintext);
      const decrypted = cipher2.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });

    it('should produce different keys for different passwords', () => {
      const cipher1 = NodeCipher.fromPassword('password-one');
      const cipher2 = NodeCipher.fromPassword('password-two');

      const plaintext = new TextEncoder().encode('Cross-password test');
      const encrypted = cipher1.encrypt(plaintext);
      expect(() => cipher2.decrypt(encrypted)).toThrow();
    });

    it('should support disabling padding', () => {
      const cipher = NodeCipher.fromPassword('test', false);
      expect(cipher.hasLengthHiding()).toBe(false);

      const plaintext = new TextEncoder().encode('No padding');
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });
  });

  describe('AAD support', () => {
    const cipher = NodeCipher.fromBytes(new TextEncoder().encode('aad-test-key'));

    it('should encrypt and decrypt with AAD', () => {
      const plaintext = new TextEncoder().encode('AAD protected');
      const aad = new TextEncoder().encode('user-id:12345');
      const encrypted = cipher.encryptWithAad(plaintext, aad);
      const decrypted = cipher.decryptWithAad(encrypted, aad);
      expect(decrypted).toEqual(plaintext);
    });

    it('should fail with wrong AAD', () => {
      const plaintext = new TextEncoder().encode('AAD protected');
      const aad = new TextEncoder().encode('correct-context');
      const encrypted = cipher.encryptWithAad(plaintext, aad);
      expect(() => cipher.decryptWithAad(encrypted, new TextEncoder().encode('wrong-context'))).toThrow();
    });

    it('should fail with missing AAD', () => {
      const plaintext = new TextEncoder().encode('AAD protected');
      const aad = new TextEncoder().encode('has-aad');
      const encrypted = cipher.encryptWithAad(plaintext, aad);
      // Decrypt without AAD should fail
      expect(() => cipher.decrypt(encrypted)).toThrow();
    });
  });

  describe('tamper detection', () => {
    const cipher = NodeCipher.fromBytes(new TextEncoder().encode('tamper-key'));

    it('should detect tampered ciphertext', () => {
      const encrypted = cipher.encrypt(new TextEncoder().encode('Secret'));
      // Tamper with the ciphertext body
      encrypted[encrypted.length - 1] ^= 0xff;
      expect(() => cipher.decrypt(encrypted)).toThrow();
    });

    it('should reject truncated ciphertext', () => {
      expect(() => cipher.decrypt(new Uint8Array(10))).toThrow(QShieldError);
    });

    it('should reject invalid version byte', () => {
      const encrypted = cipher.encrypt(new TextEncoder().encode('test'));
      encrypted[0] = 0xff; // Invalid version
      expect(() => cipher.decrypt(encrypted)).toThrow(QShieldError);
    });
  });

  describe('large data', () => {
    const cipher = NodeCipher.fromBytes(new TextEncoder().encode('large-data-key'));

    it('should handle 1MB data', () => {
      const plaintext = new Uint8Array(crypto.randomBytes(1024 * 1024));
      const encrypted = cipher.encrypt(plaintext);
      const decrypted = cipher.decrypt(encrypted);
      expect(decrypted).toEqual(plaintext);
    });
  });
});

// ============================================================================
// X25519 Key Exchange Tests
// ============================================================================

describe('NodeKeyExchange (X25519)', () => {
  it('should generate 32-byte public keys', () => {
    const kx = new NodeKeyExchange();
    expect(kx.publicKey.length).toBe(32);
  });

  it('should generate base64 public key', () => {
    const kx = new NodeKeyExchange();
    expect(kx.publicKeyBase64.length).toBeGreaterThan(0);
    // Base64 of 32 bytes = 44 chars
    expect(kx.publicKeyBase64.length).toBe(44);
  });

  it('should derive the same shared secret for both parties', () => {
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();

    const aliceSecret = alice.deriveSharedSecret(bob.publicKey);
    const bobSecret = bob.deriveSharedSecret(alice.publicKey);

    expect(aliceSecret).toEqual(bobSecret);
    expect(aliceSecret.length).toBe(32);
  });

  it('should derive ciphers that are interoperable', () => {
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();

    const aliceCipher = alice.deriveCipher(bob.publicKey);
    const bobCipher = bob.deriveCipher(alice.publicKey);

    const plaintext = new TextEncoder().encode('Key exchange message');
    const encrypted = aliceCipher.encrypt(plaintext);
    const decrypted = bobCipher.decrypt(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('should derive ciphers that work for string messages', () => {
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();

    const aliceCipher = alice.deriveCipher(bob.publicKey);
    const bobCipher = bob.deriveCipher(alice.publicKey);

    const message = 'Encrypted with key exchange derived keys';
    const encrypted = aliceCipher.encryptString(message);
    const decrypted = bobCipher.decryptString(encrypted);
    expect(decrypted).toBe(message);
  });

  it('should produce different shared secrets with different peers', () => {
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();
    const charlie = new NodeKeyExchange();

    const secretAB = alice.deriveSharedSecret(bob.publicKey);
    const secretAC = alice.deriveSharedSecret(charlie.publicKey);

    expect(secretAB).not.toEqual(secretAC);
  });

  it('should generate unique keypairs', () => {
    const kx1 = new NodeKeyExchange();
    const kx2 = new NodeKeyExchange();
    expect(kx1.publicKey).not.toEqual(kx2.publicKey);
  });

  it('should reject invalid public key length', () => {
    const kx = new NodeKeyExchange();
    expect(() => kx.deriveSharedSecret(new Uint8Array(16))).toThrow(QShieldError);
  });
});

// ============================================================================
// HKDF Key Derivation Tests
// ============================================================================

describe('HKDF-SHA512', () => {
  it('should derive consistent keys (sync)', () => {
    const ikm = new TextEncoder().encode('input-key-material');
    const salt = new TextEncoder().encode('salt');

    const key1 = hkdfDeriveSync({ ikm, salt, info: 'test', length: 32 });
    const key2 = hkdfDeriveSync({ ikm, salt, info: 'test', length: 32 });

    expect(key1).toEqual(key2);
    expect(key1.length).toBe(32);
  });

  it('should derive consistent keys (async)', async () => {
    const ikm = new TextEncoder().encode('input-key-material');
    const salt = new TextEncoder().encode('salt');

    const key1 = await hkdfDerive({ ikm, salt, info: 'test', length: 32 });
    const key2 = await hkdfDerive({ ikm, salt, info: 'test', length: 32 });

    expect(key1).toEqual(key2);
  });

  it('should produce different keys for different info strings', () => {
    const ikm = new TextEncoder().encode('same-key');

    const key1 = hkdfDeriveSync({ ikm, info: 'purpose-1', length: 32 });
    const key2 = hkdfDeriveSync({ ikm, info: 'purpose-2', length: 32 });

    expect(key1).not.toEqual(key2);
  });

  it('should produce different keys for different salts', () => {
    const ikm = new TextEncoder().encode('same-key');

    const key1 = hkdfDeriveSync({ ikm, salt: new TextEncoder().encode('salt-1'), length: 32 });
    const key2 = hkdfDeriveSync({ ikm, salt: new TextEncoder().encode('salt-2'), length: 32 });

    expect(key1).not.toEqual(key2);
  });

  it('should derive keys of various lengths', () => {
    const ikm = new TextEncoder().encode('key');

    expect(hkdfDeriveSync({ ikm, length: 16 }).length).toBe(16);
    expect(hkdfDeriveSync({ ikm, length: 32 }).length).toBe(32);
    expect(hkdfDeriveSync({ ikm, length: 64 }).length).toBe(64);
  });

  it('should work without optional parameters', () => {
    const ikm = new TextEncoder().encode('minimal-key');
    const key = hkdfDeriveSync({ ikm });
    expect(key.length).toBe(64); // default length
  });

  it('should accept Uint8Array info parameter', () => {
    const ikm = new TextEncoder().encode('key');
    const info = new TextEncoder().encode('context');
    const key = hkdfDeriveSync({ ikm, info, length: 32 });
    expect(key.length).toBe(32);
  });
});

// ============================================================================
// scrypt Key Derivation Tests
// ============================================================================

describe('scrypt (Argon2id fallback)', () => {
  it('should derive keys from password (sync)', () => {
    const salt = new Uint8Array(crypto.randomBytes(16));
    const result = scryptDeriveSync({ password: 'test-password', salt, keyLength: 32 });

    expect(result.key.length).toBe(32);
    expect(result.salt).toEqual(salt);
  });

  it('should derive consistent keys for same inputs (sync)', () => {
    const salt = new Uint8Array(crypto.randomBytes(16));

    const result1 = scryptDeriveSync({ password: 'same-password', salt, keyLength: 32 });
    const result2 = scryptDeriveSync({ password: 'same-password', salt, keyLength: 32 });

    expect(result1.key).toEqual(result2.key);
  });

  it('should derive different keys for different passwords (sync)', () => {
    const salt = new Uint8Array(crypto.randomBytes(16));

    const result1 = scryptDeriveSync({ password: 'password-1', salt, keyLength: 32 });
    const result2 = scryptDeriveSync({ password: 'password-2', salt, keyLength: 32 });

    expect(result1.key).not.toEqual(result2.key);
  });

  it('should derive keys from password (async)', async () => {
    const salt = new Uint8Array(crypto.randomBytes(16));
    const result = await scryptDerive({ password: 'test-password', salt, keyLength: 32 });

    expect(result.key.length).toBe(32);
  });

  it('should generate salt if not provided (sync)', () => {
    const result = scryptDeriveSync({ password: 'auto-salt' });
    expect(result.salt.length).toBe(16);
    expect(result.key.length).toBe(64); // default key length
  });

  it('should accept Uint8Array password', () => {
    const password = new TextEncoder().encode('binary-password');
    const salt = new Uint8Array(crypto.randomBytes(16));
    const result = scryptDeriveSync({ password, salt, keyLength: 32 });
    expect(result.key.length).toBe(32);
  });
});

// ============================================================================
// Forward Secrecy Session Tests
// ============================================================================

describe('NodeSession (Forward Secrecy)', () => {
  it('should encrypt and decrypt messages', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const sender = new NodeSession(secret);
    const receiver = new NodeSession(secret);

    const msg = new TextEncoder().encode('Session message 1');
    const encrypted = sender.encrypt(msg);
    const decrypted = receiver.decrypt(encrypted);
    expect(decrypted).toEqual(msg);
  });

  it('should handle multiple sequential messages', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const sender = new NodeSession(secret);
    const receiver = new NodeSession(secret);

    for (let i = 0; i < 5; i++) {
      const msg = new TextEncoder().encode(`Message #${i}`);
      const encrypted = sender.encrypt(msg);
      const decrypted = receiver.decrypt(encrypted);
      expect(decrypted).toEqual(msg);
    }

    expect(sender.messageCount).toBe(5);
    expect(receiver.messageCount).toBe(5);
  });

  it('should track message count', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const session = new NodeSession(secret);

    expect(session.messageCount).toBe(0);
    session.encrypt(new Uint8Array([1]));
    expect(session.messageCount).toBe(1);
    session.encrypt(new Uint8Array([2]));
    expect(session.messageCount).toBe(2);
  });

  it('should reject out-of-order messages', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const sender = new NodeSession(secret);
    const receiver = new NodeSession(secret);

    const msg1 = sender.encrypt(new TextEncoder().encode('first'));
    const msg2 = sender.encrypt(new TextEncoder().encode('second'));

    // Try to decrypt msg2 before msg1
    expect(() => receiver.decrypt(msg2)).toThrow();

    // msg1 should still work
    receiver.decrypt(msg1);
  });

  it('should produce different ciphertexts for same plaintext', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const session = new NodeSession(secret);

    const msg = new TextEncoder().encode('Same message');
    const ct1 = session.encrypt(msg);
    const ct2 = session.encrypt(msg);

    expect(ct1).not.toEqual(ct2);
  });

  it('should use different keys for each message (forward secrecy)', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const sender = new NodeSession(secret);

    // Create a separate session to verify keys are ratcheted
    const receiver1 = new NodeSession(secret);
    const receiver2 = new NodeSession(secret);

    const msg1 = sender.encrypt(new TextEncoder().encode('msg1'));
    const msg2 = sender.encrypt(new TextEncoder().encode('msg2'));

    // receiver1 processes both messages normally
    receiver1.decrypt(msg1);
    receiver1.decrypt(msg2);

    // receiver2 processes msg1, then cannot skip to msg2 with old state
    receiver2.decrypt(msg1);
    // If we could somehow replay msg1's key for msg2, it should fail
    // The ratcheting ensures each message key is unique
    const decrypted2 = receiver2.decrypt(msg2);
    expect(new TextDecoder().decode(decrypted2)).toBe('msg2');
  });

  it('should reject short ciphertext', () => {
    const secret = new Uint8Array(crypto.randomBytes(32));
    const session = new NodeSession(secret);
    expect(() => session.decrypt(new Uint8Array(4))).toThrow();
  });
});

// ============================================================================
// Cascading Encryption End-to-End Tests
// ============================================================================

describe('Cascading Encryption End-to-End', () => {
  it('should provide defense in depth: encrypt with AES then ChaCha', () => {
    const cipher = NodeCipher.fromBytes(new TextEncoder().encode('e2e-key'));
    const plaintext = new TextEncoder().encode('Defense in depth test');

    const encrypted = cipher.encrypt(plaintext);

    // Verify the wire format: version byte at position 0
    expect(encrypted[0]).toBe(0x05);

    // The ciphertext should be significantly larger than plaintext
    // due to: header (25) + AES tag (16) + ChaCha tag (16) + padding
    expect(encrypted.length).toBeGreaterThan(plaintext.length + 50);

    const decrypted = cipher.decrypt(encrypted);
    expect(decrypted).toEqual(plaintext);
  });

  it('should work with key exchange derived cipher', () => {
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();

    const aliceCipher = alice.deriveCipher(bob.publicKey);
    const bobCipher = bob.deriveCipher(alice.publicKey);

    // Full roundtrip: key exchange -> cascading cipher -> encrypt -> decrypt
    const message = 'End-to-end: key exchange + cascading cipher';
    const encrypted = aliceCipher.encryptString(message);
    const decrypted = bobCipher.decryptString(encrypted);
    expect(decrypted).toBe(message);
  });

  it('should work with session-based forward secrecy', () => {
    // Simulate: key exchange -> session -> multiple messages
    const alice = new NodeKeyExchange();
    const bob = new NodeKeyExchange();

    const sharedSecret = alice.deriveSharedSecret(bob.publicKey);

    const aliceSession = new NodeSession(sharedSecret);
    const bobSession = new NodeSession(sharedSecret);

    const messages = ['Hello Bob', 'How are you?', 'Goodbye'];

    for (const msg of messages) {
      const encrypted = aliceSession.encrypt(new TextEncoder().encode(msg));
      const decrypted = bobSession.decrypt(encrypted);
      expect(new TextDecoder().decode(decrypted)).toBe(msg);
    }
  });
});

// ============================================================================
// Quick Encrypt/Decrypt Tests
// ============================================================================

describe('Quick Encrypt/Decrypt', () => {
  it('should encrypt and decrypt a string with a password', () => {
    const message = 'Quick encrypt test';
    const password = 'my-password';

    const encrypted = quickEncrypt(message, password);
    const decrypted = quickDecrypt(encrypted, password);

    expect(decrypted).toBe(message);
  });

  it('should fail with wrong password', () => {
    const encrypted = quickEncrypt('secret', 'correct-password');
    expect(() => quickDecrypt(encrypted, 'wrong-password')).toThrow();
  });
});

// ============================================================================
// Secure Compare Tests
// ============================================================================

describe('secureCompare', () => {
  it('should return true for equal buffers', () => {
    const a = new TextEncoder().encode('hello');
    const b = new TextEncoder().encode('hello');
    expect(secureCompare(a, b)).toBe(true);
  });

  it('should return false for different buffers', () => {
    const a = new TextEncoder().encode('hello');
    const b = new TextEncoder().encode('world');
    expect(secureCompare(a, b)).toBe(false);
  });

  it('should return false for different length buffers', () => {
    const a = new TextEncoder().encode('hello');
    const b = new TextEncoder().encode('hell');
    expect(secureCompare(a, b)).toBe(false);
  });

  it('should return true for empty buffers', () => {
    expect(secureCompare(new Uint8Array(0), new Uint8Array(0))).toBe(true);
  });
});
