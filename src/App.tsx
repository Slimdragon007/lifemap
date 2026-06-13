import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Home,
  LockKeyhole,
  Mail,
  Map,
  MessageSquare,
  Sparkles,
  Send,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { analyzeWithAi } from "./api";
import { analyzeIntake, buildApprovalQueue, type ApprovalItem } from "./lifemap";
import { loadStoredDemoState, saveStoredDemoState } from "./storage";

const starterIntake = `From: nurse@WestviewPeds.com
To: Alex Kim
Subject: Immunization record + camp form

Hi Alex,
Casey is missing the Meningococcal (MCV4) vaccine.
Please get this done and send us
the updated record by 6/10.
Also attached is the Summer Camp
Medical Form.
Thanks!`;

const householdAreas = [
  { label: "School", count: 4 },
  { label: "Medical", count: 3 },
  { label: "Bills", count: 2 },
  { label: "Travel", count: 1 }
];

const sampleIntakes = [
  {
    label: "School form",
    rawIntake: `Screenshot notes from school portal:

Westview Elementary
Casey Kim - Grade 4

Field trip permission slip is due Friday 6/18.
Missing:
- parent signature
- emergency contact phone
- $12 activity fee

Teacher note: Please return the form in the blue folder or email it to Ms. Rivera.`
  },
  {
    label: "Medical bill",
    rawIntake: `From: billing@BrightSmilesDental.com
To: Alex Kim
Subject: Casey Kim balance due

Hi Alex,
Casey's dental sealant visit has a remaining patient balance of $86.40.
Please pay by 7/2 to avoid a late fee.

We are still waiting on the updated insurance group number before we can rebill.
You can reply to this email with the insurance card photo.
Thanks,
Bright Smiles Billing`
  },
  {
    label: "Travel doc",
    rawIntake: `Text from passport renewal checklist:

Jordan Kim passport renewal for August trip.
Appointment is 7/12 at 10:30 AM at the downtown acceptance office.

Bring:
- original birth certificate
- current passport
- 2x2 passport photo
- both parents' IDs

Missing from the packet: printed DS-11 form and photo.
Waiting on Taylor to confirm they can attend the appointment.`
  }
];

type StagedRun = {
  approvals: ApprovalItem[];
  stagedAt: string;
};

