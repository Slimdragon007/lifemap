import { ArrowLeft, Sparkles } from "lucide-react";

// The loop LifeMap runs, in plain words. Capture the mess, AI sorts it, you get
// your next moves. Kept to one calm screen, reached from More.
const steps = [
  {
    title: "1. Capture",
    body: "Paste a form, email, screenshot, or note.",
  },
  {
    title: "2. Sort",
    body: "LifeMap finds tasks, dates, people, and records.",
  },
  {
    title: "3. Act",
    body: "Today shows what needs you.",
  },
];

const tools = [
  {
    title: "Today",
    body: "What needs you now.",
  },
  {
    title: "Capture",
    body: "Drop forms, notes, and screenshots.",
  },
  { title: "Calendar", body: "Dates and reminders." },
  {
    title: "Cabinet",
    body: "Records, IDs, forms, and private details.",
  },
  { title: "Review", body: "Only items waiting for your OK." },
];

function HowItWorksView({ onBack }: { onBack: () => void }) {
  return (
    <section
      className="workspace privacy-workspace"
      aria-labelledby="howitworks-title"
    >
      <header className="topbar">
        <div>
          <span className="workspace-kicker">
            <Sparkles size={14} />
            The basics
          </span>
          <h1 id="howitworks-title">How LifeMap works</h1>
          <p>Capture once. LifeMap sorts the rest.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onBack}>
          <ArrowLeft size={15} />
          More
        </button>
      </header>

      <h2 className="notebook-section-title">The loop</h2>
      <div className="privacy-section-grid">
        {steps.map((step) => (
          <section className="privacy-card" key={step.title}>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </section>
        ))}
      </div>

      <h2 className="notebook-section-title">What each tab is for</h2>
      <div className="privacy-section-grid">
        {tools.map((tool) => (
          <section className="privacy-card" key={tool.title}>
            <h2>{tool.title}</h2>
            <p>{tool.body}</p>
          </section>
        ))}
      </div>
    </section>
  );
}

export default HowItWorksView;
