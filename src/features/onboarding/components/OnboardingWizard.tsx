'use client'

import { useTranslations } from 'next-intl'
import { useState, useRef } from 'react'
import { saveOnboarding } from '@/actions/onboarding'
import { uploadAvatar } from '@/actions/profile'

export function OnboardingWizard({ previewMode = false }: { previewMode?: boolean } = {}) {
  const t = useTranslations('training.onboarding')
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
    if (previewMode) {
      setError(t('previewModeWarning'))
      return
    }
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
              {t('step1Title')}
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
                  <span className="text-[9px] text-[#9A9080]">{t('photo')}</span>
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <span className="text-xs text-white">{t('change')}</span>
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
            <p className="text-[10px] text-[#9A9080]">{t('profilePhotoOptional')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('firstNameLabel')}</label>
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
              <label className={labelClass}>{t('lastNameLabel')}</label>
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
            <label className={labelClass}>{t('phoneLabel')}</label>
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
              if (!previewMode && (!data.first_name || !data.last_name)) {
                setError(t('nameRequired'))
                return
              }
              setError(null)
              setStep(2)
            }}
            className="w-full rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A]"
          >
            {t('nextGoals')}
          </button>
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              {t('step2Title')}
            </p>
            <p className="mt-1 text-xs text-[#9A9080]">
              {t('step2Subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('monthlyIncomeLabel')}</label>
              <input
                type="number"
                className={inputClass}
                placeholder="8000"
                value={data.monthly_income_goal}
                onChange={(e) => update('monthly_income_goal', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('closingsPerMonth')}</label>
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
              <label className={labelClass}>{t('listingsPerMonth')}</label>
              <input
                type="number"
                className={inputClass}
                placeholder="4"
                value={data.listings_per_month}
                onChange={(e) => update('listings_per_month', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('appointmentsPerWeek')}</label>
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
              <label className={labelClass}>{t('callsPerDay')}</label>
              <input
                type="number"
                className={inputClass}
                placeholder="20"
                value={data.calls_per_day}
                onChange={(e) => update('calls_per_day', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>{t('followupsPerDay')}</label>
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
              {t('cbiReference')}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#9A9080]">
              {t.rich('cbiReferenceText', {
                strong: (chunks) => <strong className="text-[#F5F0E8]">{chunks}</strong>,
              })}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-medium text-[#9A9080] transition hover:border-white/20"
            >
              {t('back')}
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#E8C96A]"
            >
              {t('nextMotivation')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Motivation */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
              {t('step3Title')}
            </p>
            <p className="mt-1 text-xs text-[#9A9080]">
              {t('step3Subtitle')}
            </p>
          </div>

          <div>
            <label className={labelClass}>
              {t('whyLabel')}
            </label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder={t('whyPlaceholder')}
              value={data.why}
              onChange={(e) => update('why', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              {t('dreamLifeLabel')}
            </label>
            <textarea
              rows={3}
              className={inputClass}
              placeholder={t('dreamLifePlaceholder')}
              value={data.dream_life}
              onChange={(e) => update('dream_life', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>{t('mottoLabel')}</label>
            <input
              type="text"
              className={inputClass}
              placeholder={t('mottoPlaceholder')}
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
              {t('back')}
            </button>
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex-1 rounded-xl bg-[#2ECC9A] py-3.5 text-sm font-bold uppercase tracking-[0.06em] text-black transition hover:bg-[#3DDAAA] disabled:opacity-50"
            >
              {loading ? t('saving') : t('completeProfile')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
