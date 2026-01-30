import { Metadata } from 'next';
import QAuthDemo from './demo-client';

export const metadata: Metadata = {
  title: 'QAuth Demo - Interactive Token Generation',
  description:
    'Interactive demonstration of QAuth token creation, dual signatures (Ed25519 + ML-DSA-65), proof of possession, and policy evaluation.',
  openGraph: {
    title: 'QAuth Demo - Interactive Token Generation',
    description:
      'Try QAuth post-quantum authentication in your browser. See dual signatures and proof of possession in action.',
    url: 'https://www.tusharagrawal.in/qauth/demo',
  },
};

export default function DemoPage() {
  return <QAuthDemo />;
}
