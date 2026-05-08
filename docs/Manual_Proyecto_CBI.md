# Manual del Proyecto CBI ECO AI

> Base de conocimiento central del ecosistema digital de Costa Blanca Investments.
> Última actualización: **2026-05-08**
>
> **⚠ Fuente de verdad viva:** este documento es legacy. La **memoria viva** del proyecto vive en Supabase Knowledge (`knowledge_folders` + `knowledge_items`), accesible desde [/admin/knowledge](https://app.costablancainvestments.com/admin/knowledge). Ahí están las decisiones de Marco, errores resueltos, credenciales, integraciones y reglas innegociables. La IA lee Knowledge al inicio de cada sesión y debe escribir allí cualquier regla/decisión nueva. Este Manual se mantiene como overview, no como base operativa.

---

## 1. Qué es este proyecto

**Costa Blanca Investments (CBI)** es una agencia inmobiliaria de lujo en la Costa Blanca Norte, España. Operan con un equipo de agentes que venden villas y apartamentos en zonas como Altea, Albir, Calpe, Jávea y Moraira.

**CBI ECO AI** es el ecosistema digital interno de CBI. No es una web pública. Es una plataforma privada construida dentro del marco de **SaaS Factory** que centraliza el rendimiento del equipo, la gestión de propiedades, el contenido y la automatización de procesos.

El ecosistema está concebido como un **hub en expansión continua** — no es un producto cerrado. Cada nuevo proyecto que se incorpore debe convivir con los existentes sin romper nada.

**Producción:** https://app.costablancainvestments.com (NO usar vercel.app).
**Repo:** https://github.com/CBI2022/ecosistema-ai (rama `main` = producción).

---

## 2. Los tres proyectos actuales

| # | Proyecto | Descripción |
|---|----------|-------------|
| 1 | **Dashboard Web App** | Plataforma interna principal. Gestión de métricas, propiedades, formación, CRM en construcción |
| 2 | **Automatización YouTube → Shorts** | Clips cortos automáticos para redes (pendiente: Klap vs Vizard, OAuth YouTube/IG/TikTok) |
| 3 | **Publicación automática en Sooprema** | Browser automation con Playwright para crear borradores en Sooprema |

---

## 3. Usuarios y roles

| Rol | Persona | Acceso |
|-----|---------|--------|
| **Admin** | Bruno Felipe, Darcy Maxim, Marco Antonio | Acceso total. Métricas de todos. Aprobar/rechazar registros. Sección Admin completa |
| **Agent** | Equipo de agentes | Solo sus métricas y herramientas personales. Leaderboard privatizado (solo ven su propio performance) |
| **Secretary** | Chloe | Gestión de Exclusive Homes, confirmar/editar revenue de agentes |
| **Photographer** | Jelle | Vista propia: calendario de shootings + subida de fotos por referencia |
| **DC** | (rol pendiente de definir con Marco) | Pendiente |

**Admins precargados:** Bruno y Darcy creados directamente en BD. Marco usa `marcoapereirav@gmail.com` (la cuenta legacy `admin@cbi.com` se conserva pero no se toca).

**Pendiente con Marco:** definir exactamente qué ve cada rol (admin/agent/secretary/photographer/dc). Tarea waiting.

---

## 4. Secciones del Dashboard (Proyecto 1)

### Auth y registro
- Login con Email/Password (email confirmation OFF — Bruno/Darcy aprueban manualmente desde `/admin`)
- Registro con rol elegido → estado **pendiente de aprobación** → email Resend al usuario
- Forgot password con link propio + verifyOtp en cliente + redirect_to a `/callback`
- Onboarding **desactivado en producción** hasta que Marco lo defina con Bruno/Darcy. Preview pública en `/onboarding-preview`

### Dashboard principal
- **Revenue Growth Chart:** barras mensuales + línea acumulada vs objetivo anual
- **Today's Checklist:** persistido en BD (no localStorage). Reset cada 24h.
- **Property Photo Shoots:** sets de fotos de Jelle + botón "Book Shooting" con calendario
- **Exclusive Homes:** propiedades exclusivas de CBI (solo admins y Chloe pueden añadir)

### KPI
- **Daily Plan:** checklist semanal Lun-Vie con progreso por día. Reset manual por semana.
- **Leaderboard:** privatizado para agentes (solo ven su propio performance). Admins ven ranking completo.

### Tasks (`/tasks` y `/admin/tasks`)
- Tabla `project_tasks` en Supabase. UI con barra de progreso global del SaaS.
- Naming visual: `🤖 IA · ...` / `👤 Marco Antonio · ...` / `🤝 AMBOS · ...`
- Status: `next_action` · `waiting` · `someday` · `complete` (todas a `medium` o NULL).
- Disciplina innegociable: cada hallazgo PRIMERO se sube como tarea, DESPUÉS se continúa.

### Herramientas
- **Valuation:** formulario completo → PDF profesional con branding CBI
- **Contracts:** iframe que carga cbidocs.com
- **Invoice:** template de factura → PDF para agentes autónomos

### Training
- **Videos:** biblioteca por categoría (Prospecting, Closing, Viewings, Mindset, Marketing, Scripts, General)
- **Scripts:** guiones de ventas (cold call, door knocking, viewings, follow-up, cierre, WhatsApp)
- **How To:** SOPs paso a paso de procesos clave
- **Exam:** 30 preguntas. Mínimo 70% para pasar.

### Competitors
- Tracker de agencias y agentes por zona geográfica
- Filtro por zona: Dénia, Jávea, Moraira, Benissa, Calpe, Altea, Albir, Alfaz del Pi, La Nucia, Polop, Finestrat, Benidorm
- Contacto directo por WhatsApp desde la plataforma

### New Property Listing
- Formulario completo replicando capturas Sooprema (11 tabs incluyendo "Invitados", 22 etiquetas Sooprema, 7 idiomas, Edit/Delete)
- Audit field-by-field
- Botón de generación de descripción con IA
- Opciones: guardar borrador (estado `draft`), subir a Sooprema (estado `review` cuando el job crea el borrador en Sooprema)

### Sección Admin (solo rol admin)
- **Equipo:** gestión de usuarios y aprobaciones
- **Tareas:** vista global de `project_tasks`
- **KPI:** ranking completo del equipo
- **Sooprema:** monitor de jobs de automation
- **Social:** integraciones de redes (en construcción)
- **Knowledge:** cerebro escrito del proyecto (este documento es la versión reducida — el detalle vivo está ahí)

### Vista Fotógrafo (Jelle)
- Interfaz completamente diferente al resto del equipo (rol `photographer`)
- Subida de fotos por referencia de propiedad y agente destinatario
- Calendario mensual con shootings programados
- Estadísticas: total shootings y total fotos
- **Estado al 2026-05-08:** Fase 1 cerrada (entorno completo sin Google Calendar real). Fase 2 (Google Calendar real) pendiente de credenciales OAuth. Reglas del meet 2026-05-07 aplicadas en código.

### PWA + Push Notifications
- App instalable en iPhone/macOS/Android
- Service Worker servido dinámicamente desde `/api/sw` (evita cache CDN de Vercel)
- VersionWatcher detecta deploys cada 60s → modal central de actualización
- Endpoint emergency `/api/clear` para limpiar cache cuando el SW se queda viejo
- VAPID configurado. Marco confirmó push funciona en macOS y iPhone con botón "Test"
- Pendiente: hookear acciones REALES del sistema (no solo botón Test)

---

## 5. Flujo de fotos

```
Jelle hace la sesión fotográfica
        ↓
Jelle sube fotos a Google Drive (carpeta: REFERENCIA → NOMBRE_AGENTE)
        ↓
Fotos pasan por AutoEnhance.ai (edición automática ~0.40€/foto) — INTEGRACIÓN PENDIENTE
        ↓
Fotos editadas aparecen en el dashboard del agente
        ↓
Agente revisa, rellena formulario de propiedad
        ↓
Pulsa "Subir a Sooprema" → automatización crea borrador (estado `review`)
```

### Book Shooting

```
Agente pulsa "Book Shooting"
        ↓
Calendario de Jelle (Google Calendar API) con disponibilidad real
        ↓
Agente selecciona fecha y hora disponible
        ↓
Evento creado en Google Calendar de Jelle
        ↓
Booking aparece en la vista de Jelle dentro del dashboard
```

> **Estado:** Fase 2 lista en código, esperando credenciales OAuth (waiting Marco).

---

## 6. Sooprema — Proceso de publicación automatizado (Proyecto 3)

> **Sooprema** (con doble O — nunca "Suprema") es el portal inmobiliario interno de CBI. **No tiene API pública.** La solución es browser automation con Playwright.
>
> **⚠ Otro chat de Claude refina la automation.** No tocar `runSoopremaJob` ni los archivos de Playwright/automation desde otros chats — evita conflictos.

### Estado al 2026-05-08

- La automation **ya NO publica directamente**: solo crea borrador (step 1) → la secretaria completa el resto.
- Estado nuevo en BD: `review` (borrador en Sooprema), reemplazó al falso `published`.
- El job clickea "Confirmar y salir" para que el borrador se guarde realmente.
- Loop largo revertido — esperando info de Marco sobre cómo Sooprema guarda borradores.
- Auto-trigger del job al subir propiedad ya implementado.

### Las 7 fases del proceso (base: grabación de Chloe)

**Fase 1 — Preparación previa:**
- Localizar ficha de producto en Drive (carpeta "Nuevas propiedades" por agente, marcadas como "Ready")
- Procesar descripción con IA (sin bullets, sin emojis) + añadir distancias al final
- Descargar fotos con watermark de CBI
- Asignar referencia por zona (Altea = A+número correlativo, etc.)

**Fase 2 — Relleno del formulario:**
- Datos principales (referencia, precio, tipo, características)
- Equipamiento (piscina, AC, garaje, terraza, etc.)
- Agente y propietario (propietario debe estar registrado en Sooprema)
- Dirección (campo validado — si aparece en rojo buscar variante)

**Fase 3 — Textos:**
- Título principal (para encabezado web)
- Título dentro del texto (en negrita)
- Descripción sin bullets ni emojis
- Distancias al final en bullet point: playa + aeropuerto Alicante + aeropuerto Valencia
- Sooprema traduce automáticamente a 7 idiomas → verificar antes de publicar

**Fase 4 — Fotos (orden obligatorio):**
1. Foto con mayor impacto (casa + piscina + vistas al mar)
2. Exterior con piscina o vistas
3. Salón y comedor
4. Cocina
5. Habitaciones y baños (alternando)
6. Otras estancias
7. Jardín, piscina y terraza
8. **Fotos de drone siempre al final** (Idealista no acepta drones como foto principal)

**Fase 5 — Publicación:**
- Seleccionar portales (web CBI, Idealista, Imoluc feed XML automático)
- Confirmar publicación

**Fase 6 — Gastos (anuales):**
- IBI, Basura, Comunidad (si aplica)

**Fase 7 — Verificación final:**
- Orden de fotos, texto con formato correcto, precio, localidad correcta, foto del agente, teléfono de contacto

---

## 7. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 + shadcn/ui |
| Backend | Supabase (Auth + DB + Storage + RLS) — plan **Pro** con PITR |
| Emails | Resend + React Email (dominio `costablancainvestments.com` verificado) |
| Browser automation | Playwright + Sparticuz Chromium (Vercel) |
| AI Engine | Vercel AI SDK v5 + OpenRouter |
| PDF | Generación con branding CBI (Valuation + Invoice) |
| Calendario | Google Calendar API (en activación) |
| Validación | Zod |
| Estado | Zustand |
| PWA / Push | Service Worker + VAPID |
| Analytics | Vercel Analytics (Plausible descartado) |
| Deploy | Vercel (plan **Hobby** — crons NO compatibles) |
| Testing | Playwright CLI + MCP |

---

## 8. Glosario

| Término | Significado |
|---------|-------------|
| Sooprema (doble O) | Portal inmobiliario interno de CBI. Sin API pública. Nunca "Suprema" |
| AutoEnhance.ai | Herramienta de edición automática de fotos (~0.40€/foto) |
| Jelle | Fotógrafo de CBI |
| Chloe | Secretaria de CBI |
| Bruno / Darcy | Admins de CBI |
| Marco Antonio | Owner del proyecto. Decide producto |
| Book Shooting | Proceso de reservar sesión fotográfica con Jelle |
| Leaderboard | Ranking de agentes por facturación anual |
| Closing | Cierre de una venta (firma de escritura) |
| Captación | Conseguir que un propietario firme contrato de venta con CBI |
| Hub | Plataforma base sobre la que se añaden proyectos nuevos |
| Browser automation | Controlar un navegador programáticamente para automatizar acciones |
| Imoluc | Portal que recibe propiedades de CBI mediante feed XML automático |
| PWA | Progressive Web App — la app instalable que ven Marco/equipo en móvil |
| Knowledge | Cerebro escrito del proyecto en Supabase (folders + items), editable en `/admin/knowledge` |
| project_tasks | Sistema de gestión de tareas en BD, UI en `/tasks` y `/admin/tasks` |

---

## 9. Notas críticas de implementación

- **Sooprema** (con doble O) — Marco lo ha pedido explícita y enfáticamente. Repetir el typo "Suprema" es un fallo.
- **Mobile-first SIEMPRE** — el equipo usa el SaaS desde el móvil la mayor parte del tiempo.
- **Push automático tras cada cambio** — commit + push a `main`, sin preguntar.
- **Nunca asumir** — verificar con BD/código/test antes de marcar tareas complete.
- **Comunicación con Marco sin tecnicismos** — describir lo que el usuario verá en pantalla, no cambios de código.
- La dirección en Sooprema puede no coincidir con lo escrito por el agente. El script debe manejar validación (campo rojo = buscar variante).
- Fotos de drone **siempre al final** — Idealista las rechaza como foto principal.
- Sooprema traduce a 7 idiomas automáticamente — verificar que se complete antes de publicar.
- El checklist diario **se persiste en BD** desde commit `d339ee8` (antes era localStorage).
- El Daily Plan **sí persiste** durante la semana activa — reset manual.
- **RLS obligatorio en todas las tablas Supabase** — cada rol solo accede a sus propios datos. Sección Admin solo accesible para `role=admin`.
- **maxDuration de Vercel** solo aplica a `/api/**`, no a server actions. Si timeout en Playwright → mover a route handler.
- **Sparticuz chromium** requiere `serverExternalPackages` + `outputFileTracingIncludes` en `next.config.ts`.
- **Validación previa antes de Sooprema:** rechazar publicación si faltan precio, dormitorios, baños, m², descripción, ubicación, año construcción.

---

## 10. Cómo trabajar desde un ordenador nuevo

1. Clonar repo: `git clone https://github.com/CBI2022/ecosistema-ai.git`
2. Replicar `.env.local` desde el ordenador anterior (variables listadas en Knowledge → Cuentas y credenciales → "Variables .env.local").
3. `npm install` → `npm run dev`.
4. **Antes de cualquier trabajo:** abrir Knowledge en `/admin/knowledge` y leer las 9 carpetas, especialmente "Estado del proyecto" (snapshot ejecutivo).
5. Revisar `/admin/tasks` para ver el estado real del sprint.
6. Continuar el trabajo siguiendo las reglas innegociables.
