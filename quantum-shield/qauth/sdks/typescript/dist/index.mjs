// src/index.ts
import * as crypto from "crypto";
function toBytes(data) {
  if (typeof data === "string") {
    return new TextEncoder().encode(data);
  }
  return data;
}
function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
function randomBytes2(length) {
  return new Uint8Array(crypto.randomBytes(length));
}
function sha256(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return new Uint8Array(hash.digest());
}
function base64UrlEncode(data) {
  return Buffer.from(data).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return new Uint8Array(Buffer.from(str, "base64"));
}
var QAuthServer = class {
  constructor(config) {
    this.config = config;
    const keypair = crypto.generateKeyPairSync("ed25519");
    const publicKey = keypair.publicKey.export({ type: "spki", format: "der" });
    const privateKey = keypair.privateKey.export({ type: "pkcs8", format: "der" });
    const rawPublicKey = new Uint8Array(publicKey.slice(-32));
    const rawPrivateKey = new Uint8Array(privateKey.slice(-32));
    this.keys = {
      keyId: bytesToHex(sha256(rawPublicKey).slice(0, 16)),
      ed25519PublicKey: rawPublicKey,
      ed25519PrivateKey: rawPrivateKey,
      encryptionKey: randomBytes2(32)
    };
  }
  getPublicKeys() {
    return {
      keyId: this.keys.keyId,
      ed25519PublicKey: this.keys.ed25519PublicKey,
      encryptionKey: this.keys.encryptionKey
    };
  }
  createToken(options) {
    const now = Math.floor(Date.now() / 1e3);
    const validity = options.validitySeconds ?? 3600;
    const payload = {
      sub: typeof options.subject === "string" ? options.subject : new TextDecoder().decode(options.subject),
      iss: this.config.issuer,
      aud: options.audience ? Array.isArray(options.audience) ? options.audience : [options.audience] : [this.config.audience],
      exp: now + validity,
      iat: now,
      nbf: now,
      jti: bytesToHex(randomBytes2(16)),
      rid: bytesToHex(randomBytes2(16)),
      pol: options.policyRef,
      cst: options.claims ?? {}
    };
    const header = { alg: "EdDSA", typ: "QAuth", kid: this.keys.keyId };
    const headerB64 = base64UrlEncode(toBytes(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(toBytes(JSON.stringify(payload)));
    const message = `${headerB64}.${payloadB64}`;
    const privateKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        Buffer.from(this.keys.ed25519PrivateKey)
      ]),
      format: "der",
      type: "pkcs8"
    });
    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    const signatureB64 = base64UrlEncode(new Uint8Array(signature));
    return `${message}.${signatureB64}`;
  }
  validateToken(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(this.keys.ed25519PublicKey)
      ]),
      format: "der",
      type: "spki"
    });
    const signature = base64UrlDecode(signatureB64);
    const isValid = crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(signature));
    if (!isValid) {
      throw new Error("Invalid signature");
    }
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp < now) {
      throw new Error("Token expired");
    }
    if (payload.nbf > now) {
      throw new Error("Token not yet valid");
    }
    if (payload.iss !== this.config.issuer) {
      throw new Error("Invalid issuer");
    }
    if (!payload.aud.includes(this.config.audience)) {
      throw new Error("Invalid audience");
    }
    return payload;
  }
};
var QAuthClient = class {
  constructor() {
    const keypair = crypto.generateKeyPairSync("ed25519");
    const publicKeyDer = keypair.publicKey.export({ type: "spki", format: "der" });
    const privateKeyDer = keypair.privateKey.export({ type: "pkcs8", format: "der" });
    this.publicKey = new Uint8Array(publicKeyDer.slice(-32));
    this.privateKey = new Uint8Array(privateKeyDer.slice(-32));
  }
  getPublicKey() {
    return this.publicKey;
  }
  createProof(method, uri, token, body) {
    const timestamp = Math.floor(Date.now() / 1e3);
    const nonce = bytesToHex(randomBytes2(8));
    const bodyHash = body ? bytesToHex(sha256(toBytes(body))) : "";
    const tokenHash = bytesToHex(sha256(toBytes(token)));
    const proofData = {
      ts: timestamp,
      nonce,
      method,
      uri,
      body_hash: bodyHash,
      token_hash: tokenHash
    };
    const message = JSON.stringify(proofData);
    const privateKey = crypto.createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        Buffer.from(this.privateKey)
      ]),
      format: "der",
      type: "pkcs8"
    });
    const signature = crypto.sign(null, Buffer.from(message), privateKey);
    return base64UrlEncode(
      toBytes(
        JSON.stringify({
          ...proofData,
          sig: bytesToHex(new Uint8Array(signature)),
          pub: bytesToHex(this.publicKey)
        })
      )
    );
  }
};
var QAuthValidator = class {
  constructor(keys, config) {
    this.keys = keys;
    this.config = config;
  }
  validate(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(this.keys.ed25519PublicKey)
      ]),
      format: "der",
      type: "spki"
    });
    const signature = base64UrlDecode(signatureB64);
    const isValid = crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(signature));
    if (!isValid) {
      throw new Error("Invalid signature");
    }
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(payloadB64))
    );
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp < now) throw new Error("Token expired");
    if (payload.nbf > now) throw new Error("Token not yet valid");
    if (payload.iss !== this.config.issuer) throw new Error("Invalid issuer");
    if (!payload.aud.includes(this.config.audience)) throw new Error("Invalid audience");
    return payload;
  }
};
var ProofValidator = class {
  constructor(clientPublicKey) {
    this.clientPublicKey = clientPublicKey;
  }
  validate(proof, method, uri, token, body) {
    try {
      const proofData = JSON.parse(new TextDecoder().decode(base64UrlDecode(proof)));
      const now = Math.floor(Date.now() / 1e3);
      if (Math.abs(now - proofData.ts) > 60) {
        return false;
      }
      if (proofData.method !== method || proofData.uri !== uri) {
        return false;
      }
      const expectedBodyHash = body ? bytesToHex(sha256(toBytes(body))) : "";
      if (proofData.body_hash !== expectedBodyHash) {
        return false;
      }
      const expectedTokenHash = bytesToHex(sha256(toBytes(token)));
      if (proofData.token_hash !== expectedTokenHash) {
        return false;
      }
      const { sig, pub, ...dataToSign } = proofData;
      const message = JSON.stringify(dataToSign);
      const publicKey = crypto.createPublicKey({
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          Buffer.from(hexToBytes(pub))
        ]),
        format: "der",
        type: "spki"
      });
      return crypto.verify(null, Buffer.from(message), publicKey, Buffer.from(hexToBytes(sig)));
    } catch {
      return false;
    }
  }
};
var PolicyEngine = class {
  constructor() {
    this.policies = /* @__PURE__ */ new Map();
  }
  loadPolicy(policy) {
    this.policies.set(policy.id, policy);
  }
  evaluate(policyId, context) {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return {
        effect: "deny",
        matched_rule: null,
        reason: `Policy not found: ${policyId}`
      };
    }
    const sortedRules = [...policy.rules].sort(
      (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );
    for (const rule of sortedRules) {
      if (this.ruleMatches(rule, context)) {
        return {
          effect: rule.effect,
          matched_rule: rule.id ?? null,
          reason: `Matched rule: ${rule.id ?? "unnamed"}`
        };
      }
    }
    return {
      effect: "deny",
      matched_rule: null,
      reason: "No matching rule found (default deny)"
    };
  }
  ruleMatches(rule, context) {
    const resourcePath = context.resource?.path ?? "";
    const resourceMatches = rule.resources.some(
      (pattern) => this.globMatch(pattern, resourcePath)
    );
    if (!resourceMatches) return false;
    const action = context.request?.action ?? "";
    const actionMatches = rule.actions.some(
      (a) => a === "*" || a === action
    );
    if (!actionMatches) return false;
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
  globMatch(pattern, str) {
    const regex = pattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
    return new RegExp(`^${regex}$`).test(str);
  }
  conditionMatches(condition, value) {
    if (typeof condition === "object" && condition !== null) {
      const cond = condition;
      if ("in" in cond && Array.isArray(cond.in)) {
        return cond.in.includes(value);
      }
      if ("eq" in cond) {
        return cond.eq === value;
      }
    }
    return condition === value;
  }
};
function getVersion() {
  return "0.1.0";
}
function getProtocolVersion() {
  return "1.0";
}
async function initQAuth() {
}
function isInitialized() {
  return true;
}
export {
  PolicyEngine,
  ProofValidator,
  QAuthClient,
  QAuthServer,
  QAuthValidator,
  bytesToHex,
  getProtocolVersion,
  getVersion,
  hexToBytes,
  initQAuth,
  isInitialized,
  toBytes
};
