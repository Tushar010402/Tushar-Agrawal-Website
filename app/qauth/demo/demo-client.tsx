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
    <div className="min-h-screen bg-black pt-20">
      {/* Header */}
      <div className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/qauth" className="text-neutral-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">QAuth Demo</h1>
              <p className="text-sm text-neutral-400">Interactive Token Demonstration</p>
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
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "create"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            Create Token
          </button>
          <button
            onClick={() => setActiveTab("proof")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "proof"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            Proof of Possession
          </button>
          <button
            onClick={() => setActiveTab("policy")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "policy"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
            }`}
          >
            Policy Evaluation
          </button>
        </div>

        {/* Token Creation Tab */}
        {activeTab === "create" && (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Token Claims</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Subject (sub)</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="user-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Issuer (iss)</label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="https://auth.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Audience (aud)</label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="https://api.example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Expires In (seconds)</label>
                  <input
                    type="number"
                    value={expiresIn}
                    onChange={(e) => setExpiresIn(parseInt(e.target.value) || 3600)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Policy Reference</label>
                  <input
                    type="text"
                    value={policyRef}
                    onChange={(e) => setPolicyRef(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    placeholder="urn:qauth:policy:standard-user"
                  />
                </div>

                <button
                  onClick={generateToken}
                  disabled={isGenerating}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-cyan-500 transition-colors disabled:opacity-50"
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
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Encoded QToken</h3>
                      <button
                        onClick={() => copyToClipboard(encodedToken)}
                        className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded hover:text-white transition-colors text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <code className="block text-sm text-emerald-400 break-all bg-neutral-800 p-4 rounded-lg">
                      {encodedToken}
                    </code>
                    <p className="text-xs text-neutral-500 mt-2">
                      Total size: ~4KB (vs ~1KB for JWT) - includes post-quantum signature
                    </p>
                  </div>

                  {/* Token Structure */}
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Token Structure</h3>

                    {/* Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">Header (42 bytes)</span>
                      </div>
                      <div className="bg-neutral-800 p-3 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2 text-neutral-300">
                          <span className="text-neutral-500">Version:</span>
                          <span>{token.header.version}</span>
                          <span className="text-neutral-500">Token Type:</span>
                          <span>{token.header.tokenType}</span>
                          <span className="text-neutral-500">Key ID:</span>
                          <span className="truncate">{token.header.keyId.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Payload (Encrypted) */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">Encrypted Payload</span>
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">XChaCha20-Poly1305</span>
                      </div>
                      <div className="bg-neutral-800 p-3 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2 text-neutral-300">
                          <span className="text-neutral-500">Subject:</span>
                          <span>{token.payload.sub}</span>
                          <span className="text-neutral-500">Issuer:</span>
                          <span className="truncate">{token.payload.iss}</span>
                          <span className="text-neutral-500">Audience:</span>
                          <span className="truncate">{token.payload.aud}</span>
                          <span className="text-neutral-500">Expires:</span>
                          <span>{new Date(token.payload.exp).toLocaleString()}</span>
                          <span className="text-neutral-500">Policy:</span>
                          <span className="truncate">{token.payload.policyRef}</span>
                          <span className="text-neutral-500">Revocation ID:</span>
                          <span className="truncate">{token.payload.revocationId.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual Signature */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs font-medium">Dual Signature (3373 bytes)</span>
                      </div>
                      <div className="bg-neutral-800 p-3 rounded-lg text-sm space-y-2">
                        <div>
                          <span className="text-neutral-500">Ed25519 (64 bytes):</span>
                          <code className="block text-emerald-400 text-xs mt-1 truncate">{token.signature.ed25519.slice(0, 64)}...</code>
                        </div>
                        <div>
                          <span className="text-neutral-500">ML-DSA-65 (3309 bytes):</span>
                          <code className="block text-cyan-400 text-xs mt-1 truncate">{token.signature.mlDsa65}</code>
                        </div>
                      </div>
                    </div>

                    {/* Proof Binding */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium">Proof Binding (96 bytes)</span>
                      </div>
                      <div className="bg-neutral-800 p-3 rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2 text-neutral-300">
                          <span className="text-neutral-500">Device Key:</span>
                          <span className="truncate">{token.proofBinding.deviceKey.slice(0, 16)}...</span>
                          <span className="text-neutral-500">Client Key:</span>
                          <span className="truncate">{token.proofBinding.clientKey.slice(0, 16)}...</span>
                          <span className="text-neutral-500">IP Hash:</span>
                          <span className="truncate">{token.proofBinding.ipHash.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Features */}
                  <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Security Features</h3>
                    <ul className="space-y-2 text-sm text-neutral-300">
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Dual signatures: Ed25519 (classical) + ML-DSA-65 (post-quantum)
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Encrypted payload - claims are private, not visible
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Bound to device and client keys - stolen token is useless
                      </li>
                      <li className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Built-in revocation ID for instant invalidation
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <p className="text-neutral-400">Configure claims and generate a token to see the structure</p>
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
              className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6"
            >
              <h2 className="text-xl font-bold text-white mb-6">Request Details</h2>

              {!token ? (
                <div className="text-center py-8">
                  <p className="text-neutral-400 mb-4">Generate a token first to create proofs</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                  >
                    Go to Create Token
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">HTTP Method</label>
                    <select
                      value={requestMethod}
                      onChange={(e) => setRequestMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Request URI</label>
                    <input
                      type="text"
                      value={requestUri}
                      onChange={(e) => setRequestUri(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="/api/users/me"
                    />
                  </div>

                  <button
                    onClick={generateProof}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-cyan-500 transition-colors"
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
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">How Proof of Possession Works</h3>
                <div className="space-y-3 text-sm text-neutral-300">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <p>Client signs: timestamp + method + URI + body_hash + token_hash</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <p>Proof is included in X-QAuth-Proof header</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <p>Server verifies proof matches token&apos;s ProofBinding</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <p>Proof valid for 60 seconds, can&apos;t be replayed</p>
                  </div>
                </div>
              </div>

              {proof && (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Generated Proof</h3>
                    <button
                      onClick={() => copyToClipboard(proof)}
                      className="px-3 py-1 bg-neutral-800 text-neutral-400 rounded hover:text-white transition-colors text-sm"
                    >
                      Copy
                    </button>
                  </div>
                  <code className="block text-sm text-emerald-400 break-all bg-neutral-800 p-4 rounded-lg">
                    {proof}
                  </code>

                  <div className="mt-4 p-4 bg-neutral-800 rounded-lg">
                    <p className="text-xs text-neutral-400 mb-2">Example HTTP Request:</p>
                    <code className="text-xs text-neutral-300 block">
                      {requestMethod} {requestUri} HTTP/1.1<br />
                      Authorization: QAuth {encodedToken.slice(0, 30)}...<br />
                      X-QAuth-Proof: {proof.slice(0, 40)}...
                    </code>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">Why This Matters</h3>
                <p className="text-sm text-neutral-300">
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
              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Policy Document</h2>
                <pre className="text-sm text-neutral-300 bg-neutral-800 p-4 rounded-lg overflow-x-auto">
{JSON.stringify(samplePolicy, null, 2)}
                </pre>
              </div>

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-6">Evaluate Access</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Resource Path</label>
                    <input
                      type="text"
                      value={evalResource}
                      onChange={(e) => setEvalResource(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                      placeholder="users/123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-neutral-400 mb-2">Action</label>
                    <select
                      value={evalAction}
                      onChange={(e) => setEvalAction(e.target.value)}
                      className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="read">read</option>
                      <option value="write">write</option>
                      <option value="delete">delete</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>

                  <button
                    onClick={evaluatePolicy}
                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg font-medium hover:from-emerald-500 hover:to-cyan-500 transition-colors"
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
                <div className={`rounded-2xl p-6 ${
                  evalResult.allowed
                    ? "bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20"
                    : "bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20"
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      evalResult.allowed ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`}>
                      {evalResult.allowed ? (
                        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h3 className={`text-xl font-bold ${evalResult.allowed ? "text-emerald-400" : "text-red-400"}`}>
                        {evalResult.allowed ? "Access Granted" : "Access Denied"}
                      </h3>
                      <p className="text-sm text-neutral-400">
                        {evalAction} on {evalResource}
                      </p>
                    </div>
                  </div>
                  <p className="text-neutral-300 text-sm">{evalResult.reason}</p>
                </div>
              )}

              <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Try These Examples</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => { setEvalResource("users/456"); setEvalAction("read"); }}
                    className="w-full text-left px-4 py-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-emerald-400">users/456</span> + <span className="text-cyan-400">read</span>
                    <span className="text-neutral-500 text-sm ml-2">- Should be allowed (wildcard match)</span>
                  </button>
                  <button
                    onClick={() => { setEvalResource("users/123"); setEvalAction("write"); }}
                    className="w-full text-left px-4 py-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-emerald-400">users/123</span> + <span className="text-cyan-400">write</span>
                    <span className="text-neutral-500 text-sm ml-2">- Allowed with MFA condition</span>
                  </button>
                  <button
                    onClick={() => { setEvalResource("admin/settings"); setEvalAction("read"); }}
                    className="w-full text-left px-4 py-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-emerald-400">admin/settings</span> + <span className="text-cyan-400">read</span>
                    <span className="text-neutral-500 text-sm ml-2">- Should be denied (admin rule)</span>
                  </button>
                  <button
                    onClick={() => { setEvalResource("users/123"); setEvalAction("delete"); }}
                    className="w-full text-left px-4 py-3 bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors"
                  >
                    <span className="text-emerald-400">users/123</span> + <span className="text-cyan-400">delete</span>
                    <span className="text-neutral-500 text-sm ml-2">- Should be denied (no delete permission)</span>
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-2">Policy vs Scopes</h3>
                <p className="text-sm text-neutral-300 mb-4">
                  Unlike OAuth&apos;s scope strings that explode as permissions grow, QAuth uses policy references.
                  The token contains just a reference like <code className="text-purple-400">urn:qauth:policy:xyz</code>,
                  while the full policy is fetched and cached separately.
                </p>
                <ul className="space-y-1 text-sm text-neutral-400">
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
      <footer className="border-t border-neutral-800 py-8 px-4 mt-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/qauth" className="text-neutral-400 hover:text-white transition-colors">
              QAuth Home
            </Link>
            <span className="text-neutral-700">|</span>
            <Link href="/blog/qauth-post-quantum-authentication-protocol" className="text-neutral-400 hover:text-white transition-colors">
              Read the Deep Dive
            </Link>
            <span className="text-neutral-700">|</span>
            <a
              href="https://github.com/Tushar010402/Tushar-Agrawal-Website/tree/master/quantum-shield/qauth"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-400 hover:text-white transition-colors"
            >
              View Source
            </a>
          </div>
          <p className="text-neutral-500 text-sm">
            Educational demo - simulated cryptographic operations
          </p>
        </div>
      </footer>
    </div>
  );
}
