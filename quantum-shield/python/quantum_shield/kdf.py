"""
QShieldKDF - Quantum-resistant Key Derivation Function.

Provides:
    - HKDF-SHA-256 for key material combination (using ``cryptography`` library)
    - Argon2id for password-based key derivation (using ``argon2-cffi``)
    - Quantum-resistant salt generation
    - Domain separation for different use cases

Note:
    The Rust SDK uses HKDF-SHA3-512. The Python ``cryptography`` library does
    not expose SHA3 as a hash for HKDF, so we use HKDF-SHA-512 which provides
    equivalent security margins. The domain separation strings ensure output
    is unique to this SDK.
"""

import hashlib
import os
from dataclasses import dataclass, field
from typing import List, Optional, Sequence

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from .errors import InvalidKeyError, KeyDerivationError

# ---------------------------------------------------------------------------
# Try to import argon2-cffi.  It is a hard dependency but we defend against
# import failure so the rest of the module can still load.
# ---------------------------------------------------------------------------
try:
    from argon2.low_level import Type as _Argon2Type
    from argon2.low_level import hash_secret_raw as _argon2_hash_raw

    _HAS_ARGON2 = True
except ImportError:
    _HAS_ARGON2 = False

# ---------------------------------------------------------------------------
# Domain separation constants (matching Rust SDK)
# ---------------------------------------------------------------------------
DOMAIN_KEM_COMBINE = b"QShieldKEM-v1"
DOMAIN_ENCRYPTION = b"QShieldEncrypt-v1"
DOMAIN_SIGNING = b"QShieldSign-v1"
DOMAIN_HANDSHAKE = b"QShieldHandshake-v1"
DOMAIN_SESSION = b"QShieldSession-v1"
DOMAIN_PASSWORD = b"QShieldPassword-v1"


@dataclass
class KdfConfig:
    """Configuration for Argon2id password-based key derivation.

    Attributes:
        memory_cost: Memory usage in KiB (default 65536 = 64 MiB).
        time_cost: Number of iterations (default 3).
        parallelism: Degree of parallelism (default 4).
    """

    memory_cost: int = 65536   # 64 MiB
    time_cost: int = 3
    parallelism: int = 4

    @classmethod
    def high_security(cls) -> "KdfConfig":
        """Return a high-security configuration (256 MiB, 4 iterations)."""
        return cls(memory_cost=262144, time_cost=4, parallelism=4)

    @classmethod
    def low_memory(cls) -> "KdfConfig":
        """Return a low-memory configuration for constrained environments."""
        return cls(memory_cost=16384, time_cost=4, parallelism=2)


class DerivedKey:
    """Derived key material with best-effort zeroization.

    Wraps a ``bytearray`` so that the memory can be overwritten on deletion.
    """

    __slots__ = ("_key",)

    def __init__(self, key: bytes) -> None:
        self._key = bytearray(key)

    # --- accessors --------------------------------------------------------

    def as_bytes(self) -> bytes:
        """Return an immutable copy of the key bytes."""
        return bytes(self._key)

    def __len__(self) -> int:
        return len(self._key)

    def __bytes__(self) -> bytes:
        return bytes(self._key)

    def __getitem__(self, index):
        return bytes(self._key)[index]

    # --- splitting --------------------------------------------------------

    def split(self, sizes: Sequence[int]) -> List["DerivedKey"]:
        """Split into multiple keys of the given sizes.

        Raises:
            KeyDerivationError: If total requested exceeds available bytes.
        """
        total = sum(sizes)
        if total > len(self._key):
            raise KeyDerivationError(
                f"Cannot split {len(self._key)} bytes into {total} bytes"
            )
        keys: List[DerivedKey] = []
        offset = 0
        for size in sizes:
            keys.append(DerivedKey(bytes(self._key[offset : offset + size])))
            offset += size
        return keys

    # --- cleanup ----------------------------------------------------------

    def zeroize(self) -> None:
        """Explicitly overwrite key material with zeros."""
        for i in range(len(self._key)):
            self._key[i] = 0

    def __del__(self) -> None:
        try:
            self.zeroize()
        except Exception:
            pass


