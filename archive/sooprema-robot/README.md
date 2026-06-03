# 🤖 Robot de Sooprema — ARCHIVADO (desconectado de la app)

Esta carpeta guarda **toda** la automatización que publicaba propiedades en
Sooprema de forma automática (Playwright + IA). **Está retirada de la aplicación
a propósito.** No hay ningún menú, página, botón, endpoint ni acción en el software
que pueda lanzarla. Es intencionadamente inaccesible.

Se conserva aquí porque fue mucho trabajo y puede reutilizarse en el futuro.

## Qué hay aquí (espejo de `src/`)

| Archivo archivado | Vivía en |
|---|---|
| `src/actions/sooprema.ts` | `src/actions/sooprema.ts` |
| `src/lib/sooprema/automation.ts` | runner de Playwright |
| `src/lib/sooprema/mapper.ts` | mapeo propiedad → campos Sooprema |
| `src/lib/sooprema/kill-switch.ts` | flag (ya no se usa) |
| `src/features/sooprema/components/SoopremaDashboard.tsx` | panel de jobs |
| `src/app/(main)/admin/sooprema/page.tsx` | ruta del panel |
| `src/app/api/sooprema/run/[jobId]/route.ts` | endpoint que ejecutaba el robot |

La estructura imita `src/`, así que **reactivar = mover de vuelta**.

## ⚠️ Cómo reactivarla (SOLO si Marco lo pide por chat)

1. Mover los archivos de `archive/sooprema-robot/src/...` de vuelta a `src/...`.
2. En `src/shared/components/AppNav.tsx`, volver a añadir la entrada
   `{ href: '/admin/sooprema', label: 'Sooprema', icon: 'upload' }` a `ADMIN_SUBITEMS`.
3. En `src/actions/properties.ts`, volver a cablear la rama de publicación en
   `saveProperty` (crear `suprema_jobs` + llamar al endpoint) y que el formulario
   llame a esa vía cuando se quiera publicación automática.
4. Revisar las env vars: `SOOPREMA_URL`, `SOOPREMA_USERNAME`, `SOOPREMA_PASSWORD`,
   `SOOPREMA_INTERNAL_TOKEN`.

Hasta entonces: **la app no sabe que esto existe.**
