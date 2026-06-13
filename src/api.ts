import { normalizeAnalysis, type LifeMapAnalysis } from "./lifemap";
import { normalizeMentalLoad, type MentalLoadResult } from "./mentalLoad";
import { normalizeDailyBrief, type DailyBrief } from "./dailyBrief";

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
      return normalized.ok ? normalized : normalized;
    }

    return { ok: false, error: DEFAULT_ERROR };
  } catch {
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
  } catch {
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
  } catch {
    return { ok: false, error: DEFAULT_ERROR };
  }
}

function getApiOrigin(): string | undefined {
  const configuredOrigin = import.meta.env.VITE_API_ORIGIN;
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    window.location.hostname !== "localhost"
  ) {
    return undefined;
  }

  const hostname =
    typeof window === "undefined" || window.location.hostname.length === 0
      ? "localhost"
      : window.location.hostname;

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
