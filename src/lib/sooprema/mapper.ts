/**
 * Mapea valores de nuestra DB a los IDs/values que espera Sooprema CRM.
 * Basado en la exploración de selectores del form /admin/propiedades/add/
 */

import type { Property } from '@/types/database'

// ═══ MAPEOS DE IDs (descubiertos en exploración) ═══

// txt-tipo_det
const PROPERTY_TYPE_ID: Record<string, string> = {
  villa: '5',
  apartment: '3',
  penthouse: '2',
  townhouse: '9',
  flat: '1',
  bungalow: '4',
  duplex: '13',
  finca: '6',
  country_house: '8',
  detached_house: '11',
  semi_detached: '38',
  terraced_house: '10',
  loft: '25',
  plot: '15',
  commercial: '18',
}

// txt-vistas
const VIEWS_ID: Record<string, string> = {
  'Sea and mountains': '8',
  'To the sea': '2',
  'First line': '22',
  'Open': '12',
  'Panoramas': '11',
  'To the mountain': '10',
  'Good views': '4',
  'To the garden': '1',
  'Community area': '5',
  'Golf course': '3',
  'Others': '19',
}

// txt-id_etiqueta (status tags - multi)
const STATUS_TAG_ID: Record<string, string> = {
  'Negotiable': '1',
  'Reduced': '2',
  'Offer': '5',
  'New': '6',
  'Rented': '7',
  'New build': '8',
  'Unused': '9',
  'Under construction': '10',
  'No Commissions': '11',
  'Exclusive': '12',
  'Bank': '13',
  'Proyecto': '14',
  'Licencia Turística': '15',
  'Cancelled': '16',
  'Awarded': '17',
  'Suspended': '18',
  'Proyecto con licencia': '19',
  'Temporary rental': '20',
  'Vistas al mar': '21',
  'Sea views': '21',
  'Opportunity': '22',
  'Front line': '23',
  'In the center': '24',
  'Deserted': '25',
  'To reform': '26',
  'Ideal Telework': '27',
  'Key ready': '28',
  'Exclusiva MLS': '29',
  'Proyecto Realizado': '30',
  'Investment': '31',
}

// txt-ocupacion_actual
const OCCUPATION_ID: Record<string, string> = {
  free: '2',
  empty: '3',
  rented: '4',
  occupied_illegally: '5',
}

// txt-cocina
const KITCHEN_ID: Record<string, string> = {
  'American': '2',
  'French': '6',
  'Furnished': '4',
  'Independent': '1',
  'Open': '3',
  'With cupboards': '5',
  'With island': '9',
  'Two kitchens': '11',
}

// Periodos (txt-periodo_comunidad, etc.)
const PERIOD_ID: Record<string, string> = {
  weekly: '1',
  monthly: '2',
  bimonthly: '3',
  quarterly: '4',
  annual: '5',
  annually: '5',
  none: '0',
}

// ═══ HELPERS ═══

function onlyDigits(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return String(Math.floor(v))
}

function asString(v: string | number | null | undefined, fallback = ''): string {
  if (v === null || v === undefined || v === '') return fallback
  return String(v)
}

function toClampedInt(v: number | null | undefined, max = 29): string {
  if (v === null || v === undefined) return '0'
  const n = Math.max(0, Math.min(max, Math.floor(v)))
  return String(n)
}

// ═══ MAPPER PRINCIPAL ═══

export interface SoopremaFieldMap {
  /** Campos texto/número: name → value */
  text: Record<string, string>
  /** Selects: name → option VALUE (el value del <option>) */
  select: Record<string, string>
  /** Checkboxes: name → boolean */
  checkbox: Record<string, boolean>
  /** Textareas (descripciones, notas) */
  textarea: Record<string, string>
  /** Status tags multi-select (array de IDs) */
  statusTagIds: string[]
  /** Certificado energético (radio) */
  energyCertificate: string
  /** Agente Sooprema ID (mapeado desde agent_sooprema_map) */
  soopremaAgentId?: string
  /** Owner */
  owner?: {
    sooprema_owner_id?: string | null
    first_name?: string | null
    last_name?: string | null
    phone?: string | null
    email?: string | null
    nif?: string | null
  }
  /** Portales */
  portals: { sooprema: boolean; idealista: boolean; imoluc: boolean }
  /** Fotos a subir (URLs públicas) */
  photos: Array<{ url: string; is_drone: boolean; sort_order: number }>
  /** Título + descripciones por idioma */
  texts: {
    title_headline: string
    title_in_text: string
    title_short: string
    en: string
    es: string
    nl: string
    distances_en: string
    distances_es: string
    distances_nl: string
  }
}

interface MapInput {
  property: Property
  owner?: {
    first_name: string | null
    last_name: string | null
    full_name: string
    email: string | null
    phone: string | null
    nif: string | null
    sooprema_owner_id: string | null
  } | null
  soopremaAgentId?: string | null
  photos: Array<{ public_url: string; is_drone: boolean; sort_order: number }>
}

