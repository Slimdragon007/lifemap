import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

export type SessionState = {
  session: Session | null;
  loading: boolean;
  // True while the user is in a password-recovery flow (arrived via a reset
  // email link). The recovery link also establishes a session, so App must
  // check this BEFORE the normal authenticated render and show the
  // set-new-password screen instead.
  recovering: boolean;
  clearRecovery: () => void;
};

// Tracks the current Supabase auth session. When Supabase is not configured
// (e.g. local demo, test runner), this is inert: loading resolves to false and
// session stays null so App falls back to the demo login path.
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    recovering,
    clearRecovery: () => setRecovering(false),
  };
}
