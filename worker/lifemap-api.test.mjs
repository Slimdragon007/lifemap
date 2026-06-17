import { describe, expect, test, vi } from "vitest";
import {
  analyzePayload,
  classifyPayload,
  deriveUserFieldKey,
  enforceRateLimit,
  generateBriefPayload,
} from "./lifemap-api.mjs";

const MASTER = btoa("0123456789abcdef0123456789abcdef");

describe("deriveUserFieldKey", () => {
  test("is deterministic per user (same master + id → same key)", async () => {
    const a = await deriveUserFieldKey(MASTER, "user-1");
    const b = await deriveUserFieldKey(MASTER, "user-1");
    expect(a).toBe(b);
    // 256-bit key, base64-encoded
    expect(atob(a).length).toBe(32);
  });

  test("yields a different key per user", async () => {
    const a = await deriveUserFieldKey(MASTER, "user-1");
    const b = await deriveUserFieldKey(MASTER, "user-2");
    expect(a).not.toBe(b);
  });
});

function requestWithIp(ip) {
  return new Request("https://lifemap-api.example/api/analyze", {
    method: "POST",
    headers: ip ? { "CF-Connecting-IP": ip } : {},
  });
}

describe("enforceRateLimit", () => {
  test("allows the request when the limiter reports success", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    const allowed = await enforceRateLimit(requestWithIp("203.0.113.7"), {
      AI_RATE_LIMITER: { limit },
    });

    expect(allowed).toBe(true);
    expect(limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
  });

  test("blocks the request when the limiter reports failure", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const allowed = await enforceRateLimit(requestWithIp("203.0.113.7"), {
      AI_RATE_LIMITER: { limit },
    });

    expect(allowed).toBe(false);
  });

  test("keys on a stable fallback when the IP header is absent", async () => {
    const limit = vi.fn().mockResolvedValue({ success: true });
    await enforceRateLimit(requestWithIp(""), { AI_RATE_LIMITER: { limit } });

    expect(limit).toHaveBeenCalledWith({ key: "unknown" });
  });

  test("fails open when no limiter binding is configured", async () => {
    await expect(
      enforceRateLimit(requestWithIp("203.0.113.7"), {}),
    ).resolves.toBe(true);
  });

  test("fails open when the limiter throws", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("limiter down"));
    await expect(
      enforceRateLimit(requestWithIp("203.0.113.7"), {
        AI_RATE_LIMITER: { limit },
      }),
    ).resolves.toBe(true);
  });
});

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

  test("surfaces a model/bad-request error and logs the OpenAI status", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "model_not_found: gpt-5.5",
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
          "LifeMap could not reach the AI model. Check the OPENAI_MODEL setting and try again.",
      },
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("keeps an extracted recipientEmail on draft messages", async () => {
    const withEmail = {
      ...analysis,
      draftMessages: [
        {
          id: "draft-1",
          recipient: "Westview School",
          recipientEmail: "office@westview.org",
          subject: "Permission slip",
          body: "Sending the signed slip.",
          status: "Needs review",
        },
      ],
    };
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: JSON.stringify(withEmail) }),
    });

    const result = await analyzePayload(
      { rawIntake: "field trip" },
      { OPENAI_API_KEY: "secret" },
      fetchImpl,
    );

    expect(result.status).toBe(200);
    expect(result.body.analysis.draftMessages[0].recipientEmail).toBe(
      "office@westview.org",
    );
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
      json: async () => ({
        output_text: JSON.stringify({ todaySummary: "x" }),
      }),
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
