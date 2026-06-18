import { normalizeAnalysis, type LifeMapAnalysis } from "./lifemap";
import { normalizeMentalLoad, type MentalLoadResult } from "./mentalLoad";
import { normalizeDailyBrief, type DailyBrief } from "./dailyBrief";
import type { FamilyEvent } from "./familyOS";

export type AnalyzeApiResult =
  | {
      ok: true;
      analysis: LifeMapAnalysis;
    }
  | {
      ok: false;
      error: string;
    };

export type ClassifyApiResult =
  | {
      ok: true;
      result: MentalLoadResult;
    }
  | {
      ok: false;
      error: string;
    };

export type BriefApiResult =
  | {
      ok: true;
      brief: DailyBrief;
    }
  | {
      ok: false;
      error: string;
    };

const DEFAULT_ERROR =
  "LifeMap could not analyze this yet. Try again or edit the intake.";
const PRODUCTION_API_ORIGIN = "https://lifemap-api.m-haslim.workers.dev";
const PRODUCTION_PAGES_HOSTS = [
  "lifemap-d33.pages.dev",
  "app.getlifemap.com",
  "getlifemap.com",
];

export async function analyzeWithAi(
  rawIntake: string,
): Promise<AnalyzeApiResult> {
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${apiOrigin}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawIntake }),
    });
    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      return { ok: false, error: DEFAULT_ERROR };
    }

    if (payload.ok === false) {
      return { ok: false, error: readError(payload.error) };
    }

    if (payload.ok === true) {
      const normalized = normalizeAnalysis(payload.analysis);
      return normalized;
    }

    return { ok: false, error: DEFAULT_ERROR };
  } catch (error) {
    console.error("LifeMap API request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export async function classifyBrainDumpWithAi(
  rawDump: string,
): Promise<ClassifyApiResult> {
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${apiOrigin}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawDump }),
    });
    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      return { ok: false, error: DEFAULT_ERROR };
    }

    if (payload.ok === false) {
      return { ok: false, error: readError(payload.error) };
    }

    if (payload.ok === true) {
      const normalized = normalizeMentalLoad(payload.result);
      return normalized.ok ? normalized : { ok: false, error: DEFAULT_ERROR };
    }

    return { ok: false, error: DEFAULT_ERROR };
  } catch (error) {
    console.error("LifeMap API request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export async function generateBriefWithAi(
  analysis: LifeMapAnalysis,
): Promise<BriefApiResult> {
  const apiOrigin = getApiOrigin();
  if (!apiOrigin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${apiOrigin}/api/brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis }),
    });
    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      return { ok: false, error: DEFAULT_ERROR };
    }

    if (payload.ok === false) {
      return { ok: false, error: readError(payload.error) };
    }

    if (payload.ok === true) {
      const normalized = normalizeDailyBrief(payload.brief);
      return normalized.ok
        ? normalized
        : { ok: false, error: normalized.error };
    }

    return { ok: false, error: DEFAULT_ERROR };
  } catch (error) {
    console.error("LifeMap API request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export type SendDraftInput = {
  draftId: string;
  to: string;
  recipientName?: string;
  subject: string;
  body: string;
};

export type SendDraftResult =
  | { ok: true; id?: string; sentAt: string }
  | { ok: false; error: string };

export async function sendDraftEmail(
  input: SendDraftInput,
  accessToken: string,
  origin = getApiOrigin(),
): Promise<SendDraftResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${origin}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });
    const payload: unknown = await response.json();

    if (!isRecord(payload)) {
      return { ok: false, error: DEFAULT_ERROR };
    }

    if (payload.ok === true) {
      return {
        ok: true,
        id: typeof payload.id === "string" ? payload.id : undefined,
        sentAt: typeof payload.sentAt === "string" ? payload.sentAt : "",
      };
    }

    return { ok: false, error: readError(payload.error) };
  } catch (error) {
    console.error("LifeMap send request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export type DataKeyResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

// Fetches the signed-in user's per-user field-encryption key (base64) from the
// Worker. Auth-gated; the Worker derives it from a master secret via HKDF.
export async function getDataKey(
  accessToken: string,
  origin = getApiOrigin(),
): Promise<DataKeyResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${origin}/api/data-key`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: "{}",
    });
    const payload: unknown = await response.json();

    if (
      isRecord(payload) &&
      payload.ok === true &&
      typeof payload.key === "string"
    ) {
      return { ok: true, key: payload.key };
    }

    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap data-key request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export type SendFeedbackResult = { ok: true } | { ok: false; error: string };

// Sends in-app feedback to the app owner (email + Notion, server-side).
// Auth-gated so the Worker can tag who sent it.
export async function sendFeedback(
  input: { message: string; url?: string },
  accessToken: string,
  origin = getApiOrigin(),
): Promise<SendFeedbackResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }

  try {
    const response = await fetch(`${origin}/api/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    });
    const payload: unknown = await response.json();

    if (isRecord(payload) && payload.ok === true) {
      return { ok: true };
    }

    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap feedback request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export type GoogleAuthUrlResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type GoogleStatusResult =
  | { ok: true; connected: boolean; email?: string }
  | { ok: false; error: string };

