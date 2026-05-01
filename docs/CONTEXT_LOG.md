# CONTEXT_LOG — Registro persistente del proyecto

> **Lectura obligatoria al inicio de cada sesión.** Este documento es la memoria viva del proyecto. Cada decisión, configuración, credencial confirmada, error resuelto y aclaración de Marco se registra aquí. Si una respuesta requiere preguntar a Marco algo que ya está aquí, **es un fallo del agente** — primero busca en este doc.

**Convención:** Cada entrada lleva fecha (YYYY-MM-DD) y un emoji que indica tipo:
- 🔧 Configuración / setup
- 📧 Email / comunicaciones
- 🔑 Credenciales / accesos
- 🎯 Decisión de Marco
- 🐛 Bug resuelto / aprendizaje
- 📋 Cambio de scope

---

## 2026-04-22

### 🔑 GitHub token (Marco)
- Token actual en `.env.local` línea `Github: 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`
- Sin caducidad (Marco lo regeneró clásico con permisos `repo`)
- Para `git push` el remote ya está configurado: `git remote set-url origin "https://x-access-token:${TOKEN}@github.com/CBI2022/ecosistema-ai.git"`

### 🔑 Supabase
- URL: https://cimcdjrptyullbvcumel.supabase.co
- Service role key en `.env.local` como `SUPABASE_SERVICE_ROLE_KEY`
- **Plan: Pro** (Marco confirmó 2026-04-22) → tenemos PITR disponible

### 📧 Resend
- API key en `.env.local`: `RESEND_API_KEY=re_JD62bcTr_MMUvvCoKQdeRCefi9qNVeQ66`
- **Dominio costablancainvestments.com VERIFICADO en Resend desde 2026-04-07** (Marco confirmó captura 2026-04-22)
- Provider: GoDaddy, region eu-west-1 (Ireland)
- DNS verified, status: Verified, listo para enviar.
- **FROM oficial:** `noreply@costablancainvestments.com` con nombre "CBI Performance Dashboard"
- Reply-to: `info@costablancainvestments.com` (verificar si existe ese alias)

### 🔑 Sooprema
- Variables en Vercel: `SOOPREMA_USERNAME=Bruno`, `SOOPREMA_PASSWORD=Costablancainvestments215`
- URL externa: https://www.costablancainvestments.com/admin/...
- **Sooprema lo está arreglando otro chat de Claude. NO TOCAR la automation/playwright en este chat.**

### 🔑 VAPID (push notifications)
- Configuradas en Vercel y `.env.local`. Marco confirmó push funciona en macOS y iPhone con botón "Test".
- "Needs Attention" en Vercel es solo aviso visual (variable no marcada como Sensitive). No bloquea funcionamiento.
- Falta probar push con ACCIÓN REAL (no solo botón Test).

### 🎯 Decisiones de Marco (definitivas)

- **Bot Telegram:** someday. No es prioridad ahora.
- **Backup Supabase Pro:** Marco confirmó tener Pro plan → activar PITR YA.
- **Documentos legales:** waiting. Marco hablará con Bruno/Darcy.
- **Vista equipo admin:** waiting. Marco quiere usar primero el SaaS para identificar gaps reales.
- **Subida fotos extra agente:** waiting. Pendiente definir flujo.
- **Notificación cruzada Jelle→Agente:** waiting. Pendiente definir cuándo dispara.
- **Historial facturas:** waiting. Marco hablará con Darío + Bruno.
- **Historial valoraciones:** waiting. Pendiente definir.
- **OpenRouter:** waiting. Verificar primero si Sooprema traduce automáticamente (si sí → no hace falta).
- **Analytics:** Vercel Analytics (gratis). Plausible descartado. Ya integrado.
- **Sentry:** Marco creando proyecto. Pendiente DSN.
- **Manual de Chloe:** task eliminada. Marco no recordaba qué era.
- **Onboarding del SaaS:** Marco quiere DEFINIRLO con Darcy/Bruno antes de mostrarlo. **De momento NO se muestra a nuevos users.**
- **Email confirmation Supabase:** OFF. Skip total. Bruno/Darcy aprueban manualmente desde `/admin`.
- **Naming visual de tareas:** `🤖 IA · ...`, `👤 Marco Antonio · ...`, `🤝 AMBOS · ...`. Sin priority (todas a `medium`). Orden por `position`.
- **App URL producción:** https://app.costablancainvestments.com (NO usar vercel.app)

