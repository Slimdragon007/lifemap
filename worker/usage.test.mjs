import { describe, expect, test, vi } from "vitest";
import { runUptimeCheck, withinDailyBudget } from "./lifemap-api.mjs";

const NOW = new Date("2026-06-17T09:00:00.000Z");

function fakeKv(store = {}) {
  return {
    store,
    get: vi.fn(async (k) => (k in store ? store[k] : null)),
    put: vi.fn(async (k, v) => {
      store[k] = v;
    }),
  };
}

describe("withinDailyBudget", () => {
  test("allows and increments under the limit", async () => {
    const kv = fakeKv({ "ai-usage:2026-06-17": "10" });
    const ok = await withinDailyBudget(
      { GOOGLE_TOKENS: kv, DAILY_AI_LIMIT: "500" },
      NOW,
    );
    expect(ok).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      "ai-usage:2026-06-17",
      "11",
      expect.objectContaining({ expirationTtl: expect.any(Number) }),
    );
  });

  test("blocks at the limit and does not increment", async () => {
    const kv = fakeKv({ "ai-usage:2026-06-17": "500" });
    const ok = await withinDailyBudget(
      { GOOGLE_TOKENS: kv, DAILY_AI_LIMIT: "500" },
      NOW,
    );
    expect(ok).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  test("fails open when no limit is configured", async () => {
    const kv = fakeKv();
    await expect(withinDailyBudget({ GOOGLE_TOKENS: kv }, NOW)).resolves.toBe(
      true,
    );
  });

  test("fails open when KV throws", async () => {
    const kv = {
      get: vi.fn().mockRejectedValue(new Error("kv down")),
      put: vi.fn(),
    };
    await expect(
      withinDailyBudget({ GOOGLE_TOKENS: kv, DAILY_AI_LIMIT: "5" }, NOW),
    ).resolves.toBe(true);
  });
});

describe("runUptimeCheck", () => {
  const env = {
    APP_ORIGIN: "https://app.getlifemap.com",
    SEND_FROM: "notify@getlifemap.com",
  };
  const upFetch = () => vi.fn().mockResolvedValue({ ok: true });
  const downFetch = () => vi.fn().mockResolvedValue({ ok: false, status: 500 });

  test("no email when healthy and already up", async () => {
    const kv = fakeKv({ "monitor:last-status": "up" });
    const mailer = { sendEmail: vi.fn() };
    const status = await runUptimeCheck({
      env: { ...env, GOOGLE_TOKENS: kv },
      fetchImpl: upFetch(),
      mailer,
    });
    expect(status).toBe("up");
    expect(mailer.sendEmail).not.toHaveBeenCalled();
  });

  test("emails a down alert on up→down transition", async () => {
    const kv = fakeKv({ "monitor:last-status": "up" });
    const mailer = { sendEmail: vi.fn().mockResolvedValue({ ok: true }) };
    const status = await runUptimeCheck({
      env: { ...env, GOOGLE_TOKENS: kv },
      fetchImpl: downFetch(),
      mailer,
    });
    expect(status).toBe("down");
    expect(mailer.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("down") }),
    );
    expect(kv.store["monitor:last-status"]).toBe("down");
  });

  test("emails a recovery on down→up transition", async () => {
    const kv = fakeKv({ "monitor:last-status": "down" });
    const mailer = { sendEmail: vi.fn().mockResolvedValue({ ok: true }) };
    await runUptimeCheck({
      env: { ...env, GOOGLE_TOKENS: kv },
      fetchImpl: upFetch(),
      mailer,
    });
    expect(mailer.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("back up") }),
    );
    expect(kv.store["monitor:last-status"]).toBe("up");
  });

  test("no duplicate alert while still down", async () => {
    const kv = fakeKv({ "monitor:last-status": "down" });
    const mailer = { sendEmail: vi.fn() };
    await runUptimeCheck({
      env: { ...env, GOOGLE_TOKENS: kv },
      fetchImpl: downFetch(),
      mailer,
    });
    expect(mailer.sendEmail).not.toHaveBeenCalled();
  });

  test("first run sets a baseline without emailing", async () => {
    const kv = fakeKv();
    const mailer = { sendEmail: vi.fn() };
    await runUptimeCheck({
      env: { ...env, GOOGLE_TOKENS: kv },
      fetchImpl: upFetch(),
      mailer,
    });
    expect(mailer.sendEmail).not.toHaveBeenCalled();
    expect(kv.store["monitor:last-status"]).toBe("up");
  });
});
