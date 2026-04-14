'use client'

import { useEffect, useImperativeHandle, useState, forwardRef } from 'react'
import { useTranslations } from 'next-intl'

const CONFIG_KEY = 'reminder_config'

interface ReminderConfig {
  enabled: boolean
  hour: number
  minute: number
  lastDismissedDate?: string
}

export interface ReminderSettingsHandle {
  isDirty: () => boolean
  save: () => { success: true } | { error: string }
}

function load(): ReminderConfig {
  if (typeof window === 'undefined') return { enabled: true, hour: 19, minute: 0 }
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        enabled: p.enabled ?? true,
        hour: p.hour ?? 19,
        minute: p.minute ?? 0,
        lastDismissedDate: p.lastDismissedDate,
      }
    }
  } catch {}
  return { enabled: true, hour: 19, minute: 0 }
}

interface Props {
  onDirtyChange?: (dirty: boolean) => void
}

export const ReminderSettings = forwardRef<ReminderSettingsHandle, Props>(function ReminderSettings({ onDirtyChange }, ref) {
  const t = useTranslations('settings')
  const [initial, setInitial] = useState<ReminderConfig>({ enabled: true, hour: 19, minute: 0 })
  const [config, setConfig] = useState<ReminderConfig>({ enabled: true, hour: 19, minute: 0 })

  useEffect(() => {
    const c = load()
    setInitial(c)
    setConfig(c)
  }, [])

  const dirty =
    initial.enabled !== config.enabled ||
    initial.hour !== config.hour ||
    initial.minute !== config.minute

  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])

  useImperativeHandle(ref, () => ({
    isDirty: () => dirty,
    save: () => {
      try {
        const toSave = { ...config, lastDismissedDate: initial.lastDismissedDate }
        localStorage.setItem(CONFIG_KEY, JSON.stringify(toSave))
        setInitial(config)
        return { success: true as const }
      } catch {
        return { error: 'No se pudo guardar' }
      }
    },
  }), [config, dirty, initial.lastDismissedDate])

  function adjustHour(delta: number) {
    setConfig((c) => ({ ...c, hour: (c.hour + delta + 24) % 24 }))
  }
  function adjustMinute(delta: number) {
    setConfig((c) => ({ ...c, minute: (c.minute + delta + 60) % 60 }))
  }

  const timeStr = `${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}`

  return (
    <div className="rounded-2xl border border-white/8 bg-[#131313] p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.08em] text-[#C9A84C]">
        🔔 {t('reminderTitle')}
      </h2>

      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[#F5F0E8]">{t('reminderActive')}</p>
          <p className="text-[10px] text-[#9A9080]">
            {t('reminderDescription')}
          </p>
        </div>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          className="h-5 w-5 accent-[#C9A84C]"
        />
      </label>

      <div className="mt-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
          {t('reminderTime')}
        </p>

        <div className={`flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#1C1C1C] to-[#141414] px-6 py-6 transition ${config.enabled ? '' : 'opacity-40'}`}>
          {/* Hour */}
          <TimeWheel
            value={config.hour}
            onUp={() => adjustHour(1)}
            onDown={() => adjustHour(-1)}
            onChange={(v) => setConfig({ ...config, hour: Math.max(0, Math.min(23, v)) })}
            disabled={!config.enabled}
            max={23}
          />

          <span className="font-['Maharlika',serif] text-5xl text-[#C9A84C]">:</span>

          {/* Minute */}
          <TimeWheel
            value={config.minute}
            onUp={() => adjustMinute(5)}
            onDown={() => adjustMinute(-5)}
            onChange={(v) => setConfig({ ...config, minute: Math.max(0, Math.min(59, v)) })}
            disabled={!config.enabled}
            max={59}
          />
        </div>

        <p className="mt-3 text-center text-[11px] text-[#9A9080]">
          {t('reminderTimeHint', { time: timeStr })}
        </p>
      </div>
    </div>
  )
})

function TimeWheel({
  value,
  onUp,
  onDown,
  onChange,
  disabled,
  max,
}: {
  value: number
  onUp: () => void
  onDown: () => void
  onChange: (v: number) => void
  disabled: boolean
  max: number
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onUp}
        disabled={disabled}
        className="flex h-7 w-14 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#C9A84C] disabled:opacity-30"
        aria-label="Aumentar"
      >
        ▲
      </button>
      <input
        type="number"
        min={0}
        max={max}
        value={String(value).padStart(2, '0')}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-20 rounded-xl border border-white/10 bg-[#0A0A0A] py-3 text-center font-['Maharlika',serif] text-4xl font-bold text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={onDown}
        disabled={disabled}
        className="flex h-7 w-14 items-center justify-center rounded-lg border border-white/10 text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#C9A84C] disabled:opacity-30"
        aria-label="Disminuir"
      >
        ▼
      </button>
    </div>
  )
}
