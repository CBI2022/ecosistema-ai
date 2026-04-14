'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const { count } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .like('reference', `${prefix}%`)
  return `${prefix}${String((count ?? 0) + 1).padStart(3, '0')}`
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

  const zone = str(formData, 'zone') || 'Altea'
  const reference = str(formData, 'reference') || (await generateReference(supabase, zone))

  const propertyData: Record<string, unknown> = {
    agent_id: user.id,
    reference,

    // Identificación
    title: str(formData, 'title'),
    title_headline: str(formData, 'title_headline'),
    title_in_text: str(formData, 'title_in_text'),

    // Tipo / estado
    property_type: str(formData, 'property_type') || 'villa',
    listing_type: str(formData, 'listing_type') || 'sale',
    status: publish ? 'published' : 'draft',
    status_tags: arrCsv(formData, 'status_tags'),
    occupation_status: str(formData, 'occupation_status'),

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
    postal_code: str(formData, 'postal_code'),
    city: str(formData, 'city'),

    // Descripciones
    description_es: str(formData, 'description_es'),
    description_en: str(formData, 'description_en'),
    description_nl: str(formData, 'description_nl'),
    views: str(formData, 'views'),

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
    furniture_status: str(formData, 'furniture_status'),

    // Certificado / portales
    energy_certificate: str(formData, 'energy_certificate') || 'D',
    publish_sooprema: bool(formData, 'publish_sooprema') !== false,
    publish_idealista: bool(formData, 'publish_idealista'),
    publish_imoluc: bool(formData, 'publish_imoluc'),

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
    const { data, error } = await supabase
      .from('properties')
      .update(propertyData)
      .eq('id', propertyId)
      .select('id')
      .single()
    if (error) return { error: error.message }
    result = data
  } else {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select('id')
      .single()
    if (error) return { error: error.message }
    result = data
  }

  if (!result) return { error: 'No se pudo guardar' }

  // Vincular fotos seleccionadas
  try {
    const selectedRaw = formData.get('selected_photo_ids') as string
    if (selectedRaw) {
      const ids: string[] = JSON.parse(selectedRaw)
      if (Array.isArray(ids) && ids.length > 0) {
        const admin = createAdminClient()
        await admin
          .from('property_photos')
          .update({ property_id: result.id })
          .in('id', ids)
          .eq('agent_id', user.id)
      }
    }
  } catch { /* non-blocking */ }

  if (publish) {
    await supabase.from('suprema_jobs').insert({
      property_id: result.id,
      agent_id: user.id,
      status: 'queued',
    })
    await supabase
      .from('properties')
      .update({ suprema_status: 'publishing' })
      .eq('id', result.id)

    const admin = createAdminClient()
    await admin.from('notifications').insert({
      type: 'suprema_started',
      title: '🚀 Publicando en Sooprema',
      message: `La propiedad ${reference} se está publicando. Te avisaremos cuando termine.`,
      target_user_id: user.id,
      is_read: false,
    })

    // Notificar a todas las secretarias para que puedan ejecutar el job si el agente no lo hace
    const { data: secretaries } = await admin
      .from('profiles')
      .select('id')
      .eq('role', 'secretary')

    if (secretaries && secretaries.length > 0) {
      await admin.from('notifications').insert(
        secretaries.map((s) => ({
          type: 'suprema_started',
          title: '📋 Nueva propiedad pendiente de publicar',
          message: `${reference} está en cola. Entra a /suprema para ejecutar la publicación.`,
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

  const langLabel = lang === 'es' ? 'Spanish (Español)' : lang === 'nl' ? 'Dutch (Nederlands)' : 'English'
  const distancesText = {
    en: 'End with distances: "The property is located X minutes from the beach and X minutes from Alicante Airport."',
    es: 'Termina con distancias: "La propiedad se encuentra a X minutos de la playa y X minutos del Aeropuerto de Alicante."',
    nl: 'Eindig met afstanden: "De woning ligt op X minuten van het strand en X minuten van Luchthaven Alicante."',
  }[lang] || ''

  const prompt = `Write a professional luxury real estate description in ${langLabel} for a ${type} in ${zone}, Costa Blanca, Spain.
Details: ${bedrooms} bedrooms, ${bathrooms} bathrooms, ${buildArea}m², price €${price}.
Features: ${features.join(', ')}.
Requirements: no bullets, no emojis, 3-4 sentences, professional tone, mention lifestyle and location benefits.
${distancesText}
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

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', propertyId)
    .eq('agent_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/properties')
  return { success: true }
}
