# LifeMap Mobile Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the LifeMap mobile shell and core flow so the app feels calm, obvious, customizable, and safe instead of like a crowded dashboard.

**Architecture:** Keep the current React/Vite single-page app and `App.tsx` view state. Implement the reset as focused frontend slices: profile customization model, profile UI rebuild, nav/Review demotion, shell/token cleanup, then verified Cloudflare review. Use existing encrypted `family_members.details` for custom profile sections/fields so the first slice avoids protected database migrations.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Testing Library, Playwright, lucide-react, existing Supabase client/data layer, npm.

---

## Scope Check

This plan implements the first slice from `docs/superpowers/specs/2026-06-28-lifemap-mobile-reset-design.md`.

In scope:

- Mobile safe-area and dock cleanup.
- Bottom nav reset to `Cabinet | Home | Family | Settings`.
- Home remains the elevated visual anchor.
- Review remains available as a safety gate, but not as a permanent dock item.
- Profile pages become customizable with sections and custom fields.
- Theme/token cleanup for nav, active states, buttons, and profile sections.
- Tests and Cloudflare review.

Out of scope:

- Supabase schema changes or migrations.
- Auth changes.
- Worker/API changes.
- Billing.
- New production dependencies.
- Full redesign of Capture, Vault, Calendar, or Settings.

## File Map

- `src/profileSections.ts`
  - New pure model for default sections, custom section records, custom fields, and conversion from/to `FamilyMember.details`.
- `src/profileSections.test.ts`
  - Unit tests for default sections, custom section addition, custom field addition, and backwards-compatible legacy details.
- `src/familyOS.ts`
  - Extend `FamilyMember.details` item shape with optional section metadata. No runtime behavior change by itself.
- `src/App.tsx`
  - Add `handleUpdateFamilyMember`, pass customization handlers to `MemberProfileView`, reset dock nav, and route Review through Home/Settings instead of a dock item.
- `src/TodayView.tsx`
  - Add a conditional "Needs your OK" entry when approvals exist.
- `src/TodayView.test.tsx`
  - Test the conditional Review entry and preserve the simplified Home behavior.
- `src/MemberProfileView.tsx`
  - Replace fixed Health/School rows with section cards, add-section form, add-field form, and section actions.
- `src/MemberProfileView.test.tsx`
  - Replace fixed category tests with customizable section tests.
- `src/styles.css`
  - Token-driven dock, safe-area shell spacing, profile section layout, liquid Home anchor.
- `src/App.test.tsx`
  - Update nav expectations, Review access expectations, and profile customization flow.
- `tests/e2e/smoke.spec.ts`
  - Update nav smoke flow and add Review access through the Home safety card.
- `tests/e2e/motion.spec.ts`
  - Keep low-stim motion checks aligned with the Home primary action.

---

### Task 1: Add Profile Section Model

**Files:**

- Modify: `src/familyOS.ts`
- Create: `src/profileSections.ts`
- Create: `src/profileSections.test.ts`

- [ ] **Step 1: Write failing tests for profile section behavior**

Create `src/profileSections.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import type { FamilyMember } from "./familyOS";
import {
  addProfileField,
  addProfileSection,
  defaultProfileSections,
  profileFieldsForMember,
  profileSectionsForMember,
} from "./profileSections";

const child: FamilyMember = {
  id: "dragon",
  name: "Dragon",
  role: "Child",
  initials: "DR",
  profileType: "child",
  details: [],
  careNotes: [],
};

describe("profileSections", () => {
  test("suggests child sections without requiring user setup", () => {
    expect(defaultProfileSections(child).map((section) => section.name)).toEqual([
      "Health",
      "School",
      "Documents",
      "Important dates",
      "Activities",
    ]);
  });

  test("adds a custom section as encrypted member detail metadata", () => {
    const updated = addProfileSection(child, "Therapy");

    expect(profileSectionsForMember(updated).map((section) => section.name)).toContain(
      "Therapy",
    );
    expect(updated.details).toContainEqual(
      expect.objectContaining({
        detailType: "section",
        value: "Therapy",
      }),
    );
  });

  test("adds a custom field under a profile section", () => {
    const withSection = addProfileSection(child, "Therapy");
    const section = profileSectionsForMember(withSection).find(
      (item) => item.name === "Therapy",
    );
    expect(section).toBeDefined();

    const updated = addProfileField(withSection, {
      sectionId: section!.id,
      label: "Provider",
      value: "Dr. Rivera",
      private: true,
    });

    expect(profileFieldsForMember(updated)).toContainEqual(
      expect.objectContaining({
        sectionId: section!.id,
        label: "Provider",
        value: "Dr. Rivera",
        private: true,
      }),
    );
  });

  test("keeps legacy label/value details visible", () => {
    const legacy: FamilyMember = {
      ...child,
      details: [{ label: "Teacher", value: "Ms. Lee" }],
    };

    expect(profileFieldsForMember(legacy)).toContainEqual(
      expect.objectContaining({
        label: "Teacher",
        value: "Ms. Lee",
        sectionId: "school",
      }),
    );
  });
});
```

