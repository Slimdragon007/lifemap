import {
  ArrowRight,
  Check,
  ChevronLeft,
  Map as MapIcon,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

// First-run onboarding: a calm 5-step, skippable wizard that ends with the
// user's map "assembling". No gamification — progress is framed, never deficit.

type OnboardingViewProps = {
  onComplete: (result: { name: string; areas: string[] }) => void;
  onSkip: () => void;
};

const PEOPLE = ["You", "Partner", "A child", "Another child", "A pet"];

// Money is framed as "Bills & dates" (due-dates only) — never a bank connection.
const AREAS = [
  "School",
  "Health",
  "Travel",
  "Pets",
  "Bills & dates",
  "Home",
  "Work",
];

const TOTAL_STEPS = 5;

function OnboardingView({ onComplete, onSkip }: OnboardingViewProps) {
  // Identity cover shown first: state what LifeMap is in one calm screen before
  // the setup wizard. "Continue" drops into step 1; "Skip" exits the whole flow.
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [people, setPeople] = useState<Set<string>>(new Set(["You"]));
  const [areas, setAreas] = useState<Set<string>>(new Set());

  const toggle = (
    set: Set<string>,
    value: string,
    update: (next: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    update(next);
  };

  const back = () => setStep((s) => Math.max(1, s - 1));
  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const finish = () =>
    onComplete({ name: name.trim(), areas: Array.from(areas) });

  const chosenAreas = areas.size > 0 ? Array.from(areas) : ["School", "Health"];

  if (showIntro) {
    return (
      <main className="onboarding-shell">
        <div className="ambient-field" aria-hidden="true" />
        <section
          className="onboarding-card"
          aria-labelledby="onboarding-intro-title"
        >
          <header className="onboarding-head">
            <span className="onboarding-mark">
              <span className="onboarding-mark-tile" aria-hidden="true">
                <MapIcon size={16} />
              </span>
              LifeMap
            </span>
          </header>
          <div className="onboarding-body">
            <h1 id="onboarding-intro-title">
              LifeMap takes the chaos in your head and hands back your next few
              moves, calmly.
            </h1>
            <p className="onboarding-lede">
              Capture anything messy, let it get sorted, and see just the few
              things that need you. Let&apos;s set up your map.
            </p>
          </div>
          <footer className="onboarding-foot">
            <span />
            <div className="onboarding-foot-right">
              <button
                className="onboarding-text"
                type="button"
                onClick={onSkip}
              >
                Skip
              </button>
              <button
                className="onboarding-primary"
                type="button"
                onClick={() => setShowIntro(false)}
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </footer>
        </section>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <div className="ambient-field" aria-hidden="true" />
      <section className="onboarding-card" aria-labelledby="onboarding-title">
        <header className="onboarding-head">
          <span className="onboarding-mark">
            <span className="onboarding-mark-tile" aria-hidden="true">
              <MapIcon size={16} />
            </span>
            LifeMap
          </span>
          <span className="onboarding-step">
            Step {step} of {TOTAL_STEPS}
          </span>
        </header>

        <div
          className="onboarding-progress"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
        >
          <span style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        <div className="onboarding-body">
          {step === 1 ? (
            <>
              <h1 id="onboarding-title">Let&apos;s set things down.</h1>
              <p className="onboarding-lede">
                A calm home for the family-admin chaos. First, what should I
                call you?
              </p>
              <label className="onboarding-field">
                <span>Your name</span>
                <input
                  autoComplete="given-name"
                  placeholder="Alex"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 id="onboarding-title">Your people</h1>
              <p className="onboarding-lede">
                Who&apos;s in your map? Tap everyone you carry mental load for.
              </p>
              <div className="onboarding-chips">
                {PEOPLE.map((person) => (
                  <button
                    aria-pressed={people.has(person)}
                    className={`onboarding-chip${people.has(person) ? " on" : ""}`}
                    key={person}
                    type="button"
                    onClick={() => toggle(people, person, setPeople)}
                  >
                    {person}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 id="onboarding-title">Your map</h1>
              <p className="onboarding-lede">
                Pick the areas that fill your head. These become the stations on
                your map — add more anytime.
              </p>
              <div className="onboarding-chips">
                {AREAS.map((area) => (
                  <button
                    aria-pressed={areas.has(area)}
                    className={`onboarding-chip${areas.has(area) ? " on" : ""}`}
                    key={area}
                    type="button"
                    onClick={() => toggle(areas, area, setAreas)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <>
              <h1 id="onboarding-title">Your calendar, soon</h1>
              <p className="onboarding-lede">
                Calendar connect is coming soon. LifeMap will surface school,
                health, and travel dates in one calm agenda. For now, capture
                anything and it lands on your in-app calendar.
              </p>
              <div className="onboarding-actions-stack">
                <button
                  className="onboarding-primary"
                  type="button"
                  onClick={next}
                >
                  Continue
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          ) : null}

          {step === 5 ? (
            <div className="onboarding-finale">
              <div className="onboarding-assembly" aria-hidden="true">
                <span className="onboarding-hub">
                  <MapIcon size={18} />
                </span>
                {chosenAreas.slice(0, 6).map((area, index) => (
                  <span
                    className="onboarding-pop"
                    key={area}
                    style={{ animationDelay: `${index * 0.12}s` }}
                  >
                    {area}
                  </span>
                ))}
              </div>
              <h1 id="onboarding-title">
                Your map is alive{name.trim() ? `, ${name.trim()}` : ""}.
              </h1>
              <p className="onboarding-lede">
                Welcome aboard. From here, just capture what&apos;s messy and
                I&apos;ll keep your next moves clear.
              </p>
            </div>
          ) : null}
        </div>

        <footer className="onboarding-foot">
          {step > 1 ? (
            <button className="onboarding-text" type="button" onClick={back}>
              <ChevronLeft size={15} />
              Back
            </button>
          ) : (
            <span />
          )}
          <div className="onboarding-foot-right">
            {step < TOTAL_STEPS ? (
              <button
                className="onboarding-text"
                type="button"
                onClick={onSkip}
              >
                Skip
              </button>
            ) : null}
            {step === TOTAL_STEPS ? (
              <button
                className="onboarding-primary"
                type="button"
                onClick={finish}
              >
                <Sparkles size={15} />
                Enter LifeMap
              </button>
            ) : step === 4 ? null : (
              <button
                className="onboarding-primary"
                type="button"
                disabled={step === 1 && name.trim().length === 0}
                onClick={next}
              >
                Continue
                {step === 3 ? <Check size={15} /> : <ArrowRight size={15} />}
              </button>
            )}
          </div>
        </footer>
      </section>
    </main>
  );
}

export default OnboardingView;
