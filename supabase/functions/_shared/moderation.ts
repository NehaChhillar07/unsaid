// _shared/moderation.ts — OpenAI Moderation API wrapper.
// Free endpoint; key from OPENAI_API_KEY. If the key is unset we log a
// warning and PASS (local dev), recording rule_hits=['no-moderation-key'].

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
  /** true when OPENAI_API_KEY was missing or the API call failed open */
  skipped: boolean;
}

export async function callOpenAIModeration(text: string): Promise<ModerationResult> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) {
    console.warn('[moderation] OPENAI_API_KEY not set — passing without moderation');
    return { flagged: false, categories: {}, scores: {}, skipped: true };
  }

  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
  });

  if (!res.ok) {
    // Fail open but record it — the rule layer already ran.
    console.error(`[moderation] OpenAI API error ${res.status}: ${await res.text()}`);
    return { flagged: false, categories: {}, scores: {}, skipped: true };
  }

  const data = await res.json();
  const result = data?.results?.[0];
  return {
    flagged: Boolean(result?.flagged),
    categories: (result?.categories ?? {}) as Record<string, boolean>,
    scores: (result?.category_scores ?? {}) as Record<string, number>,
    skipped: false,
  };
}

// Per-kind score thresholds — comments are stricter than posts.
const THRESHOLDS: Record<'post' | 'comment', Record<string, number>> = {
  post: {
    'harassment': 0.5,
    'harassment/threatening': 0.5,
    'hate': 0.4,
    'hate/threatening': 0.4,
    'sexual/minors': 0.1,
    'violence': 0.7,
  },
  comment: {
    'harassment': 0.3,
    'harassment/threatening': 0.3,
    'hate': 0.25,
    'hate/threatening': 0.25,
    'sexual/minors': 0.1,
    'violence': 0.7,
  },
};

/** Returns the list of categories over threshold (empty = pass). */
export function moderationBlocks(
  result: ModerationResult,
  kind: 'post' | 'comment',
): string[] {
  const limits = THRESHOLDS[kind];
  const hits: string[] = [];
  for (const [category, limit] of Object.entries(limits)) {
    const score = result.scores[category] ?? 0;
    if (score > limit) hits.push(`openai:${category}`);
  }
  return hits;
}
