'use client'

import { useState } from 'react'

interface Photo {
  id: string
  storage_path: string
  file_name: string | null
  is_drone: boolean
  sort_order: number
  created_at: string
}

export function AgentPhotosGallery({ photos }: { photos: Photo[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  if (photos.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl border border-white/8 bg-[#131313] p-5">
      <div className="mb-4">
        <p className="text-sm font-bold text-[#F5F0E8]">My Property Photos</p>
        <p className="text-[11px] text-[#9A9080]">Uploaded by Jelle · {photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 sm:gap-1.5">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setLightbox(photo.storage_path)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-[#0A0A0A]"
          >
            <img
              src={photo.storage_path}
              alt={photo.file_name ?? ''}
              className="h-full w-full object-cover transition group-hover:scale-105 group-hover:opacity-90"
            />
            {photo.is_drone && (
              <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-bold text-white">
                drone
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-5 top-5 text-2xl text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
