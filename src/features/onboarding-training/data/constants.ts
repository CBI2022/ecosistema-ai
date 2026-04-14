/**
 * 90-day onboarding program content.
 * Text is kept in English here and surfaced through i18n wrappers for UI chrome.
 * When the multi-language system is ready, content can be moved into locale files.
 */

export interface WeekScript {
  label: string
  text: string
}

export interface AgentWeek {
  phase: 0 | 1 | 2
  week: number
  days: string
  action: string
  tasks: string[]
  dc: string
  target: string
  script: WeekScript | null
}

export interface DcWeek {
  phase: 0 | 1 | 2
  week: number
  days: string
  action: string
  tasks: string[]
  target: string
}

export interface TrainingVideoMeta {
  id: string
  week: number
  title: string
  topic: string
}

// CBI gold / emerald / purple accents — compatible with Tailwind arbitrary colors
export const PHASE_COLORS = ['#D4A853', '#6BAE94', '#9B7EC8'] as const
export const PHASE_LABELS = [
  'Phase 1 · Prospecting',
  'Phase 2 · Listings & Leads',
  'Phase 3 · Viewings & Close',
] as const

export const GOALS_90D = {
  doors: 400,
  contacts: 125,
  appointments: 15,
  viewings: 12,
  offers: 2,
  listings: 6,
} as const

export type GoalKey = keyof typeof GOALS_90D

export const TRAINING_VIDEOS: TrainingVideoMeta[] = [
  { id: 'tv1', week: 0, title: 'Your First Day Game Plan', topic: 'What to do on day 1, who to meet, how to prepare for your first week' },
  { id: 'tv2', week: 0, title: 'Door Knocking 101', topic: 'The exact script, body language, what to carry, and how to approach' },
  { id: 'tv3', week: 1, title: 'CRM Mastery', topic: 'How to log contacts, track leads, and stay organized from day one' },
  { id: 'tv4', week: 1, title: 'The Power of 25 Doors a Day', topic: 'Why volume wins, how to stay consistent, and beat the numbers game' },
  { id: 'tv5', week: 2, title: 'How to Run a CMA', topic: 'Step by step comparative market analysis for your first listing appointment' },
  { id: 'tv6', week: 2, title: 'Handling Seller Objections', topic: 'Top 5 objections sellers throw at you and the exact responses that work' },
  { id: 'tv7', week: 3, title: 'Asking for the Signature', topic: 'The close — when to ask, how to be confident, never leave without asking' },
  { id: 'tv8', week: 3, title: 'Building Your Referral Network', topic: 'How to find referral partners, what to say, and how to grow your network' },
  { id: 'tv9', week: 4, title: 'Qualifying Buyers Fast', topic: 'The 5 qualification questions and how to score leads hot, warm, or cold' },
  { id: 'tv10', week: 4, title: 'Portal Optimization', topic: 'Making your listings stand out on Idealista, Fotocasa, and the website' },
  { id: 'tv11', week: 5, title: 'Running a Perfect Viewing', topic: 'Room by room walkthrough, reading buying signals, and the close question' },
  { id: 'tv12', week: 5, title: 'Follow-Up That Converts', topic: 'WhatsApp templates, timing, persistence, and turning viewings into offers' },
  { id: 'tv13', week: 6, title: 'Pipeline Management', topic: 'Hot/warm/cold scoring system and how to run your weekly pipeline review' },
  { id: 'tv14', week: 6, title: 'Staying Consistent', topic: 'How to keep door knocking and prospecting when viewings and leads pile up' },
  { id: 'tv15', week: 7, title: 'Creating Buyer Urgency', topic: 'When and how to push, scarcity tactics, and moving buyers to a decision' },
  { id: 'tv16', week: 7, title: 'The Offer Process', topic: 'From verbal interest to written offer — what the DC needs to know' },
  { id: 'tv17', week: 8, title: 'Advanced Viewing Techniques', topic: 'Handling multiple buyers, group viewings, and managing viewing schedules' },
  { id: 'tv18', week: 8, title: 'Reading Buying Signals', topic: "Body language, questions buyers ask, and knowing when they're ready" },
  { id: 'tv19', week: 9, title: 'Presenting Offers to Sellers', topic: 'How to frame an offer, manage seller expectations, and stay in control' },
  { id: 'tv20', week: 9, title: 'Counter-Offer Strategy', topic: 'When to push back, when to hold, and how to keep both sides at the table' },
  { id: 'tv21', week: 10, title: 'Unsticking Stalled Deals', topic: 'Finding the real blocker, recovery scripts, and saving deals that stall' },
  { id: 'tv22', week: 10, title: 'The Reservation Process', topic: 'Legal steps, deposits, timelines, and what happens after offer accepted' },
  { id: 'tv23', week: 11, title: 'Your 6-Month Revenue Plan', topic: 'Setting targets, building on momentum, and planning your next 90 days' },
  { id: 'tv24', week: 11, title: 'Lessons From Top Agents', topic: 'What the best agents do differently and how to model their habits' },
]

