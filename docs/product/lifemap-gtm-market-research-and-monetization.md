# LifeMap GTM, Market Research, and Monetization Plan

Date: 2026-07-01
Status: strategy draft for controlled beta and first monetization tests

## Executive decision

LifeMap should start as a trust-first consumer product for overloaded parents who need a calm place to keep family records, important dates, and "where is that thing?" information.

Do not position it as another ADHD app, family calendar, or cloud drive. The sharper positioning is:

> LifeMap is a smart family cabinet: one place to drop records, school forms, vaccine cards, travel details, and household information so you can find it when life asks for it.

The best next move is a controlled beta with 10-20 families, then a small paid founding-user offer. Do not spend heavily on paid ads yet. The product still needs trust validation, onboarding proof, and pricing validation before broad acquisition.

## Source-backed market read

### Demand signal

- BLS reports 32.9 million U.S. families with own children under 18 in 2025, with 30.1 million of those families having at least one employed parent. That is a large pool of households with logistics pressure and recurring admin needs.
  Source: https://www.bls.gov/news.release/famee.t04.htm
- Pew's June 2026 working-parent research explicitly names the "mental load" parents carry while balancing family needs and work demands.
  Source: https://www.pewresearch.org/social-trends/2026/06/16/for-working-parents-the-boundary-between-work-and-family-is-often-blurred/
- CDC estimated 15.5 million U.S. adults had a current ADHD diagnosis in 2023. This matters because LifeMap's early pull is likely strongest among families where organization and retrieval are already painful.
  Source: https://www.cdc.gov/mmwr/volumes/73/wr/mm7340a1.htm
- CDC also notes that adult ADHD can make it difficult to keep healthy habits and avoid health risks. LifeMap should avoid medical claims, but the user problem overlaps with practical executive-function support.
  Source: https://www.cdc.gov/adhd/data/adhd-in-adults.html

### Trust signal

- Pew reports that 67% of U.S. adults understand little to nothing about what companies do with their personal data, and 73% feel little to no control over data companies collect.
  Source: https://www.pewresearch.org/internet/2023/10/18/how-americans-view-data-privacy/
- FTC guidance says companies handling health information must avoid misleading consumers and must understand collection, use, disclosure, retention, and safeguard practices.
  Source: https://www.ftc.gov/business-guidance/resources/collecting-using-or-sharing-consumer-health-information-look-hipaa-ftc-act-health-breach

Implication: trust is not a feature afterthought. It is the conversion constraint. People will understand the utility quickly, but they will hesitate before uploading insurance, vaccine, passport, school, or medical documents unless the app clearly explains protection and limits.

## Competitive landscape

### Family organization apps

- Cozi owns the classic family organizer lane: shared calendar, activities, school events, practices, dentist appointments, vacations, grocery lists, to-dos, recipes, and agenda emails.
  Source: https://www.cozi.com/
- FamilyWall owns a broader family dashboard lane: schedules, activities, grocery lists, dinner planning, to-dos, and location.
  Source: https://www.familywall.com/en/index.html

LifeMap should not fight them as a better calendar. The wedge is "family records and context retrieval," with enough dates/reminders to make records actionable.

### Password managers and secure vaults

- 1Password Families is $4.49/month billed annually or $5.99/month monthly, with up to 5 family members, shared vaults, and family access management.
  Source: https://1password.com/pricing/password-manager

LifeMap should not claim to be a password manager. 1Password is a security benchmark and price anchor. LifeMap's difference is household context: vaccines, school forms, passports, insurance cards, travel needs, child/pet profiles, and "what do I need next?"

### Cloud storage and notes

Google Drive, iCloud, Dropbox, Evernote, Notion, and Apple Notes already store files. The problem is not raw storage. The problem is retrieval, context, ownership, and action. LifeMap wins only if it feels easier than "searching Drive, texts, email, screenshots, and memory."

## User research synthesis

### Strongest early users

