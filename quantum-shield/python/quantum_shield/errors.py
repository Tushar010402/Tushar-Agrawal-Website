"""
QuantumShield error types.

Provides a unified exception hierarchy matching the Rust SDK's error types.
"""


class QShieldError(Exception):
    """Base exception for all QuantumShield errors."""

    pass


class InvalidKeyError(QShieldError):
    """Raised when a cryptographic key is invalid or has incorrect length."""

    pass


class EncryptionError(QShieldError):
    """Raised when an encryption operation fails."""

    pass


class DecryptionError(QShieldError):
    """Raised when a decryption operation fails (e.g. wrong key, tampered ciphertext)."""

    pass


class InvalidCiphertextError(QShieldError):
    """Raised when ciphertext is malformed or too short."""

    pass


class KeyDerivationError(QShieldError):
    """Raised when key derivation fails."""

    pass


class SignatureError(QShieldError):
    """Raised when a signature operation fails."""

    pass


class ParseError(QShieldError):
    """Raised when deserialization of a cryptographic object fails."""

    pass


class PostQuantumUnavailableWarning(UserWarning):
    """Warning issued when post-quantum algorithms are not available.

    This means the library is operating in classical-only mode.
    X25519 KEM and Ed25519 signatures are used as fallbacks.
    """

    pass
