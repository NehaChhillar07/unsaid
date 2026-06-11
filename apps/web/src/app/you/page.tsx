import type { Metadata } from 'next';
import { YouClient } from './YouClient';

export const metadata: Metadata = {
  title: 'your space',
  robots: { index: false },
};

export default function YouPage() {
  return <YouClient />;
}
