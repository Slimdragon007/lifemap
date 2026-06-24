import { describe, expect, test } from "vitest";
import { nameFromLocalPart, viewerIdentity } from "./viewer";

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

  test("real mode greets with a humanized name, initials from the local-part", () => {
    expect(
      viewerIdentity({ user: { email: "m.haslim@gmail.com" } }, false),
    ).toEqual({ name: "Haslim", initials: "MH" });
  });

  test("real mode derives name + initials from a single-token local-part", () => {
    expect(
      viewerIdentity({ user: { email: "casey@example.com" } }, false),
    ).toEqual({ name: "Casey", initials: "CA" });
  });

  test("real mode greets with the first real name token", () => {
    expect(
      viewerIdentity({ user: { email: "jordan.lee.smith@x.com" } }, false),
    ).toEqual({ name: "Jordan", initials: "JL" });
  });

  test("real mode prefers a name captured at signup (user_metadata.first_name)", () => {
    expect(
      viewerIdentity(
        {
          user: {
            email: "m.haslim@gmail.com",
            user_metadata: { first_name: "Michael" },
          },
        },
        false,
      ),
    ).toEqual({ name: "Michael", initials: "MI" });
  });

  test("real mode falls back to the email guess when metadata name is empty", () => {
    expect(
      viewerIdentity(
        {
          user: {
            email: "casey@example.com",
            user_metadata: { first_name: "   " },
          },
        },
        false,
      ),
    ).toEqual({ name: "Casey", initials: "CA" });
  });

  test("real mode falls back to the email guess when metadata is absent", () => {
    expect(
      viewerIdentity(
        { user: { email: "jordan.lee.smith@x.com", user_metadata: null } },
        false,
      ),
    ).toEqual({ name: "Jordan", initials: "JL" });
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

describe("nameFromLocalPart", () => {
  test("greets by the first real-word token", () => {
    expect(nameFromLocalPart("jane.doe")).toBe("Jane");
    expect(nameFromLocalPart("al.thompson")).toBe("Al");
  });

  test("skips a lone leading initial for a real word", () => {
    expect(nameFromLocalPart("m.haslim")).toBe("Haslim");
    expect(nameFromLocalPart("j_smith")).toBe("Smith");
  });

  test("strips digits and separators", () => {
    expect(nameFromLocalPart("bob123")).toBe("Bob");
    expect(nameFromLocalPart("mary-jane")).toBe("Mary");
  });

  test("falls back to the raw value when there is no alpha token", () => {
    expect(nameFromLocalPart("123")).toBe("123");
  });
});
