# PRP-001: Fase 1 CBI — App de agentes reducida a un único flujo: Publicar Propiedad

> **Estado**: PENDIENTE
> **Fecha**: 2026-06-03
> **Proyecto**: CBI App (ecosystem-ai)

---

## Objetivo

Reducir la experiencia del **agente** a un único flujo perfecto: entrar → rellenar el formulario de propiedad (el que ya existe, idéntico al de Suprema) → enviarlo. Al enviar, **Chloe (secretary)** recibe una notificación in-app y una vista limpia y legible de los datos de la propiedad **dentro de la misma app**, que copia-pega manualmente en Suprema. Para los roles **no-admin** las demás features se **ocultan** (no se borran): el código queda dormido y reactivable.

> ⛔ **RESTRICCIÓN INNEGOCIABLE — los administradores NO se tocan.** La simplificación aplica EXCLUSIVAMENTE a usuarios no-admin (`agent`, `secretary`, `photographer`, `dc`). El rol `admin` (Marco, Bruno, Darcy) conserva **acceso total e intacto** a TODAS las secciones de administración: Knowledge (`/admin/knowledge`), sistema de tareas (`/tasks`), equipo (`/admin`), CRM/FUB (`/admin/fub`), Sooprema (`/admin/sooprema`) y cualquier otra. No se elimina ni se oculta NADA del rol admin. En `AppNav.tsx` esto se traduce en: **`ADMIN_TABS` y `ADMIN_SUBITEMS` quedan EXACTAMENTE como están**; el único array que se reduce es `AGENT_TABS` (y `SECRETARY_TABS` recibe su bandeja).

## Por Qué

| Problema | Solución |
|----------|----------|
| El agente se pierde entre 9+ pestañas (dashboard, leads, KPI, FUB, social, training, competitors…) y no sabe cuál es su trabajo real | Navegación reducida a lo esencial: para Fase 1, solo "Publicar propiedad" funcionando perfecto |
| La publicación automática a Sooprema (Playwright + IA) es frágil y opaca; cuando falla nadie sabe qué pasó | Flujo humano simple y fiable: el agente envía, Chloe ve los datos y los pega a mano en Suprema |
| Chloe no tiene un sitio claro donde "le llegue" la propiedad lista para copiar | Bandeja in-app de propiedades enviadas con vista de copia campo-a-campo + notificación |
| Borrar features mata trabajo ya hecho que se reactivará en fases futuras | Las features se ocultan (feature flag / nav condicional), el código permanece intacto |

**Valor de negocio**: Cada agente publica sin fricción ni soporte; Chloe procesa en minutos sin perseguir información; cero dependencia de automatización frágil. Base limpia para las Fases 2-3 (CRM clientes, facturación/tareas/KPIs) y futuros (autorrelleno por voz tipo Whisper — **anotado, NO ahora**).

## Qué

### Criterios de Éxito
- [ ] Un usuario con rol `agent` ve **solo** el flujo de publicar propiedad en su navegación (centro). Ninguna otra entrada de menú aparece para él.
- [ ] El agente rellena el formulario existente (idéntico al de Suprema, sin cambios de campos) y al enviarlo la propiedad se guarda en BD con un estado que indica "enviada a secretaría" (no se dispara la automation de Sooprema/Playwright/IA).
- [ ] Al enviar, **todas las secretarias** reciben una notificación in-app ("Nueva propiedad de [agente] lista para publicar en Suprema").
- [ ] Chloe (secretary) tiene una **bandeja in-app** con la lista de propiedades enviadas y una **vista de detalle de solo lectura** con todos los datos organizados para copiar-pegar a Suprema (con botones de "copiar" por campo/bloque), y puede marcar la propiedad como "publicada en Suprema".
- [ ] **Cero** PDF, **cero** Google Drive, **cero** IA en este flujo.
- [ ] Las features ocultas (dashboard, leads, KPI, FUB, social, training, competitors, valuation, contracts, invoice…) **no se borran**: su código y rutas siguen existiendo, solo desaparecen de la navegación del **agente** y quedan reactivables con un cambio mínimo.
- [ ] El rol **`admin`** mantiene su navegación **idéntica a la actual** (Knowledge, Tareas, Equipo, CRM/FUB, Sooprema, todo). `ADMIN_TABS`/`ADMIN_SUBITEMS` no se modifican. Login como admin = misma experiencia completa de siempre.
- [ ] `npm run typecheck` y `npm run build` pasan. Verificación E2E con Playwright del happy path agente→Chloe.