- [ ] **Step 2: Run the failing model test**

Run:

```bash
npx vitest run src/profileSections.test.ts
```

Expected: FAIL because `src/profileSections.ts` does not exist.

- [ ] **Step 3: Extend the family detail type**

Modify `src/familyOS.ts` so `FamilyMember.details` can carry backwards-compatible metadata:

```ts
export type FamilyMemberDetail = {
  id?: string;
  label: string;
  value: string;
  detailType?: "field" | "section";
  sectionId?: string;
  order?: number;
  private?: boolean;
};

export type FamilyMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  profileType: "adult" | "child" | "pet";
  details: FamilyMemberDetail[];
  careNotes: string[];
};
```

This remains compatible with existing rows because old `{ label, value }` entries still satisfy `FamilyMemberDetail`.

- [ ] **Step 4: Implement profile section helpers**

Create `src/profileSections.ts`:

```ts
import type { FamilyMember, FamilyMemberDetail } from "./familyOS";

export type ProfileSectionKind =
  | "health"
  | "school"
  | "documents"
  | "dates"
  | "activities"
  | "ids"
  | "insurance"
  | "travel"
  | "household"
  | "vet"
  | "vaccines"
  | "care"
  | "custom";

export type ProfileSection = {
  id: string;
  name: string;
  kind: ProfileSectionKind;
  order: number;
  custom?: boolean;
};

export type ProfileField = {
  id: string;
  sectionId: string;
  label: string;
  value: string;
  private: boolean;
};

const DEFAULTS: Record<FamilyMember["profileType"], ProfileSection[]> = {
  child: [
    { id: "health", name: "Health", kind: "health", order: 10 },
    { id: "school", name: "School", kind: "school", order: 20 },
    { id: "documents", name: "Documents", kind: "documents", order: 30 },
    { id: "important-dates", name: "Important dates", kind: "dates", order: 40 },
    { id: "activities", name: "Activities", kind: "activities", order: 50 },
  ],
  adult: [
    { id: "ids", name: "IDs", kind: "ids", order: 10 },
    { id: "insurance", name: "Insurance", kind: "insurance", order: 20 },
    { id: "health", name: "Health", kind: "health", order: 30 },
    { id: "travel", name: "Travel", kind: "travel", order: 40 },
    { id: "household", name: "Household", kind: "household", order: 50 },
  ],
  pet: [
    { id: "vet", name: "Vet", kind: "vet", order: 10 },
    { id: "vaccines", name: "Vaccines", kind: "vaccines", order: 20 },
    { id: "insurance", name: "Insurance", kind: "insurance", order: 30 },
    { id: "care", name: "Care", kind: "care", order: 40 },
    { id: "documents", name: "Documents", kind: "documents", order: 50 },
  ],
};

export function defaultProfileSections(member: FamilyMember): ProfileSection[] {
  return DEFAULTS[member.profileType].map((section) => ({ ...section }));
}

export function profileSectionsForMember(member: FamilyMember): ProfileSection[] {
  const defaults = defaultProfileSections(member);
  const custom = member.details
    .filter((detail) => detail.detailType === "section")
    .map((detail, index): ProfileSection => ({
      id: detail.id ?? slugId(detail.value),
      name: detail.value,
      kind: "custom",
      order: detail.order ?? 100 + index,
      custom: true,
    }));

  const seen = new Set<string>();
  return [...defaults, ...custom]
    .filter((section) => {
      if (seen.has(section.id)) return false;
      seen.add(section.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);
}

export function profileFieldsForMember(member: FamilyMember): ProfileField[] {
  return member.details
    .filter((detail) => detail.detailType !== "section")
    .map((detail, index) => ({
      id: detail.id ?? `${member.id}-detail-${index}`,
      sectionId: detail.sectionId ?? inferSectionId(detail.label, member),
      label: detail.label,
      value: detail.value,
      private: detail.private ?? true,
    }));
}

export function addProfileSection(
  member: FamilyMember,
  name: string,
): FamilyMember {
  const trimmed = name.trim();
  if (!trimmed) return member;
  const id = `custom-${slugId(trimmed)}`;
  const exists = profileSectionsForMember(member).some(
    (section) => section.id === id || section.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return member;

  const detail: FamilyMemberDetail = {
    id,
    detailType: "section",
    label: "Profile section",
    value: trimmed,
    order: 100 + member.details.filter((item) => item.detailType === "section").length,
    private: true,
  };

  return { ...member, details: [...member.details, detail] };
}

export function addProfileField(
  member: FamilyMember,
  field: Omit<ProfileField, "id">,
): FamilyMember {
  const label = field.label.trim();
  const value = field.value.trim();
  if (!label || !value) return member;

  return {
    ...member,
    details: [
      ...member.details,
      {
        id: crypto.randomUUID(),
        detailType: "field",
        sectionId: field.sectionId,
        label,
        value,
        private: field.private,
      },
    ],
  };
}

function inferSectionId(label: string, member: FamilyMember): string {
  const normalized = label.toLowerCase();
  if (/school|teacher|grade|test/.test(normalized)) return "school";
  if (/allergy|medication|doctor|insurance|health/.test(normalized)) return "health";
  if (/vet|microchip|rabies|food/.test(normalized)) return member.profileType === "pet" ? "vet" : "health";
  if (/passport|tsa|precheck|global entry|travel/.test(normalized)) return "travel";
  return member.profileType === "adult" ? "household" : "documents";
}

function slugId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 5: Run focused model tests**

Run:

```bash
npx vitest run src/profileSections.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/familyOS.ts src/profileSections.ts src/profileSections.test.ts
git commit -m "feat(profile): add customizable section model"
```

---

### Task 2: Rebuild Member Profile Around Custom Sections

**Files:**

- Modify: `src/MemberProfileView.tsx`
- Modify: `src/MemberProfileView.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write failing profile UI tests**

