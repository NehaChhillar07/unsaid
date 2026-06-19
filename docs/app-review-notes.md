# app review notes — unsaid (UGC checklist evidence)

prepared for apple app review. unsaid is an anonymous-expression app (user-generated content), 18+ rating. this document maps each UGC requirement (guideline 1.2) to where it lives in the build.

## demo account

magic-link email auth is the default, which review can't receive — so this one account has password auth enabled:

- email: `demo-review@unsaid.app`
- password: `UnsaidReview2026!`

sign in via "get in quietly" → the demo account bypass accepts this email+password. the account is pre-seeded with two identities (personal + professional) and a populated feed.

## 1. filtering objectionable content

every post and reply passes a pre-publish pipeline **before** it is visible to anyone:

- rule layer: crisis-language split (expression allowed w/ helplines, method/intent hard-blocked), de-anonymization guard, slur/doxx blocklist.
- ai moderation model: blocks harassment / threats / hate / sexual-minor content; stricter thresholds for replies.
- all decisions logged to `moderation_log` for audit.

to verify: try publishing "everyone at work is an idiot and i'll hurt them" → blocked with a kind message. try "i feel like giving up lately" → compassionate helpline interstitial appears first.

## 2. reporting offensive content

- long-press any card (or the ⋯ on a reply) → **report** → reasons: harassment, doxxing, self-harm method, spam, other.
- at 3 open reports content auto-hides pending human review.
- human review target: 24 hours. queue is staffed daily via the web admin dashboard.

## 3. blocking abusive users

- the same long-press sheet offers **"mute this voice"** — the author is resolved server-side (identity never exposed) and all their current and future content disappears from the reporter's feeds and reply threads, both worlds, immediately.

## 4. published contact information

- safety contact: nehachhillar07@gmail.com (also shown in app: you → anonymity & data).
- grievance officer (india it rules 2021): Neha Chhillar, nehachhillar07@gmail.com.

## 5. account deletion (guideline 5.1.1(v))

- in app: **you tab → anonymity & data → delete account** → confirmation → hard delete.
- deletes all user rows (posts, replies, reactions, saves, drafts, identities, profile) and deletes the auth user. no grace-period soft delete. (when sign-in-with-apple is added in a future native build, deletion will also revoke the Apple token per guideline 5.1.1(v).)

## 6. age gating & content rating

- 17+/18+ age rating; declared mature themes (frequent/intense mature & suggestive themes off; infrequent mild realistic discussions of personal struggles).
- onboarding asserts 18+.

## 7. privacy nutrition labels

- data collected: email address (app functionality only, **not linked to user identity for tracking**), user content. no tracking, no ads, no data sale.
- privacy policy: https://unsaid.app/legal/privacy · "what anonymous means here": https://unsaid.app/legal/anonymous

## helpful flow for a quick review pass

1. sign in with the demo account → feed loads in under a minute.
2. swipe a few cards; tap 🤍 "felt this".
3. long-press a card → report → submit; same sheet → mute this voice → card author's content disappears.
4. compose ("spill it") → type a crisis-expression sentence → see helpline interstitial.
5. you tab → anonymity & data → delete account (please don't actually delete the demo account — a second throwaway can be created with any email if needed).
