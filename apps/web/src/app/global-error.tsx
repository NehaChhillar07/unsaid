'use client';

// last-resort boundary for errors thrown in the root layout itself. it renders
// outside the app shell, so styles are inlined and kept minimal.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(165deg, #ECE5DC 0%, #E5DACE 52%, #DCCFC1 100%)',
          fontFamily: 'system-ui, sans-serif',
          color: '#3B332B',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#B06A48' }}>
            unsaid
          </div>
          <h1 style={{ fontSize: 22, margin: '18px 0 10px' }}>something caught</h1>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, opacity: 0.7, margin: '0 0 24px' }}>
            a small hiccup on our end. take a breath and try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              height: 50,
              padding: '0 26px',
              borderRadius: 16,
              border: 'none',
              cursor: 'pointer',
              background: '#B06A48',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            try again
          </button>
        </div>
      </body>
    </html>
  );
}
