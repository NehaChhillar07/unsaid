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
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { fetchIdentities, fetchNotifications } from '@unsaid/api';
import type { Identity, Mode, MoodKey } from '@unsaid/tokens';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const MODE_KEY = 'unsaid:mode';
// per-session latch so the welcome overlay plays at most once per tab session
const WELCOME_LATCH = 'unsaid:welcomeShown';
// durable device flag: this device belongs to a set-up user. lets the pre-paint
// script in layout.tsx decide — synchronously, no network — to lead the landing
// with the welcome-back instead of flashing it over the feed.
const ONBOARDED_FLAG = 'unsaid:onboarded';
// once dismissed, the "make it yours" prompt never auto-shows again (it lives in /you)
const PERSONALIZE_DISMISSED = 'unsaid:personalizeDismissed';

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
  /** refetches identities; returns the rows (or null if the fetch failed) */
  refreshIdentities: () => Promise<Identity[] | null>;
  /** the welcome-reveal overlay request, consumed by the landing over the feed */
  welcome: { firstTime: boolean } | null;
  /** queue the welcome overlay (first-time: "you're in.") and latch the session */
  triggerWelcome: (firstTime: boolean) => void;
  /** dismiss the welcome overlay once it has played */
  clearWelcome: () => void;
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
  /** the optional "make it yours" sheet is showing */
  personalizeOpen: boolean;
  /** surface the personalize sheet (from browsing or a spill attempt) */
  openPersonalize: (intent?: 'browse' | 'compose') => void;
  /** eligible for the gentle after-browsing nudge (not yet set up, not dismissed) */
  personalizeEligible: boolean;
  /** close the sheet and remember not to auto-show it again */
  dismissPersonalize: () => void;
  /** saved a title + feelings — close, and continue any compose intent */
  completePersonalize: () => void;
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

export function UnsaidAppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [identities, setIdentities] = useState<Identity[] | null>(null);
  const [mode, setModeState] = useState<Mode>('personal');
  const [unread, setUnread] = useState<Record<Mode, number>>({ personal: 0, professional: 0 });
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [feedVersion, setFeedVersion] = useState(0);
  const [welcome, setWelcome] = useState<{ firstTime: boolean } | null>(null);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [personalizeDismissed, setPersonalizeDismissed] = useState(false);
  const composeAfterPersonalize = useRef(false);
  const welcomeLatch = useRef(false);
  const modeRef = useRef<Mode>('personal');
  modeRef.current = mode;

  // session — everyone gets in with no gate: if there's no session yet, we
  // silently create an anonymous one so the visitor lands straight on the feed
  // and can browse + react. posting still asks for a title first (below).
  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    sb.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setAuthReady(true);
      } else {
        sb.auth
          .signInAnonymously()
          .then(({ data: anon }) => setUser(anon.user ?? null))
          .catch(() => {})
          .finally(() => setAuthReady(true));
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // remember a prior dismissal of the personalize nudge
  useEffect(() => {
    try {
      if (window.localStorage.getItem(PERSONALIZE_DISMISSED) === '1') setPersonalizeDismissed(true);
    } catch {
      /* private mode — fine */
    }
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

  const refreshIdentities = useCallback(async (): Promise<Identity[] | null> => {
    const sb = createSupabaseBrowserClient();
    try {
      const rows = await fetchIdentities(sb);
      setIdentities(rows);
      return rows;
    } catch {
      // backend unreachable — leave as-is rather than mis-gating
      return null;
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

  // mirror onboarded into a durable device flag so the next cold load can decide,
  // synchronously and before paint, to lead with the welcome-back (see layout.tsx).
  useEffect(() => {
    if (!onboarded) return;
    try {
      window.localStorage.setItem(ONBOARDED_FLAG, '1');
    } catch {
      /* private mode — the returning-user effect below is the fallback */
    }
  }, [onboarded]);

  // eligible for the gentle after-browsing nudge — has a session, hasn't set up
  // their selves yet, and hasn't dismissed the prompt before.
  const personalizeEligible =
    authReady && !!user && identities !== null && identities.length < 2 && !personalizeDismissed;

  const triggerWelcome = useCallback((firstTime: boolean) => {
    welcomeLatch.current = true;
    try {
      window.sessionStorage.setItem(WELCOME_LATCH, '1');
    } catch {
      /* private mode — fine, the in-memory ref still latches */
    }
    setWelcome({ firstTime });
  }, []);

  const clearWelcome = useCallback(() => setWelcome(null), []);

  // returning user: queue the "welcome back" overlay once per session.
  // the latch ref short-circuits re-runs (user is a fresh object each auth
  // event); a just-onboarded user is already latched by triggerWelcome(true).
  useEffect(() => {
    if (!authReady || !user || !onboarded) return;
    if (welcomeLatch.current) return;
    let shown = false;
    try {
      shown = window.sessionStorage.getItem(WELCOME_LATCH) === '1';
    } catch {
      /* ignore */
    }
    welcomeLatch.current = true;
    if (shown) return;
    try {
      window.sessionStorage.setItem(WELCOME_LATCH, '1');
    } catch {
      /* ignore */
    }
    setWelcome({ firstTime: false });
  }, [authReady, user, onboarded]);

  const openPersonalize = useCallback((intent: 'browse' | 'compose' = 'browse') => {
    composeAfterPersonalize.current = intent === 'compose';
    setPersonalizeOpen(true);
  }, []);

  const dismissPersonalize = useCallback(() => {
    composeAfterPersonalize.current = false;
    setPersonalizeOpen(false);
    setPersonalizeDismissed(true);
    try {
      window.localStorage.setItem(PERSONALIZE_DISMISSED, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const openCompose = useCallback(
    (req?: Partial<ComposeRequest>) => {
      // posting needs a title (an identity for the world). if they haven't set
      // one up yet, ask for it first — the same optional prompt, now required
      // for this action — then continue into compose.
      if (!onboarded) {
        openPersonalize('compose');
        return;
      }
      setCompose({ mode: req?.mode ?? modeRef.current, ...req });
    },
    [onboarded, openPersonalize],
  );

  const completePersonalize = useCallback(() => {
    const resumeCompose = composeAfterPersonalize.current;
    composeAfterPersonalize.current = false;
    setPersonalizeOpen(false);
    setPersonalizeDismissed(true);
    if (resumeCompose) setCompose({ mode: modeRef.current });
  }, []);

  const closeCompose = useCallback(() => setCompose(null), []);
  const bumpFeed = useCallback(() => setFeedVersion((v) => v + 1), []);

  const signOut = useCallback(async () => {
    await createSupabaseBrowserClient().auth.signOut();
    setIdentities([]);
    welcomeLatch.current = false;
    setWelcome(null);
    try {
      window.sessionStorage.removeItem(WELCOME_LATCH);
      window.localStorage.removeItem(ONBOARDED_FLAG);
    } catch {
      /* ignore */
    }
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
      welcome,
      triggerWelcome,
      clearWelcome,
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
      personalizeOpen,
      openPersonalize,
      personalizeEligible,
      dismissPersonalize,
      completePersonalize,
      feedVersion,
      bumpFeed,
      signOut,
    }),
    [
      user, authReady, identities, onboarded, refreshIdentities,
      welcome, triggerWelcome, clearWelcome, mode, setMode,
      unread, refreshUnread, clearUnread, compose, openCompose, closeCompose,
      signInOpen, personalizeOpen, openPersonalize, personalizeEligible,
      dismissPersonalize, completePersonalize, feedVersion, bumpFeed, signOut,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
