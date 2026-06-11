# unsaid

> say the thing you've never said. nobody knows it's you. everybody feels it.

Anonymous expression app — two anonymous selves (personal / professional), swipe-feed confessions, empathy-first reactions. iOS app (Expo) + shareable web (Next.js) + Supabase backend.

## Repo layout

```
apps/mobile      Expo iOS app (expo-router, Reanimated swipe feed)
apps/web         Next.js — public feed, share pages (/p/[id]), /admin moderation
packages/tokens  design tokens (worlds, moods, gradients) + shared types
packages/api     typed Supabase access layer used by both apps
supabase/        migrations, RLS, views, edge functions, seed data
docs/            privacy policy, moderation policy, App Review notes
```

## Founder TODO — day 1 (these gate the App Store timeline)

1. **Apple Developer Program** — enroll now (developer.apple.com, $99/yr). Approval takes days and is the long pole. Everything Apple-gated (Sign in with Apple, push, TestFlight) is sequenced last in the plan and starts the moment this clears.
2. **Supabase** — create a project at supabase.com → grab `Project URL`, `anon key`, `service_role key`.
3. **OpenAI API key** — platform.openai.com (the moderation endpoint we use is free).
4. **Vercel** — account for web deploys.
5. Optional but recommended: **PostHog** (analytics) + **Sentry** (crashes) accounts.
6. Domain + App Store name check (e.g. `unsaid.app`).

## Local development

```bash
pnpm install

# backend (requires Docker + supabase CLI: brew install supabase/tap/supabase)
supabase start            # local Postgres + auth + functions
supabase db reset         # applies migrations + seed (24 seeded confessions)
supabase functions serve  # edge functions with --env-file supabase/.env

# web
cp apps/web/.env.example apps/web/.env.local   # fill in supabase URL/keys
pnpm web

# mobile (iOS simulator)
cp apps/mobile/.env.example apps/mobile/.env   # fill in supabase URL/key
pnpm mobile
```

Secrets needed by edge functions (set via `supabase secrets set` in prod, `supabase/.env` locally): `OPENAI_API_KEY`. (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.)

## The anonymity invariant

`author_id` never leaves the server. Clients read posts/comments only through the
`feed_posts` / `post_comments` views (no author column), and all writes go through
edge functions so moderation and rate limits cannot be bypassed. If you add a query
or view, preserve this — it is the product.

## Safety architecture (do not "simplify" these away)

No dislike button, no DMs, no images, no public profiles, 500-char cap,
per-post replies-off switch, pre-publish moderation (rules + OpenAI), crisis
interstitial with helplines (never pure auto-block for expression), report →
auto-hide at 3 reports → human queue at `/admin`, mute-author without exposing
identity, real account deletion (incl. Apple token revocation).
