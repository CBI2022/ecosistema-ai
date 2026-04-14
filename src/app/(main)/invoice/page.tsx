import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { InvoiceForm } from '@/features/tools/components/InvoiceForm'

export default async function InvoicePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email, phone')
    .eq('id', user.id)
    .single()

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Invoice Generator</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Genera facturas profesionales de comisión en PDF (con IVA 21%)</p>
      </div>
      <InvoiceForm
        defaultAgentName={profile?.full_name || ''}
        defaultAgentEmail={profile?.email || ''}
        defaultAgentPhone={profile?.phone || ''}
      />
    </div>
  )
}
