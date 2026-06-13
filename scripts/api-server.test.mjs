import { describe, expect, test, vi } from "vitest";
import {
  analyzePayload,
  classifyPayload,
  generateBriefPayload,
} from "./api-server.mjs";

const analysis = {
  dueItems: [
    {
      id: "due-slip",
      title: "Permission slip",
      dueDate: "Jun 18, 2026",
      sourceQuote: "Return by 6/18.",
    },
  ],
  missingInfo: [],
  waitingOn: [
    { id: "wait-school", name: "Westview School", reason: "Needs signed slip" },
  ],
  nextActions: [
    { id: "action-sign", label: "Sign the permission slip", owner: "Alex" },
  ],
  reminders: [
    {
      id: "reminder-slip",
      title: "Permission slip due",
      body: "Remind Alex before Jun 18.",
      status: "Scheduled",
    },
  ],
  draftMessages: [],
  sourceEvidence: [
    {
      id: "source-email",
      type: "email",
      label: "Email: teacher@school.org",
      quote: "Return by 6/18.",
    },
  ],
};

describe("analyzePayload", () => {
  test("rejects empty intake before calling OpenAI", async () => {
    const fetchImpl = vi.fn();

    await expect(
      analyzePayload(
        { rawIntake: "  " },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 400,
      body: {
        ok: false,
        error:
          "Paste an email, form text, screenshot notes, or task details first.",
      },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("returns a missing key error without calling OpenAI", async () => {
    const fetchImpl = vi.fn();

    await expect(
      analyzePayload({ rawIntake: "field trip" }, {}, fetchImpl),
    ).resolves.toEqual({
      status: 500,
      body: { ok: false, error: "OPENAI_API_KEY is not configured." },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("calls OpenAI Responses API and returns parsed structured output", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(analysis) }),
    });

    const result = await analyzePayload(
      { rawIntake: "field trip" },
      { OPENAI_API_KEY: "secret", OPENAI_MODEL: "gpt-test" },
      fetchImpl,
    );

    expect(result).toEqual({ status: 200, body: { ok: true, analysis } });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer secret",
          "Content-Type": "application/json",
        },
      }),
    );
    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.store).toBe(false);
  });

  test("returns a safe error when OpenAI output is malformed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: "{}" }),
    });

    await expect(
      analyzePayload(
        { rawIntake: "field trip" },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 502,
      body: {
        ok: false,
        error:
          "LifeMap could not analyze this yet. Try again or edit the intake.",
      },
    });
  });
});

const mentalLoad = {
  items: [
    {
      id: "load-1",
      title: "Pay the electric bill",
      type: "finance",
      recommendation: "do-now",
      emotionalWeight: 2,
      sourceQuote: "pay the electric bill, it's due today",
    },
  ],
};

const dailyBrief = {
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

describe("classifyPayload", () => {
  test("rejects an empty dump before calling OpenAI", async () => {
    const fetchImpl = vi.fn();

    await expect(
      classifyPayload(
        { rawDump: "  " },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 400,
      body: {
        ok: false,
        error:
          "Paste an email, form text, screenshot notes, or task details first.",
      },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("returns a missing key error without calling OpenAI", async () => {
    const fetchImpl = vi.fn();

    await expect(
      classifyPayload({ rawDump: "brain dump" }, {}, fetchImpl),
    ).resolves.toEqual({
      status: 500,
      body: { ok: false, error: "OPENAI_API_KEY is not configured." },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("calls OpenAI and returns the normalized mental-load result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(mentalLoad) }),
    });

    const result = await classifyPayload(
      { rawDump: "pay the electric bill, it's due today" },
      { OPENAI_API_KEY: "secret", OPENAI_MODEL: "gpt-test" },
      fetchImpl,
    );

    expect(result).toEqual({
      status: 200,
      body: { ok: true, result: mentalLoad },
    });
    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.text.format.name).toBe("lifemap_mental_load");
    expect(requestBody.store).toBe(false);
  });

  test("rejects output with an out-of-enum type", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          items: [{ ...mentalLoad.items[0], type: "nope" }],
        }),
      }),
    });

    await expect(
      classifyPayload(
        { rawDump: "x" },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 502,
      body: {
        ok: false,
        error:
          "LifeMap could not analyze this yet. Try again or edit the intake.",
      },
    });
  });
});

describe("generateBriefPayload", () => {
  test("rejects an incomplete analysis before calling OpenAI", async () => {
    const fetchImpl = vi.fn();

    await expect(
      generateBriefPayload(
        { analysis: { dueItems: [] } },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 400,
      body: {
        ok: false,
        error:
          "Paste an email, form text, screenshot notes, or task details first.",
      },
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("calls OpenAI and returns the normalized daily brief", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(dailyBrief) }),
    });

    const result = await generateBriefPayload(
      { analysis },
      { OPENAI_API_KEY: "secret", OPENAI_MODEL: "gpt-test" },
      fetchImpl,
    );

    expect(result).toEqual({
      status: 200,
      body: { ok: true, brief: dailyBrief },
    });
    const requestBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(requestBody.text.format.name).toBe("lifemap_daily_brief");
    expect(requestBody.store).toBe(false);
  });

  test("returns a safe error when brief output is malformed", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify({ todaySummary: "x" }) }),
    });

    await expect(
      generateBriefPayload(
        { analysis },
        { OPENAI_API_KEY: "secret" },
        fetchImpl,
      ),
    ).resolves.toEqual({
      status: 502,
      body: {
        ok: false,
        error:
          "LifeMap could not analyze this yet. Try again or edit the intake.",
      },
    });
  });
});
