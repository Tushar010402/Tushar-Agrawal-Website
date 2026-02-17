/**
 * QuantumShield Node.js SDK — Type Definitions
 *
 * Shared types for both the WASM-backed and pure Node.js crypto implementations.
 */

// ============================================================================
// Cipher Types
// ============================================================================

/** Options for creating a cipher from a password. */
export interface CipherPasswordOptions {
  /** The password to derive keys from. */
  password: string;
  /** Whether to enable length-hiding padding (default: true). */
  enablePadding?: boolean;
}

/** Options for creating a cipher from raw key bytes. */
export interface CipherBytesOptions {
  /** Raw secret key material. */
  secret: Uint8Array;
}

/** Result of an encryption operation with associated data. */
export interface EncryptResult {
  /** The ciphertext including version header and nonces. */
  ciphertext: Uint8Array;
}

// ============================================================================
// Key Exchange Types
// ============================================================================

/** A public/private keypair for key exchange. */
export interface KeyPair {
  /** The public key bytes. */
  publicKey: Uint8Array;
  /** The private key bytes (secret). */
  privateKey: Uint8Array;
}

/** Result of a Diffie-Hellman key exchange. */
export interface KeyExchangeResult {
  /** The derived shared secret. */
  sharedSecret: Uint8Array;
}

// ============================================================================
// KDF Types
// ============================================================================

/** Options for HKDF key derivation. */
export interface HkdfOptions {
  /** The input keying material. */
  ikm: Uint8Array;
  /** Optional salt (recommended). */
  salt?: Uint8Array;
  /** Optional info/context string. */
  info?: string | Uint8Array;
  /** Desired output key length in bytes (default: 64). */
  length?: number;
  /** Hash algorithm (default: 'sha512'). */
  hash?: 'sha256' | 'sha384' | 'sha512';
}

/** Options for scrypt-based key derivation (Argon2id fallback). */
export interface ScryptKdfOptions {
  /** The password to derive a key from. */
  password: string | Uint8Array;
  /** Salt for the derivation (generated if not provided). */
  salt?: Uint8Array;
  /** Desired key length in bytes (default: 64). */
  keyLength?: number;
  /** CPU/memory cost parameter (default: 16384). */
  cost?: number;
  /** Block size (default: 8). */
  blockSize?: number;
  /** Parallelization (default: 1). */
  parallelization?: number;
}

/** Result of a key derivation operation. */
export interface KdfResult {
  /** The derived key bytes. */
  key: Uint8Array;
  /** The salt used (useful if it was generated). */
  salt: Uint8Array;
}

// ============================================================================
// Session Types
// ============================================================================

/** Options for creating a ratcheting session. */
export interface SessionOptions {
  /** The shared secret to initialize the session from. */
  sharedSecret: Uint8Array;
}

// ============================================================================
// Cascading Cipher Types
// ============================================================================

/** The two cipher algorithms used in cascading encryption. */
export type CascadingAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305';

/** Wire format version byte. */
export const VERSION_BYTE = 0x05;

/** Nonce size in bytes (12 bytes for both AES-GCM and ChaCha20-Poly1305). */
export const NONCE_SIZE = 12;

/** Header size: 1 (version) + 12 (AES nonce) + 12 (ChaCha nonce). */
export const HEADER_SIZE = 1 + NONCE_SIZE + NONCE_SIZE;

/** AES-GCM authentication tag size in bytes. */
export const AES_TAG_SIZE = 16;

/** ChaCha20-Poly1305 authentication tag size in bytes. */
export const CHACHA_TAG_SIZE = 16;

/** Minimum padding bytes for length hiding. */
export const MIN_PADDING = 16;

/** Padding block alignment size. */
export const PADDING_BLOCK_SIZE = 64;

// ============================================================================
// Error Types
// ============================================================================

/** Error thrown by QuantumShield operations. */
export class QShieldError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'QShieldError';
  }
}

// ============================================================================
// Interface Contracts
// ============================================================================

/** Interface for symmetric encryption operations. */
export interface ICipher {
  encrypt(plaintext: Uint8Array): Uint8Array;
  decrypt(ciphertext: Uint8Array): Uint8Array;
  encryptString(plaintext: string): string;
  decryptString(ciphertextB64: string): string;
  encryptWithAad(plaintext: Uint8Array, aad: Uint8Array): Uint8Array;
  decryptWithAad(ciphertext: Uint8Array, aad: Uint8Array): Uint8Array;
}

/** Interface for key exchange operations. */
export interface IKeyExchange {
  readonly publicKey: Uint8Array;
  readonly publicKeyBase64: string;
  deriveSharedSecret(peerPublicKey: Uint8Array): Uint8Array;
}

/** Interface for forward-secrecy sessions. */
export interface ISession {
  encrypt(plaintext: Uint8Array): Uint8Array;
  decrypt(ciphertext: Uint8Array): Uint8Array;
  readonly messageCount: number;
}