export const CORE_VIDEO_IDS = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'] as const
export type CoreVideoId = (typeof CORE_VIDEO_IDS)[number]

export const CORE_VIDEOS: { id: CoreVideoId; title: string; duration: string; brief: string }[] = [
  { id: 'v1', title: 'Welcome to the Team', duration: '5–7 min', brief: "Film from your desk. Who you are, what the company does, who your buyers are. End with: 'In 90 days, here's what we'll build together.'" },
  { id: 'v2', title: 'How to Door Knock', duration: '8–10 min', brief: 'Film on a real street. Show the full process: approach, script, objection, log in CRM. Do a real knock if possible.' },
  { id: 'v3', title: 'The Listing Presentation', duration: '12–15 min', brief: 'Sit at a table as if with a seller. Full presentation — CMA, marketing system, ask for the signature.' },
  { id: 'v4', title: 'Objection Handling', duration: '8–10 min', brief: 'Film with DC. She plays seller, you respond. Cover: commission, already listed, not ready, need to think, partner unsure.' },
  { id: 'v5', title: 'How to Qualify a Buyer', duration: '6–8 min', brief: 'Film at your desk. 5 qualification questions, what each tells you, one full roleplay call.' },
  { id: 'v6', title: 'How to Run a Viewing', duration: '8–10 min', brief: 'Film inside a listing. Prep, room-by-room, reading signals, next step, follow-up WhatsApp.' },
  { id: 'v7', title: 'How to Negotiate an Offer', duration: '10–12 min', brief: 'Film with DC. Full offer process roleplay — receive offer, present to seller, handle counter-offer.' },
  { id: 'v8', title: 'The Weekly Routine', duration: '5–6 min', brief: 'Casual phone camera. Walk through a perfect week: CRM check, door knocking, calls, viewing prep, social post.' },
]