export async function getGoogleAuthUrl(
  accessToken: string,
  origin = getApiOrigin(),
): Promise<GoogleAuthUrlResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/google/auth-url`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      payload.ok === true &&
      typeof payload.url === "string"
    ) {
      return { ok: true, url: payload.url };
    }
    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap google auth-url request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export async function getGoogleStatus(
  accessToken: string,
  origin = getApiOrigin(),
): Promise<GoogleStatusResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/google/status`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload: unknown = await response.json();
    if (isRecord(payload) && payload.ok === true) {
      return {
        ok: true,
        connected: payload.connected === true,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
    }
    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap google status request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export async function disconnectGoogle(
  accessToken: string,
  origin = getApiOrigin(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/google/disconnect`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payload: unknown = await response.json();
    if (isRecord(payload) && payload.ok === true) {
      return { ok: true };
    }
    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap google disconnect request failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

export type PushCalendarEventResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function pushCalendarEvent(
  event: FamilyEvent,
  accessToken: string,
  origin = getApiOrigin(),
): Promise<PushCalendarEventResult> {
  if (!origin) {
    return { ok: false, error: DEFAULT_ERROR };
  }
  try {
    const response = await fetch(`${origin}/api/google/push-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });
    const payload: unknown = await response.json();
    if (
      isRecord(payload) &&
      payload.ok === true &&
      typeof payload.id === "string"
    ) {
      return { ok: true, id: payload.id };
    }
    return {
      ok: false,
      error: readError(isRecord(payload) ? payload.error : undefined),
    };
  } catch (error) {
    console.error("LifeMap push calendar event failed", error);
    return { ok: false, error: DEFAULT_ERROR };
  }
}

function getApiOrigin(): string | undefined {
  return resolveApiOrigin(
    import.meta.env.VITE_API_ORIGIN,
    typeof window === "undefined" ? undefined : window.location,
  );
}

export function resolveApiOrigin(
  configuredOrigin?: string,
  location?: Pick<Location, "hostname" | "protocol">,
): string | undefined {
  if (configuredOrigin?.trim()) {
    return configuredOrigin.trim().replace(/\/$/, "");
  }

  if (!location) {
    return "http://localhost:8787";
  }

  if (
    location.protocol === "https:" &&
    PRODUCTION_PAGES_HOSTS.includes(location.hostname)
  ) {
    return PRODUCTION_API_ORIGIN;
  }

  if (
    location.protocol === "https:" &&
    location.hostname !== "localhost" &&
    location.hostname !== "127.0.0.1"
  ) {
    return undefined;
  }

  const hostname =
    location.hostname.length === 0 ? "localhost" : location.hostname;

  return `http://${hostname}:8787`;
}

function readError(error: unknown): string {
  return typeof error === "string" && error.trim().length > 0
    ? error
    : DEFAULT_ERROR;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
