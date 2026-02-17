"""
Comprehensive tests for the QuantumShield Python SDK.

These tests cover the classical-crypto path (AES-GCM, ChaCha20-Poly1305,
X25519, Ed25519, HKDF, Argon2id) which works with only the ``cryptography``
and ``argon2-cffi`` packages installed.
"""

import os
import warnings

import pytest


# ===========================================================================
# Imports
# ===========================================================================

from quantum_shield import (
    __version__,
    # Errors
    QShieldError,
    InvalidKeyError,
    EncryptionError,
    DecryptionError,
    InvalidCiphertextError,
    KeyDerivationError,
    SignatureError,
    ParseError,
    PostQuantumUnavailableWarning,
    # Cipher
    QuantumShield,
    AES_KEY_SIZE,
    AES_NONCE_SIZE,
    AES_TAG_SIZE,
    CHACHA_KEY_SIZE,
    CHACHA_NONCE_SIZE,
    CHACHA_TAG_SIZE,
    QSHIELD_KEY_SIZE,
    QSHIELD_OVERHEAD,
    # KEM
    QShieldKEM,
    QShieldKEMPublicKey,
    QShieldKEMSecretKey,
    QShieldKEMCiphertext,
    QSHIELD_SHARED_SECRET_SIZE,
    # Sign
    QShieldSign,
    QShieldSignPublicKey,
    QShieldSignSecretKey,
    QShieldSignature,
    # KDF
    QShieldKDF,
    KdfConfig,
    DerivedKey,
)


# ===========================================================================
# Module-level sanity
# ===========================================================================

class TestModuleSanity:
    """Verify the package loads correctly."""

    def test_version(self):
        assert __version__ == "0.1.0"

    def test_constants(self):
        assert AES_KEY_SIZE == 32
        assert AES_NONCE_SIZE == 12
        assert AES_TAG_SIZE == 16
        assert CHACHA_KEY_SIZE == 32
        assert CHACHA_NONCE_SIZE == 12
        assert CHACHA_TAG_SIZE == 16
        assert QSHIELD_KEY_SIZE == 64
        assert QSHIELD_OVERHEAD == 56
        assert QSHIELD_SHARED_SECRET_SIZE == 64


# ===========================================================================
# QuantumShield (cascading cipher) tests
# ===========================================================================

class TestQuantumShield:
    """Tests for the cascading symmetric cipher."""

    def test_encrypt_decrypt(self):
        shared_secret = b"this is a test shared secret for encryption"
        cipher = QuantumShield(shared_secret)

        plaintext = b"Hello, quantum world!"
        ciphertext = cipher.encrypt(plaintext)
        decrypted = cipher.decrypt(ciphertext)

        assert decrypted == plaintext

    def test_encrypt_decrypt_empty(self):
        cipher = QuantumShield(b"key material")
        ciphertext = cipher.encrypt(b"")
        decrypted = cipher.decrypt(ciphertext)
        assert decrypted == b""

    def test_encrypt_decrypt_large(self):
        cipher = QuantumShield(b"key material for large test")
        plaintext = os.urandom(1024 * 1024)  # 1 MiB
        ciphertext = cipher.encrypt(plaintext)
        decrypted = cipher.decrypt(ciphertext)
        assert decrypted == plaintext

    def test_ciphertext_overhead(self):
        cipher = QuantumShield(b"test key")
        plaintext = b"Hello!"
        ciphertext = cipher.encrypt(plaintext)
        assert len(ciphertext) == len(plaintext) + QuantumShield.overhead()

    def test_different_ciphertexts_same_plaintext(self):
        """Same plaintext should produce different ciphertexts (random nonces)."""
        cipher = QuantumShield(b"test key")
        pt = b"Hello!"
        ct1 = cipher.encrypt(pt)
        ct2 = cipher.encrypt(pt)
        assert ct1 != ct2
        assert cipher.decrypt(ct1) == cipher.decrypt(ct2) == pt

    def test_different_shared_secrets(self):
        cipher1 = QuantumShield(b"secret one")
        cipher2 = QuantumShield(b"secret two")

        ciphertext = cipher1.encrypt(b"Test message")

        with pytest.raises(DecryptionError):
            cipher2.decrypt(ciphertext)

    def test_empty_shared_secret_rejected(self):
        with pytest.raises(InvalidKeyError):
            QuantumShield(b"")

    def test_tampered_ciphertext_rejected(self):
        cipher = QuantumShield(b"test key")
        ciphertext = bytearray(cipher.encrypt(b"secret"))

        # Flip a byte in the ciphertext body
        ciphertext[20] ^= 0xFF

        with pytest.raises(DecryptionError):
            cipher.decrypt(bytes(ciphertext))

    def test_truncated_ciphertext_rejected(self):
        cipher = QuantumShield(b"test key")
        with pytest.raises(InvalidCiphertextError):
            cipher.decrypt(b"too short")

    def test_encrypt_decrypt_with_aad(self):
        cipher = QuantumShield(b"test key material")
        plaintext = b"Hello, quantum world!"
        aad = b"additional authenticated data"

        ciphertext = cipher.encrypt_with_aad(plaintext, aad)
        decrypted = cipher.decrypt_with_aad(ciphertext, aad)
        assert decrypted == plaintext

    def test_wrong_aad_fails(self):
        cipher = QuantumShield(b"test key material")
        ciphertext = cipher.encrypt_with_aad(b"Hello!", b"correct aad")

        with pytest.raises(DecryptionError):
            cipher.decrypt_with_aad(ciphertext, b"wrong aad")

    def test_seal_open(self):
        cipher = QuantumShield(b"test key material")
        plaintext = b"Test message"
        sealed = cipher.seal(plaintext)
        opened = cipher.open(sealed)
        assert opened == plaintext

    def test_key_rotation(self):
        cipher = QuantumShield(b"test key material")
        plaintext = b"Test message"
        ct1 = cipher.encrypt(plaintext)

        # Rotate keys
        cipher.rotate_keys()

        # Old ciphertext should fail with new keys
        with pytest.raises(DecryptionError):
            cipher.decrypt(ct1)

        # New encryption should work
        ct2 = cipher.encrypt(plaintext)
        decrypted = cipher.decrypt(ct2)
        assert decrypted == plaintext

    def test_overhead_constant(self):
        assert QuantumShield.overhead() == QSHIELD_OVERHEAD
        assert QuantumShield.overhead() == 56


