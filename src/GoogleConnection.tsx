import { CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { disconnectGoogle, getGoogleAuthUrl, getGoogleStatus } from "./api";
import { getAccessToken } from "./supabaseClient";

type ConnectionState =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "disconnected" }
  | { kind: "connected"; email?: string };

function GoogleConnection() {
  const [state, setState] = useState<ConnectionState>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await getAccessToken().catch(() => undefined);
      if (!active) {
        return;
      }
      if (!token) {
        setState({ kind: "signed-out" });
        return;
      }
      const status = await getGoogleStatus(token);
      if (!active) {
        return;
      }
      if (status.ok && status.connected) {
        setState({ kind: "connected", email: status.email });
      } else {
        setState({ kind: "disconnected" });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function connect() {
    setBusy(true);
    setError(undefined);
    const token = await getAccessToken().catch(() => undefined);
    if (!token) {
      setBusy(false);
      setState({ kind: "signed-out" });
      return;
    }
    const result = await getGoogleAuthUrl(token);
    if (result.ok) {
      window.location.assign(result.url);
    } else {
      setBusy(false);
      setError("Couldn't start the Google connection. Please try again.");
    }
  }

  async function disconnect() {
    setBusy(true);
    const token = await getAccessToken().catch(() => undefined);
    if (token) {
      await disconnectGoogle(token);
    }
    setBusy(false);
    setState({ kind: "disconnected" });
  }

  if (state.kind === "loading") {
    return <p className="google-connect-note">Checking Google Calendar…</p>;
  }

  if (state.kind === "signed-out") {
    return (
      <p className="google-connect-note">Sign in to connect Google Calendar.</p>
    );
  }

  if (state.kind === "connected") {
    return (
      <div className="google-connect">
        <span className="google-connected">
          Connected ✓ {state.email ?? "Google Calendar"}
        </span>
        <button
          className="secondary-button compact-button"
          disabled={busy}
          type="button"
          onClick={disconnect}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="google-connect">
      <button
        className="primary-button compact-button"
        disabled={busy}
        type="button"
        onClick={connect}
      >
        <CalendarCheck size={16} />
        Connect Google Calendar
      </button>
      {error ? (
        <p className="google-connect-note" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default GoogleConnection;
