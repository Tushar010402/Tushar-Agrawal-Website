import { Metadata } from 'next';
import QuantumShieldClient from './quantum-shield-client';

export const metadata: Metadata = {
  title: 'QuantumShield - Post-Quantum Cryptography Library',
  description:
    'Open-source quantum-secure encryption with NIST FIPS 203/204/205 algorithms. Hybrid KEM (X25519 + ML-KEM-768), dual signatures (ML-DSA + SLH-DSA), and cascading encryption (AES-256-GCM + ChaCha20-Poly1305).',
  keywords: [
    'post-quantum cryptography',
    'quantum-safe encryption',
    'ML-KEM',
    'ML-DSA',
    'SLH-DSA',
    'NIST FIPS 203',
    'NIST FIPS 204',
    'NIST FIPS 205',
    'Rust cryptography',
    'hybrid encryption',
    'quantum computing security',
  ],
  openGraph: {
    title: 'QuantumShield - Post-Quantum Cryptography Library',
    description:
      'Open-source quantum-secure encryption with NIST FIPS 203/204/205 algorithms. Hybrid KEM, dual signatures, cascading encryption.',
    url: 'https://www.tusharagrawal.in/quantum-shield',
    siteName: 'Tushar Agrawal',
    type: 'website',
    images: [
      {
        url: 'https://www.tusharagrawal.in/quantum-shield/og-image.png',
        width: 1200,
        height: 630,
        alt: 'QuantumShield - Post-Quantum Cryptography Library',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuantumShield - Post-Quantum Cryptography Library',
    description:
      'Open-source quantum-secure encryption with NIST FIPS 203/204/205 algorithms.',
    images: ['https://www.tusharagrawal.in/quantum-shield/og-image.png'],
  },
  alternates: {
    canonical: 'https://www.tusharagrawal.in/quantum-shield',
  },
};

export default function QuantumShieldPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: 'QuantumShield',
            description:
              'Post-quantum cryptography library implementing NIST FIPS 203/204/205 standards with hybrid encryption and defense-in-depth architecture.',
            programmingLanguage: 'Rust',
            codeRepository: 'https://github.com/Tushar010402/QuantumShield',
            license: 'https://opensource.org/licenses/MIT',
            author: {
              '@type': 'Person',
              name: 'Tushar Agrawal',
              url: 'https://www.tusharagrawal.in',
            },
            offers: {
              '@type': 'Offer',
              availability: 'https://schema.org/PreOrder',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'QuantumShield',
            description:
              'Post-quantum cryptography library for secure encryption against quantum computing threats.',
            brand: {
              '@type': 'Brand',
              name: 'QuantumShield',
            },
            offers: {
              '@type': 'Offer',
              availability: 'https://schema.org/PreOrder',
              price: '0',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
      <QuantumShieldClient />
    </>
  );
}
