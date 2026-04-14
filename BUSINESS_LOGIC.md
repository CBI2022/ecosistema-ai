# BUSINESS_LOGIC.md - CBI ECO AI

> Generado por SaaS Factory | Fecha: 2026-04-13

---

## 1. Problema de Negocio

**Dolor principal:**
El equipo de Costa Blanca Investments opera sin una plataforma centralizada. Los agentes no tienen visibilidad de sus métricas, el proceso de publicación de propiedades en Suprema es 100% manual (lento y propenso a errores), la gestión de fotos pasa por Google Drive sin integración con el flujo de trabajo, y el contenido de YouTube se desperdicia porque nadie lo reutiliza para redes sociales.

**Costo actual:**
- Publicar una propiedad en Suprema requiere trabajo manual de Chloe campo por campo (estimado: 45-90 min por propiedad)
- Los agentes no tienen visibilidad de su rendimiento en tiempo real
- La coordinación fotógrafo → agente → publicación pasa por Google Drive sin automatización
- El contenido de YouTube no se reutiliza para redes sociales sin trabajo manual adicional

---

## 2. Solución

**Propuesta de valor:**
Una plataforma interna para Costa Blanca Investments que centraliza el rendimiento del equipo, automatiza la publicación de propiedades en Suprema, integra el flujo fotográfico y reutiliza el contenido de YouTube — todo bajo un mismo hub en expansión continua.

---

## 3. Los Tres Proyectos

### Proyecto 1 — Dashboard Web App

**Flujo principal (Happy Path — Agente):**
1. Agente hace login → onboarding en primer acceso (datos personales + objetivos + motivación)
2. Ve su dashboard: Revenue chart, checklist del día, fotos de sus propiedades
3. Loggea una venta → el gráfico y el leaderboard se actualizan en tiempo real
4. Reserva un shooting con Jelle desde el calendario integrado
5. Recibe las fotos de Jelle en su dashboard
6. Rellena el formulario de nueva propiedad y pulsa "Publicar en Suprema"
7. La propiedad se publica automáticamente — recibe confirmación

**Flujo principal (Happy Path — Admin):**
1. Bruno o Darcy hacen login
2. Ven métricas globales del equipo + leaderboard completo
3. Reciben notificación de solicitud de registro pendiente
4. Aprueban o rechazan desde el panel de notificaciones

**Flujo principal (Happy Path — Fotógrafo / Jelle):**
1. Jelle hace login → ve su propia interfaz
2. Ve su calendario con shootings programados
3. Sube fotos asociadas a referencia de propiedad + agente destinatario
4. Las fotos aparecen automáticamente en el dashboard del agente correspondiente

---

### Proyecto 2 — Automatización YouTube

**Flujo:**
1. CBI sube un vídeo a YouTube
2. Se dispara automáticamente el proceso
3. Se generan clips cortos optimizados para redes sociales
4. Los clips quedan disponibles para el equipo

---

### Proyecto 3 — Publicación Automática en Suprema

**Flujo:**
1. Agente rellena formulario de propiedad en el dashboard
2. Pulsa "Publicar en Suprema"
3. Los datos se guardan en la base de datos
4. Se dispara el script de browser automation (Playwright)
5. El script entra en Suprema, rellena todos los campos y sube fotos
6. La propiedad queda publicada en Suprema (estado oculto para revisión)
7. El agente recibe confirmación

---

## 4. Usuarios Objetivo

| Rol | Persona real | Permisos |
|-----|-------------|----------|
| **Admin** | Bruno Felipe, Darcy Maxim | Acceso total. Métricas de todos. Aprobar/rechazar registros |
| **Agent** | Equipo de agentes | Solo sus métricas y herramientas. Sin visibilidad de otros agentes |
| **Secretary** | Chloe | Gestión de Exclusive Homes, confirmar/editar revenue de agentes |
| **Photographer** | Jelle | Interfaz propia: calendario de shootings + subida de fotos |

---

## 5. Arquitectura de Datos

**Input:**
- Registro de usuarios (correo, contraseña, rol)
- Datos de onboarding (perfil, objetivos anuales, motivación personal)
- Ventas logueadas por agentes (propiedad, importe, fecha)
- Formulario de nueva propiedad (referencia, precio, ubicación, características, descripción, fotos)
- Fotos subidas por Jelle (referencia, agente destinatario, fecha, notas)
- Reservas de shooting (fecha, hora, agente)
- Competitors (agencias, agentes, zona)
- Daily Plan checklist (estado de tareas por día)
- Training (vídeos, scripts, how-tos, resultados de examen)

**Output:**
- Dashboard de métricas por agente (revenue, closings, captaciones)
- Leaderboard del equipo (ranking por facturación)
- PDF de valoración de propiedad con branding CBI
- PDF de factura para agentes autónomos
- Propiedad publicada en Suprema
- Clips de vídeo para redes sociales
- Notificaciones de aprobación de cuentas
- Confirmación de shooting reservado

