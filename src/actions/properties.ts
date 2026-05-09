'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { audit } from '@/lib/audit'
import { getSiteUrl } from '@/lib/site-url'

const ZONE_PREFIXES: Record<string, string> = {
  Altea: 'A',
  Albir: 'AL',
  Calpe: 'C',
  Javea: 'J',
  Moraira: 'M',
  Benissa: 'BE',
  Denia: 'D',
  Benidorm: 'BN',
  'La Nucia': 'LN',
  Polop: 'P',
  Finestrat: 'F',
}

async function generateReference(
  supabase: Awaited<ReturnType<typeof createClient>>,
  zone: string
) {
  const prefix = ZONE_PREFIXES[zone] ?? zone.slice(0, 2).toUpperCase()
  // Tomar la última referencia con ese prefijo (ordenada desc) y sumarle 1.
  // Esto es robusto frente a registros borrados, manual entries y conteos no atómicos.
  const { data } = await supabase
    .from('properties')
    .select('reference')
    .like('reference', `${prefix}%`)
    .order('reference', { ascending: false })
    .limit(1)

  let next = 1
  if (data && data.length > 0 && data[0].reference) {
    const numericPart = String(data[0].reference).slice(prefix.length).replace(/\D/g, '')
    const parsed = parseInt(numericPart, 10)
    if (!isNaN(parsed)) next = parsed + 1
  }

  // Verificación defensiva: si por alguna razón la candidata ya existe, incrementar hasta encontrar libre.
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = `${prefix}${String(next).padStart(3, '0')}`
    const { data: existing } = await supabase
      .from('properties')
      .select('id')
      .eq('reference', candidate)
      .maybeSingle()
    if (!existing) return candidate
    next++
  }

  // Fallback con sufijo aleatorio si tras 50 intentos no se encuentra hueco
  return `${prefix}${String(next).padStart(3, '0')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

// Helpers para parsear form data
const str = (fd: FormData, key: string): string | null => {
  const v = fd.get(key)
  if (v === null || v === undefined || v === '') return null
  return String(v)
}
const num = (fd: FormData, key: string): number | null => {
  const v = fd.get(key)
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return isNaN(n) ? null : n
}
const int = (fd: FormData, key: string): number | null => {
  const n = num(fd, key)
  return n === null ? null : Math.floor(n)
}
const bool = (fd: FormData, key: string): boolean => fd.get(key) === 'on' || fd.get(key) === 'true' || fd.get(key) === '1'
const arrCsv = (fd: FormData, key: string): string[] | null => {
  const v = str(fd, key)
  if (!v) return null
  return v.split(',').map((s) => s.trim()).filter(Boolean)
}

export async function saveProperty(formData: FormData, publish = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Admin/secretary pueden crear/editar a nombre de cualquier agente
  const adminClient = createAdminClient()
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isElevated = callerProfile?.role === 'admin' || callerProfile?.role === 'secretary'

  const submittedAgentId = str(formData, 'agent_id')
  const agentId = isElevated && submittedAgentId ? submittedAgentId : user.id

  // Para elevated users, usamos admin client para bypassear RLS de UPDATE/DELETE
  const writeClient = isElevated ? adminClient : supabase

  const zone = str(formData, 'zone') || 'Altea'
  const reference = str(formData, 'reference') || (await generateReference(supabase, zone))

  // Estado de publicación canónico (3 valores: hidden, published, private)
  const submittedPubState = str(formData, 'publication_state')
  const publicationState =
    submittedPubState && ['hidden', 'published', 'private'].includes(submittedPubState)
      ? submittedPubState
      : (publish ? 'published' : 'hidden')

  // XML feeds (multi)
  let xmlFeedsArray: string[] = []
  try {
    const raw = str(formData, 'xml_feeds')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) xmlFeedsArray = parsed.filter((x: unknown): x is string => typeof x === 'string')
    }
  } catch { /* ignore */ }

  const propertyData: Record<string, unknown> = {
    agent_id: agentId,
    reference,

    // Identificación (Sooprema solo tiene 1 título → title_headline)
    title: str(formData, 'title'),
    title_headline: str(formData, 'title_headline'),
    title_in_text: str(formData, 'title_in_text'),

    // Tipo / estado
    property_type: str(formData, 'property_type') || 'villa',
    listing_type: str(formData, 'listing_type') || 'sale',
    is_new_build: bool(formData, 'is_new_build'),
    is_plot: bool(formData, 'is_plot'),
    status: publish ? 'published' : 'draft',
    publication_state: publicationState,
    status_tags: arrCsv(formData, 'status_tags'),
    occupation_status: str(formData, 'occupation_status'),

    // Destacadas / homepage
    featured_homepage: bool(formData, 'featured_homepage'),
    featured_first_position: bool(formData, 'featured_first_position'),
    featured_promote: bool(formData, 'featured_promote'),

    // Precios
    price: num(formData, 'price'),
    price_net: num(formData, 'price_net'),
    price_final: num(formData, 'price_final'),
    price_counter_offer: num(formData, 'price_counter_offer'),
    rental_amount: num(formData, 'rental_amount'),
    commission_amount: num(formData, 'commission_amount'),
    commission_percentage: num(formData, 'commission_percentage'),

    // Estructura
    bedrooms: int(formData, 'bedrooms'),
    bathrooms: int(formData, 'bathrooms'),
    toilets: int(formData, 'toilets'),
    living_rooms: int(formData, 'living_rooms'),
    dining_rooms: int(formData, 'dining_rooms'),
    kitchen_type: str(formData, 'kitchen_type'),
    floor_number: int(formData, 'floor_number'),
    total_floors: int(formData, 'total_floors'),
    orientation: str(formData, 'orientation'),

    // Promoción / urbanización
    promotion_name: str(formData, 'promotion_name'),

    // Áreas
    build_area_m2: num(formData, 'build_area_m2'),
    plot_area_m2: num(formData, 'plot_area_m2'),
    useful_area_m2: num(formData, 'useful_area_m2'),
    terrace_area_m2: num(formData, 'terrace_area_m2'),
    garden_area_m2: num(formData, 'garden_area_m2'),

    // Años
    year_built: int(formData, 'year_built'),
    year_reformed: int(formData, 'year_reformed'),

    // Ubicación
    location: str(formData, 'location'),
    zone,
    street_name: str(formData, 'street_name'),
    street_number: str(formData, 'street_number'),
    apartment_floor: str(formData, 'apartment_floor'),
    apartment_door: str(formData, 'apartment_door'),
    urbanization: str(formData, 'urbanization'),
    postal_code: str(formData, 'postal_code'),
    city: str(formData, 'city'),
    latitude: num(formData, 'latitude'),
    longitude: num(formData, 'longitude'),

    // Descripción base (notas crudas del agente — NO se sube a Sooprema)
    description_base: str(formData, 'description_base'),
    description_source_lang: str(formData, 'description_source_lang') || 'es',

    // Títulos en 7 idiomas (lo que se sube a Sooprema)
    title_es: str(formData, 'title_es'),
    title_en: str(formData, 'title_en'),
    title_de: str(formData, 'title_de'),
    title_fr: str(formData, 'title_fr'),
    title_nl: str(formData, 'title_nl'),
    title_ru: str(formData, 'title_ru'),
    title_pl: str(formData, 'title_pl'),

    // Descripciones en 7 idiomas (lo que se sube a Sooprema)
    description_es: str(formData, 'description_es'),
    description_en: str(formData, 'description_en'),
    description_de: str(formData, 'description_de'),
    description_fr: str(formData, 'description_fr'),
    description_nl: str(formData, 'description_nl'),
    description_ru: str(formData, 'description_ru'),
    description_pl: str(formData, 'description_pl'),
    views: str(formData, 'views'),

    // Calefacción / climatización
    heating_type: str(formData, 'heating_type'),

    // Features core
    has_pool: bool(formData, 'has_pool'),
    pool_type: str(formData, 'pool_type'),
    has_garage: bool(formData, 'has_garage'),
    garage_spaces: int(formData, 'garage_spaces'),
    has_garden: bool(formData, 'has_garden'),
    garden_type: str(formData, 'garden_type'),
    has_terrace: bool(formData, 'has_terrace'),
    terrace_type: str(formData, 'terrace_type'),
    has_ac: bool(formData, 'has_ac'),
    ac_type: str(formData, 'ac_type'),
    has_sea_view: bool(formData, 'has_sea_view'),

    // Features extra
    has_fireplace: bool(formData, 'has_fireplace'),
    has_storage: bool(formData, 'has_storage'),
    has_bbq: bool(formData, 'has_bbq'),
    has_alarm: bool(formData, 'has_alarm'),
    has_elevator: bool(formData, 'has_elevator'),
    has_jacuzzi: bool(formData, 'has_jacuzzi'),
    has_balcony: bool(formData, 'has_balcony'),
    has_bar: bool(formData, 'has_bar'),
    has_guest_apartment: bool(formData, 'has_guest_apartment'),
    has_summer_kitchen: bool(formData, 'has_summer_kitchen'),
    has_water_deposit: bool(formData, 'has_water_deposit'),
    has_sat_tv: bool(formData, 'has_sat_tv'),
    has_internet: bool(formData, 'has_internet'),
    has_laundry: bool(formData, 'has_laundry'),
    has_outdoor_shower: bool(formData, 'has_outdoor_shower'),
    has_double_glazing: bool(formData, 'has_double_glazing'),
    has_security_door: bool(formData, 'has_security_door'),
    has_enclosed_plot: bool(formData, 'has_enclosed_plot'),
    furniture_status: str(formData, 'furniture_status'),

    // Apartamento de invitados
    guest_bedrooms: int(formData, 'guest_bedrooms'),
    guest_bathrooms: int(formData, 'guest_bathrooms'),
    guest_toilets: int(formData, 'guest_toilets'),
    guest_lounge_count: int(formData, 'guest_lounge_count'),
    guest_dining_count: int(formData, 'guest_dining_count'),
    guest_kitchen_count: int(formData, 'guest_kitchen_count'),
    // Booleans derivados de los counts (compatibilidad con código que aún los usa)
    guest_lounge: (int(formData, 'guest_lounge_count') ?? 0) > 0,
    guest_dining_room: (int(formData, 'guest_dining_count') ?? 0) > 0,
    guest_kitchen: (int(formData, 'guest_kitchen_count') ?? 0) > 0,

    // Certificados energéticos (Sooprema tiene 2 escalas + emisiones)
    energy_certificate: str(formData, 'energy_certificate') || 'D',
    energy_consumption_rating: str(formData, 'energy_consumption_rating'),
    energy_consumption_kwh: num(formData, 'energy_consumption_kwh'),
    co2_emissions: num(formData, 'co2_emissions'),

    // Portales
    publish_sooprema: bool(formData, 'publish_sooprema') !== false,
    publish_idealista: bool(formData, 'publish_idealista'),
    publish_kyero: bool(formData, 'publish_kyero'),
    publish_imoluc: bool(formData, 'publish_imoluc'),
    xml_feeds: xmlFeedsArray,

    // Permisos del propietario / control interno CBI
    owner_allows_web: bool(formData, 'owner_allows_web') || formData.get('owner_allows_web') === null,
    owner_allows_idealista: bool(formData, 'owner_allows_idealista') || formData.get('owner_allows_idealista') === null,
    allow_billboard: bool(formData, 'allow_billboard'),

    // Gastos
    ibi_annual: num(formData, 'ibi_annual'),
    ibi_period: str(formData, 'ibi_period') || 'annual',
    basura_annual: num(formData, 'basura_annual'),
    basura_period: str(formData, 'basura_period') || 'annual',
    community_annual: num(formData, 'community_annual'),
    community_period: str(formData, 'community_period') || 'annual',
    community_observations: str(formData, 'community_observations'),

    // Owner
    owner_id: str(formData, 'owner_id'),

    // Llaves / visitas
    keys_holder: str(formData, 'keys_holder'),
    keys_phone: str(formData, 'keys_phone'),
    keys_pickup: str(formData, 'keys_pickup'),
    keys_count: int(formData, 'keys_count'),
    visit_info: str(formData, 'visit_info'),

    // Notas internas
    office_description: str(formData, 'office_description'),
    internal_note: str(formData, 'internal_note'),

    // Vivienda turística
    tourist_housing_code: str(formData, 'tourist_housing_code'),
    tourist_housing_status: str(formData, 'tourist_housing_status'),

    // Fotos
    primary_photo_id: str(formData, 'primary_photo_id'),

    updated_at: new Date().toISOString(),
  }

  // Si viene id, actualizar; si no, crear
  const propertyId = str(formData, 'id')

  let result: { id: string } | null = null
  if (propertyId) {
    const { data, error } = await writeClient
      .from('properties')
      .update(propertyData)
      .eq('id', propertyId)
      .select('id')
      .single()
    if (error) return { error: error.message }
    result = data
  } else {
    // Reintentar hasta 5 veces si la referencia colisiona (carrera entre uploads concurrentes)
    let lastError: unknown = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await writeClient
        .from('properties')
        .insert(propertyData)
        .select('id')
        .single()
      if (!error) {
        result = data
        break
      }
      lastError = error
      const msg = error.message || ''
      const code = (error as { code?: string }).code
      const isUniqueViolation = code === '23505' || msg.includes('properties_reference_key') || msg.includes('duplicate key')
      if (!isUniqueViolation) return { error: msg }
      // Regenerar referencia y volver a intentar
      const newRef = await generateReference(supabase, zone)
      propertyData.reference = newRef
    }
    if (!result) {
      const msg = (lastError as { message?: string })?.message || 'No se pudo guardar la propiedad'
      return { error: msg }
    }
  }

  if (!result) return { error: 'No se pudo guardar' }

  // Vincular fotos seleccionadas
  try {
    const selectedRaw = formData.get('selected_photo_ids') as string
    if (selectedRaw) {
      const ids: string[] = JSON.parse(selectedRaw)
      if (Array.isArray(ids) && ids.length > 0) {
        // Admin client bypassa RLS (necesario cuando secretary vincula fotos del agent dueño)
        const photoUpdate = adminClient
          .from('property_photos')
          .update({ property_id: result.id })
          .in('id', ids)
        // Si NO es elevated, restringimos a sus propias fotos
        if (!isElevated) photoUpdate.eq('agent_id', user.id)
        await photoUpdate
      }
    }
  } catch { /* non-blocking */ }

  if (publish) {
    // Validar que la propiedad tenga los campos obligatorios de Sooprema
    // (year_built NO es obligatorio: Chloe confirmó que no siempre se conoce)
    const missing: string[] = []
    if (!propertyData.price) missing.push('Precio')
    if (!propertyData.bedrooms) missing.push('Dormitorios')
    if (!propertyData.bathrooms) missing.push('Baños')
    if (!propertyData.build_area_m2) missing.push('m² construidos')
    if (!propertyData.plot_area_m2 && propertyData.property_type === 'villa') missing.push('m² parcela')
    if (!propertyData.description_es && !propertyData.description_en) missing.push('Descripción')
    if (!propertyData.location && !propertyData.zone) missing.push('Ubicación o Zona')

    if (missing.length > 0) {
      await writeClient
        .from('properties')
        .update({ suprema_status: null })
        .eq('id', result.id)
      return {
        error: `Faltan campos obligatorios para publicar en Sooprema: ${missing.join(', ')}. La propiedad se guardó pero no se publicará hasta que rellenes estos datos.`,
        propertyId: result.id,
      }
    }

    const { data: jobInserted } = await adminClient
      .from('suprema_jobs')
      .insert({
        property_id: result.id,
        agent_id: agentId,
        status: 'queued',
      })
      .select('id')
      .single()
    await writeClient
      .from('properties')
      .update({ suprema_status: 'publishing' })
      .eq('id', result.id)

    // Disparar la automation INMEDIATAMENTE (fire-and-forget).
    // Sin esto el job se queda 'queued' eternamente porque el cron está deshabilitado en plan Hobby.
    if (jobInserted?.id) {
      const token = process.env.SOOPREMA_INTERNAL_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      const url = `${getSiteUrl()}/api/sooprema/run/${jobInserted.id}`
      // No esperamos respuesta: la action de createProperty devuelve rápido.
      // El endpoint /api/sooprema/run/[jobId] tiene maxDuration 60s para dejar correr Playwright.
      fetch(url, {
        method: 'POST',
        headers: { 'x-sooprema-token': token },
        cache: 'no-store',
      }).catch((err) => {
        console.error('[sooprema] failed to trigger job', jobInserted.id, err)
      })
    }

    await adminClient.from('notifications').insert({
      type: 'suprema_started',
      title: '🚀 Publicando en Sooprema',
      message: `La propiedad ${reference} se está publicando. Te avisaremos cuando termine.`,
      target_user_id: agentId,
      is_read: false,
    })

    // Notificar a todas las secretarias para que puedan ejecutar el job si el agente no lo hace
    const { data: secretaries } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'secretary')

    if (secretaries && secretaries.length > 0) {
      await adminClient.from('notifications').insert(
        secretaries.map((s) => ({
          type: 'suprema_started',
          title: '📋 Nueva propiedad pendiente de publicar',
          message: `${reference} está en cola. Entra a /admin/sooprema para ejecutar la publicación.`,
          target_user_id: s.id,
          is_read: false,
        }))
      )
    }
  }

  revalidatePath('/properties')
  return { success: true, propertyId: result.id }
}

export async function generateDescription(formData: FormData) {
  const type = formData.get('property_type') as string
  const zone = formData.get('zone') as string
  const bedrooms = formData.get('bedrooms')
  const bathrooms = formData.get('bathrooms')
  const buildArea = formData.get('build_area_m2')
  const price = formData.get('price')
  const features = (formData.get('features') as string)?.split(',') ?? []
  const lang = (formData.get('lang') as string) || 'en'
  const sourceText = (formData.get('source_text') as string) || ''
  const isTranslate = formData.get('translate') === '1' && sourceText.trim().length > 0

  const langNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish (Español)',
    de: 'German (Deutsch)',
    fr: 'French (Français)',
    nl: 'Dutch (Nederlands)',
    ru: 'Russian (Русский)',
    pl: 'Polish (Polski)',
  }
  const langLabel = langNames[lang] || 'English'

  const prompt = isTranslate
    ? `Translate the following luxury real estate description from English to ${langLabel}.
