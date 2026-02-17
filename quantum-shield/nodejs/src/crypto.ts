/**
 * QuantumShield Node.js SDK — Pure Node.js Crypto Implementation
 *
 * Provides production-ready cryptographic operations using only Node.js
 * built-in `crypto` module. Works WITHOUT the WASM module as a complete
 * fallback for symmetric encryption, key exchange, and key derivation.
 *
 * Algorithms:
 * - AES-256-GCM (NIST approved, quantum-safe at 128-bit security)
 * - ChaCha20-Poly1305 (IETF RFC 8439, quantum-safe at 128-bit security)
 * - X25519 Diffie-Hellman key exchange (RFC 7748)
 * - Cascading dual-cipher: AES-256-GCM then ChaCha20-Poly1305
 * - HKDF-SHA512 key derivation (RFC 5869)
 * - scrypt password hashing (Argon2id fallback)
 */

import * as crypto from 'crypto';
import {
  VERSION_BYTE,
  NONCE_SIZE,
  HEADER_SIZE,
  MIN_PADDING,
  PADDING_BLOCK_SIZE,
  QShieldError,
  type ICipher,
  type IKeyExchange,
  type ISession,
  type HkdfOptions,
  type ScryptKdfOptions,
  type KdfResult,
} from './types';

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/** Generate cryptographically secure random bytes. */
function randomBytes(size: number): Uint8Array {
  return new Uint8Array(crypto.randomBytes(size));
}

/** Encode Uint8Array to base64 string. */
function toBase64(data: Uint8Array): string {
  return Buffer.from(data).toString('base64');
}

/** Decode base64 string to Uint8Array. */
function fromBase64(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** Constant-time comparison of two buffers. */
export function secureCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================================================
// AES-256-GCM
// ============================================================================

/**
 * Encrypt data with AES-256-GCM.
 *
 * @param key - 32-byte encryption key
 * @param plaintext - Data to encrypt
 * @param aad - Optional additional authenticated data
 * @returns Concatenated [nonce (12) | ciphertext | tag (16)]
 */
export function aesGcmEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new QShieldError('AES-256-GCM requires a 32-byte key', 'INVALID_KEY');
  }

  const nonce = randomBytes(NONCE_SIZE);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(key),
    Buffer.from(nonce)
  );

  if (aad && aad.length > 0) {
    cipher.setAAD(Buffer.from(aad));
  }

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // [nonce | ciphertext | tag]
  const result = new Uint8Array(NONCE_SIZE + encrypted.length + tag.length);
  result.set(nonce, 0);
  result.set(new Uint8Array(encrypted), NONCE_SIZE);
  result.set(new Uint8Array(tag), NONCE_SIZE + encrypted.length);

  return result;
}

/**
 * Decrypt data with AES-256-GCM.
 *
 * @param key - 32-byte decryption key
 * @param ciphertext - Concatenated [nonce (12) | ciphertext | tag (16)]
 * @param aad - Optional additional authenticated data (must match encryption)
 * @returns Decrypted plaintext
 */
export function aesGcmDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new QShieldError('AES-256-GCM requires a 32-byte key', 'INVALID_KEY');
  }

  if (ciphertext.length < NONCE_SIZE + 16) {
    throw new QShieldError('Ciphertext too short for AES-256-GCM', 'INVALID_CIPHERTEXT');
  }

  const nonce = ciphertext.slice(0, NONCE_SIZE);
  const tag = ciphertext.slice(ciphertext.length - 16);
  const encrypted = ciphertext.slice(NONCE_SIZE, ciphertext.length - 16);

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key),
    Buffer.from(nonce)
  );

  decipher.setAuthTag(Buffer.from(tag));

  if (aad && aad.length > 0) {
    decipher.setAAD(Buffer.from(aad));
  }

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted)),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

// ============================================================================
// ChaCha20-Poly1305
// ============================================================================

/**
 * Encrypt data with ChaCha20-Poly1305 (IETF RFC 8439).
 *
 * @param key - 32-byte encryption key
 * @param plaintext - Data to encrypt
 * @param aad - Optional additional authenticated data
 * @returns Concatenated [nonce (12) | ciphertext | tag (16)]
 */
