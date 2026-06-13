// Mental-load classifier (Epic B1): generalizes the family-admin extractor into
// a brain-dump capture. Takes messy free text and produces classified life
// items. Mirrors lifemap.ts: a deterministic fallback (classifyBrainDump) for
// offline/testing, plus a defensive normalizer (normalizeMentalLoad) for AI
// output. `type` and `recommendation` are the exact enum strings used by the
// life_items CHECK constraints in supabase/migrations/0001_init.sql.

export const LOAD_ITEM_TYPES = [
  "task",
  "decision",
  "reminder",
  "worry",
  "goal",
  "project",
  "relationship",
  "finance",
  "health",
  "household",
  "idea",
  "someday",
  "emotional-weight",
] as const;
export type LoadItemType = (typeof LOAD_ITEM_TYPES)[number];

export const RECOMMENDATIONS = [
  "do-now",
  "schedule",
  "delegate",
  "automate",
  "clarify",
  "drop",
  "park",
] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export type LoadItem = {
  id: string;
  title: string;
  type: LoadItemType;
  recommendation: Recommendation;
  emotionalWeight: number; // 0 (light) – 5 (heavy)
  sourceQuote: string;
};

export type MentalLoadResult = {
  items: LoadItem[];
};

export type NormalizeMentalLoadResult =
  | { ok: true; result: MentalLoadResult }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Deterministic fallback classifier
// ---------------------------------------------------------------------------

// Keyword → type heuristics. Ordered: first match wins, so more specific /
// higher-signal categories are listed before generic ones.
const TYPE_RULES: Array<{ type: LoadItemType; pattern: RegExp }> = [
  {
    type: "worry",
    pattern:
      /\b(worried|worry|anxious|anxiety|scared|afraid|nervous|stressed|dread|overwhelmed)\b/i,
  },
  {
    type: "finance",
    pattern:
      /\b(pay|paid|bill|invoice|budget|rent|mortgage|tax|taxes|refund|insurance|\$\d)/i,
  },
  {
    type: "health",
    pattern:
      /\b(doctor|dentist|gym|workout|exercise|meds|medication|prescription|therapy|sleep|checkup)\b/i,
  },
  {
    type: "household",
    pattern:
      /\b(groceries|laundry|dishes|clean|trash|recycling|vacuum|repair|fix the|yard|dishwasher)\b/i,
  },
  {
    type: "relationship",
    pattern:
      /\b(call|text|email|message|reach out to|catch up with|apologize|thank)\b/i,
  },
  {
    type: "decision",
    pattern:
      /\b(decide|decision|whether|should i|should we|choose|choice|vs\.?|or not)\b/i,
  },
  {
    type: "reminder",
    pattern: /\b(remember to|don'?t forget|reminder|remind me)\b/i,
  },
  {
    type: "someday",
    pattern: /\b(someday|eventually|one day|at some point)\b/i,
  },
  {
    type: "idea",
    pattern: /\b(idea|what if|maybe i could|could try|brainstorm)\b/i,
  },
  {
    type: "goal",
    pattern: /\b(want to|goal|aim to|hoping to|learn|get better at|improve)\b/i,
  },
  {
    type: "project",
    pattern: /\b(build|launch|ship|project|finish the|redesign|migrate)\b/i,
  },
];

const URGENT =
  /\b(today|tonight|now|asap|urgent|by (tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|due|deadline)\b/i;
const DELEGATABLE =
  /\b(groceries|laundry|dishes|trash|recycling|pick up|drop off|schedule|book)\b/i;

function classifyType(text: string): LoadItemType {
  for (const rule of TYPE_RULES) {
    if (rule.pattern.test(text)) {
      return rule.type;
    }
  }
  return "task";
}

function recommendFor(type: LoadItemType, text: string): Recommendation {
  if (type === "worry") return "clarify";
  if (type === "decision") return "clarify";
  if (type === "someday" || type === "idea") return "park";
  if (URGENT.test(text)) return "do-now";
  if (DELEGATABLE.test(text)) return "delegate";
  if (type === "goal" || type === "project") return "schedule";
  return "schedule";
}

function weightFor(type: LoadItemType, text: string): number {
  let weight = 1;
  if (type === "worry") weight += 3;
  if (URGENT.test(text)) weight += 1;
  if (/\b(really|very|so|extremely|can'?t stop)\b/i.test(text)) weight += 1;
  return Math.min(weight, 5);
}

// Split a brain dump into candidate items: one per line, then per sentence /
// list-bullet, dropping empties and trivially short fragments.
function splitIntoCandidates(raw: string): string[] {
  return raw
    .split(/\r?\n|(?<=[.!?])\s+|\s*[•\-*]\s+|;\s+/)
    .map((part) => part.replace(/^[\s•\-*]+/, "").trim())
    .filter((part) => part.length >= 3);
}

export function classifyBrainDump(rawDump: string): MentalLoadResult {
  const candidates = splitIntoCandidates(rawDump);
  const items: LoadItem[] = candidates.map((text, index) => {
    const type = classifyType(text);
    return {
      id: `load-${index + 1}`,
      title: text.length > 120 ? `${text.slice(0, 117)}...` : text,
      type,
      recommendation: recommendFor(type, text),
      emotionalWeight: weightFor(type, text),
      sourceQuote: text,
    };
  });
  return { items };
}

// ---------------------------------------------------------------------------
// Defensive normalizer for AI output (mirrors lifemap.ts normalizeAnalysis)
// ---------------------------------------------------------------------------

export function normalizeMentalLoad(value: unknown): NormalizeMentalLoadResult {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return { ok: false, error: "LifeMap could not understand the brain dump." };
  }
  const items = value.items.map(parseLoadItem);
  if (!items.every((item): item is LoadItem => item !== undefined)) {
    return { ok: false, error: "LifeMap could not understand the brain dump." };
  }
  return { ok: true, result: { items } };
}

function parseLoadItem(value: unknown): LoadItem | undefined {
  if (!isRecord(value)) return undefined;
  const id = readString(value.id);
  const title = readString(value.title);
  const type = readType(value.type);
  const recommendation = readRecommendation(value.recommendation);
  const sourceQuote = readString(value.sourceQuote);
  const emotionalWeight = clampWeight(value.emotionalWeight);
  if (!id || !title || !type || !recommendation || !sourceQuote) {
    return undefined;
  }
  return { id, title, type, recommendation, emotionalWeight, sourceQuote };
}

function readType(value: unknown): LoadItemType | undefined {
  return typeof value === "string" &&
    (LOAD_ITEM_TYPES as readonly string[]).includes(value)
    ? (value as LoadItemType)
    : undefined;
}

function readRecommendation(value: unknown): Recommendation | undefined {
  return typeof value === "string" &&
    (RECOMMENDATIONS as readonly string[]).includes(value)
    ? (value as Recommendation)
    : undefined;
}

function clampWeight(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(5, Math.round(value)));
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
