"use client";

import { CodePreview } from "@/components/quantum-shield/CodePreview";
import Link from "next/link";
import { useState } from "react";

const installCommands = {
  npm: "npm install @quantumshield/qauth",
  yarn: "yarn add @quantumshield/qauth",
  pnpm: "pnpm add @quantumshield/qauth",
  bun: "bun add @quantumshield/qauth",
};

const quickStartCode = `import { QAuthServer, QAuthClient, QAuthValidator } from '@quantumshield/qauth';

// 1. Create a server instance (generates Ed25519 keys)
const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// 2. Create an access token
const token = server.createToken({
  subject: 'user-123',
  policyRef: 'urn:qauth:policy:default',
  validitySeconds: 3600,
  claims: { email: 'user@example.com', roles: ['user'] },
});

// 3. Validate the token
const payload = server.validateToken(token);
console.log('User:', payload.sub);     // "user-123"
console.log('Expires:', payload.exp);  // Unix timestamp

// 4. Client-side: Create proof of possession
const client = new QAuthClient();
const proof = client.createProof('GET', '/api/resource', token);

// 5. Send both token and proof with requests
// Authorization: QAuth <token>
// X-QAuth-Proof: <proof>`;

const validatorCode = `import { QAuthServer, QAuthValidator, ProofValidator } from '@quantumshield/qauth';

// On your auth server:
const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// Share public keys with your API servers
const publicKeys = server.getPublicKeys();
// => { keyId, ed25519PublicKey, encryptionKey }

// On your API server:
const validator = new QAuthValidator(publicKeys, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// Validate incoming tokens
const payload = validator.validate(token);

// Validate proof of possession
const proofValidator = new ProofValidator(clientPublicKey);
const isValid = proofValidator.validate(proof, 'GET', '/api/resource', token);`;

const policyCode = `import { PolicyEngine } from '@quantumshield/qauth';

const engine = new PolicyEngine();

// Load a policy document
engine.loadPolicy({
  id: 'urn:qauth:policy:api-access',
  version: '2026-01-30',
  issuer: 'https://auth.example.com',
  rules: [
    {
      id: 'read-projects',
      effect: 'allow',
      resources: ['projects/*'],
      actions: ['read', 'list'],
    },
    {
      id: 'admin-only',
      effect: 'allow',
      resources: ['admin/**'],
      actions: ['*'],
      conditions: {
        custom: { role: { in: ['admin'] } },
      },
      priority: 10,
    },
  ],
});

// Evaluate authorization
const result = engine.evaluate('urn:qauth:policy:api-access', {
  subject: { id: 'user-123', attributes: { role: 'user' } },
  resource: { path: 'projects/456' },
  request: { action: 'read' },
});
// result.effect === 'allow'`;

const coreConcepts = [
  {
    name: "QAuthServer",
    description: "Creates and validates tokens. Generates Ed25519 signing keys on construction. Used on your auth server to issue tokens and on API servers to validate them.",
    icon: "server",
  },
  {
    name: "QAuthClient",
    description: "Client-side key management. Generates a keypair for proof-of-possession. Stolen tokens are useless without the client's private key.",
    icon: "client",
  },
  {
    name: "QAuthValidator",
    description: "Standalone token validator. Uses pre-shared public keys to validate tokens without access to the signing private key. Deploy on API servers.",
    icon: "check",
  },
  {
    name: "PolicyEngine",
    description: "Fine-grained authorization. Replace OAuth scopes with policy documents that support RBAC, ABAC, time-based conditions, IP restrictions, and MFA requirements.",
    icon: "policy",
  },
];

