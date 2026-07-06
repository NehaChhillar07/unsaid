'use client';

// single polite live region for transient announcements (toasts, new drops,
// card advances). mounted once in Chrome; call announce() from anywhere.
import { useEffect, useState } from 'react';

let push: ((msg: string) => void) | null = null;

export function announce(msg: string) {
  push?.(msg);
}

export function LiveStatus() {
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // alternate a trailing nbsp so repeating the same message re-announces
    const set = (m: string) => setMsg((prev) => (prev === m ? `${m} ` : m));
    push = set;
    return () => {
      if (push === set) push = null;
    };
  }, []);

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {msg}
    </div>
  );
}
