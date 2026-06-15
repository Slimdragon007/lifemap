import { describe, expect, test, vi } from "vitest";
import { createMockMailer } from "./mailer.mjs";

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
