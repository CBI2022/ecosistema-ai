'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { setLocale } from '@/actions/locale'
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config'

export function LanguageSelector() {
  const currentLocale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleSelect(locale: Locale) {
    setOpen(false)
    startTransition(async () => {
      await setLocale(locale)
    })
  }

  const current = LOCALE_NAMES[currentLocale] ?? LOCALE_NAMES.es

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-[#F5F0E8]/80 transition hover:bg-white/10 disabled:opacity-50"
        aria-label="Language"
      >
        <span>{current.flag}</span>
        <span className="tracking-wider">{current.shortCode}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-white/10 bg-[#1A1A1A] shadow-xl">
          {LOCALES.map((locale) => {
            const info = LOCALE_NAMES[locale]
            const active = locale === currentLocale
            return (
              <button
                key={locale}
                onClick={() => handleSelect(locale)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/10 ${
                  active ? 'bg-white/5 text-[#C9A84C]' : 'text-[#F5F0E8]/80'
                }`}
              >
                <span className="text-base">{info.flag}</span>
                <span className="flex-1">{info.name}</span>
                {active && <span className="text-xs">✓</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
