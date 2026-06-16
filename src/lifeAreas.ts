import {
  Archive,
  FileText,
  HeartPulse,
  Home,
  type LucideIcon,
  Plane,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { RecommendedBucket, SetupProfile } from "./setupBuckets";

// The "Your LifeMap" area tiles + their icons. Preserved as a shared mapping
// so the tiles render identically wherever they live (Today previously, the
// More tab after the low-stim relocation). Icons: Records=shield, Travel=plane,
// Health=heartpulse, Home=home, etc. — see docs/lifemap-redesign-plan.html.

export type LifeAreaTile = {
  id: string;
  label: string;
  meta: string;
  icon: LucideIcon;
};

export function getSetupLifeArea(
  bucket: RecommendedBucket,
  profile: SetupProfile,
): LifeAreaTile {
  switch (bucket.id) {
    case "family-profiles": {
      const profileCount = profile.adults + profile.children + profile.pets;
      return {
        id: bucket.id,
        label: "Profiles",
        meta: formatTileCount(profileCount, "profile"),
        icon: UsersRound,
      };
    }
    case "school-command":
      return {
        id: bucket.id,
        label: "School",
        meta: formatTileCount(Math.max(1, profile.children), "kid"),
        icon: FileText,
      };
    case "vault-records":
      return {
        id: bucket.id,
        label: "Records",
        meta: "IDs + cards",
        icon: ShieldCheck,
      };
    case "pet-care":
      return {
        id: bucket.id,
        label: "Pets",
        meta: formatTileCount(Math.max(1, profile.pets), "pet"),
        icon: HeartPulse,
      };
    case "travel-command":
      return {
        id: bucket.id,
        label: "Travel",
        meta: "Trips + TSA",
        icon: Plane,
      };
    case "health-loop":
      return {
        id: bucket.id,
        label: "Health",
        meta: "Meds + visits",
        icon: HeartPulse,
      };
    case "meal-loop":
      return {
        id: bucket.id,
        label: "Meals",
        meta: "Lunches",
        icon: FileText,
      };
    case "home-admin":
      return {
        id: bucket.id,
        label: "Home",
        meta: "Admin loops",
        icon: Home,
      };
    case "money-admin":
      return {
        id: bucket.id,
        label: "Money",
        meta: "Renewals",
        icon: Archive,
      };
  }
}

// Shown before guided setup runs (no buckets yet): the four starter areas with
// their icons and a "Set up" call to action.
export const STARTER_LIFE_AREAS: LifeAreaTile[] = [
  {
    id: "records-starter",
    label: "Records",
    meta: "Set up",
    icon: ShieldCheck,
  },
  { id: "travel-starter", label: "Travel", meta: "Set up", icon: Plane },
  { id: "health-starter", label: "Health", meta: "Set up", icon: HeartPulse },
  { id: "home-starter", label: "Home", meta: "Set up", icon: Home },
];

function formatTileCount(count: number, label: string) {
  return `${count} ${count === 1 ? label : `${label}s`}`;
}
