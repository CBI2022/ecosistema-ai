import { ValuationForm } from '@/features/tools/components/ValuationForm'

export default function ValuationPage() {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Property Valuation</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Genera un informe de valoración profesional en PDF</p>
      </div>
      <ValuationForm />
    </div>
  )
}
