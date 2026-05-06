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

    // Descripciones (7 idiomas)
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
