// bridges @unsaid/tokens to CSS custom properties. each themed scope gets
// light+dark variable pairs inline; globals.css resolves them per
// prefers-color-scheme, so server-rendered markup is dark-mode-correct.
import type { CSSProperties } from 'react';
import { WORLDS, cardGradientCss, worldBgCss, type Mode } from '@unsaid/tokens';

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// sheet/panel surfaces per world (from the prototype's CommentsSheet/ComposeSheet)
const SHEET_BG: Record<Mode, [light: string, dark: string]> = {
  personal: ['#F1ECE4', '#262320'],
  professional: ['#EDF0F3', '#1C2126'],
};

/** world-scoped custom properties — spread onto a `.themed` element's style */
export function worldVars(mode: Mode): CSSProperties {
  const w = WORLDS[mode];
  return {
    '--world-bg-light': worldBgCss(mode, false),
    '--world-bg-dark': worldBgCss(mode, true),
    '--accent': w.accent,
    '--accent-soft': w.accentSoft,
    '--accent-deep': w.accentDeep,
    '--ink-light': w.ink,
    '--ink-dark': '#fff',
    '--ink-ambient-dark': w.inkDark,
    '--ink-soft-light': hexToRgba(w.ink, 0.6),
    '--ink-soft-dark': 'rgba(255,255,255,0.72)',
    '--sheet-bg-light': SHEET_BG[mode][0],
    '--sheet-bg-dark': SHEET_BG[mode][1],
  } as CSSProperties;
}

/** per-card gradient pair (deterministic from the post id, like the app) */
export function cardVars(mode: Mode, id: string): CSSProperties {
  return {
    '--card-grad-light': cardGradientCss(mode, id, false),
    '--card-grad-dark': cardGradientCss(mode, id, true),
  } as CSSProperties;
}
