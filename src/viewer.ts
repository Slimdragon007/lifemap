export type ViewerIdentity = { name: string; initials: string };

// Structural shape — accepts a Supabase Session or a hand-built test stub.
export type ViewerSession = {
  user: {
    email?: string | null;
    user_metadata?: { first_name?: string | null } | null;
  };
} | null;

export function viewerIdentity(
  session: ViewerSession,
  demoMode: boolean,
): ViewerIdentity {
  if (demoMode) {
    return { name: "Alex Kim", initials: "AK" };
  }

  // A name captured at signup (stored to user_metadata.first_name) wins over the
  // email-local-part guess. Existing accounts with no metadata name still fall
  // back to the guess (or the Settings displayName override above this in App).
  const firstName = session?.user.user_metadata?.first_name;
  if (typeof firstName === "string" && firstName.trim()) {
    const trimmed = firstName.trim();
    return { name: trimmed, initials: initialsFromName(trimmed) };
  }

  const email = session?.user.email;
  if (!email) {
    return { name: "You", initials: "" };
  }

  const localPart = email.split("@")[0];
  return {
    name: nameFromLocalPart(localPart),
    initials: initialsFromName(localPart),
  };
}

// Friendly first-name-ish label from an email local-part when no display name is
// set: "jane.doe" -> "Jane", "m.haslim" -> "Haslim" (skips a lone initial),
// "bob123" -> "Bob". Beats greeting someone by their raw email.
export function nameFromLocalPart(localPart: string): string {
  const tokens = localPart.split(/[._\-+0-9]+/).filter(Boolean);
  if (tokens.length === 0) {
    return localPart;
  }
  const pick =
    tokens[0].length >= 2
      ? tokens[0]
      : tokens.reduce((a, b) => (b.length > a.length ? b : a), tokens[0]);
  return pick.charAt(0).toUpperCase() + pick.slice(1);
}

// Initials = first letters of up to two tokens. Splits on whitespace AND
// email-local-part delimiters so it serves both display names ("Jane Doe") and
// dotted local-parts ("jane.doe") with one rule.
export function initialsFromName(value: string): string {
  const tokens = value.split(/[\s._\-+]+/).filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}
