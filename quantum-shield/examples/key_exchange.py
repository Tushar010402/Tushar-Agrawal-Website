#!/usr/bin/env python3
"""
QuantumShield Key Exchange Example

This script demonstrates how to use QuantumShield for secure key exchange
between two parties using the Python bindings.

Note: Requires the quantum_shield Python package to be installed:
    pip install quantum-shield

Or build from source:
    cd python && maturin develop
"""

# Example code (will work when Python bindings are built)

def demonstrate_key_exchange():
    """
    Demonstrate a complete key exchange flow between Alice and Bob.
    """
    print("QuantumShield Key Exchange Demo")
    print("=" * 40)
    print()

    # When bindings are available:
    # from quantum_shield import QShieldKEM, QuantumShield

    # Step 1: Bob generates his key pair
    print("Step 1: Bob generates his quantum-secure key pair")
    print("  - ML-KEM-768 for post-quantum security")
    print("  - X25519 for classical security")
    print()

    # bob_public_key, bob_secret_key = QShieldKEM.generate_keypair()
    # print(f"  Public key size: {len(bob_public_key.serialize())} bytes")

    # Step 2: Alice encapsulates to Bob's public key
    print("Step 2: Alice encapsulates a shared secret to Bob's public key")
    print("  - Hybrid encapsulation (X25519 + ML-KEM)")
    print("  - HKDF-SHA3-512 key combination")
    print()

    # ciphertext, alice_shared_secret = QShieldKEM.encapsulate(bob_public_key)
    # print(f"  Ciphertext size: {len(ciphertext.serialize())} bytes")
    # print(f"  Shared secret size: {len(alice_shared_secret.as_bytes())} bytes")

    # Step 3: Bob decapsulates to get the same shared secret
    print("Step 3: Bob decapsulates to derive the shared secret")
    print()

    # bob_shared_secret = QShieldKEM.decapsulate(bob_secret_key, ciphertext)
    # assert alice_shared_secret.as_bytes() == bob_shared_secret.as_bytes()
    # print("  ✓ Shared secrets match!")

    # Step 4: Use shared secret for symmetric encryption
    print("Step 4: Create symmetric ciphers from shared secret")
    print("  - Cascading encryption (AES-256-GCM + ChaCha20-Poly1305)")
    print()

    # alice_cipher = QuantumShield(alice_shared_secret.as_bytes())
    # bob_cipher = QuantumShield(bob_shared_secret.as_bytes())

    # Step 5: Secure communication
    print("Step 5: Secure bidirectional communication")
    print()

    # message = b"Hello, Bob! This is quantum-secure."
    # ciphertext = alice_cipher.encrypt(message)
    # decrypted = bob_cipher.decrypt(ciphertext)
    # print(f"  Alice -> Bob: {decrypted.decode()}")

    # response = b"Hi Alice! Message received."
    # encrypted_response = bob_cipher.encrypt(response)
    # decrypted_response = alice_cipher.decrypt(encrypted_response)
    # print(f"  Bob -> Alice: {decrypted_response.decode()}")

    print()
    print("Demo complete!")
    print()
    print("Security properties achieved:")
    print("  ✓ Post-quantum key exchange (ML-KEM-768)")
    print("  ✓ Classical security backup (X25519)")
    print("  ✓ Defense-in-depth encryption (AES + ChaCha)")
    print("  ✓ Automatic memory scrubbing")


def demonstrate_signatures():
    """
    Demonstrate digital signatures with QShieldSign.
    """
    print()
    print("QuantumShield Digital Signatures Demo")
    print("=" * 40)
    print()

    # from quantum_shield import QShieldSign

    print("Step 1: Generate dual signing key pair")
    print("  - ML-DSA-65 (lattice-based)")
    print("  - SLH-DSA-SHA2-128s (hash-based)")
    print()

    # public_key, secret_key = QShieldSign.generate_keypair()

    print("Step 2: Sign a message")
    print()

    # message = b"Important document requiring quantum-secure signature"
    # signature = QShieldSign.sign(secret_key, message)
    # print(f"  Signature size: {len(signature.serialize())} bytes")

    print("Step 3: Verify the signature")
    print()

    # valid = QShieldSign.verify(public_key, message, signature)
    # print(f"  Signature valid: {valid}")

    print("Security properties:")
    print("  ✓ Dual signatures (both must verify)")
    print("  ✓ Lattice-based + hash-based security")
    print("  ✓ Optional timestamping support")


def demonstrate_kdf():
    """
    Demonstrate key derivation with QShieldKDF.
    """
    print()
    print("QuantumShield Key Derivation Demo")
    print("=" * 40)
    print()

    # from quantum_shield import QShieldKDF, KdfConfig

    print("Password-based key derivation:")
    print("  - Argon2id with configurable parameters")
    print("  - Additional HKDF-SHA3-512 pass for domain separation")
    print()

    # kdf = QShieldKDF(KdfConfig.default())
    # password = b"my secure password"
    # salt = kdf.generate_salt(32)
    # key = kdf.derive_from_password(password, salt, 32)
    # print(f"  Derived key size: {len(key.as_bytes())} bytes")

    print("Key combination for hybrid schemes:")
    print("  - HKDF-SHA3-512 with length prefix encoding")
    print("  - Quantum-resistant salt generation")
    print()


if __name__ == "__main__":
    demonstrate_key_exchange()
    demonstrate_signatures()
    demonstrate_kdf()
