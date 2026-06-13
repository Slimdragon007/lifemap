import { normalizeAnalysis, type LifeMapAnalysis } from "./lifemap";
import { normalizeMentalLoad, type MentalLoadResult } from "./mentalLoad";

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

const DEFAULT_ERROR =
  "LifeMap could not analyze this yet. Try again or edit the intake.";

export async function analyzeWithAi(
  rawIntake: string,
): Promise<AnalyzeApiResult> {
  try {
    const response = await fetch(`${getApiOrigin()}/api/analyze`, {
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
  try {
    const response = await fetch(`${getApiOrigin()}/api/classify`, {
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

function getApiOrigin(): string {
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