export function chachaEncrypt(
  key: Uint8Array,
  plaintext: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new QShieldError('ChaCha20-Poly1305 requires a 32-byte key', 'INVALID_KEY');
  }

  const nonce = randomBytes(NONCE_SIZE);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cipher = (crypto as any).createCipheriv(
    'chacha20-poly1305',
    Buffer.from(key),
    Buffer.from(nonce),
    { authTagLength: 16 }
  ) as crypto.CipherGCM;

  if (aad && aad.length > 0) {
    cipher.setAAD(Buffer.from(aad));
  }

  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // [nonce | ciphertext | tag]
  const result = new Uint8Array(NONCE_SIZE + encrypted.length + tag.length);
  result.set(nonce, 0);
  result.set(new Uint8Array(encrypted), NONCE_SIZE);
  result.set(new Uint8Array(tag), NONCE_SIZE + encrypted.length);

  return result;
}

/**
 * Decrypt data with ChaCha20-Poly1305 (IETF RFC 8439).
 *
 * @param key - 32-byte decryption key
 * @param ciphertext - Concatenated [nonce (12) | ciphertext | tag (16)]
 * @param aad - Optional additional authenticated data (must match encryption)
 * @returns Decrypted plaintext
 */
export function chachaDecrypt(
  key: Uint8Array,
  ciphertext: Uint8Array,
  aad?: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new QShieldError('ChaCha20-Poly1305 requires a 32-byte key', 'INVALID_KEY');
  }

  if (ciphertext.length < NONCE_SIZE + 16) {
    throw new QShieldError('Ciphertext too short for ChaCha20-Poly1305', 'INVALID_CIPHERTEXT');
  }

  const nonce = ciphertext.slice(0, NONCE_SIZE);
  const tag = ciphertext.slice(ciphertext.length - 16);
  const encrypted = ciphertext.slice(NONCE_SIZE, ciphertext.length - 16);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const decipher = (crypto as any).createDecipheriv(
    'chacha20-poly1305',
    Buffer.from(key),
    Buffer.from(nonce),
    { authTagLength: 16 }
  ) as crypto.DecipherGCM;

  decipher.setAuthTag(Buffer.from(tag));

  if (aad && aad.length > 0) {
    decipher.setAAD(Buffer.from(aad));
  }

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted)),
    decipher.final(),
  ]);

  return new Uint8Array(decrypted);
}

// ============================================================================
// HKDF-SHA512 KEY DERIVATION
// ============================================================================

/**
 * Derive keys using HKDF (RFC 5869) with SHA-512.
 *
 * @param options - HKDF configuration
 * @returns Promise resolving to the derived key material
 */
export function hkdfDerive(options: HkdfOptions): Promise<Uint8Array> {
  const {
    ikm,
    salt = new Uint8Array(0),
    info = '',
    length = 64,
    hash = 'sha512',
  } = options;

  const infoBytes = typeof info === 'string'
    ? new TextEncoder().encode(info)
    : info;

  return new Promise<Uint8Array>((resolve, reject) => {
    crypto.hkdf(
      hash,
      Buffer.from(ikm),
      Buffer.from(salt),
      Buffer.from(infoBytes),
      length,
      (err, derivedKey) => {
        if (err) {
          reject(new QShieldError(`HKDF derivation failed: ${err.message}`, 'HKDF_FAILED'));
        } else {
          resolve(new Uint8Array(derivedKey));
        }
      }
    );
  });
}

/**
 * Synchronous HKDF derivation using Node.js crypto.hkdfSync.
 */
export function hkdfDeriveSync(options: HkdfOptions): Uint8Array {
  const {
    ikm,
    salt = new Uint8Array(0),
    info = '',
    length = 64,
    hash = 'sha512',
  } = options;

  const infoBytes = typeof info === 'string'
    ? new TextEncoder().encode(info)
    : info;

  const derived = crypto.hkdfSync(
    hash,
    Buffer.from(ikm),
    Buffer.from(salt),
    Buffer.from(infoBytes),
    length
  );

  return new Uint8Array(derived);
}

