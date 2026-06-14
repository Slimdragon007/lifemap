import { afterEach, describe, expect, test, vi } from "vitest";
import { analyzeWithAi, generateBriefWithAi, resolveApiOrigin } from "./api";
import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";

const aiAnalysis: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-slip",
      title: "Permission slip",
      dueDate: "Jun 18, 2026",
      sourceQuote: "Return by 6/18."
    }
  ],
  missingInfo: [],
  waitingOn: [{ id: "wait-school", name: "Westview School", reason: "Needs signed slip" }],
  nextActions: [{ id: "action-sign", label: "Sign the permission slip", owner: "Alex" }],
  reminders: [
    {
      id: "reminder-slip",
      title: "Permission slip due",
      body: "Remind Alex before Jun 18.",
      status: "Scheduled"
    }
  ],
  draftMessages: [],
  sourceEvidence: [
    {
      id: "source-email",
      type: "email",
      label: "Email: teacher@school.org",
      quote: "Return by 6/18."
    }
  ]
};

const dailyBrief: DailyBrief = {
  todaySummary: "The permission slip is the clearest thing to move today.",
  topPriorities: [
    {
      id: "priority-slip",
      label: "Sign the permission slip",
      reason: "It is due Jun 18.",
    },
  ],
  openLoops: [],
  canWait: [],
  suggestedMessages: [],
  conflicts: [],
  groundingNote: "Grounded in the school email.",
};

describe("resolveApiOrigin", () => {
  test("uses configured origins first and trims trailing slashes", () => {
    expect(
      resolveApiOrigin("https://example-worker.workers.dev/", {
        hostname: "lifemap-d33.pages.dev",
        protocol: "https:",
      }),
    ).toBe("https://example-worker.workers.dev");
  });

  test("uses the production Worker on the deployed Cloudflare Pages host", () => {
    expect(
      resolveApiOrigin(undefined, {
        hostname: "lifemap-d33.pages.dev",
        protocol: "https:",
      }),
    ).toBe("https://lifemap-api.m-haslim.workers.dev");
  });

  test("keeps local development pointed at the local API server", () => {
    expect(
      resolveApiOrigin(undefined, {
        hostname: "127.0.0.1",
        protocol: "http:",
      }),
    ).toBe("http://127.0.0.1:8787");
  });

  test("does not guess an API for unrelated https hosts", () => {
    expect(
      resolveApiOrigin(undefined, {
        hostname: "example.com",
        protocol: "https:",
      }),
    ).toBeUndefined();
  });
});

describe("analyzeWithAi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("posts intake to the local API and returns normalized analysis", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, analysis: aiAnalysis })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await analyzeWithAi("field trip form");

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8787/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawIntake: "field trip form" })
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.analysis.dueItems[0].title).toBe("Permission slip");
  });

  test("returns the server error without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ ok: false, error: "OPENAI_API_KEY is not configured." })
      })
    );

    await expect(analyzeWithAi("field trip form")).resolves.toEqual({
      ok: false,
      error: "OPENAI_API_KEY is not configured."
    });
  });

  test("returns a safe error for broken server responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, analysis: { dueItems: [] } })
      })
    );

    await expect(analyzeWithAi("field trip form")).resolves.toEqual({
      ok: false,
      error: "LifeMap could not understand the extracted map."
    });
  });
});

describe("generateBriefWithAi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("posts the current analysis to the local brief API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, brief: dailyBrief }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateBriefWithAi(aiAnalysis);

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8787/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: aiAnalysis }),
    });
    expect(result.ok).toBe(true);
    expect(result.ok && result.brief.todaySummary).toContain(
      "permission slip",
    );
  });

  test("returns a safe error for broken brief responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, brief: { todaySummary: "thin" } }),
      }),
    );

    await expect(generateBriefWithAi(aiAnalysis)).resolves.toEqual({
      ok: false,
      error: "LifeMap could not understand the daily brief.",
    });
  });
});
