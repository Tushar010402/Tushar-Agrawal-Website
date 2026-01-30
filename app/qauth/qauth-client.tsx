"use client";

import { HeroHighlight } from "@/components/ui/hero-highlight";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { Spotlight } from "@/components/ui/spotlight";
import { Button } from "@/components/ui/moving-border";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const features = [
  {
    title: "Dual Signatures",
    subtitle: "Ed25519 + ML-DSA-65",
    description:
      "Classical Ed25519 combined with post-quantum ML-DSA-65. Both must verify. If quantum computers break Ed25519, ML-DSA-65 remains secure.",
    icon: "signature",
    badge: "3373 bytes",
  },
  {
    title: "Encrypted Payloads",
    subtitle: "XChaCha20-Poly1305",
    description:
      "Unlike JWT's base64-encoded claims visible to everyone, QAuth encrypts all payload data. Your claims are private, not just signed.",
    icon: "lock",
    badge: "Private",
  },
  {
    title: "Proof of Possession",
    subtitle: "Mandatory, Not Optional",
    description:
      "Every request must prove key ownership. Stolen tokens are useless without the private key. No more bearer token theft attacks.",
    icon: "key",
    badge: "Required",
  },
  {
    title: "Built-in Revocation",
    subtitle: "5-Minute Window",
    description:
      "Instant token invalidation with 5-minute worst-case propagation. No more waiting for JWT expiry after a breach.",
    icon: "refresh",
    badge: "Instant",
  },
  {
    title: "Policy References",
    subtitle: "No Scope Explosion",
    description:
      "Replace OAuth's scope strings with policy document references. Fine-grained RBAC/ABAC/ReBAC without bloated tokens.",
    icon: "policy",
    badge: "Scalable",
  },
  {
    title: "Server-Enforced Crypto",
    subtitle: "No Algorithm Confusion",
    description:
      "Server enforces all cryptographic parameters. No client-controlled algorithm selection. Eliminates entire attack classes.",
    icon: "shield",
    badge: "Secure",
  },
];

const attacks = [
  {
    name: "Algorithm Confusion",
    jwt: "Vulnerable",
    oauth: "N/A",
    qauth: "Impossible",
    description: "No algorithm field in QAuth",
  },
  {
    name: "\"None\" Algorithm",
    jwt: "Vulnerable",
    oauth: "N/A",
    qauth: "Impossible",
    description: "Algorithm not configurable",
  },
  {
    name: "Bearer Token Theft",
    jwt: "Vulnerable",
    oauth: "Vulnerable",
    qauth: "Protected",
    description: "Proof of possession required",
  },
  {
    name: "Redirect URI Attack",
    jwt: "N/A",
    oauth: "Vulnerable",
    qauth: "Protected",
    description: "Cryptographic binding",
  },
  {
    name: "Token Replay",
    jwt: "Vulnerable",
    oauth: "Vulnerable",
    qauth: "Protected",
    description: "Request-specific proofs",
  },
  {
    name: "Payload Inspection",
    jwt: "Exposed",
    oauth: "N/A",
    qauth: "Encrypted",
    description: "XChaCha20-Poly1305 encryption",
  },
  {
    name: "Post-Quantum Attack",
    jwt: "Future Risk",
    oauth: "Future Risk",
    qauth: "Protected",
    description: "ML-DSA-65 signatures",
  },
  {
    name: "Revocation Delay",
    jwt: "Hours/Days",
    oauth: "Hours",
    qauth: "5 Minutes",
    description: "Built-in revocation system",
  },
];

