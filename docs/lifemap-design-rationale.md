# LifeMap — Design Rationale

> **Why this exists:** LifeMap's job is to _reduce mental load_ for parents and ADHD / executive-function-challenged adults. The core loop is "dump the mess → I sort it → here are your next 3 things." This document grounds LifeMap's visual design in research on how overwhelmed and ADHD brains actually process interfaces, so every design choice can trace back to a principle rather than taste. The interactive directions in [`lifemap-ui-directions-v2.html`](./lifemap-ui-directions-v2.html) each map their choices to the principle IDs (P1–P6) below.

---

## Principles

### P1 — One Clear Next Action

**Claim:** The most effective antidote to feeling stuck is reducing the task to a single, concrete, physically-doable "next action," which provides clarity and prevents procrastination [S14]; decision time rises with the number and complexity of options presented [S7].
**Why it matters for ADHD/parents:** Task initiation is the core executive-function bottleneck — an overwhelmed brain cannot start a vague pile, only a specific small step [S13].
**Design implication:** Make the primary surface answer "what do I do right now?" with at most one or a few explicit, pre-decided actions as the visual focal point, not a full backlog the user must triage themselves.

### P2 — Minimize Choices and Chunk

**Claim:** Decision time grows with choice count and complexity, so options should be few and complex tasks broken into smaller steps [S7]; information should be grouped into manageable chunks because working memory is narrow (classically ~7±2, and only ~3–4 active chunks under load) [S8][S10].
**Why it matters for ADHD/parents:** Constrained working memory means long undifferentiated lists overflow capacity and stall action [S10].
**Design implication:** Cap simultaneous choices, group related items into labeled chunks, and surface a "your next 3 things" set rather than an unbounded queue — and highlight a recommended/default option [S7].

### P3 — Low Visual Noise, Calm Surface

**Claim:** Extraneous cognitive load comes from how content is presented, not the task itself [S2], so removing visual clutter preserves limited processing power [S1]; calm technology should demand the smallest possible amount of attention and use only the minimum technology needed [S3][S4].
**Why it matters for ADHD/parents:** Every extra on-screen element competes for already-scarce attention and pushes an overwhelmed user toward abandonment [S1].
**Design implication:** Favor generous whitespace, restrained color (reserve saturated/accent color for the one action that matters), minimal typographic variation, and quiet, non-demanding motion that informs from the periphery rather than grabbing focus [S3][S4].

### P4 — Forgiving, Low-Stakes Tone

**Claim:** Interfaces should help users avoid mistakes and clearly recover from them, and should limit interruptions to help users focus [S5]; calm technology should still "work even when it fails," degrading gracefully rather than punishing the user [S3].
**Why it matters for ADHD/parents:** Task paralysis is amplified by emotional overwhelm and fear of failure, so a blaming or brittle UI deepens avoidance [S13].
**Design implication:** Use plain, reassuring, non-judgmental copy; make every action reversible/editable; allow safe re-entry after distraction (auto-save, no lost work); and frame errors as easy fixes, never as user failure [S5].

### P5 — Progressive Disclosure: Show the Now, Hide the Later

**Claim:** Multi-step processes should make each step clear — showing where you are and what's next while not surfacing everything at once — and should reveal complexity gradually [S5][S7].
**Why it matters for ADHD/parents:** Seeing the entire mountain of life-admin at once triggers overwhelm; people focus best on what is concretely present in front of them [S11].
**Design implication:** Default to a single-focus, one-thing-at-a-time view that hides the full backlog behind explicit "show more," with a simple step indicator so the user always knows position and next step [S5].

### P6 — Externalize Memory; the App Holds State

**Claim:** Externalizing commitments into a trusted external system is the single most effective executive-function support [S10][S14], and processes must not rely on the user's memory [S6]; designs should re-display previously entered information and set smart defaults rather than make users recall it [S1].
**Why it matters for ADHD/parents:** ADHD is "out of sight, out of mind" with internal time blindness, so anything not externally visible effectively stops existing [S11][S12].
**Design implication:** Persist all captured items and prior context so nothing must be re-remembered; make deadlines and timing tangible/visible rather than internally tracked; and let the system carry state (drafts, history, status) so the user's brain doesn't have to [S1][S6][S12].

---

## How the directions use these

Each of the four directions in the v2 directions doc renders the _same_ "here's your next three things" moment, and is scored on how well its visual language serves P1–P6:

