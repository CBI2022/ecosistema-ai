'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { logSale, deleteSale, updateSale } from '@/actions/sales'
import { updateAnnualGoal } from '@/actions/goals'

interface MonthData {
  month: string
  revenue: number
  closings: number
}

interface Sale {
  id: string
  agent_id: string
  property_address: string | null
  sale_price: number
  commission: number | null
  closing_date: string
  notes: string | null
  created_at: string
}

interface RevenueChartProps {
  data: MonthData[]
  annualGoal: number
  currentMonth: number
  sales?: Sale[]
  canEdit?: boolean
}

function buildChartData(data: MonthData[], currentMonth: number) {
  let cumulative = 0
  return data.map((d, i) => {
    if (i < currentMonth) cumulative += d.revenue
    return {
      ...d,
      cumulative: i < currentMonth ? cumulative : null,
    }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#C9A84C]/20 bg-[#161616] px-4 py-3 text-xs shadow-xl">
      <p className="mb-2 font-bold text-[#C9A84C]">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="mb-0.5">
          {p.name}: €{p.value?.toLocaleString() ?? 0}
        </p>
      ))}
    </div>
  )
}

export function RevenueChart({
  data,
  annualGoal: initialGoal,
  currentMonth,
  sales = [],
  canEdit = true,
}: RevenueChartProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  // Annual goal editable
  const [annualGoal, setAnnualGoal] = useState(initialGoal)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(initialGoal || ''))
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

  async function handleSaveGoal() {
    setGoalError(null)
    const n = Number(goalDraft.replace(/[^0-9.]/g, ''))
    if (isNaN(n) || n < 0) {
      setGoalError('Introduce un número válido (ej: 150000)')
      return
    }
    if (n === 0) {
      setGoalError('El objetivo debe ser mayor que 0')
      return
    }
    setGoalSaving(true)
    try {
      const res = await updateAnnualGoal(n)
      setGoalSaving(false)
      if (res?.error) {
        setGoalError(res.error)
        return
      }
      setAnnualGoal(n)
      setEditingGoal(false)
      setGoalDraft(String(n))
    } catch (err) {
      setGoalSaving(false)
      setGoalError((err as Error)?.message || 'Error al guardar')
    }
  }

  const chartData = buildChartData(data, currentMonth)
  const monthlyGoalLine = annualGoal / 12

  // Tracking calculation
  const ytdRevenue = data.slice(0, currentMonth).reduce((sum, m) => sum + m.revenue, 0)
  const expectedByNow = monthlyGoalLine * currentMonth
  const deviation = ytdRevenue - expectedByNow
  const onPace = deviation >= 0
  const remaining = Math.max(0, annualGoal - ytdRevenue)
  const monthsLeft = 12 - currentMonth
  const requiredPerMonth = monthsLeft > 0 ? remaining / monthsLeft : 0
  const pctAchieved = annualGoal > 0 ? (ytdRevenue / annualGoal) * 100 : 0

  function fmtEur(n: number) {
    if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `€${(n / 1_000).toFixed(1)}K`
    return `€${Math.round(n)}`
  }

  function handleLog() {
    if (!amount || isNaN(Number(amount))) {
      setError('Introduce un importe válido')
      return
    }
    setError(null)
    const fd = new FormData()
    fd.append('property_address', address)
    fd.append('commission', amount)
    fd.append('sale_price', amount)
    fd.append('closing_date', date)

    startTransition(async () => {
      const res = await logSale(fd)
      if (res?.error) {
        setError(res.error)
      } else {
        setAddress('')
        setAmount('')
        setDate(new Date().toISOString().split('T')[0])
        router.refresh()
      }
    })
  }

  // Sales list — editar/eliminar
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState({ address: '', commission: '', date: '' })
  const [saleError, setSaleError] = useState<string | null>(null)

  function beginEdit(sale: Sale) {
    setEditingSaleId(sale.id)
    setEditDraft({
      address: sale.property_address || '',
      commission: String(sale.commission ?? sale.sale_price ?? ''),
      date: sale.closing_date,
    })
    setSaleError(null)
  }

  async function handleSaveEdit() {
    if (!editingSaleId) return
    const commission = Number(editDraft.commission)
    if (isNaN(commission) || commission <= 0) {
      setSaleError('Importe inválido')
      return
    }
    setSaleError(null)
    startTransition(async () => {
      const res = await updateSale(editingSaleId, {
        property_address: editDraft.address || null,
        commission,
        closing_date: editDraft.date,
      })
      if (res?.error) setSaleError(res.error)
      else {
        setEditingSaleId(null)
        router.refresh()
      }
    })
  }

  async function handleDeleteSale(saleId: string) {
    if (!window.confirm('¿Eliminar esta venta? No se puede recuperar.')) return
    startTransition(async () => {
      const res = await deleteSale(saleId)
      if (res?.error) setSaleError(res.error)
      else router.refresh()
    })
  }

  // Ordenar sales por fecha descendente
  const sortedSales = [...sales].sort((a, b) => b.closing_date.localeCompare(a.closing_date))

  const inputClass =
    'rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'

  return (
    <div className="mb-5 rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
            💰 Revenue Growth · This Year
          </p>
          <p className="mt-0.5 text-[11px] text-[#9A9080]">
            Comisiones mensuales vs objetivo anual
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#9A9080]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#2ECC9A]" />
            Mensual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#C9A84C]" />
            Acumulado
          </span>
          {annualGoal > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[#E05555] bg-transparent" />
              Objetivo
            </span>
          )}
        </div>
      </div>

      {/* Annual Goal — Banner grande si está vacío, cards si ya tiene valor */}
      {annualGoal === 0 ? (
        <div
          className="mb-5 rounded-2xl border-2 border-dashed border-[#C9A84C]/50 bg-gradient-to-br from-[#C9A84C]/10 via-[#1a1510] to-[#C9A84C]/5 p-6 text-center"
        >
          {editingGoal ? (
            <div className="mx-auto max-w-md">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#C9A84C]">
                ¿Cuál es tu objetivo de facturación este año?
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#C9A84C]">€</span>
                  <input
                    type="number"
                    autoFocus
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal() }}
                    placeholder="200000"
                    className="w-full rounded-xl border border-[#C9A84C]/40 bg-[#0A0A0A] py-3 pl-10 pr-4 text-xl font-bold text-[#F5F0E8] outline-none focus:border-[#C9A84C]"
                  />
                </div>
                <button
                  onClick={handleSaveGoal}
                  disabled={goalSaving || !goalDraft}
                  className="rounded-xl bg-[#C9A84C] px-5 text-sm font-bold uppercase text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                >
                  {goalSaving ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  className="rounded-xl border border-white/10 px-4 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                >
                  ✕
                </button>
              </div>
              {goalError && (
                <p className="mt-2 text-xs text-red-400">{goalError}</p>
              )}
              <p className="mt-3 text-[11px] text-[#9A9080]">
                Ej: 200000 → Sabrás cuánto necesitas facturar cada mes para llegar
              </p>
            </div>
          ) : (
            <button
              onClick={() => { setGoalDraft(''); setEditingGoal(true) }}
              className="group inline-flex flex-col items-center gap-2 transition hover:scale-[1.02]"
            >
              <span className="text-5xl">🎯</span>
              <p className="font-['Maharlika',serif] text-2xl font-bold text-[#C9A84C]">
                Define tu objetivo anual
              </p>
              <p className="text-sm text-[#9A9080]">
                Pon tu meta de facturación y verás tu progreso en el gráfico →
              </p>
              <span className="mt-2 rounded-xl bg-[#C9A84C] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-black transition group-hover:bg-[#E8C96A]">
                👉 Definir objetivo
              </span>
            </button>
          )}
        </div>
      ) : (
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {/* Objetivo anual */}
        <div className="rounded-xl border border-[#C9A84C]/30 bg-gradient-to-br from-[#C9A84C]/10 to-[#0A0A0A] p-3.5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#C9A84C]">🎯 Objetivo anual</p>
            {!editingGoal && (
              <button onClick={() => { setGoalDraft(String(annualGoal || '')); setEditingGoal(true) }} className="rounded border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-bold text-[#C9A84C] hover:bg-[#C9A84C]/20">
                Editar
              </button>
            )}
          </div>
          {editingGoal ? (
            <>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  autoFocus
                  value={goalDraft}
                  onChange={(e) => setGoalDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal() }}
                  placeholder="150000"
                  className="min-w-0 flex-1 rounded-md border border-white/10 bg-[#1C1C1C] px-2 py-1.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                />
                <button
                  onClick={handleSaveGoal}
                  disabled={goalSaving}
                  className="rounded-md bg-[#C9A84C] px-2.5 text-xs font-bold text-black hover:bg-[#E8C96A] disabled:opacity-50"
                >
                  {goalSaving ? '…' : '✓'}
                </button>
                <button
                  onClick={() => { setEditingGoal(false); setGoalError(null) }}
                  className="rounded-md border border-white/10 px-2.5 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                >
                  ✕
                </button>
              </div>
              {goalError && (
                <p className="mt-1.5 text-[10px] text-red-400">{goalError}</p>
              )}
            </>
          ) : (
            <p className="font-['Maharlika',serif] text-2xl font-bold text-[#C9A84C]">
              {fmtEur(annualGoal)}
            </p>
          )}
        </div>

        {/* Media mensual necesaria */}
        <div className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">📊 Media mensual</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8]">
            {annualGoal > 0 ? fmtEur(monthlyGoalLine) : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">necesario de ticket/mes</p>
        </div>

        {/* Lo que necesitas de aquí a fin de año */}
        <div className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">⏳ Restante / mes</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8]">
            {annualGoal > 0 && monthsLeft > 0 ? fmtEur(requiredPerMonth) : annualGoal > 0 ? '✓' : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">
            {monthsLeft > 0 ? `en los próximos ${monthsLeft} meses` : '¡año cerrado!'}
          </p>
        </div>

        {/* Tracking */}
        <div
          className="rounded-xl border p-3.5"
          style={{
            borderColor: annualGoal === 0 ? 'rgba(255,255,255,0.08)' : onPace ? 'rgba(46,204,154,0.35)' : 'rgba(239,68,68,0.35)',
            background: annualGoal === 0 ? '#0A0A0A' : onPace ? 'rgba(46,204,154,0.05)' : 'rgba(239,68,68,0.05)',
          }}
        >
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">📈 Tracking</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold" style={{ color: onPace ? '#2ECC9A' : '#EF4444' }}>
            {onPace ? '✓ En ritmo' : '⚠ Por debajo'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">
            {pctAchieved.toFixed(0)}% · {onPace ? `+${fmtEur(deviation)}` : fmtEur(deviation)}
          </p>
        </div>
      </div>
      )}

      {/* Chart */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#9A9080' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9A9080' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `€${v / 1000}K` : `€${v}`}
              width={42}
            />
            <Tooltip content={<CustomTooltip />} />
            {annualGoal > 0 && (
              <>
                {/* Línea objetivo mensual (lo que deberías hacer CADA mes) */}
                <ReferenceLine
                  y={monthlyGoalLine}
                  stroke="#C9A84C"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  strokeOpacity={0.9}
                  label={{
                    value: `🎯 Objetivo ${fmtEur(monthlyGoalLine)}/mes`,
                    position: 'insideTopRight',
                    fill: '#C9A84C',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
              </>
            )}
            <Bar dataKey="revenue" name="Monthly" fill="#2ECC9A" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
            <Line
              type="monotone"
              dataKey="cumulative"
              name="Cumulative"
              stroke="#C9A84C"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Log closing */}
      <div className="mt-4 border-t border-white/6 pt-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
          + Log Closing
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="text"
            placeholder="Property address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${inputClass} min-w-[160px] flex-[2]`}
          />
          <input
            type="number"
            placeholder="Commission €"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${inputClass} min-w-[110px] flex-1`}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} min-w-[130px]`}
          />
          <button
            onClick={handleLog}
            disabled={isPending}
            className="rounded-lg bg-[#C9A84C] px-4 py-2 text-sm font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
          >
            {isPending ? '...' : '+ Log'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Lista de ventas registradas */}
      {canEdit && (
        <div className="mt-5 border-t border-white/6 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
              📋 Ventas registradas ({sortedSales.length})
            </p>
            {saleError && <span className="text-[10px] text-red-400">{saleError}</span>}
          </div>

          {sortedSales.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#9A9080]/60">
              Aún no has registrado ninguna venta. Usa el formulario de arriba.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-white/8 bg-[#0A0A0A]">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#1C1C1C] text-left text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Propiedad</th>
                      <th className="px-3 py-2 text-right">Comisión</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSales.map((sale) => {
                      const isEditing = editingSaleId === sale.id
                      return (
                        <tr key={sale.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                          {isEditing ? (
                            <>
                              <td className="px-3 py-2">
                                <input
                                  type="date"
                                  value={editDraft.date}
                                  onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                                  className="w-full rounded border border-white/10 bg-[#1C1C1C] px-2 py-1 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={editDraft.address}
                                  onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })}
                                  placeholder="Dirección"
                                  className="w-full rounded border border-white/10 bg-[#1C1C1C] px-2 py-1 text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={editDraft.commission}
                                  onChange={(e) => setEditDraft({ ...editDraft, commission: e.target.value })}
                                  className="w-24 rounded border border-white/10 bg-[#1C1C1C] px-2 py-1 text-right text-xs text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={isPending}
                                    className="rounded bg-[#2ECC9A]/15 px-2 py-1 text-[10px] font-bold text-[#2ECC9A] hover:bg-[#2ECC9A]/25"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => { setEditingSaleId(null); setSaleError(null) }}
                                    className="rounded border border-white/10 px-2 py-1 text-[10px] text-[#9A9080] hover:text-[#F5F0E8]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="whitespace-nowrap px-3 py-2 text-xs text-[#9A9080]">
                                {new Date(sale.closing_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })}
                              </td>
                              <td className="px-3 py-2 text-xs text-[#F5F0E8]">
                                {sale.property_address || <span className="text-[#9A9080]/60">—</span>}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right text-xs font-bold text-[#C9A84C]">
                                {fmtEur(sale.commission ?? sale.sale_price ?? 0)}
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => beginEdit(sale)}
                                    className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-[#9A9080] hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
                                    title="Editar"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSale(sale.id)}
                                    disabled={isPending}
                                    className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                                    title="Eliminar"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
