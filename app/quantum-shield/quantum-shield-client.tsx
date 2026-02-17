"use client";

import { HeroHighlight } from "@/components/ui/hero-highlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Spotlight } from "@/components/ui/spotlight";
import { motion } from "framer-motion";
import { WaitlistForm } from "@/components/quantum-shield/WaitlistForm";
import { FeatureCard } from "@/components/quantum-shield/FeatureCard";
import { CodePreview } from "@/components/quantum-shield/CodePreview";
import { StatsCounter } from "@/components/quantum-shield/StatsCounter";
import { AlgorithmBadge } from "@/components/quantum-shield/AlgorithmBadge";
import { GlowBackground } from "@/components/ui/glow-background";
import Link from "next/link";

const features = [
  {
    title: "Hybrid KEM",
    subtitle: "X25519 + ML-KEM-768",
    description:
      "Combines classical Elliptic Curve Diffie-Hellman with lattice-based ML-KEM for quantum-resistant key encapsulation. Security remains even if one algorithm is broken.",
    icon: "key",
    badge: "FIPS 203",
  },
  {
    title: "Dual Signatures",
    subtitle: "ML-DSA-65 + SLH-DSA",
    description:
      "Lattice-based ML-DSA paired with hash-based SLH-DSA provides cryptographic diversity. Two mathematically independent signature schemes for maximum assurance.",
    icon: "signature",
    badge: "FIPS 204/205",
  },
  {
    title: "Cascading Encryption",
    subtitle: "AES-256-GCM + ChaCha20-Poly1305",
    description:
      "Data encrypted with AES-256-GCM is re-encrypted with ChaCha20-Poly1305. An attacker must break both NIST and IETF approved ciphers.",
    icon: "layers",
    badge: "Defense-in-Depth",
  },
  {
    title: "Memory Safety",
    subtitle: "Rust + Zeroization",
    description:
      "Written in Rust with automatic memory zeroization. Secrets are scrubbed from memory immediately after use, preventing memory-based attacks.",
    icon: "shield",
    badge: "Rust-Powered",
  },
  {
    title: "Key Derivation",
    subtitle: "Argon2id + HKDF-SHA3-512",
    description:
      "Passwords are hardened with Argon2id (19MB memory-hard, GPU/ASIC resistant). Raw keys use HKDF-SHA3-512 with domain separation for cryptographic isolation.",
    icon: "hash",
    badge: "GPU Resistant",
  },
  {
    title: "Forward Secrecy",
    subtitle: "HMAC-SHA3-256 Ratcheting",
    description:
      "Session keys are ratcheted forward after each message using HMAC-SHA3-256. Past messages cannot be decrypted even if the current key is compromised.",
    icon: "refresh",
    badge: "PFS",
  },
];

const useCases = [
  {
    title: "Healthcare / HIPAA",
    description:
      "Protect patient records and PHI with encryption that will remain secure for decades. Meet HIPAA requirements today while preparing for quantum threats.",
    icon: "medical",
    color: "blue",
  },
  {
    title: "Financial Services",
    description:
      "Secure transactions, account data, and financial records. Regulatory compliance requires forward-looking security—QuantumShield delivers.",
    icon: "bank",
    color: "green",
  },
  {
    title: "Government & Defense",
    description:
      "Classified communications and sensitive government data require the highest security standards. NIST-approved algorithms for national security.",
    icon: "government",
    color: "purple",
  },
  {
    title: "Long-term Archives",
    description:
      "Data that must remain confidential for 50+ years—legal documents, intellectual property, research data. Quantum-safe encryption from day one.",
    icon: "archive",
    color: "orange",
  },
];

const codeExample = `use quantum_shield::{QShieldKEM, QuantumShield, QShieldSign};

// Hybrid key encapsulation (X25519 + ML-KEM-768)
let (public_key, secret_key) = QShieldKEM::generate_keypair()?;
let (ciphertext, shared_secret) = QShieldKEM::encapsulate(&public_key)?;
let decapsulated = QShieldKEM::decapsulate(&secret_key, &ciphertext)?;
// shared_secret == decapsulated

// Cascading encryption (AES-256-GCM + ChaCha20-Poly1305)
let cipher = QuantumShield::new(&shared_secret)?;
let encrypted = cipher.encrypt(b"Quantum-secure message")?;
let decrypted = cipher.decrypt(&encrypted)?;

// Dual signatures (ML-DSA-65 + SLH-DSA)
let signer = QShieldSign::new()?;
let sig = signer.sign(b"Sign this document")?;
assert!(signer.verify(b"Sign this document", &sig)?);`;

