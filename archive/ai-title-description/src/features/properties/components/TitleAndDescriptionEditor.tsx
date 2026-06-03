'use client'

import { useState, useTransition } from 'react'
import {
  generatePropertyTitleAndDescription,
  translatePropertyTextsToAllLanguages,
} from '@/actions/properties'

const LANGS = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
] as const

type LangCode = typeof LANGS[number]['code']

export interface PropertyContextSnapshot {
  property_type?: string | null
  zone?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  build_area_m2?: number | null
  plot_area_m2?: number | null
  terrace_area_m2?: number | null
  garden_area_m2?: number | null
  price?: number | null
  views?: string | null
  has_pool?: boolean | null
  has_garage?: boolean | null
  has_garden?: boolean | null
  has_terrace?: boolean | null
  has_ac?: boolean | null
  has_sea_view?: boolean | null
  year_built?: number | null
  year_reformed?: number | null
}

interface InitialTexts {
  description_base?: string | null
  description_source_lang?: string | null
  title_es?: string | null
  title_en?: string | null
  title_de?: string | null
  title_fr?: string | null
  title_nl?: string | null
  title_ru?: string | null
  title_pl?: string | null
  description_es?: string | null
  description_en?: string | null
  description_de?: string | null
  description_fr?: string | null
  description_nl?: string | null
  description_ru?: string | null
  description_pl?: string | null
  // Compatibilidad: si solo hay `title_headline` viejo lo usamos como title_es
  legacy_title?: string | null
  legacy_description?: string | null
}

interface Props {
  initial: InitialTexts
  /** Callback que devuelve el contexto actual del form (campos estructurados) en el momento de generar */
  getContext: () => PropertyContextSnapshot
}

