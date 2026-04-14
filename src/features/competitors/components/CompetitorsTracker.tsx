'use client'

import { useState, useTransition } from 'react'
import { addCompetitor, updateCompetitor, deleteCompetitor } from '@/actions/competitors'

const ZONES = ['Dénia', 'Jávea', 'Moraira', 'Benissa', 'Calpe', 'Altea', 'Albir', 'Alfaz del Pi', 'La Nucia', 'Polop', 'Finestrat', 'Benidorm']

interface Competitor {
  id: string
  type: 'agency' | 'agent'
  name: string
  agency_name: string | null
  zone: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  website: string | null
  notes: string | null
  created_at: string
}

interface CompetitorsTrackerProps {
  competitors: Competitor[]
}

const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

function CompetitorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Competitor
  onSave: (fd: FormData) => void
  onCancel: () => void
}) {
  const [type, setType] = useState<'agency' | 'agent'>(initial?.type || 'agency')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave(new FormData(e.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-[#C9A84C]/20 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
        {initial ? '✏️ Edit Competitor' : '➕ Add Competitor'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelClass}>Type</label>
          <select
            name="type"
            className={inputClass}
            value={type}
            onChange={(e) => setType(e.target.value as 'agency' | 'agent')}
          >
            <option value="agency">Agency</option>
            <option value="agent">Individual Agent</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{type === 'agent' ? 'Agent Name' : 'Agency Name'}</label>
          <input type="text" name="name" className={inputClass} defaultValue={initial?.name} required placeholder={type === 'agent' ? 'Juan García' : 'RE/MAX Altea'} />
        </div>
        {type === 'agent' && (
          <div>
            <label className={labelClass}>Agency (employer)</label>
            <input type="text" name="agency_name" className={inputClass} defaultValue={initial?.agency_name || ''} placeholder="Engel & Völkers" />
          </div>
        )}
        {type === 'agency' && <input type="hidden" name="agency_name" value="" />}
        <div>
          <label className={labelClass}>Zone</label>
          <select name="zone" className={inputClass} defaultValue={initial?.zone || ZONES[0]}>
            {ZONES.map((z) => <option key={z}>{z}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input type="text" name="phone" className={inputClass} defaultValue={initial?.phone || ''} placeholder="+34 600 000 000" />
        </div>
        <div>
          <label className={labelClass}>WhatsApp</label>
          <input type="text" name="whatsapp" className={inputClass} defaultValue={initial?.whatsapp || ''} placeholder="+34 600 000 000" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input type="email" name="email" className={inputClass} defaultValue={initial?.email || ''} placeholder="agent@agency.com" />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input type="text" name="website" className={inputClass} defaultValue={initial?.website || ''} placeholder="www.agency.com" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Notes</label>
          <input type="text" name="notes" className={inputClass} defaultValue={initial?.notes || ''} placeholder="Strong in Moraira waterfront, aggressive pricing..." />
        </div>
      </div>

      <div className="flex gap-3">
        <button type="submit" className="flex-1 rounded-xl bg-[#C9A84C] py-2.5 text-sm font-bold text-black hover:bg-[#E8C96A]">
          {initial ? 'Save Changes' : 'Add Competitor'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-bold text-[#9A9080] hover:text-[#F5F0E8]">
          Cancel
        </button>
      </div>
    </form>
  )
}

export function CompetitorsTracker({ competitors: initial }: CompetitorsTrackerProps) {
  const [competitors, setCompetitors] = useState(initial)
  const [activeZone, setActiveZone] = useState<string>('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const zones = ['All', ...ZONES]
  const filtered = activeZone === 'All' ? competitors : competitors.filter((c) => c.zone === activeZone)

  const zoneCount = (z: string) => competitors.filter((c) => c.zone === z).length

  async function handleAdd(fd: FormData) {
    startTransition(async () => {
      const res = await addCompetitor(fd)
      if (!res?.error) setShowForm(false)
    })
  }

  async function handleUpdate(id: string, fd: FormData) {
    startTransition(async () => {
      const res = await updateCompetitor(id, fd)
      if (!res?.error) setEditingId(null)
    })
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this competitor?')) return
    startTransition(async () => {
      await deleteCompetitor(id)
      setCompetitors((prev) => prev.filter((c) => c.id !== id))
    })
  }

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Total</p>
          <p className="mt-1 text-2xl font-bold text-[#F5F0E8]">{competitors.length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Agencies</p>
          <p className="mt-1 text-2xl font-bold text-[#C9A84C]">{competitors.filter((c) => c.type === 'agency').length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Agents</p>
          <p className="mt-1 text-2xl font-bold text-[#2ECC9A]">{competitors.filter((c) => c.type === 'agent').length}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Zones covered</p>
          <p className="mt-1 text-2xl font-bold text-[#8B7CF6]">{new Set(competitors.map((c) => c.zone)).size}</p>
        </div>
      </div>

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-[#C9A84C]/30 bg-[#131313] py-3.5 text-sm font-bold text-[#C9A84C] transition hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5"
        >
          ➕ Add Competitor
        </button>
      )}

      {showForm && (
        <CompetitorForm onSave={handleAdd} onCancel={() => setShowForm(false)} />
      )}

      {/* Zone tabs */}
      <div className="flex flex-wrap gap-1.5">
        {zones.map((z) => (
          <button
            key={z}
            onClick={() => setActiveZone(z)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              activeZone === z
                ? 'bg-[#C9A84C] text-black'
                : 'border border-white/10 text-[#9A9080] hover:text-[#F5F0E8]'
            }`}
          >
            {z}
            {z !== 'All' && zoneCount(z) > 0 && (
              <span className="ml-1 opacity-60">({zoneCount(z)})</span>
            )}
          </button>
        ))}
      </div>

      {/* Competitors list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-10 text-center">
          <p className="text-sm text-[#9A9080]">No competitors tracked in {activeZone === 'All' ? 'any zone' : activeZone}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comp) => (
            editingId === comp.id ? (
              <CompetitorForm
                key={comp.id}
                initial={comp}
                onSave={(fd) => handleUpdate(comp.id, fd)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div key={comp.id} className="rounded-2xl border border-white/8 bg-[#131313] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${comp.type === 'agency' ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'bg-[#2ECC9A]/15 text-[#2ECC9A]'}`}>
                        {comp.type}
                      </span>
                      <span className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">
                        {comp.zone}
                      </span>
                    </div>
                    <h3 className="mt-1 font-semibold text-[#F5F0E8]">{comp.name}</h3>
                    {comp.agency_name && (
                      <p className="text-xs text-[#9A9080]">{comp.agency_name}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#9A9080]">
                      {comp.phone && (
                        <a href={`tel:${comp.phone}`} className="flex items-center gap-1 hover:text-[#F5F0E8]">
                          📞 {comp.phone}
                        </a>
                      )}
                      {comp.whatsapp && (
                        <a
                          href={`https://wa.me/${comp.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#2ECC9A] hover:opacity-80"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                      {comp.email && (
                        <a href={`mailto:${comp.email}`} className="hover:text-[#F5F0E8]">
                          ✉️ {comp.email}
                        </a>
                      )}
                      {comp.website && (
                        <a href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F0E8]">
                          🌐 {comp.website}
                        </a>
                      )}
                    </div>
                    {comp.notes && (
                      <p className="mt-2 text-xs text-[#9A9080] italic">{comp.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditingId(comp.id)}
                      className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(comp.id)}
                      disabled={isPending}
                      className="rounded-lg border border-red-500/20 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-500/40"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}
