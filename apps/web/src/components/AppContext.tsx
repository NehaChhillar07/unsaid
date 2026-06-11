'use client';

// app-wide client state: session, identities (onboarding gate), world mode,
// unread notification counts, and the compose / sign-in overlays.
// the provider lives in the root layout so every screen shares one world.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { fetchIdentities, fetchNotifications } from '@unsaid/api';
import type { Identity, Mode, MoodKey } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MODE_KEY = 'unsaid:mode';

export interface ComposeRequest {
  mode: Mode;
  initialBody?: string;
  initialMood?: MoodKey | null;
}

interface AppState {
  user: User | null;
  authReady: boolean;
  /** null until loaded; [] when signed out or none yet */
  identities: Identity[] | null;
  /** both selves exist — posting/reacting unlocked */
  onboarded: boolean;
  refreshIdentities: () => Promise<void>;
  mode: Mode;
  setMode: (m: Mode) => void;
  unread: Record<Mode, number>;
  refreshUnread: () => void;
  clearUnread: (m: Mode) => void;
  compose: ComposeRequest | null;
  openCompose: (req?: Partial<ComposeRequest>) => void;
  closeCompose: () => void;
  signInOpen: boolean;
  setSignInOpen: (open: boolean) => void;
  /** bumped after a successful publish so the feed refetches */
  feedVersion: number;
  bumpFeed: () => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within UnsaidAppProvider');
  return v;
}

/** routes that require finished onboarding when signed in */
const GATED_PATHS = new Set(['/', '/felt', '/you']);

export function UnsaidAppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [mode, setModeState] = useState<Mode>('personal');
  const [unread, setUnread] = useState<Record<Mode, number>>({ personal: 0, professional: 0 });
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const modeRef = useRef<Mode>('personal');
  modeRef.current = mode;

  // session
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // remembered world
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (saved === 'personal' || saved === 'professional') setModeState(saved);
    } catch {
      /* private mode — fine */
    }
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshIdentities = useCallback(async () => {
    const sb = createSupabaseBrowserClient();
    try {
      const rows = await fetchIdentities(sb);
      setIdentities(rows);
    } catch {
      // backend unreachable — leave as-is rather than mis-gating
    }
  }, []);

  // identities follow the session
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setIdentities([]);
      return;
    }
    void refreshIdentities();
  }, [authReady, user, refreshIdentities]);

  const refreshUnread = useCallback(() => {
    const sb = createSupabaseBrowserClient();
    (['personal', 'professional'] as Mode[]).forEach((m) => {
      fetchNotifications(sb, m)
        .then((rows) => {
          const n = rows.filter((r) => !r.read).length;
          setUnread((u) => (u[m] === n ? u : { ...u, [m]: n }));
        })
        .catch(() => {});
    });
  }, []);

  // unread badge: refresh on sign-in and every minute after
  useEffect(() => {
    if (!user) {
      setUnread({ personal: 0, professional: 0 });
      return;
    }
    refreshUnread();
    const t = window.setInterval(refreshUnread, 60_000);
    return () => window.clearInterval(t);
  }, [user, refreshUnread]);

  const clearUnread = useCallback((m: Mode) => {
    setUnread((u) => (u[m] === 0 ? u : { ...u, [m]: 0 }));
  }, []);

  const onboarded = identities !== null && identities.length >= 2;

  // post-auth gate: signed in but the two selves aren't set up yet
  useEffect(() => {
    if (!authReady || !user || identities === null) return;
    if (identities.length >= 2) return;
    if (GATED_PATHS.has(pathname)) router.replace('/welcome');
  }, [authReady, user, identities, pathname, router]);

  const openCompose = useCallback(
    (req?: Partial<ComposeRequest>) => {
      if (!user) {
        setSignInOpen(true);
        return;
      }
      if (!onboarded) {
        router.push('/welcome');
        return;
      }
      setCompose({ mode: req?.mode ?? modeRef.current, ...req });
    },
    [user, onboarded, router],
  );

  const closeCompose = useCallback(() => setCompose(null), []);
  const bumpFeed = useCallback(() => setFeedVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    await createSupabaseBrowserClient().auth.signOut();
    setIdentities([]);
    router.replace('/');
    router.refresh();
  }, [router]);

  const value = useMemo<AppState>(
    () => ({
      user,
      authReady,
      identities,
      onboarded,
      refreshIdentities,
      mode,
      setMode,
      unread,
      refreshUnread,
      clearUnread,
      compose,
      openCompose,
      closeCompose,
      signInOpen,
      setSignInOpen,
      feedVersion,
      bumpFeed,
      signOut,
    }),
    [
      user, authReady, identities, onboarded, refreshIdentities, mode, setMode,
      unread, refreshUnread, clearUnread, compose, openCompose, closeCompose,
      signInOpen, feedVersion, bumpFeed, signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
