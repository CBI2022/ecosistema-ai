'use client'

import { useState } from 'react'
import { OverviewTab } from './OverviewTab'
import { ClipsTab } from './ClipsTab'
import { ScheduleTab } from './ScheduleTab'
import { ConnectionsTab } from './ConnectionsTab'
import { SeedButton } from './SeedButton'
import type { Clip, ScheduledPost, SocialAccount, PlatformMetrics, VideoSource } from '@/types/database'

type TabId = 'overview' | 'clips' | 'schedule' | 'connections'

interface SocialDashboardProps {
  initialTab?: string
  initialPlatform?: string
  clips: Array<Clip & { video_sources?: { title: string | null; thumbnail_url: string | null } | null }>
  scheduledPosts: Array<ScheduledPost & { clips?: { title: string | null; thumbnail_url: string | null; preview_url: string | null } | null }>
  accounts: SocialAccount[]
  metrics: PlatformMetrics[]
  recentVideos: VideoSource[]
}

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'clips', label: 'Clips', icon: '🎬' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'connections', label: 'Connections', icon: '🔗' },
]

export function SocialDashboard({
  initialTab,
  clips,
  scheduledPosts,
  accounts,
  metrics,
  recentVideos,
}: SocialDashboardProps) {
  const [tab, setTab] = useState<TabId>((TABS.find((t) => t.id === initialTab)?.id) || 'overview')

  const hasNoData = clips.length === 0 && metrics.length === 0

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
        {TABS.map((t) => {
          const count =
            t.id === 'clips' ? clips.filter((c) => c.status === 'available').length :
            t.id === 'schedule' ? scheduledPosts.filter((p) => p.status === 'queued' || p.status === 'publishing').length :
            null
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.id
                  ? 'bg-[#C9A84C] text-black'
                  : 'text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {count !== null && count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${tab === t.id ? 'bg-black/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Seed demo banner */}
      {hasNoData && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
          <div>
            <p className="text-sm font-bold text-[#F5F0E8]">Sin datos todavía</p>
            <p className="text-xs text-[#9A9080]">
              Cuando YouTube reciba un vídeo nuevo y Opus Clip procese los clips, aparecerán aquí. Mientras tanto puedes cargar datos de muestra.
            </p>
          </div>
          <SeedButton />
        </div>
      )}

      {/* Content */}
      {tab === 'overview' && (
        <OverviewTab metrics={metrics} clips={clips} accounts={accounts} recentVideos={recentVideos} />
      )}
      {tab === 'clips' && <ClipsTab clips={clips} accounts={accounts} />}
      {tab === 'schedule' && <ScheduleTab posts={scheduledPosts} />}
      {tab === 'connections' && <ConnectionsTab accounts={accounts} />}
    </div>
  )
}
