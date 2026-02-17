import { Metadata } from 'next';
import QuantumShieldDemo from './demo-client';

export const metadata: Metadata = {
  title: 'QuantumShield Demo - Post-Quantum Encryption in Your Browser',
  description:
    'Interactive demo of QuantumShield post-quantum encryption. Try hybrid KEM (X25519 + ML-KEM-768), dual signatures (ML-DSA-65 + SLH-DSA), and cascading AES-256-GCM + ChaCha20-Poly1305 — all running in WebAssembly.',
  openGraph: {
    title: 'QuantumShield Demo - Post-Quantum Encryption in Your Browser',
    description:
      'Try hybrid KEM, dual signatures, and cascading encryption with NIST FIPS 203/204/205 algorithms in WebAssembly.',
    url: 'https://www.tusharagrawal.in/quantum-shield/demo',
  },
};

export default function DemoPage() {
  return <QuantumShieldDemo />;
}
