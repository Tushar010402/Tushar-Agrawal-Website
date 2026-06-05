---
title: "ML-KEM vs ML-DSA: NIST's Post-Quantum Standards Explained"
description: "ML-KEM (FIPS 203) and ML-DSA (FIPS 204) solve two different problems — key exchange vs digital signatures. A clear, developer-focused explainer on what each does, their security levels, key and signature sizes, and when to use which."
date: "2026-04-15"
author: "Tushar Agrawal"
tags: ["ML-KEM", "ML-DSA", "Post-Quantum Cryptography", "Kyber", "Dilithium", "NIST FIPS", "Cryptography", "Security"]
image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=630&fit=crop"
published: true
---

When teams start their post-quantum journey, the first confusion is almost always the same: **"Do I need ML-KEM or ML-DSA?"** The short answer is usually *both* — because they solve two completely different problems. ML-KEM gets two parties a shared secret. ML-DSA proves who signed something. Confusing them is like confusing Diffie-Hellman with RSA signatures: related field, different jobs.

This is the developer-focused explainer. For the bigger picture of *how* to migrate, read [the practical PQC migration guide](/blog/post-quantum-cryptography-migration-guide-2026) first.

## The two problems cryptography has to solve

Almost all public-key cryptography exists to do one of two things:

1. **Agree on a shared secret over an insecure channel** — so two parties can then use fast symmetric encryption (AES). Classically: Diffie-Hellman / ECDH, or RSA key transport.
2. **Prove authenticity and integrity** — that a message came from a specific party and wasn't tampered with. Classically: RSA or ECDSA/Ed25519 signatures.

Quantum computers (via Shor's algorithm) break the classical answer to *both*. NIST standardized a replacement for each:

- **ML-KEM (FIPS 203)** → problem 1, key exchange.
- **ML-DSA (FIPS 204)** → problem 2, signatures.

Both are built on **module lattices** — the "ML" prefix — whose security rests on the hardness of lattice problems (Module-LWE / Module-SIS) believed to resist both classical and quantum attack.

## ML-KEM: the key exchange (FIPS 203, formerly Kyber)

ML-KEM is a **Key Encapsulation Mechanism**. The flow is slightly different from Diffie-Hellman, so it's worth seeing:

1. Alice generates a keypair and sends Bob her **public key**.
2. Bob runs **encapsulate(public_key)**, which produces two things: a **shared secret** and a **ciphertext**. Bob keeps the secret, sends Alice the ciphertext.
3. Alice runs **decapsulate(ciphertext, private_key)** and recovers the **same shared secret**.

Now both sides hold an identical secret that never crossed the wire, and they switch to AES-256 for bulk encryption.

```text
Alice                                  Bob
  | --- public_key ----------------->  |
  |                                     |  (shared, ct) = encapsulate(public_key)
  | <-- ciphertext -------------------  |
  |  shared = decapsulate(ct, sk)       |
  |======== both hold `shared` =========|
```

ML-KEM comes in three parameter sets keyed to NIST security categories:

| Parameter set | NIST level | Roughly comparable to |
|---------------|-----------|------------------------|
| ML-KEM-512 | Category 1 | AES-128 |
| ML-KEM-768 | Category 3 | AES-192 |
| ML-KEM-1024 | Category 5 | AES-256 |

**ML-KEM-768** is the common default — a strong balance of security and size, and what many TLS hybrid deployments use today.

## ML-DSA: the signature (FIPS 204, formerly Dilithium)

ML-DSA is a **digital signature** scheme — the quantum-safe replacement for ECDSA/Ed25519/RSA signatures. The shape is familiar:

- **sign(private_key, message) → signature**
- **verify(public_key, message, signature) → valid / invalid**

You use it anywhere you sign today: tokens (this is what makes [QAuth](/blog/qauth-post-quantum-authentication-protocol) quantum-safe), certificates, code/firmware signing, and software releases. Its parameter sets:

| Parameter set | NIST level |
|---------------|-----------|
| ML-DSA-44 | Category 2 |
| ML-DSA-65 | Category 3 |
| ML-DSA-87 | Category 5 |

**ML-DSA-65** is the typical default for general-purpose signing.

## The thing that surprises everyone: the sizes

Lattice cryptography is fast, but it is **big**. This is the practical cost that shapes real deployments. Approximate sizes:

| Scheme | Public key | "Payload" | vs classical |
|--------|-----------|-----------|--------------|
| Ed25519 (classical) | 32 B | 64 B signature | baseline |
| X25519 (classical KEM-ish) | 32 B | 32 B | baseline |
| ML-KEM-768 | ~1,184 B | ~1,088 B ciphertext | ~30–40× larger |
| ML-DSA-65 | ~1,952 B | ~3,300 B signature | ~50× larger signature |

Read that again: an ML-DSA-65 signature is **several kilobytes** versus 64 bytes for Ed25519. The algorithms are computationally fast — often competitive with RSA — but the *bytes on the wire* are the real engineering consideration. It inflates:

- **Tokens** — a signed token jumps from a few hundred bytes to several KB.
- **TLS handshakes** — bigger key-exchange and certificate messages.
- **Certificates** — larger public keys and signatures.

For high-QPS APIs or bandwidth-constrained clients (IoT, mobile in low-connectivity regions), measure this. It rarely blocks adoption, but it absolutely changes your latency and bandwidth budgets.

## When to use which — a decision cheat sheet

- **Establishing a secure channel / session key?** → **ML-KEM**. (TLS, VPNs, encrypting data for a recipient.)
- **Proving who created or approved something?** → **ML-DSA**. (Tokens, certificates, code signing, document signing.)
- **Building auth like QAuth?** → **both**: ML-KEM to protect the channel/payload, ML-DSA to sign the token.
- **Need maximum conservatism for a root of trust / firmware?** → consider **SLH-DSA (FIPS 205)**, a hash-based signature with very large signatures but a security argument resting only on hash functions.

## A note on hybrids

In practice you rarely deploy these *alone* in 2026. The recommended rollout pairs each with a classical algorithm — **X25519 + ML-KEM** for key exchange, **Ed25519 + ML-DSA** for signatures — so you're protected if either the classical *or* the post-quantum scheme is later broken. The reasoning is in [why hybrid Ed25519 + ML-DSA is the safe path](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration).

## The takeaway

Keep the two jobs straight and the rest follows: **ML-KEM = key exchange, ML-DSA = signatures.** Default to ML-KEM-768 and ML-DSA-65 unless you have a specific reason to go higher or lower, budget for kilobyte-scale keys and signatures, and deploy them in hybrid mode. Get those choices right and you have the cryptographic core of a quantum-safe system.

**Related reading:**
- [Migrating to Post-Quantum Cryptography: A Practical Developer Guide (2026)](/blog/post-quantum-cryptography-migration-guide-2026)
- [Hybrid Cryptography: Why Ed25519 + ML-DSA Is the Safe Migration Path](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration)
- [QuantumShield: Building a Post-Quantum Cryptography Library from Scratch](/blog/quantum-shield-post-quantum-cryptography)
- [QAuth: The Post-Quantum Authentication Protocol](/blog/qauth-post-quantum-authentication-protocol)
