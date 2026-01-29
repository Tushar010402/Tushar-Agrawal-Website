import { Metadata } from 'next';
import QuantumShieldDemo from './demo-client';

export const metadata: Metadata = {
  title: 'QuantumShield Demo - Live Encryption',
  description:
    'Try QuantumShield encryption in your browser. Cascading encryption with AES-256-GCM and ChaCha20-Poly1305 running in WebAssembly.',
  openGraph: {
    title: 'QuantumShield Demo - Live Encryption',
    description:
      'Try QuantumShield cascading encryption in your browser with WebAssembly.',
    url: 'https://www.tusharagrawal.in/quantum-shield/demo',
  },
};

export default function DemoPage() {
  return <QuantumShieldDemo />;
}
