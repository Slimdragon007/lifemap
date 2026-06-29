import {
  BookUser,
  FileText,
  GraduationCap,
  IdCard,
  type LucideIcon,
  ShieldPlus,
  Stethoscope,
} from "lucide-react";
import type { VaultCategory } from "./familyOS";

// The six vault categories in display order, with their human labels. One source
// for the category picker (AddDocumentModal) and the profile section headings
// (MemberProfileView).
export const VAULT_CATEGORY_OPTIONS: ReadonlyArray<{
  value: VaultCategory;
  label: string;
}> = [
  { value: "identity", label: "Identity" },
  { value: "health", label: "Health" },
  { value: "school", label: "School" },
  { value: "insurance", label: "Insurance" },
  { value: "pet", label: "Pet" },
  { value: "travel", label: "Travel" },
];

export const VAULT_CATEGORY_LABEL: Record<VaultCategory, string> =
  Object.fromEntries(
    VAULT_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
  ) as Record<VaultCategory, string>;

// A doc-type tile maps a tappable icon to the VaultCategory it files under plus a
// sensible default title, so adding a document is a tap + a name (no AI).
export type DocumentTypeMeta = {
  key: string;
  label: string;
  icon: LucideIcon;
  category: VaultCategory;
  defaultTitle: string;
};

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  {
    key: "passport",
    label: "Passport",
    icon: BookUser,
    category: "identity",
    defaultTitle: "Passport",
  },
  {
    key: "insurance",
    label: "Insurance card",
    icon: ShieldPlus,
    category: "insurance",
    defaultTitle: "Insurance card",
  },
  {
    key: "birth-certificate",
    label: "Birth certificate",
    icon: FileText,
    category: "identity",
    defaultTitle: "Birth certificate",
  },
  {
    key: "medical",
    label: "Medical",
    icon: Stethoscope,
    category: "health",
    defaultTitle: "Medical record",
  },
  {
    key: "vaccine",
    label: "Vaccine record",
    icon: ShieldPlus,
    category: "health",
    defaultTitle: "Vaccine record",
  },
  {
    key: "school-form",
    label: "School form",
    icon: GraduationCap,
    category: "school",
    defaultTitle: "School form",
  },
  {
    key: "id",
    label: "ID",
    icon: IdCard,
    category: "identity",
    defaultTitle: "ID card",
  },
  {
    key: "other",
    label: "Other",
    icon: FileText,
    category: "identity",
    defaultTitle: "Document",
  },
];
