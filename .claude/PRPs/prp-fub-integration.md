# PRP-FUB: Integración Follow Up Boss CRM al Dashboard CBI ECO AI

> **Estado**: IMPLEMENTADO (código) · PENDIENTE de aplicar migración + linkear webhooks en producción
> **Fecha**: 2026-05-13
> **Proyecto**: ecosistema-ai (CBI ECO AI)
> **Typecheck**: ✅ pasa (`tsc --noEmit`)

---

## Objetivo

Integrar Follow Up Boss (FUB) como fuente de verdad del pipeline de ventas inmobiliarias, clonando sus datos a Supabase vía webhooks + backfill paginado, y exponer en el dashboard de cada agente sus leads, actividad diaria y métricas reales (calls, follow-ups, citas, closings, captaciones) contra los goals definidos en el onboarding de CBI. El dashboard solo lee de Supabase (mirror), nunca de FUB en runtime.

## Por Qué

| Problema | Solución |
|----------|----------|
| Los goals del onboarding de CBI (income, closings, captaciones, citas, llamadas, follow-ups) hoy se miden a ojo o no se miden — el dashboard solo registra el outcome final (revenue manual) sin los leading indicators que lo predicen | FUB ya trackea NATIVAMENTE esas mismas métricas: 2.249 leads, 52 deals activos, pipelines maduros configurados. Clonarlas a Supabase cierra el bucle leading→lagging |
| "Daily Action Plan vacío 0/0" — bug pendiente del CONTEXT_LOG | TodayTasks autopopula con tasks reales de FUB con dueDate hoy/vencidas |
| Marco no puede ver actividad por agente sin meterse a FUB manualmente; no se puede separar Activity Leaderboard (motivador, visible) del Revenue Leaderboard (privacidad sensible) | ActivityLeaderboard y ConversionFunnel admin permiten visibilidad agregada sin exponer revenue individual |
| Speed-to-lead no se mide → leads inbound se enfrían sin que nadie lo note | SpeedToLead widget mide mediana real de minutos entre `person.created` y primer contacto |

**Valor de negocio**: 17 agentes con goals concretos y métricas trackeables en tiempo real → conversión Lead→Closing aumenta al hacer visibles los bottlenecks. Tabla rasa de webhooks (0 registrados) permite arquitectura limpia desde el día 1.

## Qué

### Criterios de Éxito
- [ ] Backfill inicial trae los 2.249 people + 52 deals + 90 días de actividad (calls, texts, emails, appointments, tasks) sin errores
- [ ] Webhooks de FUB llegan a `/api/webhooks/fub` y actualizan Supabase en <5 segundos desde el cambio en FUB
- [ ] Agente abre `/dashboard` y ve: su pipeline kanban con los 10 stages reales, ActivityStatsBar con calls/texts/emails/appointments de hoy y semana vs goal del onboarding, HotList, StalledLeads y TodayTasks autopopulado
- [ ] Admin (Marco/Bruno/Darcy) abre `/admin/fub` y ve: ActivityLeaderboard semanal, ConversionFunnel global y por agente, SpeedToLead (mediana min), SourceROI, CaptacionesPipeline (pipeline Sellers)
- [ ] Cron diario `/api/cron/fub-reconcile` detecta IDs en FUB ausentes en Supabase y los repesca; 0 desincronizaciones tras el primer mes
- [ ] Cero exposición cross-agent: agente A no ve leads/deals/calls/appointments del agente B (verificable con Playwright E2E firmando como dos cuentas distintas)
- [ ] Página admin tiene botón "Resync forzado" funcional, log de webhooks y health check (último webhook recibido)

### Comportamiento Esperado

