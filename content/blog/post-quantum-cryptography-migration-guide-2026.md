---
title: "Migrating to Post-Quantum Cryptography: A Practical Developer Guide (2026)"
description: "Harvest-now-decrypt-later means quantum-vulnerable data is already being stolen today. A practical, no-hype migration guide: crypto-agility, where ML-KEM and ML-DSA fit, the hybrid rollout, and a concrete inventory-first plan for engineering teams."
date: "2026-04-02"
author: "Tushar Agrawal"
tags: ["Post-Quantum Cryptography", "PQC Migration", "ML-KEM", "ML-DSA", "Security", "Cryptography", "NIST FIPS", "Crypto Agility"]
image: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=630&fit=crop"
published: true
---

The uncomfortable truth about post-quantum cryptography is that you cannot wait for a quantum computer to exist before you act. Adversaries are already running a strategy called **harvest-now, decrypt-later**: capture encrypted traffic today, store it, and decrypt it years from now when a cryptographically-relevant quantum computer arrives. If your data needs to stay secret for a decade — health records, financial data, state secrets, even long-lived auth tokens — then for that data, the quantum threat is a *present-day* threat.

This is the practical migration guide I wish existed when I started building [QuantumShield](/blog/quantum-shield-post-quantum-cryptography) and [QAuth](/blog/qauth-post-quantum-authentication-protocol). No hype, no "quantum apocalypse" — just what an engineering team should actually do in 2026.

## What quantum computers break (and what they don't)

Two quantum algorithms matter for cryptography:

- **Shor's algorithm** efficiently factors large integers and solves discrete logarithms. This **breaks** RSA, Diffie-Hellman, and elliptic-curve cryptography (ECDH, ECDSA) — the asymmetric primitives that protect virtually all key exchange and digital signatures today.
- **Grover's algorithm** gives a quadratic speed-up on brute-force search. This **weakens** symmetric crypto, but only mildly: AES-128 effectively drops to ~64-bit security, while **AES-256 remains safe**. SHA-256/SHA-3 are similarly fine at appropriate sizes.

So the headline is precise: **symmetric crypto is mostly OK; asymmetric crypto is the problem.** Your TLS key exchange and your signatures are what need replacing — not your AES-256 data encryption.

## The NIST standards you'll actually use

In 2024 NIST finalized the first post-quantum standards. Three matter for most engineers:

| Standard | Name | Replaces | Use for |
|----------|------|----------|---------|
| **FIPS 203** | ML-KEM (Kyber) | ECDH / RSA key exchange | Establishing shared secrets / key encapsulation |
| **FIPS 204** | ML-DSA (Dilithium) | ECDSA / RSA signatures | Digital signatures, token signing |
| **FIPS 205** | SLH-DSA (SPHINCS+) | — | Conservative, hash-based signatures (firmware, roots of trust) |

**ML-KEM** is a Key Encapsulation Mechanism — it is how two parties agree on a shared secret in a quantum-safe way. **ML-DSA** is a signature scheme. If you understand "ECDH for key exchange, ECDSA for signatures," then the mapping is simply ML-KEM and ML-DSA respectively. I go deeper on choosing between them in [ML-KEM vs ML-DSA](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards).

## The one principle that makes migration survivable: crypto-agility

The single biggest mistake teams make is hard-coding algorithms. If `RSA` is hard-wired across your codebase, swapping it is a months-long, error-prone slog. The fix is **crypto-agility**: route every cryptographic operation through an abstraction that names the algorithm as data, not as code.

```python
# Not this — the algorithm is welded into call sites everywhere:
signature = rsa_sign(private_key, message)

# This — the algorithm is a parameter, swappable without touching call sites:
signature = signer.sign(message, alg="ML-DSA-65")
# later, or per-context:
signature = signer.sign(message, alg="hybrid:Ed25519+ML-DSA-65")
```

Crypto-agility is what lets you roll out PQC incrementally, run hybrids, and — critically — roll *back* if a new scheme is found weak. PQC schemes are younger than RSA; agility is your insurance policy.

