import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'offline', robots: { index: false } };

export default function Offline() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(165deg, #ECE5DC 0%, #E5DACE 52%, #DCCFC1 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#3B332B',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#B06A48' }}>
          unsaid
        </div>
        <h1 style={{ fontSize: 22, margin: '18px 0 10px' }}>you&rsquo;re off the grid</h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, opacity: 0.7, margin: '0 0 24px' }}>
          no connection right now — the feed will be here the moment you&rsquo;re back.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            height: 52,
            lineHeight: '52px',
            padding: '0 26px',
            borderRadius: 16,
            background: '#9C5A3C',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          try again
        </Link>
      </div>
    </div>
  );
}
