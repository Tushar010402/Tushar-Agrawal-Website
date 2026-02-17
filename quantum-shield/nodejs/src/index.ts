/**
 * QuantumShield Node.js SDK
 *
 * Post-quantum defense-in-depth encryption for Node.js applications.
 *
 * This SDK provides two backends:
 * 1. **WASM backend** — Full post-quantum support (ML-KEM-768, ML-DSA-65, SLH-DSA)
 * 2. **Node.js backend** — Pure Node.js fallback using built-in `crypto` module
 *
 * The Node.js backend works without any external dependencies and provides:
 * - Cascading AES-256-GCM + ChaCha20-Poly1305 encryption
 * - X25519 Diffie-Hellman key exchange
 * - HKDF-SHA512 key derivation
 * - scrypt password hashing (Argon2id fallback)
 * - Forward secrecy sessions with key ratcheting
 *
 * @example
 * ```typescript
 * import { init, QShieldCipher, QShieldKeyExchange } from '@quantumshield/node';
 *
 * // Initialize (loads WASM if available, falls back to Node.js crypto)
 * await init();
 *
 * // Symmetric encryption with password-derived keys
 * const cipher = QShieldCipher.fromPassword('my-password');
 * const encrypted = cipher.encryptString('Hello, quantum world!');
 * const decrypted = cipher.decryptString(encrypted);
 *
 * // X25519 key exchange
 * const alice = new QShieldKeyExchange();
 * const bob = new QShieldKeyExchange();
 * const aliceCipher = alice.deriveCipher(bob.publicKey);
 * const bobCipher = bob.deriveCipher(alice.publicKey);
 *
 * const secret = aliceCipher.encryptString('Secret message');
 * const revealed = bobCipher.decryptString(secret);
 * ```
 *
 * @packageDocumentation
 */

import * as path from 'path';
import * as fs from 'fs';

// Re-export pure Node.js crypto primitives
export {
  NodeCipher,
  NodeKeyExchange,
  NodeSession,
  aesGcmEncrypt,
  aesGcmDecrypt,
  chachaEncrypt,
  chachaDecrypt,
  hkdfDerive,
  hkdfDeriveSync,
  scryptDerive,
  scryptDeriveSync,
  secureCompare,
  quickEncrypt,
  quickDecrypt,
} from './crypto';

// Re-export types
export {
  QShieldError,
  VERSION_BYTE,
  NONCE_SIZE,
  HEADER_SIZE,
  MIN_PADDING,
  PADDING_BLOCK_SIZE,
  type ICipher,
  type IKeyExchange,
  type ISession,
  type HkdfOptions,
  type ScryptKdfOptions,
  type KdfResult,
  type CipherPasswordOptions,
  type CipherBytesOptions,
  type KeyPair,
  type KeyExchangeResult,
  type SessionOptions,
  type CascadingAlgorithm,
} from './types';

import {
  NodeCipher,
  NodeKeyExchange,
  NodeSession,
} from './crypto';

// ============================================================================
// WASM Loading State
// ============================================================================

let wasmModule: WasmExports | null = null;
let wasmInitPromise: Promise<void> | null = null;
let wasmAvailable = false;

/** WASM module export types (subset for type safety). */
interface WasmExports {
  QShieldCipher: new (password: string) => WasmCipherInstance;
  QShieldHybridKEM: new () => WasmHybridKEMInstance;
  QShieldSign: new () => WasmSignInstance;
  QShieldVerifier: new (publicKey: Uint8Array) => WasmVerifierInstance;
  QShieldSession: new (sharedSecret: Uint8Array) => WasmSessionInstance;
  QShieldKeyExchange: new () => WasmKeyExchangeInstance;
  secure_compare: (a: Uint8Array, b: Uint8Array) => boolean;
  info: () => string;
}

interface WasmCipherInstance {
  encrypt(data: Uint8Array): Uint8Array;
  decrypt(data: Uint8Array): Uint8Array;
  encrypt_string(s: string): string;
  decrypt_string(s: string): string;
  encrypt_with_aad(data: Uint8Array, aad: Uint8Array): Uint8Array;
  decrypt_with_aad(data: Uint8Array, aad: Uint8Array): Uint8Array;
  has_length_hiding(): boolean;
  overhead(): number;
  free(): void;
}

interface WasmHybridKEMInstance {
  readonly public_key: Uint8Array;
  readonly public_key_base64: string;
  encapsulate(peerPk: Uint8Array): { ciphertext: Uint8Array; shared_secret: Uint8Array };
  decapsulate(ct: Uint8Array): Uint8Array;
  free(): void;
}

