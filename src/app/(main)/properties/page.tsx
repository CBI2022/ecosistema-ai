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

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isElevated = profile?.role === 'admin' || profile?.role === 'secretary'

  // Para admin/secretary: lista mínima de agentes (solo id + nombre) para asignar la propiedad
  const agentOptionsPromise = isElevated
    ? admin
        .from('profiles')
        .select('id, full_name, email')
        .eq('status', 'approved')
        .in('role', ['agent', 'admin'])
        .order('full_name', { ascending: true })
        .then((r) => r.data ?? [])
    : Promise.resolve(null)

  // Properties: agents ven solo las suyas; admin/secretary ven todas
  const propertiesQuery = admin
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(isElevated ? 100 : 20)
  if (!isElevated) propertiesQuery.eq('agent_id', user.id)

  // Photos disponibles para vincular (no asociadas a una propiedad todavía)
  const photosQuery = admin
    .from('property_photos')
    .select('id, storage_path, file_name, is_drone, property_id')
    .is('property_id', null)
    .order('created_at', { ascending: false })
    .limit(60)
  if (!isElevated) photosQuery.eq('agent_id', user.id)

  const editPropertyPromise = editId
    ? (isElevated
        ? admin.from('properties').select('*').eq('id', editId).maybeSingle()
        : admin.from('properties').select('*').eq('id', editId).eq('agent_id', user.id).maybeSingle()
      ).then((r) => r.data)
    : Promise.resolve(null)

  const [{ data: properties }, { data: availablePhotos }, editProp, agentOptions] = await Promise.all([
    propertiesQuery,
    photosQuery,
    editPropertyPromise,
    agentOptionsPromise,
  ])

  const agentsMap = isElevated && agentOptions
    ? Object.fromEntries(agentOptions.map((a) => [a.id, { full_name: a.full_name, email: a.email }]))
    : null

  const storageBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#F5F0E8]">
          {editProp ? 'Editar propiedad' : 'New Property Listing'}
        </h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          {editProp
            ? 'Modifica los datos y guarda o vuelve a publicar'
            : 'Rellena los datos, genera una descripción con IA y publica en Sooprema'}
        </p>
      </div>

      <PropertyForm
        availablePhotos={availablePhotos || []}
        storageBaseUrl={storageBaseUrl}
        initialProperty={editProp}
        agentOptions={isElevated ? agentOptions : null}
      />

      {properties && properties.length > 0 && (
        <PropertyList
          properties={properties}
          agentsMap={agentsMap}
          listTitle={isElevated ? 'Propiedades' : 'My Properties'}
        />
      )}
    </div>
  )
}