**Happy path Fase 2 (sync):**
1. Admin entra a `/admin/fub` y pulsa "Resync forzado" → server action `syncFubFromZero({ since: 90d })` arranca
2. El cliente FUB pagina `/v1/people?limit=100&offset=…` (23 páginas) con rate limit 10 req/s; cada página se upsertea a `fub_people` con email normalizado a `LOWER()`
3. Itera deals, calls, appointments, tasks, notes filtrando por `updated >= since`
4. Al terminar, suscribe webhooks (`POST /v1/webhooks`) a los 14 eventos relevantes con `url=<APP_URL>/api/webhooks/fub` y `secret=<FUB_WEBHOOK_SECRET>` (autogenerado y guardado en env)

**Happy path runtime:**
1. Agente cambia stage de un lead en FUB → FUB dispara webhook `peopleUpdated` con solo el `personId`
2. Endpoint `/api/webhooks/fub` valida HMAC-SHA1 del header `FUB-Signature`, deduplica vía `fub_webhook_log.event_id`, encola fetch de la persona completa respetando rate limit
3. Upsert en `fub_people`; trigger SQL recalcula stats agregadas si aplica
4. Agente recarga `/dashboard` → PipelineKanban refleja el cambio (lee solo de Supabase con RLS por `assignedUserId` mapeado vía `fub_user_map`)

---

## Contexto

### Referencias

**Patrones del codebase a reutilizar:**
- `src/app/api/webhooks/youtube/route.ts` — verificación HMAC-SHA1 con `timingSafeEqual`, `webhookRateLimit`, manejo de challenge GET
- `src/app/api/webhooks/opus-clip/route.ts` — webhook con HMAC-SHA256 + payload JSON + upsert + manejo de "source not found"
- `src/app/api/cron/publish-scheduled/route.ts` — cron con `Bearer CRON_SECRET`, lectura batch, marcado `running`→`done`/`error`, declarado en `vercel.json`
- `src/actions/sooprema.ts` — server actions con `createClient()` + `createAdminClient()`, validación de auth, audit log, fire-and-forget de tareas largas
- `docs/sql/youtube_connections.sql` — patrón RLS `select_own` + `modify_own` usando `auth.uid()`
- `src/lib/rate-limit.ts` — rate limiter en memoria reutilizable (`webhookRateLimit`)
- `src/lib/supabase/admin.ts` y `server.ts` — clientes Supabase (admin bypasea RLS, server respeta RLS)
- `src/actions/push.ts` + `src/actions/notifications.ts` — disparar push/in-app notifications

**Stack ya en proyecto:**
- Next.js 16 + React 19 + TS, Supabase, Zod, Zustand, next-intl 4.9.1
- `vercel.json` ya tiene `maxDuration: 300s` para todas las rutas en `src/app/api/**` → el backfill cabe en una sola invocación

**APIs externas:**
- FUB API v1: `https://api.followupboss.com/v1` — Basic Auth (API key como username, password vacío), headers `X-System: CBI-ECO-AI` y `X-System-Key` opcional
- Endpoints clave: `/v1/people`, `/v1/deals`, `/v1/calls`, `/v1/textMessages`, `/v1/em`, `/v1/appointments`, `/v1/tasks`, `/v1/notes`, `/v1/events`, `/v1/stages`, `/v1/pipelines`, `/v1/users`, `/v1/webhooks`
- Webhooks: payload mínimo `{ event: 'peopleUpdated', resourceIds: [123] }` + header `FUB-Signature: sha1=<hex>` → siempre requiere refetch
- Rate limit FUB: ~10 req/s sostenido

### Arquitectura Propuesta (Feature-First)

