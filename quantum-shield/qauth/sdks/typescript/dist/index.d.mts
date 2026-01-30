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
interface QAuthConfig {
    issuer: string;
    audience: string;
}
interface TokenOptions {
    subject: string | Uint8Array;
    policyRef: string;
    audience?: string | string[];
    validitySeconds?: number;
    clientKey?: Uint8Array;
    deviceKey?: Uint8Array;
    claims?: Record<string, unknown>;
}
interface TokenPayload {
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
interface PolicyRule {
    id?: string;
    effect: 'allow' | 'deny';
    resources: string[];
    actions: string[];
    conditions?: PolicyConditions;
    priority?: number;
}
interface PolicyConditions {
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
interface Policy {
    id: string;
    version: string;
    issuer: string;
    name?: string;
    description?: string;
    rules: PolicyRule[];
}
interface EvaluationContext {
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
interface EvaluationResult {
    effect: 'allow' | 'deny';
    matched_rule: string | null;
    reason: string;
}
interface IssuerKeys {
    keyId: string;
    ed25519PublicKey: Uint8Array;
    ed25519PrivateKey?: Uint8Array;
    encryptionKey: Uint8Array;
}
declare function toBytes(data: string | Uint8Array): Uint8Array;
declare function bytesToHex(bytes: Uint8Array): string;
declare function hexToBytes(hex: string): Uint8Array;
declare class QAuthServer {
    private config;
    private keys;
    constructor(config: QAuthConfig);
    getPublicKeys(): IssuerKeys;
    createToken(options: TokenOptions): string;
    validateToken(token: string): TokenPayload;
}
declare class QAuthClient {
    private publicKey;
    private privateKey;
    constructor();
    getPublicKey(): Uint8Array;
    createProof(method: string, uri: string, token: string, body?: Uint8Array | string): string;
}
declare class QAuthValidator {
    private keys;
    private config;
    constructor(keys: IssuerKeys, config: QAuthConfig);
    validate(token: string): TokenPayload;
}
declare class ProofValidator {
    private clientPublicKey;
    constructor(clientPublicKey: Uint8Array);
    validate(proof: string, method: string, uri: string, token: string, body?: Uint8Array | string): boolean;
}
declare class PolicyEngine {
    private policies;
    loadPolicy(policy: Policy): void;
    evaluate(policyId: string, context: EvaluationContext): EvaluationResult;
    private ruleMatches;
    private globMatch;
    private conditionMatches;
}
declare function getVersion(): string;
declare function getProtocolVersion(): string;
declare function initQAuth(): Promise<void>;
declare function isInitialized(): boolean;

export { type EvaluationContext, type EvaluationResult, type IssuerKeys, type Policy, type PolicyConditions, PolicyEngine, type PolicyRule, ProofValidator, QAuthClient, type QAuthConfig, QAuthServer, QAuthValidator, type TokenOptions, type TokenPayload, bytesToHex, getProtocolVersion, getVersion, hexToBytes, initQAuth, isInitialized, toBytes };
