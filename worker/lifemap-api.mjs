import { createCloudflareMailer } from "./mailer.mjs";
import {
  buildAuthUrl,
  deleteCreds,
  exchangeCode,
  googleEmailFromIdToken,
  loadCreds,
  revokeToken,
  saveCreds,
  signState,
  verifyState,
} from "./google.mjs";

const INVALID_INPUT_ERROR =
  "Paste an email, form text, screenshot notes, or task details first.";
const MISSING_KEY_ERROR = "OPENAI_API_KEY is not configured.";
const AI_FAILURE_ERROR =
  "LifeMap could not analyze this yet. Try again or edit the intake.";
const BAD_REQUEST_ERROR =
  "LifeMap could not reach the AI model. Check the OPENAI_MODEL setting and try again.";
const UNAUTHENTICATED_ERROR = "Please sign in again to send.";
const SEND_FAILURE_ERROR = "LifeMap could not send this email. Try again.";
const RATE_LIMIT_ERROR =
  "Too many requests. Please wait a moment and try again.";
const DEFAULT_MODEL = "gpt-5.5";

// AI routes are unauthenticated and proxy OpenAI, so they are the abuse surface.
const RATE_LIMITED_PATHS = ["/api/analyze", "/api/classify", "/api/brief"];

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse(
        { ok: true, service: "lifemap-api" },
        200,
        corsHeaders,
      );
    }

    if (url.pathname.startsWith("/api/google/")) {
      return handleGoogleRoute(url, request, env, corsHeaders);
    }

    if (
      request.method !== "POST" ||
      !["/api/analyze", "/api/classify", "/api/brief", "/api/send"].includes(
        url.pathname,
      )
    ) {
      return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
    }

    if (RATE_LIMITED_PATHS.includes(url.pathname)) {
      const allowed = await enforceRateLimit(request, env);
      if (!allowed) {
        return jsonResponse(
          { ok: false, error: RATE_LIMIT_ERROR },
          429,
          corsHeaders,
        );
      }
    }

    try {
      const payload = await request.json();
      let result;
      if (url.pathname === "/api/send") {
        result = await sendPayload({
          payload,
          authHeader: request.headers.get("Authorization"),
          env,
          mailer: createCloudflareMailer(env.EMAIL),
        });
      } else if (url.pathname === "/api/classify") {
        result = await classifyPayload(payload, env);
      } else if (url.pathname === "/api/brief") {
        result = await generateBriefPayload(payload, env);
      } else {
        result = await analyzePayload(payload, env);
      }

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

export async function analyzePayload(payload, env, fetchImpl = fetch) {
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

export async function classifyPayload(payload, env, fetchImpl = fetch) {
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
    requestBody: buildClassifyRequest(
      rawDump,
      env.OPENAI_MODEL || DEFAULT_MODEL,
    ),
  });
}

export async function generateBriefPayload(payload, env, fetchImpl = fetch) {
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

// Returns true if the request may proceed, false if it is over the limit.
// Fails open when the binding is absent (older deploy / local dev without the
// binding) so we never block real users on a missing config.
export async function enforceRateLimit(request, env) {
  const limiter = env?.AI_RATE_LIMITER;
  if (!limiter || typeof limiter.limit !== "function") {
    return true;
  }
  const key = request.headers.get("CF-Connecting-IP") || "unknown";
  try {
    const { success } = await limiter.limit({ key });
    return success !== false;
  } catch {
    // A limiter outage should not take down the endpoint.
    return true;
  }
}

async function verifySupabaseUser(authHeader, env, fetchImpl) {
  const token =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
  if (!token) {
    return { ok: false };
  }
  const response = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY,
    },
  });
  if (!response.ok) {
    return { ok: false };
  }
  const user = await response.json();
  return user && typeof user.id === "string"
    ? { ok: true, token, id: user.id, email: user.email }
    : { ok: false };
}

