import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { getSupabase } from "./supabaseClient";

type Mode = "signin" | "signup";

// Real email + password auth (no magic links — they resolve to the wrong
// localhost when a link is opened on a phone). Shown only when Supabase is
// configured; otherwise App keeps the demo login.
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
    const credentials = { email: email.trim(), password };

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

  return (
    <main className="haven-auth">
      <div className="haven-auth-atmos" aria-hidden="true" />
      <div className="haven-auth-grain" aria-hidden="true" />

      <section className="haven-auth-aside" aria-hidden="true">
        <span className="haven-auth-eyebrow">Private mental-load AI</span>
        <p className="haven-auth-pitch">
          Forward the mess.
          <br />
          I'll hand back your
          <br />
          <em>next three things.</em>
        </p>
        <span className="haven-auth-foot">
          for parents &amp; busy brains · calm by design
        </span>
      </section>

      <section className="haven-auth-card" aria-labelledby="auth-title">
        <span className="haven-auth-wordmark">LifeMap</span>
        <h1 id="auth-title">
          {mode === "signin" ? (
            <>
              Welcome <em>back.</em>
            </>
          ) : (
            <>
              Make some <em>room.</em>
            </>
          )}
          <svg
            className="haven-auth-underline"
            viewBox="0 0 150 14"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 9C38 4 96 3 148 8"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </h1>
        <p className="haven-auth-lede">
          {mode === "signin"
            ? "Map your life, clear your head, know your next move."
            : "One calm home for the family-admin chaos. Let's set it up."}
        </p>

        <form className="haven-auth-form" onSubmit={handleSubmit}>
          <label className="haven-field">
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
          <label className="haven-field">
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

          {error ? (
            <p className="haven-auth-msg error" aria-live="polite">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="haven-auth-msg success" aria-live="polite">
              {notice}
            </p>
          ) : null}

          <button
            className="haven-auth-submit"
            disabled={status === "loading"}
            type="submit"
          >
            {status === "loading" ? (
              <>
                <span className="spinner" aria-hidden="true" />
                {mode === "signin" ? "Signing in…" : "Creating…"}
              </>
            ) : (
              <>
                {mode === "signin" ? "Sign in" : "Sign up"}
                <ArrowRight size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <button
          className="haven-auth-switch"
          type="button"
          onClick={() => {
            setMode((current) => (current === "signin" ? "signup" : "signin"));
            setError(undefined);
            setNotice(undefined);
          }}
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}

export default AuthScreen;
