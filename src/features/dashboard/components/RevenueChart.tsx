'use client'

import { useState, useTransition } from 'react'
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
import { logSale } from '@/actions/sales'

interface MonthData {
  month: string
  revenue: number
  closings: number
}

interface RevenueChartProps {
  data: MonthData[]
  annualGoal: number
  currentMonth: number
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
  annualGoal,
  currentMonth,
}: RevenueChartProps) {
  const [isPending, startTransition] = useTransition()
  const [address, setAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  const chartData = buildChartData(data, currentMonth)
  const monthlyGoalLine = annualGoal / 12

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
      }
    })
  }

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
            Monthly commissions vs annual goal
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#9A9080]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#2ECC9A]" />
            Monthly
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[#C9A84C]" />
            Cumulative
          </span>
          {annualGoal > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 border-t-2 border-dashed border-[#E05555] bg-transparent" />
              Goal
            </span>
          )}
        </div>
      </div>

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
              <ReferenceLine
                y={monthlyGoalLine}
                stroke="#E05555"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
              />
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
    </div>
  )
}