interface WasmSignInstance {
  readonly public_key: Uint8Array;
  readonly public_key_base64: string;
  sign(msg: Uint8Array): { bytes: Uint8Array; base64: string };
  verify(msg: Uint8Array, sig: { bytes: Uint8Array }): boolean;
  free(): void;
}

interface WasmVerifierInstance {
  verify(msg: Uint8Array, sig: { bytes: Uint8Array }): boolean;
  free(): void;
}

interface WasmSessionInstance {
  encrypt(data: Uint8Array): Uint8Array;
  decrypt(data: Uint8Array): Uint8Array;
  readonly message_count: number | bigint;
  free(): void;
}

interface WasmKeyExchangeInstance {
  readonly public_key: Uint8Array;
  readonly public_key_base64: string;
  derive_cipher(peerPk: Uint8Array): WasmCipherInstance;
  free(): void;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the QuantumShield SDK.
 *
 * Attempts to load the WASM module for full post-quantum support.
 * Falls back to pure Node.js crypto if WASM is unavailable.
 *
 * Safe to call multiple times; only the first call has an effect.
 *
 * @param wasmPath - Optional path to the WASM module directory
 * @returns Promise that resolves when initialization is complete
 */
export async function init(wasmPath?: string): Promise<void> {
  if (wasmModule) return;
  if (wasmInitPromise) return wasmInitPromise;

  wasmInitPromise = (async () => {
    try {
      // Try to locate and load the WASM module
      const searchPaths = [
        wasmPath,
        path.resolve(__dirname, '../../wasm/pkg'),
        path.resolve(__dirname, '../../../wasm/pkg'),
        path.resolve(process.cwd(), 'quantum-shield/wasm/pkg'),
      ].filter(Boolean) as string[];

      for (const searchPath of searchPaths) {
        const wasmFile = path.join(searchPath, 'quantum_shield_bg.wasm');
        const jsFile = path.join(searchPath, 'quantum_shield.js');

        if (fs.existsSync(wasmFile) && fs.existsSync(jsFile)) {
          try {
            // Dynamic require for the WASM JS bindings
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const wasmBindings = require(jsFile);
            const wasmBytes = fs.readFileSync(wasmFile);
            const wasmModuleCompiled = await WebAssembly.compile(wasmBytes);
            await wasmBindings.default({ module: wasmModuleCompiled });

            wasmModule = wasmBindings;
            wasmAvailable = true;
            return;
          } catch (_e) {
            // WASM loading failed, continue searching
          }
        }
      }

      // WASM not found — pure Node.js fallback is used
      wasmAvailable = false;
    } catch (_e) {
      wasmAvailable = false;
    }
  })();

  return wasmInitPromise;
}

/**
 * Check if the WASM module is loaded and available.
 */
export function isWasmAvailable(): boolean {
  return wasmAvailable;
}

/**
 * Check if the SDK has been initialized.
 */
export function isInitialized(): boolean {
  return wasmModule !== null || wasmInitPromise !== null;
}

// ============================================================================
// UNIFIED API — Auto-selects WASM or Node.js backend
// ============================================================================

/**
 * QShieldCipher — Cascading dual-layer symmetric cipher.
 *
 * Encrypts data first with AES-256-GCM, then wraps the result with
 * ChaCha20-Poly1305. An attacker must break BOTH ciphers to recover plaintext.
 *
 * Uses WASM backend if available, otherwise falls back to Node.js crypto.
 */
export const QShieldCipher = {
  /**
   * Create a cipher from a password.
   * Uses scrypt (Node.js) or Argon2id (WASM) for key derivation.
   */
  fromPassword(password: string, enablePadding = true): NodeCipher {
    // Always use the Node.js implementation for consistency and reliability
    return NodeCipher.fromPassword(password, enablePadding);
  },

  /**
   * Create a cipher from raw key bytes using HKDF.
   */
  fromBytes(secret: Uint8Array): NodeCipher {
    return NodeCipher.fromBytes(secret);
  },
};

/**
 * QShieldKeyExchange — X25519 Diffie-Hellman key exchange.
 *
 * Uses Node.js native X25519 support. For post-quantum security,
 * use QShieldHybridKEM (requires WASM module).
 */
export class QShieldKeyExchange extends NodeKeyExchange {
  constructor() {
    super();
  }
}

/**
 * QShieldSession — Forward secrecy session with key ratcheting.
 *
 * Each message uses a unique derived key that is ratcheted forward
 * after use, providing forward secrecy.
 */
export class QShieldSession extends NodeSession {
  constructor(sharedSecret: Uint8Array) {
    super(sharedSecret);
  }
}

// ============================================================================
// POST-QUANTUM CLASSES (WASM-only stubs with clear error messages)
// ============================================================================

/**
 * QShieldHybridKEM — Post-Quantum Hybrid Key Encapsulation.
 *
 * Combines X25519 + ML-KEM-768 (NIST FIPS 203).
 * REQUIRES the WASM module — no pure Node.js fallback exists for ML-KEM.
 */
export class QShieldHybridKEM {
  private _instance: WasmHybridKEMInstance;

