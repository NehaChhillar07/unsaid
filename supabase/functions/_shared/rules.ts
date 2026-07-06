// _shared/rules.ts — the free, instant rule layer.
// Ported from the design prototype (unsaid-screens.jsx CRISIS_RX,
// unsaid-onboarding.jsx de-anon guard) and expanded for production.

export type Mode = 'personal' | 'professional';
export type TopicId =
  | 'work' | 'family' | 'love' | 'money'
  | 'self' | 'lonely' | 'wins' | 'future';

export const POST_MAX_CHARS = 500;
export const COMMENT_MAX_CHARS = 280;
export const FELT_MILESTONES = [1, 10, 50, 100, 500, 1000];

export const MOOD_KEYS = [
  'heavy', 'angry', 'confused', 'hopeful',
  'lonely', 'relieved', 'scared', 'proud',
];

// ── crisis ───────────────────────────────────────────────────────────────────
// Expression of crisis feelings → NOT blocked; the client shows the
// CrisisSheet (helplines) and may resubmit with acknowledged_crisis: true.
// Prototype source: unsaid-screens.jsx:108 CRISIS_RX, expanded.
export const CRISIS_EXPRESSION_RX =
  /\b(kill(ing)? myself|end(ing)? it all|don'?t want to (be here|live|exist)|hurt(ing)? myself|suicid\w*|self[- ]?harm\w*|take my (own )?life|no reason to (live|keep going)|better off without me|better off dead|can'?t (go on|do this anymore)|want to disappear (forever|for good)|wish i (was|were)n'?t (here|alive)|wish i was dead|tired of being alive)\b/i;

// Method / intent / plan → HARD BLOCK, always, regardless of acknowledgement.
export const CRISIS_METHOD_RX =
  /\b(how (to|do i|can i) (die|kill myself|end it|end my life|overdose)|overdos(e|ing) on \w+|(pills|sleeping pills) (to|so i can) (end|die|sleep forever)|hang(ing)? myself|jump(ing)? (off|from) (a|the|this)|slit(ting)? my wrists?|cut(ting)? my wrists?|tonight (i|i'?ll| i will) (end|do) it|i('| a)m (going to|gonna) (end|kill) (it|myself) (tonight|today|tomorrow)|this is (my )?goodbye|goodbye note|suicide note|by the time you read this|bought (a rope|the pills|a blade|a gun)|loaded (gun|pistol)|carbon monoxide)\b/i;

// ── de-anonymization guard ───────────────────────────────────────────────────
// Ported from unsaid-onboarding.jsx guard(), expanded. Each entry has a tag
// for moderation_log rule_hits.

export interface RuleHit {
  rule: string;
  rx: RegExp;
}

// Company detection is the #1 false-positive source: many brand names are also
// everyday words (apple, meta, cred, ola, sap, ey, bain, oracle, reliance, jio)
// and even distinctive ones double as verbs ("google it"). So in post BODIES we
// only flag a company when it sits in an employment/affiliation CONTEXT, never bare.
//
// Two tiers:
//  - DISTINCTIVE: rarely innocent as a bare word, flagged after a light context
//    (`at`/`@`/`work(ed/ing) at|for`/`joined`/`employed`/`intern`/`hired`/`job at`).
//  - AMBIGUOUS: common English words; flagged ONLY after a strong work verb, so
//    "apple of my eye" / "good at apple picking" / "for apple pie" all pass.
const DISTINCTIVE_COMPANIES = [
  'google', 'facebook', 'instagram', 'amazon', 'infosys', 'tcs', 'tata consultancy',
  'deloitte', 'kpmg', 'microsoft', 'wipro', 'accenture', 'flipkart', 'swiggy', 'zomato',
  'paytm', 'phonepe', 'netflix', 'uber', 'goldman sachs', 'jp ?morgan', 'morgan stanley',
  'mckinsey', 'pwc', 'ibm', 'adobe', 'salesforce', 'zoho', "byju'?s", 'oyo', 'razorpay',
  'zerodha', 'freshworks', 'cognizant', 'capgemini', 'hcl', 'tech mahindra', 'airtel',
];
const AMBIGUOUS_COMPANIES = [
  'apple', 'meta', 'ola', 'sap', 'cred', 'ey', 'bain', 'oracle', 'reliance', 'jio', 'bcg',
];

// light context for distinctive brands
const DISTINCTIVE_CTX =
  '(?:at|@|joined|(?:works?|worked|working|employed|interning|intern|hired)\\s+(?:at|for|by|with)|job\\s+(?:at|with))';
// strong work-only context for common-word brands
const AMBIGUOUS_CTX =
  '(?:works?|worked|working|employed|interning|intern|hired|job)\\s+(?:at|for|by|with)';
const ARTICLE = '(?:a |an |the )?';

const COMPANY_DISTINCTIVE_RX = new RegExp(
  `\\b${DISTINCTIVE_CTX}\\s+${ARTICLE}(?:${DISTINCTIVE_COMPANIES.join('|')})\\b`,
  'i',
);
const COMPANY_AMBIGUOUS_RX = new RegExp(
  `\\b${AMBIGUOUS_CTX}\\s+${ARTICLE}(?:${AMBIGUOUS_COMPANIES.join('|')})\\b`,
  'i',
);

// "austin" intentionally omitted (collides with the common first name);
// sf/boston/chicago kept — distinctive enough as whole words.
const NAMED_CITIES =
  /\b(gurgaon|gurugram|bangalore|bengaluru|mumbai|delhi|new delhi|noida|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|chandigarh|kochi|indore|lucknow|seattle|london|sf|san francisco|nyc|new york|boston|chicago|toronto|berlin|amsterdam|dubai|singapore|sydney)\b/i;

// Indian mobile (+91 optional, starts 6-9, 10 digits) or generic intl number.
const PHONE_RX = /(\+91[\s-]?)?\b[6-9]\d{9}\b|\+\d{10,13}\b/;

const EMAIL_RX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const MY_NAME_RX = /\bmy name('?s| is)\s+[a-z]+/i;

// "<Name> at/from <Company>" — anchored to a KNOWN company so ordinary
// "Monday at Office" / "Yesterday in Therapy" no longer match, AND the leading
// word must be genuinely Capitalized in the source (a real name). We can't use a
// case-sensitive [A-Z] anchor together with case-insensitive company matching in
// one flagged regex, so the capitalization is verified in code below.
const NAME_AT_COMPANY_RX = new RegExp(
  `\\b([A-Za-z][a-z]{2,})\\s+(?:at|from)\\s+${ARTICLE}(?:${DISTINCTIVE_COMPANIES.join('|')}|${AMBIGUOUS_COMPANIES.join('|')})\\b`,
  'gi',
);

function nameAtCompanyHit(text: string): boolean {
  NAME_AT_COMPANY_RX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NAME_AT_COMPANY_RX.exec(text)) !== null) {
    const name = m[1];
    // require a real uppercase first letter (defeats "good at apple picking")
    if (name[0] !== name[0].toLowerCase()) return true;
  }
  return false;
}

