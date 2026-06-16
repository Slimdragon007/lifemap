import { isSupabaseConfigured } from "./supabaseClient";

// True when the app shows sample (demo) data instead of a real account.
// Demo mode = no Supabase env configured. Pinned true under Vitest.
export const demoMode = !isSupabaseConfigured;
