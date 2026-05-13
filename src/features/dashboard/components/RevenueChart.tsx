'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
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
    <div className="mb-5 rounded-2xl border border-white/8 bg-[#131313] p-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
            {t('revenueGrowth')}
          </p>
          <p className="mt-0.5 text-[11px] text-[#9A9080]">
            {t('revenueSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#9A9080]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#2ECC9A]" />
            {t('legendMonthly')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#C9A84C]" />
            {t('legendCumulative')}
          </span>
          {annualGoal > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[#E05555] bg-transparent" />
              {t('legendGoal')}
            </span>
          )}
        </div>
      </div>

      {/* Annual Goal — Banner grande si está vacío, cards si ya tiene valor */}
      {annualGoal === 0 ? (
        <div
          className="mb-5 rounded-2xl border border-dashed border-white/15 bg-[#0F0F0F] p-6 text-center"
        >
          {editingGoal ? (
            <div className="mx-auto max-w-md">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-[#9A9080]">
                {t('defineGoalQuestion')}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-[#9A9080]">€</span>
                  <input
                    type="number"
                    autoFocus
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveGoal() }}
                    placeholder="200000"
                    className="w-full rounded-xl border border-white/10 bg-[#0A0A0A] py-3 pl-10 pr-4 text-xl font-bold text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                  />
                </div>
                <button
                  onClick={handleSaveGoal}
                  disabled={goalSaving || !goalDraft}
                  className="rounded-xl bg-[#C9A84C] px-5 text-sm font-bold uppercase text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                >
                  {goalSaving ? tCommon('saving') : tCommon('save')}
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
                {t('defineGoalHint')}
              </p>
            </div>
          ) : (
            <button
              onClick={() => { setGoalDraft(''); setEditingGoal(true) }}
              className="group inline-flex flex-col items-center gap-2 transition"
            >
              <p className="font-['Maharlika',serif] text-xl font-bold text-[#F5F0E8]">
                {t('defineGoalTitle')}
              </p>
              <p className="text-sm text-[#9A9080]">
                {t('defineGoalSubtitle')}
              </p>
              <span className="mt-2 rounded-xl bg-[#C9A84C] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.08em] text-black transition group-hover:bg-[#E8C96A]">
                {t('defineGoalButton')}
              </span>
            </button>
          )}
        </div>
      ) : (
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        {/* Objetivo anual */}
        <div className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{t('annualGoal')}</p>
            {!editingGoal && (
              <button
                onClick={() => { setGoalDraft(String(annualGoal || '')); setEditingGoal(true) }}
                className="flex shrink-0 items-center gap-1 rounded-md bg-[#C9A84C] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#E8C96A] active:scale-95"
                aria-label="Editar objetivo anual"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                {tCommon('edit')}
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
            <p className="font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8]">
              {fmtEur(annualGoal)}
            </p>
          )}
        </div>

        {/* Media mensual necesaria */}
        <div className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{t('monthlyAvg')}</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8]">
            {annualGoal > 0 ? fmtEur(monthlyGoalLine) : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">{t('requiredPerTicket')}</p>
        </div>

        {/* Lo que necesitas de aquí a fin de año */}
        <div className="rounded-xl border border-white/8 bg-[#0A0A0A] p-3.5">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{t('remainingPerMonth')}</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold text-[#F5F0E8]">
            {annualGoal > 0 && monthsLeft > 0 ? fmtEur(requiredPerMonth) : annualGoal > 0 ? '✓' : '—'}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">
            {monthsLeft > 0 ? t('nextMonths', { n: monthsLeft }) : t('yearClosed')}
          </p>
        </div>

        {/* Tracking — color funcional (on-pace verde, below-pace rojo) */}
        <div
          className="rounded-xl border p-3.5"
          style={{
            borderColor: annualGoal === 0 ? 'rgba(255,255,255,0.08)' : onPace ? 'rgba(46,204,154,0.35)' : 'rgba(239,68,68,0.35)',
            background: '#0A0A0A',
          }}
        >
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">{t('tracking')}</p>
          <p className="font-['Maharlika',serif] text-2xl font-bold" style={{ color: onPace ? '#2ECC9A' : '#EF4444' }}>
            {onPace ? t('onPace') : t('belowPace')}
          </p>
          <p className="mt-0.5 text-[10px] text-[#9A9080]">
            {pctAchieved.toFixed(0)}% · {onPace ? `+${fmtEur(deviation)}` : fmtEur(deviation)}
          </p>
        </div>
      </div>
      )}

      {/* Chart */}
      <div className="h-[200px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: '#9A9080' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={4}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9A9080' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : `${v}`}
              width={36}
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
                    value: `${fmtEur(monthlyGoalLine)}/mes`,
                    position: 'insideTopLeft',
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
          + {t('logClosing')}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            type="text"
            placeholder={t('propertyAddress')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={`${inputClass} w-full sm:min-w-[160px] sm:flex-[2]`}
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('commission')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${inputClass} flex-1 sm:min-w-[110px]`}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} flex-1 sm:min-w-[130px] sm:flex-none`}
            />
          </div>
          <button
            onClick={handleLog}
            disabled={isPending}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#C9A84C] px-4 text-sm font-bold text-black transition active:scale-[0.98] hover:bg-[#E8C96A] disabled:opacity-50 sm:h-auto sm:w-auto sm:py-2"
          >
            {isPending ? '...' : `+ ${t('log')}`}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      {/* Lista de ventas registradas */}
      {canEdit && (
        <div className="mt-5 border-t border-white/6 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#9A9080]">
              Ventas registradas ({sortedSales.length})
            </p>
            {saleError && <span className="text-[10px] text-red-400">{saleError}</span>}
          </div>

          {sortedSales.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#9A9080]/60">
              Aún no has registrado ninguna venta. Usa el formulario de arriba.
            </p>
          ) : (
            <>
              {/* ───── MOBILE: card list ───── */}
              <ul className="space-y-2 sm:hidden">
                {sortedSales.map((sale) => {
                  const isEditing = editingSaleId === sale.id
                  return (
                    <li
                      key={sale.id}
                      className="rounded-xl border border-white/8 bg-[#0F0F0F] p-3"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="date"
                            value={editDraft.date}
                            onChange={(e) => setEditDraft({ ...editDraft, date: e.target.value })}
                            className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                          />
                          <input
                            type="text"
                            value={editDraft.address}
                            onChange={(e) => setEditDraft({ ...editDraft, address: e.target.value })}
                            placeholder="Dirección"
                            className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                          />
                          <input
                            type="number"
                            value={editDraft.commission}
                            onChange={(e) => setEditDraft({ ...editDraft, commission: e.target.value })}
                            placeholder="Comisión €"
                            className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={isPending}
                              className="flex h-11 flex-1 items-center justify-center rounded-lg bg-[#2ECC9A]/15 text-sm font-bold text-[#2ECC9A] active:scale-95 disabled:opacity-50"
                            >
                              ✓ Guardar
                            </button>
                            <button
                              onClick={() => { setEditingSaleId(null); setSaleError(null) }}
                              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-white/10 text-sm text-[#9A9080] active:scale-95"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 text-[11px] uppercase tracking-wider text-[#9A9080]">
                              {new Date(sale.closing_date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className="truncate text-sm font-medium text-[#F5F0E8]">
                              {sale.property_address || <span className="text-[#9A9080]/60">Sin dirección</span>}
                            </div>
                            <div className="mt-1 text-base font-bold text-[#C9A84C]">
                              {fmtEur(sale.commission ?? sale.sale_price ?? 0)}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col gap-1.5">
                            <button
                              onClick={() => beginEdit(sale)}
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[#9A9080] active:scale-95"
                              title="Editar"
                              aria-label="Editar"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale.id)}
                              disabled={isPending}
                              className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 active:scale-95 disabled:opacity-50"
                              title="Eliminar"
                              aria-label="Eliminar"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              {/* ───── DESKTOP: table ───── */}
              <div className="hidden overflow-hidden rounded-xl border border-white/8 bg-[#0A0A0A] sm:block">
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