# ===========================================================================
# QShieldKEM tests
# ===========================================================================

class TestQShieldKEM:
    """Tests for the hybrid key encapsulation mechanism."""

    def test_generate_keypair(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            public_key, secret_key = QShieldKEM.generate_keypair()

        assert isinstance(public_key, QShieldKEMPublicKey)
        assert isinstance(secret_key, QShieldKEMSecretKey)
        assert len(public_key.x25519) == 32
        assert len(secret_key.x25519) == 32

    def test_encapsulate_decapsulate(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            public_key, secret_key = QShieldKEM.generate_keypair()
            ciphertext, shared_secret_enc = QShieldKEM.encapsulate(public_key)
            shared_secret_dec = QShieldKEM.decapsulate(secret_key, ciphertext)

        assert shared_secret_enc == shared_secret_dec
        assert len(shared_secret_enc) == QSHIELD_SHARED_SECRET_SIZE

    def test_shared_secret_size(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, _ = QShieldKEM.generate_keypair()
            _, ss = QShieldKEM.encapsulate(pk)

        assert len(ss) == QShieldKEM.shared_secret_size()

    def test_different_keys_different_secrets(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk1, sk1 = QShieldKEM.generate_keypair()
            pk2, sk2 = QShieldKEM.generate_keypair()

            _, ss1 = QShieldKEM.encapsulate(pk1)
            _, ss2 = QShieldKEM.encapsulate(pk2)

        # Different public keys should give different secrets
        assert ss1 != ss2

    def test_wrong_key_decapsulation(self):
        """Decapsulating with the wrong key should give a different shared secret."""
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk1, sk1 = QShieldKEM.generate_keypair()
            _, sk2 = QShieldKEM.generate_keypair()

            ct, ss_enc = QShieldKEM.encapsulate(pk1)

            # Correct decapsulation
            ss_dec_correct = QShieldKEM.decapsulate(sk1, ct)
            assert ss_dec_correct == ss_enc

            # Wrong key decapsulation -- should NOT match
            ss_dec_wrong = QShieldKEM.decapsulate(sk2, ct)
            assert ss_dec_wrong != ss_enc

    def test_public_key_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, _ = QShieldKEM.generate_keypair()

        serialized = pk.to_bytes()
        restored = QShieldKEMPublicKey.from_bytes(serialized)
        assert restored.x25519 == pk.x25519
        assert restored.ml_kem == pk.ml_kem

    def test_secret_key_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            _, sk = QShieldKEM.generate_keypair()

        serialized = sk.to_bytes()
        restored = QShieldKEMSecretKey.from_bytes(serialized)
        assert restored.x25519 == sk.x25519
        assert restored.ml_kem == sk.ml_kem

    def test_ciphertext_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldKEM.generate_keypair()
            ct, _ = QShieldKEM.encapsulate(pk)

        serialized = ct.to_bytes()
        restored = QShieldKEMCiphertext.from_bytes(serialized)
        assert restored.x25519 == ct.x25519
        assert restored.ml_kem == ct.ml_kem

        # Verify decapsulation works with restored ciphertext
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            ss1 = QShieldKEM.decapsulate(sk, ct)
            ss2 = QShieldKEM.decapsulate(sk, restored)
        assert ss1 == ss2

    def test_full_kem_to_cipher_flow(self):
        """End-to-end: KEM -> shared secret -> QuantumShield cipher."""
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldKEM.generate_keypair()
            ct, ss_enc = QShieldKEM.encapsulate(pk)
            ss_dec = QShieldKEM.decapsulate(sk, ct)

        assert ss_enc == ss_dec

        cipher_enc = QuantumShield(ss_enc)
        cipher_dec = QuantumShield(ss_dec)

        plaintext = b"Hello, quantum world!"
        ciphertext = cipher_enc.encrypt(plaintext)
        decrypted = cipher_dec.decrypt(ciphertext)
        assert decrypted == plaintext


# ===========================================================================
# QShieldSign tests
# ===========================================================================

class TestQShieldSign:
    """Tests for the dual signature scheme."""

    def test_generate_keypair(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()

        assert isinstance(pk, QShieldSignPublicKey)
        assert isinstance(sk, QShieldSignSecretKey)
        assert len(pk.primary) > 0
        assert len(pk.secondary) > 0

    def test_sign_verify(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            signature = QShieldSign.sign(sk, b"Hello, quantum world!")
            valid = QShieldSign.verify(pk, b"Hello, quantum world!", signature)

        assert valid is True

    def test_sign_verify_with_timestamp(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            timestamp = 1704067200  # 2024-01-01 00:00:00 UTC
            signature = QShieldSign.sign_with_timestamp(
                sk, b"Hello!", timestamp=timestamp
            )

        assert signature.timestamp == timestamp

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            valid = QShieldSign.verify(pk, b"Hello!", signature)
        assert valid is True

    def test_wrong_message_fails(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            signature = QShieldSign.sign(sk, b"Hello!")
            valid = QShieldSign.verify(pk, b"Wrong message", signature)

        assert valid is False

    def test_wrong_key_fails(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            _, sk1 = QShieldSign.generate_keypair()
            pk2, _ = QShieldSign.generate_keypair()

            signature = QShieldSign.sign(sk1, b"Test message")
            valid = QShieldSign.verify(pk2, b"Test message", signature)

        assert valid is False

    def test_public_key_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, _ = QShieldSign.generate_keypair()

        serialized = pk.to_bytes()
        restored = QShieldSignPublicKey.from_bytes(serialized)
        assert restored.primary == pk.primary
        assert restored.secondary == pk.secondary
        assert restored.scheme == pk.scheme

    def test_secret_key_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            _, sk = QShieldSign.generate_keypair()

        serialized = sk.to_bytes()
        restored = QShieldSignSecretKey.from_bytes(serialized)
        assert restored.primary == sk.primary
        assert restored.secondary == sk.secondary
        assert restored.scheme == sk.scheme

    def test_signature_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            sig = QShieldSign.sign(sk, b"Test")

        serialized = sig.to_bytes()
        restored = QShieldSignature.from_bytes(serialized)

        assert restored.primary == sig.primary
        assert restored.secondary == sig.secondary
        assert restored.scheme == sig.scheme
        assert restored.timestamp == sig.timestamp

        # Verify the restored signature still works
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            assert QShieldSign.verify(pk, b"Test", restored) is True

    def test_signature_with_timestamp_serialization(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            sig = QShieldSign.sign_with_timestamp(sk, b"Test", timestamp=42)

        serialized = sig.to_bytes()
        restored = QShieldSignature.from_bytes(serialized)
        assert restored.timestamp == 42

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            assert QShieldSign.verify(pk, b"Test", restored) is True

    def test_fingerprint(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk1, _ = QShieldSign.generate_keypair()
            pk2, _ = QShieldSign.generate_keypair()

        fp1 = pk1.fingerprint()
        fp2 = pk2.fingerprint()

        # Different keys -> different fingerprints
        assert fp1 != fp2

        # Same key -> same fingerprint
        assert pk1.fingerprint() == fp1

    def test_empty_message(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            sig = QShieldSign.sign(sk, b"")
            assert QShieldSign.verify(pk, b"", sig) is True

    def test_large_message(self):
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldSign.generate_keypair()
            msg = os.urandom(1024 * 100)  # 100 KiB
            sig = QShieldSign.sign(sk, msg)
            assert QShieldSign.verify(pk, msg, sig) is True


# ===========================================================================
# QShieldKDF tests
# ===========================================================================

class TestQShieldKDF:
    """Tests for the key derivation functions."""

    def test_basic_derive(self):
        kdf = QShieldKDF()
        ikm = b"test input keying material"
        salt = b"test salt for derivation"
        info = b"test context"

        key = kdf.derive(ikm, salt, info, 32)
        assert len(key) == 32

        # Deterministic with same inputs
        key2 = kdf.derive(ikm, salt, info, 32)
        assert key == key2

        # Different with different info
        key3 = kdf.derive(ikm, salt, b"other context", 32)
        assert key != key3

    def test_derive_different_lengths(self):
        kdf = QShieldKDF()
        key16 = kdf.derive(b"ikm", b"salt", b"info", 16)
        key32 = kdf.derive(b"ikm", b"salt", b"info", 32)
        key64 = kdf.derive(b"ikm", b"salt", b"info", 64)

        assert len(key16) == 16
        assert len(key32) == 32
        assert len(key64) == 64

        # HKDF produces output where a shorter request IS a prefix of a
        # longer one (same PRK, same info, output is a truncated expansion).
        # Verify this property holds.
        assert key16 == key32[:16]
        assert key32 == key64[:32]

    def test_derive_with_none_salt(self):
        """When salt is None, a random salt is generated (non-deterministic)."""
        kdf = QShieldKDF()
        key1 = kdf.derive(b"ikm", None, b"info", 32)
        key2 = kdf.derive(b"ikm", None, b"info", 32)
        # With random salts, these should almost certainly differ
        assert key1 != key2

    def test_derive_with_empty_salt(self):
        """Empty salt should be deterministic."""
        kdf = QShieldKDF()
        key1 = kdf.derive(b"ikm", b"", b"info", 32)
        key2 = kdf.derive(b"ikm", b"", b"info", 32)
        assert key1 == key2

    def test_derive_with_salt(self):
        kdf = QShieldKDF()
        key, salt = kdf.derive_with_salt(b"ikm", b"info", 32)
        assert len(key) == 32
        assert len(salt) == 64

    def test_combine(self):
        kdf = QShieldKDF()
        key1 = b"first key material"
        key2 = b"second key material"

        combined = kdf.combine([key1, key2], b"QShieldKEM-v1", 32)
        assert len(combined) == 32

        # Deterministic
        combined2 = kdf.combine([key1, key2], b"QShieldKEM-v1", 32)
        assert combined == combined2

        # Different order -> different result
        combined_rev = kdf.combine([key2, key1], b"QShieldKEM-v1", 32)
        assert combined != combined_rev

    def test_expand(self):
        kdf = QShieldKDF()
        expanded = kdf.expand(b"seed key", b"expansion context", 128)
        assert len(expanded) == 128

        # Deterministic
        expanded2 = kdf.expand(b"seed key", b"expansion context", 128)
        assert expanded == expanded2

    def test_password_derive(self):
        kdf = QShieldKDF(config=KdfConfig.low_memory())
        password = b"my secure password"
        salt = QShieldKDF.generate_salt(32)

        key = kdf.derive_from_password(password, salt, 32)
        assert len(key) == 32

        # Deterministic with same inputs
        key2 = kdf.derive_from_password(password, salt, 32)
        assert key == key2

        # Different password -> different key
        key3 = kdf.derive_from_password(b"different password", salt, 32)
        assert key != key3

        # Different salt -> different key
        key4 = kdf.derive_from_password(password, QShieldKDF.generate_salt(32), 32)
        assert key != key4

    def test_password_derive_max_length(self):
        kdf = QShieldKDF(config=KdfConfig.low_memory())
        with pytest.raises(KeyDerivationError):
            kdf.derive_from_password(b"password", b"salt" * 8, 1025)

    def test_generate_salt(self):
        salt1 = QShieldKDF.generate_salt(32)
        salt2 = QShieldKDF.generate_salt(32)
        assert len(salt1) == 32
        assert len(salt2) == 32
        assert salt1 != salt2  # Overwhelmingly unlikely to collide

    def test_kdf_config_presets(self):
        default = KdfConfig()
        assert default.memory_cost == 65536
        assert default.time_cost == 3
        assert default.parallelism == 4

        high = KdfConfig.high_security()
        assert high.memory_cost == 262144
        assert high.time_cost == 4

        low = KdfConfig.low_memory()
        assert low.memory_cost == 16384
        assert low.time_cost == 4
        assert low.parallelism == 2


# ===========================================================================
# DerivedKey tests
# ===========================================================================

class TestDerivedKey:
    """Tests for the DerivedKey wrapper."""

    def test_basic_operations(self):
        key = DerivedKey(b"\x01\x02\x03\x04")
        assert len(key) == 4
        assert key.as_bytes() == b"\x01\x02\x03\x04"
        assert bytes(key) == b"\x01\x02\x03\x04"

    def test_split(self):
        key = DerivedKey(os.urandom(64))
        parts = key.split([16, 16, 32])
        assert len(parts) == 3
        assert len(parts[0]) == 16
        assert len(parts[1]) == 16
        assert len(parts[2]) == 32

    def test_split_too_large(self):
        key = DerivedKey(b"\x00" * 10)
        with pytest.raises(KeyDerivationError):
            key.split([8, 8])  # Requesting 16 from 10 bytes

    def test_zeroize(self):
        key = DerivedKey(b"\xff" * 32)
        key.zeroize()
        assert key.as_bytes() == b"\x00" * 32


# ===========================================================================
# Integration tests
# ===========================================================================

class TestIntegration:
    """End-to-end integration tests."""

    def test_full_workflow(self):
        """Complete workflow: keygen -> encapsulate -> encrypt -> decrypt -> verify."""
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)

            # Key exchange
            pk_kem, sk_kem = QShieldKEM.generate_keypair()
            ct_kem, ss_sender = QShieldKEM.encapsulate(pk_kem)
            ss_receiver = QShieldKEM.decapsulate(sk_kem, ct_kem)
            assert ss_sender == ss_receiver

            # Symmetric encryption
            cipher = QuantumShield(ss_sender)
            message = b"Top secret message for quantum-safe transmission"
            encrypted = cipher.encrypt(message)
            decrypted = cipher.decrypt(encrypted)
            assert decrypted == message

            # Signing
            pk_sign, sk_sign = QShieldSign.generate_keypair()
            signature = QShieldSign.sign(sk_sign, encrypted)
            assert QShieldSign.verify(pk_sign, encrypted, signature)

    def test_kdf_to_cipher(self):
        """Derive a key from password and use it for encryption."""
        kdf = QShieldKDF(config=KdfConfig.low_memory())
        salt = QShieldKDF.generate_salt(32)
        key = kdf.derive_from_password(b"hunter2", salt, 32)

        cipher = QuantumShield(key)
        ct = cipher.encrypt(b"password-protected data")
        pt = cipher.decrypt(ct)
        assert pt == b"password-protected data"

    def test_multiple_messages_same_key(self):
        """Encrypt multiple messages with the same key."""
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", PostQuantumUnavailableWarning)
            pk, sk = QShieldKEM.generate_keypair()
            ct, ss = QShieldKEM.encapsulate(pk)
            ss2 = QShieldKEM.decapsulate(sk, ct)

        cipher = QuantumShield(ss)
        cipher2 = QuantumShield(ss2)

        for i in range(10):
            msg = f"Message #{i}".encode()
            encrypted = cipher.encrypt(msg)
            assert cipher2.decrypt(encrypted) == msg

    def test_key_rotation_flow(self):
        """Key rotation during a session."""
        cipher = QuantumShield(b"initial session key")

        # Phase 1
        ct1 = cipher.encrypt(b"phase 1 data")
        assert cipher.decrypt(ct1) == b"phase 1 data"

        # Rotate
        cipher.rotate_keys()

        # Phase 2
        ct2 = cipher.encrypt(b"phase 2 data")
        assert cipher.decrypt(ct2) == b"phase 2 data"

        # Phase 1 data should be inaccessible
        with pytest.raises(DecryptionError):
            cipher.decrypt(ct1)


# ===========================================================================
# Error handling tests
# ===========================================================================

class TestErrors:
    """Test that errors are properly raised and form a hierarchy."""

    def test_error_hierarchy(self):
        assert issubclass(InvalidKeyError, QShieldError)
        assert issubclass(EncryptionError, QShieldError)
        assert issubclass(DecryptionError, QShieldError)
        assert issubclass(InvalidCiphertextError, QShieldError)
        assert issubclass(KeyDerivationError, QShieldError)
        assert issubclass(SignatureError, QShieldError)
        assert issubclass(ParseError, QShieldError)

    def test_catching_base_error(self):
        """All specific errors can be caught as QShieldError."""
        with pytest.raises(QShieldError):
            QuantumShield(b"")

    def test_pq_warning_type(self):
        assert issubclass(PostQuantumUnavailableWarning, UserWarning)
