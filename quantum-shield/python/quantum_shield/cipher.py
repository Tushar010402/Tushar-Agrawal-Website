"""
QuantumShield - Cascading Symmetric Encryption.

Provides defense-in-depth by encrypting data through multiple independent
ciphers. Data is first encrypted with AES-256-GCM, then with ChaCha20-Poly1305.

Security Properties:
    - If either cipher is broken, the other still protects the data
    - Different mathematical foundations (substitution-permutation vs ARX)
    - Independent keys derived from the master key via HKDF
    - Separate nonces for each layer
"""

import os
import struct

from cryptography.hazmat.primitives.ciphers.aead import AESGCM, ChaCha20Poly1305

from .errors import (
    DecryptionError,
    EncryptionError,
    InvalidCiphertextError,
    InvalidKeyError,
    QShieldError,
)
from .kdf import QShieldKDF

# --- Constants matching the Rust SDK ---
AES_KEY_SIZE = 32       # AES-256
AES_NONCE_SIZE = 12     # GCM standard
AES_TAG_SIZE = 16       # GCM tag

CHACHA_KEY_SIZE = 32    # ChaCha20
CHACHA_NONCE_SIZE = 12  # IETF ChaCha20-Poly1305
CHACHA_TAG_SIZE = 16    # Poly1305 tag

QSHIELD_KEY_SIZE = AES_KEY_SIZE + CHACHA_KEY_SIZE  # 64 bytes total
QSHIELD_OVERHEAD = (
    AES_NONCE_SIZE + AES_TAG_SIZE + CHACHA_NONCE_SIZE + CHACHA_TAG_SIZE
)  # 56 bytes


def _zeroize(ba: bytearray) -> None:
    """Overwrite a bytearray with zeros to erase secret material."""
    for i in range(len(ba)):
        ba[i] = 0