Keep the professional tone, the same structure, and the same level of detail.
Do not add or remove information. Output only the translated text, in ${langLabel}, with no preface or quotes.

ORIGINAL (English):
${sourceText}`
    : `Write a professional luxury real estate description in ${langLabel} for a ${type} in ${zone}, Costa Blanca, Spain.
Details: ${bedrooms} bedrooms, ${bathrooms} bathrooms, ${buildArea}m², price €${price}.
Features: ${features.join(', ')}.
Requirements: no bullets, no emojis, 3-4 sentences, professional tone, mention lifestyle and location benefits.
End with distances to the beach and Alicante Airport.
Output only the description text, in ${langLabel}.`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-4-5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    })

    if (!response.ok) throw new Error('AI request failed')
    const json = await response.json()
    const description = json.choices?.[0]?.message?.content?.trim()
    return { description }
  } catch {
    return { error: 'No se pudo generar la descripción. Inténtalo de nuevo.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// AI: generación + traducción multi-idioma del título + descripción Pro
// ──────────────────────────────────────────────────────────────────────

const LANG_NAMES: Record<string, string> = {
  es: 'Spanish (Español)',
  en: 'English',
  de: 'German (Deutsch)',
  fr: 'French (Français)',
  nl: 'Dutch (Nederlands)',
  ru: 'Russian (Русский)',
  pl: 'Polish (Polski)',
}

const TARGET_LANGS = ['es', 'en', 'de', 'fr', 'nl', 'ru', 'pl'] as const

interface PropertyContext {
  property_type?: string | null
  zone?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  build_area_m2?: number | null
  plot_area_m2?: number | null
  terrace_area_m2?: number | null
  garden_area_m2?: number | null
  price?: number | null
  views?: string | null
  has_pool?: boolean | null
  has_garage?: boolean | null
  has_garden?: boolean | null
  has_terrace?: boolean | null
  has_ac?: boolean | null
  has_sea_view?: boolean | null
  year_built?: number | null
  year_reformed?: number | null
}

function buildStructuredFactsBlock(ctx: PropertyContext): string {
  const facts: string[] = []
  if (ctx.property_type) facts.push(`Type: ${ctx.property_type}`)
  if (ctx.zone) facts.push(`Zone: ${ctx.zone}, Costa Blanca, Spain`)
  if (ctx.bedrooms) facts.push(`${ctx.bedrooms} bedrooms`)
  if (ctx.bathrooms) facts.push(`${ctx.bathrooms} bathrooms`)
  if (ctx.build_area_m2) facts.push(`${ctx.build_area_m2}m² built`)
  if (ctx.plot_area_m2) facts.push(`${ctx.plot_area_m2}m² plot`)
  if (ctx.terrace_area_m2) facts.push(`${ctx.terrace_area_m2}m² terrace`)
  if (ctx.garden_area_m2) facts.push(`${ctx.garden_area_m2}m² garden`)
  if (ctx.price) facts.push(`Price: €${ctx.price.toLocaleString('en-US')}`)
  if (ctx.views) facts.push(`Views: ${ctx.views}`)
  if (ctx.year_built) facts.push(`Year built: ${ctx.year_built}`)
  if (ctx.year_reformed) facts.push(`Year reformed: ${ctx.year_reformed}`)

  const features: string[] = []
  if (ctx.has_pool) features.push('pool')
  if (ctx.has_sea_view) features.push('sea view')
  if (ctx.has_garden) features.push('garden')
  if (ctx.has_terrace) features.push('terrace')
  if (ctx.has_garage) features.push('garage')
  if (ctx.has_ac) features.push('air conditioning')
  if (features.length) facts.push(`Features: ${features.join(', ')}`)

  return facts.join('\n')
}

async function callOpenRouter(prompt: string, opts: { maxTokens?: number; model?: string } = {}): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.error('[ai] OPENROUTER_API_KEY missing')
    return null
  }
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model || 'anthropic/claude-sonnet-4.6',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens || 800,
    }),
  })
  if (!response.ok) {
    console.error('[ai] OpenRouter request failed', response.status, await response.text().catch(() => ''))
    return null
  }
  const json = await response.json()
  const content = json.choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : null
}

function parseTitleAndDescription(raw: string): { title: string; description: string } {
  // Modelos a veces devuelven JSON, a veces "Title: ...\nDescription: ..."
  // Intentamos JSON primero, luego regex.
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { title?: string; description?: string }
      if (parsed.title && parsed.description) {
        return { title: parsed.title.trim(), description: parsed.description.trim() }
      }
    } catch {
      // pasa a regex
    }
  }
  const titleMatch = raw.match(/(?:Title|TÍTULO|TITLE):\s*([^\n]+)/i)
  const descMatch = raw.match(/(?:Description|DESCRIPCIÓN|DESCRIPTION):\s*([\s\S]+)$/i)
  return {
    title: (titleMatch?.[1] || '').trim(),
    description: (descMatch?.[1] || raw).trim(),
  }
}

/**
 * Genera título + descripción Pro en el idioma origen, combinando:
 * - los datos estructurados de la propiedad (precio, m², dormitorios, vistas, etc.)
 * - las notas crudas que el agente escribió en `description_base`
 *
 * Devuelve el par (title, description) en el idioma indicado.
 * Lo llama el botón "Generar con IA" del form de propiedades.
 */
export async function generatePropertyTitleAndDescription(args: {
  baseText: string
  lang: string
  context: PropertyContext
}): Promise<{ title?: string; description?: string; error?: string }> {
  const lang = TARGET_LANGS.includes(args.lang as typeof TARGET_LANGS[number]) ? args.lang : 'es'
  const langLabel = LANG_NAMES[lang]
  const facts = buildStructuredFactsBlock(args.context)
  const baseText = args.baseText?.trim() || '(no extra notes)'

  const prompt = `You are a senior luxury real estate copywriter at Costa Blanca Investments (CBI), an exclusive Costa Blanca Norte agency in Spain. Write a professional, polished, evocative listing for a high-net-worth international buyer.

