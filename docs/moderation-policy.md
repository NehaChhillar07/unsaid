# moderation policy

unsaid is a space for saying heavy, true things safely. that only works if the space is kept kind. this is how we keep it.

## the pipeline (every post and reply, before it goes live)

1. **rule layer (instant, on every publish).**
   - crisis language detection, split into two kinds: *expression* ("i feel like giving up") and *method/intent* (specific plans or instructions). expression is allowed with care — see the crisis protocol below. method/intent is blocked.
   - de-anonymization guard: company names, cities, phone numbers, emails, full-name patterns trigger a warning or block — protecting both the writer and third parties.
   - slur and doxxing blocklist.
2. **ai moderation layer.** every text passes an automated moderation model. content is blocked at thresholds for harassment, threats, hate, and any sexual content involving minors (zero tolerance). **replies use stricter thresholds than posts** — comments on someone's confession must be gentler than the confession itself.
3. **every decision is logged** to an internal moderation log (verdict, scores, rule hits) so we can audit our own filters — and fix them when they're wrong.

blocked content gets a kind rejection, not a scolding. we want the person to stay; we just can't carry that sentence.

## reports

- anyone can report any post or reply: harassment, doxxing, self-harm method, spam, other.
- at **3 open reports**, content is automatically hidden pending review. better safe and briefly hidden than harmful and live.
- a human reviews the report queue with a target of **24 hours**, normally much faster.
- reporting also offers "mute this voice" — you never see that author again, in either world, and they are never told.

## human review outcomes

- **dismiss** — content returns / stays live.
- **remove** — content taken down.
- **shadow** — the author's future writes are visible only to themselves while we evaluate a pattern.
- **ban** — the account can no longer write. repeat, malicious, or severe single offences.

## crisis protocol

unsaid exists precisely so people can say "i'm not okay". so:

- **expressing** pain, despair or passive ideation is allowed. the writer is shown a compassionate interstitial with real helplines first — Tele-MANAS (14416, 24/7), iCall (9152987821), AASRA (9820466726) — and may still choose to post the feeling.
- **method or intent** content (how-to, plans, encouragement of self-harm) is blocked, every time, with helplines shown.
- replies that mock or encourage self-harm on a crisis post are removed and the author is banned.

helpline numbers are re-verified before every release.

## what gets you banned

doxxing or attempting to unmask anyone. sexual content involving minors (and reported to authorities where required). credible threats. coordinated harassment. evading a previous ban.

## appeals & grievance

if your content was removed or your account restricted and you believe we got it wrong, write to appeals@unsaid.app from your sign-in email. per the it rules 2021 (india), our grievance officer is: **[name to be appointed]**, grievance@unsaid.app — acknowledgement within 24 hours, resolution within 15 days.