export function TitleAndDescriptionEditor({ initial, getContext }: Props) {
  const [baseText, setBaseText] = useState(initial.description_base ?? initial.legacy_description ?? '')
  const [sourceLang, setSourceLang] = useState<LangCode>(
    (initial.description_source_lang as LangCode) || 'es',
  )
  const [activeLang, setActiveLang] = useState<LangCode>(sourceLang)

  const [titles, setTitles] = useState<Record<LangCode, string>>({
    es: initial.title_es || (initial.legacy_title || ''),
    en: initial.title_en || '',
    de: initial.title_de || '',
    fr: initial.title_fr || '',
    nl: initial.title_nl || '',
    ru: initial.title_ru || '',
    pl: initial.title_pl || '',
  })
  const [descriptions, setDescriptions] = useState<Record<LangCode, string>>({
    es: initial.description_es || '',
    en: initial.description_en || '',
    de: initial.description_de || '',
    fr: initial.description_fr || '',
    nl: initial.description_nl || '',
    ru: initial.description_ru || '',
    pl: initial.description_pl || '',
  })

  const [generating, startGenerating] = useTransition()
  const [translating, startTranslating] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleGenerate() {
    setErrorMsg(null)
    startGenerating(async () => {
      const res = await generatePropertyTitleAndDescription({
        baseText,
        lang: sourceLang,
        context: getContext(),
      })
      if (res.error) {
        setErrorMsg(res.error)
        return
      }
      if (res.title && res.description) {
        setTitles((prev) => ({ ...prev, [sourceLang]: res.title! }))
        setDescriptions((prev) => ({ ...prev, [sourceLang]: res.description! }))
        setActiveLang(sourceLang)
      }
    })
  }

  function handleTranslate() {
    setErrorMsg(null)
    if (!titles[sourceLang] || !descriptions[sourceLang]) {
      setErrorMsg('Primero genera la versión Pro en el idioma origen.')
      return
    }
    startTranslating(async () => {
      const res = await translatePropertyTextsToAllLanguages({
        sourceLang,
        sourceTitle: titles[sourceLang],
        sourceDescription: descriptions[sourceLang],
      })
      if (res.error) {
        setErrorMsg(res.error)
        return
      }
      if (res.translations) {
        const newTitles = { ...titles }
        const newDescs = { ...descriptions }
        for (const [lang, t] of Object.entries(res.translations)) {
          if (LANGS.some((l) => l.code === lang)) {
            newTitles[lang as LangCode] = t.title
            newDescs[lang as LangCode] = t.description
          }
        }
        setTitles(newTitles)
        setDescriptions(newDescs)
      }
    })
  }

  const titleEmpty = !titles[sourceLang]?.trim()
  const sourceLabel = LANGS.find((l) => l.code === sourceLang)?.label ?? 'Español'

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#1C1C1C] px-3.5 py-2.5 text-sm text-[#F5F0E8] outline-none transition focus:border-[#C9A84C]/60 placeholder-[#9A9080]'
  const labelClass = 'block text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A9080] mb-1.5'

  return (
    <div className="space-y-5">
      <p className="text-xs leading-relaxed text-[#9A9080]">
        Escribe abajo lo que sepas de la propiedad (notas humanas, detalles especiales, lo que quieras destacar). Pulsa <strong className="text-[#C9A84C]">Generar con IA</strong> y CBI combinará tus notas con los datos de la propiedad para crear un título y descripción profesionales en {sourceLabel}. Después puedes editarlos a mano o pulsar <strong className="text-[#C9A84C]">Traducir a 7 idiomas</strong>.
      </p>

      {/* Idioma origen */}
      <div>
        <label className={labelClass}>Idioma origen (en el que generamos primero)</label>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setSourceLang(l.code)
                setActiveLang(l.code)
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                sourceLang === l.code
                  ? 'border-[#C9A84C] bg-[#C9A84C]/15 text-[#C9A84C]'
                  : 'border-white/10 bg-white/4 text-[#9A9080] hover:text-[#F5F0E8]'
              }`}
            >
              <span className="mr-1.5">{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Descripción base (notas crudas) */}
      <div>
        <label className={labelClass}>📝 Descripción base — tus notas (NO se sube a Sooprema)</label>
        <textarea
          value={baseText}
          onChange={(e) => setBaseText(e.target.value)}
          rows={5}
          className={inputClass}
          placeholder={`Ej: "Villa con vistas espectaculares, recién reformada en 2023, piscina infinity, 5 min andando a la playa, garaje 2 coches, jardín privado con olivos centenarios"`}
        />
      </div>

      {/* Botones de IA */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || translating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#C9A84C] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#E8C96A] disabled:opacity-50"
        >
          {generating ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              Generando...
            </>
          ) : (
            <>✨ Generar con IA</>
          )}
        </button>
        <button
          type="button"
          onClick={handleTranslate}
          disabled={generating || translating || !titles[sourceLang]}
          className="inline-flex items-center gap-2 rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#C9A84C] transition hover:bg-[#C9A84C]/20 disabled:opacity-50"
        >
          {translating ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C]" />
              Traduciendo...
            </>
          ) : (
            <>🌍 Traducir a 7 idiomas</>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Tabs idiomas + editor */}
      <div className="rounded-2xl border border-white/8 bg-[#131313] p-4">
        <div className="mb-3 flex flex-wrap gap-1">
          {LANGS.map((l) => {
            const filled = !!(titles[l.code]?.trim() && descriptions[l.code]?.trim())
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => setActiveLang(l.code)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${
                  activeLang === l.code
                    ? 'bg-[#C9A84C] text-black'
                    : filled
                      ? 'bg-white/8 text-[#F5F0E8]'
                      : 'bg-white/4 text-[#9A9080]'
                }`}
                title={l.label}
              >
                <span className="mr-1">{l.flag}</span>
                {l.code.toUpperCase()}
                {filled && <span className="ml-1 text-[#2ECC9A]">●</span>}
              </button>
            )
          })}
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>
              Título Pro ({LANGS.find((l) => l.code === activeLang)?.label}) <span className="text-red-400">*</span>
            </label>
            {activeLang === sourceLang && titleEmpty && (
              <div className="mb-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                ⚠️ Sin título, la propiedad NO aparecerá en la web.
              </div>
            )}
            <input
              type="text"
              value={titles[activeLang]}
              onChange={(e) => setTitles((prev) => ({ ...prev, [activeLang]: e.target.value }))}
              className={inputClass}
              placeholder="Mediterranean Villa with Sea Views in Altea"
            />
          </div>

          <div>
            <label className={labelClass}>
              Descripción Pro ({LANGS.find((l) => l.code === activeLang)?.label})
            </label>
            <textarea
              value={descriptions[activeLang]}
              onChange={(e) =>
                setDescriptions((prev) => ({ ...prev, [activeLang]: e.target.value }))
              }
              rows={8}
              className={inputClass}
              placeholder="Genera con IA o escribe a mano. Esto es lo que se sube a Sooprema."
            />
          </div>
        </div>

        <p className="mt-3 text-[10px] text-[#6A6070]">
          💡 Esto es lo que se subirá a Sooprema. Puedes editarlo a mano si quieres ajustar algo. Click 🌍 vuelve a traducir desde el idioma origen.
        </p>
      </div>

      {/* Hidden inputs para que el FormData del form padre los recoja */}
      <input type="hidden" name="description_base" value={baseText} />
      <input type="hidden" name="description_source_lang" value={sourceLang} />
      {LANGS.map((l) => (
        <span key={l.code}>
          <input type="hidden" name={`title_${l.code}`} value={titles[l.code] || ''} />
          <input type="hidden" name={`description_${l.code}`} value={descriptions[l.code] || ''} />
        </span>
      ))}
      {/* Compatibilidad con el guardado actual: title_headline = title_es */}
      <input type="hidden" name="title_headline" value={titles[sourceLang] || ''} />
    </div>
  )
}