1. Overloaded parent operator
   - Often employed or coordinating with an employed partner.
   - Owns school, health, camp, travel, pet, and household logistics.
   - Pain: "I know we have this somewhere, but I cannot find it when someone asks."

2. ADHD / executive-function-aware parent
   - Wants brain-dump relief, not another productivity system to maintain.
   - Pain: too many apps, too many categories, too much setup, too much shame.

3. Travel-heavy family
   - Passports, vaccine records, reward numbers, packing lists, TSA/travel rules, camp medical forms.
   - Pain: trips expose missing records and forgotten details.

4. Shared-custody / multi-household family
   - Needs safe access to records across more than one adult.
   - Pain: permission, trust, and currentness matter.

5. Pet and elder-care adjacent household
   - Pet vaccines, vet records, emergency contacts, medication info, caregiver instructions.
   - Pain: non-human family logistics live in messy places too.

### Jobs to be done

- "When I get a school/camp/doctor/travel request, help me find the required document quickly."
- "When I brain-dump messy family admin, sort it into the right person, record, date, or approval."
- "When something sensitive is involved, make me feel in control before anything happens."
- "When a document expires or is missing, show only the next thing I need to do."

### UX principles for this segment

- Show the end state before asking for setup.
- Start with people/pets, then records; not abstract folders first.
- Use plain labels: Home, Cabinet, Family, Settings.
- Keep AI quiet and permissioned.
- Make search feel central, not hidden.
- Use progressive disclosure for sensitive info.
- Avoid productivity-app clutter: no giant dashboards, gamification, streaks, or verbose coaching.

## Positioning

### Recommended category

Smart family cabinet.

### One-line pitch

LifeMap keeps your family's important records, dates, and details findable when life asks for them.

### Homepage hero direction

Not:
"AI-powered ADHD household operating system."

Better:
"Find the family info you always need at the worst possible time."

Support copy:
"Drop in forms, vaccine cards, passports, insurance details, school schedules, pet records, and travel notes. LifeMap sorts them by person, place, and next step."

### Trust copy

Use:
"Files are encrypted before storage. Private details stay hidden until opened. Nothing is sent or shared without your OK."

Avoid:
"Zero-knowledge" unless the architecture is actually zero-knowledge. Current design has app-layer encryption and account-scoped controls, but the Worker can derive the data key.

## Market sizing

### TAM proxy

U.S. families with own children under 18:

- 32.9 million families, BLS 2025.
- At $6/month: 32.9M * $72/year = $2.37B annual subscription TAM.
- At $8/month: 32.9M * $96/year = $3.16B annual subscription TAM.
- At $10/month: 32.9M * $120/year = $3.95B annual subscription TAM.

This is not a forecast. It is a boundary estimate for the family-admin category.

### Initial SAM proxy

Start with high-intensity households:

- working parents with kids
- ADHD-aware families
- travel-heavy families
- families with active school, health, camp, pet, or shared-custody admin

Conservative initial addressable niche: 2-5 million U.S. households.

At 1% paid penetration and $72/year, that is $1.4M-$3.6M ARR. At 3% paid penetration, $4.3M-$10.8M ARR.

### Year-one SOM target

Practical first-year targets:

- 100 paid families: proof of willingness to pay
- 500 paid families: product has a real wedge
- 2,000 paid families at $59/year: $118K ARR
- 10,000 paid families at $79/year: $790K ARR

The first milestone is not revenue scale. It is proving that families will pay for trust, retrieval, and relief.

## Monetization recommendation

### Start simple

Do not launch with four plans. Use a free trial plus one paid family plan.

Recommended beta offer:

- Free trial: 14 days
- Founding Family: $59/year
- Later standard price: $79/year or $7.99/month

Included:

- family and pet profiles
- secure document upload
- search
- important dates
- private reveal controls
- clear-my-map controls
- onboarding/replay

Avoid charging separately for AI at first. AI is part of the promise: "drop messy context, get it sorted." If extraction costs become material, add fair-use limits later.

