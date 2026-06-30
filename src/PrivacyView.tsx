import { ArrowLeft, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Files are encrypted before upload",
    body: "When you attach a PDF or photo in a signed-in account, LifeMap encrypts the file in your browser before storing it in a private document bucket.",
  },
  {
    title: "Your records are account-scoped",
    body: "LifeMap uses Supabase Auth and Row Level Security so each signed-in user can only read and change their own household records.",
  },
  {
    title: "Nothing sends without your approval",
    body: "Drafts, reminders, calendar suggestions, and other sensitive actions wait for your explicit OK before LifeMap acts.",
  },
  {
    title: "Private details stay tucked away",
    body: "Sensitive details stay hidden in normal views until you choose to reveal or open them.",
  },
  {
    title: "Clear my map removes stored files before records are cleared",
    body: "When you clear a real account, LifeMap attempts to remove stored file objects before clearing the related records. If file deletion fails, clearing stops.",
  },
  {
    title: "Current limitation",
    body: "LifeMap is not zero-knowledge today. Its server can derive the encryption key, so we do not claim end-user-only decryption.",
  },
];

function PrivacyView({ onBack }: { onBack: () => void }) {
  return (
    <section
      className="workspace privacy-workspace"
      aria-labelledby="privacy-title"
    >
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <ShieldCheck size={14} />
            Trust & safety
          </span>
          <h1 id="privacy-title">Privacy &amp; security</h1>
          <p>
            How LifeMap handles your records, files, approvals, and account.
          </p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          More
        </button>
      </header>
      <div className="privacy-section-grid">
        {sections.map((section) => (
          <section className="privacy-card" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export default PrivacyView;
