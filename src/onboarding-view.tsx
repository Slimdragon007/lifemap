import {
  ArrowRight,
  Check,
  ChevronLeft,
  Map as MapIcon,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

// First-run onboarding: a calm 5-step, skippable wizard that ends with the
// user's map "assembling". No gamification — progress is framed, never deficit.

export type OnboardingRole = "adult" | "child" | "pet";

export type OnboardingPerson = {
  name: string;
  role: OnboardingRole;
};

// Internal row carries a stable id (React key + handler target) and the chip it
// came from, so renaming a chip-seeded row keeps the chip linked (no duplicate).
type PersonRow = OnboardingPerson & { id: string; chip?: string };

let personIdSeq = 0;
const nextPersonId = () => `p${(personIdSeq += 1)}`;

type OnboardingViewProps = {
  onComplete: (result: {
    name: string;
    areas: string[];
    people: OnboardingPerson[];
  }) => void;
  onSkip: () => void;
  // Prefill for step 1 — App passes the name captured at signup
  // (user_metadata.first_name) so onboarding doesn't re-ask.
  initialName?: string;
};

const PEOPLE_CHIPS: ReadonlyArray<{ label: string; role: OnboardingRole }> = [
  { label: "You", role: "adult" },
  { label: "Partner", role: "adult" },
  { label: "A child", role: "child" },
  { label: "A pet", role: "pet" },
];

const ROLE_OPTIONS: ReadonlyArray<{ value: OnboardingRole; label: string }> = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "pet", label: "Pet" },
];

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

function OnboardingView({
  onComplete,
  onSkip,
  initialName = "",
}: OnboardingViewProps) {
  // Identity cover shown first: state what LifeMap is in one calm screen before
  // the setup wizard. "Continue" drops into step 1; "Skip" exits the whole flow.
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialName);
  // "Your people" is a structured, scalable list (not a fixed Set) so any number
  // of adults/children/pets persist into family_members later. Seeded with "You".
  const [people, setPeople] = useState<PersonRow[]>([
    { id: nextPersonId(), name: "You", role: "adult", chip: "You" },
  ]);
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

  // Quick chips toggle a single person of that label in/out of the list.
  const toggleChip = (label: string, role: OnboardingRole) => {
    setPeople((current) => {
      if (current.some((person) => person.chip === label)) {
        return current.filter((person) => person.chip !== label);
      }
      return [
        ...current,
        { id: nextPersonId(), name: label, role, chip: label },
      ];
    });
  };

  const addPerson = () =>
    setPeople((current) => [
      ...current,
      { id: nextPersonId(), name: "", role: "child" },
    ]);

  const updatePerson = (id: string, patch: Partial<OnboardingPerson>) =>
    setPeople((current) =>
      current.map((person) =>
        person.id === id ? { ...person, ...patch } : person,
      ),
    );

  const removePerson = (id: string) =>
    setPeople((current) => current.filter((person) => person.id !== id));

  const chipActive = (label: string) =>
    people.some((person) => person.chip === label);

  const back = () => setStep((s) => Math.max(1, s - 1));
  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const finish = () => {
    // Drop empty rows and collapse duplicate names so each person becomes one
    // family_member.
    const seen = new Set<string>();
    const cleaned: OnboardingPerson[] = [];
    for (const person of people) {
      const pname = person.name.trim();
      const key = pname.toLowerCase();
      if (!pname || seen.has(key)) {
        continue;
      }
      seen.add(key);
      cleaned.push({ name: pname, role: person.role });
    }
    onComplete({
      name: name.trim(),
      areas: Array.from(areas),
      people: cleaned,
    });
  };

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
                Tap everyone you carry mental load for — you can add more
                anytime in your Vault.
              </p>
              <div className="onboarding-chips">
                {PEOPLE_CHIPS.map((chip) => (
                  <button
                    aria-pressed={chipActive(chip.label)}
                    className={`onboarding-chip${chipActive(chip.label) ? " on" : ""}`}
                    key={chip.label}
                    type="button"
                    onClick={() => toggleChip(chip.label, chip.role)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              {people.length > 0 ? (
                <ul
                  className="onboarding-people"
                  aria-label="People in your map"
                >
                  {people.map((person, index) => (
                    <li className="onboarding-person" key={person.id}>
                      <input
                        aria-label={`Name for person ${index + 1}`}
                        className="onboarding-person-name"
                        placeholder="Name"
                        type="text"
                        value={person.name}
                        onChange={(event) =>
                          updatePerson(person.id, { name: event.target.value })
                        }
                      />
                      <select
                        aria-label={`Role for person ${index + 1}`}
                        className="onboarding-person-role"
                        value={person.role}
                        onChange={(event) =>
                          updatePerson(person.id, {
                            role: event.target.value as OnboardingRole,
                          })
                        }
                      >
                        {ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        aria-label={`Remove person ${index + 1}`}
                        className="onboarding-person-remove"
                        type="button"
                        onClick={() => removePerson(person.id)}
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                className="onboarding-add-person"
                type="button"
                onClick={addPerson}
              >
                <Plus size={15} />
                Add another
              </button>
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
