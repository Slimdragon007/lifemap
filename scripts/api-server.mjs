import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const INVALID_INPUT_ERROR = "Paste an email, form text, screenshot notes, or task details first.";
const MISSING_KEY_ERROR = "OPENAI_API_KEY is not configured.";
const AI_FAILURE_ERROR = "LifeMap could not analyze this yet. Try again or edit the intake.";
const DEFAULT_MODEL = "gpt-5.5";
const PORT = 8787;
const HOST = "0.0.0.0";

export async function analyzePayload(payload, env = process.env, fetchImpl = fetch) {
  const rawIntake = typeof payload?.rawIntake === "string" ? payload.rawIntake.trim() : "";
  if (!rawIntake) {
    return {
      status: 400,
      body: { ok: false, error: INVALID_INPUT_ERROR }
    };
  }

  const apiKey = typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  if (!apiKey) {
    return {
      status: 500,
      body: { ok: false, error: MISSING_KEY_ERROR }
    };
  }

  try {
    const response = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(buildOpenAiRequest(rawIntake, env.OPENAI_MODEL || DEFAULT_MODEL))
    });

    if (!response.ok) {
      return {
        status: 502,
        body: { ok: false, error: AI_FAILURE_ERROR }
      };
    }

    const responseJson = await response.json();
    const outputText = extractOutputText(responseJson);
    const parsed = JSON.parse(outputText);
    const normalized = normalizeAnalysis(parsed);

    if (!normalized) {
      return {
        status: 502,
        body: { ok: false, error: AI_FAILURE_ERROR }
      };
    }

    return {
      status: 200,
      body: { ok: true, analysis: normalized }
    };
  } catch {
    return {
      status: 502,
      body: { ok: false, error: AI_FAILURE_ERROR }
    };
  }
}

export function createApiServer(env = { ...loadEnvFiles(), ...process.env }, fetchImpl = fetch) {
  return createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    if (request.method !== "POST" || request.url !== "/api/analyze") {
      writeJson(response, 404, { ok: false, error: "Not found." });
      return;
    }

    try {
      const payload = JSON.parse(await readRequestBody(request));
      const result = await analyzePayload(payload, env, fetchImpl);
      writeJson(response, result.status, result.body);
    } catch {
      writeJson(response, 400, { ok: false, error: INVALID_INPUT_ERROR });
    }
  });
}

function buildOpenAiRequest(rawIntake, model) {
  return {
    model,
    store: false,
    input: [
      {
        role: "system",
        content:
          "You are LifeMap, an AI family admin assistant. Extract only actionable household logistics from messy emails, forms, screenshots, or pasted notes. Return empty arrays when a category is absent. Never invent private details that are not implied by the source. Keep nextActions to the three highest-leverage actions."
      },
      {
        role: "user",
        content: rawIntake
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "lifemap_analysis",
        strict: true,
        schema: lifeMapSchema
      }
    }
  };
}

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
    "sourceEvidence"
  ],
  properties: {
    dueItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "dueDate", "sourceQuote"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          dueDate: { type: "string" },
          sourceQuote: { type: "string" }
        }
      }
    },
    missingInfo: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "reason", "sourceQuote"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          reason: { type: "string" },
          sourceQuote: { type: "string" }
        }
      }
    },
    waitingOn: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "reason"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          reason: { type: "string" }
        }
      }
    },
    nextActions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "owner"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          owner: { type: "string" }
        }
      }
    },
    reminders: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "body", "status"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          body: { type: "string" },
          status: { type: "string", enum: ["Scheduled", "Needs review"] }
        }
      }
    },
    draftMessages: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "recipient", "subject", "body", "status"],
        properties: {
          id: { type: "string" },
          recipient: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
          status: { type: "string", enum: ["Scheduled", "Needs review"] }
        }
      }
    },
    sourceEvidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "type", "label", "quote"],
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          label: { type: "string" },
          quote: { type: "string" }
        }
      }
    }
  }
};

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
    sourceEvidence
  };
}

function parseDueItem(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return readObject(value, ["id", "title", "dueDate", "sourceQuote"]);
}

function parseMissingInfo(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return readObject(value, ["id", "label", "reason", "sourceQuote"]);
}

function parseWaitingOn(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return readObject(value, ["id", "name", "reason"]);
}

function parseNextAction(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return readObject(value, ["id", "label", "owner"]);
}

function parseReminder(value) {
  if (!isRecord(value) || !isStatus(value.status)) {
    return undefined;
  }

  return readObject(value, ["id", "title", "body", "status"]);
}

function parseDraftMessage(value) {
  if (!isRecord(value) || !isStatus(value.status)) {
    return undefined;
  }

  return readObject(value, ["id", "recipient", "subject", "body", "status"]);
}

function parseSourceEvidence(value) {
  if (!isRecord(value)) {
    return undefined;
  }

  return readObject(value, ["id", "type", "label", "quote"]);
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

function readRequestBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        rejectBody(new Error("Request too large"));
      }
    });

    request.on("end", () => resolveBody(body));
    request.on("error", rejectBody);
  });
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function writeJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function loadEnvFiles() {
  return [".env.local", ".env"].reduce((env, filename) => {
    try {
      return { ...env, ...parseEnvFile(readFileSync(resolve(process.cwd(), filename), "utf8")) };
    } catch {
      return env;
    }
  }, {});
}

function parseEnvFile(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const isCli = fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  createApiServer().listen(PORT, HOST, () => {
    console.log(`LifeMap API server listening on http://${HOST}:${PORT}`);
  });
}