export const AGENT_WEEKS: AgentWeek[] = [
  { phase: 0, week: 1, days: 'Days 1–5', action: 'Knock 20 doors before Friday.', tasks: ['Meet the full team — name and role', 'Study the top 10 active listings', 'Set up your CRM — login and profile', 'Learn the door knock script word for word', 'Knock 20 doors — log every contact'], dc: 'DC runs morning training Days 1–3. Joins your first door knock on Day 5.', target: '20 doors by Day 5', script: { label: 'Door Knock Opener', text: '"Hi, I\'m [NAME] from [COMPANY]. We\'ve sold on your street and I wanted to introduce myself. Do you or anyone you know have a property they might consider selling? We specialise in foreign buyers."' } },
  { phase: 0, week: 2, days: 'Days 6–10', action: 'Knock 25 doors every day this week.', tasks: ['25 doors per day — log every contact in CRM', 'Learn the listing presentation end to end', 'Send 20 WhatsApp messages to your network', 'Book 2 referral partner coffees', 'Follow up every warm lead from Week 1'], dc: "Daily morning debrief. DC reviews your CRM on Friday.", target: '125 doors · 5 CRM leads · 1 appointment booked', script: { label: 'WhatsApp to Your Network', text: '"Hey [NAME]! I\'ve just joined [COMPANY] as a property agent on the Costa Blanca. We sell to foreign buyers. If you ever hear of anyone thinking of selling, let me know — I\'ll always take care of you."' } },
  { phase: 0, week: 3, days: 'Days 11–15', action: 'Book and run your first listing appointment this week.', tasks: ['Run first listing appointment — DC will be there', 'Debrief immediately after: score yourself 1–10', 'Learn the CMA process', 'Master the top 5 seller objections', "25 doors per day — don't stop prospecting"], dc: 'Attends your first appointment. Full debrief after. Runs objection training in morning sessions.', target: '150 doors · 1 appointment held · 1 CMA done', script: { label: 'Objection — Commission Too High', text: '"I understand. But would you rather save 1% and wait 9 months, or use our system and sell in [X] days to a qualified foreign buyer? Our sellers net more even after commission. Want me to show you the numbers?"' } },
  { phase: 0, week: 4, days: 'Days 16–20', action: 'Push for the signature at every appointment. Do not leave without asking.', tasks: ['Run solo listing appointments — ask for the signature every time', 'First listing signed → hand to DC for photos and portal', '25 doors per day in new zones', 'Build your referral network to 4 partners', '30-day review with Darcy and DC'], dc: 'Supports listing upload. Reviews your social posts. Runs 30-day review.', target: '200 doors · 1 listing SIGNED · 30-day review done', script: { label: 'The Close', text: '"Based on everything we\'ve discussed — shall we go ahead and sign today so we can introduce your property to our buyers this week?"' } },
  { phase: 1, week: 5, days: 'Days 21–25', action: 'Reply to every buyer enquiry within 1 hour. No exceptions.', tasks: ['Listing live on Idealista, Fotocasa and website', 'Reply to every buyer enquiry within 1 hour', 'Qualify every lead: budget, timeline, area, financing', "20 doors per day — don't stop", 'Book your second listing appointment'], dc: 'Approves listing before it goes live. Trains you on buyer qualification. Listens to your first buyer calls.', target: '1 listing live · 3 buyer enquiries · 1 viewing booked', script: { label: 'Buyer Qualification Call', text: '"Great to hear from you. To make sure your time is well spent — are you buying in the next 3 months? Do you have financing in place? And is this area your first choice?"' } },
  { phase: 1, week: 6, days: 'Days 26–30', action: 'Book and run at least 2 viewings this week.', tasks: ['Run first property viewings — DC joins the first one', 'Debrief every viewing the same day', '15 doors per day — keep the habit', 'Follow up every viewing within 2 hours', 'Push for second listing signed this week'], dc: 'Attends your first viewing. Debriefs after. Reviews your follow-up messages.', target: '2 viewings held · 1 offer conversation · 2 listings signed', script: { label: 'Post-Viewing Follow-Up', text: '"Really enjoyed showing you the property today. Honest question — is this something you could see yourself in, or is there something that doesn\'t quite fit? I want to find you the right one."' } },
  { phase: 1, week: 7, days: 'Days 31–35', action: 'Do not let door knocking drop. Buyers and doors every single day.', tasks: ['CRM check every morning before anything else', 'Manage 5 active buyer leads', 'Second listing live on portals', 'Book viewings for both listings', 'Weekly team meeting — share wins and blockers'], dc: 'Observes 1 viewing per week. Reviews CRM pipeline every Friday.', target: '5 buyer leads · 2 listings live · 4 viewings total', script: null },
  { phase: 1, week: 8, days: 'Days 36–40', action: 'Identify your top 2 buyers. Create urgency this week.', tasks: ['Push every warm buyer toward a decision', 'Learn the offer process with DC', '10 doors per day — non-negotiable', 'Target your third listing', '60-day review with Darcy and DC'], dc: 'Teaches the full offer and negotiation process. Runs 60-day review.', target: '1 offer imminent · 3 listings · 60-day review done', script: { label: 'Creating Urgency', text: '"I want to be transparent — there are two more viewings booked this week. If this is the one for you, now is the time to move. Shall we talk about putting something together?"' } },
  { phase: 2, week: 9, days: 'Days 41–45', action: 'Run 3 viewings this week minimum.', tasks: ['3 viewings per week across your listings', 'Prepare for every viewing: property notes, buyer brief', 'Follow up every viewing within 2 hours', '10 doors per day', 'Report pipeline to DC every Monday morning'], dc: 'Weekly Monday pipeline review. Joins 1 difficult viewing per agent.', target: '3 viewings/week · 2 hot buyers identified', script: null },
  { phase: 2, week: 10, days: 'Days 46–50', action: 'Never negotiate alone. Call DC before you respond to any offer.', tasks: ['Push your hottest buyer to make an offer', 'Never negotiate alone — always loop in DC first', 'Keep seller informed at every step', 'Keep viewings and prospecting going', 'Log every offer detail in CRM'], dc: 'Present on every offer negotiation. Reviews all counter-offer strategy before you respond.', target: '1 formal offer submitted · Negotiation active', script: { label: 'Presenting an Offer to the Seller', text: '"I have an offer to share. Before the number — this buyer is serious, pre-qualified, and ready to move. The offer is [X]. Here\'s how I\'d recommend we respond..."' } },
  { phase: 2, week: 11, days: 'Days 51–55', action: 'Follow up on every open offer every single day.', tasks: ['Follow up every open offer daily', 'Find the real blocker if an offer has stalled', 'Keep running viewings on other listings', '10 doors per day', 'Prepare for reservation contract with DC'], dc: 'Daily check-in on offer status. Coaches you on stalled offer recovery.', target: 'Offer accepted OR reservation contract in progress', script: { label: 'Stalled Offer Recovery', text: '"I know this takes time and I respect that. I\'d just hate for you to lose this property over something we could solve together. What\'s the main thing holding you back?"' } },
  { phase: 2, week: 12, days: 'Days 56–60', action: 'Close the sale. Present your numbers. Set your next target.', tasks: ['Close the sale OR have a reservation contract signed', 'Final 90-day review — present your full numbers to Darcy', 'Set your personal 6-month revenue target', 'Identify your 3 strongest lead sources', 'Commit to your next 90-day sprint'], dc: 'Runs your graduation review. Sets your 6-month target with you.', target: '1 sale closed OR reservation signed', script: null },
]

