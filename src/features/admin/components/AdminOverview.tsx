'use client'

import { useState, useTransition } from 'react'
import { updateSaleRevenue } from '@/actions/admin'

interface AgentMetric {
  id: string
  full_name: string | null
  email: string
  revenue: number
  closings: number
}

interface Sale {
  id: string
  agent_id: string
  property_address: string | null
  commission: number | null
  closing_date: string
}

interface AdminOverviewProps {
  agents: AgentMetric[]
  recentSales: Sale[]
  year: number
}

function fmt(n: number) {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n}`
}

const initials = (name: string | null, email: string) => {
  if (name) return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  return email[0].toUpperCase()
}

export function AdminOverview({ agents, recentSales, year }: AdminOverviewProps) {
  const [editingSale, setEditingSale] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [sales, setSales] = useState(recentSales)
  const [isPending, startTransition] = useTransition()

  const totalRevenue = agents.reduce((s, a) => s + a.revenue, 0)
  const totalClosings = agents.reduce((s, a) => s + a.closings, 0)
  const activeAgents = agents.filter((a) => a.revenue > 0).length

  function handleEditSave(saleId: string) {
    const val = parseFloat(editValue)
    if (isNaN(val)) return
    startTransition(async () => {
      await updateSaleRevenue(saleId, val)
      setSales((prev) => prev.map((s) => s.id === saleId ? { ...s, commission: val } : s))
      setEditingSale(null)
    })
  }

  return (
    <div className="space-y-6">
      {/* Team stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#131313] p-4" style={{ borderTop: '2px solid #C9A84C' }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Team Revenue {year}</p>
          <p className="mt-1 text-2xl font-bold text-[#C9A84C]">{fmt(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Total Closings</p>
          <p className="mt-1 text-2xl font-bold text-[#F5F0E8]">{totalClosings}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Active Agents</p>
          <p className="mt-1 text-2xl font-bold text-[#2ECC9A]">{activeAgents}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">Avg per Closing</p>
          <p className="mt-1 text-2xl font-bold text-[#F5F0E8]">
            {totalClosings ? fmt(Math.round(totalRevenue / totalClosings)) : '—'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Agent ranking */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
          <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">🏆 Agent Performance — {year}</p>
          {agents.length === 0 ? (
            <p className="text-sm text-[#9A9080]">No agents with revenue this year.</p>
          ) : (
            <div className="space-y-3">
              {agents.map((agent, idx) => {
                const pct = totalRevenue ? Math.round((agent.revenue / totalRevenue) * 100) : 0
                return (
                  <div key={agent.id} className="flex items-center gap-3">
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-[#9A9080]">{idx + 1}</span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C9A84C]/15 text-xs font-bold text-[#C9A84C]">
                      {initials(agent.full_name, agent.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#F5F0E8] truncate">{agent.full_name || agent.email}</p>
                        <p className="ml-2 shrink-0 text-sm font-bold text-[#C9A84C]">{fmt(agent.revenue)}</p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-white/8">
                          <div className="h-1 rounded-full bg-[#C9A84C]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[#9A9080]">{agent.closings} closings</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent sales — editable by admin/secretary */}
        <div className="rounded-2xl border border-white/8 bg-[#131313] p-5">
          <p className="mb-4 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">✏️ Recent Sales (editable)</p>
          {sales.length === 0 ? (
            <p className="text-sm text-[#9A9080]">No sales logged yet.</p>
          ) : (
            <div className="space-y-2.5">
              {sales.map((sale) => {
                const agent = agents.find((a) => a.id === sale.agent_id)
                return (
                  <div key={sale.id} className="rounded-xl border border-white/8 bg-[#1C1C1C] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#F5F0E8] truncate">{sale.property_address || 'Sin dirección'}</p>
                        <p className="text-[10px] text-[#9A9080]">
                          {agent?.full_name || 'Agente'} · {new Date(sale.closing_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {editingSale === sale.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            className="w-24 rounded border border-[#C9A84C]/40 bg-[#0A0A0A] px-2 py-1 text-xs text-[#F5F0E8] outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleEditSave(sale.id)} disabled={isPending} className="rounded bg-[#C9A84C] px-2 py-1 text-[10px] font-bold text-black">✓</button>
                          <button onClick={() => setEditingSale(null)} className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#9A9080]">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#C9A84C]">
                            {sale.commission ? fmt(sale.commission) : '—'}
                          </span>
                          <button
                            onClick={() => { setEditingSale(sale.id); setEditValue(String(sale.commission ?? '')) }}
                            className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#9A9080] hover:text-[#F5F0E8]"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