Replace or extend `src/MemberProfileView.test.tsx` with tests for sections and field entry:

```ts
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import MemberProfileView from "./MemberProfileView";
import type { FamilyMember } from "./familyOS";

const member: FamilyMember = {
  id: "casey",
  name: "Casey Kim",
  role: "Grade 4",
  initials: "CK",
  profileType: "child",
  details: [{ label: "Teacher", value: "Ms. Rivera" }],
  careNotes: [],
};

function renderProfile(overrides: Partial<FamilyMember> = {}) {
  const onAddDocument = vi.fn();
  const onAddDate = vi.fn();
  const onUpdateMember = vi.fn();
  render(
    <MemberProfileView
      member={{ ...member, ...overrides }}
      vaultItems={[]}
      familyEvents={[]}
      onBack={vi.fn()}
      onAddDocument={onAddDocument}
      onAddDate={onAddDate}
      onUpdateMember={onUpdateMember}
    />,
  );
  return { onAddDate, onAddDocument, onUpdateMember };
}

describe("MemberProfileView customizable sections", () => {
  test("renders default child sections and legacy details in the right section", () => {
    renderProfile();

    expect(screen.getByRole("heading", { name: "Casey Kim's info" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Health" })).toBeInTheDocument();
    const school = screen.getByRole("region", { name: "School" });
    expect(within(school).getByText("Teacher")).toBeInTheDocument();
    expect(within(school).getByText("Ms. Rivera")).toBeInTheDocument();
  });

  test("adds a custom section from the profile", async () => {
    const user = userEvent.setup();
    const { onUpdateMember } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Add section" }));
    await user.type(screen.getByLabelText("Section name"), "Therapy");
    await user.click(screen.getByRole("button", { name: "Save section" }));

    expect(onUpdateMember).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({ detailType: "section", value: "Therapy" }),
        ]),
      }),
    );
  });

  test("adds a custom field to a section", async () => {
    const user = userEvent.setup();
    const { onUpdateMember } = renderProfile();

    const health = screen.getByRole("region", { name: "Health" });
    await user.click(within(health).getByRole("button", { name: "Add field" }));
    await user.type(screen.getByLabelText("Field label"), "Allergy");
    await user.type(screen.getByLabelText("Field value"), "Peanuts");
    await user.click(screen.getByRole("button", { name: "Save field" }));

    expect(onUpdateMember).toHaveBeenCalledWith(
      expect.objectContaining({
        details: expect.arrayContaining([
          expect.objectContaining({
            detailType: "field",
            sectionId: "health",
            label: "Allergy",
            value: "Peanuts",
          }),
        ]),
      }),
    );
  });

  test("keeps document and date shortcuts for known sections", async () => {
    const user = userEvent.setup();
    const { onAddDocument, onAddDate } = renderProfile();

    await user.click(screen.getByRole("button", { name: "Add health document" }));
    await user.click(screen.getByRole("button", { name: "Add school date" }));

    expect(onAddDocument).toHaveBeenCalledWith("medical");
    expect(onAddDate).toHaveBeenCalledWith("school");
  });
});
```