| Direction           | Leans hardest on | The bet                                                      |
| ------------------- | ---------------- | ------------------------------------------------------------ |
| **Haven** (shipped) | P3, P4           | Warm calm-editorial: low-stakes, low-noise, emotionally safe |
| **Focus-first**     | P1, P5           | One thing at a time; the backlog disappears                  |
| **Low-stimulus**    | P3, P2           | Maximal whitespace, minimal color/motion; sensory-load floor |
| **Scaffolded**      | P2, P6           | Explicit chunks/checklists that externalize working memory   |

No direction can ignore a principle — they differ in _emphasis_, and that's the decision: which bet fits LifeMap's user best.

**Decision (2026-06-16): Low-stimulus wins** — the sensory-load floor (P3 + P2). Motion spec below is locked against it.

---

## Motion spec — Low-stimulus (LOCKED 2026-06-16)

> The taste call, evidence-backed: **LifeMap should have _less_ motion than the calm/AI apps it admires.** Motion happens when something _changes_; the screen is still at rest. "The best animation is one that goes unnoticed" [S20] — if an at-capacity parent _notices_ the motion, it has already failed. Reduced-motion is close to the default state we design toward for this audience. Preview: `lifemap-lowstim-motion-v2.html` (the "Right-sized" mode is the contract; "Ambient" mode is the rejected first pass).

**KEEP — motions that earn their place** (animate `transform`/`opacity` only [S21][S22], `ease-out` [S17]):

- **Press feedback:** `transform: scale(0.98)`, ~100ms ease-out [S17][S20].
- **State change** (mark-done / toggle): ~140ms, opacity + transform, ease-out [S17].
- **Content enter** (screen settles in on open): fade + 8px rise, ~200–250ms ease-out, gentle stagger, **once** — not a loop [S20]. Larger surfaces (sheet/modal) cap ~300ms [S17].

**CUT / CAP:**

- **No persistent ambient motion in the app at rest.** The slow-water field + breathing dot are rejected for the daily tool (lovely for a future landing page only).
- **Nothing longer than 300ms; 400ms is the hard wall**, never for frequent interactions [S17].
- No parallax, slide-in lists, staggered cascades, decorative spinners, or scroll-triggered reveals [S16][S18].
- **Avoid ~0.2 Hz oscillation** (one cycle ≈ 5s) — Apple flags it as a vestibular-discomfort risk [S16]. (This is why the 5.2s breathing dot was cut.)

**NON-NEGOTIABLE:**

- **One moving thing on screen at a time** — no competing simultaneous motion [S16].
- **GPU-only:** `transform` + `opacity` exclusively; never animate width/height/top/left/margin [S21][S22].
- **Gate all non-essential motion** behind `@media (prefers-reduced-motion: reduce)` → collapse to instant or a plain opacity fade; kill every ambient loop [S16][S18].
- **Default to stillness:** if unsure whether a motion earns its place, it doesn't [S20].

**CSS tokens to carry into the app:**

```
--motion-press: 100ms;   --motion-state: 140ms;   --motion-enter: 220ms;   --motion-cap: 300ms;
--ease-out: cubic-bezier(.22,.61,.36,1);
/* properties: transform, opacity ONLY · wrap non-essential motion in prefers-reduced-motion */
```

---

## Sources

