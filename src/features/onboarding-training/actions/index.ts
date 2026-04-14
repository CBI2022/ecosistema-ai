'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ──────────────────────────────────────────────────────────────
// Helpers

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('NOT_AUTHENTICATED')
  return { supabase, userId: user.id }
}

async function requireRole(allowed: ('admin' | 'dc' | 'agent')[]) {
  const { userId } = await requireUser()
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, first_name, email')
    .eq('id', userId)
    .single()
  if (!profile || !allowed.includes(profile.role as typeof allowed[number])) {
    throw new Error('FORBIDDEN')
  }
  return { userId, profile, admin }
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

// ──────────────────────────────────────────────────────────────
// AGENT — progress + state + checkin + tracker

export async function getAgentProgress() {
  const { supabase, userId } = await requireUser()
  const [{ data: rows }, { data: state }] = await Promise.all([
    supabase
      .from('training_agent_progress')
      .select('week_index, task_index, completed')
      .eq('user_id', userId),
    supabase
      .from('training_agent_state')
      .select('committed, current_week')
      .eq('user_id', userId)
      .maybeSingle(),
  ])
  const progress: Record<string, boolean> = {}
  for (const r of rows ?? []) progress[`${r.week_index}-${r.task_index}`] = !!r.completed
  return {
    progress,
    state: state ?? { committed: false, current_week: 0 },
  }
}

export async function toggleAgentTask(
  weekIndex: number,
  taskIndex: number,
  completed: boolean,
) {
  const { supabase, userId } = await requireUser()
  await supabase
    .from('training_agent_progress')
    .upsert(
      {
        user_id: userId,
        week_index: weekIndex,
        task_index: taskIndex,
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,week_index,task_index' },
    )
  revalidatePath('/training')
}

export async function saveAgentState(committed: boolean, currentWeek: number) {
  const { supabase, userId } = await requireUser()
  await supabase.from('training_agent_state').upsert(
    {
      user_id: userId,
      committed,
      current_week: currentWeek,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  revalidatePath('/training')
}

export async function saveCheckin(input: {
  morningAnswer?: string
  eveningDone?: boolean
  eveningNote?: string
}) {
  const { supabase, userId } = await requireUser()
  await supabase.from('training_checkins').insert({
    user_id: userId,
    date: today(),
    morning_answer: input.morningAnswer ?? null,
    evening_done: input.eveningDone ?? null,
    evening_note: input.eveningNote ?? null,
  })
}

export async function getTracker() {
  const { supabase, userId } = await requireUser()
  const [{ data: todayRow }, { data: all }] = await Promise.all([
    supabase
      .from('training_agent_tracker')
      .select('doors, contacts, appointments, viewings, offers, listings')
      .eq('user_id', userId)
      .eq('date', today())
      .maybeSingle(),
    supabase
      .from('training_agent_tracker')
      .select('doors, contacts, appointments, viewings, offers, listings')
      .eq('user_id', userId),
  ])
  const zero = { doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0, listings: 0 }
  const totals = (all ?? []).reduce(
    (acc, r) => ({
      doors: acc.doors + (r.doors ?? 0),
      contacts: acc.contacts + (r.contacts ?? 0),
      appointments: acc.appointments + (r.appointments ?? 0),
      viewings: acc.viewings + (r.viewings ?? 0),
      offers: acc.offers + (r.offers ?? 0),
      listings: acc.listings + (r.listings ?? 0),
    }),
    zero,
  )
  return { today: todayRow ?? zero, totals }
}

export async function saveTracker(input: {
  doors: number
  contacts: number
  appointments: number
  viewings: number
  offers: number
  listings: number
}) {
  const { supabase, userId } = await requireUser()
  await supabase
    .from('training_agent_tracker')
    .upsert(
      {
        user_id: userId,
        date: today(),
        doors: Math.max(0, input.doors | 0),
        contacts: Math.max(0, input.contacts | 0),
        appointments: Math.max(0, input.appointments | 0),
        viewings: Math.max(0, input.viewings | 0),
        offers: Math.max(0, input.offers | 0),
        listings: Math.max(0, input.listings | 0),
      },
      { onConflict: 'user_id,date' },
    )
}

// ──────────────────────────────────────────────────────────────
// DC — own weekly progress + morning prompts + per-agent tasks

export async function getDcProgress() {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('training_dc_progress')
    .select('week_index, task_index, completed')
    .eq('user_id', userId)
  const progress: Record<string, boolean> = {}
  for (const r of rows ?? []) progress[`${r.week_index}-${r.task_index}`] = !!r.completed
  return progress
}

export async function toggleDcTask(weekIndex: number, taskIndex: number, completed: boolean) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_dc_progress').upsert(
    {
      user_id: userId,
      week_index: weekIndex,
      task_index: taskIndex,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'user_id,week_index,task_index' },
  )
}

export async function saveDcPrompt(input: { focusAnswer?: string; winAnswer?: string }) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_dc_prompts').insert({
    user_id: userId,
    date: today(),
    focus_answer: input.focusAnswer ?? null,
    win_answer: input.winAnswer ?? null,
  })
}

