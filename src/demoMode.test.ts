import { describe, expect, test } from "vitest";
import { demoMode } from "./demoMode";
import { isSupabaseConfigured } from "./supabaseClient";

describe("demoMode", () => {
  test("is the inverse of isSupabaseConfigured", () => {
    expect(demoMode).toBe(!isSupabaseConfigured);
  });

  test("is on under Vitest (Supabase is pinned off in tests)", () => {
    expect(demoMode).toBe(true);
  });
});
