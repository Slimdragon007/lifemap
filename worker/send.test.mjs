import { describe, expect, test, vi } from "vitest";
import { createMockMailer } from "./mailer.mjs";
import { sendPayload } from "./lifemap-api.mjs";

function authFetch(user) {
  return vi.fn().mockResolvedValue({
    ok: Boolean(user),
    json: async () => user ?? {},
  });
}

const env = {
  SUPABASE_URL: "https://proj.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SEND_FROM: "notify@lifemap.app",
};

describe("mock mailer", () => {
  test("records the message and returns a provider id", async () => {
    const mailer = createMockMailer();
    const result = await mailer.sendEmail({
      to: "office@westview.org",
      from: "notify@lifemap.app",
      replyTo: "alex@example.com",
      subject: "Permission slip",
      body: "Signed slip attached.",
    });
    expect(result).toEqual({ ok: true, providerId: "mock-1" });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("office@westview.org");
  });
});

describe("sendPayload", () => {
  test("rejects a request without a bearer token", async () => {
    const mailer = createMockMailer();
    const result = await sendPayload({
      payload: { draftId: "d1", to: "x@y.com", subject: "s", body: "b" },
      authHeader: "",
      env,
      mailer,
      fetchImpl: authFetch(null),
      recordImpl: vi.fn(),
    });
    expect(result.status).toBe(401);
    expect(mailer.sent).toHaveLength(0);
  });

  test("rejects a missing recipient", async () => {
    const result = await sendPayload({
      payload: { draftId: "d1", to: "", subject: "s", body: "b" },
      authHeader: "Bearer tok",
      env,
      mailer: createMockMailer(),
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl: vi.fn(),
    });
    expect(result.status).toBe(400);
  });

  test("sends and records on success", async () => {
    const mailer = createMockMailer();
    const recordImpl = vi.fn().mockResolvedValue({ ok: true, id: "row-1" });
    const result = await sendPayload({
      payload: {
        draftId: "d1",
        to: "office@westview.org",
        recipientName: "Westview School",
        subject: "Permission slip",
        body: "Signed slip attached.",
      },
      authHeader: "Bearer tok",
      env,
      mailer,
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl,
    });
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.id).toBe("row-1");
    expect(typeof result.body.sentAt).toBe("string");
    expect(mailer.sent[0]).toMatchObject({
      to: "office@westview.org",
      from: "notify@lifemap.app",
      replyTo: "alex@example.com",
    });
    expect(recordImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        userToken: "tok",
        row: expect.objectContaining({
          user_id: "u1",
          status: "sent",
          provider_id: "mock-1",
          recipient_email: "office@westview.org",
        }),
      }),
    );
  });

  test("records a failed send and returns a legible error", async () => {
    const mailer = {
      sent: [],
      async sendEmail() {
        return { ok: false, error: "domain not verified" };
      },
    };
    const recordImpl = vi.fn().mockResolvedValue({ ok: true, id: "row-2" });
    const result = await sendPayload({
      payload: { draftId: "d1", to: "x@y.com", subject: "s", body: "b" },
      authHeader: "Bearer tok",
      env,
      mailer,
      fetchImpl: authFetch({ id: "u1", email: "alex@example.com" }),
      recordImpl,
    });
    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);
    expect(recordImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        row: expect.objectContaining({ status: "failed" }),
      }),
    );
  });
});
