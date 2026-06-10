import { Metadata } from 'next';
import QAuthClient from './qauth-client';
import { breadcrumbJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'QAuth - Post-Quantum Authentication Protocol',
  description:
    'Next-generation authentication replacing OAuth 2.0 and JWT. Dual signatures (Ed25519 + ML-DSA-65), encrypted payloads, mandatory proof-of-possession, and built-in revocation.',
  keywords: [
    'authentication',
    'authorization',
    'post-quantum cryptography',
    'OAuth replacement',
    'JWT alternative',
    'ML-DSA-65',
    'Ed25519',
    'proof of possession',
    'token security',
    'QAuth',
    'QuantumAuth',
  ],
  openGraph: {
    title: 'QAuth - Post-Quantum Authentication Protocol',
    description:
      'Replace OAuth 2.0 and JWT with quantum-safe authentication. Dual signatures, encrypted payloads, proof-of-possession.',
    url: 'https://www.tusharagrawal.in/qauth',
    siteName: 'Tushar Agrawal',
    type: 'website',
    // OG image is provided by the file-convention app/qauth/opengraph-image.png
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QAuth - Post-Quantum Authentication Protocol',
    description:
      'Replace OAuth 2.0 and JWT with quantum-safe authentication.',
  },
  alternates: {
    canonical: 'https://www.tusharagrawal.in/qauth',
  },
};

export default function QAuthPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareSourceCode',
            name: 'QAuth',
            description:
              'Post-quantum authentication protocol with dual signatures (Ed25519 + ML-DSA-65), encrypted payloads, mandatory proof-of-possession, and built-in revocation.',
            programmingLanguage: ['Rust', 'TypeScript', 'Python', 'Go'],
            codeRepository: 'https://github.com/Tushar010402/Tushar-Agrawal-Website/tree/master/quantum-shield/qauth',
            license: 'https://opensource.org/licenses/MIT',
            author: {
              '@type': 'Person',
              name: 'Tushar Agrawal',
              url: 'https://www.tusharagrawal.in',
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'QAuth', path: '/qauth' }])),
        }}
      />
      <QAuthClient />
    </>
  );
}
