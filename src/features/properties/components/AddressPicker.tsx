'use client'

import { useEffect, useRef, useState } from 'react'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    house_number?: string
    postcode?: string
    city?: string
    town?: string
    village?: string
    suburb?: string
    state?: string
  }
}

interface AddressPickerProps {
  initialQuery?: string
  initialLat?: number | null
  initialLng?: number | null
  onSelect?: (data: {
    street_name: string
    street_number: string
    postal_code: string
    city: string
    location: string
    latitude: number
    longitude: number
  }) => void
}

export function AddressPicker({ initialQuery = '', initialLat = null, initialLng = null, onSelect }: AddressPickerProps) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )
  const [selectedDisplay, setSelectedDisplay] = useState<string>('')
  const [confirmedSelection, setConfirmedSelection] = useState(false)
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debRef.current) clearTimeout(debRef.current)
    if (!query || query.trim().length < 4) {
      setResults([])
      return
    }
    if (selectedDisplay && query === selectedDisplay) return

    debRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // Restringir búsqueda a España (countrycodes=es) y máximo 6 sugerencias
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=es&limit=6&q=${encodeURIComponent(query)}`
        const res = await fetch(url, {
          headers: {
            // Nominatim exige User-Agent o Referer identificable. Cliente fetch del navegador ya envía Referer del dominio.
            'Accept': 'application/json',
          },
        })
        if (res.ok) {
          const data = await res.json()
          setResults(Array.isArray(data) ? data : [])
        }
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => { if (debRef.current) clearTimeout(debRef.current) }
  }, [query, selectedDisplay])

  function handlePick(r: NominatimResult) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (isNaN(lat) || isNaN(lng)) return

    setCoords({ lat, lng })
    setSelectedDisplay(r.display_name)
    setQuery(r.display_name)
    setResults([])
    setConfirmedSelection(true)

    const a = r.address || {}
    onSelect?.({
      street_name: a.road ?? '',
      street_number: a.house_number ?? '',
      postal_code: a.postcode ?? '',
      city: a.city ?? a.town ?? a.village ?? a.suburb ?? '',
      location: r.display_name,
      latitude: lat,
      longitude: lng,
    })
  }

  // OSM tile URL bbox alrededor del pin
  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.0035},${coords.lng + 0.005},${coords.lat + 0.0035}&layer=mapnik&marker=${coords.lat},${coords.lng}`
    : null

  return (
    <div className="space-y-3">
      <div className="relative">
        <label className="block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5">
          🔍 Buscar dirección oficial (España) *
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setConfirmedSelection(false)
            setSelectedDisplay('')
          }}
          placeholder="Ej. Carrer Barro 7, Altea"
          className="w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none focus:border-[#C9A84C]/60 placeholder-[#9A9080]"
        />
        {loading && (
          <p className="absolute right-3 top-9 text-[10px] text-[#9A9080]">Buscando…</p>
        )}
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#C9A84C]/30 bg-[#0F0F0F] shadow-xl">
            {results.map((r) => (
              <button
                key={r.place_id}
                type="button"
                onClick={() => handlePick(r)}
                className="block w-full border-b border-white/5 px-4 py-2.5 text-left text-xs text-[#F5F0E8] hover:bg-[#C9A84C]/10 last:border-0"
              >
                📍 {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {!confirmedSelection && query.length >= 4 && results.length === 0 && !loading && (
        <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-[11px] text-yellow-400">
          ⚠️ Esta dirección no se ha encontrado en el mapa oficial. Si no se puede seleccionar, <strong>Idealista rechazará la propiedad</strong>. Prueba variantes (ej. &quot;Calle&quot; vs &quot;Carrer&quot;).
        </p>
      )}

      {confirmedSelection && (
        <p className="rounded-lg border border-[#2ECC9A]/30 bg-[#2ECC9A]/10 px-4 py-2 text-[11px] text-[#2ECC9A]">
          ✓ Dirección validada: {selectedDisplay}
        </p>
      )}

      {coords && mapSrc && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <iframe
            src={mapSrc}
            className="block h-72 w-full"
            loading="lazy"
            title="Ubicación en el mapa"
          />
          <div className="flex items-center justify-between border-t border-white/8 bg-[#0A0A0A] px-3 py-2 text-[10px] text-[#9A9080]">
            <span>📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C9A84C] hover:text-[#E8C96A]"
            >
              Ver mapa grande →
            </a>
          </div>
        </div>
      )}

      {/* Hidden inputs para que el formulario los lea */}
      <input type="hidden" name="latitude" value={coords?.lat ?? ''} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ''} />
    </div>
  )
}