- [ ] **Step 2: Run the failing profile tests**

Run:

```bash
npx vitest run src/MemberProfileView.test.tsx
```

Expected: FAIL because `onUpdateMember`, the add-section form, and add-field form are not implemented.

- [ ] **Step 3: Add update callback to `MemberProfileViewProps`**

Modify `src/MemberProfileView.tsx` props:

```ts
import {
  addProfileField,
  addProfileSection,
  profileFieldsForMember,
  profileSectionsForMember,
  type ProfileSection,
} from "./profileSections";

export type MemberProfileViewProps = {
  member: FamilyMember;
  vaultItems: VaultItem[];
  familyEvents: FamilyEvent[];
  onBack: () => void;
  onAddDocument: (docTypeKey?: string) => void;
  onAddDate: (category?: DateCategory) => void;
  onUpdateMember: (member: FamilyMember) => void;
};
```

- [ ] **Step 4: Replace fixed Health/School layout with section cards**

Inside `MemberProfileView`, derive sections and fields:

```ts
const sections = profileSectionsForMember(member);
const fields = profileFieldsForMember(member);
const fieldsBySection = new Map<string, typeof fields>();
for (const field of fields) {
  fieldsBySection.set(field.sectionId, [
    ...(fieldsBySection.get(field.sectionId) ?? []),
    field,
  ]);
}
```

Render each section as:

```tsx
<section
  key={section.id}
  className="profile-section-card"
  aria-label={section.name}
>
  <div className="profile-section-head">
    <h3>{section.name}</h3>
    <button type="button" onClick={() => setFieldSectionId(section.id)}>
      Add field
    </button>
  </div>
  <ProfileSectionActions
    section={section}
    onAddDate={onAddDate}
    onAddDocument={onAddDocument}
  />
  <ProfileFieldList fields={fieldsBySection.get(section.id) ?? []} />
</section>
```

Add small local helper components in the same file:

