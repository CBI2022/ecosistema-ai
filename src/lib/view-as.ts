// Nombre de la cookie de "Ver como" (previsualización de rol por un admin).
// En módulo aparte porque los archivos 'use server' solo pueden exportar funciones.
export const VIEW_AS_COOKIE = 'cbi-view-as'

// Roles que un admin puede previsualizar (no incluye 'admin' = su propia vista).
export const PREVIEWABLE_ROLES = ['agent', 'secretary', 'photographer', 'dc']
