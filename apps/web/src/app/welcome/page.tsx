import type { Metadata } from 'next';
import { WelcomeClient } from './WelcomeClient';

export const metadata: Metadata = {
  title: 'your two selves',
  robots: { index: false },
};

export default function WelcomePage() {
  return <WelcomeClient />;
}