```tsx
function ProfileSectionActions({
  section,
  onAddDate,
  onAddDocument,
}: {
  section: ProfileSection;
  onAddDate: (category?: DateCategory) => void;
  onAddDocument: (docTypeKey?: string) => void;
}) {
  if (section.kind === "health") {
    return (
      <div className="profile-section-actions">
        <button type="button" onClick={() => onAddDocument("medical")}>
          Add health document
        </button>
        <button type="button" onClick={() => onAddDocument("vaccine")}>
          Add vaccine
        </button>
      </div>
    );
  }

  if (section.kind === "school") {
    return (
      <div className="profile-section-actions">
        <button type="button" onClick={() => onAddDate("school")}>
          Add school date
        </button>
        <button type="button" onClick={() => onAddDocument("school")}>
          Add school document
        </button>
      </div>
    );
  }

  if (section.kind === "travel") {
    return (
      <div className="profile-section-actions">
        <button type="button" onClick={() => onAddDocument("travel")}>
          Add travel document
        </button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 5: Add section form behavior**

Add local state:

```ts
const [isAddingSection, setIsAddingSection] = useState(false);
const [sectionName, setSectionName] = useState("");
```

Add form below the section list:

```tsx
{isAddingSection ? (
  <form
    className="profile-inline-form"
    onSubmit={(event) => {
      event.preventDefault();
      const updated = addProfileSection(member, sectionName);
      onUpdateMember(updated);
      setSectionName("");
      setIsAddingSection(false);
    }}
  >
    <label>
      <span>Section name</span>
      <input
        value={sectionName}
        onChange={(event) => setSectionName(event.target.value)}
      />
    </label>
    <button type="submit">Save section</button>
  </form>
) : (
  <button type="button" className="profile-add-section" onClick={() => setIsAddingSection(true)}>
    Add section
  </button>
)}
```

- [ ] **Step 6: Add field form behavior**

Add local state:

```ts
const [fieldSectionId, setFieldSectionId] = useState<string>();
const [fieldLabel, setFieldLabel] = useState("");
const [fieldValue, setFieldValue] = useState("");
const [fieldPrivate, setFieldPrivate] = useState(true);
```

Render the form when `fieldSectionId` is set:

```tsx
{fieldSectionId ? (
  <form
    className="profile-inline-form"
    onSubmit={(event) => {
      event.preventDefault();
      const updated = addProfileField(member, {
        sectionId: fieldSectionId,
        label: fieldLabel,
        value: fieldValue,
        private: fieldPrivate,
      });
      onUpdateMember(updated);
      setFieldSectionId(undefined);
      setFieldLabel("");
      setFieldValue("");
      setFieldPrivate(true);
    }}
  >
    <label>
      <span>Field label</span>
      <input value={fieldLabel} onChange={(event) => setFieldLabel(event.target.value)} />
    </label>
    <label>
      <span>Field value</span>
      <input value={fieldValue} onChange={(event) => setFieldValue(event.target.value)} />
    </label>
    <label className="profile-checkbox">
      <input
        type="checkbox"
        checked={fieldPrivate}
        onChange={(event) => setFieldPrivate(event.target.checked)}
      />
      <span>Keep private until revealed</span>
    </label>
    <button type="submit">Save field</button>
  </form>
) : null}
```

- [ ] **Step 7: Wire member updates in `App.tsx`**

Add a save handler near `handleAddPerson`:

```ts
async function handleUpdateFamilyMember(member: FamilyMember): Promise<void> {
  if (isSupabaseConfigured && session) {
    const userId = session.user.id;
    const client = getSupabase() as unknown as FamilyDataClient;
    const crypto = await ensureFieldCrypto(session.access_token);
    const result = await upsertFamilyMember(userId, member, client, crypto);
    if (!result.ok) {
      setToastMessage("Couldn't save that profile. Try again.");
      return;
    }
    setCollections((current) => ({
      ...current,
      familyMembers: current.familyMembers.map((item) =>
        item.id === result.item.id ? result.item : item,
      ),
    }));
    return;
  }

  setCollections((current) => ({
    ...current,
    familyMembers: current.familyMembers.map((item) =>
      item.id === member.id ? member : item,
    ),
  }));
}
```

Pass it to `MemberProfileView`:

```tsx
<MemberProfileView
  member={selectedMember}
  vaultItems={collections.vaultItems}
  familyEvents={collections.familyEvents}
  onBack={() => setView("today")}
  onAddDocument={(docTypeKey = "other") => {
    setAddSheetOwner(selectedMember.name);
    setQuickAddDocTypeKey(docTypeKey);
    setQuickAdd("document");
  }}
  onAddDate={(category = "custom") => {
    setAddSheetOwner(selectedMember.name);
    setQuickAddDateCategory(category);
    setQuickAdd("date");
  }}
  onUpdateMember={(member) => void handleUpdateFamilyMember(member)}
/>
```

- [ ] **Step 8: Replace old profile CSS**

In `src/styles.css`, keep `.member-profile`, `.member-back`, `.member-id`, `.member-list`, `.member-row`, and replace `.member-category-*` rules with:

```css
.profile-section-grid {
  display: grid;
  gap: 10px;
}

.profile-section-card {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-panel);
  background: var(--color-surface-panel);
}

.profile-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-section-head h3 {
  margin: 0;
  color: var(--color-text-strong);
  font-size: 17px;
  letter-spacing: 0;
}

.profile-section-actions,
.profile-field-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-section-actions button,
.profile-section-head button,
.profile-add-section,
.profile-inline-form button {
  min-height: 38px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-surface-row);
  color: var(--color-text-primary);
  font: inherit;
  font-size: 13px;
  font-weight: 720;
}

.profile-field-list {
  display: grid;
}

.profile-field-row {
  display: grid;
  gap: 3px;
  padding: 10px 0;
  border-top: 1px solid var(--color-border-subtle);
}

.profile-field-row strong {
  color: var(--color-text-strong);
  font-size: 13px;
}

.profile-field-row span {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.profile-inline-form {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-panel);
  background: var(--color-surface-row);
}

.profile-inline-form label {
  display: grid;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.profile-inline-form input {
  min-height: 40px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-control);
  background: var(--color-surface-panel);
  color: var(--color-text-primary);
  font: inherit;
  padding: 0 12px;
}

.profile-checkbox {
  display: flex !important;
  grid-template-columns: auto 1fr;
  align-items: center;
}
```

- [ ] **Step 9: Run focused tests**

Run:

```bash
npx vitest run src/profileSections.test.ts src/MemberProfileView.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/MemberProfileView.tsx src/MemberProfileView.test.tsx src/styles.css
git commit -m "feat(profile): make member profiles customizable"
```

---

### Task 3: Demote Review From Dock And Add Home Safety Entry

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/TodayView.tsx`
- Modify: `src/TodayView.test.tsx`
- Modify: `src/App.test.tsx`
- Modify: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Update failing App nav test**