### Comportamiento Esperado (Happy Path)

1. **Agente** entra a la app → aterriza directamente en el formulario de publicar propiedad (su pantalla principal).
2. Rellena el formulario existente (`PropertyForm`) y pulsa **Enviar**.
3. La propiedad se guarda en `properties` con `publication_state = 'hidden'` y un marcador de estado de revisión (p. ej. `review_status = 'submitted'`), **sin** crear `suprema_jobs` ni llamar a `/api/sooprema/run/*`.
4. Se insertan filas en `notifications` para cada `secretary` (igual que el patrón actual de `saveProperty`, pero con copy nuevo y tipo `property_submitted`).
5. El agente ve confirmación in-app ("Tu propiedad se envió a la oficina, te avisaremos cuando esté publicada") — sin promesas de automatización.
6. **Chloe** ve el badge de la campanita y, en su navegación, una **bandeja de propiedades enviadas**. Abre una propiedad → ve todos los datos en bloques copiables.
7. Chloe pega los datos en Suprema (fuera de la app), y pulsa **"Marcar como publicada"** → la propiedad pasa a `review_status = 'published'` y sale de la bandeja de pendientes.

---

## Contexto

### Referencias (código existente — REUTILIZAR, no reinventar)
- `src/shared/components/AppNav.tsx` — navegación role-based ya implementada. Arrays `AGENT_TABS`, `SECRETARY_TABS`, etc. **Aquí se oculta todo para el agente.** Roles: `admin | agent | secretary | photographer | dc` (`src/types/database.ts`).
- `src/app/(main)/layout.tsx` — layout principal: obtiene `profile.role`, calcula `notifCount`, monta `AppNav`. No hay redirect por rol todavía (todos caen en sus tabs).
- `src/features/properties/components/PropertyForm.tsx` + `property-form-constants.ts` + tabs (`FeaturesTab`, `EquipmentTab`, `OwnerPicker`, `AddressPicker`, `TitleAndDescriptionEditor`) — el formulario **idéntico a Suprema**. NO se tocan los campos.
- `src/app/(main)/properties/page.tsx` — página que monta `PropertyForm` y `PropertyList`.
- `src/actions/properties.ts` → `saveProperty(formData, publish)` — **punto clave**. Hoy, cuando `publish=true`, crea `suprema_jobs`, dispara la automation (`/api/sooprema/run/[jobId]`) y notifica a secretarias. Fase 1 necesita una **ruta de envío sin automation**: guardar + notificar a secretarías + marcar `review_status='submitted'`, SIN `suprema_jobs` ni `fetch` a la automation.
- `src/actions/notifications.ts` — `getNotificationsData`, `markNotificationRead`, `markAllRead`. Patrón de notificaciones in-app por `target_user_id`.
- `src/features/notifications/components/NotificationsBell.tsx` / `NotificationsPanel.tsx` — campanita + panel ya existentes (se reutilizan tal cual).
- `src/app/(main)/admin/sooprema/page.tsx` + `src/features/sooprema/` — patrón de "bandeja para secretaría/admin" (lista de jobs con datos de propiedad). Sirve de **modelo** para la nueva bandeja de Chloe, pero la nueva bandeja lee de `properties` (review_status), NO de `suprema_jobs`.
- Tabla `properties` ya tiene `publication_state ('hidden'|'published'|'private')`, `status`, `suprema_status`. Se añade el eje de revisión humana.

### Arquitectura Propuesta (Feature-First, reutilizando lo existente)
```
src/features/properties/
├── components/
│   ├── PropertyForm.tsx            # SIN cambios de campos; ajustar copy/CTA de envío
│   ├── PropertySubmittedInbox.tsx  # NUEVO — bandeja de Chloe (lista de enviadas)
│   └── PropertyCopyView.tsx        # NUEVO — vista solo-lectura copiable campo a campo
│
src/app/(main)/
├── properties/page.tsx             # agente: foco en el form (su pantalla principal)
└── inbox/page.tsx                  # NUEVO (o /properties/inbox) — bandeja secretary/admin
│
src/actions/properties.ts
├── submitProperty(formData)        # NUEVO — guardar + review_status='submitted' + notificar secretarías, SIN automation
└── markPropertyPublished(id)       # NUEVO — review_status='published' (solo secretary/admin)
│
src/shared/lib/feature-flags.ts     # NUEVO (opcional) — flags para reactivar features dormidas
```
Decisión: **no** crear una feature nueva separada; la "bandeja" y la "vista de copia" viven dentro de `features/properties` porque operan sobre el mismo modelo. La navegación es el único cambio transversal (`AppNav.tsx`).

