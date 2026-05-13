# Follow Up Boss CRM Integration — Operations Manual

> Cómo desplegar, operar y debuggear la integración con Follow Up Boss.

## Resumen

- **Pattern:** mirror tables en Supabase. FUB = source of truth, dashboard solo lee de Supabase.
- **Sync:** backfill paginado inicial + webhooks delta en tiempo real + cron diario de reconciliación.
- **Auth:** API key única de cuenta (no OAuth per-user).
- **Read-only:** el dashboard no escribe a FUB en este MVP.

---

## Despliegue inicial (one-time)

### 1. Variables de entorno

Ya están en [`.env.local`](../.env.local) para desarrollo. Para Vercel production añadir:

```
FUB_API_KEY=fka_...                # generada en FUB UI → Admin → API
FUB_X_SYSTEM=CBI-ECO-AI
FUB_X_SYSTEM_KEY=                  # opcional (partner key)
FUB_WEBHOOK_SECRET=                # ver paso 4
FUB_API_BASE_URL=https://api.followupboss.com/v1
CRON_SECRET=...                    # ya existe
```

### 2. Aplicar el schema

```bash
# Vía Supabase MCP (preferido)
# apply_migration con el contenido de docs/sql/fub_integration.sql

# o vía SQL editor del dashboard de Supabase
psql ... -f docs/sql/fub_integration.sql
```

Verificar:

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name LIKE 'fub_%';
-- Debe ser 14
```

### 3. Aplicar el seed

```bash
psql ... -f docs/sql/fub_seed.sql
```

Verifica:

```sql
SELECT count(*) FROM fub_user_map;     -- 17
SELECT count(*) FROM fub_stages;       -- 10
SELECT count(*) FROM fub_pipelines;    -- 2
```

### 4. Link profiles ↔ FUB

Login como admin → `/admin/fub` → botón **🔗 Link profiles ↔ FUB**.
Esto rellena `fub_user_map.cbi_user_id` haciendo match por email. Los emails sin match se reportan para resolver manualmente.

### 5. Backfill inicial

`/admin/fub` → **⚡ Resync forzado (90d)** → tarda 2-5 minutos.

Verifica:

```sql
SELECT
  (SELECT count(*) FROM fub_people WHERE deleted=false) AS people,
  (SELECT count(*) FROM fub_deals WHERE deleted=false)  AS deals,
  (SELECT count(*) FROM fub_calls)                       AS calls;
```

Deben coincidir aproximadamente con los volúmenes en FUB (2.249 people, 52 deals al momento del PRP).

### 6. Subscribe webhooks

`/admin/fub` → **✅ Subscribe webhooks**.

Crea 15 subscriptions en FUB apuntando a `${SITE_URL}/api/webhooks/fub`. Cada una con su HMAC secret.

> ⚠️ **IMPORTANTE:** la API de FUB devuelve un `secret` solo en la **respuesta de creación** de cada webhook. Para que la verificación HMAC funcione, hay que copiar el secret del primer webhook que devuelva FUB y ponerlo en `FUB_WEBHOOK_SECRET`. Todos los webhooks de la misma cuenta comparten el mismo secret. Si pierdes el secret, hay que **unsubscribe + subscribe** de nuevo.

### 7. Verificar webhooks llegando

Cambia el stage de un lead en FUB UI. En <10s debería aparecer una fila nueva en `fub_webhook_log` con `status='processed'` y el cambio reflejado en `fub_people`.

```sql
SELECT event_type, status, received_at, processed_at
FROM fub_webhook_log
ORDER BY received_at DESC LIMIT 10;
```

### 8. Activar cron

El cron `/api/cron/fub-reconcile` está declarado en `vercel.json` a las **04:00 UTC** (06:00 Madrid en verano, 05:00 en invierno). Vercel lo dispara automáticamente.

---

## Arquitectura

```
                   ┌─────────────────┐
                   │  FUB API        │
                   │  api.followupboss.com │
                   └────────┬────────┘
                            │
            ┌───────────────┼───────────────┐
            │ webhooks      │ backfill +    │ cron diario
            │ (ID only)     │ refetch       │ reconcile
            ▼               ▼               ▼
   ┌────────────────┐  ┌────────────────────────────┐
   │ /api/webhooks/ │  │ src/actions/fub.ts         │
   │ fub/route.ts   │  │ - syncFubFromZero          │
   │ - HMAC verify  │  │ - refetchResource          │
   │ - idempotent   │  │ - subscribe/unsubscribe    │
   │ - refetch      │  │ - linkProfilesToFub        │
   └────────┬───────┘  └────────────┬───────────────┘
            │                       │
            ▼                       ▼
   ┌─────────────────────────────────────────┐
   │ Supabase: 14 tablas fub_* + RLS         │
   │ - fub_people, fub_deals, fub_calls...   │
   │ - fub_user_map (mapping CBI ↔ FUB)      │
   │ - fub_webhook_log (idempotencia)        │
   │ - fub_stage_transitions (snapshot)      │
   └────────────┬────────────────────────────┘
                │ RLS aplica: agent → solo su data
                ▼
   ┌─────────────────────────────────────────┐
   │ Dashboard UI (read-only)                │
   │ - /dashboard → FubDashboardSection      │
   │ - /leads     → PipelineKanban + detail  │
   │ - /admin/fub → métricas agregadas       │
   └─────────────────────────────────────────┘
