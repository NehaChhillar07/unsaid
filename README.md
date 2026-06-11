# unsaid

> say the thing you've never said. nobody knows it's you. everybody feels it.

Anonymous expression app — two anonymous selves (personal / professional), swipe-feed confessions, empathy-first reactions. **Launching web-first** (Next.js PWA + Supabase backend); the finished iOS app (Expo) ships whenever an Apple Developer membership exists.

## Repo layout

```
apps/mobile      Expo iOS app (expo-router, Reanimated swipe feed)
apps/web         Next.js — public feed, share pages (/p/[id]), /admin moderation
packages/tokens  design tokens (worlds, moods, gradients) + shared types
packages/api     typed Supabase access layer used by both apps
supabase/        migrations, RLS, views, edge functions, seed data
docs/            privacy policy, moderation policy, App Review notes
```

## Founder TODO — everything below is free

1. **Supabase** — create a project at supabase.com → grab `Project URL`, `anon key`, `service_role key`. This unblocks the live deploy. In the dashboard, enable **Authentication → Sign in / up → Anonymous sign-ins** (the primary way in — no email needed; abuse is covered by the new-account rate limits + captcha option).
2. **OpenAI API key** — platform.openai.com (the moderation endpoint we use is free).
3. **Vercel** — account for web deploys (free tier; gives a `*.vercel.app` URL until there's a domain).
4. Optional but recommended: **PostHog** (analytics) + **Sentry** (crashes) accounts.
5. Later, when budget exists: Apple Developer Program ($99/yr) to ship `apps/mobile` to the App Store — it's already built. (Or ask whether Infosec Ventures' org account can publish it.)

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
