'use client'

import { useState } from 'react'
import type { Roadmap, RoadmapStatus } from '../data/roadmaps'

const STATUS_META: Record<RoadmapStatus, { label: string; dot: string; text: string; ring: string }> = {
  pending_approval: { label: 'Pendiente de aprobación', dot: '#E8C96A', text: '#E8C96A', ring: 'rgba(232,201,106,0.25)' },
  approved: { label: 'Aprobado', dot: '#7FB069', text: '#9CCB86', ring: 'rgba(127,176,105,0.25)' },
  in_progress: { label: 'En construcción', dot: '#C9A84C', text: '#C9A84C', ring: 'rgba(201,168,76,0.3)' },
  done: { label: 'Completado', dot: '#6BA8C9', text: '#8FC2DC', ring: 'rgba(107,168,201,0.25)' },
}

export function RoadmapsView({ roadmaps }: { roadmaps: Roadmap[] }) {
  const [selectedId, setSelectedId] = useState(roadmaps[0]?.id)
  const rm = roadmaps.find((r) => r.id === selectedId) ?? roadmaps[0]

  if (!rm) {
    return (
      <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#131313] p-10 text-center text-[#9A9080]">
        Aún no hay roadmaps. Cuando aprobemos uno, aparecerá aquí.
      </div>
    )
  }

  const status = STATUS_META[rm.status]

  return (
    <div>
      <style>{`
        @keyframes cbiRmUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .cbi-rm-up { opacity: 0; animation: cbiRmUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes cbiRmLine { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>

      {/* ── Selector de roadmaps ── */}
      {roadmaps.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {roadmaps.map((r) => {
            const active = r.id === rm.id
            return (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition ${
                  active
                    ? 'bg-[#C9A84C] text-black'
                    : 'border border-[#C9A84C]/20 text-[#9A9080] hover:text-[#F5F0E8]'
                }`}
              >
                {r.phase} · {r.title}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Hero ── */}
      <header className="cbi-rm-up relative overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#161412] via-[#0F0E0D] to-[#0A0A0A] p-7 sm:p-10">
        {/* halo dorado decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.35), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E8C96A]">
              {rm.phase}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
              style={{ color: status.text, boxShadow: `inset 0 0 0 1px ${status.ring}` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
              {status.label}
            </span>
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F0E8] sm:text-6xl">
            {rm.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#B8AE9C] sm:text-lg">
            {rm.summary}
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <MetaChip label="Tiempo estimado" value={rm.timeline} />
            <MetaChip label="Actualizado" value={rm.updated} />
            <MetaChip label="Pasos" value={`${rm.flow.length}`} />
          </div>
        </div>
      </header>

      {/* ── El recorrido ── */}
      <Section title="El recorrido" caption="Qué sucede, paso a paso" delay={0.08}>
        <ol className="relative ml-1 mt-2 space-y-6 sm:space-y-7">
          {/* spine */}
          <span
            aria-hidden
            className="absolute left-[18px] top-2 bottom-2 w-px origin-top"
            style={{ background: 'linear-gradient(to bottom, #C9A84C, rgba(201,168,76,0.15))', animation: 'cbiRmLine 0.9s ease-out forwards' }}
          />
          {rm.flow.map((step, i) => (
            <li key={i} className="cbi-rm-up relative flex gap-4 sm:gap-5" style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
              <span className="relative z-10 flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[#C9A84C]/40 bg-[#0A0A0A] text-[13px] font-bold text-[#E8C96A] shadow-[0_0_0_4px_rgba(10,10,10,1)]">
                {i + 1}
              </span>
              <div className="pt-1">
                <h3 className="text-[16px] font-semibold text-[#F5F0E8] sm:text-[17px]">{step.title}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-[#9A9080]">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ── Qué ve cada persona ── */}
      <Section title="Qué ve cada persona" caption="Las pantallas de la app" delay={0.1}>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rm.screens.map((s, i) => (
            <ScreenFrame key={i} screen={s} index={i} primary={i === 0} />
          ))}
        </div>
      </Section>

      {/* ── Orden de construcción ── */}
      <Section title="Orden de construcción" caption="En qué orden se levanta" delay={0.12}>
        <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
          {rm.buildOrder.map((item, i) => (
            <div
              key={i}
              className="cbi-rm-up flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#131313] px-4 py-3.5"
              style={{ animationDelay: `${0.15 + i * 0.05}s` }}
            >
              <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#C9A84C]/12 text-[12px] font-bold text-[#C9A84C]">
                {i + 1}
              </span>
              <span className="text-[14px] leading-snug text-[#D0C8B8]">{item}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Expectativas / Ahora no ── */}
      <Section title="Lo que esperamos" caption="Y lo que dejamos para después" delay={0.14}>
        <div className="mt-2 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#7FB069]/20 bg-[#7FB069]/[0.04] p-5">
            <h4 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#9CCB86]">Qué esperamos</h4>
            <ul className="space-y-2.5">
              {rm.expectations.map((e, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#D0C8B8]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CCB86" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-none">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {e}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0F0E0D] p-5">
            <h4 className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-[#9A9080]">Ahora no</h4>
            <ul className="space-y-2.5">
              {rm.outOfScope.map((e, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#8A8170]">
                  <span className="mt-2 h-px w-3 flex-none bg-[#5A5345]" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </div>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-[#7A7263]">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  )
}

function Section({
  title,
  caption,
  delay,
  children,
}: {
  title: string
  caption: string
  delay: number
  children: React.ReactNode
}) {
  return (
    <section className="cbi-rm-up mt-10 sm:mt-12" style={{ animationDelay: `${delay}s` }}>
      <div className="mb-1 flex items-baseline gap-3">
        <h2 className="text-[22px] font-bold tracking-tight text-[#F5F0E8] sm:text-[26px]">{title}</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-[#C9A84C]/30 to-transparent" />
      </div>
      <p className="text-[13px] text-[#7A7263]">{caption}</p>
      {children}
    </section>
  )
}

function ScreenFrame({ screen, index, primary }: { screen: { who: string; badge: string; lines: string[]; action?: string }; index: number; primary: boolean }) {
  return (
    <div
      className="cbi-rm-up overflow-hidden rounded-2xl border border-[#C9A84C]/15 bg-[#0C0B0A]"
      style={{ animationDelay: `${0.18 + index * 0.1}s` }}
    >
      {/* barra superior del "dispositivo" */}
      <div className="flex items-center gap-1.5 border-b border-white/[0.05] bg-[#131313] px-4 py-2.5">
        <span className="h-2 w-2 rounded-full bg-[#3A352C]" />
        <span className="h-2 w-2 rounded-full bg-[#3A352C]" />
        <span className="h-2 w-2 rounded-full bg-[#3A352C]" />
        <span className="ml-auto rounded-full bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A84C]">
          {screen.badge}
        </span>
      </div>

      <div className="p-5">
        <h3 className="text-[17px] font-bold text-[#F5F0E8]">{screen.who}</h3>
        <ul className="mt-4 space-y-2.5">
          {screen.lines.map((line, i) => (
            <li key={i} className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-3 py-2.5 text-[13px] text-[#C0B8A8]">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#C9A84C]/60" />
              {line}
            </li>
          ))}
        </ul>
        {screen.action && (
          <div
            className={`mt-4 rounded-xl px-4 py-3 text-center text-[14px] font-semibold ${
              primary
                ? 'bg-[#C9A84C] text-black shadow-[0_4px_20px_rgba(201,168,76,0.25)]'
                : 'border border-[#C9A84C]/30 text-[#E8C96A]'
            }`}
          >
            {screen.action}
          </div>
        )}
      </div>
    </div>
  )
}