export default function DocsClient() {
  const [activeInstall, setActiveInstall] = useState<keyof typeof installCommands>("npm");
  const [installCopied, setInstallCopied] = useState(false);

  const handleCopyInstall = async () => {
    await navigator.clipboard.writeText(installCommands[activeInstall]);
    setInstallCopied(true);
    setTimeout(() => setInstallCopied(false), 2000);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span
            className="px-3 py-1 rounded-full text-xs font-medium text-theme-accent"
            style={{
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
            }}
          >
            v0.1.0
          </span>
          <span className="text-theme-muted text-sm">TypeScript SDK</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">Getting Started</h1>
        <p className="text-theme-secondary text-lg max-w-2xl">
          Install the QAuth TypeScript SDK and create your first quantum-safe token in under 5 minutes.
        </p>
      </div>

      {/* Install Section */}
      <section className="mb-16" id="install">
        <h2 className="text-2xl font-bold text-theme mb-6">Install</h2>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {/* Package manager tabs */}
          <div className="flex" style={{ borderBottom: "1px solid var(--border)" }}>
            {(Object.keys(installCommands) as Array<keyof typeof installCommands>).map((pm) => (
              <button
                key={pm}
                onClick={() => setActiveInstall(pm)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeInstall === pm ? "text-theme-accent" : "text-theme-secondary hover:text-theme"
                }`}
                style={
                  activeInstall === pm
                    ? {
                        background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                        borderBottom: "2px solid var(--accent)",
                      }
                    : {}
                }
              >
                {pm}
              </button>
            ))}
          </div>
          {/* Command */}
          <div className="flex items-center justify-between p-4">
            <code className="text-theme-accent text-sm font-mono">{installCommands[activeInstall]}</code>
            <button
              onClick={handleCopyInstall}
              className="text-theme-secondary hover:text-theme transition-colors p-2 rounded-lg"
              style={{ background: "var(--surface-hover)" }}
              title="Copy command"
            >
              {installCopied ? (
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <p className="text-theme-muted text-sm mt-3">
          Requires Node.js 18+. TypeScript 4.7+ recommended.
        </p>
      </section>

      {/* Quick Start */}
      <section className="mb-16" id="quick-start">
        <h2 className="text-2xl font-bold text-theme mb-3">Quick Start (5 minutes)</h2>
        <p className="text-theme-secondary mb-6">
          Create a token, validate it, and generate a proof of possession — the three core operations.
        </p>
        <CodePreview code={quickStartCode} language="TypeScript" fileName="quick-start.ts" />
      </section>

      {/* Core Concepts */}
      <section className="mb-16" id="core-concepts">
        <h2 className="text-2xl font-bold text-theme mb-3">Core Concepts</h2>
        <p className="text-theme-secondary mb-6">
          QAuth has four main classes, each handling a different part of the authentication flow.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {coreConcepts.map((concept) => (
            <div
              key={concept.name}
              className="rounded-xl p-5"
              style={{
                background: "color-mix(in srgb, var(--surface) 50%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}
                >
                  {concept.icon === "server" && (
                    <svg className="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  )}
                  {concept.icon === "client" && (
                    <svg className="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  {concept.icon === "check" && (
                    <svg className="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {concept.icon === "policy" && (
                    <svg className="w-4 h-4 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <h3 className="font-semibold text-theme font-mono text-sm">{concept.name}</h3>
              </div>
              <p className="text-theme-secondary text-sm">{concept.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Token Lifecycle */}
      <section className="mb-16" id="token-lifecycle">
        <h2 className="text-2xl font-bold text-theme mb-3">Token Lifecycle</h2>
        <p className="text-theme-secondary mb-6">
          How a QAuth token flows through your system.
        </p>
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-2">
            {[
              { step: "1", title: "Create", desc: "Server generates token with Ed25519 signature", color: "var(--accent)" },
              { step: "2", title: "Sign", desc: "Dual-signed with Ed25519 + ML-DSA-65 keys", color: "var(--accent)" },
              { step: "3", title: "Send", desc: "Client receives token and creates proof", color: "var(--accent)" },
              { step: "4", title: "Validate", desc: "API server verifies signature and expiry", color: "var(--accent)" },
              { step: "5", title: "Prove", desc: "Client proves key ownership per-request", color: "var(--accent)" },
            ].map((item, idx) => (
              <div key={item.step} className="flex md:flex-col items-center gap-3 md:gap-0 flex-1">
                <div className="flex items-center gap-3 md:flex-col md:text-center flex-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: item.color }}
                  >
                    {item.step}
                  </div>
                  <div className="md:mt-3">
                    <h4 className="font-semibold text-theme text-sm">{item.title}</h4>
                    <p className="text-theme-secondary text-xs mt-1">{item.desc}</p>
                  </div>
                </div>
                {idx < 4 && (
                  <div className="hidden md:block w-full mt-3">
                    <div className="h-px w-full" style={{ background: "var(--border)" }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Distributed Validation */}
      <section className="mb-16" id="distributed-validation">
        <h2 className="text-2xl font-bold text-theme mb-3">Distributed Validation</h2>
        <p className="text-theme-secondary mb-6">
          Validate tokens on separate API servers using shared public keys. No private key exposure.
        </p>
        <CodePreview code={validatorCode} language="TypeScript" fileName="validator.ts" />
      </section>

      {/* Policy-Based Auth */}
      <section className="mb-16" id="policy-auth">
        <h2 className="text-2xl font-bold text-theme mb-3">Policy-Based Authorization</h2>
        <p className="text-theme-secondary mb-6">
          Replace OAuth scopes with fine-grained policy documents.
        </p>
        <CodePreview code={policyCode} language="TypeScript" fileName="policy.ts" />
      </section>

      {/* Next Steps */}
      <section id="next-steps">
        <h2 className="text-2xl font-bold text-theme mb-6">Next Steps</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              title: "Full Auth System Guide",
              desc: "Build a complete auth system with signup, login, sessions, and protected routes.",
              href: "/qauth/docs/full-auth",
              icon: "book",
            },
            {
              title: "API Reference",
              desc: "Complete documentation for every class, method, and type in the SDK.",
              href: "/qauth/docs/api",
              icon: "code",
            },
            {
              title: "Policy Engine Guide",
              desc: "Deep dive into policy documents, conditions, and real-world authorization patterns.",
              href: "/qauth/docs/policy",
              icon: "shield",
            },
            {
              title: "Interactive Demo",
              desc: "See QAuth token creation, validation, and proofs in action.",
              href: "/qauth/demo",
              icon: "play",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl p-5 transition-all hover:scale-[1.01]"
              style={{
                background: "color-mix(in srgb, var(--surface) 50%, transparent)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                {item.icon === "book" && (
                  <svg className="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                {item.icon === "code" && (
                  <svg className="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                )}
                {item.icon === "shield" && (
                  <svg className="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                )}
                {item.icon === "play" && (
                  <svg className="w-5 h-5 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <h3 className="font-semibold text-theme">{item.title}</h3>
              </div>
              <p className="text-theme-secondary text-sm">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
