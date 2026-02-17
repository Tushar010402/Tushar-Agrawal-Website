"""
QuantumShield - Quantum-Secure Cryptographic Library
=====================================================

A pure-Python implementation of the QuantumShield cryptographic library,
providing hybrid post-quantum cryptography with defense-in-depth.

Features:
    - **QShieldKEM**: Hybrid key encapsulation (X25519 + ML-KEM-768)
    - **QShieldSign**: Dual digital signatures (ML-DSA-65 + Ed25519)
    - **QuantumShield**: Cascading symmetric encryption (AES-256-GCM + ChaCha20-Poly1305)
    - **QShieldKDF**: Key derivation (Argon2id + HKDF-SHA-512)

Post-quantum algorithms require the ``oqs`` (liboqs-python) package.
Without it, the library operates in classical-only mode with X25519 KEM
and dual Ed25519 signatures, issuing appropriate warnings.

Quick start::

    from quantum_shield import QShieldKEM, QuantumShield

    # Generate keys
    public_key, secret_key = QShieldKEM.generate_keypair()

    # Encapsulate a shared secret
    ciphertext, shared_secret = QShieldKEM.encapsulate(public_key)

    # Decapsulate
    decapsulated = QShieldKEM.decapsulate(secret_key, ciphertext)

    # Symmetric encryption
    cipher = QuantumShield(shared_secret)
    encrypted = cipher.encrypt(b"Hello, quantum world!")
    decrypted = cipher.decrypt(encrypted)
"""

__version__ = "0.1.0"

# --- Error types ---
from .errors import (
    QShieldError,
    InvalidKeyError,
    EncryptionError,
    DecryptionError,
    InvalidCiphertextError,
    KeyDerivationError,
    SignatureError,
    ParseError,
    PostQuantumUnavailableWarning,
)

# --- Cascading symmetric cipher ---
from .cipher import (
    QuantumShield,
    AES_KEY_SIZE,
    AES_NONCE_SIZE,
    AES_TAG_SIZE,
    CHACHA_KEY_SIZE,
    CHACHA_NONCE_SIZE,
    CHACHA_TAG_SIZE,
    QSHIELD_KEY_SIZE,
    QSHIELD_OVERHEAD,
)

# --- Hybrid KEM ---
from .kem import (
    QShieldKEM,
    QShieldKEMPublicKey,
    QShieldKEMSecretKey,
    QShieldKEMCiphertext,
    QSHIELD_SHARED_SECRET_SIZE,
)

# --- Dual signatures ---
from .sign import (
    QShieldSign,
    QShieldSignPublicKey,
    QShieldSignSecretKey,
    QShieldSignature,
)

# --- Key derivation ---
from .kdf import (
    QShieldKDF,
    KdfConfig,
    DerivedKey,
    DOMAIN_KEM_COMBINE,
    DOMAIN_ENCRYPTION,
    DOMAIN_SIGNING,
    DOMAIN_HANDSHAKE,
    DOMAIN_SESSION,
    DOMAIN_PASSWORD,
)

__all__ = [
    # Version
    "__version__",
    # Errors
    "QShieldError",
    "InvalidKeyError",
    "EncryptionError",
    "DecryptionError",
    "InvalidCiphertextError",
    "KeyDerivationError",
    "SignatureError",
    "ParseError",
    "PostQuantumUnavailableWarning",
    # Cipher
    "QuantumShield",
    "AES_KEY_SIZE",
    "AES_NONCE_SIZE",
    "AES_TAG_SIZE",
    "CHACHA_KEY_SIZE",
    "CHACHA_NONCE_SIZE",
    "CHACHA_TAG_SIZE",
    "QSHIELD_KEY_SIZE",
    "QSHIELD_OVERHEAD",
    # KEM
    "QShieldKEM",
    "QShieldKEMPublicKey",
    "QShieldKEMSecretKey",
    "QShieldKEMCiphertext",
    "QSHIELD_SHARED_SECRET_SIZE",
    # Sign
    "QShieldSign",
    "QShieldSignPublicKey",
    "QShieldSignSecretKey",
    "QShieldSignature",
    # KDF
    "QShieldKDF",
    "KdfConfig",
    "DerivedKey",
    "DOMAIN_KEM_COMBINE",
    "DOMAIN_ENCRYPTION",
    "DOMAIN_SIGNING",
    "DOMAIN_HANDSHAKE",
    "DOMAIN_SESSION",
    "DOMAIN_PASSWORD",
]
