import { ArrowLeft, ShieldCheck } from "lucide-react";

const sections = [
  {
    title: "Stored on your device",
    body: "In demo mode, everything you capture stays in this browser only. Use Reset demo on the More tab to clear it.",
  },
  {
    title: "Your account",
    body: "When you sign in, your data lives in your own Supabase account and is isolated by row-level security — no other user can read it.",
  },
  {
    title: "AI processing",
    body: "Intake text is analyzed by OpenAI through LifeMap's server-side Worker. The AI key is server-only and never reaches the browser.",
  },
  {
    title: "Email sending",
    body: "Drafts wait for your approval — nothing sends without an explicit Send. When you send, the email goes from LifeMap's domain with Reply-To set to you, and a record is kept in your account.",
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
          <p>How LifeMap handles your data, your account, AI, and email.</p>
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
