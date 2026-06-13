const INVALID_INPUT_ERROR =
  "Paste an email, form text, screenshot notes, or task details first.";
const MISSING_KEY_ERROR = "OPENAI_API_KEY is not configured.";
const AI_FAILURE_ERROR =
  "LifeMap could not analyze this yet. Try again or edit the intake.";
const DEFAULT_MODEL = "gpt-5.5";

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true, service: "lifemap-api" }, 200, corsHeaders);
    }

    if (
      request.method !== "POST" ||
      !["/api/analyze", "/api/classify", "/api/brief"].includes(url.pathname)
    ) {
      return jsonResponse(
        { ok: false, error: "Not found." },
        404,
        corsHeaders,
      );
    }

    try {
      const payload = await request.json();
      const result =
        url.pathname === "/api/classify"
          ? await classifyPayload(payload, env)
          : url.pathname === "/api/brief"
            ? await generateBriefPayload(payload, env)
            : await analyzePayload(payload, env);

      return jsonResponse(result.body, result.status, corsHeaders);
    } catch {
      return jsonResponse(
        { ok: false, error: INVALID_INPUT_ERROR },
        400,
        corsHeaders,
      );
    }
  },
};

async function analyzePayload(payload, env, fetchImpl = fetch) {
  const rawIntake =
    typeof payload?.rawIntake === "string" ? payload.rawIntake.trim() : "";
  if (!rawIntake) {
    return {
      status: 400,
      body: { ok: false, error: INVALID_INPUT_ERROR },
    };
  }

  return callOpenAi({
    bodyKey: "analysis",
    env,
    fetchImpl,
    normalizer: normalizeAnalysis,
    requestBody: buildOpenAiRequest(
      rawIntake,
      env.OPENAI_MODEL || DEFAULT_MODEL,
    ),
  });
}

async function classifyPayload(payload, env, fetchImpl = fetch) {
  const rawDump =
    typeof payload?.rawDump === "string" ? payload.rawDump.trim() : "";
  if (!rawDump) {
    return { status: 400, body: { ok: false, error: INVALID_INPUT_ERROR } };
  }

  return callOpenAi({
    bodyKey: "result",
    env,
    fetchImpl,
    normalizer: normalizeMentalLoad,
    requestBody: buildClassifyRequest(rawDump, env.OPENAI_MODEL || DEFAULT_MODEL),
  });
}

async function generateBriefPayload(payload, env, fetchImpl = fetch) {
  const analysis = normalizeAnalysis(payload?.analysis);
  if (!analysis) {
    return { status: 400, body: { ok: false, error: INVALID_INPUT_ERROR } };
  }

  return callOpenAi({
    bodyKey: "brief",
    env,
    fetchImpl,
    normalizer: normalizeDailyBrief,
    requestBody: buildBriefRequest(analysis, env.OPENAI_MODEL || DEFAULT_MODEL),
  });
}

async function callOpenAi({ bodyKey, env, fetchImpl, normalizer, requestBody }) {
  const apiKey =
    typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  if (!apiKey) {
    return { status: 500, body: { ok: false, error: MISSING_KEY_ERROR } };
  }

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return { status: 502, body: { ok: false, error: AI_FAILURE_ERROR } };
    }

    const responseJson = await response.json();
    const outputText = extractOutputText(responseJson);
    const parsed = JSON.parse(outputText);
    const normalized = normalizer(parsed);

    if (!normalized) {
      return { status: 502, body: { ok: false, error: AI_FAILURE_ERROR } };
    }

    return { status: 200, body: { ok: true, [bodyKey]: normalized } };
  } catch {
    return { status: 502, body: { ok: false, error: AI_FAILURE_ERROR } };
  }
}

function buildOpenAiRequest(rawIntake, model) {
  return {
    model,
    store: false,
    input: [
      {
        role: "system",
        content:
          "You are LifeMap, an AI family admin assistant. Extract only actionable household logistics from messy emails, forms, screenshots, or pasted notes. Return empty arrays when a category is absent. Never invent private details that are not implied by the source. Keep nextActions to the three highest-leverage actions.",
      },
      { role: "user", content: rawIntake },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lifemap_analysis",
        strict: true,
        schema: lifeMapSchema,
      },
    },
  };
}

function buildClassifyRequest(rawDump, model) {
  return {
    model,
    store: false,
    input: [
      {
        role: "system",
        content:
          "You are LifeMap. The user is dumping everything on their mind. Split it into distinct items — one item per discrete thought, never merge unrelated thoughts. For each item set a type and a recommendation from the allowed enums, estimate emotionalWeight 0 (light) to 5 (heavy), and put the exact supporting text from the dump in sourceQuote. Never invent items that are not present in the dump.",
      },
      { role: "user", content: rawDump },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lifemap_mental_load",
        strict: true,
        schema: mentalLoadSchema,
      },
    },
  };
}