```
src/
├── lib/fub/
│   ├── client.ts              # Cliente tipado, Basic Auth, rate limiter, retry+backoff
│   ├── webhooks.ts            # Subscribe/unsubscribe + HMAC verify
│   ├── mapper.ts              # FUB person/deal/call → row Supabase
│   ├── normalize.ts           # LOWER(email), canonical sources
│   └── types.ts               # Tipos de la API FUB
│
├── actions/fub.ts             # Server actions: syncFubFromZero, refetchPerson,
│                              # resyncForced, healthCheck, getUserStats, etc.
│
├── app/api/webhooks/fub/
│   └── route.ts               # POST: HMAC + dedup + enqueue refetch
│
├── app/api/cron/fub-reconcile/
│   └── route.ts               # Diario: detecta IDs faltantes y repesca
│
├── app/admin/fub/             # UI admin
│   └── page.tsx
│
├── app/(main)/leads/          # Nueva ruta pipeline completo agente
│   └── page.tsx
│
└── features/fub/
    ├── components/
    │   ├── ActivityStatsBar.tsx
    │   ├── PipelineKanban.tsx
    │   ├── HotList.tsx
    │   ├── StalledLeads.tsx
    │   ├── TodayTasks.tsx
    │   ├── ActivityLeaderboard.tsx
    │   ├── ConversionFunnel.tsx
    │   ├── SpeedToLead.tsx
    │   ├── SourceROI.tsx
    │   └── CaptacionesPipeline.tsx
    ├── hooks/
    │   ├── useAgentStats.ts
    │   └── usePipeline.ts
    ├── services/              # Wrappers de las server actions
    └── types/                 # Tipos de UI (no confundir con lib/fub/types.ts)
```

### Modelo de Datos