export const DC_AGENT_TASKS: string[][] = [
  ['Run morning training Days 1–3 with agent', 'Give agent the 90-day plan — explain it', 'Show agent how to log contacts in CRM', "Join agent's first door knock on Day 5"],
  ['Daily morning debrief with agent', "Review agent's CRM entries on Friday", 'Coach agent if under 20 doors/day'],
  ["Attend agent's first listing appointment", 'Score agent 1–10 after appointment', 'Debrief immediately after appointment', 'Run objection training with agent'],
  ["Review agent's listing photos and description", 'Support agent on solo appointments', 'Run 30-day review with agent and Darcy', 'Set Week 5 targets with agent'],
  ["Approve agent's listing before it goes live", 'Train agent on buyer qualification questions', "Listen to agent's first buyer call", 'Give written feedback same day'],
  ["Attend agent's first viewing", 'Debrief after viewing — buying signals?', "Check agent's follow-ups are within 2 hours", "Review agent's follow-up messages"],
  ['Observe 1 viewing with agent this week', 'Check agent is still doing 15 doors/day', "Review agent's pipeline: Hot/Warm/Cold"],
  ['Run negotiation roleplay with agent', 'Remind agent: never negotiate alone', 'Run 60-day review with agent and Darcy', 'Create intervention plan if agent is behind'],
  ["Review agent's pipeline Monday meeting", 'Join 1 difficult viewing with agent', 'Coach agent on closing signals', 'Agent names top 2 buyers most likely to offer'],
  ["Be present on agent's offer negotiation", 'Review counter-offer strategy with agent', 'Manage seller communication with agent'],
  ["Daily check-in on agent's open offers", 'Coach agent on stalled offer recovery', 'Prepare agent for reservation contract'],
  ['Run 90-day graduation review with agent', "Present agent's numbers to Darcy", "Set agent's 6-month revenue target"],
]

