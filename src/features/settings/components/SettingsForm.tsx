'use client'

import { useState, useRef, useEffect } from 'react'
import {
  updateEmail,
  updateUserPassword,
  updateProfileDetails,
  uploadAvatar,
} from '@/actions/profile'
import { ReminderSettings, type ReminderSettingsHandle } from './ReminderSettings'
import { PushSettings } from './PushSettings'
import type { Profile } from '@/types/database'

interface SettingsFormProps {
  profile: Profile
}

const inputClass =
  'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-[#F5F0E8] placeholder-[#9A9080] outline-none transition focus:border-[#C9A84C]/60'
const labelClass =
  'block text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'
const sectionClass = 'rounded-2xl border border-white/8 bg-[#131313] p-6'
const sectionTitleClass =
  'text-sm font-bold uppercase tracking-[0.08em] text-[#C9A84C] mb-4'

export function SettingsForm({ profile }: SettingsFormProps) {
  // Datos personales
  const [fullName, setFullName] = useState(profile.full_name || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [initialName, setInitialName] = useState(profile.full_name || '')
  const [initialPhone, setInitialPhone] = useState(profile.phone || '')
  const [initialEmail, setInitialEmail] = useState(profile.email)

  // Email
  const [newEmail, setNewEmail] = useState('')

  // Password
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reminder (managed by child ref)
  const reminderRef = useRef<ReminderSettingsHandle>(null)
  const [reminderDirty, setReminderDirty] = useState(false)

  // Save state
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Dirty detection
  const detailsDirty = fullName !== initialName || phone !== initialPhone
  const emailDirty = newEmail.trim().length > 0
  const passwordDirty = password.length > 0
  const anyDirty = detailsDirty || emailDirty || passwordDirty || reminderDirty

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setAvatarUrl(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('avatar', file)
    const res = await uploadAvatar(fd)
    if (res?.avatarUrl) setAvatarUrl(res.avatarUrl)
    setAvatarUploading(false)
  }

  async function handleSaveAll() {
    if (!anyDirty || saving) return

    // Validations
    if (passwordDirty) {
      if (password !== passwordConfirm) {
        setToast({ type: 'error', text: 'Las contraseñas no coinciden' })
        return
      }
      if (password.length < 8) {
        setToast({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' })
        return
      }
    }

    setSaving(true)
    const errors: string[] = []

    if (detailsDirty) {
      const fd = new FormData()
      fd.append('full_name', fullName)
      fd.append('phone', phone)
      const res = await updateProfileDetails(fd)
      if (res?.error) errors.push(res.error)
      else {
        setInitialName(fullName)
        setInitialPhone(phone)
      }
    }

    if (emailDirty) {
      const fd = new FormData()
      fd.append('email', newEmail.trim())
      const res = await updateEmail(fd)
      if (res?.error) errors.push(res.error)
      else {
        setInitialEmail(newEmail.trim())
        setNewEmail('')
      }
    }

    if (passwordDirty) {
      const fd = new FormData()
      fd.append('password', password)
      const res = await updateUserPassword(fd)
      if (res?.error) errors.push(res.error)
      else { setPassword(''); setPasswordConfirm('') }
    }

    if (reminderDirty) {
      const res = reminderRef.current?.save()
      if (res && 'error' in res) errors.push(res.error)
    }

    setSaving(false)

    if (errors.length > 0) {
      setToast({ type: 'error', text: errors.join(' · ') })
    } else {
      setToast({ type: 'success', text: '✓ Todos los cambios guardados' })
    }
  }

  const initials = profile.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile.email.slice(0, 2).toUpperCase()

  return (
    <div className="pb-24">
      <div className="space-y-6">
        {/* Avatar */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Foto de perfil</h2>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-[#C9A84C]/30 bg-[#1C1C1C] transition hover:border-[#C9A84C]"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile.full_name || ''} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C9A84C] to-[#A88830] text-xl font-bold text-black">
                  {initials}
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                <span className="text-[10px] font-bold uppercase text-white">Cambiar</span>
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div>
              <p className="text-sm font-medium text-[#F5F0E8]">{profile.full_name || 'Sin nombre'}</p>
              <p className="text-xs text-[#9A9080]">La foto se guarda al instante</p>
            </div>
          </div>
        </div>

        {/* Datos personales */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Datos personales</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Bruno Felipe"
              />
            </div>
            <div>
              <label className={labelClass}>Teléfono / WhatsApp</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+34 651 77 03 68"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Cambiar email</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Email actual</label>
              <input
                type="email"
                value={initialEmail}
                disabled
                className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-sm text-[#9A9080] outline-none"
              />
            </div>
            <div>
              <label className={labelClass}>Nuevo email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={inputClass}
                placeholder="nuevo@email.com"
              />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Cambiar contraseña</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nueva contraseña (mín. 8 caracteres)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Dejar vacío para no cambiar"
              />
            </div>
            <div>
              <label className={labelClass}>Confirmar nueva contraseña</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Push notifications */}
        <PushSettings />

        {/* Reminder */}
        <ReminderSettings ref={reminderRef} onDirtyChange={setReminderDirty} />

        {/* Info rol */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Información de la cuenta</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9A9080]">Rol</p>
              <p className="mt-1 text-sm font-medium capitalize text-[#F5F0E8]">{profile.role}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9A9080]">Estado</p>
              <p className="mt-1 text-sm font-medium capitalize text-[#2ECC9A]">{profile.status}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#9A9080]">Miembro desde</p>
              <p className="mt-1 text-sm font-medium text-[#F5F0E8]">
                {new Date(profile.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky global save bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#C9A84C]/20 bg-[#0A0A0A]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex-1">
            {toast ? (
              <p className={`text-sm font-medium ${toast.type === 'success' ? 'text-[#2ECC9A]' : 'text-red-400'}`}>
                {toast.text}
              </p>
            ) : anyDirty ? (
              <p className="text-xs text-[#9A9080]">Tienes cambios sin guardar</p>
            ) : (
              <p className="text-xs text-[#9A9080]/60">Sin cambios pendientes</p>
            )}
          </div>
          <button
            onClick={handleSaveAll}
            disabled={!anyDirty || saving}
            className="rounded-xl bg-[#C9A84C] px-6 py-3 text-sm font-bold uppercase tracking-[0.08em] text-black transition hover:bg-[#E8C96A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Guardando...' : '💾 Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
