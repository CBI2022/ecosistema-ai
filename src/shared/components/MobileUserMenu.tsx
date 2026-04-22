'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { signout } from '@/actions/auth'
import { setLocale } from '@/actions/locale'
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config'
import type { Profile } from '@/types/database'

interface MobileUserMenuProps {
  profile: Profile
  avatarUrl: string | null
  initials: string
  uploading: boolean
  onAvatarClick: () => void
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  secretary: 'Secretary',
  photographer: 'Photographer',
  dc: 'Director Comercial',
}

export function MobileUserMenu({
  profile,
  avatarUrl,
  initials,
  uploading,
  onAvatarClick,
}: MobileUserMenuProps) {
  const t = useTranslations('header')
  const currentLocale = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  function handleLocaleChange(locale: Locale) {
    startTransition(async () => {
      await setLocale(locale)
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Menu"
        aria-label="Open menu"
        className={`relative h-9 w-9 overflow-hidden rounded-full border transition active:scale-95 ${
          uploading ? 'opacity-50' : 'border-[#C9A84C]/30'
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={profile.full_name || ''} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C9A84C] to-[#A88830] text-xs font-bold text-black">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Bottom sheet */}
          <div className="pb-safe absolute inset-x-0 bottom-0 animate-slide-up rounded-t-3xl border-t border-[#C9A84C]/20 bg-[#0F0F0F] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
            {/* Handle */}
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>

            {/* User */}
            <div className="flex items-center gap-3 px-5 pb-5 pt-4">
              <button
                onClick={() => {
                  setOpen(false)
                  onAvatarClick()
                }}
                className="relative h-14 w-14 overflow-hidden rounded-full border border-[#C9A84C]/40"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C9A84C] to-[#A88830] text-base font-bold text-black">
                    {initials}
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-semibold text-[#F5F0E8]">
                  {profile.full_name || profile.email}
                </div>
                <div className="truncate text-xs text-[#9A9080]">
                  {ROLE_LABELS[profile.role]} · {profile.email}
                </div>
              </div>
            </div>

            <div className="h-px bg-white/6" />

            {/* Idioma */}
            <div className="px-5 py-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9A9080]">
                Idioma
              </div>
              <div className="grid grid-cols-3 gap-2">
                {LOCALES.map((locale) => {
                  const info = LOCALE_NAMES[locale]
                  const active = locale === currentLocale
                  return (
                    <button
                      key={locale}
                      onClick={() => handleLocaleChange(locale)}
                      className={`flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition active:scale-95 ${
                        active
                          ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'border-white/10 bg-white/4 text-[#F5F0E8]/80'
                      }`}
                    >
                      <span className="text-base">{info.flag}</span>
                      <span>{info.shortCode}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-px bg-white/6" />

            {/* Acciones */}
            <nav className="flex flex-col px-2 py-2">
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex h-14 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-[#F5F0E8] transition active:bg-white/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-[#C9A84C]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </span>
                {t('settings')}
                <svg className="ml-auto text-[#9A9080]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>

              <button
                onClick={() => {
                  setOpen(false)
                  onAvatarClick()
                }}
                className="flex h-14 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-[#F5F0E8] transition active:bg-white/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/6 text-[#C9A84C]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </span>
                Cambiar foto de perfil
              </button>
            </nav>

            <div className="h-px bg-white/6" />

            {/* Sign out */}
            <form action={signout} className="p-4">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-[15px] font-semibold text-red-400 transition active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                {t('signOut')}
              </button>
            </form>
          </div>

          <style>{`
            @keyframes cbi-slide-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            .animate-slide-up {
              animation: cbi-slide-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1);
            }
          `}</style>
        </div>
      )}
    </>
  )
}