// Targeted guessing — calling out a specific person to readers.
const TARGETED_RX =
  /\b(guess who|you know (exactly )?who you are|if you'?re reading this,? you know|i'?m talking about you)\b/i;

/** De-anon rules applied to post/comment bodies (regex-based subset). */
export const DEANON_RULES: RuleHit[] = [
  { rule: 'deanon:company', rx: COMPANY_DISTINCTIVE_RX },
  { rule: 'deanon:company', rx: COMPANY_AMBIGUOUS_RX },
  { rule: 'deanon:city', rx: NAMED_CITIES },
  { rule: 'deanon:phone', rx: PHONE_RX },
  { rule: 'deanon:email', rx: EMAIL_RX },
  { rule: 'deanon:my-name', rx: MY_NAME_RX },
  { rule: 'deanon:targeted', rx: TARGETED_RX },
];

// Bare company list for role titles only (short identity labels — low FP risk,
// and role-check is advisory). Kept separate from the body tiers above.
const ROLE_COMPANY_RX = new RegExp(
  `\\b(?:${DISTINCTIVE_COMPANIES.join('|')}|${AMBIGUOUS_COMPANIES.join('|')})\\b`,
  'i',
);

/**
 * De-anon rules for role titles (role-check). Stricter than bodies: the
 * prototype guard flags ANY "at <word>" / "@ <word>" in a title, plus
 * companies and cities.
 */
export const ROLE_DEANON_RULES: RuleHit[] = [
  { rule: 'deanon:at-pattern', rx: /\b(at|@)\s+\S/i },
  { rule: 'deanon:company', rx: ROLE_COMPANY_RX },
  { rule: 'deanon:city', rx: NAMED_CITIES },
  { rule: 'deanon:phone', rx: PHONE_RX },
  { rule: 'deanon:email', rx: EMAIL_RX },
];

