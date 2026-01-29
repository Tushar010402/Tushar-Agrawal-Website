"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface WasmModule {
  QShieldCipher: {
    from_password: (password: string) => {
      encrypt_string: (plaintext: string) => string;
      decrypt_string: (ciphertext: string) => string;
      free: () => void;
    };
  };
  demo_encrypt_decrypt: (message: string, password: string) => string;
  get_library_info: () => string;
}

export default function QuantumShieldDemo() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo state
  const [message, setMessage] = useState("Hello, Quantum World!");
  const [password, setPassword] = useState("secure-password-123");
  const [encrypted, setEncrypted] = useState("");
  const [decrypted, setDecrypted] = useState("");
  const [encryptTime, setEncryptTime] = useState<number | null>(null);
  const [decryptTime, setDecryptTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"encrypt" | "decrypt">("encrypt");

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

  const handleEncrypt = useCallback(() => {
    if (!wasm || !message || !password) return;

    try {
      const start = performance.now();
      const cipher = wasm.QShieldCipher.from_password(password);
      const result = cipher.encrypt_string(message);
      const end = performance.now();

      setEncrypted(result);
      setEncryptTime(end - start);
      setDecrypted("");
      setDecryptTime(null);
      cipher.free();
    } catch (err) {
      setError(`Encryption failed: ${err}`);
    }
  }, [wasm, message, password]);

  const handleDecrypt = useCallback(() => {
    if (!wasm || !encrypted || !password) return;

    try {
      const start = performance.now();
      const cipher = wasm.QShieldCipher.from_password(password);
      const result = cipher.decrypt_string(encrypted);
      const end = performance.now();

      setDecrypted(result);
      setDecryptTime(end - start);
      cipher.free();
    } catch (err) {
      setError(`Decryption failed: ${err}`);
      setDecrypted("");
    }
  }, [wasm, encrypted, password]);

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
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Live Encryption Demo
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto">
            Experience QuantumShield&apos;s cascading encryption in your browser.
            This demo runs entirely in WebAssembly—your data never leaves your device.
          </p>
        </motion.div>

        {/* Algorithm Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          <span className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-mono">
            AES-256-GCM
          </span>
          <span className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-mono">
            ChaCha20-Poly1305
          </span>
          <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-sm font-mono">
            HKDF-SHA3-512
          </span>
          <span className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-300 text-sm font-mono">
            WebAssembly
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
                Key derived using HKDF-SHA3-512
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
            </div>

            {activeTab === "encrypt" ? (
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
            ) : (
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

            {/* Encryption Process Visualization */}
            <div className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-medium text-neutral-400 mb-4">
                Encryption Layers
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 font-mono text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-white text-sm">AES-256-GCM</p>
                    <p className="text-neutral-500 text-xs">NIST-approved block cipher</p>
                  </div>
                </div>
                <div className="ml-4 w-px h-4 bg-neutral-700" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 font-mono text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-white text-sm">ChaCha20-Poly1305</p>
                    <p className="text-neutral-500 text-xs">IETF stream cipher</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-neutral-500 mt-4">
                Both ciphers must be broken to decrypt the data.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-medium mb-1">About This Demo</h3>
              <p className="text-neutral-300 text-sm">
                This demo showcases QuantumShield&apos;s cascading encryption using classical algorithms
                (AES-GCM + ChaCha20). The full QuantumShield library adds post-quantum key exchange
                (X25519 + ML-KEM-768) for quantum-resistant security. All cryptographic operations
                run locally in your browser using WebAssembly.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
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