// ============================================================================
// SCRYPT KEY DERIVATION (Argon2id fallback)
// ============================================================================

/**
 * Derive a key from a password using scrypt.
 *
 * This serves as a fallback for Argon2id when the WASM module is unavailable.
 * scrypt is memory-hard like Argon2id, providing GPU/ASIC resistance.
 *
 * @param options - scrypt configuration
 * @returns Promise resolving to the derived key and salt
 */
export function scryptDerive(options: ScryptKdfOptions): Promise<KdfResult> {
  const {
    password,
    salt = randomBytes(16),
    keyLength = 64,
    cost = 16384,
    blockSize = 8,
    parallelization = 1,
  } = options;

  const passwordBuf = typeof password === 'string'
    ? Buffer.from(password, 'utf-8')
    : Buffer.from(password);

  return new Promise<KdfResult>((resolve, reject) => {
    crypto.scrypt(
      passwordBuf,
      Buffer.from(salt),
      keyLength,
      { N: cost, r: blockSize, p: parallelization },
      (err, derivedKey) => {
        if (err) {
          reject(new QShieldError(`scrypt derivation failed: ${err.message}`, 'SCRYPT_FAILED'));
        } else {
          resolve({
            key: new Uint8Array(derivedKey),
            salt: new Uint8Array(salt),
          });
        }
      }
    );
  });
}

/**
 * Synchronous scrypt key derivation.
 */
export function scryptDeriveSync(options: ScryptKdfOptions): KdfResult {
  const {
    password,
    salt = randomBytes(16),
    keyLength = 64,
    cost = 16384,
    blockSize = 8,
    parallelization = 1,
  } = options;

  const passwordBuf = typeof password === 'string'
    ? Buffer.from(password, 'utf-8')
    : Buffer.from(password);

  const derivedKey = crypto.scryptSync(
    passwordBuf,
    Buffer.from(salt),
    keyLength,
    { N: cost, r: blockSize, p: parallelization }
  );

  return {
    key: new Uint8Array(derivedKey),
    salt: new Uint8Array(salt),
  };
}

// ============================================================================
// X25519 KEY EXCHANGE
// ============================================================================

/**
 * Classical X25519 Diffie-Hellman key exchange.
 *
 * Uses Node.js native X25519 support (available since Node.js 18).
 * For post-quantum security, use QShieldHybridKEM from the WASM module.
 */
export class NodeKeyExchange implements IKeyExchange {
  private readonly _privateKey: crypto.KeyObject;
  private readonly _publicKey: crypto.KeyObject;
  private readonly _publicKeyBytes: Uint8Array;

  constructor() {
    const keyPair = crypto.generateKeyPairSync('x25519');
    this._privateKey = keyPair.privateKey;
    this._publicKey = keyPair.publicKey;

    // Export raw public key bytes (32 bytes)
    const rawPub = this._publicKey.export({ type: 'spki', format: 'der' });
    // X25519 SPKI DER has a 12-byte header, raw key is last 32 bytes
    this._publicKeyBytes = new Uint8Array(rawPub.slice(rawPub.length - 32));
  }

  /** Get the raw 32-byte public key. */
  get publicKey(): Uint8Array {
    return new Uint8Array(this._publicKeyBytes);
  }

  /** Get the public key as base64. */
  get publicKeyBase64(): string {
    return toBase64(this._publicKeyBytes);
  }

  /**
   * Perform X25519 Diffie-Hellman with a peer's public key.
   *
   * @param peerPublicKey - The peer's 32-byte X25519 public key
   * @returns The 32-byte shared secret
   */
  deriveSharedSecret(peerPublicKey: Uint8Array): Uint8Array {
    if (peerPublicKey.length !== 32) {
      throw new QShieldError(
        `Invalid X25519 public key length: expected 32, got ${peerPublicKey.length}`,
        'INVALID_KEY'
      );
    }

    // Build SPKI DER for X25519 public key
    // Header: 30 2a 30 05 06 03 2b 65 6e 03 21 00
    const spkiHeader = Buffer.from([
      0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65,
      0x6e, 0x03, 0x21, 0x00,
    ]);
    const spkiDer = Buffer.concat([spkiHeader, Buffer.from(peerPublicKey)]);

    const peerKeyObject = crypto.createPublicKey({
      key: spkiDer,
      format: 'der',
      type: 'spki',
    });

    const sharedSecret = crypto.diffieHellman({
      publicKey: peerKeyObject,
      privateKey: this._privateKey,
    });

    return new Uint8Array(sharedSecret);
  }

