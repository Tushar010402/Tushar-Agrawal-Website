"""
QShieldKEM - Hybrid Key Encapsulation Mechanism.

Combines X25519 (classical ECDH) with ML-KEM-768 (post-quantum lattice-based
KEM) for defense-in-depth.  The final shared secret is derived using
HKDF-SHA-512 with domain separation.

Classical-only fallback:
    If the ``oqs`` Python package is not installed, the KEM operates in
    X25519-only mode and issues a :class:`PostQuantumUnavailableWarning`.
"""

import os
import struct
import warnings
from dataclasses import dataclass
from typing import Optional, Tuple

from cryptography.hazmat.primitives.asymmetric.x25519 import (
    X25519PrivateKey,
    X25519PublicKey as _X25519PubKey,
)

from .errors import (
    InvalidKeyError,
    ParseError,
    PostQuantumUnavailableWarning,
    QShieldError,
)
from .kdf import DOMAIN_KEM_COMBINE, QShieldKDF

# ---------------------------------------------------------------------------
# Post-quantum backend detection
# ---------------------------------------------------------------------------
_PQ_BACKEND: Optional[str] = None

try:
    import oqs  # type: ignore[import-untyped]

    _PQ_BACKEND = "oqs"
except ImportError:
    pass

# Shared secret size for the combined KEM
QSHIELD_SHARED_SECRET_SIZE = 64


# ---------------------------------------------------------------------------
# Key / ciphertext wrapper classes
# ---------------------------------------------------------------------------

