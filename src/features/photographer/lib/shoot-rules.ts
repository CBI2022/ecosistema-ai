// Reglas del workflow de Jelle (acordadas en meet 2026-05-07).
// Compartidas entre cliente (BookShootingCalendar) y server (bookShoot).
// Si Jelle pide cambios, este es el ÚNICO archivo a tocar.

export const SHOOT_DURATION_HOURS = 2 // duración estimada de cada shoot
export const SHOOT_BUFFER_HOURS = 2 // margen entre shoots (transporte + setup)
export const SHOOT_LOCKOUT_HOURS = SHOOT_DURATION_HOURS + SHOOT_BUFFER_HOURS // 4h
export const MAX_SHOOTS_PER_DAY = 3 // cap diario
export const FIRST_SLOT = '09:30' // primer shoot del día (sol bajo en invierno antes)
export const LAST_SLOT = '15:00' // último shoot, termina a las 17:00 = fin jornada
export const SLOT_STEP_MIN = 30 // granularidad de los huecos

// Genera la lista de slots HH:MM válidos del día ['09:30', '10:00', ..., '15:00']
export function generateTimeSlots(): string[] {
  const [fh, fm] = FIRST_SLOT.split(':').map((n) => parseInt(n, 10))
  const [lh, lm] = LAST_SLOT.split(':').map((n) => parseInt(n, 10))
  const startMin = fh * 60 + fm
  const endMin = lh * 60 + lm
  const out: string[] = []
  for (let m = startMin; m <= endMin; m += SLOT_STEP_MIN) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    out.push(`${hh}:${mm}`)
  }
  return out
}

export const TIME_SLOTS = generateTimeSlots()

// Convierte 'HH:MM' o 'HH:MM:SS' → minutos desde 00:00
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10))
  return h * 60 + m
}

// Devuelve true si el slot `candidate` solapa con el buffer del shoot existente `existing`.
// Buffer = no permitir nada en (existing - LOCKOUT, existing + LOCKOUT).
export function isSlotInBufferOf(candidate: string, existing: string): boolean {
  const c = timeToMinutes(candidate)
  const e = timeToMinutes(existing)
  return Math.abs(c - e) < SHOOT_LOCKOUT_HOURS * 60
}

// Devuelve true si el agente NO puede reservar este slot dado el set de shoots ya existentes en ese día.
// Reglas: no solapa con buffer de ningún shoot existente.
export function isSlotBlockedByBuffer(candidate: string, existingTimes: string[]): boolean {
  return existingTimes.some((t) => isSlotInBufferOf(candidate, t))
}

export function isDayAtCap(existingCount: number): boolean {
  return existingCount >= MAX_SHOOTS_PER_DAY
}