Combine TWO sources of truth:

[STRUCTURED FACTS — from our database]
${facts || '(none)'}

[AGENT'S RAW NOTES — human context, may contain typos or incomplete sentences]
${baseText}

OUTPUT INSTRUCTIONS:
- Language: ${langLabel}
- Output strictly in this JSON format and nothing else:
{"title": "...", "description": "..."}
- Title: max 80 chars, evocative, mentions the property type + key feature + location (ej: "Mediterranean Villa with Sea Views in Altea").
- Description: 4-6 sentences, professional luxury tone, NO bullets, NO emojis, NO "this villa offers" clichés. Mention lifestyle, key features, location benefits, and end with a sentence about distances (beach, Alicante airport, Valencia airport).
- If a fact appears in BOTH sources, prefer the agent's wording when it's more specific.
- If structured facts are minimal, lean more on the agent's notes.
- Never invent specific numbers (price, m², year) that aren't in the structured facts.

Output the JSON only.`

  const raw = await callOpenRouter(prompt, { maxTokens: 700 })
  if (!raw) return { error: 'No se pudo generar. Revisa que OPENROUTER_API_KEY esté configurada.' }
  const { title, description } = parseTitleAndDescription(raw)
  if (!title || !description) return { error: 'Respuesta de la IA incompleta. Inténtalo de nuevo.' }
  return { title, description }
}

/**
 * Traduce un par (title, description) del idioma origen a los 6 idiomas restantes.
 * Devuelve un mapa { es: {title, description}, en: {...}, ... }
 * Lo llama el botón "Traducir a 7 idiomas".
 */
export async function translatePropertyTextsToAllLanguages(args: {
  sourceLang: string
  sourceTitle: string
  sourceDescription: string
}): Promise<{
  translations?: Record<string, { title: string; description: string }>
  error?: string
}> {
  const sourceLang = args.sourceLang
  const sourceLangLabel = LANG_NAMES[sourceLang] || 'English'

  if (!args.sourceTitle || !args.sourceDescription) {
    return { error: 'Falta el título o la descripción de origen para traducir.' }
  }

  const targets = TARGET_LANGS.filter((l) => l !== sourceLang)
  const targetLabels = targets.map((l) => `- ${l}: ${LANG_NAMES[l]}`).join('\n')

  const prompt = `You are a professional translator specialized in luxury real estate. Translate the following title and description from ${sourceLangLabel} to the listed target languages. Keep the professional, evocative tone and the same structure. Do not add or remove information. For each target language output the translated title and description.

[SOURCE — ${sourceLangLabel}]
TITLE: ${args.sourceTitle}
DESCRIPTION: ${args.sourceDescription}

[TARGET LANGUAGES]
${targetLabels}

OUTPUT FORMAT — strict JSON, no other text:
{
${targets.map((l) => `  "${l}": { "title": "...", "description": "..." }`).join(',\n')}
}`

  const raw = await callOpenRouter(prompt, { maxTokens: 3500 })
  if (!raw) return { error: 'No se pudo traducir. Revisa OPENROUTER_API_KEY.' }

  // Extraer JSON
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { error: 'Respuesta de la IA inválida.' }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, { title: string; description: string }>
    // Añadir el idioma origen al resultado para tener el set completo de 7
    const result: Record<string, { title: string; description: string }> = {
      [sourceLang]: { title: args.sourceTitle, description: args.sourceDescription },
    }
    for (const lang of targets) {
      const t = parsed[lang]
      if (t?.title && t?.description) {
        result[lang] = { title: t.title.trim(), description: t.description.trim() }
      }
    }
    return { translations: result }
  } catch {
    return { error: 'No se pudo parsear la traducción. Inténtalo de nuevo.' }
  }
}

/**
 * Persiste los textos generados/traducidos en la BD de la propiedad.
 * El form llama esto cuando el agente edita los textos Pro y guarda.
 */
export async function savePropertyTexts(args: {
  propertyId: string
  baseText: string
  sourceLang: string
  texts: Record<string, { title: string; description: string }>
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const adminClient = createAdminClient()
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isElevated = callerProfile?.role === 'admin' || callerProfile?.role === 'secretary'
  const writeClient = isElevated ? adminClient : supabase

  const update: Record<string, string | null> = {
    description_base: args.baseText || null,
    description_source_lang: args.sourceLang,
  }
  for (const lang of TARGET_LANGS) {
    const t = args.texts[lang]
    update[`title_${lang}`] = t?.title || null
    update[`description_${lang}`] = t?.description || null
  }

  const { error } = await writeClient
    .from('properties')
    .update(update)
    .eq('id', args.propertyId)

  if (error) return { error: error.message }
  revalidatePath('/properties')
  return { success: true }
}

export async function deleteProperty(propertyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const adminClient = createAdminClient()
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isElevated = callerProfile?.role === 'admin' || callerProfile?.role === 'secretary'

  const query = (isElevated ? adminClient : supabase)
    .from('properties')
    .delete()
    .eq('id', propertyId)

  // Agentes solo borran las suyas; admin/secretary borran cualquier propiedad
  if (!isElevated) query.eq('agent_id', user.id)

  const { error } = await query

  if (error) return { error: error.message }

  await audit({ actor_id: user.id, actor_email: user.email, action: 'property.delete', entity_type: 'properties', entity_id: propertyId })

  revalidatePath('/properties')
  return { success: true }
}
