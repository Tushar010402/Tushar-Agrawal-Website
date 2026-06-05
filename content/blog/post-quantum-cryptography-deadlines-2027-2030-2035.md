---
title: "Post-Quantum Cryptography Deadlines: What 2027, 2030 & 2035 Mean for Your Stack"
description: "NSA's CNSA 2.0 sets a 2027 acquisition deadline; NIST deprecates RSA-2048 and ECC P-256 by 2030 and disallows them by 2035. A plain-English guide to the PQC timeline and what each date actually requires you to do."
date: "2026-06-01"
author: "Tushar Agrawal"
tags: ["Post-Quantum Cryptography", "PQC Migration", "NIST", "CNSA 2.0", "Compliance", "Security", "Cryptography", "Q-Day"]
image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop"
published: true
---

For years, "quantum threat" was a vague future problem. In 2026 it has dates on it. NIST's post-quantum standards are final, the NSA has published hard deadlines, and analysts are calling the enterprise transition a **$15 billion migration**. If you build or run systems that use cryptography — which is to say, all of them — the timeline has moved from "someday" to a calendar you can plan against.

This is the plain-English version: what 2027, 2030, and 2035 actually mean, and what each date requires you to *do*. For the engineering how-to, pair it with my [practical PQC migration guide](/blog/post-quantum-cryptography-migration-guide-2026).

## The two reasons the clock is already ticking

Before the dates, the two facts that make them urgent:

1. **Harvest-now, decrypt-later.** Adversaries can capture encrypted traffic *today* and decrypt it once a quantum computer arrives. So for any data that must stay secret for 5–10+ years, the deadline isn't when quantum computers exist — it's now.
2. **Migrations take 5–15 years.** NIST's own guidance describes the realistic horizon for a full cryptographic transition as five to fifteen years. The "2035" date is not far away when the work takes that long.

Together these mean the comfortable-sounding deadlines are actually tight.

## The timeline

| Date | Who sets it | What it means |
|------|-------------|---------------|
| **Aug 2024** | NIST | FIPS 203 (ML-KEM), 204 (ML-DSA), 205 (SLH-DSA) finalized — the standards exist |
| **Jan 1, 2027** | NSA (CNSA 2.0) | New US National Security System acquisitions must support PQC |
| **2030** | NIST (IR 8547) | RSA-2048 and ECC P-256 **deprecated** (discouraged, allowed with risk) |
| **2033–2035** | NSA / NIST | CNSA 2.0 exclusive for many classes; quantum-vulnerable algorithms **disallowed** in NIST standards by 2035 |

### What "2027" requires

The NSA's CNSA 2.0 suite becomes mandatory for **new** national-security-system acquisitions from January 1, 2027. Even if you're not a government contractor, this date matters: it sets the tone for the whole supply chain. Vendors selling to government must ship PQC, which means the libraries, HSMs, and products you depend on will have quantum-safe options by then — and procurement teams will start asking for them. If you sell software, "do you support PQC?" becomes a real question on security questionnaires around this date.

### What "2030" requires (deprecated)

In NIST's vocabulary, **deprecated** means an algorithm is still allowed but discouraged, and its use carries acknowledged risk. By 2030, RSA-2048 and ECC P-256 — the asymmetric workhorses behind most TLS and signatures today — hit this status. Practically: by 2030 you should have PQC (in hybrid mode) deployed for anything long-lived, and a concrete plan to retire pure-classical asymmetric crypto. Auditors and frameworks will start flagging deprecated algorithms.

### What "2035" requires (disallowed)

**Disallowed** is the hard stop: the algorithm may no longer be used in compliant systems. By 2035, quantum-vulnerable algorithms are removed from NIST standards entirely. If you're still running RSA/ECC for key exchange or signatures in a regulated context at that point, you're out of compliance. 2035 sounds distant, but at a 5–15 year migration horizon, a program that starts in 2026 is *on schedule*, not early.

## What this means for you, by situation

- **You build SaaS / web services.** Plan hybrid TLS (X25519 + ML-KEM) and PQC-capable signing on the 2030 horizon. Start your crypto inventory now (below). Long-lived secrets are the urgent part.
- **You sell software to enterprises/government.** "PQC support" becomes a sales requirement around 2027. Being early is a differentiator on security questionnaires.
- **You handle long-confidentiality data** (health, finance, legal, government — exactly the kind I've built for). Harvest-now-decrypt-later makes this your *most urgent* category regardless of the headline dates.
- **You're an individual engineer.** PQC fluency is becoming a hiring signal. Understanding [ML-KEM vs ML-DSA](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards) and [hybrid cryptography](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration) is a genuinely scarce, valuable skill.

## The first concrete step (do this in 2026)

You cannot migrate what you cannot see. The universal starting move — the one every framework and the NCSC and NIST all agree on — is to **build a cryptographic inventory**, a Cryptographic Bill of Materials (CBOM): every place you use asymmetric crypto, the algorithm, and how long the data it protects must stay confidential. That inventory, sorted by data lifetime, *is* your migration plan. I walk through building one in [Cryptographic Bill of Materials (CBOM): Step 1 of PQC Migration](/blog/cryptographic-bill-of-materials-cbom-pqc-migration).

The second move is **crypto-agility** — routing crypto through an abstraction so swapping algorithms is config, not a rewrite. That's what turns these deadlines from a panic into a schedule, and it's the core of the [migration guide](/blog/post-quantum-cryptography-migration-guide-2026).

## The takeaway

The post-quantum transition now has real dates: **2027** (NSA acquisitions), **2030** (RSA/ECC deprecated), **2035** (disallowed). Because migrations take 5–15 years and "harvest now, decrypt later" is already in play, a program that begins in 2026 with a crypto inventory and an agility layer is exactly on time. The organizations that treat these as a 2034 problem will be the ones doing it in a panic; the ones that start their CBOM this year will swap algorithms calmly when the deadlines land.

**Related reading:**
- [Migrating to Post-Quantum Cryptography: A Practical Developer Guide (2026)](/blog/post-quantum-cryptography-migration-guide-2026)
- [Cryptographic Bill of Materials (CBOM): Step 1 of PQC Migration](/blog/cryptographic-bill-of-materials-cbom-pqc-migration)
- [ML-KEM vs ML-DSA: NIST's Post-Quantum Standards Explained](/blog/ml-kem-vs-ml-dsa-nist-post-quantum-standards)
- [QAuth: The Post-Quantum Authentication Protocol](/blog/qauth-post-quantum-authentication-protocol)
