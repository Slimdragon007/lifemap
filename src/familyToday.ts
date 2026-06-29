import type { FamilyEvent, FamilyMember, VaultItem } from "./familyOS";
import { upcomingDates, type UpcomingDate } from "./importantDates";

// Stable per-member avatar accent, drawn from the existing token palette so each
// person keeps their colour across renders with nothing persisted (no migration).
const MEMBER_ACCENTS = ["blue", "plum", "sage", "amber", "clay"] as const;
export type MemberAccent = (typeof MEMBER_ACCENTS)[number];

export function memberAccent(id: string): MemberAccent {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return MEMBER_ACCENTS[Math.abs(hash) % MEMBER_ACCENTS.length];
}

export type MemberStuff = {
  documents: VaultItem[];
  dates: UpcomingDate[];
};

function belongsToMember(owner: string, member: FamilyMember) {
  const normalizedOwner = owner.trim().toLowerCase();
  const normalizedName = member.name.trim().toLowerCase();
  const firstName = normalizedName.split(/\s+/)[0];
  return normalizedOwner === normalizedName || normalizedOwner === firstName;
}

// Everything that belongs to one member: their vault documents plus the upcoming
// important dates scoped to them. Whole-family / unowned items stay out of the
// per-member card by design ("their stuff").
export function memberStuff(
  member: FamilyMember,
  vaultItems: VaultItem[],
  familyEvents: FamilyEvent[],
  now: Date,
): MemberStuff {
  return {
    documents: vaultItems.filter((item) => belongsToMember(item.owner, member)),
    dates: upcomingDates(familyEvents, now, Infinity).filter(
      (entry) => belongsToMember(entry.event.owner, member),
    ),
  };
}
