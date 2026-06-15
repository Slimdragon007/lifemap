// mailer contract:
//   sendEmail({ to, from, replyTo, subject, body })
//     -> { ok: true, providerId } | { ok: false, error }

export function createMockMailer() {
  const sent = [];
  return {
    sent,
    async sendEmail(message) {
      sent.push(message);
      return { ok: true, providerId: `mock-${sent.length}` };
    },
  };
}

// Cloudflare Email Sending adapter. `binding` is the Worker `send_email` binding
// (e.g. env.EMAIL). Uses the structured send API:
//   env.EMAIL.send({ to, from: { email }, replyTo, subject, text, html })
// The `from` domain must be onboarded via `wrangler email sending enable <domain>`.
export function createCloudflareMailer(binding) {
  return {
    async sendEmail({ to, from, replyTo, subject, body }) {
      try {
        const response = await binding.send({
          to,
          from: { email: from, name: "LifeMap" },
          replyTo,
          subject,
          text: body,
        });
        const providerId =
          response && typeof response.id === "string" ? response.id : "cf-sent";
        return { ok: true, providerId };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}