function buildBriefRequest(analysis, model) {
  return {
    model,
    store: false,
    input: [
      {
        role: "system",
        content:
          "You are LifeMap, a calm operator for overloaded adults. Create a daily brief from the current LifeMap analysis only. Keep topPriorities to the three highest-leverage actions, preserve approval-gated suggested messages, name open loops clearly, and never invent events, dates, or sent messages.",
      },
      { role: "user", content: JSON.stringify(analysis) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lifemap_daily_brief",
        strict: true,
        schema: dailyBriefSchema,
      },
    },
  };
}

const LOAD_ITEM_TYPES = [
  "task",
  "decision",
  "reminder",
  "worry",
  "goal",
  "project",
  "relationship",
  "finance",
  "household",
  "health",
  "idea",
  "someday",
  "emotional-weight",
];

const RECOMMENDATIONS = [
  "do-now",
  "schedule",
  "delegate",
  "automate",
  "clarify",
  "drop",
  "park",
];

const statusSchema = { type: "string", enum: ["Scheduled", "Needs review"] };

const draftMessageSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "recipient", "subject", "body", "status"],
  properties: {
    id: { type: "string" },
    recipient: { type: "string" },
    subject: { type: "string" },
    body: { type: "string" },
    status: statusSchema,
  },
};

const dailyBriefSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "todaySummary",
    "topPriorities",
    "openLoops",
    "canWait",
    "suggestedMessages",
    "conflicts",
    "groundingNote",
  ],
  properties: {
    todaySummary: { type: "string" },
    topPriorities: {
      type: "array",
      items: objectSchema(["id", "label", "reason"]),
    },
    openLoops: {
      type: "array",
      items: objectSchema(["id", "label", "blockedBy"]),
    },
    canWait: {
      type: "array",
      items: objectSchema(["id", "label", "reason"]),
    },
    suggestedMessages: { type: "array", items: draftMessageSchema },
    conflicts: {
      type: "array",
      items: objectSchema(["id", "label", "reason"]),
    },
    groundingNote: { type: "string" },
  },
};

const mentalLoadSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "type",
          "recommendation",
          "emotionalWeight",
          "sourceQuote",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          type: { type: "string", enum: LOAD_ITEM_TYPES },
          recommendation: { type: "string", enum: RECOMMENDATIONS },
          emotionalWeight: { type: "integer", minimum: 0, maximum: 5 },
          sourceQuote: { type: "string" },
        },
      },
    },
  },
};

const lifeMapSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "dueItems",
    "missingInfo",
    "waitingOn",
    "nextActions",
    "reminders",
    "draftMessages",
    "sourceEvidence",
  ],
  properties: {
    dueItems: {
      type: "array",
      items: objectSchema(["id", "title", "dueDate", "sourceQuote"]),
    },
    missingInfo: {
      type: "array",
      items: objectSchema(["id", "label", "reason", "sourceQuote"]),
    },
    waitingOn: {
      type: "array",
      items: objectSchema(["id", "name", "reason"]),
    },
    nextActions: {
      type: "array",
      items: objectSchema(["id", "label", "owner"]),
    },
    reminders: {
      type: "array",
      items: {
        ...objectSchema(["id", "title", "body", "status"]),
        properties: {
          ...objectSchema(["id", "title", "body"]).properties,
          status: statusSchema,
        },
      },
    },
    draftMessages: { type: "array", items: draftMessageSchema },
    sourceEvidence: {
      type: "array",
      items: objectSchema(["id", "type", "label", "quote"]),
    },
  },
};

function objectSchema(keys) {
  return {
    type: "object",
    additionalProperties: false,
    required: keys,
    properties: Object.fromEntries(
      keys.map((key) => [key, { type: "string" }]),
    ),
  };
}

function extractOutputText(responseJson) {
  if (typeof responseJson?.output_text === "string") {
    return responseJson.output_text;
  }

  const text = responseJson?.output
    ?.flatMap((item) => item?.content ?? [])
    ?.find((content) => typeof content?.text === "string")?.text;

  if (typeof text !== "string") {
    throw new Error("No output text");
  }

  return text;
}

function normalizeMentalLoad(value) {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return undefined;
  }
  const items = value.items.map(parseLoadItem);
  return items.every((item) => item !== undefined) ? { items } : undefined;
}

