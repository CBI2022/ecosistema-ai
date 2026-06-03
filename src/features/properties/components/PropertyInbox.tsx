'use client'

import { useMemo, useState, useTransition } from 'react'
import type { Property } from '@/types/database'
import { setPropertyReviewStatus } from '@/actions/properties'

export type InboxItem = Property & { agentName: string }

type Filter = 'pending' | 'published' | 'all'

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return '—'
  }
}

function fmtPrice(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return `€ ${n.toLocaleString('es-ES')}`
}

export function PropertyInbox({ items }: { items: InboxItem[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('pending')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [list, setList] = useState<InboxItem[]>(items)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((p) => {
      if (filter === 'pending' && p.review_status !== 'submitted') return false
      if (filter === 'published' && p.review_status !== 'published') return false
      if (!q) return true
      return (
        (p.reference || '').toLowerCase().includes(q) ||
        (p.agentName || '').toLowerCase().includes(q) ||
        (p.zone || '').toLowerCase().includes(q) ||
        (p.title || p.title_headline || '').toLowerCase().includes(q)
      )
    })
  }, [list, query, filter])

  const selected = list.find((p) => p.id === selectedId) || null
  const counts = useMemo(
    () => ({
      pending: list.filter((p) => p.review_status === 'submitted').length,
      published: list.filter((p) => p.review_status === 'published').length,
    }),
    [list]
  )

  function updateLocal(id: string, status: 'submitted' | 'published') {
    setList((prev) => prev.map((p) => (p.id === id ? { ...p, review_status: status } : p)))
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      {/* ─── LISTA ─── */}
      <div className={selected ? 'hidden lg:block' : 'block'}>
        <div className="mb-3 flex gap-1.5">
          <FilterPill label={`Pendientes`} count={counts.pending} active={filter === 'pending'} onClick={() => setFilter('pending')} />
          <FilterPill label={`Subidas`} count={counts.published} active={filter === 'published'} onClick={() => setFilter('published')} />
          <FilterPill label={`Todas`} count={list.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        </div>

        <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#131313] px-3 py-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#6E665A" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por referencia, agente, zona…"
            className="w-full bg-transparent text-[13px] text-[#F5F0E8] placeholder:text-[#6E665A] focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-[#131313] p-8 text-center text-[13px] text-[#7A7263]">
              No hay propiedades aquí.
            </div>
          )}
          {filtered.map((p) => {
            const isSel = p.id === selectedId
            const done = p.review_status === 'published'
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  isSel
                    ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.07]'
                    : 'border-white/[0.06] bg-[#131313] hover:border-[#C9A84C]/25'
                }`}
              >
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-[#C9A84C]/12 text-[11px] font-bold text-[#C9A84C]">
                  {(p.reference || '??').slice(0, 4)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-[#F5F0E8]">{p.reference || 'Sin ref.'}</span>
                    <span className="truncate text-[12px] text-[#9A9080]">· {p.zone || '—'}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-[#8A8170]">{p.agentName}</div>
                </div>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    done ? 'bg-[#7FB069]/15 text-[#9CCB86]' : 'bg-[#E8C96A]/15 text-[#E8C96A]'
                  }`}
                >
                  {done ? 'Subida' : 'Pendiente'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── DETALLE ─── */}
      <div className={selected ? 'block' : 'hidden lg:block'}>
        {selected ? (
          <PropertyDetail key={selected.id} p={selected} onBack={() => setSelectedId(null)} onStatus={updateLocal} />
        ) : (
          <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] text-[13px] text-[#6E665A]">
            Selecciona una propiedad para ver sus datos.
          </div>
        )}
      </div>
    </div>
  )
}

function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
        active ? 'bg-[#C9A84C] text-black' : 'border border-white/[0.08] text-[#9A9080] hover:text-[#F5F0E8]'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-black/20' : 'bg-white/[0.06]'}`}>{count}</span>
    </button>
  )
}

/* ───────────────────────── DETALLE COPIABLE ───────────────────────── */