```sql
-- ============================================================
-- TABLA PIVOTE: mapping cbi_user ↔ fub_user
-- ============================================================
create table if not exists public.fub_user_map (
  cbi_user_id uuid primary key references auth.users(id) on delete cascade,
  fub_user_id bigint not null unique,
  fub_email text not null,                     -- siempre LOWER()
  fub_role text not null,                      -- 'Broker' | 'Agent'
  is_admin boolean not null default false,     -- override CBI: brokers Bruno/Darcy/(Sofia?)
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.fub_user_map(fub_user_id);
create index on public.fub_user_map(fub_email);

-- ============================================================
-- MIRROR TABLES (FUB = source of truth)
-- ============================================================
create table if not exists public.fub_people (
  id bigint primary key,                       -- FUB person id
  assigned_user_id bigint references public.fub_user_map(fub_user_id),
  stage_id bigint,
  source text,
  source_canonical text,                       -- normalizado vía fub_source_canonical
  first_name text, last_name text, email text, phone text,
  tags text[],
  custom_fields jsonb default '{}'::jsonb,
  last_activity_at timestamptz,
  created_at_fub timestamptz,
  updated_at_fub timestamptz,
  deleted boolean not null default false,      -- soft delete
  synced_at timestamptz not null default now()
);
create index on public.fub_people(assigned_user_id);
create index on public.fub_people(stage_id);
create index on public.fub_people(last_activity_at desc);
create index on public.fub_people(updated_at_fub desc);

create table if not exists public.fub_deals (
  id bigint primary key,
  pipeline_id bigint,
  stage_id bigint,
  person_id bigint references public.fub_people(id),
  assigned_user_id bigint references public.fub_user_map(fub_user_id),
  name text,
  value_cents bigint,
  currency text default 'EUR',
  created_at_fub timestamptz,
  updated_at_fub timestamptz,
  closed_at_fub timestamptz,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);
create index on public.fub_deals(assigned_user_id);
create index on public.fub_deals(pipeline_id, stage_id);

create table if not exists public.fub_calls (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  duration_seconds integer,
  outcome text,
  is_conversation boolean generated always as (duration_seconds >= 60) stored,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index on public.fub_calls(user_id, occurred_at desc);

create table if not exists public.fub_text_messages (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  direction text,                              -- 'in' | 'out'
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index on public.fub_text_messages(user_id, occurred_at desc);

create table if not exists public.fub_emails (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  direction text,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);
create index on public.fub_emails(user_id, occurred_at desc);

create table if not exists public.fub_appointments (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  title text,
  status text,                                 -- 'scheduled' | 'held' | 'canceled' | 'no_show'
  starts_at timestamptz,
  ends_at timestamptz,
  synced_at timestamptz not null default now()
);
create index on public.fub_appointments(user_id, starts_at desc);

create table if not exists public.fub_tasks (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  type text,
  description text,
  due_at timestamptz,
  completed_at timestamptz,
  status text,                                 -- 'pending' | 'done' | 'overdue'
  synced_at timestamptz not null default now()
);
create index on public.fub_tasks(user_id, due_at);

create table if not exists public.fub_notes (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  user_id bigint references public.fub_user_map(fub_user_id),
  body text,
  occurred_at timestamptz,
  synced_at timestamptz not null default now()
);

create table if not exists public.fub_events (
  id bigint primary key,
  person_id bigint references public.fub_people(id),
  type text,                                   -- 'Inquiry', 'Registration', etc.
  source text,
  occurred_at timestamptz,
  payload jsonb,
  synced_at timestamptz not null default now()
);
create index on public.fub_events(person_id, occurred_at desc);

-- ============================================================
-- METADATA TABLES (seed + sync ligero)
-- ============================================================
create table if not exists public.fub_stages (
  id bigint primary key,
  name text not null,
  pipeline_id bigint,
  position int,
  is_branch boolean default false              -- Sphere/Unresponsive/Trash
);

create table if not exists public.fub_pipelines (
  id bigint primary key,
  name text not null
);

create table if not exists public.fub_sources (
  id bigint primary key,
  name text not null
);

create table if not exists public.fub_source_canonical (
  raw text primary key,                        -- 'Idealista', 'idealista.com', 'IDEALISTA'
  canonical text not null                      -- 'idealista'
);

-- ============================================================
-- WEBHOOK LOG (idempotencia + observabilidad)
-- ============================================================
create table if not exists public.fub_webhook_log (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,                        -- FUB event identifier (header o body)
  event_type text not null,
  resource_ids bigint[],
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending',      -- 'pending' | 'processed' | 'error'
  error_message text,
  raw_body jsonb
);
create index on public.fub_webhook_log(received_at desc);
create index on public.fub_webhook_log(status);

-- ============================================================
-- RLS
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

-- Helper: ¿el caller es admin?
create or replace function public.is_fub_admin() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_admin from public.fub_user_map where cbi_user_id = auth.uid()),
    false
  );
$$;

-- Helper: fub_user_id del caller
create or replace function public.my_fub_user_id() returns bigint
language sql stable security definer as $$
  select fub_user_id from public.fub_user_map where cbi_user_id = auth.uid();
$$;

-- Policy genérica para tablas con assigned_user_id / user_id
create policy "fub_people_select" on public.fub_people for select
  using (public.is_fub_admin() or assigned_user_id = public.my_fub_user_id());

create policy "fub_deals_select" on public.fub_deals for select
  using (public.is_fub_admin() or assigned_user_id = public.my_fub_user_id());

create policy "fub_calls_select" on public.fub_calls for select
  using (public.is_fub_admin() or user_id = public.my_fub_user_id());

-- (idéntico patrón para text_messages, emails, appointments, tasks, notes)

-- Eventos: visibilidad por persona heredada
create policy "fub_events_select" on public.fub_events for select
  using (
    public.is_fub_admin() or
    exists (select 1 from public.fub_people p
            where p.id = fub_events.person_id
              and p.assigned_user_id = public.my_fub_user_id())
  );

-- fub_user_map: cada usuario ve su fila; admins ven todas
create policy "fub_user_map_select" on public.fub_user_map for select
  using (public.is_fub_admin() or cbi_user_id = auth.uid());

-- Service role bypasea RLS — todas las escrituras desde sync/webhook usan createAdminClient()
```

### Variables de entorno (ya configuradas en `.env.local`)

```
FUB_API_KEY=fka_xxx                       # configurada ✅
FUB_X_SYSTEM=CBI-ECO-AI
FUB_X_SYSTEM_KEY=                         # opcional, partner key
FUB_WEBHOOK_SECRET=                       # se rellena en Fase 2 al crear webhooks
FUB_API_BASE_URL=https://api.followupboss.com/v1
CRON_SECRET=                              # ya existe (publish-scheduled lo usa)
```

