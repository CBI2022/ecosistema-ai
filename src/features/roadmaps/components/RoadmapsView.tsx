'use client'

import { useState } from 'react'
import type { Roadmap, RoadmapStatus, ScreenKind } from '../data/roadmaps'
import { ShareButton } from './ShareButton'

const STATUS_META: Record<RoadmapStatus, { label: string; dot: string; text: string; ring: string }> = {
  pending_approval: { label: 'Pendiente de aprobación', dot: '#E8C96A', text: '#E8C96A', ring: 'rgba(232,201,106,0.25)' },
  approved: { label: 'Aprobado', dot: '#7FB069', text: '#9CCB86', ring: 'rgba(127,176,105,0.25)' },
  in_progress: { label: 'En construcción', dot: '#C9A84C', text: '#C9A84C', ring: 'rgba(201,168,76,0.3)' },
  done: { label: 'Completado', dot: '#6BA8C9', text: '#8FC2DC', ring: 'rgba(107,168,201,0.25)' },
}

export function RoadmapsView({ roadmaps }: { roadmaps: Roadmap[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const rm = selectedId ? roadmaps.find((r) => r.id === selectedId) : null

  return (
    <div>
      <style>{`
        @keyframes cbiRmUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .cbi-rm-up { opacity: 0; animation: cbiRmUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
        @keyframes cbiRmLine { from { transform: scaleY(0); } to { transform: scaleY(1); } }
      `}</style>

      {rm ? (
        <RoadmapDetail rm={rm} onBack={() => setSelectedId(null)} />
      ) : (
        <RoadmapIndex roadmaps={roadmaps} onOpen={setSelectedId} />
      )}
    </div>
  )
}

/* ─────────────────────────────  ÍNDICE (fichas)  ───────────────────────────── */

function RoadmapIndex({ roadmaps, onOpen }: { roadmaps: Roadmap[]; onOpen: (id: string) => void }) {
  if (roadmaps.length === 0) {
    return (
      <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#131313] p-10 text-center text-[#9A9080]">
        Aún no hay roadmaps. Cuando aprobemos uno, aparecerá aquí.
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {roadmaps.map((r, i) => {
        const status = STATUS_META[r.status]
        return (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(r.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpen(r.id)
              }
            }}
            className="cbi-rm-up group relative cursor-pointer overflow-hidden rounded-2xl border border-[#C9A84C]/15 bg-gradient-to-br from-[#161412] to-[#0B0A09] p-6 text-left transition hover:border-[#C9A84C]/45 hover:shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
            style={{ animationDelay: `${i * 0.07}s` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-60"
              style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.35), transparent 70%)' }}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E8C96A]">
                  {r.phase}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{ color: status.text, boxShadow: `inset 0 0 0 1px ${status.ring}` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                  {status.label}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-bold tracking-tight text-[#F5F0E8]">{r.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#9A9080]">{r.summary}</p>
              <div className="mt-3 text-[11px] text-[#7A7263]">{r.testWindow}</div>

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <ShareButton path={`/r/${r.id}`} />
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#C9A84C] transition group-hover:gap-2.5">
                  Ver roadmap
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────  DETALLE  ───────────────────────────── */

export function RoadmapDetail({ rm, onBack }: { rm: Roadmap; onBack?: () => void }) {
  const status = STATUS_META[rm.status]

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9A9080] transition hover:text-[#F5F0E8]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Todos los RoadMaps
        </button>
      )}

      {/* Hero */}
      <header className="cbi-rm-up relative overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#161412] via-[#0F0E0D] to-[#0A0A0A] p-7 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.35), transparent 70%)' }}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
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
            <div className="sm:ml-auto">
              <ShareButton path={`/r/${rm.id}`} variant="solid" label="Compartir enlace" />
            </div>
          </div>

          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight text-[#F5F0E8] sm:text-6xl">
            {rm.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[#B8AE9C] sm:text-lg">{rm.summary}</p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <MetaChip label="Inicio" value={rm.startDate} />
            <MetaChip label="Prueba" value={rm.testWindow} />
            <MetaChip label="Objetivo" value={rm.targetDate} />
          </div>
        </div>
      </header>

      {/* El recorrido */}
      <Section title="El recorrido" caption="Qué sucede, paso a paso" delay={0.08}>
        <ol className="relative ml-1 mt-2 space-y-6 sm:space-y-7">
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

      {/* Qué ve cada persona (teléfonos) */}
      <Section title="Qué ve cada persona" caption="Las pantallas, desde el teléfono" delay={0.1}>
        <div className="mt-3 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {rm.screens.map((s, i) => (
            <figure key={i} className="cbi-rm-up flex flex-col items-center" style={{ animationDelay: `${0.18 + i * 0.1}s` }}>
              <PhoneFrame kind={s.kind} badge={s.badge} />
              <figcaption className="mt-4 text-center">
                <div className="text-[15px] font-bold text-[#F5F0E8]">{s.who}</div>
                <p className="mx-auto mt-1 max-w-[230px] text-[12px] leading-relaxed text-[#8A8170]">{s.note}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] italic text-[#5A5345]">
          Vista de teléfono — se sustituye por la captura real a medida que se construye cada pantalla.
        </p>
      </Section>

      {/* Orden de construcción */}
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

      {/* Lo que esperamos */}
      <Section title="Lo que esperamos" caption="Cómo sabemos que está hecho" delay={0.14}>
        <div className="mt-2 rounded-2xl border border-[#7FB069]/20 bg-[#7FB069]/[0.04] p-5 sm:p-6">
          <ul className="space-y-3">
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
      </Section>
    </div>
  )
}

/* ─────────────────────────────  HELPERS  ───────────────────────────── */

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

/* ─────────────────────────────  TELÉFONO  ───────────────────────────── */

function PhoneFrame({ kind, badge }: { kind: ScreenKind; badge: string }) {
  return (
    <div className="w-full max-w-[228px]">
      <div className="relative rounded-[2.2rem] border border-[#C9A84C]/25 bg-[#0C0B0A] p-2 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.7rem] bg-[#0A0A0A]">
          {/* notch */}
          <div className="absolute left-1/2 top-0 z-20 h-4 w-[42%] -translate-x-1/2 rounded-b-2xl bg-[#0C0B0A]" />
          {/* status bar */}
          <div className="flex items-center justify-between px-4 pt-1.5 text-[8px] font-semibold text-[#9A9080]">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-3 rounded-[2px] border border-[#9A9080]/60" />
            </span>
          </div>
          <div className="px-3 pb-3 pt-2">
            {kind === 'agent-form' && <AgentFormScreen />}
            {kind === 'office-inbox' && <OfficeInboxScreen />}
            {kind === 'admin-home' && <AdminHomeScreen />}
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <span className="rounded-full bg-[#C9A84C]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A84C]">
          {badge}
        </span>
      </div>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[7px] uppercase tracking-wide text-[#6E665A]">{label}</div>
      <div className="mt-0.5 text-[9px] font-medium text-[#D0C8B8]">{value || '—'}</div>
    </div>
  )
}

function AgentFormScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">CBI</span>
      </div>
      <div className="text-[12px] font-bold text-[#F5F0E8]">Subir propiedad</div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <FieldRow label="Referencia" value="A-046" />
        <FieldRow label="Tipo" value="Villa" />
        <FieldRow label="Precio" value="€ 850.000" />
        <FieldRow label="Zona" value="Altea" />
        <FieldRow label="Dormitorios" value="4" />
        <FieldRow label="Baños" value="3" />
      </div>
      <div className="mt-1.5">
        <FieldRow label="Ubicación" value="Carrer del Mar, 12" />
      </div>
      <div className="mt-auto pt-3">
        <div className="rounded-lg bg-[#C9A84C] py-2 text-center text-[10px] font-bold text-black shadow-[0_4px_14px_rgba(201,168,76,0.3)]">
          Enviar propiedad
        </div>
      </div>
    </div>
  )
}

function InboxRow({ ref_, agent, done }: { ref_: string; agent: string; done?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      <div className="flex h-6 w-6 flex-none items-center justify-center rounded bg-[#C9A84C]/12 text-[8px] font-bold text-[#C9A84C]">
        {ref_.slice(0, 3)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[9px] font-semibold text-[#E8E2D6]">{ref_}</div>
        <div className="truncate text-[7.5px] text-[#8A8170]">{agent}</div>
      </div>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[6.5px] font-bold uppercase ${
          done ? 'bg-[#7FB069]/15 text-[#9CCB86]' : 'bg-[#E8C96A]/15 text-[#E8C96A]'
        }`}
      >
        {done ? 'Subida' : 'Pendiente'}
      </span>
    </div>
  )
}

function OfficeInboxScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-[#F5F0E8]">Propiedades</span>
        <span className="rounded-full bg-[#C9A84C]/15 px-1.5 py-0.5 text-[8px] font-bold text-[#C9A84C]">8</span>
      </div>
      <div className="mt-0.5 text-[8px] text-[#8A8170]">Recibidas de los agentes</div>
      <div className="mt-2 flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[8px] text-[#6E665A]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-2.5 w-2.5">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Buscar…
      </div>
      <div className="mt-2 space-y-1.5">
        <InboxRow ref_="A-046" agent="María García" />
        <InboxRow ref_="C-012" agent="Juan Pérez" done />
        <InboxRow ref_="M-031" agent="Laura Ruiz" />
        <InboxRow ref_="AL-008" agent="David Soler" done />
        <InboxRow ref_="J-119" agent="Ana Martín" />
      </div>
    </div>
  )
}

function AdminHomeScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex gap-1.5">
        <span className="flex-1 rounded-md bg-[#C9A84C] py-1 text-center text-[8px] font-bold text-black">Admin ▾</span>
        <span className="flex-1 rounded-md border border-[#C9A84C]/35 py-1 text-center text-[8px] font-semibold text-[#E8C96A]">
          Opciones antiguas ▾
        </span>
      </div>
      <div className="text-[12px] font-bold text-[#F5F0E8]">Subir propiedad</div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <FieldRow label="Referencia" value="A-047" />
        <FieldRow label="Tipo" value="Ático" />
        <FieldRow label="Precio" value="€ 620.000" />
        <FieldRow label="Zona" value="Calpe" />
      </div>
      <div className="mt-1.5">
        <FieldRow label="Ubicación" value="Av. Europa, 8" />
      </div>
      <div className="mt-auto pt-3">
        <div className="rounded-lg bg-[#C9A84C] py-2 text-center text-[10px] font-bold text-black shadow-[0_4px_14px_rgba(201,168,76,0.3)]">
          Enviar propiedad
        </div>
      </div>
    </div>
  )
}