### Modelo de Datos
No se crean tablas nuevas. Se añade un eje de **revisión humana** a `properties` (migración Supabase, RLS ya existe en la tabla):
```sql
-- review_status: estado del flujo manual agente→secretaría (independiente de publication_state)
--   'submitted'  → el agente lo envió, pendiente de que Chloe lo pase a Suprema
--   'published'  → Chloe ya lo copió en Suprema
--   NULL         → borrador / no enviado todavía
ALTER TABLE properties ADD COLUMN IF NOT EXISTS review_status TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS published_to_suprema_at TIMESTAMPTZ;

-- Índice para la bandeja de Chloe (filtra por pendientes)
CREATE INDEX IF NOT EXISTS idx_properties_review_status ON properties(review_status) WHERE review_status = 'submitted';
```
`notifications`: nuevo `type = 'property_submitted'` (reutiliza la tabla y columnas existentes: `title`, `message`, `target_user_id`, `is_read`).

---

## Blueprint (Assembly Line)

> Solo FASES. Las subtareas se generan al entrar a cada una (bucle agéntico: mapear contexto → subtareas → ejecutar).

### Fase 1: Migración de datos (eje de revisión humana)
**Objetivo**: `properties` tiene `review_status`, `submitted_at`, `published_to_suprema_at` y su índice; tipos TS regenerados.
**Validación**: migración aplicada en Supabase (ref CBI `cimcdjrptyullbvcumel`); `list_tables`/types confirman las columnas; `npm run typecheck` pasa.

### Fase 2: Server actions del flujo manual
**Objetivo**: `submitProperty(formData)` (guarda + `review_status='submitted'` + `submitted_at` + notifica a todas las secretarias con `type='property_submitted'`, **sin** crear `suprema_jobs` ni llamar a la automation) y `markPropertyPublished(id)` (solo secretary/admin → `review_status='published'` + `published_to_suprema_at`). Reutilizar el mapeo de `formData` de `saveProperty` (extraer helper común para no duplicar).
**Validación**: invocar `submitProperty` desde el form crea la fila con `review_status='submitted'` y N notificaciones (1 por secretary); NO se crea ningún `suprema_jobs`; `markPropertyPublished` cambia el estado y está protegido por rol.

### Fase 3: Vista de Chloe — bandeja + vista de copia
**Objetivo**: ruta `/inbox` (o `/properties/inbox`) accesible a `secretary`/`admin` que lista propiedades con `review_status='submitted'` (agente, referencia, zona, fecha) y permite abrir una `PropertyCopyView` de solo lectura con todos los datos en bloques, con botones "copiar" por bloque/campo, y un botón "Marcar como publicada".
**Validación**: con una propiedad enviada de prueba, Chloe la ve en la bandeja, abre el detalle, copia datos (clipboard funciona), marca publicada y la propiedad desaparece de pendientes.

### Fase 4: Navegación reducida (SOLO no-admin) + ocultar features dormidas
**Objetivo**: reducir **únicamente `AGENT_TABS`** para que el rol `agent` vea **solo** el flujo de publicar (centro) en `AppNav.tsx`; el resto de tabs del agente se ocultan (código intacto, reactivable — preparar para la visión futura de 3 botones: centro=publicar, derecha=CRM, izquierda=facturación/tareas/KPIs, pero Fase 1 solo entrega el de publicar). `SECRETARY_TABS` recibe su bandeja de envíos. **`ADMIN_TABS` y `ADMIN_SUBITEMS` NO se tocan** (Knowledge, Tareas, Equipo, FUB, Sooprema intactos). Las rutas ocultas siguen existiendo y respondiendo si se navega directo (no se borran). Aterrizaje del agente directo al form.
**Validación**: login como `agent` → solo aparece publicar; login como `secretary` → aparece la bandeja; **login como `admin` → navegación COMPLETA idéntica a hoy (Knowledge, Tareas, todo presente)**; navegar manualmente a `/kpi` (oculta para agente) sigue cargando (código vivo). Screenshot Playwright de las tres navegaciones (agent, secretary, admin).

