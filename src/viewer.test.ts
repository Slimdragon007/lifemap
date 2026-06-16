import { describe, expect, test } from "vitest";
import { viewerIdentity } from "./viewer";

describe("viewerIdentity", () => {
  test("demo mode always returns the Alex Kim identity", () => {
    expect(viewerIdentity(null, true)).toEqual({
      name: "Alex Kim",
      initials: "AK",
    });
    expect(
      viewerIdentity({ user: { email: "real@person.com" } }, true),
    ).toEqual({ name: "Alex Kim", initials: "AK" });
  });

  test("real mode derives name and initials from a dotted email local-part", () => {
    expect(
      viewerIdentity({ user: { email: "m.haslim@gmail.com" } }, false),
    ).toEqual({ name: "m.haslim", initials: "MH" });
  });

  test("real mode derives initials from a single-token local-part", () => {
    expect(
      viewerIdentity({ user: { email: "casey@example.com" } }, false),
    ).toEqual({ name: "casey", initials: "CA" });
  });

  test("real mode uses the first two tokens for initials", () => {
    expect(
      viewerIdentity({ user: { email: "jordan.lee.smith@x.com" } }, false),
    ).toEqual({ name: "jordan.lee.smith", initials: "JL" });
  });

  test("real mode with no session falls back to a neutral viewer", () => {
    expect(viewerIdentity(null, false)).toEqual({ name: "You", initials: "" });
  });

  test("real mode with a session but no email falls back to neutral viewer", () => {
    expect(viewerIdentity({ user: {} }, false)).toEqual({
      name: "You",
      initials: "",
    });
  });
});