### Later pricing ladder

1. Free
   - 1 adult profile
   - 1 child/pet profile
   - 5 records
   - no or limited secure upload
   - purpose: let people understand the product

2. Family
   - $7.99/month or $79/year
   - 5-8 profiles
   - secure uploads
   - search
   - dates and review queue
   - purpose: core business

3. Family Plus
   - $12.99/month or $129/year
   - more storage
   - shared adult access
   - emergency packet export
   - travel/camp/school packs
   - purpose: power users

Do not sell to employers yet. HR benefits can be explored later, but selling a sensitive family-data app through employers may create trust friction.

## Go-to-market strategy

### Phase 1: Controlled beta

Goal: prove trust, clarity, and retrieval value.

Duration: 2-3 weeks.

Target:

- 10-20 families
- 5 ADHD-aware parents
- 5 travel-heavy parents
- 5 school/camp-heavy parents
- 2-5 pet-heavy households

Ask testers to use fake or low-risk documents first. Then ask if they would trust the app with real data and what proof they need.

Success criteria:

- 70% can explain Home, Cabinet, Family, Settings without coaching.
- 60% add a person/pet and one record without help.
- 50% use search or Cabinet to find the record later.
- 40% say they would pay at least $5/month or $59/year.
- Top trust objection is specific and solvable, not "I would never upload documents here."

### Phase 2: Founder-led community launch

Channels:

- TikTok/Reels: parent mental load, "where is the vaccine card?", travel prep, camp forms.
- Reddit/community learning only, not spam.
- Parent newsletters and local Facebook groups with permission.
- ADHD coaches and organizers.
- Family travel creators.
- School/camp admin consultants.

Message:

- "Stop searching five places for the family record."
- "A smart cabinet for the stuff you only need when someone urgently asks."
- "Private, searchable, and built around people/pets."

Content concepts:

- "Things parents always need but never have handy."
- "Camp form panic checklist."
- "Travel document calm-down."
- "The vaccine-card problem."
- "The 10-minute family cabinet setup."

### Phase 3: Partnerships

Best early partners:

- ADHD coaches
- professional organizers
- family travel advisors
- camp consultants
- parent newsletter operators
- pediatric admin-adjacent creators, not clinics first
- pet care creators and vet-adjacent newsletters

Avoid regulated healthcare partnerships until privacy/security posture, legal docs, and support processes are stronger.

## Clay GTM workflow

Clay should be used for partner discovery and lightweight B2B2C outreach, not cold-selling directly to parents.

Clay capabilities relevant to this motion:

- Clay positions itself as GTM infrastructure for getting data, running agentic workflows, and launching GTM plays.
  Source: https://www.clay.com/
- Clay Free includes limited monthly actions and data credits, enough to prototype a small list. Launch starts around $167/month annually or $185/month monthly, depending billing view.
  Source: https://www.clay.com/pricing
- Clay's public site emphasizes enrichment from 150+ providers, waterfalls, intent/signals, ads audiences, sequencer, and account research.
  Source: https://www.clay.com/

### Clay list 1: ADHD coaches and executive-function coaches

Filters:

- title contains ADHD coach, executive function coach, parent coach
- geography: U.S., Canada, UK, Australia
- audience: parents, women, families, ADHD adults
- channel: newsletter, podcast, Instagram, TikTok, YouTube, Substack

Clay enrichments:

- website
- LinkedIn
- email if publicly available and compliant
- audience size proxy
- recent content topics
- ICP fit score
- partnership angle

Outbound angle:

"I am building a private smart family cabinet for parents who carry the mental load. I am looking for 10 coaches to review whether this would actually help families who struggle with retrieval and follow-through."

### Clay list 2: parent newsletter and community operators

Filters:

- parenting newsletter
- local family calendar publisher
- working mom community
- family travel newsletter
- school/camp planning content

Enrichments:

- audience topic
- sponsorship/contact page
- newsletter frequency
- paid sponsorship availability
- fit for beta invite