export async function getDcAgentTasks(agentId: string) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  const { data } = await supabase
    .from('training_dc_agent_tasks')
    .select('week_index, task_index, completed')
    .eq('dc_user_id', userId)
    .eq('agent_id', agentId)
  const progress: Record<string, boolean> = {}
  for (const r of data ?? []) progress[`${r.week_index}-${r.task_index}`] = !!r.completed
  return progress
}

export async function toggleDcAgentTask(
  agentId: string,
  weekIndex: number,
  taskIndex: number,
  completed: boolean,
) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_dc_agent_tasks').upsert(
    {
      dc_user_id: userId,
      agent_id: agentId,
      week_index: weekIndex,
      task_index: taskIndex,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: 'dc_user_id,agent_id,week_index,task_index' },
  )
}

// ──────────────────────────────────────────────────────────────
// Admin/DC — team overview

export async function getAgentOverview() {
  const { admin } = await requireRole(['dc', 'admin'])
  const { data: agents } = await admin
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'agent')
    .eq('status', 'approved')
    .order('created_at')

  if (!agents?.length) return []

  const ids = agents.map(a => a.id)
  const [{ data: states }, { data: progress }, { data: checkins }] = await Promise.all([
    admin.from('training_agent_state').select('*').in('user_id', ids),
    admin.from('training_agent_progress').select('user_id, week_index, completed').in('user_id', ids),
    admin.from('training_checkins').select('user_id, date, evening_done, morning_answer, created_at').in('user_id', ids).order('created_at', { ascending: false }),
  ])

  return agents.map(a => {
    const st = states?.find(s => s.user_id === a.id)
    const ap = progress?.filter(p => p.user_id === a.id) ?? []
    const weekProgress: Record<number, { done: number; total: number }> = {}
    for (const p of ap) {
      weekProgress[p.week_index] ??= { done: 0, total: 0 }
      weekProgress[p.week_index].total++
      if (p.completed) weekProgress[p.week_index].done++
    }
    const myCheckins = checkins?.filter(c => c.user_id === a.id) ?? []
    return {
      id: a.id,
      name: a.full_name ?? a.email,
      email: a.email,
      created_at: a.created_at,
      committed: st?.committed ?? false,
      current_week: st?.current_week ?? 0,
      completed_tasks: ap.filter(p => p.completed).length,
      total_checkins: myCheckins.length,
      completed_checkins: myCheckins.filter(c => c.evening_done).length,
      last_checkin: myCheckins[0] ?? null,
      week_progress: weekProgress,
    }
  })
}

export async function getAgentProfile(agentId: string) {
  const { admin } = await requireRole(['dc', 'admin'])
  const [{ data: agent }, { data: state }, { data: progress }, { data: checkins }] = await Promise.all([
    admin.from('profiles').select('id, full_name, email, created_at').eq('id', agentId).eq('role', 'agent').single(),
    admin.from('training_agent_state').select('committed, current_week').eq('user_id', agentId).maybeSingle(),
    admin.from('training_agent_progress').select('week_index, task_index, completed').eq('user_id', agentId),
    admin.from('training_checkins').select('date, morning_answer, evening_done, evening_note').eq('user_id', agentId).order('created_at', { ascending: false }).limit(90),
  ])
  if (!agent) throw new Error('NOT_FOUND')
  const progressMap: Record<string, boolean> = {}
  for (const r of progress ?? []) progressMap[`${r.week_index}-${r.task_index}`] = !!r.completed
  return {
    agent: { ...agent, committed: state?.committed ?? false, current_week: state?.current_week ?? 0 },
    progress: progressMap,
    checkins: checkins ?? [],
  }
}

export async function getAgentTrackerFor(agentId: string) {
  await requireRole(['dc', 'admin'])
  const admin = createAdminClient()
  const { data } = await admin
    .from('training_agent_tracker')
    .select('doors, contacts, appointments, viewings, offers, listings')
    .eq('user_id', agentId)
  const zero = { doors: 0, contacts: 0, appointments: 0, viewings: 0, offers: 0, listings: 0 }
  return (data ?? []).reduce(
    (acc, r) => ({
      doors: acc.doors + (r.doors ?? 0),
      contacts: acc.contacts + (r.contacts ?? 0),
      appointments: acc.appointments + (r.appointments ?? 0),
      viewings: acc.viewings + (r.viewings ?? 0),
      offers: acc.offers + (r.offers ?? 0),
      listings: acc.listings + (r.listings ?? 0),
    }),
    zero,
  )
}

