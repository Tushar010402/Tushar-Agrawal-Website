"""
QShieldSign - Dual Digital Signature Scheme.

Combines a classical signature algorithm with a post-quantum signature
algorithm for defense-in-depth.  Both signatures must verify for the
combined signature to be valid.

Backend selection:
    - **With ``oqs``**: ML-DSA-65 (lattice-based) + fallback Ed25519
      (SLH-DSA Python bindings are not widely available yet, so we
      substitute Ed25519 as the second classical signer when ``oqs`` is
      present -- the ML-DSA-65 component provides the PQ protection.)
    - **Without ``oqs``**: Dual Ed25519 with two independent key pairs
      (one simulates the "ML-DSA" slot, the other the "SLH-DSA" slot).
      A warning is issued.

The wire format uses length-prefixed fields so that signatures from
different backend configurations can be detected and rejected.
"""

import hashlib
import struct
import time
import warnings
from dataclasses import dataclass
from typing import Optional, Tuple

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey as _Ed25519PubKey,
)
from cryptography.exceptions import InvalidSignature

from .errors import (
    ParseError,
    PostQuantumUnavailableWarning,
    QShieldError,
    SignatureError,
)

# ---------------------------------------------------------------------------
# Post-quantum backend detection
# ---------------------------------------------------------------------------
_PQ_BACKEND: Optional[str] = None

try:
    import oqs  # type: ignore[import-untyped]

    _PQ_BACKEND = "oqs"
except ImportError:
    pass


# ---------------------------------------------------------------------------
# Key / signature wrapper classes
# ---------------------------------------------------------------------------

