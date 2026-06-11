// No-op-safe wrappers around PostHog + Sentry.
// Both stay completely dormant unless their env keys are present.
import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

let posthog: PostHog | null = null;
let sentryEnabled = false;

export function initAnalytics(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (dsn) {
    try {
      Sentry.init({ dsn, tracesSampleRate: 0.2 });
      sentryEnabled = true;
    } catch {
      sentryEnabled = false;
    }
  }

  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  if (key) {
    try {
      posthog = new PostHog(key, { host: 'https://us.i.posthog.com' });
    } catch {
      posthog = null;
    }
  }
}

export function track(event: string, properties?: Record<string, unknown>): void {
  try {
    posthog?.capture(event, properties as Parameters<PostHog['capture']>[1]);
  } catch {
    // analytics must never break the app
  }
}

export function identify(userId: string): void {
  try {
    posthog?.identify(userId);
  } catch {
    /* noop */
  }
}

export function resetAnalytics(): void {
  try {
    posthog?.reset();
  } catch {
    /* noop */
  }
}

export function captureError(error: unknown): void {
  try {
    if (sentryEnabled) Sentry.captureException(error);
  } catch {
    /* noop */
  }
}
