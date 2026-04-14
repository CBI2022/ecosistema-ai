'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Eliminar una foto (solo fotógrafo o admin)
export async function deletePhoto(photoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return { error: 'No autorizado' }
  }

  // Obtener storage_path para eliminar también del bucket
  const { data: photo } = await admin
    .from('property_photos')
    .select('storage_path')
    .eq('id', photoId)
    .single()

  // Eliminar registro DB
  const { error } = await admin.from('property_photos').delete().eq('id', photoId)
  if (error) return { error: error.message }

  // Best-effort: extraer path relativo del storage y eliminar
  if (photo?.storage_path) {
    try {
      const match = photo.storage_path.match(/property-photos\/(.+)$/)
      if (match?.[1]) {
        await admin.storage.from('property-photos').remove([match[1]])
      }
    } catch { /* non-blocking */ }
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

// Eliminar un set completo (todas las fotos de un shoot_id)
export async function deletePhotoSet(shootId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return { error: 'No autorizado' }
  }

  // Listar y eliminar fotos del shoot
  const { data: photos } = await admin
    .from('property_photos')
    .select('id, storage_path')
    .eq('shoot_id', shootId)

  if (photos && photos.length > 0) {
    const paths = photos
      .map((p) => p.storage_path.match(/property-photos\/(.+)$/)?.[1])
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      try { await admin.storage.from('property-photos').remove(paths) } catch {}
    }

    await admin.from('property_photos').delete().eq('shoot_id', shootId)
  }

  // Revertir shoot a scheduled
  await admin
    .from('photo_shoots')
    .update({ status: 'scheduled', updated_at: new Date().toISOString() })
    .eq('id', shootId)

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true, removed: photos?.length ?? 0 }
}

// Actualizar metadata de una foto (is_drone, sort_order)
export async function updatePhoto(photoId: string, updates: { is_drone?: boolean; sort_order?: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'photographer' && profile?.role !== 'admin') {
    return { error: 'No autorizado' }
  }

  const { error } = await admin
    .from('property_photos')
    .update(updates)
    .eq('id', photoId)

  if (error) return { error: error.message }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function uploadPhotos(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const agentId = formData.get('agent_id') as string
  const propertyReference = formData.get('property_reference') as string
  const shootId = (formData.get('shoot_id') as string) || null
  const photos = formData.getAll('photos') as File[]

  if (!photos.length) return { error: 'No photos provided' }

  // Find property by reference to get property_id
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('reference', propertyReference)
    .eq('agent_id', agentId)
    .single()

  const uploads = await Promise.allSettled(
    photos.map(async (photo, idx) => {
      const ext = photo.name.split('.').pop() || 'jpg'
      const path = `properties/${agentId}/${propertyReference}/${Date.now()}_${idx}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(path, photo, { contentType: photo.type, upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('property-photos')
        .getPublicUrl(path)

      await supabase.from('property_photos').insert({
        agent_id: agentId,
        photographer_id: user.id,
        property_id: property?.id ?? null,
        storage_path: publicUrl,
        file_name: photo.name,
        shoot_id: shootId,
        sort_order: idx,
        is_drone: photo.name.toLowerCase().includes('drone'),
      })
    })
  )

  const errors = uploads
    .filter((r) => r.status === 'rejected')
    .map((r) => (r as PromiseRejectedResult).reason?.message)

  if (errors.length === photos.length) {
    return { error: 'Failed to upload photos. Check storage bucket setup.' }
  }

  // Mark shoot as completed if linked
  if (shootId) {
    await supabase
      .from('photo_shoots')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', shootId)
  }

  revalidatePath('/photographer')
  revalidatePath('/dashboard')
  return { success: true, uploaded: uploads.length - errors.length }
}
