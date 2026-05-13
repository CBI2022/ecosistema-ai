-- ============================================================
-- FUB CRM Integration — Schema completo + RLS + Triggers
-- ============================================================
-- Aplicar vía Supabase MCP `apply_migration` o desde SQL Editor.
-- Idempotente: usa "if not exists" / "or replace" donde aplica.
--
-- Pattern: mirror tables. FUB es source of truth, las tablas fub_*
-- son réplica clonada vía webhooks + backfill. El dashboard SOLO
-- lee de Supabase. Service role bypasea RLS — todas las escrituras
-- van por createAdminClient() desde webhook handler / sync / cron.
-- ============================================================

-- ============================================================
-- 1) TABLA PIVOTE: mapping cbi_user ↔ fub_user
-- ============================================================
create table if not exists public.fub_user_map (
  cbi_user_id uuid references auth.users(id) on delete cascade,
  fub_user_id bigint primary key,
  fub_email text not null,                     -- siempre LOWER()
  fub_role text not null,                      -- 'Broker' | 'Agent' | 'Lender'
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cbi_user_id)
);
create index if not exists fub_user_map_email_idx on public.fub_user_map(fub_email);
create index if not exists fub_user_map_cbi_user_idx on public.fub_user_map(cbi_user_id);

-- ============================================================
-- 2) METADATA: pipelines, stages, sources
-- ============================================================
create table if not exists public.fub_pipelines (
  id bigint primary key,
  name text not null,
  synced_at timestamptz not null default now()
);

create table if not exists public.fub_stages (
  id bigint primary key,
  name text not null,
  pipeline_id bigint references public.fub_pipelines(id),
  position int,
  is_branch boolean not null default false,    -- Sphere/Unresponsive/Trash
  synced_at timestamptz not null default now()
);
create index if not exists fub_stages_pipeline_idx on public.fub_stages(pipeline_id);

create table if not exists public.fub_sources (
  id bigserial primary key,
  name text not null unique,
  synced_at timestamptz not null default now()
);

create table if not exists public.fub_source_canonical (
  raw text primary key,                        -- 'Idealista', 'idealista.com', 'IDEALISTA'
  canonical text not null                      -- 'idealista'
);
create index if not exists fub_source_canonical_idx on public.fub_source_canonical(canonical);

-- ============================================================
-- 3) MIRROR TABLES (FUB = source of truth)
-- ============================================================
create table if not exists public.fub_people (
  id bigint primary key,
  assigned_user_id bigint,                     -- FUB user id (no FK rígida para no perder rows)
  stage_id bigint,
  source text,
  source_canonical text,
  first_name text,
  last_name text,
  email text,
  phone text,
  tags text[] default '{}'::text[],
  custom_fields jsonb default '{}'::jsonb,
  last_activity_at timestamptz,
  created_at_fub timestamptz,
  updated_at_fub timestamptz,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);
create index if not exists fub_people_assigned_idx on public.fub_people(assigned_user_id);
create index if not exists fub_people_stage_idx on public.fub_people(stage_id);
create index if not exists fub_people_last_activity_idx on public.fub_people(last_activity_at desc);
create index if not exists fub_people_updated_idx on public.fub_people(updated_at_fub desc);
create index if not exists fub_people_deleted_idx on public.fub_people(deleted);
create index if not exists fub_people_source_canonical_idx on public.fub_people(source_canonical);

create table if not exists public.fub_deals (
  id bigint primary key,
  pipeline_id bigint,
  stage_id bigint,
  person_id bigint references public.fub_people(id) on delete set null,
  assigned_user_id bigint,
  name text,
  value_cents bigint,
  currency text default 'EUR',
  created_at_fub timestamptz,
  updated_at_fub timestamptz,
  closed_at_fub timestamptz,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);
create index if not exists fub_deals_assigned_idx on public.fub_deals(assigned_user_id);
create index if not exists fub_deals_pipeline_stage_idx on public.fub_deals(pipeline_id, stage_id);
create index if not exists fub_deals_person_idx on public.fub_deals(person_id);