### Cron a declarar en `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/publish-scheduled", "schedule": "* * * * *" },
    { "path": "/api/cron/fub-reconcile", "schedule": "0 4 * * *" }
  ]
}
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar).

### Fase 1: Fundación (cliente + esquema + seed)
**Objetivo**: Cliente FUB tipado funcionando + schema completo en Supabase con RLS habilitada + 17 usuarios mapeados + stages/pipelines reales sembrados.
**Validación**:
- `npm run typecheck` pasa con `src/lib/fub/client.ts` y `types.ts`
- Migración aplicada vía Supabase MCP: las 14 tablas existen con RLS ON
- `SELECT count(*) FROM fub_user_map` = 17
- `SELECT count(*) FROM fub_stages` >= 10 (los reales: Lead, A-Hot, B-Warm, C-Cold, Viewings, Pending, Closed, Sphere, Unresponsive, Trash)
- `SELECT count(*) FROM fub_pipelines` = 2 (Buyers, Sellers)
- Llamada de prueba `client.getMe()` devuelve cuenta `Costa Blanca Investments` (account_id 1678909989)

### Fase 2: Sync (backfill + webhooks + cron)
**Objetivo**: Datos clonados de FUB a Supabase con sync en tiempo real y mecanismo de reconciliación.
**Validación**:
- `syncFubFromZero({ since: '90d' })` completa sin errores; `fub_people >= 2249`, `fub_deals >= 52`, calls/appointments/tasks de los últimos 90 días presentes
- `POST /api/webhooks/fub` con header `FUB-Signature` válido inserta fila en `fub_webhook_log` con `status='processed'`; con firma inválida responde 401
- Reenvío idempotente: dos POSTs con mismo `event_id` → solo se procesa uno
- `GET /v1/webhooks` (vía cliente) lista 14 webhooks registrados apuntando a `https://app.costablancainvestments.com/api/webhooks/fub`
- Cambiar manualmente el stage de un lead en FUB → en <5s la fila en `fub_people` refleja el nuevo `stage_id`
- Cron `/api/cron/fub-reconcile` con `Bearer CRON_SECRET` responde 200 y reporta deltas detectados

### Fase 3: UI Agente + UI Admin
**Objetivo**: Dashboard del agente muestra su pipeline y actividad reales contra goals; admin tiene la vista agregada (leaderboard, funnel, speed-to-lead, source ROI, captaciones).
**Validación**:
- Login como agente (ej. Karina) en `/dashboard`:
  - `ActivityStatsBar` muestra calls/conversations/texts/emails/appointments de hoy y semana con barras vs goal mensual del onboarding
  - `PipelineKanban` lista columnas por stage real con counts > 0
  - `HotList` y `StalledLeads` renderizan al menos 1 fila cada uno (con la data real)
  - `TodayTasks` muestra tasks con `due_at <= now()` (resuelve "Daily Action Plan 0/0")
- Login como admin (Marco/Bruno/Darcy) en `/admin/fub`:
  - `ActivityLeaderboard` ordena 14 agentes por actividad de la semana
  - `ConversionFunnel` muestra 3 ratios (Lead→Appointment, Appointment→Offer, Offer→Closing)
  - `SpeedToLead` renderiza mediana en minutos global y por agente
  - `SourceROI` lista al menos 5 sources canonicalizados con conteo de leads y closings
  - `CaptacionesPipeline` muestra los 6 stages del pipeline Sellers
- Nueva ruta `/leads` accesible y renderiza pipeline completo del agente
- Decisión Marco sobre Sofia Moya documentada en Knowledge — Fase desbloqueada para ActivityLeaderboard

