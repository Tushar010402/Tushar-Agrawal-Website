"use client";

import { CodePreview } from "@/components/quantum-shield/CodePreview";

interface MethodParam {
  name: string;
  type: string;
  description: string;
  optional?: boolean;
}

interface MethodDoc {
  name: string;
  signature: string;
  description: string;
  params: MethodParam[];
  returns: string;
  returnsDesc: string;
  throws?: string;
  example: string;
}

interface ClassDoc {
  name: string;
  description: string;
  constructorSig: string;
  constructorParams: MethodParam[];
  methods: MethodDoc[];
}

const classes: ClassDoc[] = [
  {
    name: "QAuthServer",
    description: "Server-side class for creating and validating QAuth tokens. Generates Ed25519 signing keys on construction.",
    constructorSig: "new QAuthServer(config: QAuthConfig)",
    constructorParams: [
      { name: "config", type: "QAuthConfig", description: "Server configuration with issuer and audience URLs." },
    ],
    methods: [
      {
        name: "getPublicKeys",
        signature: "getPublicKeys(): IssuerKeys",
        description: "Returns the public keys for this server instance. Share these with QAuthValidator instances on API servers.",
        params: [],
        returns: "IssuerKeys",
        returnsDesc: "Object containing keyId, ed25519PublicKey, and encryptionKey. Does not include the private key.",
        example: `const server = new QAuthServer({
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});
const keys = server.getPublicKeys();
// => { keyId: '...', ed25519PublicKey: Uint8Array, encryptionKey: Uint8Array }`,
      },
      {
        name: "createToken",
        signature: "createToken(options: TokenOptions): string",
        description: "Creates a new QAuth token signed with Ed25519. The token contains the payload claims encrypted and signed.",
        params: [
          { name: "options.subject", type: "string | Uint8Array", description: "The token subject (usually user ID)." },
          { name: "options.policyRef", type: "string", description: "Policy document URN reference." },
          { name: "options.audience", type: "string | string[]", description: "Token audience(s). Defaults to server config audience.", optional: true },
          { name: "options.validitySeconds", type: "number", description: "Token validity in seconds. Defaults to 3600 (1 hour).", optional: true },
          { name: "options.clientKey", type: "Uint8Array", description: "Client's public key for proof-of-possession binding.", optional: true },
          { name: "options.deviceKey", type: "Uint8Array", description: "Device public key for device binding.", optional: true },
          { name: "options.claims", type: "Record<string, unknown>", description: "Custom claims to embed in the token.", optional: true },
        ],
        returns: "string",
        returnsDesc: "A signed QAuth token string in header.payload.signature format.",
        example: `const token = server.createToken({
  subject: 'user-123',
  policyRef: 'urn:qauth:policy:default',
  validitySeconds: 3600,
  claims: { email: 'user@example.com', roles: ['admin'] },
});`,
      },
      {
        name: "validateToken",
        signature: "validateToken(token: string): TokenPayload",
        description: "Validates a QAuth token by verifying the signature, checking expiration, not-before, issuer, and audience.",
        params: [
          { name: "token", type: "string", description: "The QAuth token string to validate." },
        ],
        returns: "TokenPayload",
        returnsDesc: "The decoded token payload with all claims.",
        throws: "Error if the token is invalid, expired, or has wrong issuer/audience.",
        example: `try {
  const payload = server.validateToken(token);
  console.log('User:', payload.sub);
  console.log('Expires:', new Date(payload.exp * 1000));
} catch (err) {
  console.error('Token invalid:', err.message);
}`,
      },
    ],
  },
  {
    name: "QAuthClient",
    description: "Client-side class for proof-of-possession. Generates an Ed25519 keypair for signing request proofs.",
    constructorSig: "new QAuthClient()",
    constructorParams: [],
    methods: [
      {
        name: "getPublicKey",
        signature: "getPublicKey(): Uint8Array",
        description: "Returns the client's public key. Send this to the server during authentication to enable proof validation.",
        params: [],
        returns: "Uint8Array",
        returnsDesc: "32-byte Ed25519 public key.",
        example: `const client = new QAuthClient();
const publicKey = client.getPublicKey();
// Send to server during signup/login`,
      },
      {
        name: "createProof",
        signature: "createProof(method: string, uri: string, token: string, body?: Uint8Array | string): string",
        description: "Creates a proof-of-possession for an API request. The proof binds the token to the specific HTTP request (method, URI, body).",
        params: [
          { name: "method", type: "string", description: "HTTP method (GET, POST, PUT, DELETE, etc.)." },
          { name: "uri", type: "string", description: "Request URI path (e.g., '/api/resource')." },
          { name: "token", type: "string", description: "The QAuth access token." },
          { name: "body", type: "Uint8Array | string", description: "Request body (for POST/PUT requests).", optional: true },
        ],
        returns: "string",
        returnsDesc: "Base64URL-encoded proof string. Send as X-QAuth-Proof header.",
        example: `const proof = client.createProof('GET', '/api/users/me', token);

// Include in request
fetch('/api/users/me', {
  headers: {
    'Authorization': \`QAuth \${token}\`,
    'X-QAuth-Proof': proof,
  },
});`,
      },
    ],
  },
  {
    name: "QAuthValidator",
    description: "Standalone token validator using pre-shared issuer public keys. Deploy on API servers that need to validate tokens without access to the signing private key.",
    constructorSig: "new QAuthValidator(keys: IssuerKeys, config: QAuthConfig)",
    constructorParams: [
      { name: "keys", type: "IssuerKeys", description: "Issuer's public keys obtained from QAuthServer.getPublicKeys()." },
      { name: "config", type: "QAuthConfig", description: "Expected issuer and audience for validation." },
    ],
    methods: [
      {
        name: "validate",
        signature: "validate(token: string): TokenPayload",
        description: "Validates a token against the pre-shared public keys. Checks signature, expiration, not-before, issuer, and audience.",
        params: [
          { name: "token", type: "string", description: "The QAuth token string to validate." },
        ],
        returns: "TokenPayload",
        returnsDesc: "The decoded token payload.",
        throws: "Error if validation fails.",
        example: `const validator = new QAuthValidator(publicKeys, {
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});
const payload = validator.validate(token);`,
      },
    ],
  },
  {
    name: "ProofValidator",
    description: "Validates proof-of-possession proofs. Verifies that the request was made by the holder of the client's private key.",
    constructorSig: "new ProofValidator(clientPublicKey: Uint8Array)",
    constructorParams: [
      { name: "clientPublicKey", type: "Uint8Array", description: "The client's Ed25519 public key (32 bytes)." },
    ],
    methods: [
      {
        name: "validate",
        signature: "validate(proof: string, method: string, uri: string, token: string, body?: Uint8Array | string): boolean",
        description: "Validates a proof of possession. Checks timestamp (60-second window), method/URI binding, body hash, token hash, and signature.",
        params: [
          { name: "proof", type: "string", description: "The base64URL-encoded proof string from X-QAuth-Proof header." },
          { name: "method", type: "string", description: "The HTTP method of the request." },
          { name: "uri", type: "string", description: "The URI of the request." },
          { name: "token", type: "string", description: "The QAuth token from Authorization header." },
          { name: "body", type: "Uint8Array | string", description: "The request body, if present.", optional: true },
        ],
        returns: "boolean",
        returnsDesc: "true if the proof is valid, false otherwise. Does not throw.",
        example: `const proofValidator = new ProofValidator(clientPublicKey);
const isValid = proofValidator.validate(
  proof, 'POST', '/api/data', token, requestBody
);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid proof' });
}`,
      },
    ],
  },
  {
    name: "PolicyEngine",
    description: "Evaluates authorization policies. Load policy documents and evaluate them against request contexts. Supports glob patterns, conditions, and priority ordering.",
    constructorSig: "new PolicyEngine()",
    constructorParams: [],
    methods: [
      {
        name: "loadPolicy",
        signature: "loadPolicy(policy: Policy): void",
        description: "Loads a policy document into the engine. Policies are stored by ID and can be updated by loading a new policy with the same ID.",
        params: [
          { name: "policy", type: "Policy", description: "The policy document to load." },
        ],
        returns: "void",
        returnsDesc: "",
        example: `const engine = new PolicyEngine();
engine.loadPolicy({
  id: 'urn:qauth:policy:api',
  version: '1.0',
  issuer: 'https://auth.example.com',
  rules: [
    { id: 'allow-read', effect: 'allow', resources: ['*'], actions: ['read'] },
  ],
});`,
      },
      {
        name: "evaluate",
        signature: "evaluate(policyId: string, context: EvaluationContext): EvaluationResult",
        description: "Evaluates a loaded policy against the given context. Rules are sorted by priority (highest first). Returns the first matching rule's effect, or 'deny' if no rule matches (default deny).",
        params: [
          { name: "policyId", type: "string", description: "The policy ID to evaluate." },
          { name: "context", type: "EvaluationContext", description: "The request context (subject, resource, request)." },
        ],
        returns: "EvaluationResult",
        returnsDesc: "The evaluation result with effect ('allow'|'deny'), matched rule ID, and reason.",
        example: `const result = engine.evaluate('urn:qauth:policy:api', {
  subject: { id: 'user-123', attributes: { role: 'admin' } },
  resource: { path: 'api/admin/users' },
  request: { action: 'delete' },
});
if (result.effect === 'allow') {
  // Proceed
}`,
      },
    ],
  },
];

