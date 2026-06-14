# LifeMap UX Research Brief

**Date:** 2026-06-14  
**Status:** Founder audit translated into product/UX direction  
**Product position:** LifeMap is your AI chief of staff for real life.

## Executive Read

LifeMap has the right product shape, but the current experience asks the user to understand too much before the app proves itself. The visual direction is now much closer to the premium "Atlas Home" reference, but the operating model still feels scattered: Daily Brief can fail, buttons animate without doing enough, the Vault has strong value but unclear hierarchy, and several tabs compete for the same mental space.

The next version should not add more surfaces. It should make the first five minutes obvious:

1. Tell LifeMap who and what you manage.
2. Capture one messy thing.
3. Watch it become a small, trusted map.
4. Save important records to the Vault.
5. Return tomorrow for the Daily Brief.

The product should feel like a calm operator, not a productivity dashboard. For ADHD and overloaded parents, the win is not "more organization." The win is relief: fewer things to remember, fewer dead ends, fewer scary counters, and clearer next moves.

## Founder Audit Signals

These are the strongest signals from the live review:

- **Daily Brief is a trust break when it fails.** "LifeMap could not analyze this yet" on the home screen makes the product feel broken at the exact moment it should feel magical.
- **Dead taps are hurting the UX.** If a user taps "Due soon," "Book," "View full brief," or a priority item, the app should explain, expand, complete, snooze, save, or route somewhere useful.
- **Vault is the money surface.** Insurance cards, IDs, passports, vaccines, meds, school records, pet care, travel docs, and emergency info are the most immediately understandable value.
- **The red/high-alert Vault counters feel wrong.** They make the source-of-truth area feel stressful and redundant. Use calm urgency instead of alarm.
- **Care Loops are promising but emotionally sensitive.** Recurring tasks are useful, but for ADHD users they can feel like an endless treadmill. Present them as rhythms, not debt.
- **Details should be hidden but reachable.** Family profile cards should protect sensitive details by default and reveal them through tap/expand/flip interactions.
- **The app has too many mental destinations.** Today, Calendar, Capture, Vault, Review, More, Family Admin Map, Brain Dump, and Launch Plan are too many concepts for a normal user to parse.
- **The design looks good, but the operating model is not yet self-navigating.** A first-time user should not need a demo from the founder to know what to do.

## Research Signals

### 1. Apps must answer three orientation questions immediately

Apple's WWDC25 "Design foundations from idea to interface" frames a strong app foundation around clarity: users should quickly understand where they are, what they can do, and where they can go next. The session also warns that a visually polished screen can still fail if the structure is unclear.

LifeMap implication: every screen needs a clear title, one primary action, and visible next step. Today cannot be a collage. It must be the answer to "What matters today?"