@dataclass
class QShieldSignPublicKey:
    """Combined public key for the dual signature scheme.

    Attributes:
        primary: Primary signature public key bytes
                 (ML-DSA-65 when PQ available, else Ed25519).
        secondary: Secondary signature public key bytes (Ed25519).
        scheme: Identifier for the algorithm combination.
    """

    primary: bytes
    secondary: bytes
    scheme: str = "classical"

    def to_bytes(self) -> bytes:
        """Serialize to wire format."""
        scheme_bytes = self.scheme.encode("utf-8")
        buf = bytearray()
        buf.extend(struct.pack("<I", len(scheme_bytes)))
        buf.extend(scheme_bytes)
        buf.extend(struct.pack("<I", len(self.primary)))
        buf.extend(self.primary)
        buf.extend(struct.pack("<I", len(self.secondary)))
        buf.extend(self.secondary)
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldSignPublicKey":
        """Deserialize from wire format."""
        try:
            offset = 0
            (s_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            scheme = data[offset : offset + s_len].decode("utf-8")
            offset += s_len
            (p_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            primary = data[offset : offset + p_len]
            offset += p_len
            (sec_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            secondary = data[offset : offset + sec_len]
            return cls(primary=primary, secondary=secondary, scheme=scheme)
        except Exception as exc:
            raise ParseError(f"Failed to parse sign public key: {exc}") from exc

    def fingerprint(self) -> bytes:
        """Compute a SHA3-256 fingerprint of this public key."""
        h = hashlib.sha3_256()
        h.update(b"QShieldSign-fingerprint-v1")
        h.update(self.primary)
        h.update(self.secondary)
        return h.digest()


@dataclass
class QShieldSignSecretKey:
    """Combined secret key for the dual signature scheme.

    Attributes:
        primary: Primary signing secret key bytes.
        secondary: Secondary signing secret key bytes.
        scheme: Identifier for the algorithm combination.
    """

    primary: bytes
    secondary: bytes
    scheme: str = "classical"

    def to_bytes(self) -> bytes:
        """Serialize to wire format."""
        scheme_bytes = self.scheme.encode("utf-8")
        buf = bytearray()
        buf.extend(struct.pack("<I", len(scheme_bytes)))
        buf.extend(scheme_bytes)
        buf.extend(struct.pack("<I", len(self.primary)))
        buf.extend(self.primary)
        buf.extend(struct.pack("<I", len(self.secondary)))
        buf.extend(self.secondary)
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldSignSecretKey":
        """Deserialize from wire format."""
        try:
            offset = 0
            (s_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            scheme = data[offset : offset + s_len].decode("utf-8")
            offset += s_len
            (p_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            primary = data[offset : offset + p_len]
            offset += p_len
            (sec_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            secondary = data[offset : offset + sec_len]
            return cls(primary=primary, secondary=secondary, scheme=scheme)
        except Exception as exc:
            raise ParseError(f"Failed to parse sign secret key: {exc}") from exc


@dataclass
class QShieldSignature:
    """Combined dual signature.

    Attributes:
        primary: Signature bytes from the primary algorithm.
        secondary: Signature bytes from the secondary algorithm.
        scheme: Algorithm combination identifier.
        timestamp: Optional Unix timestamp (seconds since epoch).
    """

    primary: bytes
    secondary: bytes
    scheme: str = "classical"
    timestamp: Optional[int] = None

    def to_bytes(self) -> bytes:
        """Serialize to wire format."""
        scheme_bytes = self.scheme.encode("utf-8")
        flags = 0x01 if self.timestamp is not None else 0x00
        buf = bytearray()
        buf.extend(struct.pack("<H", flags))
        buf.extend(struct.pack("<I", len(scheme_bytes)))
        buf.extend(scheme_bytes)
        buf.extend(struct.pack("<I", len(self.primary)))
        buf.extend(self.primary)
        buf.extend(struct.pack("<I", len(self.secondary)))
        buf.extend(self.secondary)
        if self.timestamp is not None:
            buf.extend(struct.pack("<Q", self.timestamp))
        return bytes(buf)

    @classmethod
    def from_bytes(cls, data: bytes) -> "QShieldSignature":
        """Deserialize from wire format."""
        try:
            offset = 0
            (flags,) = struct.unpack_from("<H", data, offset)
            offset += 2
            (s_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            scheme = data[offset : offset + s_len].decode("utf-8")
            offset += s_len
            (p_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            primary = data[offset : offset + p_len]
            offset += p_len
            (sec_len,) = struct.unpack_from("<I", data, offset)
            offset += 4
            secondary = data[offset : offset + sec_len]
            offset += sec_len
            timestamp = None
            if flags & 0x01:
                (timestamp,) = struct.unpack_from("<Q", data, offset)
            return cls(
                primary=primary,
                secondary=secondary,
                scheme=scheme,
                timestamp=timestamp,
            )
        except Exception as exc:
            raise ParseError(f"Failed to parse signature: {exc}") from exc


# ---------------------------------------------------------------------------
# QShieldSign
# ---------------------------------------------------------------------------

class QShieldSign:
    """Dual Digital Signature Scheme.

    When ``oqs`` is available, combines ML-DSA-65 (post-quantum) with Ed25519
    (classical).  Otherwise, uses two independent Ed25519 key pairs with a
    warning that post-quantum protection is unavailable.

    Both signatures must verify for the combined signature to be valid.

    All methods are static, matching the Rust SDK pattern.

    Example::

        public_key, secret_key = QShieldSign.generate_keypair()
        signature = QShieldSign.sign(secret_key, b"message")
        valid = QShieldSign.verify(public_key, b"message", signature)
    """

    @staticmethod
    def pq_available() -> bool:
        """Return True if post-quantum algorithms are available."""
        return _PQ_BACKEND is not None

    @staticmethod
    def generate_keypair() -> Tuple[QShieldSignPublicKey, QShieldSignSecretKey]:
        """Generate a new dual signing key pair.

        Returns:
            A ``(public_key, secret_key)`` tuple.
        """
        if _PQ_BACKEND == "oqs":
            return QShieldSign._generate_keypair_pq()
        else:
            warnings.warn(
                "Post-quantum library (oqs) not installed. "
                "Signatures are using dual Ed25519 only, which is NOT "
                "post-quantum secure.",
                PostQuantumUnavailableWarning,
                stacklevel=2,
            )
            return QShieldSign._generate_keypair_classical()

    @staticmethod
    def sign(
        secret_key: QShieldSignSecretKey,
        message: bytes,
    ) -> QShieldSignature:
        """Sign a message with both algorithms.

        Args:
            secret_key: The signing key.
            message: The message to sign.

        Returns:
            A combined dual signature.
        """
        msg_hash = QShieldSign._hash_message(message)

        if secret_key.scheme == "pq":
            return QShieldSign._sign_pq(secret_key, msg_hash)
        else:
            return QShieldSign._sign_classical(secret_key, msg_hash)

    @staticmethod
    def sign_with_timestamp(
        secret_key: QShieldSignSecretKey,
        message: bytes,
        timestamp: Optional[int] = None,
    ) -> QShieldSignature:
        """Sign a message with both algorithms and a timestamp.

        Args:
            secret_key: The signing key.
            message: The message to sign.
            timestamp: Unix timestamp in seconds. Defaults to current time.

        Returns:
            A combined dual signature with timestamp.
        """
        if timestamp is None:
            timestamp = int(time.time())

        msg_hash = QShieldSign._hash_message_with_timestamp(message, timestamp)

        if secret_key.scheme == "pq":
            sig = QShieldSign._sign_pq(secret_key, msg_hash)
        else:
            sig = QShieldSign._sign_classical(secret_key, msg_hash)

        sig.timestamp = timestamp
        return sig

    @staticmethod
    def verify(
        public_key: QShieldSignPublicKey,
        message: bytes,
        signature: QShieldSignature,
    ) -> bool:
        """Verify a dual signature.

        Both sub-signatures must verify for the result to be ``True``.

        Args:
            public_key: The verification key.
            message: The message that was signed.
            signature: The signature to verify.

        Returns:
            ``True`` if both signatures are valid, ``False`` otherwise.
        """
        if signature.timestamp is not None:
            msg_hash = QShieldSign._hash_message_with_timestamp(
                message, signature.timestamp
            )
        else:
            msg_hash = QShieldSign._hash_message(message)

        if public_key.scheme == "pq":
            return QShieldSign._verify_pq(public_key, msg_hash, signature)
        else:
            return QShieldSign._verify_classical(public_key, msg_hash, signature)

    # ------------------------------------------------------------------
    # Message hashing (domain separated, matching Rust SDK)
    # ------------------------------------------------------------------

    @staticmethod
    def _hash_message(message: bytes) -> bytes:
        h = hashlib.sha3_256()
        h.update(b"QShieldSign-v1")
        h.update(len(message).to_bytes(8, "little"))
        h.update(message)
        return h.digest()

    @staticmethod
    def _hash_message_with_timestamp(message: bytes, timestamp: int) -> bytes:
        h = hashlib.sha3_256()
        h.update(b"QShieldSign-ts-v1")
        h.update(timestamp.to_bytes(8, "little"))
        h.update(len(message).to_bytes(8, "little"))
        h.update(message)
        return h.digest()

    # ------------------------------------------------------------------
    # Classical-only backend (dual Ed25519)
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_keypair_classical() -> Tuple[QShieldSignPublicKey, QShieldSignSecretKey]:
        # Two independent Ed25519 key pairs
        priv1 = Ed25519PrivateKey.generate()
        priv2 = Ed25519PrivateKey.generate()

        pub1_bytes = priv1.public_key().public_bytes_raw()
        pub2_bytes = priv2.public_key().public_bytes_raw()
        priv1_bytes = priv1.private_bytes_raw()
        priv2_bytes = priv2.private_bytes_raw()

        return (
            QShieldSignPublicKey(
                primary=pub1_bytes, secondary=pub2_bytes, scheme="classical"
            ),
            QShieldSignSecretKey(
                primary=priv1_bytes, secondary=priv2_bytes, scheme="classical"
            ),
        )

    @staticmethod
    def _sign_classical(
        secret_key: QShieldSignSecretKey, msg_hash: bytes
    ) -> QShieldSignature:
        try:
            priv1 = Ed25519PrivateKey.from_private_bytes(secret_key.primary)
            priv2 = Ed25519PrivateKey.from_private_bytes(secret_key.secondary)

            sig1 = priv1.sign(msg_hash)
            sig2 = priv2.sign(msg_hash)

            return QShieldSignature(
                primary=sig1, secondary=sig2, scheme="classical"
            )
        except Exception as exc:
            raise SignatureError(f"Classical signing failed: {exc}") from exc

    @staticmethod
    def _verify_classical(
        public_key: QShieldSignPublicKey,
        msg_hash: bytes,
        signature: QShieldSignature,
    ) -> bool:
        try:
            pub1 = _Ed25519PubKey.from_public_bytes(public_key.primary)
            pub1.verify(signature.primary, msg_hash)
        except InvalidSignature:
            return False
        except Exception:
            return False

        try:
            pub2 = _Ed25519PubKey.from_public_bytes(public_key.secondary)
            pub2.verify(signature.secondary, msg_hash)
        except InvalidSignature:
            return False
        except Exception:
            return False

        return True

    # ------------------------------------------------------------------
    # Post-quantum backend (ML-DSA-65 + Ed25519)
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_keypair_pq() -> Tuple[QShieldSignPublicKey, QShieldSignSecretKey]:
        # Primary: ML-DSA-65 via oqs
        try:
            signer = oqs.Signature("ML-DSA-65")  # type: ignore[name-defined]
            ml_pub = signer.generate_keypair()
            ml_priv = signer.export_secret_key()
        except Exception as exc:
            warnings.warn(
                f"ML-DSA-65 keygen failed ({exc}); falling back to classical",
                PostQuantumUnavailableWarning,
                stacklevel=3,
            )
            return QShieldSign._generate_keypair_classical()

        # Secondary: Ed25519
        ed_priv = Ed25519PrivateKey.generate()
        ed_pub_bytes = ed_priv.public_key().public_bytes_raw()
        ed_priv_bytes = ed_priv.private_bytes_raw()

        return (
            QShieldSignPublicKey(
                primary=ml_pub, secondary=ed_pub_bytes, scheme="pq"
            ),
            QShieldSignSecretKey(
                primary=ml_priv, secondary=ed_priv_bytes, scheme="pq"
            ),
        )

    @staticmethod
    def _sign_pq(
        secret_key: QShieldSignSecretKey, msg_hash: bytes
    ) -> QShieldSignature:
        try:
            # ML-DSA-65
            signer = oqs.Signature("ML-DSA-65", secret_key.primary)  # type: ignore[name-defined]
            ml_sig = signer.sign(msg_hash)

            # Ed25519
            ed_priv = Ed25519PrivateKey.from_private_bytes(secret_key.secondary)
            ed_sig = ed_priv.sign(msg_hash)

            return QShieldSignature(
                primary=ml_sig, secondary=ed_sig, scheme="pq"
            )
        except Exception as exc:
            raise SignatureError(f"PQ signing failed: {exc}") from exc

    @staticmethod
    def _verify_pq(
        public_key: QShieldSignPublicKey,
        msg_hash: bytes,
        signature: QShieldSignature,
    ) -> bool:
        # ML-DSA-65
        try:
            verifier = oqs.Signature("ML-DSA-65")  # type: ignore[name-defined]
            ml_valid = verifier.verify(msg_hash, signature.primary, public_key.primary)
            if not ml_valid:
                return False
        except Exception:
            return False

        # Ed25519
        try:
            pub = _Ed25519PubKey.from_public_bytes(public_key.secondary)
            pub.verify(signature.secondary, msg_hash)
        except InvalidSignature:
            return False
        except Exception:
            return False

        return True
