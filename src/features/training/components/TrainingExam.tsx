'use client'

import { useState } from 'react'

type Category = 'Prospecting' | 'Closing' | 'Legal' | 'Market' | 'Process'

interface Question {
  id: number
  question: string
  options: string[]
  correct: number
  category: Category
}

const QUESTIONS: Question[] = [
  { id: 1, category: 'Prospecting', question: 'What is the first step when meeting a new potential seller?', options: ['Present your marketing plan', 'Build rapport and listen to their needs', 'Discuss commission fees', 'Show comparable properties immediately'], correct: 1 },
  { id: 2, category: 'Closing', question: 'When a buyer says "I need to think about it," you should:', options: ['Give them space and wait for their call', 'Uncover the real objection behind the statement', 'Reduce the price immediately', 'Find a different property'], correct: 1 },
  { id: 3, category: 'Market', question: 'The Costa Blanca Norte region primarily covers which areas?', options: ['Benidorm to Torrevieja', 'Altea, Calpe, Jávea, Moraira, Dénia', 'Valencia to Alicante', 'Only Altea and Benidorm'], correct: 1 },
  { id: 4, category: 'Legal', question: 'IBI (Impuesto sobre Bienes Inmuebles) is:', options: ['A transfer tax paid on purchase', 'An annual property tax paid to the municipality', 'A capital gains tax', 'A notary fee'], correct: 1 },
  { id: 5, category: 'Legal', question: 'What does "IVA" stand for in Spanish property transactions?', options: ['Import Value Assessment', 'Impuesto sobre el Valor Añadido (VAT)', 'Invoice Valuation Amount', 'International Valuation Agreement'], correct: 1 },
  { id: 6, category: 'Legal', question: 'A "nota simple" is:', options: ['A short note from the agent', 'A Land Registry extract showing ownership and charges', 'A building permit document', 'A mortgage document'], correct: 1 },
  { id: 7, category: 'Prospecting', question: 'When prospecting by phone, the ideal opening is:', options: ['Immediately explain why you are calling', 'Ask if they have a moment, introduce yourself, then state the benefit', 'Leave a voicemail only', 'Send an email instead'], correct: 1 },
  { id: 8, category: 'Market', question: 'The typical buyer journey from first contact to closing in luxury coastal Spain is approximately:', options: ['2–4 weeks', '1–3 months', '3–12 months', '2–3 years'], correct: 2 },
  { id: 9, category: 'Legal', question: 'What is the standard transfer tax (ITP) for resale properties in Valencia Community?', options: ['6%', '8%', '10%', '12%'], correct: 2 },
  { id: 10, category: 'Legal', question: 'A "certificado de eficiencia energética" (energy certificate) is required when:', options: ['Only for new builds', 'Selling or renting a property', 'Only when the buyer requests it', 'Only for properties over 500m²'], correct: 1 },
  { id: 11, category: 'Closing', question: 'The best way to handle a price objection is:', options: ['Immediately agree to reduce the price', 'Justify the value with comparable sales and unique features', 'Ignore it and change the subject', 'Blame the market'], correct: 1 },
  { id: 12, category: 'Prospecting', question: 'An exclusive listing agreement typically benefits the seller because:', options: ['Lower commission is charged', 'More focused marketing investment and accountability from one agent', 'The property sells for less', 'No legal commitment is involved'], correct: 1 },
  { id: 13, category: 'Market', question: 'When calculating a 3% commission on a €750,000 property, the gross amount is:', options: ['€7,500', '€15,000', '€22,500', '€30,000'], correct: 2 },
  { id: 14, category: 'Legal', question: 'What is a "poder notarial"?', options: ['A power of attorney', 'A property deed', 'A planning permission', 'A bank guarantee'], correct: 0 },
  { id: 15, category: 'Legal', question: 'The NIE (Número de Identidad de Extranjero) is required by foreigners to:', options: ['Only open a bank account', 'Buy property, pay taxes, and open bank accounts in Spain', 'Get a Spanish driving license only', 'Register at the town hall only'], correct: 1 },
  { id: 16, category: 'Process', question: 'In a viewing, you should ideally arrive:', options: ['Exactly on time', '5–10 minutes early to prepare and be present when clients arrive', '15 minutes late to build anticipation', 'With other buyers to create urgency'], correct: 1 },
  { id: 17, category: 'Legal', question: 'The "escritura de compraventa" is:', options: ['A private purchase contract', 'The public notary deed of sale (title deed)', 'A reservation agreement', 'A rental contract'], correct: 1 },
  { id: 18, category: 'Closing', question: 'When should you ask for the reservation deposit?', options: ['Only after a week of negotiation', 'As soon as both parties agree on price and terms', 'Never — buyers will offer it themselves', 'After the notary appointment is set'], correct: 1 },
  { id: 19, category: 'Process', question: 'A CRM (Customer Relationship Management) system is used to:', options: ['Manage accounting', 'Track leads, clients, and deal pipeline systematically', 'Generate PDFs only', 'Post on social media'], correct: 1 },
  { id: 20, category: 'Legal', question: 'What is "plusvalía municipal"?', options: ['A national property tax', 'A local tax on the increase in land value, paid by the seller', 'An agent commission tax', 'A renovation permit fee'], correct: 1 },
  { id: 21, category: 'Closing', question: 'When following up with a buyer who viewed 2 weeks ago, the best approach is:', options: ['Call and ask "Have you made a decision?"', 'Send new properties matching their criteria + check in on their search progress', 'Wait for them to contact you', 'Reduce the price without asking'], correct: 1 },
  { id: 22, category: 'Prospecting', question: 'In a luxury property market, the most effective lead generation channel is typically:', options: ['Cold door-knocking', 'Referrals from existing clients and professional network', 'Mass email blasts', 'Bus stop advertising'], correct: 1 },
  { id: 23, category: 'Legal', question: 'What does "community fee" (cuota de comunidad) cover in an apartment complex?', options: ['Individual utility bills', 'Maintenance of common areas, pool, elevator, insurance', 'Property taxes', 'Internet and cable TV'], correct: 1 },
  { id: 24, category: 'Closing', question: 'The best time to present a counter-offer to the seller is:', options: ['During a casual WhatsApp message', 'In a face-to-face or video meeting to handle reactions in real time', 'Via email only', 'Through a third party'], correct: 1 },
  { id: 25, category: 'Process', question: 'What percentage minimum score is required to pass the CBI training exam?', options: ['50%', '60%', '70%', '80%'], correct: 2 },
  { id: 26, category: 'Market', question: 'Drone photography is primarily used to showcase:', options: ['Interior room sizes', 'Plot boundaries, sea views, location context, and property surroundings', 'Kitchen equipment', 'Building permits'], correct: 1 },
  { id: 27, category: 'Legal', question: 'A "contrato de arras" is:', options: ['A rental agreement', 'A private preliminary purchase contract with deposit, binding on both parties', 'A mortgage application', 'An architect\'s report'], correct: 1 },
  { id: 28, category: 'Closing', question: 'When a client says "Your fee is too high," the best response is:', options: ['Immediately lower your commission', 'Explain the value of your full service vs. a cheaper alternative', 'Walk away from the deal', 'Blame the agency\'s pricing policy'], correct: 1 },
  { id: 29, category: 'Market', question: 'Which zone is known as the "Golden Mile" of Costa Blanca Norte for luxury villas?', options: ['Benidorm beachfront', 'Moraira / Jávea Cap Martí area', 'Torrevieja salt lakes', 'Alicante city center'], correct: 1 },
  { id: 30, category: 'Process', question: 'The most important quality of a top real estate agent is:', options: ['The largest advertising budget', 'Consistent follow-up, deep market knowledge, and genuine client focus', 'The most listings in any price range', 'Having the nicest car'], correct: 1 },
]

