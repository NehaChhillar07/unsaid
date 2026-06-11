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

const NAMED_COMPANIES =
  /\b(google|meta|facebook|instagram|amazon|infosys|tcs|tata consultancy|deloitte|kpmg|microsoft|apple|wipro|accenture|flipkart|swiggy|zomato|paytm|phonepe|netflix|uber|ola|goldman sachs|jp ?morgan|morgan stanley|mckinsey|bcg|bain|ey|pwc|ibm|adobe|salesforce|oracle|sap|zoho|byju'?s|oyo|razorpay|cred|zerodha|freshworks|cognizant|capgemini|hcl|tech mahindra|reliance|jio|airtel)\b/i;

const NAMED_CITIES =
  /\b(gurgaon|gurugram|bangalore|bengaluru|mumbai|delhi|new delhi|noida|pune|hyderabad|chennai|kolkata|ahmedabad|jaipur|chandigarh|kochi|indore|lucknow|seattle|london|sf|san francisco|nyc|new york|austin|boston|chicago|toronto|berlin|amsterdam|dubai|singapore|sydney)\b/i;

// Indian mobile (+91 optional, starts 6-9, 10 digits) or generic intl number.
const PHONE_RX = /(\+91[\s-]?)?\b[6-9]\d{9}\b|\+\d{10,13}\b/;

const EMAIL_RX = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

const MY_NAME_RX = /\bmy name('?s| is)\s+[a-z]+/i;

// Capitalized first name immediately tied to a workplace/location preposition:
// "Rahul at Google", "Priya from Deloitte".
const NAME_AT_PLACE_RX = /\b[A-Z][a-z]{2,}\s+(at|from|in)\s+[A-Z][A-Za-z]+/;

// Targeted guessing — calling out a specific person to readers.
const TARGETED_RX =
  /\b(guess who|you know (exactly )?who you are|if you'?re reading this,? you know|i'?m talking about you)\b/i;

/** De-anon rules applied to post/comment bodies. */
export const DEANON_RULES: RuleHit[] = [
  { rule: 'deanon:company', rx: NAMED_COMPANIES },
  { rule: 'deanon:city', rx: NAMED_CITIES },
  { rule: 'deanon:phone', rx: PHONE_RX },
  { rule: 'deanon:email', rx: EMAIL_RX },
  { rule: 'deanon:my-name', rx: MY_NAME_RX },
  { rule: 'deanon:name-at-place', rx: NAME_AT_PLACE_RX },
  { rule: 'deanon:targeted', rx: TARGETED_RX },
];

/**
 * De-anon rules for role titles (role-check). Stricter than bodies: the
 * prototype guard flags ANY "at <word>" / "@ <word>" in a title, plus
 * companies and cities.
 */
export const ROLE_DEANON_RULES: RuleHit[] = [
  { rule: 'deanon:at-pattern', rx: /\b(at|@)\s+\S/i },
  { rule: 'deanon:company', rx: NAMED_COMPANIES },
  { rule: 'deanon:city', rx: NAMED_CITIES },
  { rule: 'deanon:phone', rx: PHONE_RX },
  { rule: 'deanon:email', rx: EMAIL_RX },
];

export function deanonHits(text: string, rules: RuleHit[] = DEANON_RULES): string[] {
  return rules.filter((r) => r.rx.test(text)).map((r) => r.rule);
}

// ── slurs / harassment blocklist ─────────────────────────────────────────────
// TODO(before launch): extend with a vetted multilingual slur list
// (English + Hindi/Hinglish) — sourced and reviewed, not improvised.
// Entries are matched as whole words, case-insensitive.
export const SLUR_BLOCKLIST: string[] = [];

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