const interfaces = [
  {
    name: "QAuthConfig",
    code: `interface QAuthConfig {
  issuer: string;    // Token issuer URL (e.g., 'https://auth.example.com')
  audience: string;  // Expected audience URL (e.g., 'https://api.example.com')
}`,
  },
  {
    name: "TokenOptions",
    code: `interface TokenOptions {
  subject: string | Uint8Array;         // User identifier
  policyRef: string;                     // Policy document URN
  audience?: string | string[];          // Override audience (default: config.audience)
  validitySeconds?: number;              // Token TTL (default: 3600)
  clientKey?: Uint8Array;                // Client public key for PoP binding
  deviceKey?: Uint8Array;                // Device public key
  claims?: Record<string, unknown>;      // Custom payload claims
}`,
  },
  {
    name: "TokenPayload",
    code: `interface TokenPayload {
  sub: string;                     // Subject (user ID)
  iss: string;                     // Issuer URL
  aud: string[];                   // Audience URLs
  exp: number;                     // Expiration (Unix timestamp)
  iat: number;                     // Issued at (Unix timestamp)
  nbf: number;                     // Not before (Unix timestamp)
  jti: string;                     // Unique token ID
  rid: string;                     // Revocation ID
  pol: string;                     // Policy reference
  cst: Record<string, unknown>;    // Custom claims
}`,
  },
  {
    name: "IssuerKeys",
    code: `interface IssuerKeys {
  keyId: string;                   // Key identifier (hex)
  ed25519PublicKey: Uint8Array;    // 32-byte Ed25519 public key
  ed25519PrivateKey?: Uint8Array;  // Private key (only on server)
  encryptionKey: Uint8Array;       // 32-byte encryption key
}`,
  },
  {
    name: "Policy",
    code: `interface Policy {
  id: string;               // Unique policy ID (URN)
  version: string;           // Policy version
  issuer: string;            // Policy issuer
  name?: string;             // Human-readable name
  description?: string;      // Policy description
  rules: PolicyRule[];       // Authorization rules
}`,
  },
  {
    name: "PolicyRule",
    code: `interface PolicyRule {
  id?: string;                       // Rule identifier
  effect: 'allow' | 'deny';         // Rule effect
  resources: string[];               // Resource patterns (glob)
  actions: string[];                 // Allowed/denied actions
  conditions?: PolicyConditions;     // Optional conditions
  priority?: number;                 // Higher = evaluated first
}`,
  },
  {
    name: "PolicyConditions",
    code: `interface PolicyConditions {
  time?: {
    after?: string;        // ISO 8601 time (e.g., '09:00')
    before?: string;       // ISO 8601 time (e.g., '17:00')
    days?: string[];       // Allowed days (e.g., ['mon', 'tue'])
    timezone?: string;     // Timezone (e.g., 'America/New_York')
  };
  ip?: {
    allow_ranges?: string[];  // Allowed CIDR ranges
    deny_ranges?: string[];   // Denied CIDR ranges
  };
  mfa?: {
    required?: boolean;    // Require MFA verification
    methods?: string[];    // Required MFA methods
  };
  custom?: Record<string, unknown>;  // Custom conditions
}`,
  },
  {
    name: "EvaluationContext",
    code: `interface EvaluationContext {
  subject?: {
    id?: string;
    roles?: string[];
    groups?: string[];
    attributes?: Record<string, unknown>;
  };
  resource?: {
    path: string;
    owner?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
  request?: {
    action: string;
    method?: string;
    ip?: string;
    mfa_verified?: boolean;
  };
}`,
  },
  {
    name: "EvaluationResult",
    code: `interface EvaluationResult {
  effect: 'allow' | 'deny';     // Authorization decision
  matched_rule: string | null;   // ID of the matching rule
  reason: string;                // Human-readable explanation
}`,
  },
];

