'use client'

import { useState } from 'react'
import { TrainingExam } from './TrainingExam'

type Category = 'All' | 'Prospecting' | 'Closing' | 'Viewings' | 'Mindset' | 'Marketing' | 'Scripts' | 'General'

interface Video {
  id: string
  title: string
  description: string | null
  youtube_url: string | null
  category: string
  type: 'video' | 'script' | 'how_to'
  content: string | null
  duration_minutes: number | null
}

interface LastResult {
  score: number
  passed: boolean
  completed_at: string
}

interface TrainingHubProps {
  videos: Video[]
  userId: string
  lastResult: LastResult | null
}

const CATEGORIES: Category[] = ['All', 'Prospecting', 'Closing', 'Viewings', 'Mindset', 'Marketing', 'Scripts', 'General']

const CATEGORY_COLORS: Record<string, string> = {
  Prospecting: '#C9A84C',
  Closing: '#2ECC9A',
  Viewings: '#8B7CF6',
  Mindset: '#F97316',
  Marketing: '#EC4899',
  Scripts: '#06B6D4',
  General: '#9A9080',
}

const HOW_TOS = [
  {
    id: 'listing-appointment',
    title: 'How to Prepare a Listing Appointment',
    emoji: '🏠',
    steps: [
      'Research the property: Google the address, check Idealista/Fotocasa for comparables, note avg prices per m² in the zone',
      'Prepare your CMA (Comparative Market Analysis): 3–5 similar sold properties within 500m and 6 months',
      'Print or bring your marketing package: CBI brochure, your 3D tour example, professional photography portfolio',
      'Prepare the valuation range: conservative / realistic / optimistic pricing with rationale',
      'Arrive 10 minutes early, dress professionally, bring business cards',
      'Open with rapport: compliment the property genuinely, ask about their motivation and timeline',
      'Present the valuation — use the CBI Valuation PDF tool',
      'Explain your marketing plan: professional photography, portals, social media, buyer database',
      'Ask for the listing agreement and confirm the timeline',
    ],
  },
  {
    id: 'viewing-prep',
    title: 'How to Run a Perfect Viewing',
    emoji: '🔑',
    steps: [
      'Confirm with the client 24h before: address, parking, meeting time',
      'Brief the seller: tidy up, good lighting, fresh air, no pets during viewing',
      'Arrive 10 minutes early to air the property and know the layout',
      'Start outside: present the street, garden, and façade first',
      'Ask questions as you go: "Can you see yourself here?" / "What do you think so far?"',
      'Save the best room for last (usually the main terrace or sea view)',
      'After the viewing: sit down nearby with coffee, recap their favourite features',
      'Address objections directly — never let them leave without discussing concerns',
      'If they are interested: explain next steps (offer, reservation, notary timeline)',
    ],
  },
  {
    id: 'offer-to-close',
    title: 'Offer to Closing: Step-by-Step',
    emoji: '✍️',
    steps: [
      'Receive the offer: get it in writing (even WhatsApp screenshot counts)',
      'Present to seller professionally — always call, never message for offers',
      'Negotiate: use silence and facts, avoid emotion',
      'Once agreed: draft the reservation contract (€3,000–€10,000 deposit to take off market)',
      'Coordinate legal checks: nota simple, IBI receipt, community fee statement, energy certificate',
      'Draft arras contract (10% of purchase price typical, penalty clauses both ways)',
      'Buyer obtains NIE, opens Spanish bank account',
      'Schedule notary appointment: both parties or valid POA required',
      'Final escritura signed at notary — celebrate with the clients!',
    ],
  },
  {
    id: 'online-presence',
    title: 'How to Build Your Online Presence',
    emoji: '📱',
    steps: [
      'Set up your LinkedIn profile as a luxury real estate specialist in Costa Blanca Norte',
      'Create a Google Business profile for your personal brand',
      'Post 3–4 times/week on Instagram: property photos, market tips, behind-the-scenes',
      'Use Reels for drone footage walkthroughs — highest organic reach',
      'Share market updates as carousel posts: "Avg price in Moraira Q4 2024"',
      'Engage with local expat Facebook groups (La Marina Alta, LECB, etc.)',
      'Ask every happy client for a Google review — one sentence is enough',
      'Build a WhatsApp broadcast list of qualified leads',
      'Consistency beats virality: 3 posts per week for 6 months beats 30 in one month',
    ],
  },
]