## Why you deploy hybrids first, not pure PQC

The recommended migration path is **hybrid**: combine a battle-tested classical algorithm with a post-quantum one, so the result is secure if *either* holds. For key exchange, you derive the session key from both an ECDH secret and an ML-KEM secret. For signatures, you attach both an Ed25519 and an ML-DSA signature and require both to verify.

The reasoning is risk symmetry:

- Classical crypto (RSA/ECC) is proven against classical attacks but doomed against quantum ones.
- PQC is quantum-resistant but younger and less battle-tested against classical cryptanalysis.
- A hybrid is broken only if *both* are broken — covering you against a quantum computer **and** against an unforeseen weakness in the newer PQC scheme.

This is exactly the design choice behind QAuth's dual `Ed25519 + ML-DSA-65` signatures. I unpack the trade-offs in [why hybrid Ed25519 + ML-DSA is the safe path](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration). Pure PQC is the destination; hybrid is how you travel there safely.

## A concrete migration plan

You do not migrate "the company." You migrate one cryptographic dependency at a time, highest-risk first.

### 1. Inventory your cryptography

You cannot protect what you cannot see. Build a **cryptographic bill of materials**: every place you use asymmetric crypto — TLS endpoints, JWT/token signing, mTLS between services, code signing, stored encrypted blobs, VPNs, database TLS. For each, record the algorithm, key size, and — most importantly — **how long the protected data must stay confidential.**

### 2. Prioritize by data lifetime

Apply the harvest-now-decrypt-later lens. Sort by `(confidentiality_lifetime × exposure)`:

- **Urgent:** long-lived secrets crossing networks that adversaries can capture — health records, financial data, anything regulated for 7–10+ years.
- **Later:** ephemeral data whose value evaporates in minutes (a short-lived session that's worthless once expired).

Data that must stay secret until 2040 needs quantum-safe key exchange *today*, even though no quantum computer exists yet.

### 3. Add crypto-agility where it's missing

Before swapping algorithms, introduce the abstraction layer. This is often the largest engineering task and the most valuable one.

### 4. Roll out hybrids, behind flags

Deploy hybrid key exchange and hybrid signatures behind feature flags, starting with internal service-to-service traffic where you control both ends. Measure the overhead (ML-KEM/ML-DSA keys and signatures are larger than ECC — expect bigger handshakes and tokens) and watch your tail latencies.

### 5. Monitor, then expand

Verify interoperability, watch error rates and latency, then widen the rollout outward to external-facing endpoints as client support matures.

## What this costs you

Be honest with stakeholders about the trade-offs:

- **Larger keys and signatures.** ML-DSA-65 signatures are several kilobytes versus ~64 bytes for Ed25519. This inflates tokens, certificates, and handshake sizes — relevant for bandwidth-constrained or high-QPS systems.
- **More CPU**, though modern lattice implementations are fast — often competitive with or faster than RSA for equivalent operations.
- **Maturing tooling.** Library, HSM, and browser support is improving rapidly but is not yet universal. Hybrid mode is partly what bridges that gap.

None of these are blockers. They are planning inputs.

## The takeaway

Post-quantum migration is not a fire drill, but it is also not optional, and the "harvest now" reality means the clock for long-lived data has already started. The winning strategy is unglamorous: **inventory your crypto, make it agile, and roll out hybrids worst-case-first.** Teams that build crypto-agility now will swap algorithms in an afternoon; teams that hard-coded RSA will spend quarters on it. Start with the abstraction layer — everything else follows from it.

**Related reading:**
- [QAuth: The Post-Quantum Authentication Protocol That Replaces OAuth 2.0 and JWT](/blog/qauth-post-quantum-authentication-protocol)
- [QuantumShield: Building a Post-Quantum Cryptography Library from Scratch](/blog/quantum-shield-post-quantum-cryptography)
- [ML-KEM vs ML-DSA: NIST's Post-Quantum Standards Explained](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards)
- [Hybrid Cryptography: Why Ed25519 + ML-DSA Is the Safe Migration Path](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration)