const classNavItems = classes.map((c) => ({ id: c.name.toLowerCase(), label: c.name }));

export default function ApiClient() {
  return (
    <div>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">API Reference</h1>
        <p className="text-theme-secondary text-lg max-w-2xl">
          Complete reference for the <code className="text-theme-accent text-base">@quantumshield/qauth</code> TypeScript SDK.
        </p>
      </div>

      {/* Quick Nav */}
      <div
        className="rounded-2xl p-6 mb-12"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <h3 className="font-semibold text-theme mb-4">Classes</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {classNavItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="px-3 py-1.5 rounded-lg text-sm font-mono text-theme-accent transition-colors"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
            >
              {item.label}
            </a>
          ))}
        </div>
        <h3 className="font-semibold text-theme mb-4">Interfaces</h3>
        <div className="flex flex-wrap gap-2">
          {interfaces.map((iface) => (
            <a
              key={iface.name}
              href={`#${iface.name.toLowerCase()}`}
              className="px-3 py-1.5 rounded-lg text-sm font-mono text-theme-secondary hover:text-theme transition-colors"
              style={{ background: "var(--surface-hover)" }}
            >
              {iface.name}
            </a>
          ))}
        </div>
      </div>

      {/* Classes */}
      {classes.map((cls) => (
        <section key={cls.name} className="mb-16" id={cls.name.toLowerCase()}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-2xl font-bold text-theme font-mono">{cls.name}</h2>
            <span className="px-2 py-0.5 rounded text-xs text-theme-accent" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>
              class
            </span>
          </div>
          <p className="text-theme-secondary mb-6">{cls.description}</p>

          {/* Constructor */}
          <div
            className="rounded-xl p-5 mb-6"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <h3 className="font-semibold text-theme mb-2">Constructor</h3>
            <code className="text-sm text-theme-accent font-mono">{cls.constructorSig}</code>
            {cls.constructorParams.length > 0 && (
              <div className="mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Parameter</th>
                      <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Type</th>
                      <th className="text-left py-2 text-theme-secondary font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cls.constructorParams.map((p) => (
                      <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="py-2 pr-4 font-mono text-theme-accent">{p.name}</td>
                        <td className="py-2 pr-4 font-mono text-yellow-400">{p.type}</td>
                        <td className="py-2 text-theme-secondary">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Methods */}
          {cls.methods.map((method) => (
            <div
              key={method.name}
              className="rounded-xl p-5 mb-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-semibold text-theme font-mono">.{method.name}()</h3>
                <span className="text-xs text-theme-muted font-mono flex-shrink-0">
                  returns {method.returns}
                </span>
              </div>
              <code className="text-xs text-theme-accent font-mono block mb-3">{method.signature}</code>
              <p className="text-theme-secondary text-sm mb-4">{method.description}</p>

              {method.params.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Parameter</th>
                        <th className="text-left py-2 pr-4 text-theme-secondary font-medium">Type</th>
                        <th className="text-left py-2 text-theme-secondary font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {method.params.map((p) => (
                        <tr key={p.name} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="py-2 pr-4 font-mono text-theme-accent text-xs">
                            {p.name}{p.optional && <span className="text-theme-muted">?</span>}
                          </td>
                          <td className="py-2 pr-4 font-mono text-yellow-400 text-xs">{p.type}</td>
                          <td className="py-2 text-theme-secondary text-xs">{p.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {method.throws && (
                <p className="text-sm text-red-400 mb-3">
                  <strong>Throws:</strong> {method.throws}
                </p>
              )}

              <CodePreview code={method.example} language="TypeScript" fileName={`${cls.name.toLowerCase()}.ts`} />
            </div>
          ))}
        </section>
      ))}

      {/* Interfaces */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-theme mb-8">Interfaces</h2>
        <div className="space-y-6">
          {interfaces.map((iface) => (
            <div key={iface.name} id={iface.name.toLowerCase()}>
              <h3 className="text-lg font-semibold text-theme font-mono mb-3">{iface.name}</h3>
              <CodePreview code={iface.code} language="TypeScript" fileName="types.ts" />
            </div>
          ))}
        </div>
      </section>

      {/* Utility Functions */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold text-theme mb-4">Utility Functions</h2>
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {[
            { name: "getVersion()", returns: "string", desc: "Returns the SDK version (e.g., '0.1.0')." },
            { name: "getProtocolVersion()", returns: "string", desc: "Returns the QAuth protocol version (e.g., '1.0')." },
            { name: "initQAuth()", returns: "Promise<void>", desc: "No-op for the pure JS implementation. Included for API compatibility." },
            { name: "isInitialized()", returns: "boolean", desc: "Always returns true for the pure JS implementation." },
            { name: "toBytes(data: string | Uint8Array)", returns: "Uint8Array", desc: "Converts a string to UTF-8 bytes." },
            { name: "bytesToHex(bytes: Uint8Array)", returns: "string", desc: "Converts bytes to a hex string." },
            { name: "hexToBytes(hex: string)", returns: "Uint8Array", desc: "Converts a hex string to bytes." },
          ].map((fn) => (
            <div key={fn.name} className="flex flex-col sm:flex-row sm:items-start gap-2" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
              <code className="text-sm font-mono text-theme-accent flex-shrink-0 min-w-0">{fn.name}</code>
              <div className="flex-1">
                <span className="text-theme-muted text-xs font-mono">→ {fn.returns}</span>
                <p className="text-theme-secondary text-sm mt-1">{fn.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