const SCRIPTS = [
  {
    id: 'cold-call',
    title: 'Cold Call Script — Owner',
    category: 'Prospecting',
    content: `[After dial picks up]

You: "Good morning/afternoon, may I speak with [Name]? My name is [Your Name], I'm a property specialist with Costa Blanca Investments."

[If they confirm]

You: "I won't take more than 2 minutes of your time. I'm calling because we have a client currently looking for a [villa/apartment] in [Zone], and we understand you may own a property there. Is that correct?"

[If yes]

You: "Excellent. Would you be open to a conversation about the current market value of your home? There's absolutely no obligation — I simply want to give you a free, accurate valuation. When would be a good time to visit?"

[If they say they're not selling]

You: "Completely understood. Many of our best relationships start as a conversation. When the time comes — whether that's in 6 months or 3 years — you'll have all the market data you need. Can I send you a brief market report for your area by email? It takes 30 seconds to review."`,
  },
  {
    id: 'price-objection',
    title: 'Handling the Price Objection',
    category: 'Closing',
    content: `Client: "I think the price is too high."

You: "I appreciate you being direct with me — that's exactly what helps us reach a deal. Can I ask, when you say too high, are you comparing it to a specific property or is it based on a general budget?"

[Listen carefully]

If based on budget:
You: "So if the price were [their budget], this would work for you? Let me look at what we could negotiate. Before I go back to the seller, I want to present a strong offer — what price would make you comfortable enough to sign today?"

If based on comparables:
You: "Let's look at those comparables together. [Show data] This property has [X unique features]. The recent sales in this zone averaged €[X] per m². At the current asking price, you're actually getting [value justification]."

Key principle: Never drop your asking price until you know what they will sign at. Always trade concessions for commitments.`,
  },
  {
    id: 'followup',
    title: 'Follow-Up Call — Post Viewing',
    category: 'Closing',
    content: `[Call within 24 hours]

You: "Hi [Name], it's [Your Name] from CBI. I'm calling because I wanted to hear your thoughts while the property is still fresh in your mind."

[Let them talk]

If positive:
You: "I'm glad you felt that way. What was your favourite thing about it?"
[They answer]
You: "Exactly — that [feature] is rare at this price in [Zone]. I'd love to check if the seller would accept [discuss terms]. Would you like me to explore that?"

If hesitant:
You: "What would need to be different for this to be the right property for you?"
[This question uncovers the real objection every time]

If not interested:
You: "I completely understand. Can I ask — what would your ideal property look like? I want to make sure the next one I show you is much closer to the mark."`,
  },
  {
    id: 'fee-presentation',
    title: 'Presenting Your Commission Fee',
    category: 'Prospecting',
    content: `[Present after you've built value, not at the start]

You: "Before I talk about my fee, let me show you what you get in return."

[Walk through your marketing plan: professional photography, 3D tour, portal exposure, buyer database, social media, WhatsApp broadcast, personal network]

You: "My fee is [X]% of the sale price. That includes everything I just showed you, plus unlimited viewings, negotiation on your behalf, and coordination all the way to the notary. My goal is to get you the best net price possible."

[If they push back]

You: "I understand — it feels like a significant amount. But consider this: if I achieve a sale price that's even 2% higher than a cheaper agent, that more than covers my fee. And in this market, my database of qualified buyers often avoids months of unnecessary exposure. Would you like to see the data on my average days-on-market?"`,
  },
  {
    id: 'door-knocking',
    title: 'Door Knocking Script',
    category: 'Prospecting',
    content: `[Knock or ring the bell. Stand back, smile, be relaxed.]

You: "Good morning/afternoon! Sorry to bother you — my name is [Your Name], I work with Costa Blanca Investments just in this area. I won't take more than a minute."

[Pause and let them react]

If they open the door and seem receptive:
You: "We've just helped a neighbour on [nearby street] sell their property, and we actually have a shortlist of buyers who didn't find what they were looking for there. Do you know of anyone in the street who might be thinking of selling? Or — could that be you at some point?"

If they say "not right now":
You: "Completely fine — most people aren't! I just wanted to introduce myself. Can I leave you my card? If you ever want a quick idea of what your property is worth — no commitment, just information — I'd be happy to come back for a coffee."

[Leave card. Note address and date in your CRM. Follow up in 3 months.]

Key tips:
— Target streets with recent sales (check Idealista for "sold" flags)
— Go Tuesday–Thursday, 10AM–12PM or 5–7PM
— Dress smart-casual — you're a neighbour, not a salesperson
— Never go back to the same door more than 3x in 12 months`,
  },
  {
    id: 'whatsapp-followup',
    title: 'WhatsApp Follow-Up Messages',
    category: 'Closing',
    content: `[Use these templates — always personalise the first line]

--- AFTER FIRST CONTACT ---
"Hi [Name], great connecting today! As promised, I'm sending you a few properties that match what you're looking for. Let me know if any catch your eye 👇 [link]"

--- AFTER A VIEWING ---
"Hi [Name]! Thanks for coming today — it was great showing you [property]. What did you think? Anything stand out for you?"

[Wait for reply before sending more info]

--- NURTURE (weekly, not spammy) ---
"Hi [Name], hope you're well! I just listed a new property in [Zone] that reminded me of what you described. 3 bed / 2 bath / sea views / asking €[X]. Interested in a look? 📸 [photo or link]"

--- PRICE DROP ALERT ---
"[Name] — quick update! The [Zone] property I showed you last month has just dropped to €[new price]. Still available. Worth revisiting? 🏠"

--- CLOSING / URGENCY ---
"[Name], wanted to give you a heads-up — we've had another serious enquiry on [property]. I know you were interested. Do you want me to hold off and confirm your position first?"

--- AFTER SALE / REFERRAL REQUEST ---
"[Name], it was such a pleasure helping you! If you know anyone thinking of buying or selling in the area, I'd love to help them too. A personal recommendation means the world to me 🙏"

Key rules:
— Never send unsolicited bulk messages — personalise every one
— Voice notes build rapport fast — use them after 2–3 text exchanges
— If no reply after 3 messages, pause for 30 days then try again
— Always end with a question or clear next step`,
  },
]

