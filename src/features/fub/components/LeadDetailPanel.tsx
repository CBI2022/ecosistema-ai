import { createClient } from '@/lib/supabase/server'

interface Props {
  personId: number
}

export async function LeadDetailPanel({ personId }: Props) {
  const supabase = await createClient()

  const [{ data: person }, { data: deals }, { data: calls }, { data: notes }, { data: appts }, { data: tasks }] =
    await Promise.all([
      supabase
        .from('fub_people')
        .select('*')
        .eq('id', personId)
        .eq('deleted', false)
        .maybeSingle(),
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
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 text-sm text-red-700">
        Lead no encontrado o no tienes acceso.
      </div>
    )
  }

  const name = [person.first_name, person.last_name].filter(Boolean).join(' ').trim() || person.email || `Lead #${person.id}`

  return (
    <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/30 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">{name}</h2>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-600">
            {person.email && <span>✉️ {person.email}</span>}
            {person.phone && <span>📞 {person.phone}</span>}
            {person.source_canonical && (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium uppercase tracking-wider text-neutral-700">
                {person.source_canonical}
              </span>
            )}
          </div>
        </div>
        <a
          href={`https://app.followupboss.com/people/view/${personId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          Abrir en FUB ↗
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Deals */}
        {deals && deals.length > 0 && (
          <Section title="Deals">
            <ul className="space-y-1.5 text-xs">
              {deals.map((d) => (
                <li key={d.id} className="rounded border border-neutral-200 bg-white p-2">
                  <div className="font-medium">{d.name || `Deal #${d.id}`}</div>
                  <div className="mt-0.5 text-neutral-500">
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

        {/* Appointments */}
        {appts && appts.length > 0 && (
          <Section title="Citas">
            <ul className="space-y-1.5 text-xs">
              {appts.map((a) => (
                <li key={a.id} className="rounded border border-neutral-200 bg-white p-2">
                  <div className="font-medium">{a.title || 'Cita'}</div>
                  <div className="mt-0.5 text-neutral-500">
                    {a.starts_at ? new Date(a.starts_at).toLocaleString('es-ES') : '—'} · {a.status}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Calls */}
        {calls && calls.length > 0 && (
          <Section title="Llamadas">
            <ul className="space-y-1.5 text-xs">
              {calls.map((c) => (
                <li key={c.id} className="rounded border border-neutral-200 bg-white p-2">
                  <span className="font-medium">{c.duration_seconds || 0}s</span>{' '}
                  <span className="text-neutral-500">
                    · {c.outcome || '—'} · {c.occurred_at ? new Date(c.occurred_at).toLocaleString('es-ES') : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Tasks */}
        {tasks && tasks.length > 0 && (
          <Section title="Tareas">
            <ul className="space-y-1.5 text-xs">
              {tasks.map((t) => (
                <li key={t.id} className="rounded border border-neutral-200 bg-white p-2">
                  <span className="font-medium">{t.description || t.type}</span>
                  <div className="mt-0.5 text-neutral-500">
                    {t.due_at ? new Date(t.due_at).toLocaleString('es-ES') : 'sin fecha'} · {t.status}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Notes */}
        {notes && notes.length > 0 && (
          <Section title="Notas" className="lg:col-span-2">
            <ul className="space-y-1.5 text-xs">
              {notes.map((n) => (
                <li key={n.id} className="rounded border border-neutral-200 bg-white p-2">
                  <div className="whitespace-pre-wrap text-neutral-800">{n.body}</div>
                  <div className="mt-1 text-[10px] text-neutral-500">
                    {n.occurred_at ? new Date(n.occurred_at).toLocaleString('es-ES') : '—'}
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
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
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{title}</div>
      {children}
    </div>
  )
}
