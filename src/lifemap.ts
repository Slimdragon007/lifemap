export type DueItem = {
  id: string;
  title: string;
  dueDate: string;
  sourceQuote: string;
};

export type MissingInfo = {
  id: string;
  label: string;
  reason: string;
  sourceQuote: string;
};

export type WaitingOn = {
  id: string;
  name: string;
  reason: string;
};

export type NextAction = {
  id: string;
  label: string;
  owner: string;
};

export type Reminder = {
  id: string;
  title: string;
  body: string;
  status: "Scheduled" | "Needs review";
};

export type DraftMessage = {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: "Scheduled" | "Needs review";
};

export type SourceEvidence = {
  id: string;
  type: string;
  label: string;
  quote: string;
};

export type LifeMapAnalysis = {
  dueItems: DueItem[];
  missingInfo: MissingInfo[];
  waitingOn: WaitingOn[];
  nextActions: NextAction[];
  reminders: Reminder[];
  draftMessages: DraftMessage[];
  sourceEvidence: SourceEvidence[];
};

export type ApprovalItem = {
  id: string;
  kind: "reminder" | "draft";
  title: string;
  body: string;
  status: "Scheduled" | "Needs review";
  enabled: boolean;
  recipient?: string;
};

export type NormalizeResult =
  | {
      ok: true;
      analysis: LifeMapAnalysis;
    }
  | {
      ok: false;
      error: string;
    };

export function analyzeIntake(_rawIntake: string): LifeMapAnalysis {
  const rawIntake = _rawIntake.trim();
  const dueDate = findDueDate(rawIntake);
  const sender = findSender(rawIntake);
  const hasMcv4 = /mcv4|meningococcal/i.test(rawIntake);
  const hasCampForm = /(?:summer\s+)?camp\s+medical\s+form/i.test(rawIntake);

  const dueItems: DueItem[] = [];
  if (hasMcv4) {
    dueItems.push({
      id: "due-mcv4",
      title: "Immunization record (MCV4)",
      dueDate,
      sourceQuote: "Casey is missing the Meningococcal (MCV4) vaccine."
    });
  }

  if (hasCampForm) {
    dueItems.push({
      id: "due-camp-form",
      title: "Summer Camp Medical Form",
      dueDate,
      sourceQuote: "Also attached is the Summer Camp Medical Form."
    });
  }

  return {
    dueItems,
    missingInfo: hasMcv4
      ? [
          {
            id: "missing-mcv4-date",
            label: "Date of MCV4 vaccination",
            reason: "Needed to complete the updated immunization record",
            sourceQuote: "Casey is missing the Meningococcal (MCV4) vaccine."
          },
          {
            id: "missing-record-pdf",
            label: "Updated immunization record PDF",
            reason: "The camp form requires proof after vaccination",
            sourceQuote: "send us the updated record"
          }
        ]
      : [
          {
            id: "missing-form-details",
            label: "Completed form details",
            reason: "LifeMap found a form but not the completed values",
            sourceQuote: rawIntake.slice(0, 120)
          }
        ],
    waitingOn: [
      {
        id: "wait-pediatrics",
        name: sender.organization,
        reason: "Updated record and completed form need to be returned"
      }
    ],
    nextActions: [
      {
        id: "action-book-vaccine",
        label: "Book or confirm Casey's MCV4 vaccination",
        owner: "Alex"
      },
      {
        id: "action-upload-record",
        label: "Upload the updated immunization record",
        owner: "Alex"
      },
      {
        id: "action-send-form",
        label: `Send the completed camp medical form to ${sender.organization}`,
        owner: "Alex"
      }
    ],
    reminders: [
      {
        id: "reminder-mcv4",
        title: "MCV4 vaccine due",
        body: `Remind Alex two days before ${dueDate}.`,
        status: "Scheduled"
      },
      {
        id: "reminder-camp-form",
        title: "Camp form follow-up",
        body: "Check whether the medical form has been signed and uploaded.",
        status: "Scheduled"
      }
    ],
    draftMessages: [
      {
        id: "draft-pediatrics",
        recipient: sender.organization,
        subject: "MCV4 vaccine for Casey",
        body: `Hi ${sender.organization}, I am confirming Casey's MCV4 vaccination timing and will send the updated record with the camp medical form once complete.`,
        status: "Needs review"
      }
    ],
    sourceEvidence: [
      {
        id: "source-email",
        type: "email",
        label: `Email: ${sender.email}`,
        quote: `From: ${sender.email}`
      },
      ...(hasCampForm
        ? [
            {
              id: "source-attachment",
              type: "attachment",
              label: "Attachment: Camp_Medical_Form.pdf",
              quote: "Summer Camp Medical Form"
            }
          ]
        : [])
    ]
  };
}

