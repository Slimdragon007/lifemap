import { describe, expect, test } from "vitest";
import { analyzeIntake, buildApprovalQueue, normalizeAnalysis } from "./lifemap";

const intake = `From: nurse@WestviewPeds.com
To: Alex Kim
Subject: Immunization record + camp form

Hi Alex,
Casey is missing the Meningococcal (MCV4) vaccine.
Please get this done and send us the updated record by 6/10.
Also attached is the Summer Camp Medical Form.
Thanks!`;

describe("analyzeIntake", () => {
  test("extracts due items, missing info, waiting party, and next actions from messy family admin", () => {
    const result = analyzeIntake(intake);

    expect(result.dueItems).toEqual([
      {
        id: "due-mcv4",
        title: "Immunization record (MCV4)",
        dueDate: "Jun 10, 2026",
        sourceQuote: "Casey is missing the Meningococcal (MCV4) vaccine."
      },
      {
        id: "due-camp-form",
        title: "Summer Camp Medical Form",
        dueDate: "Jun 10, 2026",
        sourceQuote: "Also attached is the Summer Camp Medical Form."
      }
    ]);
    expect(result.missingInfo).toContainEqual(
      expect.objectContaining({ label: "Date of MCV4 vaccination" })
    );
    expect(result.waitingOn[0].name).toBe("Westview Pediatrics");
    expect(result.nextActions).toHaveLength(3);
    expect(result.sourceEvidence).toEqual([
      {
        id: "source-email",
        type: "email",
        label: "Email: nurse@WestviewPeds.com",
        quote: "From: nurse@WestviewPeds.com"
      },
      {
        id: "source-attachment",
        type: "attachment",
        label: "Attachment: Camp_Medical_Form.pdf",
        quote: "Summer Camp Medical Form"
      }
    ]);
  });

  test("recognizes a camp medical form when forwarded email line breaks split the phrase", () => {
    const result = analyzeIntake(intake.replace("Summer Camp Medical Form", "Summer Camp\nMedical Form"));

    expect(result.dueItems).toContainEqual({
      id: "due-camp-form",
      title: "Summer Camp Medical Form",
      dueDate: "Jun 10, 2026",
      sourceQuote: "Also attached is the Summer Camp Medical Form."
    });
    expect(result.sourceEvidence).toContainEqual({
      id: "source-attachment",
      type: "attachment",
      label: "Attachment: Camp_Medical_Form.pdf",
      quote: "Summer Camp Medical Form"
    });
  });
});

describe("buildApprovalQueue", () => {
  test("creates approval-gated reminders and draft messages from the extracted map", () => {
    const map = analyzeIntake(intake);
    const approvals = buildApprovalQueue(map);

    expect(approvals).toHaveLength(3);
    expect(approvals[0]).toMatchObject({
      kind: "reminder",
      title: "MCV4 vaccine due",
      status: "Scheduled",
      enabled: true
    });
    expect(approvals[2]).toMatchObject({
      kind: "draft",
      title: "MCV4 vaccine for Casey",
      status: "Needs review",
      recipient: "Westview Pediatrics"
    });
  });
});

describe("normalizeAnalysis", () => {
  test("accepts valid AI output and trims next actions to 3", () => {
    const result = normalizeAnalysis({
      dueItems: [
        {
          id: "due-permission",
          title: "Field trip permission slip",
          dueDate: "Jun 18, 2026",
          sourceQuote: "Please return by 6/18."
        }
      ],
      missingInfo: [],
      waitingOn: [{ id: "wait-school", name: "Westview School", reason: "Needs signed slip" }],
      nextActions: [
        { id: "action-1", label: "Print permission slip", owner: "Alex" },
        { id: "action-2", label: "Sign the form", owner: "Alex" },
        { id: "action-3", label: "Send it back", owner: "Alex" },
        { id: "action-4", label: "Archive email", owner: "LifeMap" }
      ],
      reminders: [
        {
          id: "reminder-slip",
          title: "Permission slip due",
          body: "Remind Alex before Jun 18.",
          status: "Scheduled"
        }
      ],
      draftMessages: [],
      sourceEvidence: [
        {
          id: "source-email",
          type: "email",
          label: "Email: teacher@school.org",
          quote: "Please return by 6/18."
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.analysis.nextActions).toHaveLength(3);
  });

  test("rejects incomplete AI output with a safe error", () => {
    const result = normalizeAnalysis({
      dueItems: [{ id: "missing-title" }],
      missingInfo: [],
      waitingOn: [],
      nextActions: [],
      reminders: [],
      draftMessages: [],
      sourceEvidence: []
    });

    expect(result).toEqual({
      ok: false,
      error: "LifeMap could not understand the extracted map."
    });
  });
});