const codeExamples = {
  rust: `use qauth::{Issuer, Token, Validator, Policy, PolicyEngine};

// Generate issuer with dual keys (Ed25519 + ML-DSA-65)
let issuer = Issuer::generate()?;

// Create a QToken with encrypted payload
let token = Token::builder()
    .subject("user-12345")
    .audience("https://api.example.com")
    .policy_ref("urn:qauth:policy:standard")
    .expires_in(Duration::from_secs(3600))
    .build(&issuer)?;

// Validate with dual signature verification
let validator = Validator::new(issuer.verifying_keys());
let claims = validator.validate(&token)?;

// Policy-based authorization
let engine = PolicyEngine::new();
let result = engine.evaluate(&policy, &context);`,
  typescript: `import { QAuthServer, QAuthClient, PolicyEngine } from '@quantumshield/qauth';

// Server-side: Create tokens
const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

const token = server.createToken({
  subject: 'user-12345',
  policyRef: 'urn:qauth:policy:standard',
  validitySeconds: 3600,
});

// Client-side: Create proof of possession
const client = new QAuthClient();
const proof = client.createProof('GET', '/api/resource', token);

// Validate tokens
const payload = server.validateToken(token);`,
  python: `from qauth import QAuthServer, QAuthClient, PolicyEngine

# Server-side: Create tokens
server = QAuthServer(
    issuer="https://auth.example.com",
    audience="https://api.example.com"
)

token = server.create_token(
    subject="user-12345",
    policy_ref="urn:qauth:policy:standard",
    validity_seconds=3600
)

# Client-side: Create proof of possession
client = QAuthClient()
proof = client.create_proof("GET", "/api/resource", token)

# Validate tokens
payload = server.validate_token(token)`,
  go: `import qauth "github.com/Tushar010402/Tushar-Agrawal-Website/quantum-shield/qauth/sdks/go"

// Server-side: Create tokens
server := qauth.NewServer(qauth.Config{
    Issuer:   "https://auth.example.com",
    Audience: "https://api.example.com",
})

token, _ := server.CreateToken(qauth.TokenOptions{
    Subject:   "user-12345",
    PolicyRef: "urn:qauth:policy:standard",
    Validity:  3600,
})

// Client-side: Create proof of possession
client := qauth.NewClient()
proof := client.CreateProof("GET", "/api/resource", token)

// Validate tokens
payload, _ := server.ValidateToken(token)`,
};