class QuantumShield:
    """Cascading Symmetric Encryption using AES-256-GCM and ChaCha20-Poly1305.

    Encrypts data first with AES-256-GCM, then with ChaCha20-Poly1305 for
    defense-in-depth. Keys for each layer are independently derived from the
    shared secret using HKDF-SHA-256 with domain separation.

    Example::

        cipher = QuantumShield(shared_secret)
        encrypted = cipher.encrypt(b"plaintext")
        decrypted = cipher.decrypt(encrypted)

    Args:
        shared_secret: Key material of any length (will be expanded via HKDF).
            Must not be empty.

    Raises:
        InvalidKeyError: If shared_secret is empty.
    """

    __slots__ = ("_aes_key", "_chacha_key", "_aes", "_chacha")

    def __init__(self, shared_secret: bytes) -> None:
        if not shared_secret:
            raise InvalidKeyError("shared_secret must not be empty")

        # Derive independent keys using HKDF with domain separation
        # This mirrors the Rust SDK: derive QSHIELD_KEY_SIZE bytes then split
        kdf = QShieldKDF()
        derived = kdf.derive(
            ikm=shared_secret,
            salt=b"",  # Empty salt -- shared secret already has sufficient entropy
            info=b"QuantumShield-cascade-v1",
            length=QSHIELD_KEY_SIZE,
        )

        self._aes_key = bytearray(derived[:AES_KEY_SIZE])
        self._chacha_key = bytearray(derived[AES_KEY_SIZE:])

        self._aes = AESGCM(bytes(self._aes_key))
        self._chacha = ChaCha20Poly1305(bytes(self._chacha_key))

    # ------------------------------------------------------------------
    # Core encrypt / decrypt
    # ------------------------------------------------------------------

    def encrypt(self, plaintext: bytes) -> bytes:
        """Encrypt data using cascading encryption.

        Data is encrypted first with AES-256-GCM, then with ChaCha20-Poly1305.
        Each layer uses a fresh random 12-byte nonce prepended to the output.

        Wire format (per layer): ``nonce (12B) || ciphertext || tag (16B)``

        Args:
            plaintext: Data to encrypt.

        Returns:
            Cascaded ciphertext.

        Raises:
            EncryptionError: If encryption fails.
        """
        try:
            # Layer 1: AES-256-GCM
            aes_nonce = os.urandom(AES_NONCE_SIZE)
            aes_ct = self._aes.encrypt(aes_nonce, plaintext, None)
            aes_encrypted = aes_nonce + aes_ct

            # Layer 2: ChaCha20-Poly1305
            chacha_nonce = os.urandom(CHACHA_NONCE_SIZE)
            chacha_ct = self._chacha.encrypt(chacha_nonce, aes_encrypted, None)
            return chacha_nonce + chacha_ct
        except Exception as exc:
            raise EncryptionError(f"Cascading encryption failed: {exc}") from exc

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Decrypt cascaded ciphertext.

        Args:
            ciphertext: Cascaded ciphertext produced by :meth:`encrypt`.

        Returns:
            Decrypted plaintext.

        Raises:
            InvalidCiphertextError: If ciphertext is too short.
            DecryptionError: If authentication fails.
        """
        min_len = CHACHA_NONCE_SIZE + CHACHA_TAG_SIZE + AES_NONCE_SIZE + AES_TAG_SIZE
        if len(ciphertext) < min_len:
            raise InvalidCiphertextError(
                f"Ciphertext too short: {len(ciphertext)} bytes, need at least {min_len}"
            )

        try:
            # Strip ChaCha20 layer
            chacha_nonce = ciphertext[:CHACHA_NONCE_SIZE]
            chacha_ct = ciphertext[CHACHA_NONCE_SIZE:]
            aes_encrypted = self._chacha.decrypt(chacha_nonce, chacha_ct, None)

            # Strip AES layer
            aes_nonce = aes_encrypted[:AES_NONCE_SIZE]
            aes_ct = aes_encrypted[AES_NONCE_SIZE:]
            return self._aes.decrypt(aes_nonce, aes_ct, None)
        except (InvalidCiphertextError, QShieldError):
            raise
        except Exception as exc:
            raise DecryptionError(f"Cascading decryption failed: {exc}") from exc

    # ------------------------------------------------------------------
    # Encrypt / decrypt with additional authenticated data
    # ------------------------------------------------------------------

    def encrypt_with_aad(self, plaintext: bytes, aad: bytes) -> bytes:
        """Encrypt data with additional authenticated data.

        AAD is authenticated at both layers.

        Args:
            plaintext: Data to encrypt.
            aad: Additional authenticated data.

        Returns:
            Cascaded ciphertext.
        """
        try:
            # Layer 1: AES-256-GCM with AAD
            aes_nonce = os.urandom(AES_NONCE_SIZE)
            aes_ct = self._aes.encrypt(aes_nonce, plaintext, aad)
            aes_encrypted = aes_nonce + aes_ct

            # Layer 2: ChaCha20-Poly1305 with AAD
            chacha_nonce = os.urandom(CHACHA_NONCE_SIZE)
            chacha_ct = self._chacha.encrypt(chacha_nonce, aes_encrypted, aad)
            return chacha_nonce + chacha_ct
        except Exception as exc:
            raise EncryptionError(f"Cascading encryption (AAD) failed: {exc}") from exc

    def decrypt_with_aad(self, ciphertext: bytes, aad: bytes) -> bytes:
        """Decrypt ciphertext with additional authenticated data.

        Args:
            ciphertext: Cascaded ciphertext.
            aad: Additional authenticated data (must match encryption).

        Returns:
            Decrypted plaintext.
        """
        min_len = CHACHA_NONCE_SIZE + CHACHA_TAG_SIZE + AES_NONCE_SIZE + AES_TAG_SIZE
        if len(ciphertext) < min_len:
            raise InvalidCiphertextError(
                f"Ciphertext too short: {len(ciphertext)} bytes, need at least {min_len}"
            )

        try:
            chacha_nonce = ciphertext[:CHACHA_NONCE_SIZE]
            chacha_ct = ciphertext[CHACHA_NONCE_SIZE:]
            aes_encrypted = self._chacha.decrypt(chacha_nonce, chacha_ct, aad)

            aes_nonce = aes_encrypted[:AES_NONCE_SIZE]
            aes_ct = aes_encrypted[AES_NONCE_SIZE:]
            return self._aes.decrypt(aes_nonce, aes_ct, aad)
        except (InvalidCiphertextError, QShieldError):
            raise
        except Exception as exc:
            raise DecryptionError(
                f"Cascading decryption (AAD) failed: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Convenience wrappers matching Rust SDK
    # ------------------------------------------------------------------

    def seal(self, plaintext: bytes) -> bytes:
        """Encrypt into a sealed ciphertext (alias for encrypt)."""
        return self.encrypt(plaintext)

    def open(self, ciphertext: bytes) -> bytes:
        """Decrypt a sealed ciphertext (alias for decrypt)."""
        return self.decrypt(ciphertext)

    @staticmethod
    def overhead() -> int:
        """Return the encryption overhead in bytes (nonce + tag for each layer)."""
        return QSHIELD_OVERHEAD

    # ------------------------------------------------------------------
    # Key rotation (forward secrecy)
    # ------------------------------------------------------------------

    def rotate_keys(self) -> None:
        """Rotate to new keys derived from the current state.

        Provides forward secrecy by deriving new keys and erasing the old ones.
        After rotation, ciphertexts produced with the old keys can no longer be
        decrypted.
        """
        kdf = QShieldKDF()

        # Build current key material
        current = bytearray(bytes(self._aes_key) + bytes(self._chacha_key))

        new_derived = kdf.derive(
            ikm=bytes(current),
            salt=None,
            info=b"QuantumShield-rotate-v1",
            length=QSHIELD_KEY_SIZE,
        )

        # Zeroize old keys
        _zeroize(current)
        _zeroize(self._aes_key)
        _zeroize(self._chacha_key)

        # Install new keys
        self._aes_key = bytearray(new_derived[:AES_KEY_SIZE])
        self._chacha_key = bytearray(new_derived[AES_KEY_SIZE:])
        self._aes = AESGCM(bytes(self._aes_key))
        self._chacha = ChaCha20Poly1305(bytes(self._chacha_key))

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def __del__(self) -> None:
        """Best-effort zeroization of key material on garbage collection."""
        try:
            _zeroize(self._aes_key)
            _zeroize(self._chacha_key)
        except Exception:
            pass