### Fase 4: Robustez, Admin y E2E
**Objetivo**: Panel admin operativo, normalización de sources, soft deletes manejados, test E2E que cubre el ciclo completo y no permite leaks entre agentes.
**Validación**:
- `/admin/fub` muestra: log de webhooks (paginado, últimos 100), tabla `fub_user_map` editable, botón "Resync forzado" funcional, health check con timestamp del último webhook procesado
- `fub_source_canonical` poblada manualmente con los aliases observados (Idealista, idealista.com, IDEALISTA → `idealista`, etc.); `SELECT source_canonical FROM fub_people WHERE source = 'IDEALISTA'` devuelve `idealista`
- Webhook con `deleted=true` en payload marca `fub_people.deleted=true` y desaparece de UI
- Playwright E2E (`tests/fub.spec.ts`): script firma como Agente A, screenshotea su pipeline, fuerza navegar a `/leads?personId=<lead_de_agente_B>`, verifica que no se renderiza ni en URL directa ni en API; cierra sesión y firma como Agente B para validar visibilidad inversa

### Fase N: Validación Final
**Objetivo**: Sistema funcionando end-to-end en producción.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] `npm run lint` sin errores
- [ ] Playwright E2E pasa
- [ ] `vercel.json` actualizado con el cron `fub-reconcile`
- [ ] Variables de entorno en Vercel production: `FUB_API_KEY`, `FUB_WEBHOOK_SECRET`, `FUB_X_SYSTEM`, `CRON_SECRET`
- [ ] Knowledge actualizado con: decisión Sofia Moya, mapping de los 17 usuarios, IDs de stages/pipelines reales, normalización de sources
- [ ] Todos los criterios de éxito de "Qué" están marcados ✅

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

> Esta sección CRECE con cada error encontrado durante la implementación.
> El conocimiento persiste para futuros PRPs. El mismo error NUNCA ocurre dos veces.

### 2026-05-13: Early returns con shape distinto rompen narrowing
- **Error**: `getSpeedToLead` tenía early return `{ scope, overall_median_min: null, by_user: [] }` sin la propiedad `sample_size`. TS infirió el tipo como unión y `sample_size` quedó `number | undefined`, rompiendo el caller.
- **Fix**: TODAS las ramas de retorno de una función deben tener exactamente las mismas propiedades. Si una rama no tiene datos, devolver el campo con su valor "vacío" (0, null, []).
- **Aplicar en**: cualquier server action que tenga early returns por "sin datos" — uniformar el shape.

### 2026-05-13: `supabase.from(...).select(...)` cambia el tipo del query builder
- **Error**: Helper genérico `filter: (q: ReturnType<typeof supabase.from>) => …` falló porque `supabase.from('x')` es `PostgrestQueryBuilder` pero tras `.select(...)` es `PostgrestFilterBuilder` — no son compatibles.
- **Fix**: NO crear helpers polimórficos sobre el query builder. En su lugar, construir cada query como variable separada y aplicar `.eq(...)` condicional mutando la variable.
- **Aplicar en**: cualquier server action con queries condicionales por rol/parámetro.