In `src/App.test.tsx`, update the demo login nav assertion:

```ts
expect(
  within(primaryNav)
    .getAllByRole("button")
    .map((button) => button.textContent),
).toEqual(["Cabinet", "Home", "Family", "Settings"]);

expect(
  within(primaryNav).queryByRole("button", { name: "Review" }),
).not.toBeInTheDocument();
```

Add a Review access assertion:

```ts
expect(screen.getByRole("button", { name: /Needs your OK/i })).toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /Needs your OK/i }));
expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
```

- [ ] **Step 2: Update failing TodayView test**

In `src/TodayView.test.tsx`, add `onOpenReview` to the render helper and test:

```ts
test("shows a review entry only when approvals are waiting", async () => {
  const user = userEvent.setup();
  const onOpenReview = vi.fn();
  renderToday({ approvalCount: 2, onOpenReview });

  await user.click(screen.getByRole("button", { name: /Needs your OK/i }));

  expect(onOpenReview).toHaveBeenCalledTimes(1);
});
```

Also test the absence state:

```ts
test("does not show the review entry when no approvals are waiting", () => {
  renderToday({ approvalCount: 0 });
  expect(screen.queryByRole("button", { name: /Needs your OK/i })).toBeNull();
});
```

- [ ] **Step 3: Run the failing tests**

Run:

```bash
npx vitest run src/TodayView.test.tsx src/App.test.tsx
```

Expected: FAIL because Review is still in nav and Today lacks `onOpenReview`.

- [ ] **Step 4: Add `onOpenReview` to TodayView**

Modify `TodayViewProps`:

```ts
onOpenReview: () => void;
```

Render a small card after the smart drop when `approvalCount > 0`:

```tsx
{approvalCount > 0 ? (
  <button
    className="home-review-entry"
    type="button"
    onClick={onOpenReview}
  >
    <span className="atlas-eyebrow">Needs your OK</span>
    <strong>{approvalCount} waiting for approval</strong>
    <span>Nothing sends or changes until you say yes.</span>
    <ChevronRight size={15} />
  </button>
) : null}
```

- [ ] **Step 5: Pass the Review route from App**

In the `TodayView` render inside `src/App.tsx`, add:

```tsx
onOpenReview={() => setView("review")}
```

- [ ] **Step 6: Remove Review from bottom nav**

In `src/App.tsx`, remove the Review dock button:

```tsx
<button
  className={view === "review" ? "nav-item active" : "nav-item"}
  type="button"
  onClick={() => setView("review")}
>
  <CheckCircle2 size={18} />
  <span>Review</span>
</button>
```

Keep Review reachable through:

- Home conditional entry.
- Settings `Approvals & permissions`.
- Existing capture route paths where `CaptureRoute.destination === "review"`.

- [ ] **Step 7: Update E2E smoke nav flow**

In `tests/e2e/smoke.spec.ts`, change:

```ts
for (const tab of ["Cabinet", "Review", "Family", "Settings", "Home"] as const) {
```

to:

```ts
for (const tab of ["Cabinet", "Family", "Settings", "Home"] as const) {
```

Replace the Review nav test setup:

```ts
await nav.getByRole("button", { name: "Review", exact: true }).click();
```

with:

```ts
await page.getByRole("button", { name: /Needs your OK/i }).click();
```

- [ ] **Step 8: Add CSS for Home review entry**

In `src/styles.css` near the Home styles:

```css
.home-review-entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 10px;
  align-items: center;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid var(--color-border-subtle);
  border-radius: 18px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.86), rgba(255, 249, 243, 0.74)),
    var(--color-surface-panel);
  color: var(--color-text-primary);
  font: inherit;
  text-align: left;
}

.home-review-entry strong,
.home-review-entry span {
  grid-column: 1;
}

.home-review-entry svg {
  grid-column: 2;
  grid-row: 1 / span 3;
  color: var(--color-accent-blue);
}
```

- [ ] **Step 9: Run focused tests**

Run:

```bash
npx vitest run src/TodayView.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/TodayView.tsx src/TodayView.test.tsx src/App.test.tsx tests/e2e/smoke.spec.ts src/styles.css
git commit -m "feat(nav): move review behind home safety entry"
```

---

### Task 4: Mobile Shell And Token Cleanup

**Files:**

- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `src/theme.test.ts`
- Modify: `tests/e2e/motion.spec.ts`
- Create: `tests/e2e/mobile-shell.spec.ts`

- [ ] **Step 1: Add failing E2E safe-area test**