async function recordSentMessage({ env, userToken, row, fetchImpl }) {
  const response = await fetchImpl(
    `${env.SUPABASE_URL}/rest/v1/sent_messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        apikey: env.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    },
  );
  if (!response.ok) {
    return { ok: false };
  }
  const created = await response.json();
  return { ok: true, id: Array.isArray(created) ? created[0]?.id : undefined };
}

export async function sendPayload({
  payload,
  authHeader,
  env,
  mailer,
  fetchImpl = fetch,
  recordImpl,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }

  const to = typeof payload?.to === "string" ? payload.to.trim() : "";
  const subject = typeof payload?.subject === "string" ? payload.subject : "";
  const body = typeof payload?.body === "string" ? payload.body : "";
  if (!to || !to.includes("@") || !subject || !body) {
    return { status: 400, body: { ok: false, error: INVALID_INPUT_ERROR } };
  }

  const sent = await mailer.sendEmail({
    to,
    from: env.SEND_FROM,
    replyTo: auth.email,
    subject,
    body,
  });

  const record = recordImpl ?? recordSentMessage;
  const row = {
    user_id: auth.id,
    draft_id: typeof payload?.draftId === "string" ? payload.draftId : "",
    recipient_email: to,
    recipient_name:
      typeof payload?.recipientName === "string" ? payload.recipientName : null,
    subject,
    body,
    reply_to: auth.email ?? null,
    provider_id: sent.ok ? sent.providerId : null,
    status: sent.ok ? "sent" : "failed",
    error: sent.ok ? null : sent.error,
  };
  const stored = await record({ env, userToken: auth.token, row, fetchImpl });

  if (!sent.ok) {
    console.error("LifeMap send failed", sent.error);
    return { status: 502, body: { ok: false, error: SEND_FAILURE_ERROR } };
  }
  if (!stored.ok) {
    // Email went out but the audit row didn't persist — never silent.
    console.error(
      "LifeMap sent_messages insert failed after a successful send",
    );
  }
  return {
    status: 200,
    body: { ok: true, id: stored.id, sentAt: new Date().toISOString() },
  };
}

async function handleGoogleRoute(url, request, env, corsHeaders) {
  const authHeader = request.headers.get("Authorization");
  if (request.method === "GET" && url.pathname === "/api/google/callback") {
    const location = await googleCallback({ requestUrl: url, env });
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: location },
    });
  }
  if (request.method === "GET" && url.pathname === "/api/google/status") {
    const result = await googleStatusPayload({ authHeader, env });
    return jsonResponse(result.body, result.status, corsHeaders);
  }
  if (request.method === "POST" && url.pathname === "/api/google/auth-url") {
    const result = await googleAuthUrlPayload({ authHeader, env });
    return jsonResponse(result.body, result.status, corsHeaders);
  }
  if (request.method === "POST" && url.pathname === "/api/google/disconnect") {
    const result = await googleDisconnectPayload({ authHeader, env });
    return jsonResponse(result.body, result.status, corsHeaders);
  }
  return jsonResponse({ ok: false, error: "Not found." }, 404, corsHeaders);
}

export async function googleAuthUrlPayload({
  authHeader,
  env,
  fetchImpl = fetch,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }
  const state = await signState(
    {
      userId: auth.id,
      nonce: crypto.randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 600,
    },
    env.GOOGLE_OAUTH_STATE_SECRET,
  );
  const url = buildAuthUrl({
    clientId: env.GOOGLE_CLIENT_ID,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    state,
  });
  return { status: 200, body: { ok: true, url } };
}

export async function googleStatusPayload({
  authHeader,
  env,
  kv = env.GOOGLE_TOKENS,
  fetchImpl = fetch,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }
  const creds = await loadCreds(kv, auth.id);
  return {
    status: 200,
    body: { ok: true, connected: Boolean(creds), email: creds?.email },
  };
}

export async function googleDisconnectPayload({
  authHeader,
  env,
  kv = env.GOOGLE_TOKENS,
  fetchImpl = fetch,
}) {
  const auth = await verifySupabaseUser(authHeader, env, fetchImpl);
  if (!auth.ok) {
    return { status: 401, body: { ok: false, error: UNAUTHENTICATED_ERROR } };
  }
  const creds = await loadCreds(kv, auth.id);
  if (creds?.refresh_token) {
    try {
      await revokeToken(creds.refresh_token, fetchImpl);
    } catch (error) {
      console.error("Google token revoke failed", error);
    }
  }
  await deleteCreds(kv, auth.id);
  return { status: 200, body: { ok: true } };
}

export async function googleCallback({
  requestUrl,
  env,
  kv = env.GOOGLE_TOKENS,
  fetchImpl = fetch,
}) {
  const appOrigin = (env.APP_ORIGIN || "").replace(/\/$/, "");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const verified = state
    ? await verifyState(state, env.GOOGLE_OAUTH_STATE_SECRET)
    : null;
  if (!code || !verified) {
    return `${appOrigin}/?google=error`;
  }

  const exchanged = await exchangeCode(
    {
      code,
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    fetchImpl,
  );
  if (!exchanged.ok) {
    console.error("Google code exchange failed", exchanged.error);
    return `${appOrigin}/?google=error`;
  }

  const tokens = exchanged.tokens;
  await saveCreds(kv, verified.userId, {
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry: Math.floor(Date.now() / 1000) + (Number(tokens.expires_in) || 0),
    email: googleEmailFromIdToken(tokens.id_token),
    scope: "calendar.events",
  });
  return `${appOrigin}/?google=connected`;
}

async function callOpenAi({
  bodyKey,
  env,
  fetchImpl,
  normalizer,
  requestBody,
}) {
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
      const detail =
        typeof response.text === "function"
          ? await response.text().catch(() => "")
          : "";
      console.error(
        `LifeMap OpenAI request failed: ${response.status} ${detail}`,
      );
      return {
        status: 502,
        body: {
          ok: false,
          error: response.status === 400 ? BAD_REQUEST_ERROR : AI_FAILURE_ERROR,
        },
      };
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
          "You are LifeMap, an AI family admin assistant. Extract only actionable household logistics from messy emails, forms, screenshots, or pasted notes. Return empty arrays when a category is absent. Never invent private details that are not implied by the source. Keep nextActions to the three highest-leverage actions. Include recipientEmail only when an email address is explicit in the source; otherwise return an empty string for it.",
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
  required: ["id", "recipient", "recipientEmail", "subject", "body", "status"],
  properties: {
    id: { type: "string" },
    recipient: { type: "string" },
    recipientEmail: { type: "string" },
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
  return isRecord(value)
    ? readObject(value, ["id", "label", "reason"])
    : undefined;
}

function parseOpenLoop(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "blockedBy"])
    : undefined;
}

function parseCanWait(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "reason"])
    : undefined;
}

function parseConflict(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "reason"])
    : undefined;
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
  return isRecord(value)
    ? readObject(value, ["id", "name", "reason"])
    : undefined;
}

function parseNextAction(value) {
  return isRecord(value)
    ? readObject(value, ["id", "label", "owner"])
    : undefined;
}

function parseReminder(value) {
  return isRecord(value) && isStatus(value.status)
    ? readObject(value, ["id", "title", "body", "status"])
    : undefined;
}

function parseDraftMessage(value) {
  if (!isRecord(value) || !isStatus(value.status)) {
    return undefined;
  }
  const base = readObject(value, ["id", "recipient", "subject", "body"]);
  if (!base) {
    return undefined;
  }
  const recipientEmail =
    typeof value.recipientEmail === "string" ? value.recipientEmail.trim() : "";
  return { ...base, recipientEmail, status: value.status };
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
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
