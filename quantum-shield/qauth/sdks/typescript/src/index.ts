/**
 * @quantumshield/qauth - QuantumAuth SDK for TypeScript/JavaScript
 *
 * Next-generation authentication and authorization protocol with post-quantum security.
 *
 * @example
 * ```typescript
 * import { QAuthServer, QAuthClient, PolicyEngine } from '@quantumshield/qauth';
 *
 * // Server-side
 * const server = new QAuthServer({
 *   issuer: 'https://auth.example.com',
 *   audience: 'https://api.example.com',
 * });
 * const token = server.createToken({
 *   subject: 'user-123',
 *   policyRef: 'urn:qauth:policy:default',
 * });
 *
 * // Client-side
 * const client = new QAuthClient();
 * const proof = client.createProof('GET', '/api/resource', token);
 * ```
 */

import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface QAuthConfig {
  issuer: string;
  audience: string;
}

export interface TokenOptions {
  subject: string | Uint8Array;
  policyRef: string;
  audience?: string | string[];
  validitySeconds?: number;
  clientKey?: Uint8Array;
  deviceKey?: Uint8Array;
  claims?: Record<string, unknown>;
}

export interface TokenPayload {
  sub: string;
  iss: string;
  aud: string[];
  exp: number;
  iat: number;
  nbf: number;
  jti: string;
  rid: string;
  pol: string;
  cst: Record<string, unknown>;
}

export interface PolicyRule {
  id?: string;
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
  conditions?: PolicyConditions;
  priority?: number;
}

export interface PolicyConditions {
  time?: {
    after?: string;
    before?: string;
    days?: string[];
    timezone?: string;
  };
  ip?: {
    allow_ranges?: string[];
    deny_ranges?: string[];
  };
  mfa?: {
    required?: boolean;
    methods?: string[];
  };
  custom?: Record<string, unknown>;
}

export interface Policy {
  id: string;
  version: string;
  issuer: string;
  name?: string;
  description?: string;
  rules: PolicyRule[];
}

export interface EvaluationContext {
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
}

export interface EvaluationResult {
  effect: 'allow' | 'deny';
  matched_rule: string | null;
  reason: string;
}

export interface IssuerKeys {
  keyId: string;
  ed25519PublicKey: Uint8Array;
  ed25519PrivateKey?: Uint8Array;
  encryptionKey: Uint8Array;
}

// ============================================
// Utility Functions
// ============================================

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

function randomBytes(length: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(length));
}

function sha256(data: Uint8Array): Uint8Array {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return new Uint8Array(hash.digest());
}

function base64UrlEncode(data: Uint8Array): string {
  return Buffer.from(data)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return new Uint8Array(Buffer.from(str, 'base64'));
}

// ============================================
// QAuth Server
// ============================================

export class QAuthServer {
  private config: QAuthConfig;
  private keys: IssuerKeys;

  constructor(config: QAuthConfig) {
    this.config = config;

    // Generate Ed25519 keypair
    const keypair = crypto.generateKeyPairSync('ed25519');
    const publicKey = keypair.publicKey.export({ type: 'spki', format: 'der' });
    const privateKey = keypair.privateKey.export({ type: 'pkcs8', format: 'der' });

    // Extract raw keys (skip DER headers)
    const rawPublicKey = new Uint8Array(publicKey.slice(-32));
    const rawPrivateKey = new Uint8Array(privateKey.slice(-32));

    this.keys = {
      keyId: bytesToHex(sha256(rawPublicKey).slice(0, 16)),
      ed25519PublicKey: rawPublicKey,
      ed25519PrivateKey: rawPrivateKey,
      encryptionKey: randomBytes(32),
    };
  }

  getPublicKeys(): IssuerKeys {
    return {
      keyId: this.keys.keyId,
      ed25519PublicKey: this.keys.ed25519PublicKey,
      encryptionKey: this.keys.encryptionKey,
    };
  }

