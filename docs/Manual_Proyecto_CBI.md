# Manual del Proyecto CBI ECO AI

> Base de conocimiento central del ecosistema digital de Costa Blanca Investments.
> Última actualización: 2026-04-13

---

## 1. Qué es este proyecto

**Costa Blanca Investments (CBI)** es una agencia inmobiliaria de lujo en la Costa Blanca Norte, España. Operan con un equipo de agentes que venden villas y apartamentos en zonas como Altea, Albir, Calpe, Jávea y Moraira.

**CBI ECO AI** es el ecosistema digital interno de CBI. No es una web pública. Es una plataforma privada construida dentro del marco de **SaaS Factory** que centraliza el rendimiento del equipo, la gestión de propiedades, el contenido y la automatización de procesos.

El ecosistema está concebido como un **hub en expansión continua** — no es un producto cerrado. Cada nuevo proyecto que se incorpore debe convivir con los existentes sin romper nada.

---

## 2. Los tres proyectos actuales

| # | Proyecto | Descripción |
|---|----------|-------------|
| 1 | **Dashboard Web App** | Plataforma interna principal. Gestión de métricas, propiedades y formación |
| 2 | **Automatización YouTube** | Clips cortos automáticos para redes cada vez que CBI sube un vídeo |
| 3 | **Publicación automática en Suprema** | Browser automation para publicar propiedades sin intervención manual |

---

## 3. Usuarios y roles

| Rol | Persona | Acceso |
|-----|---------|--------|
| **Admin** | Bruno Felipe, Darcy Maxim | Acceso total. Métricas de todos. Aprobar/rechazar registros |
| **Agent** | Equipo de agentes | Solo sus métricas y herramientas personales |
| **Secretary** | Chloe | Gestión de Exclusive Homes, confirmar/editar revenue de agentes |
| **Photographer** | Jelle | Interfaz propia: calendario de shootings + subida de fotos |

**Admins precargados:** Bruno y Darcy están creados directamente en la BD. En su primer login aparece un popup para vincular su email.

---

## 4. Secciones del Dashboard (Proyecto 1)

### Auth y registro
- Login con Email/Password
- Registro con rol elegido → estado **pendiente de aprobación**
- Bruno y Darcy reciben notificación con badge numérico → aprueban o rechazan

### Onboarding (primer login post-aprobación)
1. **Información personal:** foto, nombre, apellido, teléfono, email
2. **Objetivos del año:** ingresos mensuales, closings, captaciones, citas, llamadas, follow-ups
3. **Motivación personal:** privado, solo lo ve el agente

### Dashboard principal
- **Revenue Growth Chart:** barras mensuales + línea acumulada vs objetivo anual
- **Today's Checklist:** tareas diarias autogeneradas según objetivos. Reset cada 24h. No persiste.
- **Property Photo Shoots:** sets de fotos de Jelle + botón "Book Shooting" con calendario
- **Exclusive Homes:** propiedades exclusivas de CBI (solo admins y Chloe pueden añadir)

### KPI
- **Daily Plan:** checklist semanal Lun-Vie con progreso por día. Reset manual por semana.
- **Leaderboard:** ranking de agentes por facturación anual. Filtrable por año.

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
- Formulario completo de propiedad (referencia, precio, ubicación, características, descripción multi-idioma, fotos)
- Botón de generación de descripción con IA
- Opciones: guardar borrador o publicar en Suprema

### Vista Fotógrafo (Jelle)
- Interfaz completamente diferente al resto del equipo
- Subida de fotos por referencia de propiedad y agente destinatario
- Calendario mensual con shootings programados
- Estadísticas: total shootings y total fotos

---

## 5. Flujo de fotos

```
Jelle hace la sesión fotográfica
        ↓
Jelle sube fotos a Google Drive (carpeta: REFERENCIA → NOMBRE_AGENTE)
        ↓
Fotos pasan por AutoEnhance.ai (edición automática ~0.40€/foto)
        ↓
Fotos editadas aparecen en el dashboard del agente
        ↓
Agente revisa, rellena formulario de propiedad
        ↓
Pulsa "Publicar en Suprema" → automatización se dispara
```

### Book Shooting
```
Agente pulsa "Book Shooting"
        ↓
Calendario de Jelle (Google Calendar) con disponibilidad real
        ↓
Agente selecciona fecha y hora disponible
        ↓
Evento creado en Google Calendar de Jelle
        ↓
Booking aparece en la vista de Jelle dentro del dashboard
```

---

## 6. Suprema — Proceso de publicación automatizado (Proyecto 3)

Suprema es el portal inmobiliario de CBI. **No tiene API pública.** La solución es browser automation con Playwright.

### Las 7 fases del proceso (base: grabación de Chloe)

**Fase 1 — Preparación previa:**
- Localizar ficha de producto en Drive (carpeta "Nuevas propiedades" por agente, marcadas como "Ready")
- Procesar descripción con IA (sin bullets, sin emojis) + añadir distancias al final
- Descargar fotos con watermark de CBI
- Asignar referencia por zona (Altea = A+número correlativo, etc.)

**Fase 2 — Relleno del formulario:**
- Datos principales (referencia, precio, tipo, características)
- Equipamiento (piscina, AC, garaje, terraza, etc.)
- Agente y propietario (propietario debe estar registrado en Suprema)
- Dirección (campo validado — si aparece en rojo buscar variante)

**Fase 3 — Textos:**
- Título principal (para encabezado web)
- Título dentro del texto (en negrita)
- Descripción sin bullets ni emojis
- Distancias al final en bullet point: playa + aeropuerto Alicante + aeropuerto Valencia
- Suprema traduce automáticamente a 7 idiomas → verificar antes de publicar

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
| Backend | Supabase (Auth + Database + Storage + RLS) |
| Automatización | Playwright (browser automation Suprema) |
| PDF | Generación con branding CBI (Valuation + Invoice) |
| Calendario | Google Calendar API |
| AI | Vercel AI SDK v5 + OpenRouter (descripciones de propiedades) |
| Validación | Zod |
| Estado | Zustand |
| Testing | Playwright CLI + MCP |
| Deploy | Vercel |

---

## 8. Glosario

| Término | Significado |
|---------|-------------|
| Suprema | Portal inmobiliario de CBI. Sin API pública |
| AutoEnhance.ai | Herramienta de edición automática de fotos (~0.40€/foto) |
| Jelle | Fotógrafo de CBI |
| Chloe | Secretaria de CBI |
| Bruno / Darcy | Admins de CBI |
| Book Shooting | Proceso de reservar sesión fotográfica con Jelle |
| Leaderboard | Ranking de agentes por facturación anual |
| Closing | Cierre de una venta (firma de escritura) |
| Captación | Conseguir que un propietario firme contrato de venta con CBI |
| Hub | Plataforma base sobre la que se añaden proyectos nuevos |
| Browser automation | Controlar un navegador programáticamente para automatizar acciones |
| Imoluc | Portal que recibe propiedades de CBI mediante feed XML automático |

---

## 9. Notas críticas de implementación

- La dirección en Suprema puede no coincidir con lo escrito por el agente. El script debe manejar validación (campo rojo = buscar variante)
- Fotos de drone **siempre al final** — Idealista las rechaza como foto principal
- Suprema traduce a 7 idiomas automáticamente — verificar que se complete antes de publicar
- El checklist diario **no se persiste** y nadie más lo ve — es solo visual para el agente
- El Daily Plan **sí persiste** durante la semana activa — reset manual
- RLS obligatorio en todas las tablas Supabase — cada rol solo accede a sus propios datos