export default function QAuthClient() {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>("rust");

  return (
    <div className="w-full bg-black min-h-screen">
      {/* Hero Section */}
      <section id="hero">
        <HeroHighlight containerClassName="pt-20 min-h-[90vh]">
          <Spotlight
            className="-top-40 left-0 md:left-60 md:-top-20"
            fill="white"
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [20, -5, 0] }}
            transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
            className="text-center px-4 max-w-5xl mx-auto"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              </div>
            </motion.div>

            <div className="mb-4 flex justify-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium">
                OAuth 2.0 has limitations
              </span>
              <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium">
                JWT needs improvement
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              QAuth: Authentication
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Rebuilt for the Quantum Era
              </span>
            </h1>

            <div className="mb-8">
              <TextGenerateEffect
                words="Post-quantum dual signatures. Encrypted payloads. Mandatory proof-of-possession. Built-in revocation. The OAuth 2.0 and JWT replacement you've been waiting for."
                className="text-lg md:text-xl text-neutral-300"
              />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Button
                borderRadius="1.75rem"
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white border-emerald-500 px-8 py-4"
              >
                <Link href="/qauth/demo" className="flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Try Live Demo
                </Link>
              </Button>
              <Button
                borderRadius="1.75rem"
                className="bg-neutral-900 text-white border-neutral-800 px-8 py-4"
              >
                <a
                  href="https://github.com/Tushar010402/Tushar-Agrawal-Website/tree/master/quantum-shield/qauth"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  View Source
                </a>
              </Button>
              <Button
                borderRadius="1.75rem"
                className="bg-neutral-900 text-white border-neutral-800 px-8 py-4"
              >
                <Link
                  href="/blog/qauth-post-quantum-authentication-protocol"
                  className="flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Read Deep Dive
                </Link>
              </Button>
            </div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex flex-wrap justify-center gap-3 text-sm"
            >
              <span className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400">
                Ed25519 + ML-DSA-65
              </span>
              <span className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400">
                NIST FIPS 204
              </span>
              <span className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400">
                Open Source
              </span>
              <span className="px-4 py-2 bg-neutral-900/50 border border-neutral-800 rounded-full text-neutral-400">
                Multi-language SDKs
              </span>
            </motion.div>
          </motion.div>
        </HeroHighlight>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            The Problem
          </h2>
          <p className="text-neutral-400 text-lg mb-12 max-w-3xl">
            OAuth 2.0 and JWT have fundamental, unfixable security flaws that have caused countless breaches.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8"
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
              <h3 className="text-xl font-bold text-white">JWT Vulnerabilities</h3>
            </div>
            <ul className="space-y-2 text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Algorithm confusion</strong> - Attacker chooses verification method</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>&quot;None&quot; algorithm</strong> - Complete signature bypass</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Key ID injection</strong> - SQL injection, path traversal via kid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Exposed payload</strong> - Base64 claims visible to everyone</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>No revocation</strong> - Tokens valid until expiry</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-8"
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
              <h3 className="text-xl font-bold text-white">OAuth 2.0 Vulnerabilities</h3>
            </div>
            <ul className="space-y-2 text-neutral-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Redirect URI manipulation</strong> - Token interception</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Authorization code interception</strong> - Full account takeover</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Bearer token model</strong> - Stolen token = full access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>PKCE downgrade</strong> - Protection can be bypassed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">x</span>
                <span><strong>Scope explosion</strong> - Unmaintainable permission strings</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Security Comparison Table */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Security Comparison
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            QAuth mitigates every known attack vector in OAuth 2.0 and JWT.
          </p>
        </motion.div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-4">
          {attacks.map((attack, idx) => (
            <motion.div
              key={attack.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-4"
            >
              <h3 className="text-white font-medium mb-3">{attack.name}</h3>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-xs text-neutral-500 mb-1">JWT</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    attack.jwt === "Vulnerable" || attack.jwt === "Exposed" || attack.jwt === "Future Risk" || attack.jwt === "Hours/Days"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {attack.jwt}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500 mb-1">OAuth</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    attack.oauth === "Vulnerable" || attack.oauth === "Future Risk" || attack.oauth === "Hours"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {attack.oauth}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-neutral-500 mb-1">QAuth</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    attack.qauth === "Protected" || attack.qauth === "Impossible" || attack.qauth === "Encrypted" || attack.qauth === "5 Minutes"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-neutral-800 text-neutral-400"
                  }`}>
                    {attack.qauth}
                  </span>
                </div>
              </div>
              <p className="text-neutral-400 text-sm">{attack.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Desktop Table Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="hidden md:block overflow-x-auto"
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left py-4 px-4 text-neutral-400 font-medium">Attack Vector</th>
                <th className="text-center py-4 px-4 text-red-400 font-medium">JWT</th>
                <th className="text-center py-4 px-4 text-red-400 font-medium">OAuth 2.0</th>
                <th className="text-center py-4 px-4 text-emerald-400 font-medium">QAuth</th>
                <th className="text-left py-4 px-4 text-neutral-400 font-medium">How QAuth Protects</th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((attack, idx) => (
                <tr key={attack.name} className={idx % 2 === 0 ? "bg-neutral-900/30" : ""}>
                  <td className="py-3 px-4 text-white font-medium">{attack.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      attack.jwt === "Vulnerable" || attack.jwt === "Exposed" || attack.jwt === "Future Risk" || attack.jwt === "Hours/Days"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {attack.jwt}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      attack.oauth === "Vulnerable" || attack.oauth === "Future Risk" || attack.oauth === "Hours"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {attack.oauth}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      attack.qauth === "Protected" || attack.qauth === "Impossible" || attack.qauth === "Encrypted" || attack.qauth === "5 Minutes"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-neutral-800 text-neutral-400"
                    }`}>
                      {attack.qauth}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-400 text-sm">{attack.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Defense-in-Depth Features
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            Every QAuth feature is designed to eliminate an entire class of attacks.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  {feature.icon === "signature" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {feature.icon === "lock" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  )}
                  {feature.icon === "key" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                  {feature.icon === "refresh" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  {feature.icon === "policy" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {feature.icon === "shield" && (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  )}
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium">
                  {feature.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{feature.title}</h3>
              <p className="text-emerald-400 text-sm mb-3">{feature.subtitle}</p>
              <p className="text-neutral-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Multi-Language SDKs
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            Use QAuth in your preferred language. Same API, same security guarantees.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden"
        >
          {/* Language Tabs */}
          <div className="flex border-b border-neutral-800">
            {(Object.keys(codeExamples) as Array<keyof typeof codeExamples>).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === lang
                    ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>

          {/* Code Block */}
          <div className="p-6">
            <pre className="text-sm text-neutral-300 overflow-x-auto">
              <code>{codeExamples[activeTab]}</code>
            </pre>
          </div>
        </motion.div>

        {/* Installation Commands */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-8 grid md:grid-cols-4 gap-4"
        >
          <a href="https://crates.io/crates/quantum-qauth" target="_blank" rel="noopener noreferrer" className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
            <p className="text-neutral-400 text-xs mb-2">Rust (crates.io)</p>
            <code className="text-emerald-400 text-sm">cargo add quantum-qauth</code>
          </a>
          <a href="https://www.npmjs.com/package/@quantumshield/qauth" target="_blank" rel="noopener noreferrer" className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
            <p className="text-neutral-400 text-xs mb-2">TypeScript (npm)</p>
            <code className="text-emerald-400 text-sm">npm i @quantumshield/qauth</code>
          </a>
          <a href="https://pypi.org/project/qauth/" target="_blank" rel="noopener noreferrer" className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
            <p className="text-neutral-400 text-xs mb-2">Python (PyPI)</p>
            <code className="text-emerald-400 text-sm">pip install qauth</code>
          </a>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4">
            <p className="text-neutral-400 text-xs mb-2">Go (module)</p>
            <code className="text-emerald-400 text-xs break-all">go get github.com/Tushar010402/qauth-go</code>
          </div>
        </motion.div>
      </section>

      {/* Honest Assessment */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Honest Assessment
          </h2>
          <p className="text-neutral-400 text-lg max-w-3xl">
            Transparency matters. Here&apos;s what QAuth is and what it isn&apos;t.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">What It Is</h3>
            </div>
            <ul className="space-y-3 text-neutral-300">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Complete specification</strong> with RFC-style documentation</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Working reference implementation</strong> in Rust with 36+ tests</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Real post-quantum cryptography</strong> using ML-DSA-65 (Dilithium3)</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Multi-language SDKs</strong> with consistent APIs</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span><strong>Open source</strong> under MIT license</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Important Caveats</h3>
            </div>
            <ul className="space-y-3 text-neutral-300">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Not professionally audited</strong> - Use in production at your own risk</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Larger token sizes</strong> - ~4KB vs JWT&apos;s ~1KB due to PQ signatures</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Early stage project</strong> - APIs may change</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>No ecosystem yet</strong> - Need adapters for existing auth systems</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span><strong>Personal project</strong> - No commercial support</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Part of QuantumShield */}
      <section className="py-20 px-4 md:px-8 lg:px-16 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-neutral-900/50 to-neutral-800/30 border border-neutral-800 rounded-3xl p-12 text-center"
        >
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-indigo-400"
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
            <div className="w-4 h-16 flex items-center text-neutral-600">+</div>
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Part of QuantumShield
          </h2>
          <p className="text-neutral-300 text-lg max-w-2xl mx-auto mb-8">
            QAuth is built on top of QuantumShield&apos;s post-quantum cryptography primitives.
            Hybrid KEM, dual signatures, and cascading encryption—all working together.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              borderRadius="1.75rem"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 px-8 py-4"
            >
              <Link href="/quantum-shield" className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
                Explore QuantumShield
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
