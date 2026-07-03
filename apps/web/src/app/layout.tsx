import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Lora } from 'next/font/google';
import { UnsaidAppProvider } from '@/components/AppContext';
import { FeltBurstProvider } from '@/components/FeltBurst';
import { PWARegister } from '@/components/PWARegister';
import { InstallPrompt } from '@/components/InstallPrompt';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap',
});

const lora = Lora({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['400', '500', '600'],
  variable: '--font-confession',
  display: 'swap',
});

const description =
  "an anonymous space for the things you can't say out loud. pastel confession cards, two worlds — personal and professional. nobody knows it's you. everybody feels it.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://unsaid.app'),
  title: {
    default: "unsaid — say the thing you've never said",
    template: '%s · unsaid',
  },
  description,
  openGraph: {
    siteName: 'unsaid',
    type: 'website',
    title: "unsaid — say the thing you've never said",
    description,
  },
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'unsaid',
  },
  icons: {
    icon: [
      { url: '/favicon.ico?v=3', sizes: 'any' },
      { url: '/icon.svg?v=3', type: 'image/svg+xml' },
      { url: '/icon-32.png?v=3', type: 'image/png', sizes: '32x32' },
      { url: '/icon-16.png?v=3', type: 'image/png', sizes: '16x16' },
    ],
    shortcut: '/favicon.ico?v=3',
    apple: '/apple-touch-icon.png?v=3',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ECE5DC' },
    { media: '(prefers-color-scheme: dark)', color: '#1B1714' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${lora.variable}`} suppressHydrationWarning>
      <head>
        {/* apply the persisted theme override before first paint (no flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('unsaid:theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})()",
          }}
        />
      </head>
      <body>
        <UnsaidAppProvider>
          <FeltBurstProvider>{children}</FeltBurstProvider>
        </UnsaidAppProvider>
        <PWARegister />
        <InstallPrompt />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
