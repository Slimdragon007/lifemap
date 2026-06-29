import { ArrowLeft, Sparkles } from "lucide-react";

// The loop LifeMap runs, in plain words. Capture the mess, AI sorts it, you get
// your next moves. Kept to one calm screen, reached from More.
const steps = [
  {
    title: "1. Capture the mess",
    body: "Paste an email, a school form, a screenshot, or a brain dump. Messy is fine.",
  },
  {
    title: "2. AI sorts it",
    body: "LifeMap pulls out the tasks, dates, and people, then files them where they belong.",
  },
  {
    title: "3. Your next moves",
    body: "Today shows the few things that actually need you. The rest waits, quietly.",
  },
];

const tools = [
  {
    title: "Today",
    body: "Your calm summary. The few things that need you right now.",
  },
  {
    title: "Capture",
    body: "Where you paste anything messy and let LifeMap sort it.",
  },
  { title: "Calendar", body: "Everything time-bound, in one list." },
  {
    title: "Cabinet",
    body: "Stored records only: IDs, cards, forms, policies, and private details.",
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
          <p>
            LifeMap takes the chaos in your head and hands back your next few
            moves, calmly.
          </p>
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
