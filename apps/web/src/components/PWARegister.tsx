'use client';

// registers the service worker so the app is installable + offline-capable.
// production only: a SW in `next dev` fights HMR and caches stale chunks.
import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
