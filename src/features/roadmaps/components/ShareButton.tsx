'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ShareButton({
  path,
  variant = 'ghost',
  label,
}: {
  /** Ruta pública a copiar, ej. "/r/fase-1-publicar-propiedad" */
  path: string
  variant?: 'ghost' | 'solid'
  label?: string
}) {
  const t = useTranslations('roadmaps')
  const resolvedLabel = label ?? t('share')
  const [copied, setCopied] = useState(false)

  async function copy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback para contextos sin clipboard API
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        window.prompt(t('copyThisLink'), url)
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1900)
  }

  const base = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition'
  const styles =
    variant === 'solid'
      ? 'bg-[#C9A84C] text-black hover:bg-[#E8C96A]'
      : 'border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/10'

  return (
    <button type="button" onClick={copy} className={`${base} ${styles}`} aria-label={t('copyLinkAria')}>
      {copied ? (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t('linkCopied')}
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {resolvedLabel}
        </>
      )}
    </button>
  )
}