Create `tests/e2e/mobile-shell.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

async function enter(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Login as Alex Kim" }).click();
}

test.describe("mobile shell", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

  test("keeps the page title below browser-safe app padding", async ({ page }) => {
    await enter(page);
    const heading = page.getByRole("heading", { name: "Today" });
    const box = await heading.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual(18);
  });

  test("keeps the final content above the fixed dock", async ({ page }) => {
    await enter(page);
    await page.getByRole("button", { name: "Family" }).click();
    await page.getByRole("button", { name: "Open Casey Kim's profile" }).click();

    const dock = page.getByRole("navigation", { name: "Household sections" });
    const dockBox = await dock.boundingBox();
    const lastCard = page.locator(".member-profile .calm-section").last();
    await lastCard.scrollIntoViewIfNeeded();
    const cardBox = await lastCard.boundingBox();

    expect(cardBox && dockBox ? cardBox.y + cardBox.height : 0).toBeLessThan(
      dockBox?.y ?? 844,
    );
  });
});
```

- [ ] **Step 2: Run the failing shell test**

Run:

```bash
npx playwright test tests/e2e/mobile-shell.spec.ts --project=demo-mobile
```

Expected: FAIL if current top/bottom spacing still clips or overlaps on mobile.

- [ ] **Step 3: Add semantic nav token aliases**

In `src/styles.css`, add aliases near the root token area:

```css
:root {
  --color-nav-bg: rgba(255, 255, 255, 0.72);
  --color-nav-border: rgba(104, 122, 148, 0.18);
  --color-nav-item-text: var(--color-text-secondary);
  --color-nav-item-active-bg: rgba(238, 245, 255, 0.82);
  --color-nav-item-active-text: var(--color-text-strong);
  --color-nav-home-bg: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.96),
    rgba(226, 241, 255, 0.76) 48%,
    rgba(255, 237, 226, 0.62)
  );
  --color-nav-home-text: var(--color-accent-blue);
  --shadow-dock: 0 18px 48px rgba(25, 38, 62, 0.14);
  --radius-dock: 28px;
}

html[data-theme="dark"] {
  --color-nav-bg: rgba(18, 24, 38, 0.76);
  --color-nav-border: rgba(255, 255, 255, 0.1);
  --color-nav-item-text: var(--color-text-secondary);
  --color-nav-item-active-bg: rgba(72, 143, 225, 0.18);
  --color-nav-item-active-text: var(--color-text-strong);
  --color-nav-home-bg: linear-gradient(
    145deg,
    rgba(35, 47, 72, 0.94),
    rgba(52, 88, 128, 0.74) 48%,
    rgba(128, 82, 72, 0.48)
  );
  --color-nav-home-text: var(--color-accent-blue);
  --shadow-dock: 0 18px 48px rgba(0, 0, 0, 0.28);
}
```

- [ ] **Step 4: Normalize shell safe areas**

Replace scattered bottom padding rules with a single mobile-safe shell block:

```css
.app-shell {
  min-height: 100dvh;
  padding-top: max(18px, env(safe-area-inset-top));
  padding-bottom: calc(126px + env(safe-area-inset-bottom));
}

.workspace {
  padding-top: clamp(18px, 5vw, 32px);
}

.bottom-nav {
  position: fixed;
  right: max(16px, env(safe-area-inset-right));
  bottom: max(14px, env(safe-area-inset-bottom));
  left: max(16px, env(safe-area-inset-left));
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  width: auto;
  max-width: 560px;
  margin-inline: auto;
  padding: 8px;
  border: 1px solid var(--color-nav-border);
  border-radius: var(--radius-dock);
  background: var(--color-nav-bg);
  box-shadow: var(--shadow-dock);
  -webkit-backdrop-filter: blur(24px) saturate(1.18);
  backdrop-filter: blur(24px) saturate(1.18);
}
```

Remove or override older `.bottom-nav { grid-template-columns: repeat(5...) }` blocks so the final computed grid has four columns.

- [ ] **Step 5: Make nav active states token-driven**

Replace hardcoded active nav backgrounds with:

```css
.bottom-nav .nav-item {
  color: var(--color-nav-item-text);
  background: transparent;
}

.bottom-nav .nav-item.active,
.bottom-nav .nav-item:hover {
  color: var(--color-nav-item-active-text);
  background: var(--color-nav-item-active-bg);
  box-shadow: none;
}

.bottom-nav .nav-item-primary {
  min-height: 66px;
  margin-block: -10px -4px;
  color: var(--color-nav-home-text);
  background: var(--color-nav-home-bg);
  box-shadow:
    0 20px 42px rgba(35, 69, 118, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.82);
}
```