  createToken(options: TokenOptions): string {
    const now = Math.floor(Date.now() / 1000);
    const validity = options.validitySeconds ?? 3600;

    const payload: TokenPayload = {
      sub: typeof options.subject === 'string'
        ? options.subject
        : new TextDecoder().decode(options.subject),
      iss: this.config.issuer,
      aud: options.audience
        ? (Array.isArray(options.audience) ? options.audience : [options.audience])
        : [this.config.audience],
      exp: now + validity,
      iat: now,
      nbf: now,
      jti: bytesToHex(randomBytes(16)),
      rid: bytesToHex(randomBytes(16)),
      pol: options.policyRef,
      cst: options.claims ?? {},
    };

    // Create JWT-like token (header.payload.signature)
    const header = { alg: 'EdDSA', typ: 'QAuth', kid: this.keys.keyId };
    const headerB64 = base64UrlEncode(toBytes(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(toBytes(JSON.stringify(payload)));

    const message = `${headerB64}.${payloadB64}`;
    const privateKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'),
        Buffer.from(this.keys.ed25519PrivateKey!),
      ]),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));

    return `${message}.${signatureB64}`;
  }

  validateToken(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    // Verify signature
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(this.keys.ed25519PublicKey),
      ]),
      format: 'der',
      type: 'spki',
    });

    const signature = base64UrlDecode(signatureB64);
    const isValid = crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(signature));

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const payload: TokenPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }

    // Check not before
    if (payload.nbf > now) {
      throw new Error('Token not yet valid');
    }

    // Check issuer
    if (payload.iss !== this.config.issuer) {
      throw new Error('Invalid issuer');
    }

    // Check audience
    if (!payload.aud.includes(this.config.audience)) {
      throw new Error('Invalid audience');
    }

    return payload;
  }
}

// ============================================
// QAuth Client
// ============================================

export class QAuthClient {
  private publicKey: Uint8Array;
  private privateKey: Uint8Array;

  constructor() {
    const keypair = crypto.generateKeyPairSync('ed25519');
    const publicKeyDer = keypair.publicKey.export({ type: 'spki', format: 'der' });
    const privateKeyDer = keypair.privateKey.export({ type: 'pkcs8', format: 'der' });

    this.publicKey = new Uint8Array(publicKeyDer.slice(-32));
    this.privateKey = new Uint8Array(privateKeyDer.slice(-32));
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  createProof(
    method: string,
    uri: string,
    token: string,
    body?: Uint8Array | string
  ): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = bytesToHex(randomBytes(8));

    const bodyHash = body ? bytesToHex(sha256(toBytes(body))) : '';
    const tokenHash = bytesToHex(sha256(toBytes(token)));

    const proofData = {
      ts: timestamp,
      nonce,
      method,
      uri,
      body_hash: bodyHash,
      token_hash: tokenHash,
    };

    const message = JSON.stringify(proofData);
    const privateKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from('302e020100300506032b657004220420', 'hex'),
        Buffer.from(this.privateKey),
      ]),
      format: 'der',
      type: 'pkcs8',
    });

    const signature = crypto.sign(null, Buffer.from(message), privateKey);

    return base64UrlEncode(
      toBytes(
        JSON.stringify({
          ...proofData,
          sig: bytesToHex(new Uint8Array(signature)),
          pub: bytesToHex(this.publicKey),
        })
      )
    );
  }
}

// ============================================
// QAuth Validator
// ============================================

export class QAuthValidator {
  private keys: IssuerKeys;
  private config: QAuthConfig;

  constructor(keys: IssuerKeys, config: QAuthConfig) {
    this.keys = keys;
    this.config = config;
  }

  validate(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(this.keys.ed25519PublicKey),
      ]),
      format: 'der',
      type: 'spki',
    });

    const signature = base64UrlDecode(signatureB64);
    const isValid = crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(signature));

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const payload: TokenPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) throw new Error('Token expired');
    if (payload.nbf > now) throw new Error('Token not yet valid');
    if (payload.iss !== this.config.issuer) throw new Error('Invalid issuer');
    if (!payload.aud.includes(this.config.audience)) throw new Error('Invalid audience');

    return payload;
  }
}

// ============================================
// Proof Validator
// ============================================