- **[S1]** Nielsen Norman Group (Kathryn Whitenton) — "Minimize Cognitive Load to Maximize Usability" — https://www.nngroup.com/articles/minimize-cognitive-load/ — Working memory is finite; reduce extraneous load by avoiding clutter, reusing mental models, and offloading reading/remembering/deciding.
- **[S2]** Klepsch et al. (PMC) — "Development and Validation of Two Instruments Measuring Intrinsic, Extraneous, and Germane Cognitive Load" — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5696680/ — Establishes Cognitive Load Theory's three-part split.
- **[S3]** Amber Case — "Principles of Calm Technology" — https://www.caseorganic.com/post/principles-of-calm-technology — Tech should require the smallest possible amount of attention; use the periphery; minimum technology needed.
- **[S4]** Mark Weiser & John Seely Brown — "Calm technology" (1995) — https://en.wikipedia.org/wiki/Calm_technology — Attention should reside mainly in the periphery and move calmly between periphery and center.
- **[S5]** W3C / WAI-COGA — "Making Content Usable for People with Cognitive and Learning Disabilities — Design Guide" — https://www.w3.org/TR/coga-usable/design_guide.html — Make each step clear; help users focus; avoid and correct mistakes.
- **[S6]** W3C / WAI-COGA — "Ensure Processes Do Not Rely on Memory (Objective 6)" — https://www.w3.org/TR/coga-usable/ — Processes must not require recalling passwords, codes, or earlier information.
- **[S7]** Laws of UX — "Hick's Law" — https://lawsofux.com/hicks-law/ — Decision time increases with number/complexity of choices; minimize choices, break into steps, highlight recommended options.
- **[S8]** Laws of UX / George Miller (1956) — "Miller's Law" — https://lawsofux.com/millers-law/ — Working memory ~7±2; chunk information into grouped units.
- **[S9]** Charles Wyke-Smith — "Miller's Law, Hick's Law and the limits of short-term memory" — https://wykesmith.com/millers-law-hicks-law-and-the-limits-of-short-term-memory/ — Caveat: visible on-screen choices needn't be memorized; externalizing into view sidesteps the limit.
- **[S10]** Neurodivergent Insights — "Executive Functioning Support for ADHD and Autistic Brains" — https://neurodivergentinsights.com/executive-function-helpers/ — Externalizing is the single most effective EF support; working memory holds ~3–4 chunks.
- **[S11]** Simply Psychology — "Object Permanence & ADHD: Out Of Sight, Out of Mind" — https://www.simplypsychology.org/object-permanence-and-adhd.html — Without visual cues, ADHD brains stop thinking about tasks.
- **[S12]** ADDitude — "How ADHD Warps Time Perception" — https://www.additudemag.com/wasting-time-adhd-and-time-perception/ — Time blindness: timing must be made tangible with external cues.
- **[S13]** Courage To Be Therapy — "Strategies for Externalizing Executive Functioning for Individuals with ADHD" — https://www.couragetobetherapy.com/blogarticles/strategies-for-externalizing-executive-functioning-for-individuals-with-adhd — Task initiation eased by external starts/cues; reduce friction rather than "try harder."
- **[S14]** David Allen / GTD (FacileThings) — "The Importance of Next Actions" — https://facilethings.com/blog/en/the-importance-of-next-actions — The "next action" is the single most immediate visible step; capturing into a trusted system frees the mind.

### Motion (added 2026-06-16)

- **[S15]** Google — "Duration & Easing — Material Design" — https://m1.material.io/motion/duration-easing.html — Keep transitions short (seen frequently); scale duration to distance; standard easing for rest-to-rest elements.
- **[S16]** Apple — "Motion — Human Interface Guidelines" — https://developer.apple.com/design/human-interface-guidelines/motion — "Don't add motion for the sake of motion"; respect Reduce Motion; flags ~0.2 Hz oscillation as a discomfort risk.
- **[S17]** Nielsen Norman Group — "Executing UX Animations: Duration and Motion Characteristics" — https://www.nngroup.com/articles/animation-duration/ — ~100ms feedback, 200–300ms larger transitions, 100–400ms band, 500ms a "drag"; ease-out; frequent = shorter/subtler.
- **[S18]** Silktide / Deque — "WCAG 2.3.3 Animation from Interactions" — https://silktide.com/accessibility-guide/the-wcag-standard/2-3/seizures-and-physical-reactions/2-3-3-animation-from-interactions/ — Interaction motion must be disableable; honor prefers-reduced-motion; replace jarring slide/scale with safe opacity fade; vestibular risks.
- **[S19]** Nielsen Norman Group — "UX Animations" — https://www.nngroup.com/videos/ux-animations/ — Motion should support usability (feedback, orientation); over-long/unnecessary animation harms usability.
- **[S20]** Emil Kowalski — "Animations on the Web" (principles) — https://emilkowal.ski/ui/great-animations — Best animation goes unnoticed; scale(0.97–0.98) press; fade+rise enter; knowing when NOT to animate is the core skill.
- **[S21]** web.dev — "How to create high-performance CSS animations" — https://web.dev/articles/animations-guide — Restrict to transform + opacity (compositing stage); avoid layout/paint properties; use will-change only after observing jank.
- **[S22]** web.dev — "Animations and performance" — https://web.dev/articles/animations-and-performance — transform/opacity animate on the compositor thread at 60fps; animating width/top/left forces layout and drops frames.

_Compiled 2026-06-16. Sources retrieved via web research; see each URL for the primary material._
