import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'QuantumShield - Post-Quantum Cryptography Library';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          backgroundImage: 'linear-gradient(to bottom right, #0f0a1e, #1a0a2e, #0a1a2e)',
        }}
      >
        {/* Gradient overlays */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.2) 0%, transparent 40%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.15) 0%, transparent 40%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            zIndex: 10,
          }}
        >
          {/* Shield Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              marginBottom: '24px',
            }}
          >
            <svg
              width="50"
              height="50"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a5b4fc"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
              backgroundClip: 'text',
              color: 'transparent',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            QuantumShield
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '32px',
              color: '#a5b4fc',
              marginBottom: '32px',
              textAlign: 'center',
            }}
          >
            Post-Quantum Cryptography Library
          </p>

          {/* Algorithm Badges */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '900px',
            }}
          >
            {['FIPS 203', 'FIPS 204', 'FIPS 205', 'ML-KEM', 'ML-DSA', 'SLH-DSA', 'Rust'].map((badge) => (
              <span
                key={badge}
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  color: '#c7d2fe',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  fontSize: '18px',
                  fontFamily: 'monospace',
                }}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: '20px',
              color: '#6b7280',
              marginTop: '32px',
              textAlign: 'center',
            }}
          >
            Defense-in-depth encryption for the post-quantum era
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