### 🎯 Reglas transversales (innegociables)

- **Mobile-first SIEMPRE** — ver `~/.claude/projects/.../memory/feedback_mobile_first.md`
- **Sooprema con doble O** — nunca "Suprema"
- **Nunca asumir** — siempre verificar con BD/código/test
- **Disciplina de tareas** — cada hallazgo va PRIMERO a `project_tasks` antes de seguir
- **Push automático tras cada cambio** — commit + push a main, sin preguntar

### 🔧 Cuentas creadas en el SaaS

| Email | Password | Rol | Status | Notas |
|---|---|---|---|---|
| `bruno@costablancainvestments.com` | (Marco lo sabe) | admin | approved | Cuenta real |
| `darcy@costablancainvestments.com` | (Marco lo sabe) | admin | approved | Cuenta real |
| `admin@cbi.com` | (Marco la tiene) | admin | approved | **Cuenta personal de Marco — NO TOCAR** |
| `agente.test@cbi.com` | `AgenteTest2026` | agent | approved | Cuenta de prueba creada por IA. Onboarding completado. Útil para testear vista agente. |

### 📧 Emails que envía el sistema (inventario actualizado 2026-04-22)

Todos vía Resend desde `noreply@costablancainvestments.com` con templates en `src/lib/email/templates.ts`.

1. **Forgot password** → `forgotPasswordEmail()` (hookeado en `resetPassword()`)
2. **Signup aprobado** → `signupApprovedEmail()` (hookeado en `approveUser()`)
3. **Signup rechazado** → `signupRejectedEmail()` (hookeado en `rejectUser()`)
4. **Sooprema OK** → `soopremaDoneEmail()` *(creado, falta hookear)*
5. **Sooprema error** → `soopremaErrorEmail()` *(creado, falta hookear)*
6. **Tarea asignada** → `taskAssignedEmail()` *(creado, falta hookear)*

### 🐛 Aprendizajes (errores resueltos)

- **Vercel deploy con server actions de Playwright:** maxDuration en `vercel.json` solo aplica a `/api/**`, no a server actions. Mover `runSoopremaJob` a route handler si timeout.
- **Sparticuz chromium en Vercel:** requiere `serverExternalPackages` + `outputFileTracingIncludes` en `next.config.ts`.
- **Validación de propiedades antes de Sooprema:** rechazar publicación si faltan campos obligatorios (precio, dormitorios, baños, m², descripción, ubicación, año construcción) — evita jobs fallidos.
- **Email confirmation de Supabase:** `supabase.auth.signUp()` envía email automáticamente. Para evitarlo, usar `admin.auth.admin.createUser({ email_confirm: true })` desde server.
- **Token GitHub revocado al hacer push:** generar nuevo token clásico con scope `repo`, sin caducidad si Marco quiere.

### 📋 Workflow del SaaS (estado actualizado)

1. **Property → Sooprema** (PRIORIDAD #1) — flujo automático funciona, otro chat refinándolo.
2. **YouTube → Shorts → IG/TikTok** — pendiente: decidir Klap vs Vizard, conectar OAuth, cron worker.
3. **Auth flow:** signup auto-confirmed → admin aprueba en `/admin` → email Resend al user.
4. **Push notifications:** funciona técnicamente. Falta hookear acciones reales del sistema.

---

## Cómo añadir entradas a este log

Cuando hagas algo en una sesión, AÑADE entrada bajo la fecha de hoy con el emoji apropiado. Si la fecha de hoy ya existe, añades dentro. Si no, creas la sección. Mantén orden cronológico DESCENDENTE (más reciente arriba).

Mantén las decisiones de Marco aglutinadas para que se lean rápido al inicio de sesión.
