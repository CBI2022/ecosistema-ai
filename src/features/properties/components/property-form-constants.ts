// ──────────────────────────────────────────────────────────────────────
// Constantes y estilos compartidos del form de propiedades.
// Un solo sitio para listas de desplegables (fuente: Sooprema/ESPECIFICACION_SUBIDA_PROPIEDAD.md §4)
// y para las clases de estilo reutilizadas por PropertyForm, EquipmentTab y FeaturesTab.
// ──────────────────────────────────────────────────────────────────────

// ── Estilos compartidos ──
export const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080] disabled:opacity-50'
export const labelClass = 'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'
export const sectionClass = 'rounded-2xl border border-white/8 bg-[#131313] p-5 sm:p-6'
export const sectionTitle = 'mb-1 text-base font-bold text-[#F5F0E8] sm:text-lg'
export const sectionSubtitle = 'mb-5 text-xs text-[#9A9080]'

// Convierte el VALOR de una opción en una clave i18n estable (sin tocar el value real).
// Ej: 'Storage heaters' -> 'storage_heaters'. El value que se guarda NO cambia.
export const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

// Detecta las opciones "Nª Planta" (1ª..50ª) para traducir con interpolación.
export const floorNthMatch = (s: string): number | null => {
  const m = s.match(/^(\d+)ª Planta$/)
  return m ? Number(m[1]) : null
}

// ── Información general ──
export const ZONES = [
  'Altea', 'Albir', 'Calpe', 'Javea', 'Moraira', 'Benissa',
  'Denia', 'Benidorm', 'La Nucia', 'Polop', 'Finestrat',
]

// IMPORTANTE: los `id` aquí deben coincidir con los que ya usa el mapper de Sooprema.
// No cambiar los ids existentes (villa, apartment, penthouse, townhouse, flat, bungalow,
// duplex, finca, country_house, detached_house, plot, commercial). Se pueden añadir más.
export const PROPERTY_TYPES = [
  { id: 'villa', label: 'Villa' },
  { id: 'apartment', label: 'Apartamento' },
  { id: 'penthouse', label: 'Ático' },
  { id: 'townhouse', label: 'Adosado' },
  { id: 'flat', label: 'Piso' },
  { id: 'bungalow', label: 'Bungalow' },
  { id: 'duplex', label: 'Dúplex' },
  { id: 'finca', label: 'Finca' },
  { id: 'country_house', label: 'Casa de campo' },
  { id: 'detached_house', label: 'Casa independiente' },
  { id: 'plot', label: 'Parcela' },
  { id: 'commercial', label: 'Local comercial' },
]

// Tipos para los que la Parcela (plot_area_m2) NO es obligatoria.
export const PLOT_OPTIONAL_TYPES = ['apartment', 'flat', 'bungalow', 'duplex', 'penthouse']

// Lista oficial Sooprema (§4.2 — captura Información general-views.png)
export const VIEWS_OPTIONS = [
  'Community area', 'First line', 'Golf course', 'Good views', 'Green zone',
  'National Park', 'Open', 'Others', 'Panoramas', 'Sea and mountains',
  'Sports area', 'To the Castle', 'To the city', 'To the exterior',
  'To the garden', 'To the mountain', 'To the park', 'To the sea',
  'To the square', 'To the street', 'To the valley',
]

// Lista oficial Sooprema (Kitchen — captura confirmada)
export const KITCHEN_TYPES = [
  'American', 'French', 'Furnished', 'Independent', 'Not available',
  'Open', 'Two kitchens', 'With cupboards', 'With island', 'Yes',
]

export const ENERGY = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

// ──────────────────────────────────────────────────────────────────────
// EQUIPMENT (§1.4 + §4.3–4.6)
// ──────────────────────────────────────────────────────────────────────

// §4.3 Heating (captura Equipment-heating.png)
export const HEATING_OPTIONS = [
  'Storage heaters', 'Aerothermal energy', 'Biomass', 'Blue heat radiators',
  'Centralised', 'Centralised fuel oil', 'Centralised gas', 'Central electric',
  'Diesel Boiler', 'Duct-based', 'Electric', 'Electric marble plate',
  'Electric underfloor heating', 'Fireplace', 'Firewood heater',
  'Gas underfloor heating', 'Geothermal energy', 'Heater', 'Heat pumps',
  'Hot/Cold', 'individual_city_gas', 'Natural Gas', 'Not available',
  'Oil underfloor heating', 'Pellets', 'Pre-installation', 'Propane-Butane',
  'Radiating floor', 'Solar panels', 'Split', 'underfloor heating heat pump', 'Yes',
]

// §4.4 Pool (captura Equipment-pool.png)
export const POOL_OPTIONS = [
  'Climatized', 'Community', 'Cover', 'Infinity', 'Inside',
  'Not available', 'Pool with Jacuzzi', 'Private', 'Yes',
]

// §4.5 Air Conditioning (captura Equipment-air conditioning.png)
export const AC_OPTIONS = [
  'Centralised', 'Cold', 'Duct-based', 'Hot/Cold',
  'Not available', 'Pre-installation', 'Split', 'Yes',
]

