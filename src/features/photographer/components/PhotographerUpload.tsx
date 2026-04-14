'use client'

import { useState, useRef } from 'react'
import { uploadPhotos } from '@/actions/photographer'

interface Agent { id: string; full_name: string | null }
interface Shoot { id: string; property_address: string | null; property_reference: string | null; agent_id: string }

interface PhotographerUploadProps {
  agents: Agent[]
  shoots: Shoot[]
  photographerId: string
}

export function PhotographerUpload({ agents, shoots, photographerId }: PhotographerUploadProps) {
  const [selectedAgent, setSelectedAgent] = useState('')
  const [reference, setReference] = useState('')
  const [selectedShoot, setSelectedShoot] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return
    const arr = Array.from(fileList)
    setFiles((prev) => [...prev, ...arr])
    arr.forEach((f) => {
      const reader = new FileReader()
      reader.onload = (e) => setPreviews((prev) => [...prev, e.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    if (!selectedAgent || !reference || files.length === 0) {
      setError('Selecciona agente, referencia y al menos una foto')
      return
    }
    setError(null)
    setLoading(true)

    const fd = new FormData()
    fd.append('agent_id', selectedAgent)
    fd.append('property_reference', reference)
    fd.append('photographer_id', photographerId)
    if (selectedShoot) fd.append('shoot_id', selectedShoot)
    files.forEach((f) => fd.append('photos', f))

    const res = await uploadPhotos(fd)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setFiles([])
      setPreviews([])
      setReference('')
      setSelectedAgent('')
      setSelectedShoot('')
    }
  }

  const inputClass = 'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
  const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

  if (success) {
    return (
      <div className="rounded-2xl border border-[#2ECC9A]/20 bg-[#131313] p-8 text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="text-lg font-bold text-[#2ECC9A]">Photos uploaded!</h2>
        <p className="mt-1 text-sm text-[#9A9080]">The agent can now see them in their dashboard</p>
        <button onClick={() => setSuccess(false)} className="mt-5 rounded-xl bg-[#C9A84C] px-6 py-2.5 text-sm font-bold text-black transition hover:bg-[#E8C96A]">
          Upload More
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#C9A84C]/12 bg-[#131313] p-5" style={{ borderTop: '1px solid #C9A84C' }}>
        <p className="mb-5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">
          📸 Detalles del shoot
        </p>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Agente destinatario *</label>
            <select className={inputClass} value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
              <option value="">Seleccionar agente...</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Referencia de propiedad *</label>
            <input type="text" className={inputClass} placeholder="A001, M023..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          {shoots.length > 0 && (
            <div>
              <label className={labelClass}>Asociar a un shoot (opcional)</label>
              <select className={inputClass} value={selectedShoot} onChange={(e) => setSelectedShoot(e.target.value)}>
                <option value="">Sin shoot específico</option>
                {shoots.map((s) => <option key={s.id} value={s.id}>{s.property_address || s.property_reference || s.id}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-[#C9A84C]/30 bg-[#131313] p-10 text-center transition hover:border-[#C9A84C]/60 hover:bg-[#C9A84C]/5"
      >
        <div className="mx-auto mb-3 text-4xl opacity-50">📁</div>
        <p className="text-sm font-semibold text-[#F5F0E8]">Drop photos here or click to browse</p>
        <p className="mt-1 text-xs text-[#9A9080]">JPG, PNG, WEBP accepted</p>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div>
          <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080]">
            {previews.length} photo{previews.length !== 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {previews.map((src, idx) => (
              <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 text-white transition group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className="w-full rounded-xl bg-[#C9A84C] py-3.5 text-sm font-bold text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
      >
        {loading ? `Uploading ${files.length} photos...` : `📤 Upload ${files.length || ''} Photos`}
      </button>
    </div>
  )
}
