export type LaunchPlanStatus = "ready" | "next" | "queued";

export type LaunchPlanItem = {
  id: string;
  title: string;
  nextAction: string;
  status: LaunchPlanStatus;
};

export type LaunchPlanSection = {
  id: string;
  title: string;
  description: string;
  items: LaunchPlanItem[];
};

export const launchPlanSections: LaunchPlanSection[] = [
  {
    id: "preview-access",
    title: "Preview + access",
    description: "Make the app easy to open, test, and hand to a first reviewer.",
    items: [
      {
        id: "prod-preview-live",
        title: "Production preview opens",
        nextAction: "Use the Cloudflare Pages URL on desktop and iPhone.",
        status: "ready",
      },
      {
        id: "founder-signin-path",
        title: "Founder sign-in path is obvious",
        nextAction: "Create a known test account or add a demo bypass before demos.",
        status: "next",
      },
      {
        id: "iphone-smoke-test",
        title: "iPhone smoke test is repeatable",
        nextAction: "Open the deployed URL, sign in, and capture one messy task.",
        status: "next",
      },
    ],
  },
  {
    id: "core-workflow",
    title: "Core LifeMap workflow",
    description: "Prove the promise: messy intake becomes a calm map of next moves.",
    items: [
      {
        id: "brain-dump-to-map",
        title: "Brain dump turns into an organized map",
        nextAction: "Paste a real family-admin note and run Analyze intake.",
        status: "ready",
      },
      {
        id: "source-evidence-visible",
        title: "Source evidence is visible",
        nextAction: "Confirm due dates and missing info show source quotes.",
        status: "ready",
      },
      {
        id: "approval-gate",
        title: "Drafts stay approval-gated",
        nextAction: "Stage a reminder or draft and confirm nothing sends automatically.",
        status: "ready",
      },
    ],
  },
  {
    id: "daily-utility",
    title: "Daily utility",
    description: "Make the home screen useful enough to come back to tomorrow.",
    items: [
      {
        id: "daily-brief-surface",
        title: "Daily Brief is the post-login home",
        nextAction: "Check that Today explains what needs attention now.",
        status: "ready",
      },
      {
        id: "day-two-return-hook",
        title: "Day-2 return hook is clear",
        nextAction: "Decide the one reason a parent would reopen LifeMap tomorrow.",
        status: "next",
      },
    ],
  },
  {
    id: "life-logistics",
    title: "Cabinet / calendar / family logistics",
    description: "Keep the life-admin buckets concrete: documents, dates, travel, health.",
    items: [
      {
        id: "calendar-vault-projections",
        title: "Calendar and Cabinet use current AI analysis",
        nextAction: "Verify school, travel, health, and document items show up.",
        status: "ready",
      },
      {
        id: "travel-logistics-bucket",
        title: "Travel logistics bucket is defined",
        nextAction: "Add packing, rewards, TSA, passports, and trip documents to the roadmap.",
        status: "queued",
      },
      {
        id: "family-records-bucket",
        title: "Family records bucket is defined",
        nextAction: "Map insurance cards, IDs, pet vaccines, school lunches, and meds.",
        status: "queued",
      },
    ],
  },
  {
    id: "security-persistence",
    title: "Security + persistence",
    description: "Keep trust high while the MVP stays small and reviewable.",
    items: [
      {
        id: "no-client-secrets",
        title: "No secrets in client code",
        nextAction: "Confirm OpenAI and service keys never appear in built assets.",
        status: "next",
      },
      {
        id: "supabase-restore",
        title: "Supabase restore works after sign-in",
        nextAction: "Log out and back in, then confirm saved state returns.",
        status: "next",
      },
      {
        id: "privacy-copy-visible",
        title: "Privacy copy is visible",
        nextAction: "Confirm the UI says drafts wait for approval and data stays controlled.",
        status: "ready",
      },
    ],
  },
  {
    id: "deployment-presentation",
    title: "Cloudflare deploy + presentation readiness",
    description: "Get ready for a calm, repeatable founder demo.",
    items: [
      {
        id: "cloudflare-pages-live",
        title: "Cloudflare Pages is live",
        nextAction: "Keep the production URL handy for review and phone testing.",
        status: "ready",
      },
      {
        id: "worker-health-live",
        title: "AI worker health check is live",
        nextAction: "Verify the Worker URL responds before recording the demo.",
        status: "ready",
      },
      {
        id: "founder-demo-script",
        title: "Five-minute demo script is rehearsed",
        nextAction: "Practice the story: brain dump, map, Daily Brief, approve.",
        status: "queued",
      },
    ],
  },
];

export const defaultCheckedLaunchPlanItemIds = [
  "prod-preview-live",
  "brain-dump-to-map",
  "source-evidence-visible",
  "approval-gate",
  "daily-brief-surface",
  "calendar-vault-projections",
  "privacy-copy-visible",
  "cloudflare-pages-live",
  "worker-health-live",
];