// §4.6 Furnitures type (captura Equipment-furnitures tipe.png)
export const FURNITURE_OPTIONS = [
  'Furnished', 'Furnished kitchen', 'Negotiable',
  'Partially furnished', 'Unfurnished', 'Yes',
]

// Checkboxes de Equipment (orden = captura Equipment.png).
// `name` mapea a las columnas del action donde existan; los nuevos llevan name razonable.
export const EQUIPMENT_CHECKBOXES: { name: string; label: string }[] = [
  { name: 'has_garage', label: 'Garage' },
  { name: 'has_terrace', label: 'Open Terrace' },
  { name: 'has_covered_terrace', label: 'Covered terrace' },
  { name: 'has_parking', label: 'Parking' },
  { name: 'has_furnished', label: 'Furnished' },
  { name: 'has_unfurnished', label: 'No amueblado' },
  { name: 'has_fireplace', label: 'Fireplace' },
  { name: 'has_storage', label: 'Storage room' },
  { name: 'has_water_deposit', label: 'Water deposit' },
  { name: 'has_bbq', label: 'Barbecue' },
  { name: 'has_elevator', label: 'Lift' },
  { name: 'has_summer_kitchen', label: 'Summer kitchen' },
  { name: 'has_alarm', label: 'Alarm system' },
  { name: 'has_laundry', label: 'Laundry room' },
  { name: 'has_outdoor_shower', label: 'Outdoor shower' },
  { name: 'has_double_glazing', label: 'Double glazing' },
  { name: 'has_balcony', label: 'Balcón' },
  { name: 'has_jacuzzi', label: 'Jacuzzi' },
]

// ──────────────────────────────────────────────────────────────────────
// FEATURES (§1.5 + §4.7–4.11)
// ──────────────────────────────────────────────────────────────────────

// §4.7 Orientation (captura Features-orientation.png)
export const ORIENTATION_OPTIONS = [
  'East', 'North', 'Northeast', 'Northwest',
  'South', 'Southeast', 'Southwest', 'West',
]

// §4.8 Terrain (captura Features-terrain.png)
export const TERRAIN_OPTIONS = [
  'Agricultural', 'Llano', 'Inclined', 'On slope', 'Rocky', 'Rustic',
  'Semi inclined', 'Steeply inclined', 'Urban', 'Developable', 'Urbanized',
]

// §4.9 Floor nº (captura features-floor-n.png) — Ground floor, Entresuelo, Top floor, 1ª…50ª Planta
export const FLOOR_LABEL_OPTIONS = [
  'Ground floor', 'Entresuelo', 'Top floor',
  ...Array.from({ length: 50 }, (_, i) => `${i + 1}ª Planta`),
]

// §4.10 Floors — numérico 1 a 50
export const FLOORS_OPTIONS = Array.from({ length: 50 }, (_, i) => String(i + 1))

// Checkboxes de Features (orden = captura Features.png).
// Garden mapea a `has_garden` (existe); el resto a names feat_*.
export const FEATURE_CHECKBOXES: { name: string; label: string }[] = [
  { name: 'has_garden', label: 'Garden' },
  { name: 'feat_distribution_diaphanous', label: 'Distribution diaphanous' },
  { name: 'feat_building_homes_use_only', label: 'Building homes use only' },
  { name: 'feat_concierge_service', label: 'Concierge Service' },
  { name: 'feat_porter_service', label: 'Porter Service' },
  { name: 'feat_mixed_building', label: 'Mixed building' },
  { name: 'feat_exterior', label: 'Exterior' },
  { name: 'feat_interior', label: 'Interior' },
  { name: 'feat_good_communications', label: 'Good communications' },
  { name: 'feat_loading_dock', label: 'Loading dock' },
  { name: 'feat_office', label: 'Office' },
  { name: 'feat_smoke_vent', label: 'Smoke vent' },
]

// Campos de texto de Features (distancias / servicios). Orden = captura Features.png.
// Warehouse heigth va en la columna izquierda; el resto en la derecha.
export const FEATURE_TEXT_FIELDS: { name: string; label: string }[] = [
  { name: 'feat_warehouse_height', label: 'Warehouse heigth' },
  { name: 'feat_nightclubs', label: 'Nightclubs' },
  { name: 'feat_water_sports', label: 'Water Sports' },
  { name: 'feat_supermarket', label: 'Supermarket' },
  { name: 'feat_restaurants', label: 'Restaurants' },
  { name: 'feat_theme_parks', label: 'Theme parks' },
  { name: 'feat_water_parks', label: 'Water Parks' },
  { name: 'dist_sea', label: 'Distance to sea' },
  { name: 'dist_market', label: 'Distance to market' },
  { name: 'dist_services', label: 'Distance to services' },
  { name: 'dist_town_center', label: 'Distance to town center' },
  { name: 'feat_diving', label: 'Diving' },
  { name: 'feat_golf', label: 'Golf' },
  { name: 'feat_bars', label: 'Bars' },
  { name: 'feat_nautical_club', label: 'Nautical Club' },
  { name: 'feat_hospital', label: 'Hospital' },
]