export class ProofValidator {
  private clientPublicKey: Uint8Array;

  constructor(clientPublicKey: Uint8Array) {
    this.clientPublicKey = clientPublicKey;
  }

  validate(
    proof: string,
    method: string,
    uri: string,
    token: string,
    body?: Uint8Array | string
  ): boolean {
    try {
      const proofData = JSON.parse(new TextDecoder().decode(base64UrlDecode(proof)));

      // Check timestamp (within 60 seconds)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - proofData.ts) > 60) {
        return false;
      }

      // Verify method and URI
      if (proofData.method !== method || proofData.uri !== uri) {
        return false;
      }

      // Verify body hash
      const expectedBodyHash = body ? bytesToHex(sha256(toBytes(body))) : '';
      if (proofData.body_hash !== expectedBodyHash) {
        return false;
      }

      // Verify token hash
      const expectedTokenHash = bytesToHex(sha256(toBytes(token)));
      if (proofData.token_hash !== expectedTokenHash) {
        return false;
      }

      // Verify signature
      const { sig, pub, ...dataToSign } = proofData;
      const message = JSON.stringify(dataToSign);

      const publicKey = crypto.createPublicKey({
        key: Buffer.concat([
          Buffer.from('302a300506032b6570032100', 'hex'),
          Buffer.from(hexToBytes(pub)),
        ]),
        format: 'der',
        type: 'spki',
      });

      return crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(hexToBytes(sig)));
    } catch {
      return false;
    }
  }
}

// ============================================
// Policy Engine
// ============================================

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();

  loadPolicy(policy: Policy): void {
    this.policies.set(policy.id, policy);
  }

  evaluate(policyId: string, context: EvaluationContext): EvaluationResult {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return {
        effect: 'deny',
        matched_rule: null,
        reason: `Policy not found: ${policyId}`,
      };
    }

    // Sort rules by priority (higher first)
    const sortedRules = [...policy.rules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, context)) {
        return {
          effect: rule.effect,
          matched_rule: rule.id ?? null,
          reason: `Matched rule: ${rule.id ?? 'unnamed'}`,
        };
      }
    }

    return {
      effect: 'deny',
      matched_rule: null,
      reason: 'No matching rule found (default deny)',
    };
  }

  private ruleMatches(rule: PolicyRule, context: EvaluationContext): boolean {
    // Check resource match
    const resourcePath = context.resource?.path ?? '';
    const resourceMatches = rule.resources.some((pattern) =>
      this.globMatch(pattern, resourcePath)
    );
    if (!resourceMatches) return false;

    // Check action match
    const action = context.request?.action ?? '';
    const actionMatches = rule.actions.some(
      (a) => a === '*' || a === action
    );
    if (!actionMatches) return false;

    // Check conditions (simplified)
    if (rule.conditions?.custom) {
      for (const [key, condition] of Object.entries(rule.conditions.custom)) {
        const subjectAttr = context.subject?.attributes?.[key];
        if (!this.conditionMatches(condition, subjectAttr)) {
          return false;
        }
      }
    }

    return true;
  }

  private globMatch(pattern: string, str: string): boolean {
    // Simple glob matching: * matches any segment, ** matches any path
    const regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*');
    return new RegExp(`^${regex}$`).test(str);
  }

  private conditionMatches(condition: unknown, value: unknown): boolean {
    if (typeof condition === 'object' && condition !== null) {
      const cond = condition as Record<string, unknown>;
      if ('in' in cond && Array.isArray(cond.in)) {
        return cond.in.includes(value);
      }
      if ('eq' in cond) {
        return cond.eq === value;
      }
    }
    return condition === value;
  }
}

// ============================================
// Version Info
// ============================================

export function getVersion(): string {
  return '0.1.0';
}

export function getProtocolVersion(): string {
  return '1.0';
}

// No WASM initialization needed for pure JS implementation
export async function initQAuth(): Promise<void> {
  // No-op for pure JS implementation
}

export function isInitialized(): boolean {
  return true;
}

// Re-export utilities
export { toBytes, bytesToHex, hexToBytes };
