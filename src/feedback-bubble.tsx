import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { sendFeedback } from "./api";
import { getAccessToken } from "./supabaseClient";

type Status = "idle" | "sending" | "sent" | "error";

// Floating feedback button for the authenticated app. Opens a small panel;
// submitting routes to the Worker (email + Notion). Mounted only when signed in.
function FeedbackBubble() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    setStatus("sending");
    setError(undefined);

    const token = await getAccessToken();
    if (!token) {
      setStatus("error");
      setError("Please sign in again to send feedback.");
      return;
    }

    const result = await sendFeedback(
      {
        message: trimmed,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      },
      token,
    );

    if (result.ok) {
      setStatus("sent");
      setMessage("");
      window.setTimeout(() => {
        setOpen(false);
        setStatus("idle");
      }, 1600);
    } else {
      setStatus("error");
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <button
        className="feedback-bubble"
        type="button"
        aria-label="Send feedback"
        onClick={() => setOpen(true)}
      >
        <MessageCircle size={20} aria-hidden="true" />
      </button>
    );
  }

  return (
    <section className="feedback-panel" aria-label="Send feedback">
      <header className="feedback-panel-head">
        <span className="feedback-panel-title">Send feedback</span>
        <button
          className="feedback-panel-close"
          type="button"
          aria-label="Close feedback"
          onClick={() => {
            setOpen(false);
            setStatus("idle");
            setError(undefined);
          }}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </header>

      {status === "sent" ? (
        <p className="feedback-sent" aria-live="polite">
          Thanks — sent. 💛
        </p>
      ) : (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <label className="feedback-field">
            <span className="visually-hidden">Your feedback</span>
            <textarea
              className="feedback-textarea"
              placeholder="What's working, what's clunky, what's missing…"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              autoFocus
            />
          </label>

          {error ? (
            <p className="feedback-error" aria-live="polite">
              {error}
            </p>
          ) : null}

          <button
            className="feedback-send"
            type="submit"
            disabled={status === "sending" || !message.trim()}
          >
            {status === "sending" ? "Sending…" : "Send to the LifeMap team"}
          </button>
        </form>
      )}
    </section>
  );
}

export default FeedbackBubble;