create table if not exists public.fub_calls (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  duration_seconds integer default 0,
  outcome text,
  is_conversation boolean generated always as (duration_seconds >= 60) stored,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists fub_calls_user_occurred_idx on public.fub_calls(user_id, occurred_at desc);
create index if not exists fub_calls_person_idx on public.fub_calls(person_id);

create table if not exists public.fub_text_messages (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  direction text,                              -- 'in' | 'out'
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists fub_texts_user_occurred_idx on public.fub_text_messages(user_id, occurred_at desc);

create table if not exists public.fub_emails (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  direction text,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists fub_emails_user_occurred_idx on public.fub_emails(user_id, occurred_at desc);

create table if not exists public.fub_appointments (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  title text,
  status text,                                 -- 'scheduled' | 'held' | 'canceled' | 'no_show'
  starts_at timestamptz,
  ends_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists fub_appts_user_starts_idx on public.fub_appointments(user_id, starts_at desc);
create index if not exists fub_appts_status_idx on public.fub_appointments(status);

create table if not exists public.fub_tasks (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  type text,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  status text,                                 -- 'pending' | 'done' | 'overdue'
  synced_at timestamptz not null default now()
);
create index if not exists fub_tasks_user_due_idx on public.fub_tasks(user_id, due_at);
create index if not exists fub_tasks_status_idx on public.fub_tasks(status);

create table if not exists public.fub_notes (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  user_id bigint,
  body text,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index if not exists fub_notes_person_idx on public.fub_notes(person_id);

create table if not exists public.fub_events (
  id bigint primary key,
  person_id bigint references public.fub_people(id) on delete set null,
  type text,
  source text,
  occurred_at timestamptz,
  payload jsonb default '{}'::jsonb,
  synced_at timestamptz not null default now()
);
create index if not exists fub_events_person_occurred_idx on public.fub_events(person_id, occurred_at desc);
create index if not exists fub_events_type_idx on public.fub_events(type);

-- ============================================================
-- 4) STAGE TRANSITIONS (snapshot histórico — gold para Marco)
-- ============================================================
-- Cada cambio de stage en fub_people se registra aquí. Permite calcular
-- tiempo medio que un lead pasa en cada stage por agente.
create table if not exists public.fub_stage_transitions (
  id bigserial primary key,
  person_id bigint not null references public.fub_people(id) on delete cascade,
  from_stage_id bigint,
  to_stage_id bigint,
  assigned_user_id bigint,
  changed_at timestamptz not null default now()
);
create index if not exists fub_transitions_person_idx on public.fub_stage_transitions(person_id, changed_at desc);
create index if not exists fub_transitions_to_stage_idx on public.fub_stage_transitions(to_stage_id);
create index if not exists fub_transitions_user_idx on public.fub_stage_transitions(assigned_user_id, changed_at desc);

create or replace function public.fub_people_log_stage_transition()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT' and new.stage_id is not null) then
    insert into public.fub_stage_transitions (person_id, from_stage_id, to_stage_id, assigned_user_id)
      values (new.id, null, new.stage_id, new.assigned_user_id);
  elsif (tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id) then
    insert into public.fub_stage_transitions (person_id, from_stage_id, to_stage_id, assigned_user_id)
      values (new.id, old.stage_id, new.stage_id, new.assigned_user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists fub_people_stage_transition on public.fub_people;
create trigger fub_people_stage_transition
  after insert or update of stage_id on public.fub_people
  for each row execute function public.fub_people_log_stage_transition();

-- ============================================================
-- 5) WEBHOOK LOG (idempotencia + observabilidad)
-- ============================================================
create table if not exists public.fub_webhook_log (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,                        -- estable, derivado del payload
  event_type text not null,
  resource_ids bigint[] default '{}'::bigint[],
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending',      -- 'pending' | 'processed' | 'error' | 'skipped'
  error_message text,
  raw_body jsonb
);
create index if not exists fub_webhook_log_received_idx on public.fub_webhook_log(received_at desc);
create index if not exists fub_webhook_log_status_idx on public.fub_webhook_log(status);
create index if not exists fub_webhook_log_event_type_idx on public.fub_webhook_log(event_type);

-- ============================================================
-- 6) RLS — habilitar y declarar policies
-- ============================================================
alter table public.fub_user_map enable row level security;
alter table public.fub_people enable row level security;
alter table public.fub_deals enable row level security;
alter table public.fub_calls enable row level security;
alter table public.fub_text_messages enable row level security;
alter table public.fub_emails enable row level security;
alter table public.fub_appointments enable row level security;
alter table public.fub_tasks enable row level security;
alter table public.fub_notes enable row level security;
alter table public.fub_events enable row level security;
alter table public.fub_stage_transitions enable row level security;
alter table public.fub_pipelines enable row level security;
alter table public.fub_stages enable row level security;
alter table public.fub_sources enable row level security;
alter table public.fub_source_canonical enable row level security;
alter table public.fub_webhook_log enable row level security;

-- Helper: ¿el caller es admin FUB? (security definer evita recursión RLS)
create or replace function public.is_fub_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from public.fub_user_map where cbi_user_id = auth.uid()),
    false
  );
$$;

-- Helper: fub_user_id del caller
create or replace function public.my_fub_user_id() returns bigint
language sql stable security definer set search_path = public as $$
  select fub_user_id from public.fub_user_map where cbi_user_id = auth.uid();
$$;

grant execute on function public.is_fub_admin() to authenticated;
grant execute on function public.my_fub_user_id() to authenticated;

-- ============================================================
-- Policies (drop+create por idempotencia)
-- ============================================================

-- fub_user_map: cada usuario ve su fila, admins ven todas
drop policy if exists "fub_user_map_select" on public.fub_user_map;
create policy "fub_user_map_select" on public.fub_user_map for select
  using (public.is_fub_admin() or cbi_user_id = auth.uid());

-- fub_people: admin ve todo, agente ve solo sus assigned
drop policy if exists "fub_people_select" on public.fub_people;
create policy "fub_people_select" on public.fub_people for select
  using (public.is_fub_admin() or assigned_user_id = public.my_fub_user_id());

-- fub_deals
drop policy if exists "fub_deals_select" on public.fub_deals;
create policy "fub_deals_select" on public.fub_deals for select
  using (public.is_fub_admin() or assigned_user_id = public.my_fub_user_id());

-- fub_calls (user_id = quien hizo la call)
drop policy if exists "fub_calls_select" on public.fub_calls;
create policy "fub_calls_select" on public.fub_calls for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

drop policy if exists "fub_texts_select" on public.fub_text_messages;
create policy "fub_texts_select" on public.fub_text_messages for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

drop policy if exists "fub_emails_select" on public.fub_emails;
create policy "fub_emails_select" on public.fub_emails for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

drop policy if exists "fub_appts_select" on public.fub_appointments;
create policy "fub_appts_select" on public.fub_appointments for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

drop policy if exists "fub_tasks_select" on public.fub_tasks;
create policy "fub_tasks_select" on public.fub_tasks for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

drop policy if exists "fub_notes_select" on public.fub_notes;
create policy "fub_notes_select" on public.fub_notes for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

-- fub_events: visibilidad heredada de la persona
drop policy if exists "fub_events_select" on public.fub_events;
create policy "fub_events_select" on public.fub_events for select
  using (
    public.is_fub_admin() or
    exists (
      select 1 from public.fub_people p
      where p.id = fub_events.person_id
        and p.assigned_user_id = public.my_fub_user_id()
    )
  );

-- fub_stage_transitions: visibilidad heredada por assigned_user_id
drop policy if exists "fub_transitions_select" on public.fub_stage_transitions;
create policy "fub_transitions_select" on public.fub_stage_transitions for select
  using (public.is_fub_admin() or assigned_user_id = public.my_fub_user_id());

-- Metadata (pipelines, stages, sources, canonical): lectura para todo authenticated
drop policy if exists "fub_pipelines_read" on public.fub_pipelines;
create policy "fub_pipelines_read" on public.fub_pipelines for select using (auth.role() = 'authenticated');

drop policy if exists "fub_stages_read" on public.fub_stages;
create policy "fub_stages_read" on public.fub_stages for select using (auth.role() = 'authenticated');

drop policy if exists "fub_sources_read" on public.fub_sources;
create policy "fub_sources_read" on public.fub_sources for select using (auth.role() = 'authenticated');

drop policy if exists "fub_source_canonical_read" on public.fub_source_canonical;
create policy "fub_source_canonical_read" on public.fub_source_canonical for select using (auth.role() = 'authenticated');

-- fub_webhook_log: SOLO admin
drop policy if exists "fub_webhook_log_select" on public.fub_webhook_log;
create policy "fub_webhook_log_select" on public.fub_webhook_log for select
  using (public.is_fub_admin());

-- ============================================================
-- 7) Helper view: fub_people enriquecido con canonical source y stage name
-- ============================================================
create or replace view public.v_fub_people_enriched as
  select
    p.*,
    s.name as stage_name,
    s.is_branch as stage_is_branch,
    coalesce(p.source_canonical, c.canonical, p.source) as source_display
  from public.fub_people p
  left join public.fub_stages s on s.id = p.stage_id
  left join public.fub_source_canonical c on lower(c.raw) = lower(p.source);

-- ============================================================
-- 8) Comments para documentación
-- ============================================================
comment on table public.fub_user_map is 'Mapping CBI auth.users ↔ FUB user. is_admin override define vista admin del dashboard.';
comment on table public.fub_people is 'Mirror de FUB people. Lectura única vía RLS por assigned_user_id.';
comment on table public.fub_webhook_log is 'Log de webhooks FUB para idempotencia (event_id UNIQUE) y observabilidad.';
comment on table public.fub_stage_transitions is 'Histórico de cambios de stage. Permite calcular tiempo medio en cada stage por agente.';
comment on function public.is_fub_admin() is 'Helper RLS: true si el caller tiene is_admin=true en fub_user_map. Security definer evita recursión.';
