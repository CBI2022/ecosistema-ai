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

export async function saveProperty(formData: FormData, publish = false) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const zone = formData.get('zone') as string
  const reference =
    (formData.get('reference') as string) ||
    (await generateReference(supabase, zone))

  const propertyData = {
    agent_id: user.id,
    reference,
    title: formData.get('title') as string,
    price: Number(formData.get('price')) || null,
    property_type: formData.get('property_type') as string,
    status: publish ? 'published' : 'draft',
    bedrooms: Number(formData.get('bedrooms')) || null,
    bathrooms: Number(formData.get('bathrooms')) || null,
    build_area_m2: Number(formData.get('build_area_m2')) || null,
    plot_area_m2: Number(formData.get('plot_area_m2')) || null,
    location: formData.get('location') as string,
    zone,
    description_es: formData.get('description_es') as string,
    description_en: formData.get('description_en') as string,
    has_pool: formData.get('has_pool') === 'on',
    has_garage: formData.get('has_garage') === 'on',
    has_garden: formData.get('has_garden') === 'on',
    has_terrace: formData.get('has_terrace') === 'on',
    has_ac: formData.get('has_ac') === 'on',
    has_sea_view: formData.get('has_sea_view') === 'on',
    description_nl: formData.get('description_nl') as string,
    ibi_annual: Number(formData.get('ibi_annual')) || null,
    basura_annual: Number(formData.get('basura_annual')) || null,
    community_annual: Number(formData.get('community_annual')) || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('properties')
    .upsert(propertyData)
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Vincular fotos seleccionadas (de Jelle) a esta propiedad
  try {
    const selectedRaw = formData.get('selected_photo_ids') as string
    if (selectedRaw) {
      const ids: string[] = JSON.parse(selectedRaw)
      if (Array.isArray(ids) && ids.length > 0) {
        const admin = createAdminClient()
        await admin
          .from('property_photos')
          .update({ property_id: data.id })
          .in('id', ids)
          .eq('agent_id', user.id)
      }
    }
  } catch {
    // non-blocking
  }

  if (publish) {
    // Queue Suprema job
    await supabase.from('suprema_jobs').insert({
      property_id: data.id,
      agent_id: user.id,
      status: 'queued',
    })
    await supabase
      .from('properties')
      .update({ suprema_status: 'publishing' })
      .eq('id', data.id)

    // Notificación inicial al agente
    const admin = createAdminClient()
    await admin.from('notifications').insert({
      type: 'suprema_started',
      title: '🚀 Publicando en Suprema',
      message: `La propiedad ${reference} se está publicando. Te avisaremos cuando termine.`,
      target_user_id: user.id,
      is_read: false,
    })
  }

  revalidatePath('/properties')
  return { success: true, propertyId: data.id }
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