function App() {
  const [initialState] = useState(loadStoredDemoState);
  const [isLoggedIn, setIsLoggedIn] = useState(initialState.isLoggedIn ?? false);
  const [intake, setIntake] = useState(initialState.intake ?? starterIntake);
  const [map, setMap] = useState(initialState.analysis ?? analyzeIntake(starterIntake));
  const approvals = useMemo(() => buildApprovalQueue(map), [map]);
  const [disabledApprovals, setDisabledApprovals] = useState<Set<string>>(
    () => new Set(initialState.disabledApprovalIds ?? [])
  );
  const [approvalBodyEdits, setApprovalBodyEdits] = useState<Record<string, string>>(
    initialState.approvalBodyEdits ?? {}
  );
  const editedApprovals = useMemo(
    () =>
      approvals.map((approval) => ({
        ...approval,
        body: approvalBodyEdits[approval.id] ?? approval.body
      })),
    [approvalBodyEdits, approvals]
  );
  const selectedApprovals = useMemo(
    () => editedApprovals.filter((approval) => !disabledApprovals.has(approval.id)),
    [disabledApprovals, editedApprovals]
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [stagedRun, setStagedRun] = useState<StagedRun>();
  const [analyzeStatus, setAnalyzeStatus] = useState<"idle" | "loading" | "success" | "error" | "fallback">(
    "idle"
  );
  const [analyzeError, setAnalyzeError] = useState<string>();

  useEffect(() => {
    saveStoredDemoState({
      isLoggedIn,
      intake,
      analysis: map,
      disabledApprovalIds: Array.from(disabledApprovals),
      approvalBodyEdits
    });
  }, [approvalBodyEdits, disabledApprovals, intake, isLoggedIn, map]);

  function toggleApproval(id: string) {
    setDisabledApprovals((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function saveApprovalBody(id: string, body: string) {
    setApprovalBodyEdits((current) => {
      const originalBody = approvals.find((approval) => approval.id === id)?.body ?? body;
      const next = { ...current };
      if (body === originalBody) {
        delete next[id];
      } else {
        next[id] = body;
      }
      return next;
    });
  }

  async function handleAnalyze() {
    setAnalyzeStatus("loading");
    setAnalyzeError(undefined);
    setIsReviewOpen(false);
    setStagedRun(undefined);

    const result = await analyzeWithAi(intake);
    if (result.ok) {
      setMap(result.analysis);
      setDisabledApprovals(new Set());
      setApprovalBodyEdits({});
      setStagedRun(undefined);
      setAnalyzeStatus("success");
      return;
    }

    setAnalyzeError(result.error);
    setAnalyzeStatus("error");
  }

  function stageSelectedApprovals() {
    setStagedRun({
      approvals: selectedApprovals,
      stagedAt: new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date())
    });
    setIsReviewOpen(false);
  }

  function loadSampleIntake(rawIntake: string) {
    setIntake(rawIntake);
    setAnalyzeStatus("idle");
    setAnalyzeError(undefined);
    setIsReviewOpen(false);
    setStagedRun(undefined);
  }

  if (!isLoggedIn) {
    return (
      <main className="login-shell">
        <div className="ambient-field" aria-hidden="true" />
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-brand-row">
            <span className="brand-mark login-mark">
              <Map size={22} />
            </span>
            <span>Private family admin AI</span>
          </div>
          <h1 id="login-title">LifeMap</h1>
          <p>Turn messy family admin into due dates, missing info, next actions, reminders, and drafts.</p>
          <button className="primary-button login-button" type="button" onClick={() => setIsLoggedIn(true)}>
            Login as Alex Kim
            <ChevronRight size={16} />
          </button>
          <span>Demo login only. Real authentication comes after the MVP works.</span>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className={`app-shell analyze-${analyzeStatus}`}>
      <div className="ambient-field" aria-hidden="true" />
      <aside className="sidebar" aria-label="LifeMap navigation">
        <a className="brand" href="/" aria-label="LifeMap home">
          <span className="brand-mark">
            <Map size={20} />
          </span>
          <span>LifeMap</span>
        </a>

        <nav className="nav-list" aria-label="Household sections">
          <a className="nav-item active" href="/">
            <Home size={18} />
            <span>Family Map</span>
          </a>
          <a className="nav-item" href="/">
            <Mail size={18} />
            <span>Inbox</span>
          </a>
          <a className="nav-item" href="/">
            <Bell size={18} />
            <span>Reminders</span>
          </a>
          <a className="nav-item" href="/">
            <ShieldCheck size={18} />
            <span>Privacy</span>
          </a>
        </nav>

        <div className="area-list" aria-label="Household areas">
          {householdAreas.map((area) => (
            <button className="area-row" key={area.label} type="button">
              <span>{area.label}</span>
              <span>{area.count}</span>
            </button>
          ))}
        </div>

        <section className="security-panel" aria-label="Security status">
          <LockKeyhole size={18} />
          <div>
            <strong>Private by default</strong>
            <span>Drafts wait for approval.</span>
          </div>
        </section>
      </aside>

      <section className="workspace" aria-labelledby="page-title">
        <header className="topbar">
          <div>
            <span className="workspace-kicker">
              <Sparkles size={14} />
              AI intake workspace
            </span>
            <h1 id="page-title">Family admin map</h1>
            <p>School, medical, and household tasks organized.</p>
            <span className="storage-note">Demo data is stored in this browser only.</span>
          </div>
          <div className="status-strip" aria-label="Map health">
            <StatusPill label={`${map.dueItems.length} due`} tone="urgent" />
            <StatusPill label={`${map.missingInfo.length} missing`} tone="warning" />
            <StatusPill label={`${map.nextActions.length} actions`} tone="calm" />
          </div>
        </header>

        <div className="work-grid">
          <section className="panel intake-panel" aria-labelledby="intake-title">
            <div className="panel-heading">
              <div>
                <h2 id="intake-title">Forwarded intake</h2>
                <span>Source: email</span>
              </div>
              <FileText size={18} />
            </div>
            <div className="intake-meta" aria-label="Intake analysis stages">
              <span className="meta-step active">Capture</span>
              <span className={analyzeStatus === "loading" ? "meta-step active" : "meta-step"}>Extract</span>
              <span className={analyzeStatus === "success" ? "meta-step active" : "meta-step"}>Approve</span>
            </div>
            <div className="sample-strip" aria-label="Sample intakes">
              <span>Try a sample</span>
              <div>
                {sampleIntakes.map((sample) => (
                  <button
                    className="sample-button"
                    key={sample.label}
                    type="button"
                    onClick={() => loadSampleIntake(sample.rawIntake)}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              aria-label="Messy forwarded family admin intake"
              value={intake}
              wrap="soft"
              onChange={(event) => setIntake(event.target.value)}
            />
            <div className="intake-actions">
              <button className="secondary-button" type="button">
                Save source
              </button>
              <button
                className="primary-button"
                type="button"
                disabled={analyzeStatus === "loading"}
                onClick={handleAnalyze}
              >
                {analyzeStatus === "loading" ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze intake
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
            <AnalyzeNotice status={analyzeStatus} error={analyzeError} />
          </section>

          <section className="panel map-panel" aria-labelledby="map-title">
            <div className="panel-heading">
              <div>
                <h2 id="map-title">Extracted map</h2>
                <span>{map.sourceEvidence.length} source links</span>
              </div>
              <ShieldCheck size={18} />
            </div>

            <div className="evidence-row" aria-label="Source evidence">
              {map.sourceEvidence.map((source) => (
                <span className="evidence-chip" key={source.id} title={source.quote}>
                  <CheckCircle2 size={13} />
                  {source.label}
                </span>
              ))}
            </div>

            <div className="map-section">
              <h3>What is due</h3>
              <div className="due-list">
                {map.dueItems.map((item) => (
                  <article className="due-row" key={item.title}>
                    <Clock3 size={18} />
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.dueDate}</span>
                      <small>{item.sourceQuote}</small>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="split-map">
              <div className="map-section">
                <h3>What is missing</h3>
                <ul className="plain-list">
                {map.missingInfo.map((item) => (
                    <li key={item.id} title={item.sourceQuote}>
                      <strong>{item.label}</strong>
                      <span>{item.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="map-section">
                <h3>Waiting on</h3>
                {map.waitingOn.map((party) => (
                  <div className="waiting-card" key={party.id}>
                    <UserRoundCheck size={18} />
                    <div>
                      <strong>{party.name}</strong>
                      <span>{party.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="map-section">
              <h3>Next 3 actions</h3>
              <ol className="action-list">
                {map.nextActions.map((action) => (
                  <li key={action.id}>
                    <Check size={16} />
                    <span>{action.label}</span>
                    <small>{action.owner}</small>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </section>

      <aside className="approval-rail" aria-label="Approval queue">
        <div className="rail-heading">
          <h2>Approval queue</h2>
          <span>{selectedApprovals.length} selected</span>
        </div>
        {stagedRun ? <StagedSummary run={stagedRun} /> : null}
        <div className="approval-list">
          {editedApprovals.map((item) => (
            <ApprovalCard
              item={item}
              key={item.id}
              approved={!disabledApprovals.has(item.id)}
              onSave={(body) => saveApprovalBody(item.id, body)}
              onToggle={() => toggleApproval(item.id)}
            />
          ))}
        </div>
        <button
          className="send-button"
          type="button"
          disabled={selectedApprovals.length === 0}
          onClick={() => setIsReviewOpen(true)}
        >
          <Send size={16} />
          Review selected
        </button>
      </aside>
      </main>
      {isReviewOpen ? (
        <ReviewDialog
          approvals={selectedApprovals}
          onClose={() => setIsReviewOpen(false)}
          onStage={stageSelectedApprovals}
        />
      ) : null}
    </>
  );
}

function AnalyzeNotice({
  status,
  error
}: {
  status: "idle" | "loading" | "success" | "error" | "fallback";
  error?: string;
}) {
  if (status === "loading") {
    return (
      <p className="analyze-notice" aria-live="polite">
        Analyzing with LifeMap AI...
      </p>
    );
  }

  if (status === "success") {
    return (
      <p className="analyze-notice success" aria-live="polite">
        AI map updated. Review before sending anything.
      </p>
    );
  }

  if (status === "fallback") {
    return (
      <p className="analyze-notice error" aria-live="polite">
        <span>{error}</span>
        <span>Showing the local demo parser so the workflow still works.</span>
      </p>
    );
  }

  if (status === "error") {
    return (
      <p className="analyze-notice error" aria-live="polite">
        {error}
      </p>
    );
  }

  return null;
}

function StatusPill({ label, tone }: { label: string; tone: "urgent" | "warning" | "calm" }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function ApprovalCard({
  item,
  approved,
  onSave,
  onToggle
}: {
  item: ApprovalItem;
  approved: boolean;
  onSave: (body: string) => void;
  onToggle: () => void;
}) {
  const Icon = item.kind === "draft" ? MessageSquare : Bell;
  const [draftBody, setDraftBody] = useState(item.body);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setDraftBody(item.body);
    setIsEditing(false);
  }, [item.body, item.id]);

  function saveDraftBody() {
    const nextBody = draftBody.trim() || item.body;
    onSave(nextBody);
    setDraftBody(nextBody);
    setIsEditing(false);
  }

  return (
    <article className={approved ? "approval-card approved" : "approval-card"}>
      <div className="approval-card-top">
        <span className="approval-icon">
          <Icon size={17} />
        </span>
        <button
          aria-checked={approved}
          aria-label={`Approve ${item.title}`}
          className="switch"
          role="switch"
          type="button"
          onClick={onToggle}
        >
          <span />
        </button>
      </div>
      <h3>{item.title}</h3>
      {item.recipient ? <p className="recipient">To {item.recipient}</p> : null}
      {isEditing ? (
        <div className="approval-edit">
          <label className="draft-edit-label" htmlFor={`draft-body-${item.id}`}>
            Body
          </label>
          <textarea
            aria-label={`Draft body for ${item.title}`}
            className="draft-edit-textarea"
            id={`draft-body-${item.id}`}
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
          />
          <div className="edit-actions">
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => {
                setDraftBody(item.body);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              aria-label={`Save ${item.title}`}
              className="primary-button compact-button"
              type="button"
              onClick={saveDraftBody}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>{item.body}</p>
          <button
            aria-label={`Edit ${item.title}`}
            className="edit-button"
            type="button"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        </>
      )}
      <span className={item.status === "Scheduled" ? "queue-status scheduled" : "queue-status"}>
        {item.status}
      </span>
    </article>
  );
}

function StagedSummary({ run }: { run: StagedRun }) {
  const draftCount = run.approvals.filter((approval) => approval.kind === "draft").length;
  const reminderCount = run.approvals.length - draftCount;

  return (
    <section className="staged-summary" aria-label="Demo staged approvals">
      <div className="staged-summary-top">
        <span className="staged-icon">
          <CheckCircle2 size={18} />
        </span>
        <div>
          <h3>Staged for demo</h3>
          <p>
            {formatCount(run.approvals.length, "item")} staged at {run.stagedAt}.
          </p>
        </div>
      </div>
      <div className="staged-meta" aria-label="Staged item types">
        <span>{formatCount(draftCount, "draft")}</span>
        <span>{formatCount(reminderCount, "reminder")}</span>
      </div>
      <ul className="staged-list">
        {run.approvals.map((approval) => (
          <li key={approval.id}>
            <span>{approval.kind === "draft" ? "Draft" : "Reminder"}</span>
            <strong>{approval.title}</strong>
          </li>
        ))}
      </ul>
      <p className="staged-note">Nothing was sent or scheduled. This is ready for real integrations later.</p>
    </section>
  );
}

function formatCount(count: number, singularLabel: string) {
  return `${count} ${count === 1 ? singularLabel : `${singularLabel}s`}`;
}

function ReviewDialog({
  approvals,
  onClose,
  onStage
}: {
  approvals: ApprovalItem[];
  onClose: () => void;
  onStage: () => void;
}) {
  const itemLabel = approvals.length === 1 ? "item" : "items";

  return (
    <div className="modal-backdrop">
      <section
        aria-labelledby="review-dialog-title"
        aria-modal="true"
        className="review-dialog"
        role="dialog"
      >
        <div className="review-dialog-top">
          <div>
            <h2 id="review-dialog-title">Review selected approvals</h2>
            <p>
              {approvals.length} {itemLabel} selected. Nothing is sent or scheduled until real integrations exist.
            </p>
          </div>
          <button className="secondary-button compact-button" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="review-list">
          {approvals.map((approval) => (
            <article className="review-item" key={approval.id}>
              <span className={approval.kind === "draft" ? "queue-status" : "queue-status scheduled"}>
                {approval.kind === "draft" ? "Draft message" : "Reminder"}
              </span>
              <h3>{approval.title}</h3>
              {approval.recipient ? <p className="recipient">To {approval.recipient}</p> : null}
              <p>{approval.body}</p>
            </article>
          ))}
        </div>

        <div className="review-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Back to queue
          </button>
          <button className="primary-button" type="button" onClick={onStage}>
            Approve & stage
            <CheckCircle2 size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

export default App;
