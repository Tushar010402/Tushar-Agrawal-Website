import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Tushar Agrawal Technical Blog';
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
          backgroundImage: 'linear-gradient(to bottom right, #1a1a2e, #16213e, #0f0f23)',
        }}
      >
        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
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
          }}
        >
          {/* Blog Icon */}
          <div
            style={{
              fontSize: '64px',
              marginBottom: '24px',
            }}
          >
            📝
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            Technical Blog
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '28px',
              color: '#a5b4fc',
              marginBottom: '24px',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            Backend Engineering, System Design & DevOps
          </p>

          {/* Topics */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '900px',
            }}
          >
            {['Python', 'Go', 'TypeScript', 'AWS', 'Docker', 'PostgreSQL', 'System Design'].map((topic) => (
              <span
                key={topic}
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#93c5fd',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  fontSize: '18px',
                }}
              >
                {topic}
              </span>
            ))}
          </div>

          {/* Author */}
          <p
            style={{
              fontSize: '22px',
              color: '#6b7280',
              marginTop: '40px',
            }}
          >
            by Tushar Agrawal • tusharagrawal.in/blog
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