  /**
   * Derive a QShieldCipher from a peer's public key.
   * Performs ECDH then uses HKDF to derive AES + ChaCha keys.
   */
  deriveCipher(peerPublicKey: Uint8Array): NodeCipher {
    const shared = this.deriveSharedSecret(peerPublicKey);
    return NodeCipher.fromBytes(shared);
  }
}

// ============================================================================
// CASCADING CIPHER — AES-256-GCM + ChaCha20-Poly1305
// ============================================================================

/**
 * Cascading dual-layer symmetric cipher using Node.js crypto.
 *
 * Encrypts data first with AES-256-GCM, then wraps the result with
 * ChaCha20-Poly1305. An attacker must break BOTH ciphers to recover plaintext.
 *
 * Wire format (compatible with WASM QShieldCipher):
 * ```
 * [version (1)] [aes_nonce (12)] [chacha_nonce (12)] [ciphertext]
 * ```
 *
 * The inner AES ciphertext includes its 16-byte auth tag.
 * The outer ChaCha ciphertext includes its 16-byte auth tag.
 */
export class NodeCipher implements ICipher {
  private readonly aesKey: Uint8Array;
  private readonly chachaKey: Uint8Array;
  private readonly enablePadding: boolean;

  private constructor(aesKey: Uint8Array, chachaKey: Uint8Array, enablePadding: boolean) {
    this.aesKey = aesKey;
    this.chachaKey = chachaKey;
    this.enablePadding = enablePadding;
  }

  /**
   * Create a cipher from a password using scrypt key derivation.
   *
   * Derives a deterministic salt via HKDF, then uses scrypt to produce
   * 64 bytes of key material (32 for AES, 32 for ChaCha).
   *
   * @param password - The password to derive keys from
   * @param enablePadding - Enable length-hiding padding (default: true)
   */
  static fromPassword(password: string, enablePadding = true): NodeCipher {
    // Derive a deterministic salt from the password (matching WASM behavior)
    const saltIkm = Buffer.from(password, 'utf-8');
    const salt = hkdfDeriveSync({
      ikm: new Uint8Array(saltIkm),
      info: 'QShield-salt-v4-pq',
      length: 16,
      hash: 'sha256',
    });

    // Use scrypt as Argon2id fallback: N=16384, r=8, p=1 is ~16MB memory
    const { key } = scryptDeriveSync({
      password,
      salt,
      keyLength: 64,
      cost: 16384,
      blockSize: 8,
      parallelization: 1,
    });

    const aesKey = key.slice(0, 32);
    const chachaKey = key.slice(32, 64);

    return new NodeCipher(aesKey, chachaKey, enablePadding);
  }

  /**
   * Create a cipher from raw key bytes using HKDF-SHA512.
   *
   * Derives two 32-byte keys (AES + ChaCha) from the input secret.
   *
   * @param secret - Raw secret bytes (any length)
   */
  static fromBytes(secret: Uint8Array): NodeCipher {
    const aesKey = hkdfDeriveSync({
      ikm: secret,
      salt: new TextEncoder().encode('QShield-v4-pq'),
      info: 'AES-256-GCM-layer',
      length: 32,
      hash: 'sha512',
    });

    const chachaKey = hkdfDeriveSync({
      ikm: secret,
      salt: new TextEncoder().encode('QShield-v4-pq'),
      info: 'ChaCha20-Poly1305-layer',
      length: 32,
      hash: 'sha512',
    });

    return new NodeCipher(aesKey, chachaKey, true);
  }

