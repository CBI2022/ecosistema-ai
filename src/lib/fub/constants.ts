// Constantes compartidas entre server actions y componentes.
// Mantener separadas de actions/* porque los archivos con 'use server'
// solo pueden exportar funciones async.

// IDs de stages reales descubiertos en la API FUB de CBI.
export const STAGE_IDS = {
  LEAD: 2,
  HOT: 48,           // A - Hot 1-3 Months
  WARM: 49,          // B - Warm 3-6 Months
  COLD: 50,          // C - Cold 6+ Months
  VIEWINGS: 17,
  PENDING: 56,
  CLOSED: 8,
  SPHERE: 51,
  UNRESPONSIVE: 52,
  TRASH: 11,
} as const

export const PIPELINE_IDS = {
  BUYERS: 1,
  SELLERS: 2,
} as const