export const DC_WEEKS: DcWeek[] = [
  { phase: 0, week: 1, days: 'Days 1–5', action: 'Walk every agent through their first door knock personally.', tasks: ['Run morning training Days 1–3: company, market, buyer profile', 'Give every agent the 90-day plan — explain it out loud', 'Set CRM standards — show exactly how to log a contact', 'Accompany every agent on their first door knock', 'Set up the daily WhatsApp check-in group'], target: 'Every agent has CRM set up · 20 doors knocked per agent by Day 5' },
  { phase: 0, week: 2, days: 'Days 6–10', action: "Review every agent's CRM on Friday. Anyone below 20 doors/day — find out why today.", tasks: ['Run daily morning debrief: doors, leads, blockers', 'Review all CRM entries every Friday', 'Coach any agent under 20 doors/day individually', 'Join 1 referral partner meeting with an agent', 'Run objection roleplay in morning sessions'], target: 'All agents at 20+ doors/day · 1 appointment booked across the team' },
  { phase: 0, week: 3, days: 'Days 11–15', action: "Be at every agent's first listing appointment. Debrief immediately after.", tasks: ['Attend first listing appointment with every agent', 'Score each agent 1–10 on every section', 'Run CMA training in morning session', 'Identify who is on track and who needs extra support', 'Increase roleplay intensity'], target: 'All agents have run 1 appointment · Struggling agents have a plan' },
  { phase: 0, week: 4, days: 'Days 16–20', action: 'Approve every listing. Nothing goes live without your sign-off.', tasks: ['Review all listing photos and descriptions', 'Support agents on their solo appointments', 'Run the 30-day review — present scores to Darcy', 'Set Week 5 targets with each agent individually', 'Identify top performer and agent needing most support'], target: '1 listing signed per agent · 30-day review delivered to Darcy' },
  { phase: 1, week: 5, days: 'Days 21–25', action: "Listen to every agent's first buyer call. Give written feedback the same day.", tasks: ['Approve every listing before it goes live', 'Train agents on the 5 buyer qualification questions', 'Listen to first buyer calls and give written feedback', 'Check CRM daily — every lead replied to within 1 hour', 'Keep morning door knock accountability going'], target: 'All listings live · 1 viewing booked per agent' },
  { phase: 1, week: 6, days: 'Days 26–30', action: "Attend every agent's first viewing. Observe — do not interrupt.", tasks: ['Attend first viewing with every agent', 'Debrief after every viewing — what signals did the buyer show?', 'Train agents on reading buying signals', 'Check viewing follow-ups in CRM — all within 2 hours?', '15 doors per day per agent — keep the standard'], target: 'All agents have done 1 viewing · Follow-ups 100% within 2hrs' },
  { phase: 1, week: 7, days: 'Days 31–35', action: 'Monitor closely. Any agent dropping prospecting needs a conversation today.', tasks: ['Observe 1 viewing per agent this week', 'Run weekly team meeting: wins, blockers, best scripts', 'Watch for agents neglecting prospecting', 'Introduce Hot / Warm / Cold pipeline scoring', 'Flag listings that need a price or marketing review'], target: 'All agents at 15 doors/day · 5 buyer leads each' },
  { phase: 1, week: 8, days: 'Days 36–40', action: 'Run a full negotiation roleplay. You play the difficult seller — make it hard.', tasks: ['Run full negotiation training in morning session', 'Roleplay: agents present offers, you push back hard', 'Remind every agent: never negotiate alone — call you first', 'Run 60-day review with Darcy — present individual scores', 'Create intervention plan for any agent falling behind'], target: 'All agents trained on offers · 60-day review done' },
  { phase: 2, week: 9, days: 'Days 41–45', action: 'Run Monday pipeline meeting every week. Who is closest to an offer?', tasks: ["Monday pipeline meeting — rank every agent's hottest buyer", 'Join 1 difficult viewing per agent', 'Coach on closing signals — when is a buyer ready?', 'Check all listings are optimised', 'Push agents to name their top 2 buyers most likely to offer'], target: '2 hot buyers per agent · 3 viewings/week per agent' },
  { phase: 2, week: 10, days: 'Days 46–50', action: 'No agent responds to any offer without calling you first. No exceptions.', tasks: ['Present on every offer negotiation', 'Manage seller communication alongside the agent', 'Review every counter-offer strategy before agent responds', "Keep all other agents' prospecting and viewings on track", 'Celebrate the first offer with the whole team'], target: '1 formal offer submitted · DC present on all negotiations' },
  { phase: 2, week: 11, days: 'Days 51–55', action: 'Check the status of every open offer daily. Find the blocker.', tasks: ['Daily check-in on every open offer', 'Coach agents on stalled offer recovery', 'Prepare agents for reservation contract process', 'Keep morning training sharp', 'Start planning the next agent cohort'], target: 'Reservation contract in progress · No agent has dropped prospecting' },
  { phase: 2, week: 12, days: 'Days 56–60', action: 'Run the graduation review. Set every agent\'s 6-month target in the room.', tasks: ['Run 90-day graduation review with Darcy', 'Present: listings, viewings, offers, sales per agent', 'Set individual 6-month revenue targets with each agent', 'Identify top performer — give them a peer mentor role', "Write down what you'd do differently for the next cohort"], target: '1 sale closed OR reservation signed · All agents have 6-month targets' },
]
