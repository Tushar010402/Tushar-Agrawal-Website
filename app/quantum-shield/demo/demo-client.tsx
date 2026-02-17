"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface QShieldCipherInstance {
  encrypt_string: (plaintext: string) => string;
  decrypt_string: (ciphertext: string) => string;
  encrypt: (data: Uint8Array) => Uint8Array;
  decrypt: (data: Uint8Array) => Uint8Array;
  overhead: () => number;
  free: () => void;
}

interface QShieldCipherConstructor {
  new (password: string): QShieldCipherInstance;
}

interface HybridKEMInstance {
  public_key: Uint8Array;
  public_key_base64: string;
  encapsulate: (peer_pk: Uint8Array) => { ciphertext: () => Uint8Array; ciphertext_base64: () => string; shared_secret: () => Uint8Array };
  decapsulate: (ct: Uint8Array) => Uint8Array;
  free: () => void;
}

interface HybridKEMConstructor {
  new (): HybridKEMInstance;
  public_key_size: () => number;
}

interface DualSignatureInstance {
  bytes: Uint8Array;
  base64: string;
  mldsa_signature: Uint8Array;
  slhdsa_signature: Uint8Array;
  free: () => void;
}

interface QShieldSignInstance {
  public_key: Uint8Array;
  public_key_base64: string;
  sign: (message: Uint8Array) => DualSignatureInstance;
  sign_string: (message: string) => DualSignatureInstance;
  verify: (message: Uint8Array, signature: DualSignatureInstance) => boolean;
  verify_string: (message: string, signature: DualSignatureInstance) => boolean;
  free: () => void;
}

interface QShieldSignConstructor {
  new (): QShieldSignInstance;
  public_key_info: () => string;
}

interface WasmModule {
  QShieldCipher: QShieldCipherConstructor;
  QShieldHybridKEM: HybridKEMConstructor;
  QShieldSign: QShieldSignConstructor;
  benchmark: (iterations: number, dataSize: number) => string;
  demo: (message: string, password: string) => string;
  info: () => string;
}

interface BenchmarkResult {
  iterations: number;
  dataSize: number;
  encryptTime: number;
  decryptTime: number;
  encryptThroughput: number;
  decryptThroughput: number;
}