export function TrainingHub({ videos, userId, lastResult }: TrainingHubProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'scripts' | 'howto' | 'exam'>('videos')
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [expandedScript, setExpandedScript] = useState<string | null>(null)
  const [expandedHowTo, setExpandedHowTo] = useState<string | null>(null)

  const dbVideos = videos.filter((v) => v.type === 'video')
  const dbScripts = videos.filter((v) => v.type === 'script')
  const dbHowTos = videos.filter((v) => v.type === 'how_to')

  const filteredVideos = activeCategory === 'All'
    ? dbVideos
    : dbVideos.filter((v) => v.category === activeCategory)

  const tabs = [
    { id: 'videos', label: '🎥 Videos', count: dbVideos.length },
    { id: 'scripts', label: '📝 Scripts', count: SCRIPTS.length + dbScripts.length },
    { id: 'howto', label: '📋 How-To', count: HOW_TOS.length + dbHowTos.length },
    { id: 'exam', label: '🎓 Exam', count: null },
  ] as const

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition ${
              activeTab === tab.id
                ? 'bg-[#C9A84C] text-black'
                : 'text-[#9A9080] hover:text-[#F5F0E8]'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab.id ? 'bg-black/20' : 'bg-white/10'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Videos tab */}
      {activeTab === 'videos' && (
        <div className="space-y-5">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  activeCategory === cat
                    ? 'bg-[#C9A84C] text-black'
                    : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
              <div className="mb-3 text-4xl opacity-30">🎥</div>
              <p className="text-sm font-semibold text-[#9A9080]">No videos yet in this category</p>
              <p className="mt-1 text-xs text-[#9A9080]/60">Admin can add training videos from the back office</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVideos.map((video) => (
                <div key={video.id} className="overflow-hidden rounded-2xl border border-white/8 bg-[#131313]">
                  {video.youtube_url && (
                    <div className="relative aspect-video bg-black">
                      <iframe
                        src={video.youtube_url.replace('watch?v=', 'embed/')}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                        style={{ background: `${CATEGORY_COLORS[video.category] || '#9A9080'}20`, color: CATEGORY_COLORS[video.category] || '#9A9080' }}
                      >
                        {video.category}
                      </span>
                      {video.duration_minutes && (
                        <span className="text-[10px] text-[#9A9080]">{video.duration_minutes} min</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-[#F5F0E8]">{video.title}</h3>
                    {video.description && (
                      <p className="mt-1 text-xs text-[#9A9080] line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scripts tab */}
      {activeTab === 'scripts' && (
        <div className="space-y-3">
          {[...SCRIPTS, ...dbScripts.map((s) => ({ id: s.id, title: s.title, category: s.category, content: s.content || '' }))].map((script) => (
            <div key={script.id} className="overflow-hidden rounded-2xl border border-white/8 bg-[#131313]">
              <button
                className="flex w-full items-center justify-between p-5 text-left"
                onClick={() => setExpandedScript(expandedScript === script.id ? null : script.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{ background: `${CATEGORY_COLORS[script.category] || '#9A9080'}20`, color: CATEGORY_COLORS[script.category] || '#9A9080' }}
                    >
                      {script.category}
                    </span>
                  </div>
                  <h3 className="mt-1 font-semibold text-[#F5F0E8]">{script.title}</h3>
                </div>
                <span className="text-[#9A9080]">{expandedScript === script.id ? '▲' : '▼'}</span>
              </button>
              {expandedScript === script.id && (
                <div className="border-t border-white/8 px-5 pb-5">
                  <pre className="mt-4 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#F5F0E8]/80">{script.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* How-To SOPs tab */}
      {activeTab === 'howto' && (
        <div className="space-y-3">
          {[...HOW_TOS, ...dbHowTos.map((h) => ({
            id: h.id,
            title: h.title,
            emoji: '📋',
            steps: (h.content || '').split('\n').filter(Boolean),
          }))].map((howto) => (
            <div key={howto.id} className="overflow-hidden rounded-2xl border border-white/8 bg-[#131313]">
              <button
                className="flex w-full items-center justify-between p-5 text-left"
                onClick={() => setExpandedHowTo(expandedHowTo === howto.id ? null : howto.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{howto.emoji}</span>
                  <h3 className="font-semibold text-[#F5F0E8]">{howto.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#9A9080]">{howto.steps.length} steps</span>
                  <span className="text-[#9A9080]">{expandedHowTo === howto.id ? '▲' : '▼'}</span>
                </div>
              </button>
              {expandedHowTo === howto.id && (
                <div className="border-t border-white/8 px-5 pb-5">
                  <ol className="mt-4 space-y-3">
                    {howto.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/15 text-xs font-bold text-[#C9A84C]">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-[#F5F0E8]/80 leading-relaxed">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Exam tab */}
      {activeTab === 'exam' && (
        <TrainingExam userId={userId} lastResult={lastResult} />
      )}
    </div>
  )
}