function parseLoadItem(value) {
  if (!isRecord(value)) {
    return undefined;
  }
  const base = readObject(value, [
    "id",
    "title",
    "type",
    "recommendation",
    "sourceQuote",
  ]);
  if (
    !base ||
    !LOAD_ITEM_TYPES.includes(base.type) ||
    !RECOMMENDATIONS.includes(base.recommendation)
  ) {
    return undefined;
  }
  const weight =
    typeof value.emotionalWeight === "number" &&
    !Number.isNaN(value.emotionalWeight)
      ? Math.max(0, Math.min(5, Math.round(value.emotionalWeight)))
      : 0;
  return { ...base, emotionalWeight: weight };
}

function normalizeAnalysis(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  const dueItems = parseArray(value.dueItems, parseDueItem);
  const missingInfo = parseArray(value.missingInfo, parseMissingInfo);
  const waitingOn = parseArray(value.waitingOn, parseWaitingOn);
  const nextActions = parseArray(value.nextActions, parseNextAction);
  const reminders = parseArray(value.reminders, parseReminder);
  const draftMessages = parseArray(value.draftMessages, parseDraftMessage);
  const sourceEvidence = parseArray(value.sourceEvidence, parseSourceEvidence);

  if (
    !dueItems ||
    !missingInfo ||
    !waitingOn ||
    !nextActions ||
    !reminders ||
    !draftMessages ||
    !sourceEvidence
  ) {
    return undefined;
  }

  return {
    dueItems,
    missingInfo,
    waitingOn,
    nextActions: nextActions.slice(0, 3),
    reminders,
    draftMessages,
    sourceEvidence,
  };
}

function normalizeDailyBrief(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  const todaySummary = readRequiredString(value.todaySummary);
  const topPriorities = parseArray(value.topPriorities, parsePriority);
  const openLoops = parseArray(value.openLoops, parseOpenLoop);
  const canWait = parseArray(value.canWait, parseCanWait);
  const suggestedMessages = parseArray(
    value.suggestedMessages,
    parseDraftMessage,
  );
  const conflicts = parseArray(value.conflicts, parseConflict);
  const groundingNote = readRequiredString(value.groundingNote);

  if (
    !todaySummary ||
    !topPriorities ||
    !openLoops ||
    !canWait ||
    !suggestedMessages ||
    !conflicts ||
    !groundingNote
  ) {
    return undefined;
  }

  return {
    todaySummary,
    topPriorities: topPriorities.slice(0, 3),
    openLoops,
    canWait,
    suggestedMessages,
    conflicts,
    groundingNote,
  };
}

function parsePriority(value) {
  return isRecord(value) ? readObject(value, ["id", "label", "reason"]) : undefined;
}

function parseOpenLoop(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "blockedBy"])
    : undefined;
}

function parseCanWait(value) {
  return isRecord(value) ? readObject(value, ["id", "label", "reason"]) : undefined;
}

function parseConflict(value) {
  return isRecord(value) ? readObject(value, ["id", "label", "reason"]) : undefined;
}

function parseDueItem(value) {
  return isRecord(value)
    ? readObject(value, ["id", "title", "dueDate", "sourceQuote"])
    : undefined;
}

function parseMissingInfo(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "reason", "sourceQuote"])
    : undefined;
}

function parseWaitingOn(value) {
  return isRecord(value) ? readObject(value, ["id", "name", "reason"]) : undefined;
}

function parseNextAction(value) {
  return isRecord(value) ? readObject(value, ["id", "label", "owner"]) : undefined;
}

function parseReminder(value) {
  return isRecord(value) && isStatus(value.status)
    ? readObject(value, ["id", "title", "body", "status"])
    : undefined;
}

function parseDraftMessage(value) {
  return isRecord(value) && isStatus(value.status)
    ? readObject(value, ["id", "recipient", "subject", "body", "status"])
    : undefined;
}

function parseSourceEvidence(value) {
  return isRecord(value)
    ? readObject(value, ["id", "type", "label", "quote"])
    : undefined;
}

function readObject(value, keys) {
  const result = {};
  for (const key of keys) {
    if (typeof value[key] !== "string" || value[key].trim().length === 0) {
      return undefined;
    }
    result[key] = value[key].trim();
  }
  return result;
}

function readRequiredString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function parseArray(value, parser) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.map(parser);
  return items.every((item) => item !== undefined) ? items : undefined;
}

function isStatus(value) {
  return value === "Scheduled" || value === "Needs review";
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigin = resolveAllowedOrigin(origin, env.ALLOWED_ORIGIN);
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function resolveAllowedOrigin(origin, configuredOrigins = "*") {
  if (!origin || configuredOrigins === "*") {
    return "*";
  }

  const allowed = configuredOrigins
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return allowed.includes(origin) ? origin : allowed[0] || "*";
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
