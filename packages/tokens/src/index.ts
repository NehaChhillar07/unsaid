// @unsaid/tokens — design tokens + shared domain types.
// Ported from the design prototype (unsaid-core.jsx). All microcopy lowercase.

export type Mode = 'personal' | 'professional';
export type MoodKey =
  | 'heavy' | 'angry' | 'confused' | 'hopeful'
  | 'lonely' | 'relieved' | 'scared' | 'proud';
export type TopicId =
  | 'work' | 'family' | 'love' | 'money'
  | 'self' | 'lonely' | 'wins' | 'future'
  | 'anxiety' | 'heartbreak' | 'grief' | 'burnout'
  | 'friends' | 'healing' | 'body' | 'masking'
  | 'home' | 'worth' | 'sleep' | 'faith'
  | 'parenting' | 'change';

export interface World {
  key: Mode;
  label: string;
  /** ambient full-screen background gradient stops, light theme */
  bgLight: [string, string, string];
  bgDark: [string, string, string];
  /** gradient angle in degrees for the ambient background */
  bgAngle: number;
  accent: string;
  accentSoft: string;
  /** deep accent used for the spill button / recap gradient end-stop */
  accentDeep: string;
  ink: string;
  inkDark: string;
  cards: [string, string][];
  cardsDark: [string, string][];
}

export const WORLDS: Record<Mode, World> = {
  personal: {
    key: 'personal',
    label: 'personal',
    bgLight: ['#ECE5DC', '#E5DACE', '#DCCFC1'],
    bgDark: ['#1B1714', '#1E1A16', '#151210'],
    bgAngle: 165,
    accent: '#B06A48',
    accentSoft: '#DCC9BA',
    accentDeep: '#9C5A3C',
    ink: '#3B332B',
    inkDark: '#EDE5DC',
    cards: [
      ['#F1EAE1', '#E7DBCF'],
      ['#EEE7DC', '#E4D7C9'],
      ['#F2ECE3', '#E8DCCF'],
      ['#EDE5DA', '#E2D4C5'],
      ['#F0E9DF', '#E5D9CB'],
    ],
    cardsDark: [
      ['#3D352C', '#322B23'],
      ['#403729', '#332C25'],
      ['#3A332B', '#2F2821'],
    ],
  },
  professional: {
    key: 'professional',
    label: 'professional',
    bgLight: ['#E6E8EB', '#DCE1E7', '#D2D9E1'],
    bgDark: ['#14181C', '#171B21', '#101418'],
    bgAngle: 165,
    accent: '#5A7388',
    accentSoft: '#C5CFD9',
    accentDeep: '#43586B',
    ink: '#2B333B',
    inkDark: '#E3E7EB',
    cards: [
      ['#EAEDF0', '#DEE4EA'],
      ['#E7EBEF', '#DBE1E8'],
      ['#ECEFF2', '#E0E6EC'],
      ['#E5E9EE', '#D9E0E7'],
      ['#E9ECEF', '#DDE3E9'],
    ],
    cardsDark: [
      ['#313A43', '#283037'],
      ['#343D47', '#2A323A'],
      ['#2F3841', '#272E36'],
    ],
  },
};

export interface Mood { label: string; tint: string; glyph: string }

export const MOODS: Record<MoodKey, Mood> = {
  heavy:    { label: 'heavy',    tint: '#7A6E8E', glyph: '🫥' },
  angry:    { label: 'angry',    tint: '#B56B50', glyph: '🌶️' },
  confused: { label: 'confused', tint: '#7B8499', glyph: '🌀' },
  hopeful:  { label: 'hopeful',  tint: '#5E8B72', glyph: '🌱' },
  lonely:   { label: 'lonely',   tint: '#6E7C90', glyph: '🌙' },
  relieved: { label: 'relieved', tint: '#5E9095', glyph: '🍃' },
  scared:   { label: 'scared',   tint: '#897E92', glyph: '🫧' },
  proud:    { label: 'proud',    tint: '#B0894F', glyph: '✨' },
};
export const MOOD_LIST: MoodKey[] = [
  'heavy', 'angry', 'confused', 'hopeful', 'lonely', 'relieved', 'scared', 'proud',
];

export interface Topic { id: TopicId; label: string; glyph: string }

export const TOPICS: Topic[] = [
  { id: 'work',   label: 'work stress',   glyph: '💼' },
  { id: 'family', label: 'family',        glyph: '🏠' },
  { id: 'love',   label: 'relationships', glyph: '💌' },
  { id: 'money',  label: 'money',         glyph: '🪙' },
  { id: 'self',   label: 'identity',      glyph: '🪞' },
  { id: 'lonely', label: 'loneliness',    glyph: '🌙' },
  { id: 'wins',   label: 'small wins',    glyph: '🌟' },
  { id: 'future', label: 'the future',    glyph: '🌅' },
  { id: 'anxiety',    label: 'anxiety',             glyph: '💭' },
  { id: 'heartbreak', label: 'heartbreak',          glyph: '💔' },
  { id: 'grief',      label: 'grief',               glyph: '🕯️' },
  { id: 'burnout',    label: 'burnout',             glyph: '🔋' },
  { id: 'friends',    label: 'friendships',         glyph: '🫂' },
  { id: 'healing',    label: 'healing',             glyph: '🌱' },
  { id: 'body',       label: 'my body',             glyph: '🪷' },
  { id: 'masking',    label: "pretending i'm fine", glyph: '🎭' },
  { id: 'home',       label: 'homesickness',        glyph: '🧳' },
  { id: 'worth',      label: 'feeling not enough',  glyph: '🪶' },
  { id: 'sleep',      label: "can't sleep",         glyph: '🌃' },
  { id: 'faith',      label: 'faith & doubt',       glyph: '✨' },
  { id: 'parenting',  label: 'parenting',           glyph: '🍼' },
  { id: 'change',     label: 'change',              glyph: '🍃' },
];