  /**
   * Encrypt data with cascading AES-256-GCM + ChaCha20-Poly1305.
   *
   * @param plaintext - Data to encrypt
   * @returns Wire-format ciphertext: [version][aes_nonce][chacha_nonce][ciphertext]
   */
  encrypt(plaintext: Uint8Array): Uint8Array {
    return this.encryptWithAad(plaintext, new Uint8Array(0));
  }

  /**
   * Decrypt cascading ciphertext.
   *
   * @param ciphertext - Wire-format ciphertext from encrypt()
   * @returns Original plaintext
   */
  decrypt(ciphertext: Uint8Array): Uint8Array {
    return this.decryptWithAad(ciphertext, new Uint8Array(0));
  }

  /**
   * Encrypt data with AAD (additional authenticated data).
   * AAD is authenticated but not encrypted.
   */
  encryptWithAad(plaintext: Uint8Array, aad: Uint8Array): Uint8Array {
    // Apply length-hiding padding if enabled
    const data = this.enablePadding
      ? this.applyPadding(plaintext)
      : plaintext;

    // Generate random nonces
    const aesNonce = randomBytes(NONCE_SIZE);
    const chachaNonce = randomBytes(NONCE_SIZE);

    // Layer 1: AES-256-GCM
    const aesCipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.aesKey),
      Buffer.from(aesNonce)
    );
    if (aad.length > 0) {
      aesCipher.setAAD(Buffer.from(aad));
    }
    const aesEncrypted = Buffer.concat([
      aesCipher.update(Buffer.from(data)),
      aesCipher.final(),
    ]);
    const aesTag = aesCipher.getAuthTag();
    const aesCt = Buffer.concat([aesEncrypted, aesTag]);

    // Layer 2: ChaCha20-Poly1305
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chachaCipher = (crypto as any).createCipheriv(
      'chacha20-poly1305',
      Buffer.from(this.chachaKey),
      Buffer.from(chachaNonce),
      { authTagLength: 16 }
    ) as crypto.CipherGCM;
    if (aad.length > 0) {
      chachaCipher.setAAD(Buffer.from(aad));
    }
    const chachaEncrypted = Buffer.concat([
      chachaCipher.update(aesCt),
      chachaCipher.final(),
    ]);
    const chachaTag = chachaCipher.getAuthTag();
    const chachaCt = Buffer.concat([chachaEncrypted, chachaTag]);

    // Build wire format: [version][aes_nonce][chacha_nonce][ciphertext]
    const result = new Uint8Array(HEADER_SIZE + chachaCt.length);
    result[0] = VERSION_BYTE;
    result.set(aesNonce, 1);
    result.set(chachaNonce, 1 + NONCE_SIZE);
    result.set(new Uint8Array(chachaCt), HEADER_SIZE);

    return result;
  }

  /**
   * Decrypt cascading ciphertext with AAD.
   */
  decryptWithAad(ciphertext: Uint8Array, aad: Uint8Array): Uint8Array {
    if (ciphertext.length < HEADER_SIZE + 32) {
      throw new QShieldError('Ciphertext too short', 'INVALID_CIPHERTEXT');
    }

    const version = ciphertext[0];
    if (version !== VERSION_BYTE && version !== 0x04 && version !== 0x03 && version !== 0x02 && version !== 0x01) {
      throw new QShieldError(`Unsupported version: 0x${version.toString(16)}`, 'UNSUPPORTED_VERSION');
    }

    const aesNonce = ciphertext.slice(1, 1 + NONCE_SIZE);
    const chachaNonce = ciphertext.slice(1 + NONCE_SIZE, HEADER_SIZE);
    const encrypted = ciphertext.slice(HEADER_SIZE);

    // Reverse order: ChaCha20-Poly1305 first
    const chachaTag = encrypted.slice(encrypted.length - 16);
    const chachaEncrypted = encrypted.slice(0, encrypted.length - 16);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chachaDecipher = (crypto as any).createDecipheriv(
      'chacha20-poly1305',
      Buffer.from(this.chachaKey),
      Buffer.from(chachaNonce),
      { authTagLength: 16 }
    ) as crypto.DecipherGCM;
    chachaDecipher.setAuthTag(Buffer.from(chachaTag));
    if (aad.length > 0) {
      chachaDecipher.setAAD(Buffer.from(aad));
    }
    const aesCt = Buffer.concat([
      chachaDecipher.update(Buffer.from(chachaEncrypted)),
      chachaDecipher.final(),
    ]);

    // Then AES-256-GCM
    const aesTag = aesCt.slice(aesCt.length - 16);
    const aesEncrypted = aesCt.slice(0, aesCt.length - 16);

    const aesDecipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.aesKey),
      Buffer.from(aesNonce)
    );
    aesDecipher.setAuthTag(aesTag);
    if (aad.length > 0) {
      aesDecipher.setAAD(Buffer.from(aad));
    }
    const padded = Buffer.concat([
      aesDecipher.update(aesEncrypted),
      aesDecipher.final(),
    ]);

    // Remove padding if applicable
    if (this.enablePadding && (version === VERSION_BYTE || version === 0x04 || version === 0x03)) {
      return this.removePadding(new Uint8Array(padded));
    }

    return new Uint8Array(padded);
  }

  /**
   * Encrypt a UTF-8 string, returning base64-encoded ciphertext.
   */
  encryptString(plaintext: string): string {
    const encrypted = this.encrypt(new TextEncoder().encode(plaintext));
    return toBase64(encrypted);
  }

  /**
   * Decrypt a base64-encoded ciphertext to a UTF-8 string.
   */
  decryptString(ciphertextB64: string): string {
    const ciphertext = fromBase64(ciphertextB64);
    const decrypted = this.decrypt(ciphertext);
    return new TextDecoder().decode(decrypted);
  }

  /** Check if length-hiding padding is enabled. */
  hasLengthHiding(): boolean {
    return this.enablePadding;
  }

  /** Get the encryption overhead in bytes. */
  overhead(): number {
    if (this.enablePadding) {
      // header + AES tag + ChaCha tag + min padding + length prefix
      return HEADER_SIZE + 16 + 16 + MIN_PADDING + 4;
    }
    return HEADER_SIZE + 16 + 16;
  }

  /**
   * Apply length-hiding padding (compatible with WASM format).
   *
   * Format: [original_length (4 LE)] [data] [random_padding]
   * Total length is aligned to PADDING_BLOCK_SIZE.
   */
  private applyPadding(data: Uint8Array): Uint8Array {
    const contentLen = data.length;
    const minSize = contentLen + MIN_PADDING + 4;
    const paddedSize = Math.ceil(minSize / PADDING_BLOCK_SIZE) * PADDING_BLOCK_SIZE;
    const paddingLen = paddedSize - contentLen - 4;

    const result = new Uint8Array(paddedSize);

    // Write original length as 4-byte little-endian
    result[0] = contentLen & 0xff;
    result[1] = (contentLen >> 8) & 0xff;
    result[2] = (contentLen >> 16) & 0xff;
    result[3] = (contentLen >> 24) & 0xff;

    // Copy data
    result.set(data, 4);

    // Fill padding with random bytes
    const padding = randomBytes(paddingLen);
    result.set(padding, 4 + contentLen);

    return result;
  }

  /**
   * Remove length-hiding padding.
   */
  private removePadding(padded: Uint8Array): Uint8Array {
    if (padded.length < 4) {
      throw new QShieldError('Invalid padded data', 'INVALID_PADDING');
    }

    const originalLen =
      padded[0] |
      (padded[1] << 8) |
      (padded[2] << 16) |
      (padded[3] << 24);

    if (originalLen < 0 || originalLen > padded.length - 4) {
      throw new QShieldError('Invalid padding length', 'INVALID_PADDING');
    }

    return padded.slice(4, 4 + originalLen);
  }
}