export function deanonHits(text: string, rules: RuleHit[] = DEANON_RULES): string[] {
  const hits = rules.filter((r) => r.rx.test(text)).map((r) => r.rule);
  // capitalization-aware "<Name> at <Company>" — only for post/comment bodies
  if (rules === DEANON_RULES && nameAtCompanyHit(text)) hits.push('deanon:name-at-company');
  return [...new Set(hits)];
}

// ── slurs / harassment blocklist ─────────────────────────────────────────────
// Interim, conservative baseline of unambiguous IDENTITY-BASED hate slurs
// (racial · ethnic · casteist/communal · homophobic/transphobic · ableist),
// matched as WHOLE WORDS, case-insensitive (see slurHits below).
//
// Scope is deliberate and matches unsaid's philosophy: raw emotion and profanity
// (venting) are ALLOWED — this list targets hate aimed at a group, not swearing.
// Context-dependent / reclaimed terms (e.g. the a-ending variant of the n-word)
// are intentionally omitted pending review, to avoid false-positives on genuine
// venting. A slur hit yields MESSAGES.harassment (a kind reword nudge), not a ban.
//
// TODO(before scale): replace/extend with a professionally SOURCED + REVIEWED
// multilingual corpus (English + Hindi/Hinglish + regional). This baseline makes
// the filter functional at launch — it is intentionally NOT comprehensive.
export const SLUR_BLOCKLIST: string[] = [
  // racial / ethnic / antisemitic (English)
  'nigger', 'niggers', 'chink', 'chinks', 'gook', 'gooks', 'spic', 'spics',
  'wetback', 'wetbacks', 'kike', 'kikes', 'paki', 'pakis', 'raghead', 'ragheads',
  'sandnigger', 'sandniggers',
  // homophobic / transphobic
  'faggot', 'faggots', 'tranny', 'trannies',
  // ableist
  'retard', 'retards', 'retarded',
  // casteist / communal / ethnic (India — Hindi / Hinglish)
  'chamar', 'chamars', 'bhangi', 'bhangis', 'chinki', 'chinky', 'chinkis',
  'katua', 'katuas', 'landya', 'landye', 'randi', 'randis',
];

export function slurHits(text: string): string[] {
  const hits: string[] = [];
  for (const word of SLUR_BLOCKLIST) {
    const rx = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (rx.test(text)) hits.push(`slur:${word}`);
  }
  return hits;
}

// ── topic auto-tagging ───────────────────────────────────────────────────────
// First matching topic wins; null when nothing obvious.

const TOPIC_RULES: Array<[TopicId, RegExp]> = [
  ['work',   /\b(work|job|boss|manager|coworker|colleague|office|meeting|standup|deadline|promotion|laid off|layoffs?|fired|intern(ship)?|career|client|shift|workplace|hr\b)\b/i],
  ['family', /\b(family|mom|mum|dad|mother|father|parents?|sister|brother|sibling|daughter|son|grandma|grandpa|aunt|uncle|cousin)\b/i],
  ['love',   /\b(relationship|boyfriend|girlfriend|partner|my ex\b|crush|breakup|broke up|divorce|marriage|married|dating|forgave (him|her|them|someone)|someone'?s person)\b/i],
  ['money',  /\b(money|rent|salary|debt|broke\b|afford|paycheck|loan|emi|savings|runway|bills)\b/i],
  ['lonely', /\b(lonely|loneliness|alone|no one to|nobody to|isolat\w+|friendless|by myself|don'?t have anyone)\b/i],
  ['wins',   /\b(proud|sober|milestone|i did it|finally (said|did|finished|shipped)|small win|survived|first (feature|ship)|went outside today|sticker day)\b/i],
  ['future', /\b(future|figuring out|have a plan|no plan|someday|what'?s next|next year|rejected again|let down everyone)\b/i],
  ['self',   /\b(who i (really )?am|identity|the real me|version of me|pretending to be|mask|myself anymore)\b/i],
];

export function topicFor(body: string): TopicId | null {
  for (const [topic, rx] of TOPIC_RULES) {
    if (rx.test(body)) return topic;
  }
  return null;
}

// ── kind rejection copy (lowercase, on-brand) ────────────────────────────────

export const MESSAGES = {
  deanon:
    'this one would hurt someone — unsaid is for your feelings, not their name 🤍',
  crisisMethod:
    "we can't post this one. if you're in danger, please reach a helpline — they're kind and they're free 🤍",
  harassment:
    'this crosses into harm — try saying how it made you feel instead',
  rateLimited:
    "slow down a little — your words will keep. try again in a bit 🤍",
  banned:
    "this account can't post right now",
  roleWarning:
    'that might point right at you — try a broader title 🤍',
} as const;