### Fase 5: Copy/CTA del form + confirmación al agente
**Objetivo**: ajustar el copy del `PropertyForm` (CTA "Enviar a la oficina" en vez de "Publicar"), y la confirmación post-envío al agente ("Tu propiedad se envió, te avisaremos cuando esté publicada") sin prometer automatización. Notificación in-app al propio agente de tipo `property_submitted` (confirmación). SIN tocar campos del formulario.
**Validación**: el agente envía y ve el mensaje correcto; recibe su notificación de confirmación.

### Fase 6: Validación Final (E2E)
**Objetivo**: flujo completo agente→Chloe funcionando end-to-end.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Playwright: agente rellena form → envía → Chloe ve la propiedad en bandeja → copia → marca publicada
- [ ] Confirmado en BD: `review_status` transiciona `submitted → published`, notificaciones creadas, **ningún** `suprema_jobs` generado
- [ ] Criterios de éxito cumplidos

---

## 🧠 Aprendizajes (Self-Annealing)

> Crece con cada error durante la implementación. El mismo error NUNCA ocurre dos veces.

_(vacío — se rellena durante `/bucle-agentico`)_

---

## Gotchas

- [ ] **NO disparar la automation de Sooprema en este flujo.** `saveProperty(..., publish=true)` crea `suprema_jobs` y hace `fetch` a `/api/sooprema/run/[jobId]`. La nueva `submitProperty` debe ser una ruta separada que NUNCA toque eso (SIN IA).
- [ ] **Ocultar ≠ borrar.** Las features (dashboard, KPI, FUB, social, training, etc.) solo desaparecen de `AppNav.tsx` para el **agente**; sus rutas en `src/app/(main)/*` y su código permanecen. Reactivables descomentando/añadiendo el tab.
- [ ] ⛔ **ADMIN INTOCABLE.** La reducción de nav aplica SOLO a `AGENT_TABS` (y `SECRETARY_TABS` para la bandeja). `ADMIN_TABS` y `ADMIN_SUBITEMS` (Knowledge `/admin/knowledge`, Tareas `/tasks`, Equipo `/admin`, FUB `/admin/fub`, Sooprema `/admin/sooprema`) **NO se editan**. El equipo admin sigue entrando ahí.
- [ ] `review_status` es un **eje nuevo independiente** de `publication_state` y `suprema_status` existentes — no reutilizar esos campos para no romper la lógica de Sooprema dormida.
- [ ] Notificaciones: reutilizar el patrón exacto de `saveProperty` (insert por cada secretary vía `adminClient`), solo cambia `type`/copy. No inventar tabla nueva.
- [ ] RLS de `properties` ya existe; `markPropertyPublished` debe verificar rol `secretary|admin` en el server action (como hacen `exclusive-homes.ts`/`photographer.ts`) y usar `adminClient` para bypass controlado.
- [ ] Reutilizar el mapeo gigante de `formData→propertyData` de `saveProperty` extrayendo un helper compartido; NO copiar-pegar 250 líneas (DRY).
- [ ] Clipboard API requiere contexto seguro (https/localhost) — la "copia por campo" debe degradar con `document.execCommand` fallback o aviso si falla.
- [ ] Solo se opera contra cuentas CBI (Supabase ref `cimcdjrptyullbvcumel`, Vercel `cbi2022s-projects/cbi-eco-ai`). Línea roja del proyecto.

## Anti-Patrones

- NO borrar código de features (solo ocultar de la nav, y SOLO para no-admin)
- NO tocar, ocultar ni borrar NADA del rol admin (Knowledge, Tareas, FUB, Sooprema, Equipo) — `ADMIN_TABS`/`ADMIN_SUBITEMS` intactos
- NO añadir PDF, Google Drive ni IA a este flujo
- NO duplicar el mapeo de formData (extraer helper)
- NO crear tablas nuevas si `properties` + `notifications` bastan
- NO ignorar errores de TypeScript ni usar `any` (usar `unknown`)
- NO disparar `suprema_jobs` / automation Playwright en el envío de Fase 1

---

## Idea futura (anotada, NO implementar ahora)

- **Autorrelleno por voz tipo Whisper**: el agente dicta y el form se rellena por transcripción. Fuera del alcance de Fase 1.
- **Visión de navegación 3 botones**: centro=publicar, derecha=CRM clientes, izquierda=facturación/tareas/KPIs. Fase 1 entrega solo el botón central (publicar) funcionando perfecto; los otros dos son Fases 2-3.

---

*PRP pendiente aprobación. No se ha modificado código.*
