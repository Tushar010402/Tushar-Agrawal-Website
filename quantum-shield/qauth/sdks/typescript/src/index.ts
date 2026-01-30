/**
 * @quantumshield/qauth - QuantumAuth SDK for TypeScript/JavaScript
 *
 * Next-generation authentication and authorization protocol with post-quantum security.
 *
 * @example
 * ```typescript
 * import { QAuthClient, QAuthServer } from '@quantumshield/qauth';
 *
 * // Server-side: Generate issuer keys and create tokens
 * const server = new QAuthServer();
 * const token = server.createToken({
 *   subject: 'user-123',
 *   issuer: 'https://auth.example.com',
 *   audience: 'https://api.example.com',
 *   policyRef: 'urn:qauth:policy:default',
 *   validitySeconds: 3600,
 * });
 *
 * // Client-side: Create proof of possession for API requests
 * const client = new QAuthClient();
 * const proof = client.createProof('GET', '/api/resource', token);
 *
 * // Server-side: Validate token and proof
 * const payload = server.validateToken(token);
 * const isValid = server.validateProof(proof, 'GET', '/api/resource', token);
 * ```
 */

// Types
export interface QAuthConfig {
  /** Issuer URL (e.g., 'https://auth.example.com') */
  issuer: string;
  /** Expected audience for token validation */
  audience: string;
}

export interface TokenOptions {
  /** Subject identifier (user ID) */
  subject: string | Uint8Array;
  /** Issuer URL */
  issuer: string;
  /** Audience(s) for the token */
  audience: string | string[];
  /** Policy reference URN */
  policyRef: string;
  /** Token validity in seconds (default: 3600) */
  validitySeconds?: number;
  /** Client's public key for binding */
  clientKey?: Uint8Array;
  /** Device key for binding */
  deviceKey?: Uint8Array;
  /** Custom claims */
  claims?: Record<string, unknown>;
}

export interface TokenPayload {
  /** Subject identifier */
  sub: string;
  /** Issuer */
  iss: string;
  /** Audience(s) */
  aud: string[];
  /** Expiration timestamp (Unix seconds) */
  exp: number;
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Not before timestamp (Unix seconds) */
  nbf: number;
  /** JWT ID (hex encoded) */
  jti: string;
  /** Revocation ID (hex encoded) */
  rid: string;
  /** Policy reference */
  pol: string;
  /** Custom claims */
  cst: Record<string, unknown>;
}

export interface PolicyRule {
  /** Rule identifier */
  id?: string;
  /** Rule effect */
  effect: 'allow' | 'deny';
  /** Resource patterns */
  resources: string[];
  /** Permitted actions */
  actions: string[];
  /** Rule conditions */
  conditions?: PolicyConditions;
  /** Rule priority (higher = evaluated first) */
  priority?: number;
}

export interface PolicyConditions {
  /** Time-based conditions */
  time?: {
    after?: string;
    before?: string;
    days?: string[];
    timezone?: string;
  };
  /** IP-based conditions */
  ip?: {
    allow_ranges?: string[];
    deny_ranges?: string[];
    require_vpn?: boolean;
    geo_allow?: string[];
    geo_deny?: string[];
  };
  /** Device conditions */
  device?: {
    types?: string[];
    os?: string[];
    managed?: boolean;
    attestation_required?: boolean;
    min_security_level?: number;
  };
  /** MFA conditions */
  mfa?: {
    required?: boolean;
    methods?: string[];
    max_age_minutes?: number;
    step_up_for?: string[];
  };
  /** Custom conditions */
  custom?: Record<string, unknown>;
}

export interface Policy {
  /** Unique policy identifier (URN) */
  id: string;
  /** Policy version */
  version: string;
  /** Issuing authority URL */
  issuer: string;
  /** Policy name */
  name?: string;
  /** Policy description */
  description?: string;
  /** Authorization rules */
  rules: PolicyRule[];
}

export interface EvaluationContext {
  /** Subject context */
  subject?: {
    id?: string;
    email?: string;
    roles?: string[];
    groups?: string[];
    attributes?: Record<string, unknown>;
  };
  /** Resource context */
  resource?: {
    path: string;
    owner?: string;
    type?: string;
    attributes?: Record<string, unknown>;
  };
  /** Request context */
  request?: {
    action: string;
    method?: string;
    ip?: string;
    mfa_verified?: boolean;
    mfa_method?: string;
    device_type?: string;
    is_vpn?: boolean;
  };
}

export interface EvaluationResult {
  /** Decision effect */
  effect: 'allow' | 'deny';
  /** Matched rule ID (if any) */
  matched_rule: string | null;
  /** Reason for decision */
  reason: string;
}

export interface IssuerKeys {
  /** Key ID (hex encoded) */
  keyId: string;
  /** Ed25519 public key */
  ed25519PublicKey: Uint8Array;
  /** ML-DSA public key */
  mldsaPublicKey: Uint8Array;
  /** Encryption key */
  encryptionKey: Uint8Array;
}

// WASM module interface
let wasmModule: any = null;

/**
 * Initialize the QAuth WASM module
 * Must be called before using any QAuth functionality
 */
export async function initQAuth(): Promise<void> {
  if (wasmModule) return;

  // Dynamic import for WASM module
  if (typeof window !== 'undefined') {
    // Browser environment
    const wasm = await import('../wasm/qauth.js');
    await wasm.default();
    wasmModule = wasm;
  } else {
    // Node.js environment
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    const wasmPath = join(__dirname, '..', 'wasm', 'qauth_bg.wasm');
    const wasmBuffer = await readFile(wasmPath);
    const wasm = await import('../wasm/qauth.js');
    await wasm.default(wasmBuffer);
    wasmModule = wasm;
  }
}

