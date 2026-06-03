// ──────────────────────────────────────────────────────────────────────
// RoadMaps — registro visual de los planes de acción de CBI.
// Cada roadmap que el equipo apruebe se añade a este array y se muestra
// de forma visual en /admin/roadmaps (solo admin).
// ──────────────────────────────────────────────────────────────────────

export type RoadmapStatus = 'pending_approval' | 'approved' | 'in_progress' | 'done'

export interface RoadmapStep {
  title: string
  detail: string
}

export interface RoadmapScreen {
  /** A quién pertenece esta pantalla (Agente, Oficina, Administrador) */
  who: string
  /** Etiqueta de rol corta */
  badge: string
  /** Lo que se ve en la pantalla, en líneas */
  lines: string[]
  /** Pie de la pantalla (acción principal) */
  action?: string
}

export interface Roadmap {
  id: string
  /** "Fase 1", "Fase 2"... */
  phase: string
  title: string
  status: RoadmapStatus
  /** Una frase que resume el roadmap */
  summary: string
  /** Tiempo estimado de construcción */
  timeline: string
  /** Última actualización (texto legible) */
  updated: string
  /** El recorrido: qué sucede cuando se usa */
  flow: RoadmapStep[]
  /** Las pantallas: qué ve cada persona */
  screens: RoadmapScreen[]
  /** Orden en que se construye */
  buildOrder: string[]
  /** Qué esperamos / criterios de "hecho" */
  expectations: string[]
  /** Lo que NO entra ahora */
  outOfScope: string[]
}

export const ROADMAPS: Roadmap[] = [
  {
    id: 'fase-1-publicar-propiedad',
    phase: 'Fase 1',
    title: 'Publicar Propiedad',
    status: 'pending_approval',
    summary:
      'El agente entra, sube una propiedad y le llega a la oficina dentro de la app. Una sola cosa, funcionando perfecto.',
    timeline: '1 semana',
    updated: 'Junio 2026',
    flow: [
      {
        title: 'El agente entra a la app',
        detail: 'Lo primero que ve es la pantalla de subir una propiedad. Sin menús, sin dashboard.',
      },
      {
        title: 'Rellena y envía',
        detail: 'Completa el formulario de la propiedad y pulsa “Enviar propiedad”. Recibe confirmación.',
      },
      {
        title: 'Le llega a la oficina',
        detail: 'A Chloe le entra una notificación dentro de la app y la propiedad aparece en su bandeja.',
      },
      {
        title: 'Chloe la procesa',
        detail: 'Abre la propiedad, ve toda la información lista para copiar y la sube a Sooprema a mano.',
      },
      {
        title: 'Se marca como publicada',
        detail: 'Cuando Chloe termina, la marca como “publicada” y desaparece de sus pendientes.',
      },
    ],
    screens: [
      {
        who: 'El agente',
        badge: 'Comercial',
        lines: [
          'Una sola pantalla: subir propiedad',
          'Formulario con todos los campos',
          'Sin menús ni distracciones',
        ],
        action: 'Enviar propiedad',
      },
      {
        who: 'La oficina',
        badge: 'Chloe',
        lines: [
          'Notificación al llegar una propiedad',
          'Bandeja de pendientes',
          'Información lista para copiar a Sooprema',
        ],
        action: 'Marcar como publicada',
      },
      {
        who: 'El administrador',
        badge: 'Nosotros',
        lines: [
          'Misma pantalla de subir propiedad',
          'Botón Admin (Knowledge, Tareas, CRM…)',
          'Botón Opciones antiguas (todo lo demás)',
        ],
        action: 'Acceso total',
      },
    ],
    buildOrder: [
      'Marcar cada propiedad como “enviada” o “publicada”.',
      'Botón “Enviar propiedad” que avisa a la oficina.',
      'Bandeja de la oficina con la información lista para copiar.',
      'App del agente reducida a la pantalla de subir propiedad.',
      'Vista de administrador con los botones Admin + Opciones antiguas.',
      'Prueba completa de principio a fin.',
    ],
    expectations: [
      'Subir una propiedad y que le llegue a la oficina funciona de forma impecable.',
      'Ninguna sección actual se borra: lo que no se ve queda accesible para los administradores.',
      'Los administradores conservan acceso total a todo en todo momento.',
    ],
    outOfScope: [
      'El robot que publicaba en Sooprema automáticamente (queda apagado, no se usa).',
      'Dictar la propiedad por voz para que se rellene sola (idea para más adelante).',
      'Los tres botones del agente: enviar · clientes · facturación (ahora solo enviar).',
    ],
  },
]