- [ ] **Step 6: Confirm `index.html` already supports safe areas**

`index.html` already contains:

```html
content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1, user-scalable=no"
```

Do not change viewport behavior unless the E2E safe-area test proves a specific issue.

- [ ] **Step 7: Run shell and motion checks**

Run:

```bash
npx playwright test tests/e2e/mobile-shell.spec.ts --project=demo-mobile
npm run test:e2e
```

Expected: PASS. The real-auth tests may remain skipped when Supabase test env is absent.

- [ ] **Step 8: Commit**

```bash
git add src/styles.css index.html tests/e2e/mobile-shell.spec.ts tests/e2e/motion.spec.ts src/theme.test.ts
git commit -m "fix(shell): make mobile dock safe-area and token driven"
```

If `index.html`, `tests/e2e/motion.spec.ts`, or `src/theme.test.ts` did not change, leave them out of `git add`.

---

### Task 5: Full Verification, Branch Push, Cloudflare Review

**Files:**

- Modify only if previous tasks reveal small test-only follow-up issues.

- [ ] **Step 1: Check tracked diff**

Run:

```bash
git status -sb
git log --oneline --decorate -5
```

Expected:

- Branch is `redesign/stage2-today`.
- Only intended tracked changes are staged/committed.
- Existing untracked artifacts may remain, but must not be staged.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test -- --reporter=dot
npm run build
npm run test:e2e
```

Expected:

- Lint exits 0.
- Typecheck exits 0.
- Vitest exits 0.
- Build exits 0. Existing Vite chunk-size warning is acceptable if no new warning appears.
- E2E exits 0. Real-auth tests may skip if Supabase test env is unavailable.

- [ ] **Step 3: Run a local production smoke**

Run:

```bash
npm run build
npx vite preview --host 127.0.0.1 --port 4173 --strictPort
```

In a separate terminal, run:

```bash
node - <<'NODE'
import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await page.goto('http://127.0.0.1:4173', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Login as Alex Kim' }).click();
console.log('nav=' + await page.getByRole('navigation', { name: 'Household sections' }).innerText());
console.log('homeReview=' + await page.getByRole('button', { name: /Needs your OK/i }).count());
await page.getByRole('button', { name: 'Family' }).click();
await page.getByRole('button', { name: "Open Casey Kim's profile" }).click();
console.log('profile=' + await page.getByRole('heading', { name: /Casey Kim/ }).count());
console.log('addSection=' + await page.getByRole('button', { name: 'Add section' }).count());
await page.screenshot({ path: '/tmp/lifemap-mobile-reset-local.png', fullPage: true });
await browser.close();
NODE
```

Expected output:

- Nav text includes Cabinet, Home, Family, Settings.
- Review count is `1` when sample approvals exist.
- Profile count is `1`.
- Add section count is `1`.
- Screenshot exists at `/tmp/lifemap-mobile-reset-local.png`.

- [ ] **Step 4: Push the branch**

Run:

```bash
git push origin redesign/stage2-today
```

Expected: remote branch updates successfully.

- [ ] **Step 5: Deploy preview for phone review**

Run:

```bash
npm run build
npx wrangler pages deploy dist --project-name lifemap --branch redesign/stage2-today
```

Expected: Wrangler returns a preview URL.

- [ ] **Step 6: Verify production only after explicit approval**

Do not deploy to production/main in this task unless the owner explicitly says to make it reflect in production.

If approved, run:

```bash
git push origin HEAD:main
npm run deploy:pages
npm run verify:production
```

Expected: production verification passes all checks.

- [ ] **Step 7: Final report**

Report:

- commits created,
- branch URL or production URL,
- checks run,
- expected skips or warnings,
- untracked artifacts left untouched,
- whether production was or was not updated.

---

## Required Final Acceptance Checklist

- [ ] Home is still simple: one main move, one drop entry, optional Review card.
- [ ] Bottom dock has four destinations: Cabinet, Home, Family, Settings.
- [ ] Review is reachable but not permanent nav.
- [ ] Family opens people/pets.
- [ ] Profile sections are customizable.
- [ ] Custom fields can be added to sections.
- [ ] Profile field data stays on the encrypted `family_members.details` path when saved to Supabase.
- [ ] Mobile headings are not clipped by iOS Safari chrome.
- [ ] Bottom dock does not hide final content.
- [ ] Nav colors respond through semantic tokens.
- [ ] No auth, RLS, migration, billing, or worker behavior changed.
- [ ] `npm run lint`, `npm run typecheck`, `npm run test -- --reporter=dot`, `npm run build`, and `npm run test:e2e` pass before deploy.
