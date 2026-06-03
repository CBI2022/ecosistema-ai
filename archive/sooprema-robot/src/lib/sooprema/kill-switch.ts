// ⛔ KILL-SWITCH del robot de Sooprema (automatización Playwright + IA).
//
// Mientras esto sea `false`, es IMPOSIBLE lanzar la automatización desde
// CUALQUIER punto del dashboard: no se crean `suprema_jobs` y no se ejecuta
// Playwright, vengas de donde vengas (botón de /admin/sooprema, endpoint
// /api/sooprema/run, o el flujo de propiedades).
//
// El código del robot NO se borra — solo queda desconectado y bloqueado.
// Las propiedades se suben a mano desde "Propiedades recibidas" (Fase 1).
//
// ⚠️ Cambiar a `true` SOLO si Marco lo pide explícitamente.
// Ver memoria: project_sooprema_robot_abandoned.
export const SOOPREMA_AUTOMATION_ENABLED = false

export const SOOPREMA_DISABLED_MESSAGE =
  'La automatización de Sooprema está desactivada. Las propiedades se gestionan a mano desde "Propiedades recibidas".'