export function mapPropertyToSooprema({ property: p, owner, soopremaAgentId, photos }: MapInput): SoopremaFieldMap {
  // Precios y comisión
  const textFields: Record<string, string> = {
    'input-txt-precio': onlyDigits(p.price),
    'input-txt-precio_neto': onlyDigits(p.price_net ?? p.price),
    'input-txt-precio_final': onlyDigits(p.price_final ?? p.price),
    'input-txt-precio_contraoferta': onlyDigits(p.price_counter_offer),
    'input-txt-comision': onlyDigits(p.commission_amount),
    'txt-porcentaje_comision': asString(p.commission_percentage, '5'),

    'txt-referencia': asString(p.reference),

    'txt-parcela': onlyDigits(p.plot_area_m2),
    'txt-constru': onlyDigits(p.build_area_m2),
    'txt-suputil': onlyDigits(p.useful_area_m2),
    'txt-terraza': onlyDigits(p.terrace_area_m2),
    'txt-supjardin': onlyDigits(p.garden_area_m2),

    'input-txt-gastos_comunidad': onlyDigits(p.community_annual),

    // Vivienda turística
    'txt-cod_vivienda_turistica': asString(p.tourist_housing_code),

    // Renta
    'txt-importe_renta': onlyDigits(p.rental_amount),

    // Llaves
    'txt-persona_llaves': asString(p.keys_holder),
    'txt-fon_contacto': asString(p.keys_phone),
    'txt-recoger_llaves': asString(p.keys_pickup),
    'txt-numero_llaves': asString(p.keys_count),
  }

  // Selects
  const selectFields: Record<string, string> = {
    'txt-tipo_det': p.property_type ? PROPERTY_TYPE_ID[p.property_type] ?? '5' : '5',
    'txt-vistas': p.views ? VIEWS_ID[p.views] ?? '0' : '0',
    'txt-ocupacion_actual': p.occupation_status ? OCCUPATION_ID[p.occupation_status] ?? '0' : '0',

    // Dormitorios, baños, aseos — Sooprema usa dropdowns con values numéricos
    'txt-habitacion': toClampedInt(p.bedrooms),
    'txt-banos': toClampedInt(p.bathrooms),
    'txt-aseo': toClampedInt(p.toilets, 10),
    'txt-salon': toClampedInt(p.living_rooms, 10),
    'txt-comedor': toClampedInt(p.dining_rooms, 10),
    'txt-cocina': p.kitchen_type ? KITCHEN_ID[p.kitchen_type] ?? '0' : '0',

    // Años
    'txt-consano': asString(p.year_built, '0'),
    'txt-refano': asString(p.year_reformed, '0'),

    // Periodos de gastos
    'txt-periodo_comunidad': PERIOD_ID[p.community_period] ?? '5',

    // Estado código vivienda turística
    'txt-estado_codigo_vivienda': p.tourist_housing_status === 'available' ? '1' : p.tourist_housing_status === 'in_process' ? '2' : '0',
  }

  // Checkboxes de equipment — TODO: validar exactamente los names en Sooprema
  // (no fueron visibles en la exploración porque están en otras tabs)
  const checkboxFields: Record<string, boolean> = {
    'has_pool': p.has_pool,
    'has_garage': p.has_garage,
    'has_garden': p.has_garden,
    'has_terrace': p.has_terrace,
    'has_ac': p.has_ac,
    'has_sea_view': p.has_sea_view,
    'has_fireplace': p.has_fireplace,
    'has_storage': p.has_storage,
    'has_bbq': p.has_bbq,
    'has_alarm': p.has_alarm,
    'has_elevator': p.has_elevator,
    'has_jacuzzi': p.has_jacuzzi,
    'has_balcony': p.has_balcony,
    'has_bar': p.has_bar,
    'has_guest_apartment': p.has_guest_apartment,
    'has_summer_kitchen': p.has_summer_kitchen,
  }

  // Textareas
  const textareaFields: Record<string, string> = {
    'txt-observaciones_comunidad': asString(p.community_observations),
    'txt-visita_propiedad': asString(p.visit_info),
    'txt-descripcion_oficina': asString(p.office_description),
    'txt-nota_propiedad': asString(p.internal_note),
  }

  // Status tags
  const statusTagIds = (p.status_tags || [])
    .map((tag) => STATUS_TAG_ID[tag])
    .filter(Boolean)

  // Certificado energético
  const energyCertificate = p.energy_certificate || 'D'

  // Ordenar fotos: no-drone primero (por sort_order), drones al final
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.is_drone !== b.is_drone) return a.is_drone ? 1 : -1
    return a.sort_order - b.sort_order
  })

  return {
    text: textFields,
    select: selectFields,
    checkbox: checkboxFields,
    textarea: textareaFields,
    statusTagIds,
    energyCertificate,
    soopremaAgentId: soopremaAgentId || undefined,
    owner: owner
      ? {
          sooprema_owner_id: owner.sooprema_owner_id,
          first_name: owner.first_name,
          last_name: owner.last_name,
          phone: owner.phone,
          email: owner.email,
          nif: owner.nif,
        }
      : undefined,
    portals: {
      sooprema: p.publish_sooprema ?? true,
      idealista: p.publish_idealista ?? false,
      imoluc: p.publish_imoluc ?? false,
    },
    photos: sortedPhotos.map((ph) => ({
      url: ph.public_url,
      is_drone: ph.is_drone,
      sort_order: ph.sort_order,
    })),
    texts: {
      title_headline: asString(p.title_headline),
      title_in_text: asString(p.title_in_text),
      title_short: asString(p.title),
      en: asString(p.description_en),
      es: asString(p.description_es),
      nl: asString(p.description_nl),
      distances_en: 'Beach, Alicante Airport, Valencia Airport',
      distances_es: 'Playa, Aeropuerto Alicante, Aeropuerto Valencia',
      distances_nl: 'Strand, Luchthaven Alicante, Luchthaven Valencia',
    },
  }
}