Outbound angle:

"Looking for 20 families to test a private family-record cabinet before public launch. Not asking for sensitive real documents in the first test."

### Clay list 3: family travel advisors and creators

Filters:

- family travel advisor
- Disney travel planner
- international family travel
- travel with kids
- camp/trip packing lists

Enrichments:

- content about passports, vaccine records, packing, travel documents
- audience type
- contact
- partnership idea

Outbound angle:

"LifeMap helps families keep passports, insurance, vaccine cards, reward numbers, and trip-specific reminders findable before a trip."

### Clay list 4: professional organizers

Filters:

- professional organizer
- digital organizer
- home admin organizer
- productivity consultant
- paper clutter specialist

Enrichments:

- services offered
- whether they work with families
- content about paperwork/files
- partnership or affiliate fit

Outbound angle:

"LifeMap is a digital cabinet for the family admin layer your clients keep losing across drawers, email, screenshots, and memory."

### Clay operating rules

- Start with 100-200 prospects per segment.
- Do not buy large contact lists yet.
- Do not over-automate cold email; trust-sensitive consumer products need careful, founder-led language.
- Prioritize warm intros, creator partnerships, review calls, and beta invites.
- Track replies by segment and objection category.

## Launch plan

### Week 1: Trust and beta readiness

- Add a public "Privacy & Security" explainer page.
- Add "What LifeMap can/cannot see" in plain English.
- Add beta disclaimer: use fake or low-risk docs during first testing.
- Create a 7-question feedback form.
- Create a test script with tasks:
  - sign up
  - complete onboarding
  - add person/pet
  - add one low-risk record
  - search/find it
  - use forgot password
  - review clear-my-map

### Week 2: First 10 testers

- Recruit from personal network.
- Run 5 observed sessions and 5 self-serve sessions.
- Record:
  - where they hesitate
  - whether they understand Cabinet vs Family
  - whether they trust uploads
  - what they would pay
  - what they expected search to do

### Week 3: Pricing test

- Offer Founding Family at $59/year.
- Do not discount below that; a lower price may hide whether the problem is valuable.
- Success: 3-5 paid conversions from 20 warm testers.

### Week 4: Clay partner test

- Build first Clay table: 100 ADHD/executive-function coaches.
- Send 20 highly personalized partnership/review emails.
- Build second Clay table: 100 family travel creators/advisors.
- Send 20 personalized emails.
- Measure:
  - positive reply rate
  - call-booking rate
  - objections
  - whether partners understand the category

## Measurement plan

### Activation

- account created
- onboarding completed
- first person/pet created
- first record added
- first search performed
- first file opened successfully

### Trust

- user opens Privacy & Security
- user completes upload
- user uses reveal/private controls
- user understands clear-my-map
- user says they would trust real data

### Retention

- second session within 7 days
- record searched/opened after initial setup
- important date viewed
- new record added after day 1

### Monetization

- trial start
- pricing page view
- payment intent start
- paid conversion
- cancellation reason

## What not to do yet

- Do not build a packing app as a separate product yet.
- Do not expand into full calendar competition.
- Do not launch paid ads before pricing/trust validation.
- Do not market as "AI medical record storage."
- Do not claim HIPAA compliance unless legal/technical requirements are actually met.
- Do not claim zero-knowledge encryption unless key architecture changes.
- Do not overload the app with more modes.

## Recommended next build

Build the trust and conversion layer:

1. Public Privacy & Security page.
2. In-app "how your files are protected" microcopy near uploads.
3. Simple pricing experiment page, hidden behind beta flag if needed.
4. Feedback form or beta evidence log.
5. Optional: first-run "example LifeMap" remains the onboarding anchor.

## Bottom line

LifeMap has a real market wedge if it stays focused: not calendar, not notes, not cloud drive, not generic ADHD. The wedge is private family retrieval and relief.

Start with families who already feel the pain, prove trust, ask for money early, and use Clay to find partners who already advise the exact users LifeMap helps.