@dataclass
class QShieldKEMPublicKey:
    """Combined public key for the hybrid KEM.

    Attributes:
        x25519: Raw X25519 public key bytes (32 bytes).
        ml_kem: ML-KEM-768 public key bytes (empty if PQ unavailable).
    """

    x25519: bytes
    ml_kem: bytes = b""

    def to_bytes(self) -> bytes:
        """Serialize to a length-prefixed wire format."""
        buf = bytearray()
        buf.extend(struct.pack("<I", len(self.x25519)))
        buf.extend(self.x25519)
        buf.extend(struct.pack("<I", len(self.ml_kem)))
        buf.extend(self.ml_kem)
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldKEMPublicKey":
        """Deserialize from wire format."""
        try:
            offset = 0
            (x_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            x25519 = data[offset : offset + x_len]
            offset += x_len
            (m_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            ml_kem = data[offset : offset + m_len]
            return cls(x25519=x25519, ml_kem=ml_kem)
        except Exception as exc:
            raise ParseError(f"Failed to parse KEM public key: {exc}") from exc


@dataclass
class QShieldKEMSecretKey:
    """Combined secret key for the hybrid KEM.

    Attributes:
        x25519: Raw X25519 private key bytes (32 bytes).
        ml_kem: ML-KEM-768 secret key bytes (empty if PQ unavailable).
    """

    x25519: bytes
    ml_kem: bytes = b""

    def to_bytes(self) -> bytes:
        """Serialize to wire format."""
        buf = bytearray()
        buf.extend(struct.pack("<I", len(self.x25519)))
        buf.extend(self.x25519)
        buf.extend(struct.pack("<I", len(self.ml_kem)))
        buf.extend(self.ml_kem)
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldKEMSecretKey":
        """Deserialize from wire format."""
        try:
            offset = 0
            (x_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            x25519 = data[offset : offset + x_len]
            offset += x_len
            (m_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            ml_kem = data[offset : offset + m_len]
            return cls(x25519=x25519, ml_kem=ml_kem)
        except Exception as exc:
            raise ParseError(f"Failed to parse KEM secret key: {exc}") from exc

    def public_key(self) -> QShieldKEMPublicKey:
        """Derive the corresponding public key."""
        priv = X25519PrivateKey.from_private_bytes(self.x25519)
        pub_bytes = priv.public_key().public_bytes_raw()
        # For ML-KEM, extracting public from secret requires the PQ backend
        ml_pub = b""
        if self.ml_kem and _PQ_BACKEND == "oqs":
            # oqs stores (secret_key) -- public key must be stored separately
            # We do not attempt extraction; the public key should be stored alongside.
            pass
        return QShieldKEMPublicKey(x25519=pub_bytes, ml_kem=ml_pub)


@dataclass
class QShieldKEMCiphertext:
    """Combined KEM ciphertext.

    Attributes:
        x25519: X25519 ephemeral public key (32 bytes).
        ml_kem: ML-KEM-768 ciphertext (empty if PQ unavailable).
    """

    x25519: bytes
    ml_kem: bytes = b""

    def to_bytes(self) -> bytes:
        """Serialize to wire format."""
        buf = bytearray()
        buf.extend(struct.pack("<I", len(self.x25519)))
        buf.extend(self.x25519)
        buf.extend(struct.pack("<I", len(self.ml_kem)))
        buf.extend(self.ml_kem)
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldKEMCiphertext":
        """Deserialize from wire format."""
        try:
            offset = 0
            (x_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            x25519 = data[offset : offset + x_len]
            offset += x_len
            (m_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            ml_kem = data[offset : offset + m_len]
            return cls(x25519=x25519, ml_kem=ml_kem)
        except Exception as exc:
            raise ParseError(f"Failed to parse KEM ciphertext: {exc}") from exc


# ---------------------------------------------------------------------------
# QShieldKEM
# ---------------------------------------------------------------------------

class QShieldKEM:
    """Hybrid Key Encapsulation Mechanism combining X25519 and ML-KEM-768.

    When the ``oqs`` package is available, both X25519 and ML-KEM-768 are
    used and their shared secrets are combined via HKDF.  Otherwise, only
    X25519 is used (with a warning).

    All methods are static, matching the Rust SDK's unit-struct pattern.

    Example::

        public_key, secret_key = QShieldKEM.generate_keypair()
        ciphertext, shared_secret = QShieldKEM.encapsulate(public_key)
        decapsulated = QShieldKEM.decapsulate(secret_key, ciphertext)
        assert shared_secret == decapsulated
    """

    @staticmethod
    def pq_available() -> bool:
        """Return True if post-quantum algorithms are available."""
        return _PQ_BACKEND is not None

    @staticmethod
    def generate_keypair() -> Tuple[QShieldKEMPublicKey, QShieldKEMSecretKey]:
        """Generate a new hybrid key pair.

        Returns:
            A ``(public_key, secret_key)`` tuple.
        """
        # --- X25519 ---
        x_priv = X25519PrivateKey.generate()
        x_pub_bytes = x_priv.public_key().public_bytes_raw()
        x_priv_bytes = x_priv.private_bytes_raw()

        # --- ML-KEM-768 (optional) ---
        ml_pub_bytes = b""
        ml_priv_bytes = b""

        if _PQ_BACKEND == "oqs":
            try:
                kem = oqs.KeyEncapsulation("ML-KEM-768")  # type: ignore[name-defined]
                ml_pub_bytes = kem.generate_keypair()
                ml_priv_bytes = kem.export_secret_key()
            except Exception:
                warnings.warn(
                    "ML-KEM-768 key generation failed; falling back to X25519 only",
                    PostQuantumUnavailableWarning,
                    stacklevel=2,
                )
        else:
            warnings.warn(
                "Post-quantum library (oqs) not installed. "
                "KEM is using X25519 only, which is NOT post-quantum secure. "
                "Install liboqs-python for full hybrid security.",
                PostQuantumUnavailableWarning,
                stacklevel=2,
            )

        return (
            QShieldKEMPublicKey(x25519=x_pub_bytes, ml_kem=ml_pub_bytes),
            QShieldKEMSecretKey(x25519=x_priv_bytes, ml_kem=ml_priv_bytes),
        )

    @staticmethod
    def encapsulate(
        public_key: QShieldKEMPublicKey,
    ) -> Tuple[QShieldKEMCiphertext, bytes]:
        """Encapsulate a shared secret to a public key.

        Performs X25519 ECDH (and ML-KEM-768 encapsulation if available),
        then combines the shared secrets via HKDF.

        Args:
            public_key: Recipient's public key.

        Returns:
            A ``(ciphertext, shared_secret)`` tuple where ``shared_secret``
            is ``QSHIELD_SHARED_SECRET_SIZE`` bytes.
        """
        # --- X25519 encapsulation (ECDH with ephemeral key) ---
        eph_priv = X25519PrivateKey.generate()
        eph_pub_bytes = eph_priv.public_key().public_bytes_raw()

        peer_pub = _X25519PubKey.from_public_bytes(public_key.x25519)
        x25519_ss = eph_priv.exchange(peer_pub)  # 32 bytes

        # --- ML-KEM-768 encapsulation (optional) ---
        ml_kem_ct = b""
        ml_kem_ss = b""

        if public_key.ml_kem and _PQ_BACKEND == "oqs":
            try:
                kem = oqs.KeyEncapsulation("ML-KEM-768")  # type: ignore[name-defined]
                ml_kem_ct, ml_kem_ss = kem.encap_secret(public_key.ml_kem)
            except Exception:
                warnings.warn(
                    "ML-KEM-768 encapsulation failed; using X25519 only",
                    PostQuantumUnavailableWarning,
                    stacklevel=2,
                )

        # --- Combine shared secrets ---
        combined = QShieldKEM._combine_secrets(x25519_ss, ml_kem_ss)

        ciphertext = QShieldKEMCiphertext(x25519=eph_pub_bytes, ml_kem=ml_kem_ct)
        return ciphertext, combined

    @staticmethod
    def decapsulate(
        secret_key: QShieldKEMSecretKey,
        ciphertext: QShieldKEMCiphertext,
    ) -> bytes:
        """Decapsulate a shared secret from a ciphertext.

        Args:
            secret_key: Recipient's secret key.
            ciphertext: The ciphertext to decapsulate.

        Returns:
            The shared secret (``QSHIELD_SHARED_SECRET_SIZE`` bytes).
        """
        # --- X25519 decapsulation ---
        priv = X25519PrivateKey.from_private_bytes(secret_key.x25519)
        peer_eph_pub = _X25519PubKey.from_public_bytes(ciphertext.x25519)
        x25519_ss = priv.exchange(peer_eph_pub)

        # --- ML-KEM-768 decapsulation (optional) ---
        ml_kem_ss = b""

        if (
            secret_key.ml_kem
            and ciphertext.ml_kem
            and _PQ_BACKEND == "oqs"
        ):
            try:
                kem = oqs.KeyEncapsulation("ML-KEM-768", secret_key.ml_kem)  # type: ignore[name-defined]
                ml_kem_ss = kem.decap_secret(ciphertext.ml_kem)
            except Exception:
                warnings.warn(
                    "ML-KEM-768 decapsulation failed; using X25519 only",
                    PostQuantumUnavailableWarning,
                    stacklevel=2,
                )

        return QShieldKEM._combine_secrets(x25519_ss, ml_kem_ss)

    @staticmethod
    def shared_secret_size() -> int:
        """Return the shared secret size in bytes."""
        return QSHIELD_SHARED_SECRET_SIZE

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _combine_secrets(x25519_ss: bytes, ml_kem_ss: bytes) -> bytes:
        """Combine shared secrets using HKDF with domain separation.

        If ``ml_kem_ss`` is empty, derivation is based on X25519 alone.
        """
        kdf = QShieldKDF()
        parts = [x25519_ss]
        if ml_kem_ss:
            parts.append(ml_kem_ss)
        return kdf.combine(parts, DOMAIN_KEM_COMBINE, QSHIELD_SHARED_SECRET_SIZE)
