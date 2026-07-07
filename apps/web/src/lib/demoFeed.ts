import type { FeedPost, Mode } from '@unsaid/tokens';

// The explore preview shows the real anonymous feed only — no canned
// fallback confessions. When the feed is empty, the deck's end state
// invites the visitor to say theirs first.

/**
 * Turn a visitor's just-typed confession into the top card of the explore feed —
 * their unsaid, "published" into the preview. Not persisted (they haven't signed
 * in yet); the real post is created once they get in quietly.
 */
export function makeVisitorPost(mode: Mode, body: string): FeedPost {
  return {
    id: 'visitor-draft',
    mode,
    body: body.trim(),
    mood: null,
    topic: null,
    role_title: 'you',
    felt_count: 0,
    same_count: 0,
    comment_count: 0,
    comments_enabled: true,
    created_at: new Date().toISOString(),
  };
}
