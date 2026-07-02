'use client';

// gentle, dismissible "install unsaid" nudge.
// - Android / desktop Chrome+Edge: captures beforeinstallprompt → native install.
// - iOS Safari (no such event): shows a "tap Share → Add to Home Screen" hint.
// hidden when already installed (standalone) or previously dismissed.
import { useEffect, useState } from 'react';
import { worldVars } from '@/lib/theme';
import { MaskIcon } from './MaskIcon';
import styles from './InstallPrompt.module.css';

const DISMISS_KEY = 'unsaid:installDismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode — fine */
    }

    const ua = window.navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      setIos(true);
      const t = window.setTimeout(() => setShow(true), 3500);
      return () => window.clearTimeout(t);
    }
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const onAction = async () => {
    if (ios) {
      setHint(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="themed" style={worldVars('personal')}>
      <div className={styles.banner} role="region" aria-label="install unsaid">
        <span className={styles.icon}>
          <MaskIcon size={20} color="var(--accent)" />
        </span>
        <span className={styles.text}>
          {hint ? (
            <>
              tap <ShareGlyph /> then <b>Add to Home Screen</b>
            </>
          ) : (
            <>keep unsaid on your home screen</>
          )}
        </span>
        {!hint && (
          <button type="button" className={styles.action} onClick={onAction}>
            {ios ? 'how?' : 'install'}
          </button>
        )}
        <button type="button" className={styles.close} onClick={dismiss} aria-label="not now">
          ×
        </button>
      </div>
    </div>
  );
}

function ShareGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'inline', verticalAlign: '-2px' }}
    >
      <path d="M12 3v12M12 3l-4 4M12 3l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 12H5a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