export default function QuantumShieldClient() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden transition-theme" style={{ background: "var(--background)" }}>
      {/* Hero Section */}
      <section id="hero" className="relative">
        <GlowBackground className="opacity-60" />
        <HeroHighlight containerClassName="pt-28 pb-12 min-h-[90vh] !items-start">
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="currentColor"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
            className="text-center px-4 max-w-5xl mx-auto"
          >
            {/* Shield Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div
                className="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))",
                  border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
                }}
              >
                <svg
                  className="w-12 h-12"
                  style={{ color: "var(--accent)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
            </motion.div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-theme leading-tight mb-6">
              Quantum-Secure Encryption
              <br />
              <span className="gradient-text">
                for the Post-Quantum Era
              </span>
            </h1>

            <div className="mb-8">
              <TextGenerateEffect
                words="Defense-in-depth cryptography with NIST-approved algorithms. Hybrid KEM, dual signatures, cascading encryption—built in Rust for memory safety."
                className="text-lg md:text-xl text-theme-secondary"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8">
              <Link
                href="#get-started"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--accent)" }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Get Started
              </Link>
              <Link
                href="/quantum-shield/demo"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-theme font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Try Live Demo
              </Link>
            </div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap justify-center gap-3 text-sm"
            >
              {["NIST FIPS 203/204/205", "Open Source", "Rust-Powered"].map((badge) => (
                <span
                  key={badge}
                  className="px-4 py-2 rounded-full text-theme-secondary"
                  style={{
                    background: "color-mix(in srgb, var(--surface) 50%, transparent)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {badge}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </HeroHighlight>
      </section>

      {/* Problem Statement Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Why Now?
          </h2>
          <p className="text-theme-secondary text-lg mb-12 max-w-3xl">
            The quantum computing threat isn&apos;t hypothetical—it&apos;s already
            happening.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1))",
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-theme">
                &quot;Harvest Now, Decrypt Later&quot;
              </h3>
            </div>
            <p className="text-theme-secondary leading-relaxed">
              Nation-state actors are actively collecting encrypted data today,
              storing it until quantum computers can break current encryption.
              Your RSA and ECC-encrypted data from today could be readable by
              2035.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                <svg
                  className="w-5 h-5"
                  style={{ color: "var(--accent)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-theme">The Timeline</h3>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-green-400 font-medium">2024 &#10003;</span>
                <span className="text-theme-secondary text-sm sm:text-base">
                  NIST finalized FIPS 203/204/205
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-amber-400 font-medium">2025-2030</span>
                <span className="text-theme-secondary text-sm sm:text-base">Migration window (we are here)</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                <span className="text-red-400 font-medium">2030-2035</span>
                <span className="text-red-300 text-sm sm:text-base">
                  Cryptographically relevant QC
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Urgency Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 rounded-2xl p-8 text-center"
          style={{
            background: "color-mix(in srgb, var(--surface) 50%, transparent)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-lg text-theme-secondary">
            If your data needs to remain confidential for{" "}
            <span className="text-theme font-semibold">10+ years</span>, you
            need post-quantum cryptography{" "}
            <span className="text-theme-accent font-semibold">today</span>.
          </p>
        </motion.div>
      </section>

      {/* Features Grid Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Defense-in-Depth Architecture
          </h2>
          <p className="text-theme-secondary text-lg max-w-3xl">
            Multiple layers of quantum-resistant algorithms working together.
            Even if one is compromised, your data remains secure.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={feature.title} feature={feature} index={idx} />
          ))}
        </div>
      </section>

      {/* Architecture & Code Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Simple API, Powerful Protection
          </h2>
          <p className="text-theme-secondary text-lg max-w-3xl">
            Quantum-secure cryptography shouldn&apos;t be complicated. A clean Rust
            API abstracts the complexity while maintaining maximum security.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 items-start overflow-hidden">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="min-w-0 overflow-hidden w-full"
          >
            <CodePreview code={codeExample} language="rust" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div
              className="rounded-2xl p-6"
              style={{
                background: "color-mix(in srgb, var(--surface) 50%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              <h3 className="text-xl font-bold text-theme mb-4">
                Algorithm Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                <AlgorithmBadge name="ML-KEM-768" standard="FIPS 203" />
                <AlgorithmBadge name="ML-DSA-65" standard="FIPS 204" />
                <AlgorithmBadge name="SLH-DSA" standard="FIPS 205" />
                <AlgorithmBadge name="X25519" standard="RFC 7748" />
                <AlgorithmBadge name="AES-256-GCM" standard="NIST" />
                <AlgorithmBadge name="ChaCha20-Poly1305" standard="IETF" />
                <AlgorithmBadge name="HKDF-SHA3-512" standard="RFC 5869" />
              </div>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{
                background: "color-mix(in srgb, var(--surface) 50%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              <h3 className="text-xl font-bold text-theme mb-4">
                Security Properties
              </h3>
              <ul className="space-y-3 text-theme-secondary">
                {[
                  "Quantum-resistant key exchange & signatures",
                  "Perfect forward secrecy",
                  "Constant-time operations (side-channel resistant)",
                  "Automatic memory zeroization",
                  "Domain-separated key derivation",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-theme-accent"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Built for Critical Infrastructure
          </h2>
          <p className="text-theme-secondary text-lg max-w-3xl">
            Industries where data confidentiality must be maintained for
            decades, not years.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {useCases.map((useCase, idx) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`bg-gradient-to-br ${
                useCase.color === "blue"
                  ? "from-blue-500/10 to-cyan-500/10 border-blue-500/20"
                  : useCase.color === "green"
                  ? "from-green-500/10 to-emerald-500/10 border-green-500/20"
                  : useCase.color === "purple"
                  ? "from-purple-500/10 to-pink-500/10 border-purple-500/20"
                  : "from-orange-500/10 to-amber-500/10 border-orange-500/20"
              } border rounded-2xl p-6 hover:scale-105 transition-transform`}
            >
              <div
                className={`w-12 h-12 ${
                  useCase.color === "blue"
                    ? "bg-blue-500/20"
                    : useCase.color === "green"
                    ? "bg-green-500/20"
                    : useCase.color === "purple"
                    ? "bg-purple-500/20"
                    : "bg-orange-500/20"
                } rounded-xl flex items-center justify-center mb-4`}
              >
                {useCase.icon === "medical" && (
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
                {useCase.icon === "bank" && (
                  <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {useCase.icon === "government" && (
                  <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                )}
                {useCase.icon === "archive" && (
                  <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-bold text-theme mb-2">
                {useCase.title}
              </h3>
              <p className="text-theme-secondary text-sm">{useCase.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Why QuantumShield Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Why QuantumShield?
          </h2>
          <p className="text-theme-secondary text-lg max-w-3xl">
            Built with the latest NIST-approved post-quantum algorithms for maximum security.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-6 md:p-8 max-w-3xl"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>
              <svg className="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-theme">Key Features</h3>
          </div>
          <ul className="space-y-3 text-theme-secondary">
            {[
              { strong: "NIST FIPS 203/204/205", text: ": ML-KEM-768, ML-DSA-65, SLH-DSA-SHAKE-128f — all three finalized standards" },
              { strong: "Hybrid KEM", text: ": X25519 + ML-KEM-768 — secure if EITHER algorithm holds" },
              { strong: "Dual signatures", text: ": Lattice-based + hash-based — two independent mathematical foundations" },
              { strong: "Cascading cipher", text: ": AES-256-GCM + ChaCha20-Poly1305 — both must be broken" },
              { strong: "Argon2id KDF", text: ": 19MB memory-hard password hashing, GPU/ASIC resistant" },
              { strong: "Memory safe", text: ": Written in Rust with automatic zeroization — no buffer overflows" },
              { strong: "WebAssembly ready", text: ": Runs in any browser with full post-quantum security" },
              { strong: "Open source", text: ": Fully auditable code under MIT license" },
            ].map((item) => (
              <li key={item.strong} className="flex items-start gap-2">
                <svg className="w-5 h-5 text-theme-accent mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>{item.strong}</strong>{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* QAuth Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                <svg className="w-10 h-10 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-theme-accent text-xs font-medium" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}>
                  NEW
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-theme">
                  QAuth
                </h2>
              </div>
              <p className="text-lg text-theme-accent mb-4">
                Post-Quantum Authentication Protocol
              </p>
              <p className="text-theme-secondary mb-6 max-w-2xl">
                Built on QuantumShield&apos;s crypto primitives, QAuth replaces OAuth 2.0 and JWT with
                dual signatures (Ed25519 + ML-DSA-65), encrypted payloads, mandatory proof-of-possession,
                and built-in revocation. The authentication protocol for the quantum era.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap justify-center md:justify-start gap-3">
                <Link href="/qauth" className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--accent)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Explore QAuth
                </Link>
                <Link href="/qauth/demo" className="flex items-center justify-center gap-2 px-6 py-3 rounded-full text-theme font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Try Demo
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Open Source Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-center"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--surface) 50%, transparent), color-mix(in srgb, var(--surface) 30%, transparent))",
            border: "1px solid var(--border)",
          }}
        >
          <div className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--surface)" }}>
            <svg className="w-8 h-8 text-theme" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-theme mb-4">
            Open Source & MIT Licensed
          </h2>
          <p className="text-theme-secondary text-lg max-w-2xl mx-auto mb-8">
            QuantumShield is fully open source. Audit the code, contribute
            improvements, report security issues, or learn from the implementation.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            <Link href="/quantum-shield/demo" className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--accent)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Try Live Demo
            </Link>
            <a href="https://github.com/Tushar010402/Tushar-Agrawal-Website/tree/master/quantum-shield" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-full text-theme font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                View on GitHub
            </a>
          </div>
        </motion.div>
      </section>

      {/* Get Started — SDK Installation */}
      <section id="get-started" className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-theme mb-4">
            Get Started
          </h2>
          <p className="text-theme-secondary text-lg max-w-3xl">
            Install QuantumShield and start encrypting with post-quantum security in minutes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Rust SDK */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.2))" }}>
                  <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.834 8.101a13.912 13.912 0 01-13.643 11.72 10.105 10.105 0 01-1.994-.12 6.111 6.111 0 01-5.082-5.761 5.934 5.934 0 011.752-4.564 5.015 5.015 0 01-.2-2.108c.162-1.476 1.07-2.91 2.67-2.91.525 0 1.048.178 1.517.507a7.327 7.327 0 013.24-.734 7.384 7.384 0 013.262.757c.47-.346 1-.534 1.534-.534 1.627 0 2.55 1.475 2.69 2.975a5 5 0 01-.17 2.043 5.936 5.936 0 011.757 4.568 5.968 5.968 0 01-.333 1.97" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-theme">Rust SDK</h3>
                  <p className="text-xs text-theme-muted">Native performance, full API</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20">
                Available
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-theme-muted mb-2 font-medium uppercase tracking-wider">Add to Cargo.toml</p>
                <CodePreview
                  code={`[dependencies]\nquantum-shield = { git = "https://github.com/Tushar010402/Tushar-Agrawal-Website", path = "quantum-shield/rust" }`}
                  language="toml"
                  fileName="Cargo.toml"
                />
              </div>
              <div>
                <p className="text-xs text-theme-muted mb-2 font-medium uppercase tracking-wider">Quick Example</p>
                <CodePreview
                  code={`use quantum_shield::{QShieldKEM, QuantumShield};\n\nlet (pk, sk) = QShieldKEM::generate_keypair()?;\nlet (ct, shared) = QShieldKEM::encapsulate(&pk)?;\nlet cipher = QuantumShield::new(&shared)?;\nlet encrypted = cipher.encrypt(b"Hello, quantum world!")?;`}
                  language="rust"
                  fileName="main.rs"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>5,358 lines</span>
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>FIPS 203/204/205</span>
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>MIT License</span>
              </div>
            </div>
          </motion.div>

          {/* WASM SDK */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.2))" }}>
                  <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-theme">WebAssembly SDK</h3>
                  <p className="text-xs text-theme-muted">Browser &amp; Node.js</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20">
                Available
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-theme-muted mb-2 font-medium uppercase tracking-wider">Build from Source</p>
                <CodePreview
                  code={`# Clone and build the WASM package\ngit clone https://github.com/Tushar010402/Tushar-Agrawal-Website.git\ncd Tushar-Agrawal-Website/quantum-shield/wasm\nwasm-pack build --target web`}
                  language="bash"
                  fileName="terminal"
                />
              </div>
              <div>
                <p className="text-xs text-theme-muted mb-2 font-medium uppercase tracking-wider">Quick Example</p>
                <CodePreview
                  code={`import init, { QShieldCipher, QShieldHybridKEM } from './pkg';\n\nawait init();\nconst cipher = QShieldCipher.new("my-password");\nconst encrypted = cipher.encrypt_string("Hello from WASM!");`}
                  language="typescript"
                  fileName="app.ts"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>~2MB WASM</span>
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>TypeScript types</span>
                <span className="text-xs px-2.5 py-1 rounded-full text-theme-secondary" style={{ background: "var(--surface-hover)", border: "1px solid var(--border)" }}>All browsers</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Upcoming SDKs + Waitlist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))",
            border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-theme mb-2">More SDKs Coming Soon</h3>
              <p className="text-theme-secondary text-sm mb-4">
                Python, Node.js, and Go SDKs are in development. Join the waitlist to get notified when they launch.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                {[
                  { name: "Python", status: "In Development" },
                  { name: "Node.js", status: "Planned" },
                  { name: "Go", status: "Planned" },
                ].map((sdk) => (
                  <span
                    key={sdk.name}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-theme-secondary"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${sdk.status === "In Development" ? "bg-amber-400" : "bg-theme-muted"}`} />
                    {sdk.name}
                    <span className="text-theme-muted">— {sdk.status}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="w-full md:w-auto md:min-w-[320px]">
              <WaitlistForm variant="full" />
              <div className="mt-3">
                <StatsCounter />
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
