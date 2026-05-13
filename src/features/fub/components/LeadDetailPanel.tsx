import { createClient } from '@/lib/supabase/server'

interface Props {
  personId: number
}

export async function LeadDetailPanel({ personId }: Props) {
  const supabase = await createClient()

  const [
    { data: person },
    { data: deals },
    { data: calls },
    { data: notes },
    { data: appts },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('fub_people').select('*').eq('id', personId).eq('deleted', false).maybeSingle(),
    supabase
      .from('fub_deals')
      .select('id, name, stage_id, value_cents, currency, created_at_fub, closed_at_fub, pipeline_id')
      .eq('person_id', personId)
      .order('updated_at_fub', { ascending: false }),
    supabase
      .from('fub_calls')
      .select('id, duration_seconds, outcome, occurred_at')
      .eq('person_id', personId)
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase
      .from('fub_notes')
      .select('id, body, occurred_at')
      .eq('person_id', personId)
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase
      .from('fub_appointments')
      .select('id, title, status, starts_at, ends_at')
      .eq('person_id', personId)
      .order('starts_at', { ascending: false })
      .limit(10),
    supabase
      .from('fub_tasks')
      .select('id, type, description, due_at, status, completed_at')
      .eq('person_id', personId)
      .order('due_at', { ascending: false })
      .limit(10),
  ])

  if (!person) {
    return (
      <div className="rounded-2xl border border-[#C84B45]/30 bg-[#1A0F0E] p-5 text-sm text-[#E8907A]">
        Lead no encontrado o no tienes acceso.
      </div>
    )
  }

  const name =
    [person.first_name, person.last_name].filter(Boolean).join(' ').trim() ||
    person.email ||
    `Lead #${person.id}`

  return (
    <section className="rounded-2xl border border-[#C9A84C]/40 bg-gradient-to-br from-[#1A1408] to-[#0F0F0F] p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#F5F0E8]">{name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#D0C8B8]">
            {person.email && <span>✉️ {person.email}</span>}
            {person.phone && <span>📞 {person.phone}</span>}
            {person.source_canonical && (
              <span className="rounded bg-[#C9A84C]/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#C9A84C]">
                {person.source_canonical}
              </span>
            )}
          </div>
        </div>
        <a
          href={`https://app.followupboss.com/people/view/${personId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded-md bg-[#C9A84C] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#E8C868] shadow-[0_2px_14px_rgba(201,168,76,0.35)]"
        >
          Abrir en FUB ↗
        </a>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {deals && deals.length > 0 && (
          <Section title="Deals">
            <ul className="space-y-1.5 text-xs">
              {deals.map((d) => (
                <li key={d.id} className="rounded border border-white/8 bg-white/4 p-2">
                  <div className="font-medium text-[#F5F0E8]">{d.name || `Deal #${d.id}`}</div>
                  <div className="mt-0.5 text-[#9A9080]">
                    {d.value_cents
                      ? `€${Math.round(d.value_cents / 100).toLocaleString()}`
                      : 'sin valor'}{' '}
                    · pipeline {d.pipeline_id}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {appts && appts.length > 0 && (
          <Section title="Citas">
            <ul className="space-y-1.5 text-xs">
              {appts.map((a) => (
                <li key={a.id} className="rounded border border-white/8 bg-white/4 p-2">
                  <div className="font-medium text-[#F5F0E8]">{a.title || 'Cita'}</div>
                  <div className="mt-0.5 text-[#9A9080]">
                    {a.starts_at ? new Date(a.starts_at).toLocaleString('es-ES') : '—'} · {a.status}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {calls && calls.length > 0 && (
          <Section title="Llamadas">
            <ul className="space-y-1.5 text-xs">
              {calls.map((c) => (
                <li key={c.id} className="rounded border border-white/8 bg-white/4 p-2">
                  <span className="font-medium text-[#F5F0E8]">{c.duration_seconds || 0}s</span>{' '}
                  <span className="text-[#9A9080]">
                    · {c.outcome || '—'} ·{' '}
                    {c.occurred_at ? new Date(c.occurred_at).toLocaleString('es-ES') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {tasks && tasks.length > 0 && (
          <Section title="Tareas">
            <ul className="space-y-1.5 text-xs">
              {tasks.map((t) => (
                <li key={t.id} className="rounded border border-white/8 bg-white/4 p-2">
                  <span className="font-medium text-[#F5F0E8]">{t.description || t.type}</span>
                  <div className="mt-0.5 text-[#9A9080]">
                    {t.due_at ? new Date(t.due_at).toLocaleString('es-ES') : 'sin fecha'} · {t.status}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {notes && notes.length > 0 && (
          <Section title="Notas" className="lg:col-span-2">
            <ul className="space-y-1.5 text-xs">
              {notes.map((n) => (
                <li key={n.id} className="rounded border border-white/8 bg-white/4 p-2">
                  <div className="whitespace-pre-wrap text-[#D0C8B8]">{n.body}</div>
                  <div className="mt-1 text-[10px] text-[#9A9080]">
                    {n.occurred_at ? new Date(n.occurred_at).toLocaleString('es-ES') : '—'}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </section>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9A9080]">
        {title}
      </div>
      {children}
    </div>
  )
}
