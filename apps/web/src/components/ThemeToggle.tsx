'use client';

// manual light/dark switch (the prototype's 🌙/☀️ top-bar button).
// default follows the system; a tap forces the opposite and persists it.
import { useEffect, useState } from 'react';
import styles from './Chrome.module.css';

const KEY = 'unsaid:theme';

function effectiveDark(): boolean {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'dark') return true;
  if (forced === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null); // null until mounted (SSR-safe)

  useEffect(() => {
    setDark(effectiveDark());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setDark(effectiveDark());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const flip = () => {
    const next = !effectiveDark();
    const theme = next ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(KEY, theme);
    } catch {
      /* private mode — theme just won't persist */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      className={styles.iconBtn}
      onClick={flip}
      aria-label={dark ? 'switch to light' : 'switch to dark'}
    >
      {dark === null ? '' : dark ? '☀️' : '🌙'}
    </button>
  );
}
