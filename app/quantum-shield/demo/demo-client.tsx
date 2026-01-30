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

interface WasmModule {
  QShieldCipher: QShieldCipherConstructor;
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
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt" | "benchmark">("encrypt");

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

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Loading cryptography module...</p>
        </div>
      </div>
    );
  }

  if (error && !wasm) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/quantum-shield" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-white font-semibold">QuantumShield Demo</span>
          </Link>
          <Link
            href="/quantum-shield"
            className="text-neutral-400 hover:text-white transition-colors text-sm"
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 rounded-full mb-4">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span className="text-violet-300 text-sm font-medium">Post-Quantum Secure v5.0</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Post-Quantum Encryption Demo
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
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
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Input</h2>

            {/* Password */}
            <div className="mb-6">
              <label className="block text-sm text-neutral-400 mb-2">
                Encryption Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                placeholder="Enter a password"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Key derived using Argon2id (19MB memory-hard, GPU resistant)
              </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("encrypt")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "encrypt"
                    ? "bg-indigo-500 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Encrypt
              </button>
              <button
                onClick={() => setActiveTab("decrypt")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "decrypt"
                    ? "bg-indigo-500 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Decrypt
              </button>
              <button
                onClick={() => setActiveTab("benchmark")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "benchmark"
                    ? "bg-orange-500 text-white"
                    : "bg-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                Benchmark
              </button>
            </div>

            {activeTab === "encrypt" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-neutral-400 mb-2">
                    Message to Encrypt
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter your secret message"
                  />
                </div>
                <button
                  onClick={handleEncrypt}
                  disabled={!message || !password}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <label className="block text-sm text-neutral-400 mb-2">
                    Ciphertext (Base64)
                  </label>
                  <textarea
                    value={encrypted}
                    onChange={(e) => setEncrypted(e.target.value)}
                    className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono text-sm"
                    placeholder="Paste encrypted ciphertext here"
                  />
                </div>
                <button
                  onClick={handleDecrypt}
                  disabled={!encrypted || !password}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Decrypt
                </button>
              </>
            )}

            {activeTab === "benchmark" && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-neutral-400 mb-2">
                    Data Size
                  </label>
                  <select
                    value={benchmarkDataSize}
                    onChange={(e) => setBenchmarkDataSize(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value={64}>64 bytes (small message)</option>
                    <option value={1024}>1 KB</option>
                    <option value={10240}>10 KB</option>
                    <option value={102400}>100 KB</option>
                    <option value={1048576}>1 MB</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm text-neutral-400 mb-2">
                    Iterations
                  </label>
                  <select
                    value={benchmarkIterations}
                    onChange={(e) => setBenchmarkIterations(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-colors"
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
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {benchmarkRunning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Output</h2>

            {/* Encrypted Output */}
            {encrypted && activeTab === "encrypt" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-neutral-400">
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
                    className="w-full h-32 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-green-400 font-mono text-sm resize-none"
                  />
                  <button
                    onClick={() => copyToClipboard(encrypted)}
                    className="absolute top-2 right-2 p-2 bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Size: {encrypted.length} characters ({Math.ceil(encrypted.length * 0.75)} bytes)
                </p>
              </div>
            )}

            {/* Decrypted Output */}
            {decrypted && activeTab === "decrypt" && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-neutral-400">
                    Decrypted Message
                  </label>
                  {decryptTime !== null && (
                    <span className="text-xs text-green-400">
                      {decryptTime.toFixed(2)}ms
                    </span>
                  )}
                </div>
                <div className="bg-neutral-800 border border-green-500/30 rounded-lg px-4 py-3">
                  <p className="text-white">{decrypted}</p>
                </div>
              </div>
            )}

            {/* Benchmark Results */}
            {activeTab === "benchmark" && benchmarkResult && (
              <div className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 mb-1">Encrypt Throughput</p>
                    <p className="text-2xl font-bold text-indigo-400">
                      {benchmarkResult.encryptThroughput.toFixed(1)} <span className="text-sm">MB/s</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 mb-1">Decrypt Throughput</p>
                    <p className="text-2xl font-bold text-green-400">
                      {benchmarkResult.decryptThroughput.toFixed(1)} <span className="text-sm">MB/s</span>
                    </p>
                  </div>
                </div>

                <div className="bg-neutral-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Total Data Processed</span>
                    <span className="text-white font-mono">
                      {((benchmarkResult.iterations * benchmarkResult.dataSize) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Encrypt Time</span>
                    <span className="text-indigo-400 font-mono">{benchmarkResult.encryptTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Decrypt Time</span>
                    <span className="text-green-400 font-mono">{benchmarkResult.decryptTime.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-neutral-400">Avg per Operation</span>
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
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-medium text-neutral-400 mb-4">
                Defense-in-Depth Architecture
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-cyan-500/20 rounded flex items-center justify-center text-cyan-400 font-mono text-xs">
                    0
                  </div>
                  <div>
                    <p className="text-white text-sm">Argon2id KDF</p>
                    <p className="text-neutral-500 text-xs">19MB memory-hard, GPU resistant</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3 bg-neutral-700" />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-rose-500/20 rounded flex items-center justify-center text-rose-400 font-mono text-xs">
                    1
                  </div>
                  <div>
                    <p className="text-white text-sm">Length Hiding</p>
                    <p className="text-neutral-500 text-xs">Random padding, traffic analysis protection</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3 bg-neutral-700" />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400 font-mono text-xs">
                    2
                  </div>
                  <div>
                    <p className="text-white text-sm">AES-256-GCM</p>
                    <p className="text-neutral-500 text-xs">NIST block cipher + authentication</p>
                  </div>
                </div>
                <div className="ml-3.5 w-px h-3 bg-neutral-700" />
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 font-mono text-xs">
                    3
                  </div>
                  <div>
                    <p className="text-white text-sm">ChaCha20-Poly1305</p>
                    <p className="text-neutral-500 text-xs">IETF stream cipher + authentication</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-4">
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
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Makes QuantumShield Different
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-emerald-300 font-medium">Dual-Layer Encryption</p>
                <p className="text-neutral-400 text-xs">Unlike single-cipher libraries, QuantumShield uses TWO independent ciphers. Both must be broken.</p>
              </div>
              <div>
                <p className="text-amber-300 font-medium">Argon2id (19MB Memory-Hard)</p>
                <p className="text-neutral-400 text-xs">GPU/ASIC password cracking is extremely expensive. Web Crypto only offers PBKDF2.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-rose-300 font-medium">Length Hiding</p>
                <p className="text-neutral-400 text-xs">Random padding prevents traffic analysis. &quot;Hi&quot; and &quot;Hello World&quot; produce similar-sized ciphertext.</p>
              </div>
              <div>
                <p className="text-violet-300 font-medium">Forward Secrecy Sessions</p>
                <p className="text-neutral-400 text-xs">Each message uses a unique key. Compromising one doesn&apos;t reveal past messages (like Signal).</p>
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
              <p className="text-neutral-400 text-sm">
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
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 py-3 rounded-full transition-all"
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
