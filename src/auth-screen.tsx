import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { getSupabase } from "./supabaseClient";

type Mode = "signin" | "signup" | "reset";

// Real email + password auth (no magic links — they resolve to the wrong
// localhost when a link is opened on a phone). Shown only when Supabase is
// configured; otherwise App keeps the demo login. Low-stimulus design:
// quiet warm cream, one coral accent, no decorative motion.
function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(undefined);
    setNotice(undefined);

    const supabase = getSupabase();
    const trimmedEmail = email.trim();

    // Password recovery: email a reset link back to wherever the app lives.
    if (mode === "reset") {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        typeof window !== "undefined"
          ? { redirectTo: window.location.origin }
          : undefined,
      );
      setStatus("idle");
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setNotice("Check your email for a link to reset your password.");
      return;
    }

    const credentials = { email: trimmedEmail, password };
    const { error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    if (authError) {
      setError(authError.message);
      setStatus("idle");
      return;
    }

    if (mode === "signup") {
      setNotice("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
    setStatus("idle");
  }

  const title =
    mode === "signin"
      ? "Welcome back."
      : mode === "signup"
        ? "Let's set things down."
        : "Reset your password.";
  const lede =
    mode === "signin"
      ? "Map your life, clear your head, know your next move."
      : mode === "signup"
        ? "One calm home for the family-admin chaos."
        : "Enter your email and we'll send you a reset link.";

  return (
    <main className="auth">
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-mark">LifeMap</span>
        <h1 id="auth-title" className="auth-title">
          {title}
        </h1>
        <p className="auth-lede">{lede}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Email</span>
            <input
              autoComplete="email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode !== "reset" ? (
            <label className="auth-field">
              <span>Password</span>
              <input
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={8}
                placeholder={
                  mode === "signup" ? "at least 8 characters" : "••••••••"
                }
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          ) : null}

          {mode === "signin" ? (
            <button
              className="auth-forgot"
              type="button"
              onClick={() => {
                setMode("reset");
                setError(undefined);
                setNotice(undefined);
              }}
            >
              Forgot password?
            </button>
          ) : null}

          {error ? (
            <p className="auth-msg error" aria-live="polite">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="auth-msg success" aria-live="polite">
              {notice}
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
                {mode === "signin"
                  ? "Signing in…"
                  : mode === "signup"
                    ? "Creating…"
                    : "Sending…"}
              </>
            ) : (
              <>
                {mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Sign up"
                    : "Send reset link"}
                <ArrowRight size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setError(undefined);
            setNotice(undefined);
          }}
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : mode === "reset"
              ? "Back to sign in"
              : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}

export default AuthScreen;
