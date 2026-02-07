"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

// Simulated QAuth structures
interface QTokenHeader {
  version: string;
  tokenType: string;
  keyId: string;
  timestamp: string;
}

interface QTokenPayload {
  sub: string;
  iss: string;
  aud: string;
  exp: string;
  policyRef: string;
  revocationId: string;
}

interface DualSignature {
  ed25519: string;
  mlDsa65: string;
}

interface ProofBinding {
  deviceKey: string;
  clientKey: string;
  ipHash: string;
}

interface QToken {
  header: QTokenHeader;
  payload: QTokenPayload;
  signature: DualSignature;
  proofBinding: ProofBinding;
}

interface Policy {
  id: string;
  rules: PolicyRule[];
}

interface PolicyRule {
  resource: string;
  actions: string[];
  conditions: Record<string, unknown>;
}

// Helper functions
function generateRandomHex(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

export default function QAuthDemo() {
  // Token generation state
  const [subject, setSubject] = useState("user-12345");
  const [audience, setAudience] = useState("https://api.example.com");
  const [issuer, setIssuer] = useState("https://auth.example.com");
  const [expiresIn, setExpiresIn] = useState(3600);
  const [policyRef, setPolicyRef] = useState("urn:qauth:policy:standard-user");

  const [token, setToken] = useState<QToken | null>(null);
  const [encodedToken, setEncodedToken] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Proof of possession state
  const [requestMethod, setRequestMethod] = useState("GET");
  const [requestUri, setRequestUri] = useState("/api/users/me");
  const [proof, setProof] = useState<string | null>(null);

  // Policy evaluation state
  const [evalResource, setEvalResource] = useState("users/123");
  const [evalAction, setEvalAction] = useState("read");
  const [evalResult, setEvalResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"create" | "proof" | "policy">("create");

  // Sample policy for demonstration
  const samplePolicy: Policy = {
    id: "urn:qauth:policy:standard-user",
    rules: [
      {
        resource: "users/*",
        actions: ["read"],
        conditions: {},
      },
      {
        resource: "users/123",
        actions: ["read", "write"],
        conditions: { mfa_verified: true },
      },
      {
        resource: "admin/**",
        actions: [],
        conditions: {},
      },
    ],
  };

  const generateToken = useCallback(() => {
    setIsGenerating(true);

    // Simulate async operation
    setTimeout(() => {
      const now = new Date();
      const exp = new Date(now.getTime() + expiresIn * 1000);

      const newToken: QToken = {
        header: {
          version: "0x01",
          tokenType: "0x01 (access)",
          keyId: generateRandomHex(32),
          timestamp: now.getTime().toString(),
        },
        payload: {
          sub: subject,
          iss: issuer,
          aud: audience,
          exp: formatTimestamp(exp),
          policyRef: policyRef,
          revocationId: generateRandomHex(16),
        },
        signature: {
          ed25519: generateRandomHex(64),
          mlDsa65: generateRandomHex(200) + "...[3109 more bytes]",
        },
        proofBinding: {
          deviceKey: generateRandomHex(32),
          clientKey: generateRandomHex(32),
          ipHash: generateRandomHex(32),
        },
      };

      setToken(newToken);

      // Generate a "compressed" encoded representation
      const encoded = `QA1.${btoa(JSON.stringify({
        h: newToken.header.keyId.slice(0, 16),
        p: generateRandomHex(64),
        s: generateRandomHex(32),
      })).replace(/=/g, '')}`;
      setEncodedToken(encoded);

      setIsGenerating(false);
    }, 500);
  }, [subject, audience, issuer, expiresIn, policyRef]);

  const generateProof = useCallback(() => {
    if (!token) return;

    const timestamp = Date.now();
    const proofData = {
      timestamp,
      method: requestMethod,
      uri: requestUri,
      bodyHash: generateRandomHex(32),
      tokenHash: generateRandomHex(32),
    };

    const signature = generateRandomHex(64);
    const proofString = `${btoa(JSON.stringify(proofData)).replace(/=/g, '')}.${signature}`;
    setProof(proofString);
  }, [token, requestMethod, requestUri]);

  const evaluatePolicy = useCallback(() => {
    // Simple policy evaluation simulation
    let allowed = false;
    let reason = "No matching rule found";

    for (const rule of samplePolicy.rules) {
      const resourcePattern = rule.resource.replace(/\*/g, '.*');
      const regex = new RegExp(`^${resourcePattern}$`);

      if (regex.test(evalResource)) {
        if (rule.actions.includes(evalAction)) {
          allowed = true;
          reason = `Matched rule: ${rule.resource} allows ${rule.actions.join(', ')}`;

          if (Object.keys(rule.conditions).length > 0) {
            reason += ` (conditions: ${JSON.stringify(rule.conditions)})`;
          }
        } else if (rule.actions.length === 0) {
          allowed = false;
          reason = `Matched rule: ${rule.resource} denies all actions`;
        } else {
          reason = `Matched rule: ${rule.resource} but action '${evalAction}' not permitted`;
        }
        break;
      }
    }

    setEvalResult({ allowed, reason });
  }, [evalResource, evalAction]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen pt-20 transition-theme" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/qauth" className="text-theme-secondary hover:text-theme transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-theme">QAuth Demo</h1>
              <p className="text-sm text-theme-secondary">Interactive Token Demonstration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium">
              Simulated (Educational)
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(["create", "proof", "policy"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-6 py-3 rounded-lg font-medium transition-colors"
              style={{
                background: activeTab === tab ? "var(--accent-subtle)" : "var(--surface)",
                color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                border: activeTab === tab ? "1px solid var(--accent-muted)" : "1px solid var(--border)",
              }}
            >
              {tab === "create" ? "Create Token" : tab === "proof" ? "Proof of Possession" : "Policy Evaluation"}
            </button>
          ))}
        </div>

        {/* Token Creation Tab */}
        {activeTab === "create" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h2 className="text-xl font-bold text-theme mb-6">Token Claims</h2>

              <div className="space-y-4">
                {[
                  { label: "Subject (sub)", value: subject, setter: setSubject, placeholder: "user-12345" },
                  { label: "Issuer (iss)", value: issuer, setter: setIssuer, placeholder: "https://auth.example.com" },
                  { label: "Audience (aud)", value: audience, setter: setAudience, placeholder: "https://api.example.com" },
                  { label: "Policy Reference", value: policyRef, setter: setPolicyRef, placeholder: "urn:qauth:policy:standard-user" },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-sm text-theme-secondary mb-2">{field.label}</label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm text-theme-secondary mb-2">Expires In (seconds)</label>
                  <input
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(parseInt(e.target.value) || 3600)}
                    className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                  />
                </div>

                <button
                  onClick={generateToken}
                  disabled={isGenerating}
                  className="w-full py-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    "Generate QToken"
                  )}
                </button>
              </div>
            </motion.div>

            {/* Token Output */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {token ? (
                <>
                  {/* Encoded Token */}
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-theme">Encoded QToken</h3>
                      <button
                        onClick={() => copyToClipboard(encodedToken)}
                        className="px-3 py-1 rounded text-sm transition-colors text-theme-secondary"
                        style={{ background: "var(--surface-hover)" }}
                      >
                        Copy
                      </button>
                    </div>
                    <code
                      className="block text-sm break-all p-4 rounded-lg"
                      style={{ background: "var(--surface)", color: "var(--accent)" }}
                    >
                      {encodedToken}
                    </code>
                    <p className="text-xs text-theme-tertiary mt-2">
                      Total size: ~4KB (vs ~1KB for JWT) - includes post-quantum signature
                    </p>
                  </div>

                  {/* Token Structure */}
                  <div className="card p-6">
                    <h3 className="text-lg font-bold text-theme mb-4">Token Structure</h3>

                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded text-xs font-medium text-theme-accent" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }}>Header (42 bytes)</span>
                      </div>
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--surface)" }}>
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-theme-tertiary">Version:</span>
                          <span className="text-theme-secondary">{token.header.version}</span>
                          <span className="text-theme-tertiary">Token Type:</span>
                          <span className="text-theme-secondary">{token.header.tokenType}</span>
                          <span className="text-theme-tertiary">Key ID:</span>
                          <span className="text-theme-secondary truncate">{token.header.keyId.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Payload (Encrypted) */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">Encrypted Payload</span>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">XChaCha20-Poly1305</span>
                      </div>
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--surface)" }}>
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-theme-tertiary">Subject:</span>
                          <span className="text-theme-secondary">{token.payload.sub}</span>
                          <span className="text-theme-tertiary">Issuer:</span>
                          <span className="text-theme-secondary truncate">{token.payload.iss}</span>
                          <span className="text-theme-tertiary">Audience:</span>
                          <span className="text-theme-secondary truncate">{token.payload.aud}</span>
                          <span className="text-theme-tertiary">Expires:</span>
                          <span className="text-theme-secondary">{new Date(token.payload.exp).toLocaleString()}</span>
                          <span className="text-theme-tertiary">Policy:</span>
                          <span className="text-theme-secondary truncate">{token.payload.policyRef}</span>
                          <span className="text-theme-tertiary">Revocation ID:</span>
                          <span className="text-theme-secondary truncate">{token.payload.revocationId.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Signature */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">Dual Signature (3373 bytes)</span>
                      </div>
                      <div className="p-3 rounded-lg text-sm space-y-2" style={{ background: "var(--surface)" }}>
                        <div>
                          <span className="text-theme-tertiary">Ed25519 (64 bytes):</span>
                          <code className="block text-theme-accent text-xs mt-1 truncate">{token.signature.ed25519.slice(0, 64)}...</code>
                        </div>
                        <div>
                          <span className="text-theme-tertiary">ML-DSA-65 (3309 bytes):</span>
                          <code className="block text-cyan-400 text-xs mt-1 truncate">{token.signature.mlDsa65}</code>
                        </div>
                      </div>
                    </div>

                    {/* Proof Binding */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">Proof Binding (96 bytes)</span>
                      </div>
                      <div className="p-3 rounded-lg text-sm" style={{ background: "var(--surface)" }}>
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-theme-tertiary">Device Key:</span>
                          <span className="text-theme-secondary truncate">{token.proofBinding.deviceKey.slice(0, 16)}...</span>
                          <span className="text-theme-tertiary">Client Key:</span>
                          <span className="text-theme-secondary truncate">{token.proofBinding.clientKey.slice(0, 16)}...</span>
                          <span className="text-theme-tertiary">IP Hash:</span>
                          <span className="text-theme-secondary truncate">{token.proofBinding.ipHash.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }}>
                    <h3 className="text-lg font-bold text-theme mb-4">Security Features</h3>
                    <ul className="space-y-2 text-sm text-theme-secondary">
                      {[
                        "Dual signatures: Ed25519 (classical) + ML-DSA-65 (post-quantum)",
                        "Encrypted payload - claims are private, not visible",
                        "Bound to device and client keys - stolen token is useless",
                        "Built-in revocation ID for instant invalidation",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-theme-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="card p-12 text-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "var(--surface)" }}
                  >
                    <svg className="w-8 h-8 text-theme-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <p className="text-theme-secondary">Configure claims and generate a token to see the structure</p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Proof of Possession Tab */}
        {activeTab === "proof" && (
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card p-6"
            >
              <h2 className="text-xl font-bold text-theme mb-6">Request Details</h2>

              {!token ? (
                <div className="text-center py-8">
                  <p className="text-theme-secondary mb-4">Generate a token first to create proofs</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-6 py-2 rounded-lg transition-colors"
                    style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                  >
                    Go to Create Token
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-theme-secondary mb-2">HTTP Method</label>
                    <select
                      value={requestMethod}
                      onChange={(e) => setRequestMethod(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-theme-secondary mb-2">Request URI</label>
                    <input
                      type="text"
                      value={requestUri}
                      onChange={(e) => setRequestUri(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      placeholder="/api/users/me"
                    />
                  </div>

                  <button
                    onClick={generateProof}
                    className="w-full py-4 rounded-lg font-medium transition-colors"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Generate Proof
                  </button>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* How it works */}
              <div className="card p-6">
                <h3 className="text-lg font-bold text-theme mb-4">How Proof of Possession Works</h3>
                <div className="space-y-3 text-sm text-theme-secondary">
                  {[
                    "Client signs: timestamp + method + URI + body_hash + token_hash",
                    "Proof is included in X-QAuth-Proof header",
                    "Server verifies proof matches token\u2019s ProofBinding",
                    "Proof valid for 60 seconds, can\u2019t be replayed",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: "var(--accent-subtle)", color: "var(--accent)" }}
                      >
                        {i + 1}
                      </span>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {proof && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-theme">Generated Proof</h3>
                    <button
                      onClick={() => copyToClipboard(proof)}
                      className="px-3 py-1 rounded text-sm transition-colors text-theme-secondary"
                      style={{ background: "var(--surface-hover)" }}
                    >
                      Copy
                    </button>
                  </div>
                  <code
                    className="block text-sm break-all p-4 rounded-lg"
                    style={{ background: "var(--surface)", color: "var(--accent)" }}
                  >
                    {proof}
                  </code>

                  <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--surface)" }}>
                    <p className="text-xs text-theme-tertiary mb-2">Example HTTP Request:</p>
                    <code className="text-xs text-theme-secondary block">
                      {requestMethod} {requestUri} HTTP/1.1<br />
                      Authorization: QAuth {encodedToken.slice(0, 30)}...<br />
                      X-QAuth-Proof: {proof.slice(0, 40)}...
                    </code>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-theme mb-2">Why This Matters</h3>
                <p className="text-sm text-theme-secondary">
                  Unlike OAuth bearer tokens, a stolen QAuth token is <strong>useless</strong> without the client&apos;s private key.
                  Each request requires a fresh proof that can only be generated by the legitimate client.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Policy Evaluation Tab */}
        {activeTab === "policy" && (
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="card p-6">
                <h2 className="text-xl font-bold text-theme mb-6">Policy Document</h2>
                <pre
                  className="text-sm p-4 rounded-lg overflow-x-auto text-theme-secondary"
                  style={{ background: "var(--surface)" }}
                >
{JSON.stringify(samplePolicy, null, 2)}
                </pre>
              </div>

              <div className="card p-6">
                <h2 className="text-xl font-bold text-theme mb-6">Evaluate Access</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-theme-secondary mb-2">Resource Path</label>
                    <input
                      type="text"
                      value={evalResource}
                      onChange={(e) => setEvalResource(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                      placeholder="users/123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-theme-secondary mb-2">Action</label>
                    <select
                      value={evalAction}
                      onChange={(e) => setEvalAction(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg text-theme focus:outline-none transition-colors"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    >
                      <option value="read">read</option>
                      <option value="write">write</option>
                      <option value="delete">delete</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <button
                    onClick={evaluatePolicy}
                    className="w-full py-4 rounded-lg font-medium transition-colors"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Evaluate
                  </button>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {evalResult && (
                <div
                  className="rounded-2xl p-6"
                  style={evalResult.allowed
                    ? { background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, transparent), color-mix(in srgb, var(--accent) 5%, transparent))", border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)" }
                    : { background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(249, 115, 22, 0.1))", border: "1px solid rgba(239, 68, 68, 0.2)" }
                  }
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: evalResult.allowed ? "color-mix(in srgb, var(--accent) 20%, transparent)" : "rgba(239, 68, 68, 0.2)" }}>
                      {evalResult.allowed ? (
                        <svg className="w-6 h-6 text-theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${evalResult.allowed ? "text-theme-accent" : "text-red-400"}`}>
                        {evalResult.allowed ? "Access Granted" : "Access Denied"}
                      </h3>
                      <p className="text-sm text-theme-secondary">
                        {evalAction} on {evalResource}
                      </p>
                    </div>
                  </div>
                  <p className="text-theme-secondary text-sm">{evalResult.reason}</p>
                </div>
              )}

              <div className="card p-6">
                <h3 className="text-lg font-bold text-theme mb-4">Try These Examples</h3>
                <div className="space-y-2">
                  {[
                    { resource: "users/456", action: "read", desc: "Should be allowed (wildcard match)" },
                    { resource: "users/123", action: "write", desc: "Allowed with MFA condition" },
                    { resource: "admin/settings", action: "read", desc: "Should be denied (admin rule)" },
                    { resource: "users/123", action: "delete", desc: "Should be denied (no delete permission)" },
                  ].map((example) => (
                    <button
                      key={`${example.resource}-${example.action}`}
                      onClick={() => { setEvalResource(example.resource); setEvalAction(example.action); }}
                      className="w-full text-left px-4 py-3 rounded-lg transition-colors"
                      style={{ background: "var(--surface)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface)"; }}
                    >
                      <span className="text-theme-accent">{example.resource}</span> + <span className="text-theme-secondary">{example.action}</span>
                      <span className="text-theme-tertiary text-sm ml-2">- {example.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-theme mb-2">Policy vs Scopes</h3>
                <p className="text-sm text-theme-secondary mb-4">
                  Unlike OAuth&apos;s scope strings that explode as permissions grow, QAuth uses policy references.
                  The token contains just a reference like <code className="text-purple-400">urn:qauth:policy:xyz</code>,
                  while the full policy is fetched and cached separately.
                </p>
                <ul className="space-y-1 text-sm text-theme-tertiary">
                  <li>+ Tokens stay small</li>
                  <li>+ Policies can be updated without re-issuing tokens</li>
                  <li>+ Supports RBAC, ABAC, and ReBAC patterns</li>
                  <li>+ Context-aware conditions (time, IP, MFA)</li>
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 mt-12" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/qauth" className="text-theme-secondary hover:text-theme transition-colors">
              QAuth Home
            </Link>
            <span className="text-theme-muted">|</span>
            <Link href="/blog/qauth-post-quantum-authentication-protocol" className="text-theme-secondary hover:text-theme transition-colors">
              Read the Deep Dive
            </Link>
            <span className="text-theme-muted">|</span>
            <a
              href="https://github.com/Tushar010402/Tushar-Agrawal-Website/tree/master/quantum-shield/qauth"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-secondary hover:text-theme transition-colors"
            >
              View Source
            </a>
          </div>
          <p className="text-theme-tertiary text-sm">
            Educational demo - simulated cryptographic operations
          </p>
        </div>
      </footer>
    </div>
  );
}
