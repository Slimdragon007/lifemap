import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { getSupabase } from "./supabaseClient";

// Shown when the user arrives via a password-reset email link (Supabase fires
// PASSWORD_RECOVERY, surfaced as `recovering` in use-session). The recovery link
// already established a session, so updateUser can set the new password without
// re-authenticating. Reuses the AuthScreen `.auth-*` styling.
function SetNewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }

    setStatus("loading");
    const { error: updateError } = await getSupabase().auth.updateUser({
      password,
    });
    setStatus("idle");

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onDone();
  }

  return (
    <main className="auth">
      <section className="auth-card" aria-labelledby="reset-title">
        <span className="auth-mark">LifeMap</span>
        <h1 id="reset-title" className="auth-title">
          Set a new password.
        </h1>
        <p className="auth-lede">Choose something you'll remember this time.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              placeholder="at least 8 characters"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Confirm new password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              placeholder="re-enter it"
              required
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>

          {error ? (
            <p className="auth-msg error" aria-live="polite">
              {error}
            </p>
          ) : null}

          <button
            className="auth-submit"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Updating…
              </>
            ) : (
              <>
                Update password
                <ArrowRight size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

export default SetNewPasswordScreen;
