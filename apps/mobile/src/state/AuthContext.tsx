import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { fetchIdentities } from '@unsaid/api';
import { handleAuthDeepLink, supabase } from '../lib/supabase';
import { identify, resetAnalytics } from '../lib/analytics';

const flagKey = (uid: string) => `unsaid:onboarded:${uid}`;

export interface AuthValue {
  session: Session | null;
  /** initial session + onboarding resolution finished */
  ready: boolean;
  onboarded: boolean;
  markOnboarded: () => Promise<void>;
  clearOnboarded: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const resolve = useCallback(async (s: Session | null) => {
    sessionRef.current = s;
    setSession(s);
    if (!s) {
      setOnboarded(false);
      setReady(true);
      resetAnalytics();
      return;
    }
    identify(s.user.id);
    try {
      const flag = await AsyncStorage.getItem(flagKey(s.user.id));
      if (flag === '1') {
        setOnboarded(true);
      } else {
        // returning user on a fresh install: identities already exist → skip onboarding
        const ids = await fetchIdentities(supabase);
        const done = ids.length >= 2;
        if (done) await AsyncStorage.setItem(flagKey(s.user.id), '1');
        setOnboarded(done);
      }
    } catch {
      setOnboarded(false);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) void resolve(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      // only re-resolve on real user change or sign-in/out (token refreshes keep state)
      const prev = sessionRef.current;
      if (prev?.user.id !== s?.user.id || (prev == null) !== (s == null)) {
        void resolve(s);
      } else {
        sessionRef.current = s;
        setSession(s);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [resolve]);

  // magic-link deep links (unsaid://auth#access_token=…)
  useEffect(() => {
    const handle = (url: string | null) => {
      if (url) void handleAuthDeepLink(url);
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  const markOnboarded = useCallback(async () => {
    const uid = sessionRef.current?.user.id;
    if (uid) await AsyncStorage.setItem(flagKey(uid), '1');
    setOnboarded(true);
  }, []);

  const clearOnboarded = useCallback(async () => {
    const uid = sessionRef.current?.user.id;
    if (uid) await AsyncStorage.removeItem(flagKey(uid));
    setOnboarded(false);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ session, ready, onboarded, markOnboarded, clearOnboarded }),
    [session, ready, onboarded, markOnboarded, clearOnboarded],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