Source: [Apple WWDC25 - Design foundations from idea to interface](https://developer.apple.com/videos/play/wwdc2025/359/)

### 2. Bottom tabs should be navigation, not a miscellaneous action tray

Apple's design guidance and WWDC25 transcript both reinforce that tab bars are for moving between major sections, while screen-specific actions belong inside the screen. Each extra tab adds another decision.

LifeMap implication: keep the bottom nav to the few permanent destinations. Make Capture a prominent action attached to Today or floating above the nav, not a competing conceptual tab.

Sources:
- [Apple HIG - Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple WWDC25 - Design foundations from idea to interface](https://developer.apple.com/videos/play/wwdc2025/359/)

### 3. Progressive disclosure is mandatory for a life logistics app

NN/g describes progressive disclosure as showing only the most important options first, with specialized or advanced content available on request. The goal is learnability, efficiency, and fewer errors.

LifeMap implication: Vault should show categories and high-signal summaries first, then reveal private details, source evidence, and advanced metadata only after a tap. Family profiles should become expandable cards. Emergency View should be fast and intentionally narrow.

Source: [NN/g - Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

### 4. Recognition beats recall

NN/g's recognition vs recall guidance matters deeply here: it is easier for people to pick from visible, meaningful choices than to remember what they can do from scratch.

LifeMap implication: first-run setup should use recognizable chips and examples: kids, pets, travel, school, health, insurance, passports, elder care, house, vehicles. Do not ask users to invent a taxonomy.

Source: [NN/g - Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/)

### 5. Cognitive load is the enemy, especially in forms and setup

For a family admin tool, every vague input becomes another task. Forms should minimize guessing, use plain labels, and explain why information is requested.

LifeMap implication: setup should ask a few practical questions, then recommend buckets. The user should feel "oh, it gets my life," not "now I have homework."

Source: [NN/g - 4 Principles to Reduce Cognitive Load in Forms](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)

### 6. The market is validating household coordination, but most tools are still calendar/list first

Cozi and FamilyWall center shared calendars, lists, meals, tasks, location, and family communication. Maple positions around a family operating system, with calendar, meal planning, to-dos, family email, and AI organization. Calendara's 2026 comparison highlights fast event entry and AI photo extraction from school flyers or schedules as a major parent pain point.

LifeMap implication: the opportunity is not just another shared calendar. The wedge is "messy real-life input becomes trusted action plus durable records."

Sources:
- [Cozi Family Organizer](https://www.cozi.com/)
- [FamilyWall](https://www.familywall.com/en/index.html)
- [Maple - Best family calendar apps in 2026](https://www.growmaple.com/blog-posts/best-family-calendar-app)
- [Calendara - 7 Best Family Calendar Apps in 2026](https://www.usecalendara.com/blog/7-best-family-calendar-apps-2026)

### 7. Parents want calm, shared visibility, and memory offload

Nanit's 2026 parent report describes technology as most useful when it reduces mental load, creates shared visibility, and acts like a memory bank or co-pilot. It also warns that too much data, too many alerts, and fear-based interfaces can spike anxiety.

LifeMap implication: use calm summaries, important notifications only, shared visibility, and source-backed confidence. Avoid red-heavy dashboards, guilt copy, streak pressure, or endless charts.

Source: [Nanit - 2026 State of Modern Parenthood](https://www.nanit.com/blogs/parent-confidently/nanit-s-2026-report-the-state-of-modern-parenthood)

## Audience

### Primary User

Millennial parents and overloaded household operators who are managing school, health, travel, pets, documents, schedules, insurance, household admin, and family communication across too many places.

They are not primarily looking for a "task app." They are looking for a private place where the app can hold the shape of their life.

### High-Fit Early Users

- Parents with kids in school or activities.
- ADHD adults who need externalized memory and low-friction capture.
- Families with pets, travel, medical logistics, or school paperwork.
- Dual-working-parent households where one person is the default mental-load holder.
- People who already text themselves, use notes apps, take screenshots, or forward emails as a makeshift system.

### Emotional Job

"I need to stop carrying all of this in my head."

### Functional Job

"Take this messy thing and tell me what matters, what is missing, who is waiting, and what I should do next."

## Product Principles

1. **One obvious next move.** Every screen should make the next useful action visible.
2. **No dead taps.** Every tappable element must expand, route, toggle, complete, snooze, save, edit, or explain.
3. **Capture is the heartbeat.** The primary action is dumping messy life context into LifeMap.
4. **Vault is the source of truth.** It should feel private, calm, searchable, and genuinely useful.
5. **Daily Brief earns return.** The home screen should be useful enough that someone opens it tomorrow without being told.
6. **Care loops are rhythms, not failures.** Recurring life tasks should feel managed, not overdue forever.
7. **Hide sensitive detail by default.** Details should be accessible through a deliberate tap.
8. **Suggestions are not facts.** AI-generated items must be source-backed and approval-gated.
9. **Calm urgency beats alarm.** Use clay, blue, plum, and sage states before red. Reserve red for true emergencies.
10. **The app should feel like it understands families.** Buckets should map to real logistics: school, health, pets, travel, docs, house, vehicles, elder care, meals, and money.

## Information Architecture Recommendation

### Keep Five Primary Destinations

1. **Today** - Daily Brief, next 3 actions, open loops, one capture entry.
2. **Vault** - records, IDs, insurance, passports, meds, vaccines, school, pets, travel.
3. **Calendar** - schedule, care loops, school events, appointments, travel dates.
4. **Review** - approval queue, drafts, reminders, staged actions.
5. **More** - settings, Launch Plan, account, security, demo controls.

### Make Capture a Primary Action, Not a Destination

Capture should be a prominent button from Today and possibly a center action above the bottom nav. It can open a sheet/modal with:

- Brain Dump
- Scan or upload later
- Paste email/text
- Use a sample for demo

### Retire or Reframe

- **Family Admin Map:** Reframe as "Map" inside Today or More, not a top-level mental model.
- **Brain Dump:** Keep as the capture mode name, not a whole destination.
- **Launch Plan:** Keep in More as founder-only.
- **Top counters in Vault:** Replace with useful, calm summary cards or remove entirely.

## Screen-Level UX Direction

### Today

Purpose: "What matters today, and what should I do next?"

Must include:

- Daily Brief that never hard-fails visually.
- Next 3 actions with real actions: complete, snooze, save, ask, open.
- Capture entry point.
- Small "Needs review" count when approvals exist.
- Calm fallback if AI is unavailable: "Using your saved map until AI reconnects."

Avoid:

- Multiple unrelated cards competing for attention.
- Status labels that do not do anything.
- Brand-heavy content that does not help the user act.

### Vault

Purpose: "Where my family's important info lives."

Must include:

- Category-first browsing.
- Search later.
- Expandable or flipping profile cards.
- Private detail reveal.
- Emergency view as a focused, limited mode.
- Save from AI suggestions.
- Travel bucket: passports, TSA/PreCheck/Global Entry, rewards numbers, trip docs, packing lists.
- Health bucket: medications, allergies, vaccines, insurance, doctors, pets.
- School bucket: schedules, lunch, teachers, forms, activity deadlines.

Avoid:

- Red counters unless genuinely critical.
- Showing sensitive details by default.
- Overloading the first viewport with every record.

### Calendar

Purpose: "See time, loops, and upcoming logistics."

Must include:

- Timeline or week view.
- Care loops as gentle recurring cards.
- School, health, pet, travel events.
- "Add from capture" path.

Avoid:

- Empty calendar states that feel like the app has no value.
- Static events with no detail or source.

### Review

Purpose: "LifeMap can suggest, but I stay in control."

Must include:

- Draft messages, reminders, and pending saves.
- Edit before approval.
- Clear staged state: nothing sends automatically.
- Source evidence.

Avoid:

- Any copy that implies autonomous sending before integrations exist.

### More

Purpose: "Settings and founder/admin utilities."

Must include:

- Account.
- Security/privacy.
- Launch Plan.
- Demo reset.
- Export/share later.

Avoid:

- Core user workflows hidden here.

## P0 UX Repairs

These need to happen before adding more features:

1. Make Daily Brief failure graceful and actionable.
2. Ensure every visible button/tap has a result.
3. Simplify bottom nav and Capture behavior.
4. Make Vault hierarchy calmer and less red.
5. Add expandable/hidden detail interaction for family profiles.
6. Replace static priority chips with real item actions.
7. Add first-run setup that recommends buckets.

## P1 Product Expansion

After P0 repairs:

1. Travel Logistics bucket: packing list, passports, TSA/PreCheck/Global Entry, rewards, flights, lodging, trip docs.
2. Health and Pet Care bucket: meds, vaccines, vet, doctors, insurance, allergies.
3. School Life bucket: schedules, lunch, forms, teacher contacts, activities.
4. Household Docs bucket: insurance cards, IDs, vehicle docs, home maintenance, emergency contacts.
5. Care Loops: recurring rhythms with low-anxiety status language.

## Design Taste Guardrails

Use the Atlas Home direction:

- Deep Slate / near-black for brand weight.
- Warm Bone / Soft Ivory for the app canvas.
- Intelligence Blue for AI and navigation.
- Clay Terracotta for urgency and primary calls to action.
- Muted Plum for privacy/depth.
- Sage only for success/completion.

Avoid:

- Green-heavy palette.
- Red-heavy urgency.
- Church pamphlet warmth.
- Generic SaaS gradients.
- Large decorative cards that do not perform a job.
- Dense dashboards that require scrolling to understand the app.

## Research Caveats

Competitor sources from Maple and Calendara are vendor-authored and should be treated as directional market evidence, not neutral research. They are still useful because they reveal the language and feature set current family-organization products are competing around in 2026.

## North Star

LifeMap should make a normal parent feel this in under one minute:

"Oh. This is where I put the chaos, and it tells me what to do next."