**Storage — Supabase tables sugeridas:**

```
users                  → perfil, rol, estado (pending/approved/rejected)
user_goals             → objetivos de onboarding por agente
user_motivation        → motivación personal (privado, solo el agente)
sales                  → ventas logueadas (agente, propiedad, importe, fecha)
properties             → ficha completa de propiedad
property_photos        → sets de fotos por propiedad y agente
photo_shoots           → reservas de shooting (agente, fecha, estado)
checklist_items        → tareas del daily plan por agente y semana
exclusive_homes        → propiedades exclusivas de CBI
competitors            → agencias y agentes de competencia por zona
training_videos        → biblioteca de formación (link, categoría, tipo)
training_results       → resultados de examen por agente
notifications          → notificaciones de registro pendiente para admins
suprema_jobs           → cola de publicaciones automáticas en Suprema (estado, logs)
```

---

## 6. KPI de Éxito — Primera Versión

- Agente puede loggear una venta y ver su progreso en el gráfico en menos de 30 segundos
- Publicar una propiedad en Suprema pasa de 45-90 min manuales a un clic desde el dashboard
- Jelle puede subir fotos y que aparezcan en el dashboard del agente sin intervención de terceros
- Chloe puede gestionar Exclusive Homes sin depender de los admins

---

## 7. Especificación Técnica

### Features a Implementar (Feature-First)

```
src/features/
├── auth/                  # Login, registro, aprobación de cuentas, roles
├── onboarding/            # Flujo 3 pasos: perfil + objetivos + motivación
├── dashboard/             # Revenue chart, checklist diario, fotos, exclusive homes
├── kpi/                   # Daily plan semanal + leaderboard
├── valuation/             # Formulario + generación PDF con branding CBI
├── contracts/             # Iframe cbidocs.com
├── invoice/               # Template factura + generación PDF
├── training/              # Vídeos, scripts, how-tos, examen
├── competitors/           # Tracker por zona con contacto WhatsApp
├── properties/            # Formulario completo nueva propiedad
├── photo-shoots/          # Reserva de shooting + calendario Jelle
├── photographer/          # Vista exclusiva Jelle: subida fotos + calendario
├── suprema-automation/    # Browser automation Playwright para publicar en Suprema
└── notifications/         # Sistema de notificaciones push internas
```

### Stack Confirmado

- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind 3.4 + shadcn/ui
- **Backend:** Supabase (Auth + Database + Storage + RLS)
- **Automatización:** Playwright (browser automation para Suprema)
- **PDF:** Generación de PDFs con branding CBI (Valuation + Invoice)
- **Calendario:** Google Calendar API (disponibilidad de Jelle + reservas)
- **AI:** Generación automática de descripciones de propiedad
- **Validación:** Zod
- **State:** Zustand
- **MCPs activos:** Next.js DevTools + Playwright + Supabase

### Notas de Implementación Críticas

- **Suprema no tiene API pública** → browser automation con Playwright
- **Direcciones en Suprema** pueden no coincidir con lo escrito por el agente → el script debe manejar validación de dirección (campo en rojo = buscar variante)
- **Fotos de drone siempre al final** → Idealista las rechaza como foto principal
- **Suprema traduce a 7 idiomas** → verificar que la traducción se complete antes de publicar
- **Admins precargados** → Bruno y Darcy se crean directamente en BD con popup de email en primer login
- **Checklist diario** → se resetea cada 24h, no se persiste, no lo ve nadie más
- **Daily Plan** → se resetea manualmente por semana, sí persiste durante la semana activa

### Próximos Pasos

1. [ ] Configurar Supabase: tablas + RLS + políticas por rol
2. [ ] Implementar Auth: Email/Password + sistema de aprobación de cuentas
3. [ ] Onboarding: flujo 3 pasos post-aprobación
4. [ ] Feature: dashboard (revenue chart + checklist + fotos + exclusive homes)
5. [ ] Feature: kpi (daily plan + leaderboard)
6. [ ] Feature: properties (formulario completo)
7. [ ] Feature: photo-shoots (reserva + calendario Google)
8. [ ] Feature: photographer (vista Jelle)
9. [ ] Feature: valuation (formulario + PDF)
10. [ ] Feature: invoice (template + PDF)
11. [ ] Feature: training (biblioteca + examen)
12. [ ] Feature: competitors (tracker por zona)
13. [ ] Feature: suprema-automation (Playwright browser automation)
14. [ ] Feature: notifications (push internas)
15. [ ] Proyecto 2: YouTube automation
16. [ ] Testing E2E con Playwright
17. [ ] Deploy Vercel