const CATEGORY_COLORS: Record<Category, string> = {
  Prospecting: '#C9A84C',
  Closing: '#2ECC9A',
  Legal: '#8B5CF6',
  Market: '#06B6D4',
  Process: '#F97316',
}

interface TrainingExamProps {
  userId: string
  lastResult: { score: number; passed: boolean; completed_at: string } | null
}

export function TrainingExam({ userId, lastResult }: TrainingExamProps) {
  const [started, setStarted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [finalScore, setFinalScore] = useState<{ score: number; passed: boolean } | null>(null)

  function selectAnswer(questionId: number, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    let correct = 0
    QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correct) correct++
    })
    const score = Math.round((correct / QUESTIONS.length) * 100)
    const passed = score >= 70

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.from('training_results').insert({
        user_id: userId,
        score,
        total_questions: QUESTIONS.length,
        passed,
        answers: answers as Record<string, unknown>,
        completed_at: new Date().toISOString(),
      })
    } catch (_) { /* non-blocking */ }

    setFinalScore({ score, passed })
    setSubmitted(true)
    setSubmitting(false)
  }

  if (!started) {
    return (
      <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-8 text-center" style={{ borderTop: '1px solid #C9A84C' }}>
        <div className="mb-4 text-5xl">🎓</div>
        <h2 className="text-lg font-bold text-[#F5F0E8]">CBI Knowledge Exam</h2>
        <p className="mt-2 text-sm text-[#9A9080]">30 questions · Pass mark: 70% · Real estate + CBI knowledge</p>

        {lastResult && (
          <div className={`mt-5 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${lastResult.passed ? 'bg-[#2ECC9A]/15 text-[#2ECC9A]' : 'bg-red-500/15 text-red-400'}`}>
            {lastResult.passed ? '✅' : '❌'} Last attempt: {lastResult.score}% — {lastResult.passed ? 'PASSED' : 'FAILED'}
            <span className="text-xs font-normal opacity-60">
              {new Date(lastResult.completed_at).toLocaleDateString('en-GB')}
            </span>
          </div>
        )}

        <button
          onClick={() => setStarted(true)}
          className="mt-6 rounded-xl bg-[#C9A84C] px-8 py-3 text-sm font-bold text-black transition hover:bg-[#E8C96A]"
        >
          Start Exam
        </button>
      </div>
    )
  }

  if (submitted && finalScore) {
    const correct = QUESTIONS.filter((q) => answers[q.id] === q.correct).length

    // Desglose por categoría
    const categories: Category[] = ['Prospecting', 'Closing', 'Legal', 'Market', 'Process']
    const breakdown = categories.map((cat) => {
      const catQuestions = QUESTIONS.filter((q) => q.category === cat)
      const catCorrect = catQuestions.filter((q) => answers[q.id] === q.correct).length
      const catTotal = catQuestions.length
      const pct = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0
      return { category: cat, correct: catCorrect, total: catTotal, pct }
    })

    return (
      <div className="space-y-5">
        <div className={`rounded-2xl border p-8 text-center ${finalScore.passed ? 'border-[#2ECC9A]/30 bg-[#2ECC9A]/5' : 'border-red-500/30 bg-red-500/5'}`} style={{ borderTop: finalScore.passed ? '2px solid #2ECC9A' : '2px solid #ef4444' }}>
          <div className="mb-3 text-5xl">{finalScore.passed ? '🏆' : '📚'}</div>
          <h2 className={`text-2xl font-bold ${finalScore.passed ? 'text-[#2ECC9A]' : 'text-red-400'}`}>
            {finalScore.passed ? '¡Enhorabuena! Has aprobado' : 'Todavía no lo tienes'}
          </h2>
          <div className="mt-4 text-5xl font-bold text-[#C9A84C]">{finalScore.score}%</div>
          <p className="mt-2 text-sm text-[#9A9080]">{correct} / {QUESTIONS.length} respuestas correctas</p>
          {!finalScore.passed && (
            <p className="mt-3 text-sm text-[#9A9080]">Necesitas 70% para aprobar. Revisa el material y vuelve a intentarlo.</p>
          )}
          <button
            onClick={() => { setStarted(false); setSubmitted(false); setAnswers({}); setCurrent(0); setFinalScore(null) }}
            className="mt-6 rounded-xl bg-[#C9A84C] px-8 py-3 text-sm font-bold text-black transition hover:bg-[#E8C96A]"
          >
            {finalScore.passed ? 'Hecho' : 'Volver a intentar'}
          </button>
        </div>

        {/* Desglose por sección */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            📊 Resultados por sección
          </p>
          <div className="space-y-3">
            {breakdown.map((b) => {
              const color = CATEGORY_COLORS[b.category]
              const passed = b.pct >= 70
              return (
                <div key={b.category} className="rounded-xl border border-white/8 bg-[#1C1C1C] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-semibold text-[#F5F0E8]">{b.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#9A9080]">
                        {b.correct}/{b.total}
                      </span>
                      <span
                        className="text-lg font-bold"
                        style={{ color: passed ? '#2ECC9A' : b.pct >= 50 ? '#C9A84C' : '#E05555' }}
                      >
                        {b.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${b.pct}%`,
                        background: passed ? '#2ECC9A' : b.pct >= 50 ? color : '#E05555',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-4 text-[11px] text-[#9A9080]/70">
            💡 Las secciones con menos del 70% son tus áreas de mejora — revisa los vídeos y SOPs correspondientes.
          </p>
        </div>

        {/* Review */}
        <div className="space-y-3">
          {QUESTIONS.map((q) => {
            const userAns = answers[q.id]
            const isCorrect = userAns === q.correct
            return (
              <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? 'border-[#2ECC9A]/20 bg-[#2ECC9A]/5' : 'border-red-500/20 bg-red-500/5'}`}>
                <p className="mb-2 text-sm font-semibold text-[#F5F0E8]">
                  {isCorrect ? '✅' : '❌'} {q.id}. {q.question}
                </p>
                {!isCorrect && (
                  <p className="text-xs text-[#2ECC9A]">✓ Correct: {q.options[q.correct]}</p>
                )}
                {!isCorrect && userAns !== undefined && (
                  <p className="text-xs text-red-400">✗ Your answer: {q.options[userAns]}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const q = QUESTIONS[current]
  const progress = Math.round(((current + 1) / QUESTIONS.length) * 100)
  const answered = Object.keys(answers).length

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
        <div className="mb-2 flex items-center justify-between text-xs text-[#9A9080]">
          <span>Question {current + 1} of {QUESTIONS.length}</span>
          <span>{answered} answered</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/10">
          <div className="h-1.5 rounded-full bg-[#C9A84C] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-6" style={{ borderTop: '1px solid #C9A84C' }}>
        <p className="mb-6 text-base font-semibold leading-relaxed text-[#F5F0E8]">
          {q.id}. {q.question}
        </p>
        <div className="space-y-2.5">
          {q.options.map((option, idx) => {
            const selected = answers[q.id] === idx
            return (
              <button
                key={idx}
                onClick={() => selectAnswer(q.id, idx)}
                className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                  selected
                    ? 'border-[#C9A84C]/60 bg-[#C9A84C]/10 text-[#F5F0E8] font-medium'
                    : 'border-white/8 bg-[#1C1C1C] text-[#9A9080] hover:border-white/20 hover:text-[#F5F0E8]'
                }`}
              >
                <span className={`mr-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${selected ? 'border-[#C9A84C] bg-[#C9A84C] text-black' : 'border-white/20'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                {option}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={() => setCurrent((prev) => Math.max(0, prev - 1))}
          disabled={current === 0}
          className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-[#F5F0E8] transition hover:border-white/20 disabled:opacity-30"
        >
          ← Previous
        </button>
        {current < QUESTIONS.length - 1 ? (
          <button
            onClick={() => setCurrent((prev) => prev + 1)}
            className="flex-1 rounded-xl bg-[#C9A84C] py-3 text-sm font-bold text-black transition hover:bg-[#E8C96A]"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || answered < QUESTIONS.length}
            className="flex-1 rounded-xl bg-[#2ECC9A] py-3 text-sm font-bold text-black transition hover:bg-[#3DE0AC] disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : answered < QUESTIONS.length ? `Answer all (${QUESTIONS.length - answered} left)` : '🎓 Submit Exam'}
          </button>
        )}
      </div>

      {/* Quick nav dots */}
      <div className="flex flex-wrap gap-1.5">
        {QUESTIONS.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-6 w-6 rounded text-[10px] font-bold transition ${
              idx === current
                ? 'bg-[#C9A84C] text-black'
                : answers[idx + 1] !== undefined
                ? 'bg-[#2ECC9A]/20 text-[#2ECC9A]'
                : 'bg-white/8 text-[#9A9080] hover:bg-white/12'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