// ============================================================================
// FORWARD SECRECY SESSION — HMAC-SHA256 Key Ratcheting
// ============================================================================

/**
 * Forward secrecy session with automatic key ratcheting.
 *
 * Each message uses a unique derived key. After encryption/decryption,
 * the chain key is ratcheted forward using HMAC-SHA256, making it
 * impossible to decrypt past messages even if the current key is compromised.
 *
 * NOTE: This uses HMAC-SHA256 as a Node.js-native approximation of the
 * WASM module's HMAC-SHA3-256. The session wire format is NOT cross-compatible
 * with the WASM module but follows the same ratcheting design.
 */
export class NodeSession implements ISession {
  private chainKey: Uint8Array;
  private _messageCount: number;

  constructor(sharedSecret: Uint8Array) {
    // Derive initial chain key via HKDF
    this.chainKey = hkdfDeriveSync({
      ikm: sharedSecret,
      salt: new TextEncoder().encode('QShield-session-v1'),
      info: 'chain-key-init',
      length: 32,
      hash: 'sha256',
    });
    this._messageCount = 0;
  }

  /** Get the current message count. */
  get messageCount(): number {
    return this._messageCount;
  }

  /**
   * Encrypt a message with automatic key ratcheting.
   */
  encrypt(plaintext: Uint8Array): Uint8Array {
    const { messageKey, newChainKey } = this.ratchet();
    this.chainKey = newChainKey;
    this._messageCount++;

    const cipher = NodeCipher.fromBytes(messageKey);
    const encrypted = cipher.encrypt(plaintext);

    // Prepend 8-byte message number (little-endian)
    const msgNum = this._messageCount - 1;
    const result = new Uint8Array(8 + encrypted.length);
    const view = new DataView(result.buffer);
    view.setUint32(0, msgNum & 0xffffffff, true);
    view.setUint32(4, 0, true); // high 32 bits (always 0 for reasonable counts)
    result.set(encrypted, 8);

    return result;
  }

