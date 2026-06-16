import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client. Reads Vite-exposed env (VITE_*). The anon key is
// safe in the browser — Row-Level Security (see supabase/migrations) is what
// actually enforces per-user access. The service-role key is server-side only
// and must never be imported here.

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const isVitest = Boolean(import.meta.env.VITEST);

// Whether real auth is configured. When false, the app falls back to the
// existing demo login + localStorage path so local dev keeps working.
export const isSupabaseConfigured = !isVitest && Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

// The current session's access token, used to authenticate /api/send.
export async function getAccessToken(): Promise<string | undefined> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token;
}