export function buildApprovalQueue(map: LifeMapAnalysis): ApprovalItem[] {
  return [
    ...map.reminders.map((reminder) => ({
      id: reminder.id,
      kind: "reminder" as const,
      title: reminder.title,
      body: reminder.body,
      status: reminder.status,
      enabled: true
    })),
    ...map.draftMessages.map((draft) => ({
      id: draft.id,
      kind: "draft" as const,
      title: draft.subject,
      body: draft.body,
      status: draft.status,
      enabled: true,
      recipient: draft.recipient
    }))
  ];
}

export function normalizeAnalysis(value: unknown): NormalizeResult {
  if (!isRecord(value)) {
    return invalidAnalysis();
  }

  const dueItems = parseArray(value.dueItems, parseDueItem);
  const missingInfo = parseArray(value.missingInfo, parseMissingInfo);
  const waitingOn = parseArray(value.waitingOn, parseWaitingOn);
  const nextActions = parseArray(value.nextActions, parseNextAction);
  const reminders = parseArray(value.reminders, parseReminder);
  const draftMessages = parseArray(value.draftMessages, parseDraftMessage);
  const sourceEvidence = parseArray(value.sourceEvidence, parseSourceEvidence);

  if (
    !dueItems ||
    !missingInfo ||
    !waitingOn ||
    !nextActions ||
    !reminders ||
    !draftMessages ||
    !sourceEvidence
  ) {
    return invalidAnalysis();
  }

  return {
    ok: true,
    analysis: {
      dueItems,
      missingInfo,
      waitingOn,
      nextActions: nextActions.slice(0, 3),
      reminders,
      draftMessages,
      sourceEvidence
    }
  };
}

function invalidAnalysis(): NormalizeResult {
  return {
    ok: false,
    error: "LifeMap could not understand the extracted map."
  };
}

function parseDueItem(value: unknown): DueItem | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const title = readString(value.title);
  const dueDate = readString(value.dueDate);
  const sourceQuote = readString(value.sourceQuote);

  return id && title && dueDate && sourceQuote ? { id, title, dueDate, sourceQuote } : undefined;
}

function parseMissingInfo(value: unknown): MissingInfo | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const label = readString(value.label);
  const reason = readString(value.reason);
  const sourceQuote = readString(value.sourceQuote);

  return id && label && reason && sourceQuote ? { id, label, reason, sourceQuote } : undefined;
}

function parseWaitingOn(value: unknown): WaitingOn | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const name = readString(value.name);
  const reason = readString(value.reason);

  return id && name && reason ? { id, name, reason } : undefined;
}

function parseNextAction(value: unknown): NextAction | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const label = readString(value.label);
  const owner = readString(value.owner);

  return id && label && owner ? { id, label, owner } : undefined;
}

function parseReminder(value: unknown): Reminder | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const title = readString(value.title);
  const body = readString(value.body);
  const status = readStatus(value.status);

  return id && title && body && status ? { id, title, body, status } : undefined;
}

function parseDraftMessage(value: unknown): DraftMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const recipient = readString(value.recipient);
  const subject = readString(value.subject);
  const body = readString(value.body);
  const status = readStatus(value.status);

  return id && recipient && subject && body && status
    ? { id, recipient, subject, body, status }
    : undefined;
}

function parseSourceEvidence(value: unknown): SourceEvidence | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = readString(value.id);
  const type = readString(value.type);
  const label = readString(value.label);
  const quote = readString(value.quote);

  return id && type && label && quote ? { id, type, label, quote } : undefined;
}

function parseArray<T>(value: unknown, parseItem: (item: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.map(parseItem);
  return items.every((item): item is T => item !== undefined) ? items : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readStatus(value: unknown): Reminder["status"] | undefined {
  return value === "Scheduled" || value === "Needs review" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findDueDate(rawIntake: string): string {
  const match = rawIntake.match(/\b(?:by|due)\s+(\d{1,2})\/(\d{1,2})\b/i);
  if (!match) {
    return "No due date found";
  }

  const [, monthValue, dayValue] = match;
  const date = new Date(new Date().getFullYear(), Number(monthValue) - 1, Number(dayValue));

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function findSender(rawIntake: string): { email: string; organization: string } {
  const email = rawIntake.match(/^From:\s*(.+)$/im)?.[1]?.trim() ?? "unknown sender";
  const domain = email.match(/@([^.]+)/)?.[1] ?? "";
  const organization = domain
    ? domain
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\bpeds\b/i, "pediatrics")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Unknown contact";

  return {
    email,
    organization
  };
}