function PropertyDetail({
  p,
  onBack,
  onStatus,
}: {
  p: InboxItem
  onBack: () => void
  onStatus: (id: string, status: 'submitted' | 'published') => void
}) {
  const [isPending, startTransition] = useTransition()
  const done = p.review_status === 'published'

  function toggle() {
    const next = done ? 'submitted' : 'published'
    onStatus(p.id, next)
    startTransition(async () => {
      await setPropertyReviewStatus(p.id, next)
    })
  }

  const features: string[] = []
  const F: [boolean | null, string][] = [
    [p.has_pool, 'Piscina'], [p.has_garage, 'Garaje'], [p.has_garden, 'Jardín'],
    [p.has_terrace, 'Terraza'], [p.has_ac, 'Aire acondicionado'], [p.has_sea_view, 'Vistas al mar'],
    [p.has_fireplace, 'Chimenea'], [p.has_elevator, 'Ascensor'], [p.has_jacuzzi, 'Jacuzzi'],
    [p.has_alarm, 'Alarma'], [p.has_storage, 'Trastero'],
  ]
  for (const [v, label] of F) if (v) features.push(label)

  const mainText = [
    `Referencia: ${p.reference || '—'}`,
    `Tipo: ${p.property_type || '—'}`,
    `Operación: ${p.listing_type === 'sale' ? 'Venta' : 'Alquiler'}`,
    `Precio: ${fmtPrice(p.price)}`,
    `Dormitorios: ${p.bedrooms ?? '—'}`,
    `Baños: ${p.bathrooms ?? '—'}`,
    `m² construidos: ${p.build_area_m2 ?? '—'}`,
    `m² parcela: ${p.plot_area_m2 ?? '—'}`,
    `Año: ${p.year_built ?? '—'}`,
  ].join('\n')

  const locationText = [
    `Zona: ${p.zone || '—'}`,
    `Población: ${p.city || p.location || '—'}`,
    `Calle: ${p.street_name || '—'} ${p.street_number || ''}`.trim(),
    `Código postal: ${p.postal_code || '—'}`,
  ].join('\n')

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#131313]">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] p-4 sm:p-5">
        <button onClick={onBack} className="lg:hidden inline-flex items-center gap-1 text-[13px] text-[#9A9080] hover:text-[#F5F0E8]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#F5F0E8]">{p.reference || 'Sin referencia'}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                done ? 'bg-[#7FB069]/15 text-[#9CCB86]' : 'bg-[#E8C96A]/15 text-[#E8C96A]'
              }`}
            >
              {done ? 'Subida' : 'Pendiente'}
            </span>
          </div>
          <p className="mt-0.5 text-[12px] text-[#8A8170]">
            Subida por <span className="text-[#C9A84C]">{p.agentName}</span> · {fmtDate(p.submitted_at)}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={isPending}
          className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition disabled:opacity-50 ${
            done
              ? 'border border-white/[0.12] text-[#D0C8B8] hover:bg-white/5'
              : 'bg-[#C9A84C] text-black hover:bg-[#E8C96A]'
          }`}
        >
          {done ? 'Volver a pendiente' : 'Marcar como subida'}
        </button>
      </div>

      {/* Bloques copiables */}
      <div className="space-y-4 p-4 sm:p-5">
        <Block title="Datos principales" copyText={mainText}>
          <Grid>
            <Field label="Tipo" value={p.property_type} />
            <Field label="Operación" value={p.listing_type === 'sale' ? 'Venta' : 'Alquiler'} />
            <Field label="Precio" value={fmtPrice(p.price)} />
            <Field label="Dormitorios" value={p.bedrooms} />
            <Field label="Baños" value={p.bathrooms} />
            <Field label="Aseos" value={p.toilets} />
            <Field label="m² construidos" value={p.build_area_m2} />
            <Field label="m² parcela" value={p.plot_area_m2} />
            <Field label="Año construcción" value={p.year_built} />
          </Grid>
        </Block>

        <Block title="Ubicación" copyText={locationText}>
          <Grid>
            <Field label="Zona" value={p.zone} />
            <Field label="Población" value={p.city || p.location} />
            <Field label="Calle" value={`${p.street_name || ''} ${p.street_number || ''}`.trim()} />
            <Field label="Código postal" value={p.postal_code} />
          </Grid>
        </Block>

        {features.length > 0 && (
          <Block title="Características" copyText={features.join(', ')}>
            <div className="flex flex-wrap gap-1.5">
              {features.map((f) => (
                <span key={f} className="rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/[0.06] px-2.5 py-1 text-[12px] text-[#D0C8B8]">
                  {f}
                </span>
              ))}
            </div>
          </Block>
        )}

        {(p.title_es || p.title_en) && (
          <Block title="Título" copyText={p.title_es || p.title_en || ''}>
            <p className="text-[13px] leading-relaxed text-[#D0C8B8]">{p.title_es || p.title_en}</p>
          </Block>
        )}

        {(p.description_es || p.description_en) && (
          <Block title="Descripción (ES)" copyText={p.description_es || ''}>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#D0C8B8]">
              {p.description_es || p.description_en}
            </p>
          </Block>
        )}

        {p.description_en && (
          <Block title="Descripción (EN)" copyText={p.description_en}>
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#D0C8B8]">{p.description_en}</p>
          </Block>
        )}
      </div>
    </div>
  )
}

function Block({ title, copyText, children }: { title: string; copyText: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = copyText
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* noop */ }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0F0E0D] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#9A9080]">{title}</h3>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/10"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copiado
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">{children}</div>
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  const display = value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="rounded-lg bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-[#6E665A]">{label}</div>
      <div className="mt-0.5 text-[13px] font-medium text-[#E8E2D6]">{display}</div>
    </div>
  )
}
