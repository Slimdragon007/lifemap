import {
  CalendarClock,
  Gift,
  GraduationCap,
  Heart,
  type LucideIcon,
  Receipt,
  RefreshCw,
  Star,
} from "lucide-react";
import type { CalendarLayer, DateCategory } from "./familyOS";

// The Important Dates icon grid. Each category carries a label, a lucide icon,
// and the CalendarLayer it slots into so a saved date still belongs to the
// Calendar's layered model. Calm tiles, no counts — just a tap target.
export type DateCategoryMeta = {
  id: DateCategory;
  label: string;
  icon: LucideIcon;
  layer: CalendarLayer;
};

export const DATE_CATEGORIES: DateCategoryMeta[] = [
  { id: "birthday", label: "Birthday", icon: Gift, layer: "admin" },
  { id: "anniversary", label: "Anniversary", icon: Heart, layer: "admin" },
  { id: "renewal", label: "Renewal", icon: RefreshCw, layer: "admin" },
  {
    id: "appointment",
    label: "Appointment",
    icon: CalendarClock,
    layer: "health",
  },
  { id: "school", label: "School", icon: GraduationCap, layer: "school" },
  { id: "bill", label: "Bill", icon: Receipt, layer: "admin" },
  { id: "custom", label: "Custom", icon: Star, layer: "admin" },
];

const BY_ID: Record<DateCategory, DateCategoryMeta> = DATE_CATEGORIES.reduce(
  (acc, meta) => {
    acc[meta.id] = meta;
    return acc;
  },
  {} as Record<DateCategory, DateCategoryMeta>,
);

export function dateCategoryMeta(id: DateCategory): DateCategoryMeta {
  return BY_ID[id] ?? BY_ID.custom;
}
