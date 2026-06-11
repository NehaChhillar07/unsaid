import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WORLDS, type Mode, type World } from '@unsaid/tokens';
import { withAlpha } from './colors';

const DARK_KEY = 'unsaid:dark-override';

export interface ThemeValue {
  world: Mode;
  setWorld: (w: Mode) => void;
  dark: boolean;
  toggleDark: () => void;
  /** false when the OS reduce-motion setting is on — fall back to fades/instant */
  motion: boolean;
  /** active world tokens */
  w: World;
  ink: string;
  inkSoft: string;
  /** translucent card surface (rows, stats, notifications) */
  surface: string;
  /** bottom-sheet surface tinted per world */
  sheetBg: string;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [world, setWorldState] = useState<Mode>('personal');
  const [override, setOverride] = useState<boolean | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(DARK_KEY).then((v) => {
      if (mounted && v != null) setOverride(v === '1');
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const dark = override ?? system === 'dark';

  const toggleDark = useCallback(() => {
    setOverride((prev) => {
      const next = !(prev ?? system === 'dark');
      void AsyncStorage.setItem(DARK_KEY, next ? '1' : '0');
      return next;
    });
  }, [system]);

  const setWorld = useCallback((w: Mode) => setWorldState(w), []);

  const value = useMemo<ThemeValue>(() => {
    const w = WORLDS[world];
    return {
      world,
      setWorld,
      dark,
      toggleDark,
      motion: !reduceMotion,
      w,
      ink: dark ? '#fff' : w.ink,
      inkSoft: dark ? 'rgba(255,255,255,0.7)' : withAlpha(w.ink, 0.6),
      surface: dark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.6)',
      sheetBg: dark
        ? world === 'personal'
          ? '#262320'
          : '#1C2126'
        : world === 'personal'
          ? '#F1ECE4'
          : '#EDF0F3',
    };
  }, [world, dark, reduceMotion, setWorld, toggleDark]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(ThemeContext);
  if (!v) throw new Error('useTheme must be used inside ThemeProvider');
  return v;
}