class QShieldKDF:
    """Quantum-resistant Key Derivation Function.

    Combines HKDF-SHA-512 for key expansion / combination with Argon2id for
    password-based derivation.

    Args:
        config: Optional :class:`KdfConfig` for Argon2id parameters.
    """

    def __init__(self, config: Optional[KdfConfig] = None) -> None:
        self._config = config or KdfConfig()

    # ------------------------------------------------------------------
    # HKDF derivation
    # ------------------------------------------------------------------

    def derive(
        self,
        ikm: bytes,
        salt: Optional[bytes],
        info: bytes,
        length: int,
    ) -> bytes:
        """Derive key material using HKDF-SHA-512.

        Args:
            ikm: Input keying material.
            salt: Optional salt. If ``None`` a random 64-byte salt is generated.
                  Pass ``b""`` for deterministic derivation.
            info: Context / domain separation string.
            length: Desired output length in bytes.

        Returns:
            Derived key bytes.

        Raises:
            KeyDerivationError: On derivation failure.
        """
        if salt is None:
            salt = os.urandom(64)

        try:
            hkdf = HKDF(
                algorithm=hashes.SHA512(),
                length=length,
                salt=salt if salt else None,
                info=info,
            )
            return hkdf.derive(ikm)
        except Exception as exc:
            raise KeyDerivationError(f"HKDF derivation failed: {exc}") from exc

    def derive_with_salt(
        self,
        ikm: bytes,
        info: bytes,
        length: int,
    ) -> tuple:
        """Derive key material and return the generated salt alongside.

        Returns:
            ``(derived_bytes, salt)``
        """
        salt = os.urandom(64)
        derived = self.derive(ikm, salt, info, length)
        return derived, salt

    # ------------------------------------------------------------------
    # Key combination (for hybrid KEM)
    # ------------------------------------------------------------------

    def combine(
        self,
        keys: Sequence[bytes],
        info: bytes,
        length: int,
    ) -> bytes:
        """Combine multiple key materials into a single key using HKDF.

        Concatenates keys with length prefixes (matching the Rust SDK wire
        format) and derives the result with an empty salt for deterministic
        output.

        Args:
            keys: Sequence of key materials to combine.
            info: Domain separation string.
            length: Desired output length.

        Returns:
            Combined derived key bytes.
        """
        import struct

        combined = bytearray()
        for key in keys:
            combined.extend(struct.pack("<I", len(key)))
            combined.extend(key)
        combined.extend(struct.pack("<I", len(keys)))

        return self.derive(bytes(combined), b"", info, length)

    # ------------------------------------------------------------------
    # SHAKE-256 expansion
    # ------------------------------------------------------------------

    def expand(self, key: bytes, info: bytes, length: int) -> bytes:
        """Expand key material to arbitrary length using SHAKE-256.

        Args:
            key: Input key material.
            info: Context / domain separation string.
            length: Desired output length in bytes.

        Returns:
            Expanded key bytes.
        """
        h = hashlib.shake_256()
        h.update(key)
        h.update(info)
        h.update(length.to_bytes(8, "little"))
        return h.digest(length)

    # ------------------------------------------------------------------
    # Password-based derivation (Argon2id)
    # ------------------------------------------------------------------

    def derive_from_password(
        self,
        password: bytes,
        salt: bytes,
        length: int,
    ) -> bytes:
        """Derive a key from a password using Argon2id + HKDF.

        The Argon2id output is further processed through HKDF-SHA-512 with
        domain separation, matching the Rust SDK behaviour.

        Args:
            password: The password bytes.
            salt: Salt (should be at least 16 bytes; use :meth:`generate_salt`).
            length: Desired output length in bytes (max 1024).

        Returns:
            Derived key bytes.

        Raises:
            KeyDerivationError: On failure or if argon2 is not installed.
        """
        if length > 1024:
            raise KeyDerivationError("Maximum output length is 1024 bytes")

        if not _HAS_ARGON2:
            raise KeyDerivationError(
                "argon2-cffi is required for password-based key derivation. "
                "Install it with: pip install argon2-cffi"
            )

        try:
            raw = _argon2_hash_raw(
                secret=password,
                salt=salt,
                time_cost=self._config.time_cost,
                memory_cost=self._config.memory_cost,
                parallelism=self._config.parallelism,
                hash_len=length,
                type=_Argon2Type.ID,
            )
        except Exception as exc:
            raise KeyDerivationError(f"Argon2id derivation failed: {exc}") from exc

        # Apply additional HKDF step with domain separation (matches Rust SDK)
        try:
            hkdf = HKDF(
                algorithm=hashes.SHA512(),
                length=length,
                salt=DOMAIN_PASSWORD,
                info=b"QShieldPassword-final",
            )
            return hkdf.derive(raw)
        except Exception as exc:
            raise KeyDerivationError(
                f"Post-Argon2id HKDF step failed: {exc}"
            ) from exc

    # ------------------------------------------------------------------
    # Salt generation
    # ------------------------------------------------------------------

    @staticmethod
    def generate_salt(length: int = 32) -> bytes:
        """Generate a cryptographically secure random salt.

        Args:
            length: Salt length in bytes.

        Returns:
            Random salt bytes.
        """
        return os.urandom(length)
