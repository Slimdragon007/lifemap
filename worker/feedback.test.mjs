import { describe, expect, test, vi } from "vitest";
import { recordFeedback } from "./lifemap-api.mjs";

const env = { SEND_FROM: "notify@getlifemap.com" };

function okMailer() {
  return {
    sendEmail: vi.fn().mockResolvedValue({ ok: true, providerId: "cf-1" }),
  };
}

describe("recordFeedback", () => {
  test("emails the owner with the sender as reply-to", async () => {
    const mailer = okMailer();
    const fetchImpl = vi.fn();

    const result = await recordFeedback({
      env,
      message: "Love the calm vibe",
      url: "https://app.getlifemap.com/",
      fromEmail: "julie@example.com",
      mailer,
      fetchImpl,
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(mailer.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "m.haslim@gmail.com",
        from: "notify@getlifemap.com",
        replyTo: "julie@example.com",
        subject: expect.stringContaining("julie@example.com"),
      }),
    );
    // No Notion configured → no Notion call.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test("rejects an empty message before emailing", async () => {
    const mailer = okMailer();
    const result = await recordFeedback({
      env,
      message: "",
      fromEmail: "x@y.com",
      mailer,
      fetchImpl: vi.fn(),
    });

    expect(result.status).toBe(400);
    expect(mailer.sendEmail).not.toHaveBeenCalled();
  });

  test("also logs to Notion when token + db id are configured", async () => {
    const mailer = okMailer();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    await recordFeedback({
      env: {
        ...env,
        NOTION_TOKEN: "ntn_secret",
        NOTION_FEEDBACK_DB_ID: "db123",
      },
      message: "Add a dark mode please",
      url: "https://app.getlifemap.com/vault",
      fromEmail: "julie@example.com",
      mailer,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.notion.com/v1/pages",
      expect.objectContaining({ method: "POST" }),
    );
    const notionBody = JSON.parse(fetchImpl.mock.calls[0][1].body);
    expect(notionBody.parent).toEqual({ database_id: "db123" });
    expect(notionBody.properties.Status.select.name).toBe("New");
  });

  test("a Notion failure does not fail the request (email already sent)", async () => {
    const mailer = okMailer();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("notion down"));

    const result = await recordFeedback({
      env: { ...env, NOTION_TOKEN: "t", NOTION_FEEDBACK_DB_ID: "d" },
      message: "still works",
      fromEmail: "a@b.com",
      mailer,
      fetchImpl,
    });

    expect(result.status).toBe(200);
  });

  test("succeeds when email fails but Notion captures it", async () => {
    const mailer = {
      sendEmail: vi.fn().mockResolvedValue({ ok: false, error: "smtp" }),
    };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });

    const result = await recordFeedback({
      env: { ...env, NOTION_TOKEN: "t", NOTION_FEEDBACK_DB_ID: "d" },
      message: "still captured",
      fromEmail: "a@b.com",
      mailer,
      fetchImpl,
    });

    expect(result.status).toBe(200);
  });

  test("returns 502 when the email send fails", async () => {
    const mailer = {
      sendEmail: vi.fn().mockResolvedValue({ ok: false, error: "smtp" }),
    };
    const result = await recordFeedback({
      env,
      message: "hello",
      fromEmail: "a@b.com",
      mailer,
      fetchImpl: vi.fn(),
    });

    expect(result.status).toBe(502);
  });
});
