// _shared/moderation.ts — semantic moderation second pass.
//
// Primary: Groq (card-free) running a policy-based safety classifier
// (gpt-oss-safeguard) — catches harm phrased cleverly, in English or
// Hinglish, that the keyword rules can't. Fallback: OpenAI Moderation API.
// If neither key is set (or the call fails), we PASS — the rule layer
// (crisis / de-anon / slurs) already ran. Every skip is recorded.

export interface ModerationResult {
  flagged: boolean;
  /** provider:category strings that tripped (for the moderation log) */
  blocks: string[];
  /** raw scores, when the provider returns them */
  scores: Record<string, number>;
  /** true when no provider ran or the call failed open */
  skipped: boolean;
  provider: 'groq' | 'openai' | 'none';
}

// unsaid's moderation philosophy, handed to the classifier as its rubric.
// The whole point of the app is raw feeling — so sadness, despair, anger,
// profanity and venting are explicitly ALLOWED. Self-harm expression is
// handled separately by the crisis rule layer (helplines), NOT here, so we
// don't block it. This layer only catches harm aimed OUTWARD or illegal.
const POLICY = `You moderate anonymous confessions on "unsaid", a mental-health
venting app. People come here to admit things they can't say out loud, often in
English, Hindi, or Hinglish (romanized Hindi).

ALLOW (do NOT block) — this is the product working as intended:
- sadness, grief, loneliness, despair, hopelessness, feeling worthless
- anger, jealousy, pettiness, spite, guilt, shame, ugly honest feelings
- ordinary profanity and swearing used to vent (gaali while venting is fine)
- confessions of the person's own past mistakes, affairs, lies, secrets
- dark humour about the person's own life
- self-harm or suicidal FEELINGS (a separate system handles these with care)

BLOCK only genuinely harmful content:
- threats or incitement of violence toward a specific other person or group
- hate: slurs or dehumanization targeting a protected group (caste, religion,
  race, gender, sexuality, disability)
- targeted harassment or bullying naming/identifying a real person to attack
- sexual content involving minors (block hard, always)
- explicit sexual content or solicitation
- instructions or solicitation for serious illegal acts (buying/selling drugs
  or weapons, making a bomb, credit-card fraud, hacking a specific target)
- doxxing: sharing someone else's private identifying info to expose them

Respond with ONLY a compact JSON object, no prose:
{"block": true|false, "category": "<one short reason, or empty>"}`;

async function callGroq(text: string): Promise<ModerationResult | null> {
  const key = Deno.env.get('GROQ_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-safeguard-20b',
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: POLICY },
          { role: 'user', content: `CONFESSION:\n${text}` },
        ],
      }),
    });
    if (!res.ok) {
      console.error(`[moderation] groq ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw) as { block?: boolean; category?: string };
    const block = parsed.block === true;
    return {
      flagged: block,
      blocks: block ? [`groq:${(parsed.category || 'unsafe').slice(0, 40)}`] : [],
      scores: {},
      skipped: false,
      provider: 'groq',
    };
  } catch (e) {
    console.error(`[moderation] groq call failed: ${e}`);
    return null;
  }
}

// Per-kind OpenAI score thresholds — comments are stricter than posts.
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

async function callOpenAI(text: string, kind: 'post' | 'comment'): Promise<ModerationResult | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text }),
    });
    if (!res.ok) {
      console.error(`[moderation] openai ${res.status}: ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const result = data?.results?.[0];
    const scores = (result?.category_scores ?? {}) as Record<string, number>;
    const limits = THRESHOLDS[kind];
    const blocks: string[] = [];
    for (const [category, limit] of Object.entries(limits)) {
      if ((scores[category] ?? 0) > limit) blocks.push(`openai:${category}`);
    }
    return { flagged: blocks.length > 0, blocks, scores, skipped: false, provider: 'openai' };
  } catch (e) {
    console.error(`[moderation] openai call failed: ${e}`);
    return null;
  }
}

/**
 * Semantic moderation: Groq first (card-free), OpenAI fallback, else pass.
 * Fails open on any error — the rule layer already guarded the obvious cases.
 */
export async function moderateText(text: string, kind: 'post' | 'comment'): Promise<ModerationResult> {
  const groq = await callGroq(text);
  if (groq) return groq;
  const openai = await callOpenAI(text, kind);
  if (openai) return openai;
  return { flagged: false, blocks: [], scores: {}, skipped: true, provider: 'none' };
}