### 2026-05-13: `tests/` debe excluirse del tsconfig si no se instala `@playwright/test`
- **Error**: `tsc --noEmit` falló porque tests/fub.spec.ts importaba `@playwright/test` pero solo está instalado `playwright` (sin `/test`).
- **Fix**: añadir `"tests/**"` al `exclude` de tsconfig.json. Los E2E corren con su propio runner y no participan del typecheck de Next.
- **Aplicar en**: cualquier proyecto donde Playwright se use solo para automation scripts, no para test runner.

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] **Webhooks de FUB SOLO mandan el ID**, no payload completo → 1 webhook = 1 API call. Debe haber un rate limiter global compartido entre webhook handler, backfill y cron de reconciliación (no múltiples buckets independientes)
- [ ] **`peopleUpdated` no dice qué cambió** → upsert completo o diff manual contra la fila actual antes de escribir
- [ ] **Eventos vs People**: leads inbound de portales (Idealista, etc.) llegan como `event`, NO como `person`. Suscribirse a `eventsCreated` o perderemos leads del día 1
- [ ] **Soft deletes**: FUB marca con `deleted=true`, no borra. Las queries de UI deben filtrar `deleted=false` por defecto
- [ ] **Mapping por email**: los emails en FUB tienen mayúsculas inconsistentes (`Bruno@`, `Karina@`, `Marek@`, `Ivana@`) — normalizar `LOWER(email)` SIEMPRE al insertar y al hacer match
- [ ] **Time zones**: FUB devuelve ISO 8601 UTC. Guardar `timestamptz`. Agrupar por día en `Europe/Madrid` (cuidado con DST en marzo/octubre)
- [ ] **Custom fields**: guardar como JSONB en `fub_people.custom_fields` (no aplanar a columnas — FUB permite añadir custom fields dinámicamente)
- [ ] **Idempotencia de webhooks**: FUB reintenta hasta 24h en fallos. Tabla `fub_webhook_log.event_id` UNIQUE para deduplicar. Si la fila ya existe → responder 200 y skip
- [ ] **Sofia Moya**: Broker en FUB pero rol en CBI Dashboard pendiente decisión de Marco. Fase 3 bloqueada para la lógica de `ActivityLeaderboard` admin view SOLO si Sofia debe aparecer. Fases 1-2 NO se ven afectadas (su fila se siembra en `fub_user_map` con `is_admin` por confirmar)
- [ ] **Basic Auth**: la API key va como username Base64-encoded `Basic ${btoa(API_KEY + ':')}`. Password vacío. NO confundir con Bearer token
- [ ] **Vercel maxDuration**: `vercel.json` ya tiene 300s para `/api/**`. El backfill cabe (estimado 2-5 min) pero si crece a >5min hay que partir en cursor + cola, no en una sola request
- [ ] **`createAdminClient` solo en server**: webhooks y crons usan service_role (bypasea RLS). Server actions del agente usan `createClient()` (respeta RLS). Nunca mezclar
- [ ] **HMAC: `timingSafeEqual` requiere buffers del mismo length** → comparar longitudes antes (ver `src/app/api/webhooks/youtube/route.ts:25`)
- [ ] **FUB tiene 2 endpoints de email**: `/v1/em` (alias) y `/v1/emails`. Verificar el correcto al implementar el cliente
- [ ] **RLS Postgres function `is_fub_admin()`** debe declararse `security definer` o el caller no podrá leer su propia fila de `fub_user_map` desde la policy (recursión)

## Anti-Patrones

- NO leer de la API de FUB en runtime del dashboard. SIEMPRE leer de Supabase. La API se toca solo en backfill, webhook handler, cron, y server actions de admin (resync)
- NO crear nuevos patrones de webhook/cron — copiar la estructura exacta de `youtube/route.ts` y `publish-scheduled/route.ts`
- NO hardcodear los IDs de stages/pipelines en el código UI — leerlos de `fub_stages` y `fub_pipelines` por nombre o pipeline_id
- NO ignorar errores de TypeScript ni usar `any` (usar `unknown` + Zod parse)
- NO omitir validación HMAC en producción aunque "todavía no haya tráfico real" — implementarla desde el día 1 (lección de YouTube webhook que aceptaba sin secret)
- NO escribir directamente a `fub_*` desde server actions del agente — todas las escrituras pasan por el flow webhook/backfill con `createAdminClient`
- NO hacer drag&drop de stages en Fase 3 (out of scope MVP)
- NO sincronizar bidireccional FUB ↔ Dashboard (read-only en este PRP)
- NO duplicar lógica de "agente puede ver X" entre UI y RLS — la RLS es la fuente de verdad. UI confía en lo que Supabase devuelve

---

## Out of Scope (NO incluido en este PRP)

- Drag & drop en `PipelineKanban` para cambiar stage (post-MVP)
- Crear/editar leads desde el dashboard hacia FUB (sync bidireccional)
- Integración con Smart Lists de FUB (se replican como vistas en código, no como objeto sincronizado)
- Action Plans status / triggers
- Llamar/textear directamente desde el dashboard (click-to-call)

---

*PRP pendiente aprobación. No se ha modificado código.*
