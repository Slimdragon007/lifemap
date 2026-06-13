import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabaseClient";

// Tracks the current Supabase auth session. When Supabase is not configured
// (e.g. local demo, test runner), this is inert: loading resolves to false and
// session stays null so App falls back to the demo login path.
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

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
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