  /**
   * Decrypt a message with automatic key ratcheting.
   * Messages must be decrypted in order.
   */
  decrypt(ciphertext: Uint8Array): Uint8Array {
    if (ciphertext.length < 8) {
      throw new QShieldError('Invalid session message', 'INVALID_MESSAGE');
    }

    const view = new DataView(ciphertext.buffer, ciphertext.byteOffset, 8);
    const msgNum = view.getUint32(0, true);

    if (msgNum !== this._messageCount) {
      throw new QShieldError(
        `Message out of order: expected ${this._messageCount}, got ${msgNum}`,
        'OUT_OF_ORDER'
      );
    }

    const { messageKey, newChainKey } = this.ratchet();
    this.chainKey = newChainKey;
    this._messageCount++;

    const cipher = NodeCipher.fromBytes(messageKey);
    return cipher.decrypt(ciphertext.slice(8));
  }

  /**
   * Ratchet the chain key forward using HMAC-SHA256.
   */
  private ratchet(): { messageKey: Uint8Array; newChainKey: Uint8Array } {
    // Derive message key
    const msgCountBuf = new Uint8Array(8);
    const view = new DataView(msgCountBuf.buffer);
    view.setUint32(0, this._messageCount & 0xffffffff, true);
    view.setUint32(4, 0, true);

    const messageKeyHmac = crypto.createHmac('sha256', Buffer.from(this.chainKey));
    messageKeyHmac.update(Buffer.from('message-key'));
    messageKeyHmac.update(Buffer.from(msgCountBuf));
    const messageKey = new Uint8Array(messageKeyHmac.digest());

    // Derive next chain key
    const chainKeyHmac = crypto.createHmac('sha256', Buffer.from(this.chainKey));
    chainKeyHmac.update(Buffer.from('chain-key-next'));
    const newChainKey = new Uint8Array(chainKeyHmac.digest());

    return { messageKey, newChainKey };
  }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Quick encrypt: create a cipher from a password and encrypt a string.
 */
export function quickEncrypt(plaintext: string, password: string): string {
  const cipher = NodeCipher.fromPassword(password);
  return cipher.encryptString(plaintext);
}

/**
 * Quick decrypt: create a cipher from a password and decrypt a string.
 */
export function quickDecrypt(ciphertextB64: string, password: string): string {
  const cipher = NodeCipher.fromPassword(password);
  return cipher.decryptString(ciphertextB64);
}
