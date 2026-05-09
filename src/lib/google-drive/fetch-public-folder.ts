/**
 * Descarga las fotos de una carpeta PÚBLICA de Google Drive sin OAuth ni
 * service account. Solo necesita que la carpeta esté compartida como "anyone
 * with the link can view".
 *
 * Estrategia:
 *  1. Extraer el folder ID del link de Drive (varios formatos posibles).
 *  2. Llamar a la API pública de Drive v3 (drive.google.com/uc?id=) sin auth.
 *  3. La API pública NO permite listar contenido de una carpeta — para eso
 *     usamos el endpoint web pseudo-RPC `https://www.googleapis.com/drive/v3/files`
 *     con `key=<API_KEY>`. Esto requiere una API key de Google libre — la
 *     creamos en Google Cloud Console (gratis, cuota 1k req/día).
 *
 * Si no hay GOOGLE_DRIVE_API_KEY configurada, lanzamos error explicando
 * qué falta.
 */

export interface DrivePhoto {
  id: string
  name: string
  mimeType: string
  /** URL directa para descargar el binario (publica) */
  downloadUrl: string
  /** Tamaño aproximado en bytes (si Drive lo devuelve) */
  size?: number
}

/**
 * Extrae el folder ID de cualquier formato de link de Drive.
 * Soporta:
 *  - https://drive.google.com/drive/folders/FOLDER_ID
 *  - https://drive.google.com/drive/u/0/folders/FOLDER_ID?usp=sharing
 *  - https://drive.google.com/drive/folders/FOLDER_ID?usp=drive_link
 */
export function parseFolderIdFromLink(link: string): string | null {
  if (!link) return null
  const m = link.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  // Otros formatos posibles, ej: ?id=...
  const idParam = link.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParam) return idParam[1]
  return null
}

export async function listFolderPhotos(folderLink: string): Promise<{
  ok: boolean
  photos?: DrivePhoto[]
  error?: string
}> {
  const folderId = parseFolderIdFromLink(folderLink)
  if (!folderId) {
    return { ok: false, error: 'No se pudo extraer el ID de la carpeta del link.' }
  }

  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      error:
        'Falta GOOGLE_DRIVE_API_KEY en el entorno. Crea una API key gratis en Google Cloud Console (APIs & Services → Credentials → Create API key) con la API "Google Drive API" habilitada y añádela a Vercel.',
    }
  }

  // Listar archivos en la carpeta. q='<folderId>' in parents.
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`)
  const fields = encodeURIComponent('files(id,name,mimeType,size)')
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=200&key=${apiKey}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, error: `Drive API error ${res.status}: ${text.slice(0, 200)}` }
  }

  const json = (await res.json()) as { files?: Array<{ id: string; name: string; mimeType: string; size?: string }> }
  const files = (json.files || []).filter((f) =>
    f.mimeType?.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(f.name),
  )

  const photos: DrivePhoto[] = files.map((f) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? Number(f.size) : undefined,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
  }))

  return { ok: true, photos }
}

/**
 * Descarga UNA foto del Drive público a Buffer.
 * Útil dentro de la automation Playwright para subir cada foto a Sooprema.
 */
export async function downloadPhotoBytes(photo: DrivePhoto): Promise<{
  ok: boolean
  bytes?: Buffer
  contentType?: string
  filename?: string
  error?: string
}> {
  // El endpoint /uc?export=download de Drive devuelve el binario directo
  // para archivos pequeños. Para archivos grandes Drive intercala una página
  // de "Download anyway" — la API key con files.get?alt=media es más robusto.
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  if (!apiKey) return { ok: false, error: 'Falta GOOGLE_DRIVE_API_KEY' }

  const url = `https://www.googleapis.com/drive/v3/files/${photo.id}?alt=media&key=${apiKey}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    return { ok: false, error: `Download error ${res.status}` }
  }
  const arrayBuf = await res.arrayBuffer()
  return {
    ok: true,
    bytes: Buffer.from(arrayBuf),
    contentType: res.headers.get('content-type') || photo.mimeType,
    filename: photo.name,
  }
}
