import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { PropertyForm } from '@/features/properties/components/PropertyForm'
import type { Property } from '@/types/database'

function StatusBadge({ status }: { status: Property['suprema_status'] }) {
  const map: Record<string, { label: string; class: string }> = {
    pending: { label: 'Draft', class: 'bg-white/10 text-[#9A9080]' },
    publishing: { label: 'Publishing...', class: 'bg-yellow-500/15 text-yellow-400' },
    published: { label: 'Published', class: 'bg-[#2ECC9A]/15 text-[#2ECC9A]' },
    error: { label: 'Error', class: 'bg-red-500/15 text-red-400' },
  }
  const s = map[status] ?? map['pending']
  return <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${s.class}`}>{s.label}</span>
}

export default async function PropertiesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const [{ data: properties }, { data: availablePhotos }] = await Promise.all([
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
  ])

  const storageBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#F5F0E8]">New Property Listing</h1>
        <p className="mt-1 text-sm text-[#9A9080]">
          Rellena los datos, genera una descripción con IA y publica en Suprema
        </p>
      </div>

      {/* Form */}
      <PropertyForm
        availablePhotos={availablePhotos || []}
        storageBaseUrl={storageBaseUrl}
      />

      {/* Existing properties */}
      {properties && properties.length > 0 && (
        <div>
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
            My Properties
          </h2>
          <div className="space-y-2.5">
            {properties.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-[#131313] px-5 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#F5F0E8]">
                    {p.reference} — {p.title || p.location || 'Unnamed'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#9A9080]">
                    {p.zone} · €{p.price?.toLocaleString() ?? '—'} · {p.property_type}
                  </p>
                </div>
                <StatusBadge status={p.suprema_status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
