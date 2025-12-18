import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Tushar Agrawal - Backend Engineer';
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
            background: 'radial-gradient(circle at 30% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)',
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
          {/* Name */}
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            Tushar Agrawal
          </h1>

          {/* Title */}
          <p
            style={{
              fontSize: '36px',
              color: '#a5b4fc',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            Backend Engineer | Full-Stack Developer
          </p>

          {/* Tech Stack */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: '800px',
            }}
          >
            {['Python', 'Go', 'TypeScript', 'React', 'PostgreSQL', 'Docker', 'AWS'].map((tech) => (
              <span
                key={tech}
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  color: '#c7d2fe',
                  padding: '8px 20px',
                  borderRadius: '20px',
                  fontSize: '20px',
                }}
              >
                {tech}
              </span>
            ))}
          </div>

          {/* Website URL */}
          <p
            style={{
              fontSize: '24px',
              color: '#6b7280',
              marginTop: '40px',
            }}
          >
            tusharagrawal.in
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
