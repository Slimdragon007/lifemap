export type ViewerIdentity = { name: string; initials: string };

// Structural shape — accepts a Supabase Session or a hand-built test stub.
export type ViewerSession = { user: { email?: string | null } } | null;

export function viewerIdentity(
  session: ViewerSession,
  demoMode: boolean,
): ViewerIdentity {
  if (demoMode) {
    return { name: "Alex Kim", initials: "AK" };
  }

  const email = session?.user.email;
  if (!email) {
    return { name: "You", initials: "" };
  }

  const localPart = email.split("@")[0];
  return { name: localPart, initials: initialsFromLocalPart(localPart) };
}

function initialsFromLocalPart(localPart: string): string {
  const tokens = localPart.split(/[._\-+]/).filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}
