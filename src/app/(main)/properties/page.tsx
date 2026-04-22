import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PropertyForm } from '@/features/properties/components/PropertyForm'
import { PropertyList } from '@/features/properties/components/PropertyList'

interface PropertiesPageProps {
  searchParams: Promise<{ edit?: string }>
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const editId = params.edit

  const admin = createAdminClient()
  const [{ data: properties }, { data: availablePhotos }, editProp] = await Promise.all([
    admin
      .from('properties')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('property_photos')
      .select('id, storage_path, file_name, is_drone, property_id')
      .eq('agent_id', user.id)
      .is('property_id', null)
      .order('created_at', { ascending: false })
      .limit(60),
    editId
      ? admin.from('properties').select('*').eq('id', editId).eq('agent_id', user.id).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
  ])

  const storageBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          {editProp ? 'Editar propiedad' : 'New Property Listing'}
        </h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          {editProp ? 'Modifica los datos y guarda o vuelve a publicar' : 'Rellena los datos, genera una descripción con IA y publica en Sooprema'}
        </p>
      </div>

      <PropertyForm
        availablePhotos={availablePhotos || []}
        storageBaseUrl={storageBaseUrl}
        initialProperty={editProp}
      />

      {properties && properties.length > 0 && (
        <PropertyList properties={properties} />
      )}
    </div>
  )
}
