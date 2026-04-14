'use client'

import { useState, useTransition } from 'react'
import { runSupremaJob, retrySupremaJob, cancelSupremaJob } from '@/actions/suprema'

type JobStatus = 'queued' | 'running' | 'done' | 'error'

interface SupremaJob {
  id: string
  property_id: string
  agent_id: string
  status: JobStatus
  logs: string[] | null
  error_message: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
  property_reference: string | null
  property_title: string | null
  property_zone: string | null
  agent_name: string | null
}

interface SupremaDashboardProps {
  jobs: SupremaJob[]
}

const STATUS_STYLES: Record<JobStatus, { dot: string; label: string; bg: string; text: string }> = {
  queued:   { dot: 'bg-[#9A9080]', label: 'Queued',   bg: 'bg-white/8',          text: 'text-[#9A9080]' },
  running:  { dot: 'bg-yellow-400 animate-pulse', label: 'Running',  bg: 'bg-yellow-500/10',    text: 'text-yellow-400' },
  done:     { dot: 'bg-[#2ECC9A]', label: 'Done',     bg: 'bg-[#2ECC9A]/10',     text: 'text-[#2ECC9A]' },
  error:    { dot: 'bg-red-400',   label: 'Error',     bg: 'bg-red-500/10',       text: 'text-red-400' },
}

export function SupremaDashboard({ jobs: initialJobs }: SupremaDashboardProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [expandedJob, setExpandedJob] = useState<string | null>(null)
  const [runningJobId, setRunningJobId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')
  const [isPending, startTransition] = useTransition()

  const filtered = filterStatus === 'all' ? jobs : jobs.filter((j) => j.status === filterStatus)

  const counts = {
    queued: jobs.filter((j) => j.status === 'queued').length,
    running: jobs.filter((j) => j.status === 'running').length,
    done: jobs.filter((j) => j.status === 'done').length,
    error: jobs.filter((j) => j.status === 'error').length,
  }

  function handleRun(jobId: string) {
    setRunningJobId(jobId)
    startTransition(async () => {
      // Optimistic: mark as running
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, status: 'running' } : j))

      const res = await runSupremaJob(jobId)

      if (res?.success) {
        setJobs((prev) => prev.map((j) => j.id === jobId
          ? { ...j, status: 'done', logs: (res.logs as string[]) ?? j.logs, completed_at: new Date().toISOString() }
          : j
        ))
        setExpandedJob(jobId)
      } else {
        setJobs((prev) => prev.map((j) => j.id === jobId
          ? { ...j, status: 'error', error_message: res?.error ?? 'Unknown error' }
          : j
        ))
      }
      setRunningJobId(null)
    })
  }

  function handleRetry(jobId: string) {
    startTransition(async () => {
      await retrySupremaJob(jobId)
      setJobs((prev) => prev.map((j) => j.id === jobId
        ? { ...j, status: 'queued', error_message: null, logs: null }
        : j
      ))
    })
  }

  function handleCancel(jobId: string) {
    startTransition(async () => {
      await cancelSupremaJob(jobId)
      setJobs((prev) => prev.map((j) => j.id === jobId
        ? { ...j, status: 'error', error_message: 'Cancelled by admin' }
        : j
      ))
    })
  }

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['queued', 'running', 'done', 'error'] as const).map((s) => {
          const style = STATUS_STYLES[s]
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)}
              className={`rounded-2xl border p-4 text-left transition ${filterStatus === s ? 'border-[#C9A84C]/40' : 'border-white/8'} bg-[#131313]`}
            >
              <div className={`mb-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                {style.label}
              </div>
              <p className="text-2xl font-bold text-[#F5F0E8]">{counts[s]}</p>
            </button>
          )
        })}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-[#C9A84C]/15 bg-[#C9A84C]/5 px-4 py-3">
        <p className="text-xs text-[#C9A84C]">
          <strong>How it works:</strong> When an agent publishes a property, a job is created here.
          Click <strong>Run</strong> to automate the submission to the Suprema portal via browser automation.
          Photos are uploaded in order — drone photos are always placed last per Suprema requirements.
        </p>
      </div>

      {/* Jobs list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#131313] p-12 text-center">
          <div className="mb-3 text-4xl opacity-30">🤖</div>
          <p className="text-sm font-semibold text-[#9A9080]">No {filterStatus !== 'all' ? filterStatus : ''} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const style = STATUS_STYLES[job.status]
            const isRunning = runningJobId === job.id || job.status === 'running'

            return (
              <div key={job.id} className="overflow-hidden rounded-2xl border border-white/8 bg-[#131313]">
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Status dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />

                  {/* Property info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#F5F0E8]">{job.property_reference || '—'}</span>
                      {job.property_title && (
                        <span className="text-sm text-[#9A9080]">— {job.property_title}</span>
                      )}
                      {job.property_zone && (
                        <span className="rounded bg-white/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">
                          {job.property_zone}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#9A9080]">
                      {job.agent_name && <span>Agent: {job.agent_name}</span>}
                      <span>Created: {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      {job.completed_at && (
                        <span>Completed: {new Date(job.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                    {job.error_message && (
                      <p className="mt-1 text-xs text-red-400">{job.error_message}</p>
                    )}
                  </div>

                  {/* Status badge + actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
                      {isRunning && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />}
                      {style.label}
                    </span>

                    {job.status === 'queued' && (
                      <button
                        onClick={() => handleRun(job.id)}
                        disabled={isPending || !!runningJobId}
                        className="rounded-lg bg-[#C9A84C] px-3 py-1.5 text-xs font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
                      >
                        ▶ Run
                      </button>
                    )}
                    {job.status === 'error' && (
                      <button
                        onClick={() => handleRetry(job.id)}
                        disabled={isPending}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-[#9A9080] transition hover:text-[#F5F0E8] disabled:opacity-50"
                      >
                        ↺ Retry
                      </button>
                    )}
                    {job.status === 'running' && (
                      <button
                        onClick={() => handleCancel(job.id)}
                        disabled={isPending}
                        className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:border-red-500/40 disabled:opacity-50"
                      >
                        ✕ Cancel
                      </button>
                    )}
                    {job.logs && job.logs.length > 0 && (
                      <button
                        onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-[#9A9080] hover:text-[#F5F0E8]"
                      >
                        {expandedJob === job.id ? '▲ Logs' : '▼ Logs'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Logs panel */}
                {expandedJob === job.id && job.logs && (
                  <div className="border-t border-white/8 bg-[#0A0A0A] px-5 py-4">
                    <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#9A9080]">Automation Log</p>
                    <div className="space-y-1">
                      {job.logs.map((line, idx) => (
                        <p key={idx} className="font-mono text-xs text-[#2ECC9A]">{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