// ──────────────────────────────────────────────────────────────
// Videos (Loom URLs for 24 training videos + 8 core uploads)

export async function getWeekVideos() {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('training_week_videos').select('video_id, loom_url')
  const map: Record<string, string> = {}
  for (const r of data ?? []) map[r.video_id] = r.loom_url
  return map
}

export async function saveWeekVideo(videoId: string, loomUrl: string) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_week_videos').upsert(
    { video_id: videoId, loom_url: loomUrl, added_by: userId, updated_at: new Date().toISOString() },
    { onConflict: 'video_id' },
  )
  revalidatePath('/training')
}

export async function deleteWeekVideo(videoId: string) {
  await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_week_videos').delete().eq('video_id', videoId)
  revalidatePath('/training')
}

export async function getCoreVideos() {
  const { supabase } = await requireUser()
  const { data } = await supabase.from('training_uploads').select('video_id, kind, path')
  const out: Record<string, { kind: 'storage' | 'loom'; url: string } | null> = {}
  for (const r of data ?? []) {
    if (r.kind === 'loom') {
      out[r.video_id] = { kind: 'loom', url: r.path }
    } else {
      const { data: signed } = await supabase.storage
        .from('training-videos')
        .createSignedUrl(r.path, 3600)
      out[r.video_id] = signed?.signedUrl
        ? { kind: 'storage', url: signed.signedUrl }
        : null
    }
  }
  return out
}

export async function saveCoreVideoLoom(videoId: string, loomUrl: string) {
  const { userId } = await requireRole(['dc', 'admin'])
  const supabase = await createClient()
  await supabase.from('training_uploads').upsert(
    {
      video_id: videoId,
      kind: 'loom',
      path: loomUrl,
      original_name: 'loom',
      uploaded_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'video_id' },
  )
  revalidatePath('/training')
}

export async function uploadCoreVideo(videoId: string, formData: FormData) {
  const { userId } = await requireRole(['dc', 'admin'])
  const file = formData.get('file') as File | null
  if (!file) throw new Error('NO_FILE')

  const supabase = await createClient()
  const ext = file.name.split('.').pop() || 'mp4'
  const path = `${videoId}_${Date.now()}.${ext}`

  const { error: upErr } = await supabase.storage
    .from('training-videos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (upErr) throw new Error(upErr.message)

  // Remove old file if previous was storage
  const { data: existing } = await supabase
    .from('training_uploads')
    .select('kind, path')
    .eq('video_id', videoId)
    .maybeSingle()
  if (existing?.kind === 'storage' && existing.path !== path) {
    await supabase.storage.from('training-videos').remove([existing.path])
  }

  await supabase.from('training_uploads').upsert(
    {
      video_id: videoId,
      kind: 'storage',
      path,
      original_name: file.name,
      uploaded_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'video_id' },
  )
  revalidatePath('/training')
}

// ──────────────────────────────────────────────────────────────
// Admin / DC — User management

export async function listTrainingUsers() {
  await requireRole(['dc', 'admin'])
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, email, full_name, role, created_at')
    .in('role', ['agent', 'dc', 'admin'])
    .eq('status', 'approved')
    .order('created_at')
  return data ?? []
}

export async function createTrainingUser(input: {
  email: string
  password: string
  fullName: string
  role: 'agent' | 'dc'
}) {
  const { profile } = await requireRole(['admin'])
  if (profile.role !== 'admin') throw new Error('FORBIDDEN')
  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role },
  })
  if (error || !data.user) throw new Error(error?.message ?? 'CREATE_FAILED')

  await admin.from('profiles').upsert(
    {
      id: data.user.id,
      email: input.email.trim().toLowerCase(),
      full_name: input.fullName,
      role: input.role,
      status: 'approved',
    },
    { onConflict: 'id' },
  )
  revalidatePath('/training')
  return { id: data.user.id }
}

export async function deleteTrainingUser(userId: string) {
  const { userId: me, profile } = await requireRole(['admin'])
  if (profile.role !== 'admin') throw new Error('FORBIDDEN')
  if (userId === me) throw new Error('CANNOT_DELETE_SELF')
  const admin = createAdminClient()
  await admin.auth.admin.deleteUser(userId)
  revalidatePath('/training')
}

export async function resetTrainingUserPassword(userId: string, newPassword: string) {
  const { profile } = await requireRole(['admin'])
  if (profile.role !== 'admin') throw new Error('FORBIDDEN')
  if (!newPassword || newPassword.length < 6) throw new Error('PASSWORD_TOO_SHORT')
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) throw new Error(error.message)
}