```

---

## Componentes UI

### Agente (en `/dashboard` y `/leads`)

| Componente | Qué muestra |
|---|---|
| `ActivityStatsBar` | Calls / Conversations (>60s) / Mensajes / Citas held / Nuevos leads — hoy/semana/mes vs goal del onboarding |
| `PipelineKanban` | Leads agrupados por los 10 stages reales con drill-down a detalle |
| `HotList` | Stage A-Hot O última actividad <48h sin appointment |
| `StalledLeads` | Sin contacto en ≥14 días (configurable) |
| `TodayTasks` | Tasks de FUB con due_at hoy/vencidas |
| `LeadDetailPanel` | Vista expandida: deals, calls, citas, tasks, notes — con link a FUB |

### Admin (en `/admin/fub`)

| Componente | Qué muestra |
|---|---|
| `FubAdminPanel` | Health, acciones (resync/subscribe/link), tabla de mapping editable, log de webhooks |
| `ActivityLeaderboard` | Ranking semanal por agente con score ponderado |
| `ConversionFunnel` | Lead → Cita → Oferta → Closing con % de conversión |
| `SpeedToLead` | Mediana minutos del primer contacto, global y por agente |
| `SourceROI` | Leads + closings + revenue por source canonicalizado |
| `CaptacionesPipeline` | Pipeline Sellers de FUB = funnel real de captaciones |
| Stage transitions stats | Tiempo medio que un lead pasa en cada stage |

---

## Operaciones comunes

### Resincronizar todo desde cero

```
/admin/fub → Resync 12 meses
```

### Reset completo de webhooks (rotar secret)

```
/admin/fub → Unsubscribe webhooks
            → Subscribe webhooks
            → copiar nuevo secret a FUB_WEBHOOK_SECRET (env Vercel)
            → redeploy
```

### Diagnosticar webhook que no llega

1. `/admin/fub` → ver `Webhook Log` → ¿alguna fila reciente?
2. Si no hay nada: probablemente firma HMAC inválida o webhook no suscrito.
3. Si hay con `status='error'`: ver `error_message`.
4. Health check manual: `curl -X GET https://app.costablancainvestments.com/api/webhooks/fub` → debe responder `{"ok":true}`.

### Diagnosticar leak entre agentes (test RLS)

```sql
-- Verificar que las policies están aplicadas
SELECT tablename, policyname FROM pg_policies
WHERE tablename LIKE 'fub_%' ORDER BY tablename;

-- Probar como agente (sub al user_id correcto en jwt.claims)
SET LOCAL "request.jwt.claims" = '{"sub":"<cbi_user_id>"}';
SELECT count(*) FROM fub_people WHERE assigned_user_id != my_fub_user_id();
-- Debe devolver 0
```

---

## Gotchas conocidos

1. **Webhooks de FUB solo mandan el ID** → 1 webhook = 1 API call. Rate limiter global compartido en `src/lib/fub/client.ts` (8 req/s con margen sobre el límite de FUB de 10).
2. **`peopleUpdated` no dice qué cambió** → upsert completo siempre.
3. **Eventos vs People:** leads inbound llegan como `event`, no como `person`. Estamos suscritos a `eventsCreated` → no se pierden.
4. **Soft deletes:** FUB marca con `deleted=true`. Las queries de UI filtran `deleted=false`.
5. **Mapping por email:** `LOWER()` en seed y en `linkProfilesToFub`.
6. **Time zones:** todo en UTC en BD. UI agrupa por día en Europe/Madrid (DST).
7. **Custom fields:** JSONB en `fub_people.custom_fields`.
8. **Idempotencia:** `fub_webhook_log.event_id UNIQUE`. Reentregas → INSERT falla con 23505 → respondemos 200 + skip.
9. **Basic Auth:** `Basic ${base64(API_KEY + ':')}`. NO Bearer.
10. **`security definer` en `is_fub_admin()`** y `my_fub_user_id()` evita recursión RLS al leer `fub_user_map` desde la policy.
11. **Stages de deals vs stages de people:** son universos distintos. El kanban del agente usa stages de people (lead lifecycle). El pipeline Sellers/Buyers usa stages internos del deal. Ambos se guardan en `fub_stages` pero los IDs no se solapan.
12. **Vercel maxDuration:** 300s en `vercel.json`. Backfill cabe (estimado 2-5 min). Si crece a >5min hay que partir en cursor.

---

## Decisión Sofia Moya

Sofia Moya (`fub_user_id=11`) figura como **Broker** en FUB. En el seed inicial se ha marcado como `is_admin=true` (consistente con su rol FUB).

Si Marco decide que Sofia NO debe tener acceso admin al dashboard:
- `/admin/fub` → tabla User Mapping → click en el toggle `admin` de Sofia → cambia a "no"

No requiere redeploy ni cambio de código — el override se persiste en `fub_user_map.is_admin`.

---

## Tests E2E

```bash
# Configurar env
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export PLAYWRIGHT_AGENT_A_EMAIL=karina@costablancainvestments.com
export PLAYWRIGHT_AGENT_A_PASSWORD=...
export PLAYWRIGHT_ADMIN_EMAIL=bruno@costablancainvestments.com
export PLAYWRIGHT_ADMIN_PASSWORD=...
export PLAYWRIGHT_AGENT_B_LEAD_ID=12345  # personId que pertenezca a otro agente

# Ejecutar
npx playwright test tests/fub.spec.ts
```

Cobertura:
- Smoke: dashboard carga widgets
- `/leads` renderiza
- `/admin/fub` rechaza no-admin y acepta admin
- Cross-agent leak: agente A no ve lead del agente B
- Webhook firma HMAC + health check
