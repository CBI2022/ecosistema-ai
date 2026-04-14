'use client'

import { useState, useRef } from 'react'
import { saveOnboarding } from '@/actions/onboarding'
import { uploadAvatar } from '@/actions/profile'

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [data, setData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    monthly_income_goal: '',
    closings_per_month: '',
    listings_per_month: '',
    appointments_per_week: '',
    calls_per_day: '',
    followups_per_day: '',
    why: '',
    dream_life: '',
    motto: '',
  })

  function update(field: string, value: string) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setLoading(true)
    setError(null)
    // Upload avatar first if provided
    if (avatarFile) {
      const fd = new FormData()
      fd.append('avatar', avatarFile)
      await uploadAvatar(fd)
    }
    const formData = new FormData()
    Object.entries(data).forEach(([k, v]) => formData.append(k, v))
    const result = await saveOnboarding(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#9A9080] outline-none transition focus:border-[#C9A84C]/60 focus:ring-1 focus:ring-[#C9A84C]/20'
  const labelClass =
    'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

  return (
    <div className="w-full max-w-lg">
      {/* Progress */}
      <div className="mb-8 flex items-center justify-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                s < step
                  ? 'bg-[#C9A84C] text-black'
                  : s === step
                    ? 'border-2 border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                    : 'border border-white/10 bg-white/5 text-[#9A9080]'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div
                className={`h-px w-12 ${s < step ? 'bg-[#C9A84C]' : 'bg-white/10'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Personal Info */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              Paso 1 de 3 — Información personal
            </p>
          </div>

          {/* Avatar upload */}
          <div className="mb-5 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-[#C9A84C]/40 bg-[#1C1C1C] transition hover:border-[#C9A84C]"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <span className="text-2xl opacity-40">👤</span>
                  <span className="text-[9px] text-[#9A9080]">Foto</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <span className="text-xs text-white">Cambiar</span>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
              }}
            />
            <p className="text-[10px] text-[#9A9080]">Foto de perfil (opcional)</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Bruno"
                value={data.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Apellido *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Felipe"
                value={data.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Teléfono / WhatsApp</label>
            <input
              type="tel"
              className={inputClass}
              placeholder="+34 651 77 03 68"
              value={data.phone}
              onChange={(e) => update('phone', e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              if (!data.first_name || !data.last_name) {
                setError('Nombre y apellido son obligatorios')
                return
              }
              setError(null)
              setStep(2)
            }}
            className="w-full rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A]"
          >
            Siguiente — Objetivos →
          </button>
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              Paso 2 de 3 — Objetivos anuales
            </p>
            <p className="mt-1 text-xs text-[#9A9080]">
              Tus metas impulsan tu plan diario y marcador
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ingresos mensuales (€)</label>
              <input
                type="number"
                className={inputClass}
                placeholder="8000"
                value={data.monthly_income_goal}
                onChange={(e) => update('monthly_income_goal', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Closings / mes</label>
              <input
                type="number"
                className={inputClass}
                placeholder="2"
                value={data.closings_per_month}
                onChange={(e) => update('closings_per_month', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Captaciones / mes</label>
              <input
                type="number"
                className={inputClass}
                placeholder="4"
                value={data.listings_per_month}
                onChange={(e) => update('listings_per_month', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Citas / semana</label>
              <input
                type="number"
                className={inputClass}
                placeholder="5"
                value={data.appointments_per_week}
                onChange={(e) =>
                  update('appointments_per_week', e.target.value)
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Llamadas / día</label>
              <input
                type="number"
                className={inputClass}
                placeholder="20"
                value={data.calls_per_day}
                onChange={(e) => update('calls_per_day', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Follow-ups / día</label>
              <input
                type="number"
                className={inputClass}
                placeholder="15"
                value={data.followups_per_day}
                onChange={(e) => update('followups_per_day', e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#C9A84C]">
              Referencia CBI
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9A9080]">
              Los mejores agentes hacen <strong className="text-[#F5F0E8]">20+ llamadas/día</strong> y{' '}
              <strong className="text-[#F5F0E8]">15+ follow-ups</strong>. Comisión media en CBI:{' '}
              <strong className="text-[#F5F0E8]">~€20K por cierre</strong>.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-[#9A9080] transition hover:border-white/20"
            >
              ← Atrás
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A]"
            >
              Siguiente — Motivación →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Motivation */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              Paso 3 de 3 — Tu motivación
            </p>
            <p className="mt-1 text-xs text-[#9A9080]">
              Privado — solo tú lo ves
            </p>
          </div>

          <div>
            <label className={labelClass}>
              ¿Por qué estás aquí? ¿Qué quieres conseguir?
            </label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="Quiero ganar €10K/mes para comprar mi primera casa..."
              value={data.why}
              onChange={(e) => update('why', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              ¿Cómo es tu vida ideal en 3 años?
            </label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder="Viviendo en Moraira, cerrando 5 operaciones al mes..."
              value={data.dream_life}
              onChange={(e) => update('dream_life', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Tu frase de poder</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Cada no me acerca más a un sí."
              value={data.motto}
              onChange={(e) => update('motto', e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-[#9A9080] transition hover:border-white/20"
            >
              ← Atrás
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#2ECC9A] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#3DDAAA] disabled:opacity-50"
            >
              {loading ? 'Guardando...' : '✓ Completar perfil'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
