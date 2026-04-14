'use client'

import { useState } from 'react'
import { BookShootingCalendar } from './BookShootingCalendar'
import type { Database } from '@/types/database'

type PhotoShoot = Database['public']['Tables']['photo_shoots']['Row']

interface PhotoShootsSectionProps {
  shoots: PhotoShoot[]
}

export function PhotoShootsSection({ shoots }: PhotoShootsSectionProps) {
  const [showBooking, setShowBooking] = useState(false)

  return (
    <div className="mb-5 rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#C9A84C]/20 bg-[#C9A84C]/8 text-xl">
            📸
          </div>
          <div>
            <p className="text-sm font-bold text-[#F5F0E8]">
              Property Photo Shoots
            </p>
            <p className="text-[11px] text-[#9A9080]">
              Uploaded by <strong>Jelle</strong> · Click any set to view
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowBooking(true)}
          className="flex items-center gap-2 rounded-lg border border-[#C9A84C]/25 bg-[#C9A84C]/10 px-4 py-2.5 text-xs font-semibold text-[#C9A84C] transition hover:bg-[#C9A84C]/15"
        >
          📅 Book Shooting
        </button>
      </div>

      {/* Shoots grid or empty state */}
      {shoots.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 text-4xl opacity-40">📷</div>
          <p className="text-sm font-semibold text-[#9A9080]">
            No photo shoots yet
          </p>
          <p className="mt-1 text-xs text-[#9A9080]/60">
            Jelle uploads shoots here after each session
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shoots.map((shoot) => (
            <div
              key={shoot.id}
              className="rounded-xl border border-white/8 bg-[#1C1C1C] p-4 transition hover:border-[#C9A84C]/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F5F0E8]">
                  {shoot.property_address || shoot.property_reference || 'Unnamed shoot'}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    shoot.status === 'completed'
                      ? 'bg-[#2ECC9A]/15 text-[#2ECC9A]'
                      : shoot.status === 'cancelled'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-[#C9A84C]/15 text-[#C9A84C]'
                  }`}
                >
                  {shoot.status}
                </span>
              </div>
              <p className="text-[11px] text-[#9A9080]">
                📅{' '}
                {new Date(shoot.shoot_date).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · {shoot.shoot_time?.slice(0, 5)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Book Shooting Calendar */}
      {showBooking && (
        <BookShootingCalendar onClose={() => setShowBooking(false)} />
      )}
    </div>
  )
}