/**
 * Check if QAuth is initialized
 */
export function isInitialized(): boolean {
  return wasmModule !== null;
}

/**
 * Get QAuth version
 */
export function getVersion(): string {
  ensureInitialized();
  return wasmModule.qauth_version();
}

/**
 * Get QAuth protocol version
 */
export function getProtocolVersion(): string {
  ensureInitialized();
  return wasmModule.qauth_protocol_version();
}

function ensureInitialized(): void {
  if (!wasmModule) {
    throw new Error('QAuth not initialized. Call initQAuth() first.');
  }
}

/**
 * QAuth Server for token issuance and validation
 */
export class QAuthServer {
  private issuerKeys: any;
  private config: QAuthConfig;

  constructor(config: QAuthConfig) {
    ensureInitialized();
    this.config = config;
    this.issuerKeys = new wasmModule.WasmIssuerKeys();
  }

  /**
   * Get the issuer's public keys (for sharing with validators)
   */
  getPublicKeys(): IssuerKeys {
    return {
      keyId: bytesToHex(this.issuerKeys.key_id),
      ed25519PublicKey: new Uint8Array(this.issuerKeys.ed25519_public_key),
      mldsaPublicKey: new Uint8Array(this.issuerKeys.mldsa_public_key),
      encryptionKey: new Uint8Array(this.issuerKeys.encryption_key),
    };
  }

  /**
   * Create a QToken
   */
  createToken(options: TokenOptions): string {
    let builder = new wasmModule.WasmTokenBuilder()
      .subject(toBytes(options.subject))
      .issuer(options.issuer)
      .policy_ref(options.policyRef)
      .validity_seconds(options.validitySeconds ?? 3600);

    const audiences = Array.isArray(options.audience)
      ? options.audience
      : [options.audience];
    for (const aud of audiences) {
      builder = builder.audience(aud);
    }

    if (options.clientKey) {
      builder = builder.client_key(options.clientKey);
    }

    if (options.deviceKey) {
      builder = builder.device_key(options.deviceKey);
    }

    if (options.claims) {
      builder = builder.claims(JSON.stringify(options.claims));
    }

    return builder.build(this.issuerKeys);
  }

  /**
   * Validate a token and return the payload
   */
  validateToken(token: string): TokenPayload {
    const keys = this.getPublicKeys();
    const validator = new wasmModule.WasmTokenValidator(
      keys.ed25519PublicKey,
      keys.mldsaPublicKey,
      keys.encryptionKey,
      this.config.issuer,
      this.config.audience
    );

    const payloadJson = validator.validate(token);
    return JSON.parse(payloadJson);
  }

  /**
   * Create a token validator for external validation
   */
  createValidator(): QAuthValidator {
    const keys = this.getPublicKeys();
    return new QAuthValidator(keys, this.config);
  }
}

/**
 * QAuth Validator for token validation (server-side)
 */
export class QAuthValidator {
  private validator: any;

  constructor(keys: IssuerKeys, config: QAuthConfig) {
    ensureInitialized();
    this.validator = new wasmModule.WasmTokenValidator(
      keys.ed25519PublicKey,
      keys.mldsaPublicKey,
      keys.encryptionKey,
      config.issuer,
      config.audience
    );
  }

  /**
   * Validate a token and return the payload
   */
  validate(token: string): TokenPayload {
    const payloadJson = this.validator.validate(token);
    return JSON.parse(payloadJson);
  }
}

/**
 * QAuth Client for proof of possession
 */
export class QAuthClient {
  private proofGenerator: any;

  constructor() {
    ensureInitialized();
    this.proofGenerator = new wasmModule.WasmProofGenerator();
  }

  /**
   * Get the client's public key
   */
  getPublicKey(): Uint8Array {
    return new Uint8Array(this.proofGenerator.public_key);
  }

  /**
   * Create a proof of possession for an API request
   */
  createProof(
    method: string,
    uri: string,
    token: string,
    body?: Uint8Array | string
  ): string {
    const bodyBytes = body ? toBytes(body) : undefined;
    return this.proofGenerator.create_proof(method, uri, bodyBytes, token);
  }
}

/**
 * Proof Validator for server-side proof verification
 */
export class ProofValidator {
  private validator: any;

  constructor(clientPublicKey: Uint8Array) {
    ensureInitialized();
    this.validator = new wasmModule.WasmProofValidator(clientPublicKey);
  }

  /**
   * Validate a proof of possession
   */
  validate(
    proof: string,
    method: string,
    uri: string,
    token: string,
    body?: Uint8Array | string
  ): boolean {
    const bodyBytes = body ? toBytes(body) : undefined;
    return this.validator.validate(proof, method, uri, bodyBytes, token);
  }
}

/**
 * Policy Engine for authorization decisions
 */
export class PolicyEngine {
  private engine: any;

  constructor() {
    ensureInitialized();
    this.engine = new wasmModule.WasmPolicyEngine();
  }

  /**
   * Load a policy
   */
  loadPolicy(policy: Policy): void {
    this.engine.load_policy(JSON.stringify(policy));
  }

  /**
   * Evaluate a policy for a given context
   */
  evaluate(policyId: string, context: EvaluationContext): EvaluationResult {
    const resultJson = this.engine.evaluate(policyId, JSON.stringify(context));
    return JSON.parse(resultJson);
  }
}

// Utility functions
function toBytes(data: string | Uint8Array): Uint8Array {
  if (typeof data === 'string') {
    return new TextEncoder().encode(data);
  }
  return data;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Re-export utilities
export { toBytes, bytesToHex, hexToBytes };
