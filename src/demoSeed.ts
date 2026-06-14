import type { DailyBrief } from "./dailyBrief";
import type { LifeMapAnalysis } from "./lifemap";

export const presentationIntake = `School portal, travel reminder, and pet care notes:

Emma's field trip permission slip is due tomorrow. The school still needs the parent signature.
Alex needs to renew the passport before the Maui trip.
Milo has a vet appointment on Jun 18 at 10:30 AM.`;

export const presentationAnalysis: LifeMapAnalysis = {
  dueItems: [
    {
      id: "due-field-trip-slip",
      title: "Field trip permission slip",
      dueDate: "Tomorrow",
      sourceQuote: "Emma's field trip permission slip is due tomorrow.",
    },
    {
      id: "due-passport",
      title: "Renew passport",
      dueDate: "In 12 days",
      sourceQuote: "Alex needs to renew the passport before the Maui trip.",
    },
    {
      id: "due-milo-vet",
      title: "Milo vet appointment",
      dueDate: "Jun 18 at 10:30 AM",
      sourceQuote: "Milo has a vet appointment on Jun 18 at 10:30 AM.",
    },
  ],
  missingInfo: [
    {
      id: "missing-parent-signature",
      label: "Parent signature",
      reason: "The school still needs the signed permission slip.",
      sourceQuote: "The school still needs the parent signature.",
    },
  ],
  waitingOn: [
    {
      id: "wait-school",
      name: "Westview School",
      reason: "Needs the signed permission slip returned.",
    },
  ],
  nextActions: [
    {
      id: "action-sign-slip",
      label: "Field trip permission slip",
      owner: "Emma",
    },
    {
      id: "action-renew-passport",
      label: "Renew passport",
      owner: "You",
    },
    {
      id: "action-milo-vet",
      label: "Milo vet appointment",
      owner: "Milo",
    },
  ],
  reminders: [
    {
      id: "reminder-slip",
      title: "Field trip permission slip due",
      body: "Remind Alex to sign and return Emma's permission slip tomorrow.",
      status: "Scheduled",
    },
    {
      id: "reminder-vet",
      title: "Milo vet appointment",
      body: "Remind Alex about Milo's vet appointment on Jun 18 at 10:30 AM.",
      status: "Scheduled",
    },
  ],
  draftMessages: [
    {
      id: "draft-teacher",
      recipient: "Westview School",
      subject: "Emma field trip permission slip",
      body: "Hi, I will return Emma's signed field trip permission slip tomorrow.",
      status: "Needs review",
    },
  ],
  sourceEvidence: [
    {
      id: "source-school",
      type: "note",
      label: "School portal",
      quote: "Field trip permission slip is due tomorrow.",
    },
    {
      id: "source-travel",
      type: "note",
      label: "Travel reminder",
      quote: "Renew the passport before the Maui trip.",
    },
    {
      id: "source-health",
      type: "note",
      label: "Pet care",
      quote: "Milo has a vet appointment on Jun 18 at 10:30 AM.",
    },
  ],
};

export const presentationBrief: DailyBrief = {
  todaySummary: "3 things need your attention today.",
  topPriorities: [
    {
      id: "priority-slip",
      label: "Field trip permission slip",
      reason: "Due tomorrow - Emma",
    },
    {
      id: "priority-passport",
      label: "Renew passport",
      reason: "Due in 12 days - You",
    },
    {
      id: "priority-vet",
      label: "Milo vet appointment",
      reason: "Jun 18 at 10:30 AM",
    },
  ],
  openLoops: [
    {
      id: "loop-signature",
      label: "Parent signature",
      blockedBy: "The field trip slip still needs a signature.",
    },
  ],
  canWait: [],
  suggestedMessages: presentationAnalysis.draftMessages,
  conflicts: [],
  groundingNote: "Grounded in school, travel, and pet care notes.",
};
