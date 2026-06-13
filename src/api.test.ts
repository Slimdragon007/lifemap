import { afterEach, describe, expect, test, vi } from "vitest";
import { analyzeWithAi } from "./api";

const aiAnalysis = {
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