export const POST_MAX_CHARS = 280;
export const COMMENT_MAX_CHARS = 280;
export const FELT_MILESTONES = [1, 10, 50, 100, 500, 1000] as const;

// swipe physics, shared by mobile + web card engines (from unsaid-feed.jsx)
export const SWIPE = {
  commitPx: 92,
  velocityThreshold: 0.45, // px/ms
  maxRotationDeg: 15,
  rotationFactor: 0.09,
  swipeUpPx: 78,
} as const;

// ── gradient helpers ──────────────────────────────────────────

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export interface CardGradient { colors: [string, string]; angle: number }

/** deterministic soft gradient for a card, picked from the active world's family */
export function cardGradient(world: Mode, id: string, dark: boolean): CardGradient {
  const w = WORLDS[world];
  const set = dark ? w.cardsDark : w.cards;
  const h = hashId(id);
  // modulo keeps the index in range; assert for noUncheckedIndexedAccess consumers
  const colors = set[h % set.length] as [string, string];
  return { colors, angle: 115 + (h % 60) };
}

/** CSS string form, for web */
export function cardGradientCss(world: Mode, id: string, dark: boolean): string {
  const g = cardGradient(world, id, dark);
  return `linear-gradient(${g.angle}deg, ${g.colors[0]} 0%, ${g.colors[1]} 100%)`;
}

export function worldBgCss(world: Mode, dark: boolean): string {
  const w = WORLDS[world];
  const [a, b, c] = dark ? w.bgDark : w.bgLight;
  return `linear-gradient(${w.bgAngle}deg, ${a} 0%, ${b} 52%, ${c} 100%)`;
}

// ── threshold scenes (intro · explore · welcome) ──────────────
// the entry build spec's dark "threshold" palette. these three scenes stay
// dark regardless of the user's light/dark theme — cream text on warm-black.
// single source for the scene gradients + cream values used by the entry CSS
// and the components that render inside them.
export const THRESHOLD = {
  introBg: 'radial-gradient(125% 120% at 50% 32%, #241D18 0%, #1A1512 54%, #110D0B 100%)',
  exploreBg: 'radial-gradient(130% 120% at 50% 10%, #221C18 0%, #1A1512 52%, #110D0B 100%)',
  welcomeBg: 'radial-gradient(120% 120% at 50% 38%, #221C18 0%, #1A1512 52%, #120E0C 100%)',
  cream: '#F1E9DF',
  creamSoft: 'rgba(241,233,223,0.62)',
  creamFaint: 'rgba(241,233,223,0.34)',
} as const;

export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'k';
  return String(n);
}

export function relTime(iso: string, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (mins <= 0) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const h = Math.floor(mins / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

// ── crisis helplines (verify before launch; India market) ────
export const HELPLINES = [
  { name: 'Tele-MANAS', detail: 'dial 14416 · 24/7, free', tel: '14416' },
  { name: 'iCall', detail: '9152987821 · mon–sat, 8am–10pm', tel: '+919152987821' },
  { name: 'AASRA', detail: '9820466726 · 24/7', tel: '+919820466726' },
] as const;

// ── domain types (shape of the public views + function payloads) ──

export interface FeedPost {
  id: string;
  mode: Mode;
  body: string;
  mood: MoodKey | null;
  topic: TopicId | null;
  role_title: string;
  felt_count: number;
  same_count: number;
  comment_count: number;
  comments_enabled: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  body: string;
  role_title: string;
  parent_id: string | null;
  created_at: string;
}

export interface OwnPost {
  id: string;
  mode: Mode;
  body: string;
  mood: MoodKey | null;
  status: 'live' | 'hidden' | 'removed';
  felt_count: number;
  same_count: number;
  comment_count: number;
  comments_enabled: boolean;
  created_at: string;
}

export type NotificationType = 'milestone' | 'same' | 'comment';

export interface NotificationRow {
  id: string;
  mode: Mode;
  type: NotificationType;
  payload: {
    count?: number;
    post_id?: string;
    snippet?: string;
    comment_role?: string;
    comment_body?: string;
  };
  read: boolean;
  created_at: string;
}

export interface Identity {
  id: string;
  mode: Mode;
  role_title: string;
  topics: TopicId[];
}

// edge function contracts
export type PublishVerdict = 'published' | 'crisis' | 'blocked';

export interface PublishRequest {
  kind: 'post' | 'comment';
  mode: Mode;
  body: string;
  mood?: MoodKey | null;
  comments_enabled?: boolean;
  post_id?: string;        // comment path
  parent_id?: string | null;
  acknowledged_crisis?: boolean;
}

export interface PublishResponse {
  verdict: PublishVerdict;
  id?: string;
  /** kind, lowercase, on-brand copy when blocked */
  message?: string;
}

export interface RoleCheckResponse {
  ok: boolean;
  warning?: string;
}

export type ReactionType = 'felt' | 'same';
