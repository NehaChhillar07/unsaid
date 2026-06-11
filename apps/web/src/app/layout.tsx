import type { Metadata } from 'next';
import { Space_Grotesk, Lora } from 'next/font/google';
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${lora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
