---
title: "Cryptographic Bill of Materials (CBOM): Step 1 of PQC Migration"
description: "You can't migrate cryptography you can't see. A practical guide to building a Cryptographic Bill of Materials — what to inventory, how to find hidden crypto, how to score by data lifetime, and how the CBOM becomes your post-quantum migration plan."
date: "2026-06-04"
author: "Tushar Agrawal"
tags: ["Post-Quantum Cryptography", "CBOM", "PQC Migration", "Cryptographic Inventory", "Security", "Compliance", "Crypto Agility", "Cryptography"]
image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=630&fit=crop"
published: true
---

Every serious post-quantum migration plan starts with the same unglamorous step, and almost everyone wants to skip it: **find all your cryptography first.** Not the crypto you *think* you use — the crypto you *actually* use, including the dependency three levels down that pins an RSA key, the legacy service nobody owns, and the TLS config you've never looked at. That inventory has a name now: a **Cryptographic Bill of Materials (CBOM)**. Building one is genuinely the highest-leverage thing you can do in 2026, because every later decision depends on it.

This is the practical how-to. It's the concrete first move behind [the PQC deadlines](/blog/post-quantum-cryptography-deadlines-2027-2030-2035) and [the migration guide](/blog/post-quantum-cryptography-migration-guide-2026).

## Why a CBOM, and why now

The logic is simple: you cannot protect, prioritize, or replace what you can't see. NIST, the NCSC, and every enterprise migration framework converge on inventory-first for a reason — the alternative is migrating blind and discovering the RSA you missed during an incident.

A CBOM is to cryptography what an SBOM (Software Bill of Materials) is to dependencies: a structured, maintained record of every cryptographic asset, where it's used, and its risk. The "harvest now, decrypt later" threat makes it urgent — data being captured today is already on the clock, and you can't triage it without knowing where it lives.

## What goes in a CBOM

For each cryptographic usage, capture enough to make a migration decision:

| Field | Why it matters |
|-------|----------------|
| **Asset / location** | Service, endpoint, library, or file where crypto is used |
| **Algorithm & key size** | RSA-2048, ECC P-256, AES-256… — what needs replacing vs what's fine |
| **Purpose** | Key exchange, signature, or data-at-rest encryption (determines ML-KEM vs ML-DSA vs nothing) |
| **Data confidentiality lifetime** | How long the protected data must stay secret — **the priority driver** |
| **Owner** | Who can actually change it |
| **Crypto-agility** | Is the algorithm swappable, or hard-coded? |

That fourth row — **data lifetime** — is the one most inventories forget and the most important. A session token that's worthless in 15 minutes and a medical record that must stay private for 30 years are completely different risks, even if both use the same algorithm.

## The hard part: finding crypto you forgot you had

The visible crypto is easy. The dangerous crypto is hidden. Hunt in all of these places:

- **TLS everywhere** — public endpoints, internal mTLS between services, database connections, message-broker TLS, VPNs.
- **Tokens and signatures** — JWT signing keys, API request signing, code/firmware signing, document signing.
- **Data at rest** — disk/volume encryption, encrypted database columns, encrypted backups and archives (these have the *longest* lifetimes — backups from today might be restored in 2040).
- **Dependencies** — the crypto your libraries use internally. A `package.json` or `requirements.txt` doesn't show you that a transitive dependency pins an algorithm. This is where automated scanning earns its keep.
- **Certificates and PKI** — your CA hierarchy, cert algorithms, and key sizes.
- **Secrets managers and HSMs** — what algorithms they're configured for.

Practical tactics: scan source for crypto API calls and hard-coded algorithm names, enumerate TLS configs across hosts, pull certificate inventories, and use SBOM/dependency tooling to surface library-level crypto. The goal of the first pass isn't perfection — it's to stop being blind.

## Turn the inventory into a priority order

A raw list isn't a plan. Sort it. Rank each asset by roughly:

```
risk ≈ data_confidentiality_lifetime × exposure × blast_radius
```

- **Urgent:** long-lived secrets crossing capturable networks — health, financial, legal, government data; long-retention backups. These are the harvest-now-decrypt-later targets. Migrate (in hybrid mode) first.
- **Important:** medium-lifetime data and broadly-exposed signing keys.
- **Later:** ephemeral data whose value evaporates quickly — short sessions, transient caches.

This sorted list **is** your migration roadmap. You're not migrating "the company"; you're migrating the top of this list first.

## Note crypto-agility while you're in there

For each asset, record whether the algorithm is **swappable** or **hard-coded**. This does double duty: it tells you the *effort* to migrate each item, and it surfaces the architectural debt you need to pay down. Hard-coded crypto is what turns migration into a multi-quarter slog; flagging it now lets you prioritize adding an [agility layer](/blog/post-quantum-cryptography-migration-guide-2026) where it'll hurt most.

## Keep it alive

A CBOM is not a one-time spreadsheet — it's a living artifact, like an SBOM. New services add crypto; dependencies change algorithms. Wire inventory updates into your process: a CI check that flags new cryptographic dependencies, a periodic re-scan, and ownership so it doesn't rot. The teams that will swap algorithms calmly when the [2030 deprecation](/blog/post-quantum-cryptography-deadlines-2027-2030-2035) lands are the ones whose CBOM is current and trusted.

## The takeaway

Building a Cryptographic Bill of Materials is the boring, decisive first step of post-quantum migration. Inventory every cryptographic use, hunt down the hidden ones (dependencies and backups especially), tag each with its data-confidentiality lifetime, and sort by risk. What falls out is a prioritized migration plan grounded in reality instead of guesswork. Start it in 2026 — before the deadlines force you to do it under pressure, and before you find the RSA you missed the hard way.

**Related reading:**
- [Post-Quantum Cryptography Deadlines: 2027, 2030 & 2035](/blog/post-quantum-cryptography-deadlines-2027-2030-2035)
- [Migrating to Post-Quantum Cryptography: A Practical Developer Guide (2026)](/blog/post-quantum-cryptography-migration-guide-2026)
- [Hybrid Cryptography: Why Ed25519 + ML-DSA Is the Safe Migration Path](/blog/hybrid-cryptography-ed25519-ml-dsa-safe-migration)
- [QuantumShield: Building a Post-Quantum Cryptography Library from Scratch](/blog/quantum-shield-post-quantum-cryptography)
