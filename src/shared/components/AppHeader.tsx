'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { signout } from '@/actions/auth'
import { uploadAvatar } from '@/actions/profile'
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell'
import { LanguageSelector } from '@/shared/components/LanguageSelector'
import { MobileUserMenu } from '@/shared/components/MobileUserMenu'
import type { Profile } from '@/types/database'

interface AppHeaderProps {
  profile: Profile
  notifCount?: number
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  secretary: 'Secretary',
  photographer: 'Photographer',
  dc: 'Director Comercial',
}

export function AppHeader({ profile, notifCount = 0 }: AppHeaderProps) {
  const t = useTranslations('header')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setAvatarUrl(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await uploadAvatar(fd)
    if (res?.avatarUrl) setAvatarUrl(res.avatarUrl)
    setUploading(false)
  }

  return (
    <header className="pt-safe sticky top-0 z-50 border-b border-[#C9A84C]/12 bg-[#0A0A0A]/96 backdrop-blur-xl">
      {/* ───────── MOBILE HEADER (< md) ───────── */}
      <div className="flex h-14 items-center justify-between gap-2 px-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2" aria-label="CBI Dashboard">
          <img
            src="/logo-cbi.png"
            alt="CBI"
            className="h-6 w-auto"
          />
        </Link>

        <div className="flex items-center gap-1.5">
          <NotificationsBell initialCount={notifCount} />

          <MobileUserMenu
            profile={profile}
            avatarUrl={avatarUrl}
            initials={initials}
            uploading={uploading}
            onAvatarClick={() => fileRef.current?.click()}
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
      </div>

      {/* ───────── DESKTOP HEADER (md+) ───────── */}
      <div className="hidden items-center justify-between gap-4 px-6 py-4 md:flex md:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/logo-cbi.png"
              alt="Costa Blanca Investments"
              className="h-7 w-auto"
            />
          </Link>
          <div className="h-4 w-px bg-[#C9A84C]/20" />
          <span className="text-[11px] tracking-widest text-[#9A9080]">
            Performance Dashboard
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden text-[11px] text-[#9A9080] lg:block">{today}</span>

          <LanguageSelector />
          <NotificationsBell initialCount={notifCount} />

          <Link
            href="/settings"
            title={t('settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/8 bg-white/4 text-[#9A9080] transition hover:border-[#C9A84C]/40 hover:text-[#F5F0E8]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              title="Change profile photo"
              className={`relative h-9 w-9 overflow-hidden rounded-full border transition hover:opacity-80 ${uploading ? 'opacity-50' : 'border-[#C9A84C]/30'}`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.full_name || ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C9A84C] to-[#A88830] text-xs font-bold text-black">
                  {initials}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                </div>
              )}
            </button>
            <div className="hidden flex-col sm:flex">
              <span className="text-xs font-medium text-[#F5F0E8]">{profile.full_name || profile.email}</span>
              <span className="text-[10px] text-[#9A9080]">{ROLE_LABELS[profile.role]}</span>
            </div>
          </div>

          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-white/8 bg-white/4 px-3 py-1.5 text-[11px] font-medium text-[#9A9080] transition hover:border-white/15 hover:text-[#F5F0E8]"
            >
              {t('signOut')}
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
