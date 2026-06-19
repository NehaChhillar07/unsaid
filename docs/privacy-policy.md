# privacy policy

**unsaid** · last updated: 11 june 2026

this is written in plain words on purpose. if anything here is unclear, ask us: privacy@unsaid.app.

## the short version

you are anonymous to everyone else on unsaid, always. how anonymous you are to the database depends on how you get in:

- **slip in anonymously (the default):** we hold **no identifier at all** — no email, no name, nothing. your account is just a random id with no way to tie it back to you. the trade-off is that if you lose this device or clear the app, that account (and its posts) can't be recovered.
- **email magic link (optional):** we hold **one** identifier — the email you sign in with — purely so you can get back in on another device. we never show it to anyone, never attach it to your posts, and never sell or market with it.

either way, we never sell anything, and when you delete your account it is really gone.

## what we collect

- **an auth identifier — only if you choose email.** if you sign in with a magic link, we hold that email address so you can get back in. if you slip in anonymously, we hold no identifier at all. either way it is never shown to other users, never attached to your posts in anything anyone can read, and never used for marketing.
- **what you write.** your confessions, replies, role titles (like "overthinker, 23"), mood tags, topics, saves and drafts. role titles are labels you invent — they are not checked against anything and shouldn't contain your real name (we actively warn you if it looks like they do).
- **minimal abuse logs, briefly.** to keep the space safe we keep short-lived records: moderation decisions on content (what was blocked and why), reports you send or receive, and basic rate-limit counters. moderation logs are pruned on a short retention cycle (90 days target) and contain content verdicts, not browsing behaviour.
- **basic technical signals.** crash reports and anonymous product analytics (which screens are slow, where people drop off). these are not tied to what you confess.

## what we don't collect

no real name. no phone number (v1). no contacts. no location. no advertising identifiers. no tracking across other apps or sites.

## what other users see

a role title you chose, a mood, the words you wrote, and counts. that's it. there are no profiles, no follower lists, no public history page for a person. your personal world and professional world are never linked for anyone, including in replies.

## what we will never do

- sell or rent your data. to anyone. ever.
- show your identity to another user.
- quietly link your two worlds anywhere a human or another user can see.

## the honest part: lawful requests

if a court or law-enforcement agency with proper jurisdiction legally compels us, the most we *can* hand over is: your auth identifier **if you have one** (an email — anonymous accounts have none), your content, and timestamps. we cannot hand over what we never had — there is no real-name record, no phone number, no location trail. we will push back on overbroad requests and will be transparent about the requests we receive wherever the law allows.

## deletion really deletes

deleting your account (in your space → delete account & wipe everything) hard-deletes your posts, replies, reactions, saves, drafts, identities and profile rows, and deletes the auth user. gone means gone. we do not keep a shadow copy. backups age out on a fixed short cycle.

deleting a single post hard-deletes it the same way, along with its replies and reactions.

## age

unsaid is for adults — you must be 18 or older. if we learn an account belongs to someone under 18, we delete it.

## where your data lives

on supabase-managed infrastructure (postgres) with row-level security. write paths go through audited server functions; public reads go through views that structurally cannot expose who you are.

## grievance & contact

- privacy questions: privacy@unsaid.app
- grievance officer (it rules 2021): [name to be appointed], grievance@unsaid.app — acknowledgement within 24 hours, resolution within 15 days.

## changes

if we change this policy in any way that matters, we'll say so in the app before it takes effect, in the same plain words.