export default function QuantumShieldDemo() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cipherRef = useRef<QShieldCipherInstance | null>(null);

  // Demo state
  const [message, setMessage] = useState("Hello, Quantum World!");
  const [password, setPassword] = useState("secure-password-123");
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [encryptTime, setEncryptTime] = useState<number | null>(null);
  const [decryptTime, setDecryptTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt" | "kem" | "signatures" | "benchmark">("encrypt");

  // KEM state
  const [kemRunning, setKemRunning] = useState(false);
  const [kemResult, setKemResult] = useState<{
    alicePkSize: number;
    bobPkSize: number;
    ctSize: number;
    secretMatch: boolean;
    kemTime: number;
    alicePkB64: string;
    ctB64: string;
  } | null>(null);

  // Signatures state
  const [sigRunning, setSigRunning] = useState(false);
  const [sigMessage, setSigMessage] = useState("This document is authentic.");
  const [sigResult, setSigResult] = useState<{
    pkSize: number;
    mldsaSigSize: number;
    slhdsaSigSize: number;
    totalSigSize: number;
    verified: boolean;
    wrongMsgVerified: boolean;
    signTime: number;
    verifyTime: number;
    pkB64: string;
    sigB64: string;
  } | null>(null);

  // Benchmark state
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [benchmarkRunning, setBenchmarkRunning] = useState(false);
  const [benchmarkDataSize, setBenchmarkDataSize] = useState(1024); // 1KB default
  const [benchmarkIterations, setBenchmarkIterations] = useState(100);

  // Load WASM module
  useEffect(() => {
    async function loadWasm() {
      try {
        // Fetch and execute the WASM JS wrapper
        const jsResponse = await fetch("/wasm/quantum_shield_demo.js");
        const jsCode = await jsResponse.text();

        // Create a module from the JS code
        const blob = new Blob([jsCode], { type: "application/javascript" });
        const moduleUrl = URL.createObjectURL(blob);

        // Dynamic import from blob URL
        const wasmModule = await import(/* webpackIgnore: true */ moduleUrl);

        // Initialize the WASM module
        await wasmModule.default("/wasm/quantum_shield_demo_bg.wasm");

        setWasm(wasmModule as unknown as WasmModule);
        setLoading(false);

        URL.revokeObjectURL(moduleUrl);
      } catch (err) {
        console.error("Failed to load WASM module:", err);
        setError("Failed to load the cryptography module. Please refresh the page.");
        setLoading(false);
      }
    }
    loadWasm();
  }, []);

  // Initialize cipher when password changes
  useEffect(() => {
    if (!wasm || !password) return;

    // Free old cipher
    if (cipherRef.current) {
      try {
        cipherRef.current.free();
      } catch {
        // Ignore
      }
    }

    try {
      cipherRef.current = new wasm.QShieldCipher(password);
    } catch (err) {
      setError(`Failed to create cipher: ${err}`);
    }

    return () => {
      if (cipherRef.current) {
        try {
          cipherRef.current.free();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [wasm, password]);

  const handleEncrypt = useCallback(() => {
    if (!cipherRef.current || !message) return;

    try {
      setError(null);
      const start = performance.now();
      const result = cipherRef.current.encrypt_string(message);
      const end = performance.now();

      setEncrypted(result);
      setEncryptTime(end - start);
      setDecrypted("");
      setDecryptTime(null);
    } catch (err) {
      setError(`Encryption failed: ${err}`);
    }
  }, [message]);

  const handleDecrypt = useCallback(() => {
    if (!cipherRef.current || !encrypted) return;

    try {
      setError(null);
      const start = performance.now();
      const result = cipherRef.current.decrypt_string(encrypted);
      const end = performance.now();

      setDecrypted(result);
      setDecryptTime(end - start);
    } catch (err) {
      setError(`Decryption failed: ${err}`);
      setDecrypted("");
    }
  }, [encrypted]);

  const handleBenchmark = useCallback(async () => {
    if (!wasm) return;

    setBenchmarkRunning(true);
    setError(null);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const resultJson = wasm.benchmark(benchmarkIterations, benchmarkDataSize);
        const result = JSON.parse(resultJson) as BenchmarkResult;
        setBenchmarkResult(result);
      } catch (err) {
        setError(`Benchmark failed: ${err}`);
      } finally {
        setBenchmarkRunning(false);
      }
    }, 50);
  }, [wasm, benchmarkIterations, benchmarkDataSize]);

  const handleKEM = useCallback(async () => {
    if (!wasm) return;
    setKemRunning(true);
    setError(null);

    setTimeout(() => {
      try {
        const start = performance.now();
        const alice = new wasm.QShieldHybridKEM();
        const bob = new wasm.QShieldHybridKEM();

        const encap = alice.encapsulate(bob.public_key);
        const bobSecret = bob.decapsulate(encap.ciphertext());

        const aliceSecret = encap.shared_secret();
        const secretMatch = aliceSecret.length === bobSecret.length &&
          aliceSecret.every((v: number, i: number) => v === bobSecret[i]);

        const kemTime = performance.now() - start;

        setKemResult({
          alicePkSize: alice.public_key.length,
          bobPkSize: bob.public_key.length,
          ctSize: encap.ciphertext().length,
          secretMatch,
          kemTime,
          alicePkB64: alice.public_key_base64.slice(0, 60) + "...",
          ctB64: encap.ciphertext_base64().slice(0, 60) + "...",
        });

        alice.free();
        bob.free();
      } catch (err) {
        setError(`KEM failed: ${err}`);
      } finally {
        setKemRunning(false);
      }
    }, 50);
  }, [wasm]);

  const handleSign = useCallback(async () => {
    if (!wasm) return;
    setSigRunning(true);
    setError(null);

    setTimeout(() => {
      try {
        const signer = new wasm.QShieldSign();

        const msgBytes = new TextEncoder().encode(sigMessage);

        const signStart = performance.now();
        const signature = signer.sign(msgBytes);
        const signTime = performance.now() - signStart;

        const verifyStart = performance.now();
        const verified = signer.verify(msgBytes, signature);
        const verifyTime = performance.now() - verifyStart;

        const wrongMsg = new TextEncoder().encode("tampered message");
        const wrongMsgVerified = signer.verify(wrongMsg, signature);

        setSigResult({
          pkSize: signer.public_key.length,
          mldsaSigSize: signature.mldsa_signature.length,
          slhdsaSigSize: signature.slhdsa_signature.length,
          totalSigSize: signature.mldsa_signature.length + signature.slhdsa_signature.length,
          verified,
          wrongMsgVerified,
          signTime,
          verifyTime,
          pkB64: signer.public_key_base64.slice(0, 60) + "...",
          sigB64: signature.base64.slice(0, 60) + "...",
        });

        signer.free();
        signature.free();
      } catch (err) {
        setError(`Signing failed: ${err}`);
      } finally {
        setSigRunning(false);
      }
    }, 50);
  }, [wasm, sigMessage]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-20 transition-theme"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full animate-spin mx-auto mb-4"
            style={{ border: "4px solid var(--border)", borderTopColor: "var(--accent)" }}
          />
          <p className="text-theme-secondary">Loading cryptography module...</p>
        </div>
      </div>
    );
  }

  if (error && !wasm) {
    return (
      <div
        className="min-h-screen flex items-center justify-center pt-20 transition-theme"
        style={{ background: "var(--background)" }}
      >
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-lg transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 transition-theme" style={{ background: "var(--background)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/quantum-shield" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "var(--accent-subtle)",
                border: "1px solid var(--accent-muted)",
              }}
            >
              <svg className="w-5 h-5" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-theme font-semibold">QuantumShield Demo</span>
          </Link>
          <Link
            href="/quantum-shield"
            className="text-theme-secondary hover:text-theme transition-colors text-sm"
          >
            Back to Overview
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full mb-4">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-violet-300 text-sm font-medium">Post-Quantum Secure</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-theme mb-4">
            Post-Quantum Encryption Demo
          </h1>
          <p className="text-theme-secondary max-w-2xl mx-auto">
            Experience QuantumShield&apos;s hybrid post-quantum encryption.
            Features ML-KEM-768 (NIST FIPS 203), Argon2id KDF, dual-layer ciphers,
            and forward secrecy. Secure against both classical and quantum computers.
          </p>
        </motion.div>

        {/* Algorithm Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-8"
        >
          <span className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-300 text-xs font-mono font-bold">
            ML-KEM-768 (PQ)
          </span>
          <span className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-300 text-xs font-mono font-bold">
            ML-DSA-65 (PQ)
          </span>
          <span className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-300 text-xs font-mono font-bold">
            SLH-DSA (PQ)
          </span>
          <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-mono">
            AES-256-GCM
          </span>
          <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-xs font-mono">
            ChaCha20-Poly1305
          </span>
          <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-300 text-xs font-mono">
            Argon2id
          </span>
        </motion.div>

        {/* Unique Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          <span className="px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-full text-fuchsia-300 text-xs font-bold">
            NIST FIPS 203/204/205
          </span>
          <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-300 text-xs">
            Hybrid KEM
          </span>
          <span className="px-3 py-1.5 bg-pink-500/10 border border-pink-500/30 rounded-full text-pink-300 text-xs">
            Dual Signatures
          </span>
          <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-300 text-xs">
            Dual-Layer Cipher
          </span>
          <span className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-300 text-xs">
            Length Hiding
          </span>
        </motion.div>

        {/* Main Demo Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid lg:grid-cols-2 gap-8"
        >
          {/* Input Panel */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-theme mb-6">Input</h2>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm text-theme-secondary mb-2">
                Encryption Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors font-mono"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                placeholder="Enter a password"
              />
              <p className="text-xs text-theme-tertiary mt-1">
                Key derived using Argon2id (19MB memory-hard, GPU resistant)
              </p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {(["encrypt", "decrypt", "kem", "signatures", "benchmark"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: activeTab === tab
                      ? (tab === "benchmark" ? "var(--accent)" : "var(--accent)")
                      : "var(--surface)",
                    color: activeTab === tab ? "#fff" : "var(--text-secondary)",
                    border: activeTab === tab ? "1px solid transparent" : "1px solid var(--border)",
                  }}
                >
                  {tab === "kem" ? "Hybrid KEM" : tab === "signatures" ? "Signatures" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === "encrypt" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-theme-secondary mb-2">
                    Message to Encrypt
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors resize-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    placeholder="Enter your secret message"
                  />
                </div>
                <button
                  onClick={handleEncrypt}
                  disabled={!message || !password}
                  className="w-full font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Encrypt with Cascading Cipher
                </button>
              </>
            )}

            {activeTab === "decrypt" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-theme-secondary mb-2">
                    Ciphertext (Base64)
                  </label>
                  <textarea
                    value={encrypted}
                    onChange={(e) => setEncrypted(e.target.value)}
                    className="w-full h-32 rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors resize-none font-mono text-sm"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    placeholder="Paste encrypted ciphertext here"
                  />
                </div>
                <button
                  onClick={handleDecrypt}
                  disabled={!encrypted || !password}
                  className="w-full font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Decrypt
                </button>
              </>
            )}

            {activeTab === "kem" && (
              <>
                <div className="mb-4 p-4 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm text-theme-secondary">
                    Generates two hybrid keypairs (X25519 + ML-KEM-768), performs key encapsulation,
                    and verifies both parties derive the same shared secret.
                  </p>
                </div>
                <button
                  onClick={handleKEM}
                  disabled={kemRunning}
                  className="w-full font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {kemRunning ? (
                    <>
                      <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                      Running KEM...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                      </svg>
                      Run Hybrid KEM Exchange
                    </>
                  )}
                </button>
              </>
            )}

            {activeTab === "signatures" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-theme-secondary mb-2">
                    Message to Sign
                  </label>
                  <textarea
                    value={sigMessage}
                    onChange={(e) => setSigMessage(e.target.value)}
                    className="w-full h-24 rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors resize-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    placeholder="Enter message to sign"
                  />
                  <p className="text-xs text-theme-tertiary mt-1">
                    Signs with ML-DSA-65 (lattice) + SLH-DSA-SHAKE-128f (hash-based)
                  </p>
                </div>
                <button
                  onClick={handleSign}
                  disabled={sigRunning || !sigMessage}
                  className="w-full font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {sigRunning ? (
                    <>
                      <div className="w-5 h-5 rounded-full animate-spin" style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                      Signing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      Sign &amp; Verify
                    </>
                  )}
                </button>
              </>
            )}

            {activeTab === "benchmark" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-theme-secondary mb-2">
                    Data Size
                  </label>
                  <select
                    value={benchmarkDataSize}
                    onChange={(e) => setBenchmarkDataSize(Number(e.target.value))}
                    className="w-full rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <option value={64}>64 bytes (small message)</option>
                    <option value={1024}>1 KB</option>
                    <option value={10240}>10 KB</option>
                    <option value={102400}>100 KB</option>
                    <option value={1048576}>1 MB</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-theme-secondary mb-2">
                    Iterations
                  </label>
                  <select
                    value={benchmarkIterations}
                    onChange={(e) => setBenchmarkIterations(Number(e.target.value))}
                    className="w-full rounded-lg px-4 py-3 text-theme focus:outline-none transition-colors"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  >
                    <option value={10}>10 iterations</option>
                    <option value={100}>100 iterations</option>
                    <option value={500}>500 iterations</option>
                    <option value={1000}>1000 iterations</option>
                  </select>
                </div>
                <button
                  onClick={handleBenchmark}
                  disabled={benchmarkRunning}
                  className="w-full font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {benchmarkRunning ? (
                    <>
                      <div
                        className="w-5 h-5 rounded-full animate-spin"
                        style={{ border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }}
                      />
                      Running Benchmark...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Run Performance Benchmark
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <p className="text-red-400 text-sm mt-4">{error}</p>
            )}
          </div>

          {/* Output Panel */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-theme mb-6">Output</h2>

            {/* Encrypted Output */}
            {encrypted && activeTab === "encrypt" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-theme-secondary">
                    Encrypted (Base64)
                  </label>
                  {encryptTime !== null && (
                    <span className="text-xs text-green-400">
                      {encryptTime.toFixed(2)}ms
                    </span>
                  )}
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    value={encrypted}
                    className="w-full h-32 rounded-lg px-4 py-3 text-green-400 font-mono text-sm resize-none"
                    style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                  />
                  <button
                    onClick={() => copyToClipboard(encrypted)}
                    className="absolute top-2 right-2 p-2 rounded transition-colors"
                    style={{ background: "var(--surface-hover)" }}
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-theme" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-theme-tertiary mt-2">
                  Size: {encrypted.length} characters ({Math.ceil(encrypted.length * 0.75)} bytes)
                </p>
              </div>
            )}

            {/* Decrypted Output */}
            {decrypted && activeTab === "decrypt" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-theme-secondary">
                    Decrypted Message
                  </label>
                  {decryptTime !== null && (
                    <span className="text-xs text-green-400">
                      {decryptTime.toFixed(2)}ms
                    </span>
                  )}
                </div>
                <div
                  className="rounded-lg px-4 py-3"
                  style={{ background: "var(--surface)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
                >
                  <p className="text-theme">{decrypted}</p>
                </div>
              </div>
            )}

            {/* KEM Results */}
            {activeTab === "kem" && kemResult && (
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Public Key Size</p>
                    <p className="text-2xl font-bold text-violet-400">
                      {kemResult.alicePkSize} <span className="text-sm">bytes</span>
                    </p>
                    <p className="text-xs text-theme-tertiary mt-1">32 X25519 + 1184 ML-KEM</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Ciphertext Size</p>
                    <p className="text-2xl font-bold text-pink-400">
                      {kemResult.ctSize} <span className="text-sm">bytes</span>
                    </p>
                    <p className="text-xs text-theme-tertiary mt-1">32 X25519 + 1088 ML-KEM</p>
                  </div>
                </div>

                <div className="rounded-lg p-4 space-y-2" style={{ background: "var(--surface)" }}>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Shared Secret Match</span>
                    <span className={kemResult.secretMatch ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                      {kemResult.secretMatch ? "Yes" : "FAILED"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Total KEM Time</span>
                    <span className="text-violet-400 font-mono">{kemResult.kemTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Algorithm</span>
                    <span className="text-theme font-mono text-xs">X25519 + ML-KEM-768</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">NIST Standard</span>
                    <span className="text-theme font-mono text-xs">FIPS 203 (Level 3)</span>
                  </div>
                </div>

                <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                  <p className="text-xs text-theme-tertiary mb-1">Public Key (truncated)</p>
                  <p className="text-xs text-theme font-mono break-all">{kemResult.alicePkB64}</p>
                </div>

                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                  <p className="text-xs text-green-300">
                    Both parties derived the same 64-byte shared secret using hybrid key encapsulation.
                    Security holds if EITHER X25519 OR ML-KEM-768 remains unbroken.
                  </p>
                </div>
              </div>
            )}

            {/* Signatures Results */}
            {activeTab === "signatures" && sigResult && (
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Signature Verified</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {sigResult.verified ? "Valid" : "INVALID"}
                    </p>
                    <p className="text-xs text-theme-tertiary mt-1">Both algorithms agree</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Tampered Message</p>
                    <p className="text-2xl font-bold text-red-400">
                      {sigResult.wrongMsgVerified ? "ACCEPTED (BAD)" : "Rejected"}
                    </p>
                    <p className="text-xs text-theme-tertiary mt-1">Forgery correctly detected</p>
                  </div>
                </div>

                <div className="rounded-lg p-4 space-y-2" style={{ background: "var(--surface)" }}>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Public Key</span>
                    <span className="text-theme font-mono text-xs">{sigResult.pkSize} bytes (ML-DSA + SLH-DSA)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">ML-DSA-65 Signature</span>
                    <span className="text-violet-400 font-mono text-xs">{sigResult.mldsaSigSize} bytes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">SLH-DSA-SHAKE-128f Signature</span>
                    <span className="text-pink-400 font-mono text-xs">{sigResult.slhdsaSigSize} bytes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Total Signature</span>
                    <span className="text-theme font-mono text-xs font-bold">{sigResult.totalSigSize} bytes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Sign Time</span>
                    <span className="text-emerald-400 font-mono">{sigResult.signTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Verify Time</span>
                    <span className="text-cyan-400 font-mono">{sigResult.verifyTime.toFixed(2)} ms</span>
                  </div>
                </div>

                <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                  <p className="text-xs text-theme-tertiary mb-1">Signature (truncated)</p>
                  <p className="text-xs text-theme font-mono break-all">{sigResult.sigB64}</p>
                </div>

                <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
                  <p className="text-xs text-violet-300">
                    Dual signatures combine lattice-based ML-DSA-65 (FIPS 204) with hash-based SLH-DSA-SHAKE-128f (FIPS 205).
                    An attacker must break BOTH cryptographic foundations to forge a signature.
                  </p>
                </div>
              </div>
            )}

            {/* Benchmark Results */}
            {activeTab === "benchmark" && benchmarkResult && (
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Encrypt Throughput</p>
                    <p className="text-2xl font-bold text-indigo-400">
                      {benchmarkResult.encryptThroughput.toFixed(1)} <span className="text-sm">MB/s</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-xs text-theme-tertiary mb-1">Decrypt Throughput</p>
                    <p className="text-2xl font-bold text-green-400">
                      {benchmarkResult.decryptThroughput.toFixed(1)} <span className="text-sm">MB/s</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-lg p-4 space-y-2" style={{ background: "var(--surface)" }}>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Total Data Processed</span>
                    <span className="text-theme font-mono">
                      {((benchmarkResult.iterations * benchmarkResult.dataSize) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Encrypt Time</span>
                    <span className="text-indigo-400 font-mono">{benchmarkResult.encryptTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Decrypt Time</span>
                    <span className="text-green-400 font-mono">{benchmarkResult.decryptTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-theme-secondary">Avg per Operation</span>
                    <span className="text-amber-400 font-mono">
                      {((benchmarkResult.encryptTime + benchmarkResult.decryptTime) / (benchmarkResult.iterations * 2)).toFixed(3)} ms
                    </span>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                  <p className="text-xs text-orange-300">
                    Performance with dual-layer encryption (AES-256-GCM + ChaCha20-Poly1305).
                    Running in WebAssembly with pre-expanded keys and zero-copy operations.
                  </p>
                </div>
              </div>
            )}

            {/* Defense-in-Depth Visualization */}
            <div style={{ borderTop: "1px solid var(--border)" }} className="pt-6">
              <h3 className="text-sm font-medium text-theme-secondary mb-4">
                Defense-in-Depth Architecture
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-cyan-500/20 rounded flex items-center justify-center text-cyan-400 font-mono text-xs">
                    0
                  </div>
                  <div>
                    <p className="text-theme text-sm">Argon2id KDF</p>
                    <p className="text-theme-tertiary text-xs">19MB memory-hard, GPU resistant</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-rose-500/20 rounded flex items-center justify-center text-rose-400 font-mono text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-theme text-sm">Length Hiding</p>
                    <p className="text-theme-tertiary text-xs">Random padding, traffic analysis protection</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400 font-mono text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-theme text-sm">AES-256-GCM</p>
                    <p className="text-theme-tertiary text-xs">NIST block cipher + authentication</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3" style={{ background: "var(--border)" }} />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 font-mono text-xs">
                    3
                  </div>
                  <div>
                    <p className="text-theme text-sm">ChaCha20-Poly1305</p>
                    <p className="text-theme-tertiary text-xs">IETF stream cipher + authentication</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-theme-tertiary mt-4">
                Four layers of protection. Both ciphers must be broken to decrypt.
              </p>
            </div>
          </div>
        </motion.div>

        {/* What Makes QuantumShield Different */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/20 rounded-2xl p-6"
        >
          <h3 className="text-theme font-medium mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Makes QuantumShield Different
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-emerald-300 font-medium">Dual-Layer Encryption</p>
                <p className="text-theme-secondary text-xs">Unlike single-cipher libraries, QuantumShield uses TWO independent ciphers. Both must be broken.</p>
              </div>
              <div>
                <p className="text-amber-300 font-medium">Argon2id (19MB Memory-Hard)</p>
                <p className="text-theme-secondary text-xs">GPU/ASIC password cracking is extremely expensive. Web Crypto only offers PBKDF2.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-rose-300 font-medium">Length Hiding</p>
                <p className="text-theme-secondary text-xs">Random padding prevents traffic analysis. &quot;Hi&quot; and &quot;Hello World&quot; produce similar-sized ciphertext.</p>
              </div>
              <div>
                <p className="text-violet-300 font-medium">Forward Secrecy Sessions</p>
                <p className="text-theme-secondary text-xs">Each message uses a unique key. Compromising one doesn&apos;t reveal past messages (like Signal).</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h4 className="text-amber-300 font-medium mb-2">Educational Demo</h4>
              <p className="text-theme-secondary text-sm">
                This demo uses real NIST-approved algorithms (ML-KEM-768 from the fips203 crate, AES-GCM, ChaCha20-Poly1305)
                from reputable Rust cryptographic libraries. However, QuantumShield is a <strong className="text-amber-300">personal project
                without professional security audit</strong>. The underlying primitives are battle-tested, but the integration has not been
                peer-reviewed. For production systems, use established PQC libraries from organizations like Open Quantum Safe.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <Link
            href="/quantum-shield"
            className="inline-flex items-center gap-2 font-semibold px-8 py-3 rounded-full transition-all"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            Learn More About QuantumShield
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
