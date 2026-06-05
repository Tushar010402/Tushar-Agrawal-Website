---
title: "Hybrid Cryptography: Why Ed25519 + ML-DSA Is the Safe Migration Path"
description: "Why serious post-quantum rollouts combine a classical and a post-quantum algorithm instead of switching outright. How hybrid signatures and KEMs work, how to combine them correctly, the pitfalls, and why QAuth signs with both Ed25519 and ML-DSA-65."
date: "2026-05-01"
author: "Tushar Agrawal"
tags: ["Hybrid Cryptography", "Post-Quantum Cryptography", "Ed25519", "ML-DSA", "ML-KEM", "Security", "Cryptography", "Crypto Agility"]
image: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=1200&h=630&fit=crop"
published: true
---

When I designed [QAuth](/blog/qauth-post-quantum-authentication-protocol), the most important decision wasn't *which* post-quantum algorithm to use — it was deciding **not to trust any single algorithm at all.** QAuth signs every token with two signatures: a classical **Ed25519** and a post-quantum **ML-DSA-65**. Both must verify. That belt-and-suspenders design is called **hybrid cryptography**, and in 2026 it is the consensus path for anyone who takes the migration seriously.

This post explains *why* — and how to combine two algorithms correctly, because doing it wrong quietly throws away the protection.

## The dilemma hybrids solve

You're caught between two risks:

- **Classical crypto (RSA, ECC, Ed25519)** is decades-tested against classical attacks — but **Shor's algorithm breaks it** once a cryptographically-relevant quantum computer exists. (See [the migration guide](/blog/post-quantum-cryptography-migration-guide-2026) for the threat model.)
- **Post-quantum crypto (ML-KEM, ML-DSA)** resists quantum attack — but it is *young*. ML-DSA was standardized in 2024. We have far less cryptanalytic confidence in lattice schemes than in elliptic curves, and history is full of "proven" schemes that later cracked.

So you're asked to bet your security on one of two algorithms, each with a different, serious failure mode. The hybrid answer is: **don't pick. Use both, such that an attacker must break both to win.**

## How a hybrid is secure if *either* algorithm holds

The defining property: a hybrid construction stays secure as long as **at least one** of its component algorithms is unbroken. The threat coverage is complete:

| Scenario | Classical (Ed25519) | Post-quantum (ML-DSA) | Hybrid result |
|----------|--------------------|-----------------------|---------------|
| Today (no quantum computer) | secure | secure | **secure** |
| Quantum computer arrives | broken | secure | **secure** (PQC holds) |
| Flaw found in young lattice scheme | secure | broken | **secure** (classical holds) |
| Both broken | broken | broken | broken |

Only the last row defeats you — and that requires both an unforeseen lattice break *and* a working quantum computer. The hybrid converts "bet on one horse" into "an attacker must win two independent races."

## Hybrid signatures: combine by concatenation (verify both)

For signatures, the construction is refreshingly simple and robust: **sign the same message independently with each algorithm, and require both signatures to verify.**

```python
def hybrid_sign(message: bytes, ed_sk, mldsa_sk) -> dict:
    return {
        "ed25519":   ed25519_sign(ed_sk, message),
        "ml_dsa_65": ml_dsa_sign(mldsa_sk, message),
    }

def hybrid_verify(message: bytes, sig: dict, ed_pk, mldsa_pk) -> bool:
    ok_classical = ed25519_verify(ed_pk, message, sig["ed25519"])
    ok_pq        = ml_dsa_verify(mldsa_pk, message, sig["ml_dsa_65"])
    return ok_classical and ok_pq          # BOTH must pass
```

The critical detail is the **`and`**. Requiring both is what gives you the "secure if either holds" guarantee for *forgery*: to forge a token, an attacker must forge under Ed25519 **and** under ML-DSA. This is exactly QAuth's token design.

One subtlety worth knowing: there's a small tension between availability and security. Requiring both signatures maximizes *unforgeability* (an attacker needs both). If your priority were *availability* under a single broken scheme, you'd want the opposite. For authentication tokens, unforgeability is the goal — so `and` is correct.

## Hybrid key exchange: combine the secrets through a KDF

For key exchange you can't just "verify both" — you have two shared secrets and need one session key. The rule: **never XOR or concatenate-and-use the raw secrets directly. Feed both into a KDF.**

```python
def hybrid_session_key(x25519_secret: bytes, mlkem_secret: bytes) -> bytes:
    # Bind BOTH secrets (and a transcript) into one key via a KDF.
    return hkdf_sha256(
        ikm=x25519_secret + mlkem_secret,   # both contribute entropy
        info=b"hybrid-x25519-mlkem768-v1",   # domain separation / context
        length=32,
    )
```

Because HKDF's output depends on *all* its input keying material, the session key is secure as long as **either** the X25519 secret or the ML-KEM secret is unknown to the attacker. This "KEM combiner" pattern is what TLS hybrid key exchange (X25519 + ML-KEM-768) uses in production today.

## Pitfalls that silently break a hybrid

Hybrids are easy to get subtly wrong. The ones I watch for:

- **The "either signature passes" bug.** Using `or` instead of `and` in verification means an attacker only has to break the *weaker* scheme — you've built a hybrid with the security of its *worst* component. Always `and`.
- **Sign different messages.** Both algorithms must sign the *exact same* bytes (including the same canonical encoding). If they sign different serializations, an attacker may mix-and-match a valid classical signature with a forged PQC one.
- **Using raw KEM secrets directly.** Skipping the KDF can leak structure or fail to bind both secrets. Always run both through a KEM combiner / KDF with domain separation.
- **No crypto-agility.** A hybrid is a *transition* tool. Hard-code `Ed25519+ML-DSA-65` and you'll fight the same migration battle again when the next standard lands. Keep the algorithm names as data, per [the migration guide](/blog/post-quantum-cryptography-migration-guide-2026).

## "Isn't this just twice the cost?"

Roughly, yes — two signatures to generate and verify, two keypairs to manage, and the payload carries both. The honest accounting:

- **Size** is the real cost. An Ed25519 + ML-DSA-65 signature is dominated by the ~3 KB ML-DSA part; the 64-byte Ed25519 addition is negligible on top. (Sizes are tabulated in [ML-KEM vs ML-DSA](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards).)
- **CPU** is modest — Ed25519 verification is extremely fast, so adding it to ML-DSA barely moves the needle.

For authentication and key exchange — operations measured in the thousands, not millions, per second — that overhead is a rounding error against the value of not getting your entire security stack broken by a single algorithmic surprise.

## The takeaway

Hybrid cryptography is risk management expressed in code. You're not choosing between "trust the old crypto" and "trust the new crypto" — you're refusing to make that bet at all, and requiring an attacker to defeat both an algorithm we deeply trust and one that's quantum-resistant. That's why QAuth signs with Ed25519 **and** ML-DSA-65, and why hybrid is the safe migration path. Combine by `and` for signatures, by a KDF for key exchange, keep it agile, and you get the best of both eras of cryptography until pure PQC has earned the same trust classical crypto took decades to build.

**Related reading:**
- [Migrating to Post-Quantum Cryptography: A Practical Developer Guide (2026)](/blog/post-quantum-cryptography-migration-guide-2026)
- [ML-KEM vs ML-DSA: NIST's Post-Quantum Standards Explained](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards)
- [QAuth: The Post-Quantum Authentication Protocol](/blog/qauth-post-quantum-authentication-protocol)
- [Authentication & Authorization: JWT and OAuth Guide](/blog/authentication-authorization-jwt-oauth-guide)
