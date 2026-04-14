'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

const CONFIG_KEY = 'reminder_config'

interface ReminderConfig {
  enabled: boolean
  hour: number // 0-23
  minute: number // 0-59
  lastDismissedDate?: string
}

function getConfig(): ReminderConfig {
  if (typeof window === 'undefined') return { enabled: true, hour: 19, minute: 0 }
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabled: parsed.enabled ?? true,
        hour: parsed.hour ?? 19,
        minute: parsed.minute ?? 0,
        lastDismissedDate: parsed.lastDismissedDate,
      }
    }
  } catch {}
  return { enabled: true, hour: 19, minute: 0 }
}

function saveConfig(cfg: ReminderConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

function getTodayKey() {
  return `checklist_${new Date().toISOString().split('T')[0]}`
}

export function ChecklistReminder() {
  const t = useTranslations('dashboard')
  const [config, setConfig] = useState<ReminderConfig>({ enabled: true, hour: 19, minute: 0 })
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    setConfig(getConfig())
  }, [])

  useEffect(() => {
    function check() {
      if (!config.enabled) {
        setVisible(false)
        return
      }
      const today = new Date().toISOString().split('T')[0]
      if (config.lastDismissedDate === today) {
        setVisible(false)
        return
      }
      const now = new Date()
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      const targetMinutes = config.hour * 60 + config.minute
      if (nowMinutes < targetMinutes) {
        setVisible(false)
        return
      }
      // Count incomplete tasks from localStorage
      try {
        const saved = localStorage.getItem(getTodayKey())
        const done = saved ? JSON.parse(saved).length : 0
        const total = 8 // TASKS count in TodaysChecklist
        const remaining = Math.max(0, total - done)
        setPending(remaining)
        setVisible(remaining > 0)
      } catch {
        setVisible(false)
      }
    }
    check()
    const t = setInterval(check, 60_000) // re-check cada minuto
    return () => clearInterval(t)
  }, [config])

  function dismissToday() {
    const today = new Date().toISOString().split('T')[0]
    const next = { ...config, lastDismissedDate: today }
    setConfig(next)
    saveConfig(next)
    setVisible(false)
  }

  return (
    <>
      {/* Floating reminder */}
      {visible && (
        <div className="fixed bottom-5 right-5 z-40 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-[#C9A84C]/40 bg-[#131313] p-5 shadow-2xl">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⏰</span>
              <p className="text-sm font-bold text-[#F5F0E8]">{t('checklistReminder')}</p>
            </div>
            <button
              onClick={dismissToday}
              className="text-xs text-[#9A9080] hover:text-[#F5F0E8]"
              title="Ocultar hasta mañana"
            >
              ✕
            </button>
          </div>
          <p className="text-xs text-[#9A9080]">
            {t('tasksRemaining', { n: pending, plural: pending !== 1 ? 's' : '' })}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex-1 rounded-lg bg-[#C9A84C] py-2 text-xs font-bold uppercase tracking-[0.06em] text-black hover:bg-[#E8C96A]"
            >
              {t('viewChecklist')}
            </button>
            <button
              onClick={dismissToday}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
            >
              {t('later')}
            </button>
          </div>
        </div>
      )}

    </>
  )
}
