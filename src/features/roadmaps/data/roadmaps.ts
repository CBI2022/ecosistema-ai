// ──────────────────────────────────────────────────────────────────────
// RoadMaps — registro visual de los planes de acción de CBI.
// Cada roadmap que el equipo apruebe se añade a este array y se muestra
// como una ficha en /admin/roadmaps (solo admin). Al clicar la ficha se
// entra al detalle visual del roadmap.
// ──────────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'pending_approval' | 'approved' | 'in_progress' | 'done'

export interface RoadmapStep {
  title: string
  detail: string
}

/** Tipo de pantalla de teléfono que se dibuja como ejemplo visual */
export type ScreenKind = 'agent-form' | 'office-inbox' | 'admin-home'

export interface RoadmapScreen {
  /** A quién pertenece esta pantalla */
  who: string
  /** Etiqueta de rol corta */
  badge: string
  /** Qué teléfono-maqueta se dibuja */
  kind: ScreenKind
  /** Pie corto de la pantalla */
  note: string
}

export interface Roadmap {
  id: string
  /** "Fase 1", "Fase 2"... */
  phase: string
  title: string
  status: RoadmapStatus
  /** Una frase que resume el roadmap (se ve en la ficha) */
  summary: string
  /** Fecha de inicio (texto legible) */
  startDate: string
  /** Ventana de prueba estimada */
  testWindow: string
  /** Fecha objetivo de fin de prueba (texto legible) */
  targetDate: string
  /** Última actualización (texto legible) */
  updated: string
  /** El recorrido: qué sucede cuando se usa */
  flow: RoadmapStep[]
  /** Las pantallas: qué ve cada persona (maquetas de teléfono) */
  screens: RoadmapScreen[]
  /** Orden en que se construye */
  buildOrder: string[]
  /** Qué esperamos / criterios de "hecho" */
  expectations: string[]
}

export const ROADMAPS: Roadmap[] = [
  {
    id: 'fase-1-publicar-propiedad',
    phase: 'Fase 1',
    title: 'Publicar Propiedad',
    status: 'pending_approval',
    summary:
      'El agente entra, sube una propiedad y le llega a la oficina dentro de la app. Una sola cosa, funcionando perfecto.',
    startDate: 'Miércoles 3 de junio de 2026',
    testWindow: '7 días hábiles de prueba',
    targetDate: 'Viernes 12 de junio de 2026',
    updated: 'Junio 2026',
    flow: [
      {
        title: 'El agente entra a la app',
        detail: 'Lo primero que ve, desde el teléfono, es la pantalla para subir una propiedad. Sin menús, sin dashboard.',
      },
      {
        title: 'Rellena y envía',
        detail: 'Completa los datos de la propiedad y pulsa “Enviar propiedad”. Recibe confirmación de que se envió.',
      },
      {
        title: 'Le llega a la oficina',
        detail: 'A Chloe le entra una notificación y la propiedad aparece en su sección, con el nombre del agente que la subió.',
      },
      {
        title: 'Chloe la gestiona',
        detail: 'Tiene todas las propiedades recibidas organizadas como una base de datos. Entra en cada una y ve todo el registro.',
      },
      {
        title: 'Marca el estado',
        detail: 'Chloe la sube a Sooprema a mano y marca cada propiedad como “subida” o “pendiente”.',
      },
    ],
    screens: [
      {
        who: 'El agente',
        badge: 'Comercial',
        kind: 'agent-form',
        note: 'Una sola pantalla para subir la propiedad, desde el teléfono.',
      },
      {
        who: 'La oficina',
        badge: 'Chloe',
        kind: 'office-inbox',
        note: 'Todas las propiedades recibidas, organizadas, con el agente y su estado.',
      },
      {
        who: 'El administrador',
        badge: 'Nosotros',
        kind: 'admin-home',
        note: 'Lo mismo que ve la gente, más los botones Admin y Opciones antiguas.',
      },
    ],
    buildOrder: [
      'Que en cada propiedad aparezca el nombre del agente que la subió.',
      'Botón “Enviar propiedad” que avisa a la oficina con una notificación.',
      'Sección de Chloe: todas las propiedades recibidas, organizadas como base de datos, con buscador.',
      'Dentro de cada propiedad: registro completo, quién la subió y estado (subida / pendiente).',
      'App del agente reducida a la pantalla de subir propiedad, desde el teléfono.',
      'Vista de administrador con los botones Admin + Opciones antiguas.',
      'Prueba completa de principio a fin.',
    ],
    expectations: [
      'Subir una propiedad y que le llegue a la oficina funciona de forma impecable.',
      'Chloe tiene su sección ordenada y dinámica: el estado de cada propiedad y quién la subió.',
      'Ninguna sección actual se borra: lo que no se ve queda accesible para los administradores.',
    ],
  },
]
