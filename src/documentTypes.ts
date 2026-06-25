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
