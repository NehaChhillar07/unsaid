import type { Metadata } from 'next';
import { FeltClient } from './FeltClient';

export const metadata: Metadata = {
  title: 'felt',
  robots: { index: false },
};

export default function FeltPage() {
  return <FeltClient />;
}