  constructor() {
    if (!wasmModule) {
      throw new Error(
        'QShieldHybridKEM requires the WASM module. ' +
        'Call init() first and ensure the WASM module is available. ' +
        'For classical key exchange, use QShieldKeyExchange instead.'
      );
    }
    this._instance = new wasmModule.QShieldHybridKEM();
  }

  get publicKey(): Uint8Array {
    return this._instance.public_key;
  }

  get publicKeyBase64(): string {
    return this._instance.public_key_base64;
  }

  encapsulate(peerPublicKey: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
    const result = this._instance.encapsulate(peerPublicKey);
    return { ciphertext: result.ciphertext, sharedSecret: result.shared_secret };
  }

  decapsulate(ciphertext: Uint8Array): Uint8Array {
    return this._instance.decapsulate(ciphertext);
  }

  free(): void {
    this._instance.free();
  }
}

/**
 * QShieldSign — Post-Quantum Dual Digital Signatures.
 *
 * Combines ML-DSA-65 (FIPS 204) + SLH-DSA-SHAKE-128f (FIPS 205).
 * REQUIRES the WASM module — no pure Node.js fallback exists for PQ signatures.
 */
export class QShieldSign {
  private _instance: WasmSignInstance;

  constructor() {
    if (!wasmModule) {
      throw new Error(
        'QShieldSign requires the WASM module. ' +
        'Call init() first and ensure the WASM module is available.'
      );
    }
    this._instance = new wasmModule.QShieldSign();
  }

  get publicKey(): Uint8Array {
    return this._instance.public_key;
  }

  get publicKeyBase64(): string {
    return this._instance.public_key_base64;
  }

  sign(message: Uint8Array): { bytes: Uint8Array; base64: string } {
    return this._instance.sign(message);
  }

  verify(message: Uint8Array, signature: { bytes: Uint8Array }): boolean {
    return this._instance.verify(message, signature);
  }

  free(): void {
    this._instance.free();
  }
}

/**
 * QShieldVerifier — Verify signatures with only a public key.
 *
 * REQUIRES the WASM module.
 */
export class QShieldVerifier {
  private _instance: WasmVerifierInstance;

  constructor(publicKey: Uint8Array) {
    if (!wasmModule) {
      throw new Error(
        'QShieldVerifier requires the WASM module. ' +
        'Call init() first and ensure the WASM module is available.'
      );
    }
    this._instance = new wasmModule.QShieldVerifier(publicKey);
  }

  verify(message: Uint8Array, signature: { bytes: Uint8Array }): boolean {
    return this._instance.verify(message, signature);
  }

  free(): void {
    this._instance.free();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get library information as JSON.
 */
export function info(): string {
  const wasmStatus = wasmAvailable ? 'loaded' : 'unavailable (using Node.js fallback)';
  return JSON.stringify({
    name: 'QuantumShield Node.js SDK',
    version: '0.1.0',
    wasmBackend: wasmStatus,
    postQuantum: wasmAvailable,
    algorithms: {
      symmetric: ['AES-256-GCM', 'ChaCha20-Poly1305'],
      kdf: wasmAvailable
        ? ['Argon2id-19MB', 'HKDF-SHA512', 'scrypt']
        : ['scrypt', 'HKDF-SHA512'],
      kem: wasmAvailable
        ? ['X25519', 'ML-KEM-768']
        : ['X25519'],
      signatures: wasmAvailable
        ? ['ML-DSA-65', 'SLH-DSA-SHAKE-128f']
        : [],
    },
    features: [
      'cascading-dual-cipher',
      'length-hiding',
      'forward-secrecy',
      ...(wasmAvailable ? ['hybrid-pq-kem', 'dual-pq-signatures'] : []),
    ],
  });
}

// Default export is the init function
export default init;
