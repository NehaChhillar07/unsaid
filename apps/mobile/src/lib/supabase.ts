// Single Supabase client for the app. All backend access flows through
// the typed helpers in @unsaid/api — never raw table writes from screens.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUnsaidClient, type UnsaidClient } from '@unsaid/api';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-anon-key';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('[unsaid] EXPO_PUBLIC_SUPABASE_URL is not set — backend calls will fail.');
}

export const supabase: UnsaidClient = createUnsaidClient({
  url,
  anonKey,
  storage: AsyncStorage,
});

/**
 * Handles the magic-link return deep link (unsaid://auth#access_token=…).
 * Supports both implicit-flow fragments and PKCE `code` query params.
 */
export async function handleAuthDeepLink(rawUrl: string): Promise<boolean> {
  try {
    const fragment = rawUrl.includes('#') ? rawUrl.split('#')[1] : '';
    const query = rawUrl.includes('?') ? rawUrl.split('?')[1]?.split('#')[0] : '';
    const params = new URLSearchParams(fragment || query || '');

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return !error;
    }

    const code = params.get('code');
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      return !error;
    }
  } catch {
    // malformed link — ignore quietly
  }
  return false;
}
