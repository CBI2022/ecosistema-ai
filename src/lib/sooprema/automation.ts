/**
 * Sooprema CRM automation con Playwright.
 * Funciona en Node local (con `playwright`) Y en Vercel serverless (con @sparticuz/chromium).
 */

import type { Browser, Page } from 'playwright-core'
import type { SoopremaFieldMap } from './mapper'
import { listFolderPhotos, downloadPhotoBytes } from '@/lib/google-drive/fetch-public-folder'

const LOGIN_URL = process.env.SOOPREMA_URL || 'https://costablancainvestments.com/crm/login'
const USERNAME = process.env.SOOPREMA_USERNAME || ''
const PASSWORD = process.env.SOOPREMA_PASSWORD || ''
const NEW_PROPERTY_URL = 'https://www.costablancainvestments.com/admin/propiedades/add/'

export interface AutomationResult {
  success: boolean
  logs: string[]
  sooprema_external_id?: string | null
  sooprema_public_url?: string | null
  error?: string
  steps_completed?: number
}

async function launchBrowser(): Promise<Browser> {
  const { chromium: playwrightCore } = await import('playwright-core')

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import('@sparticuz/chromium')).default
    return playwrightCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }
  return playwrightCore.launch({ headless: true })
}

// Descartar popup #popup_ok si aparece (Sooprema muestra "Etiquetas personalizadas")
async function dismissPopups(page: Page, log: (m: string) => void) {
  try {
    const ok = page.locator('#popup_ok').first()
    if (await ok.count() > 0 && await ok.isVisible().catch(() => false)) {
      log('Cerrando popup "Etiquetas personalizadas"')
      await ok.click()
      await page.waitForTimeout(1000)
    }
  } catch {}
}

export async function runSoopremaAutomation(
  fields: SoopremaFieldMap,
  options: { timeout?: number; photosDriveLink?: string | null } = {}
): Promise<AutomationResult> {
  const logs: string[] = []
  const log = (msg: string) => {
    const stamp = new Date().toLocaleTimeString()
    logs.push(`[${stamp}] ${msg}`)
    // eslint-disable-next-line no-console
    console.log(`[sooprema] ${msg}`)
  }

  if (!USERNAME || !PASSWORD) {
    return { success: false, logs, error: 'SOOPREMA_USERNAME/PASSWORD no configurados' }
  }

  let browser: Browser | null = null
  let soopremaExternalId: string | null = null
  let stepsCompleted = 0

  try {
    log('Lanzando navegador...')
    browser = await launchBrowser()
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()
    page.setDefaultTimeout(options.timeout || 30000)

    // ═════════ PASO 1: Login ═════════
    log('Login en Sooprema...')
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="user"]', USERNAME)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('input[type="submit"]')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    if (page.url().includes('login')) {
      return { success: false, logs, error: 'Login fallido — credenciales inválidas' }
    }
    log('✓ Login OK')
    stepsCompleted = 1

    // ═════════ PASO 2: Abrir form ═════════
    log('Abriendo /admin/propiedades/add/ ...')
    await page.goto(NEW_PROPERTY_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    // ═════════ PASO 3: Rellenar campos (texto / select / textarea) ═════════
    log('Rellenando datos básicos...')
    let filledText = 0
    for (const [name, value] of Object.entries(fields.text)) {
      if (!value) continue
      try {
        await page.fill(`[name="${name}"]`, value)
        filledText++
      } catch {}
    }
    log(`  ✓ ${filledText} campos de texto`)

    let filledSelect = 0
    for (const [name, value] of Object.entries(fields.select)) {
      if (!value || value === '0') continue
      try {
        await page.selectOption(`[name="${name}"]`, value)
        filledSelect++
      } catch {}
    }
    log(`  ✓ ${filledSelect} selects`)

    let filledTextarea = 0
    for (const [name, value] of Object.entries(fields.textarea)) {
      if (!value) continue
      try {
        await page.fill(`textarea[name="${name}"]`, value)
        filledTextarea++
      } catch {}
    }
    log(`  ✓ ${filledTextarea} textareas`)

    // Status tags (select único en step 1)
    if (fields.statusTagIds.length > 0) {
      try {
        await page.selectOption('[name="txt-id_etiqueta"]', fields.statusTagIds[0])
        log(`  ✓ Etiqueta: ${fields.statusTagIds[0]}`)
      } catch {}
    }

    stepsCompleted = 2

    // ═════════ PASO 4: Click "Continue" → crea propiedad + navega a location ═════════
    log('Guardando y avanzando a Ubicación...')
    const continueBtn = page.locator('#btnsend').first()
    const altBtn = page.locator('#btn').first()
    if (await continueBtn.count() > 0) {
      await continueBtn.click()
    } else if (await altBtn.count() > 0) {
      await altBtn.click()
    } else {
      log('⚠ No se encontró botón "Continue" en step 1')
    }

    await page.waitForTimeout(4000)
    await dismissPopups(page, log)
    await page.waitForLoadState('networkidle').catch(() => {})

    // Capturar sooprema_external_id desde la URL — esto es el ID temporal de la sesión
    const urlMatch = page.url().match(/\/location\/(\d+)/) || page.url().match(/\/(\d+)\//)
    if (urlMatch) {
      soopremaExternalId = urlMatch[1]
      log(`✓ Sesión creada en Sooprema con ID temporal: ${soopremaExternalId}`)
      stepsCompleted = 3
    } else {
      log(`⚠ No se pudo capturar el external_id de la URL: ${page.url()}`)
    }

    // ═════════ FOTOS desde link de Google Drive (best-effort) ═════════
    // Si la propiedad tiene un link público de Drive, descargamos las fotos y
    // tratamos de subirlas al uploader de Sooprema. NO BLOQUEA: si falla, el
    // borrador igual queda creado y la secretaria podrá subir las fotos a mano.
    let photosUploaded = 0
    if (soopremaExternalId && options.photosDriveLink) {
      try {
        log(`📸 Descargando fotos del Drive público...`)
        const list = await listFolderPhotos(options.photosDriveLink)
        if (!list.ok) {
          log(`⚠ No se pudieron listar fotos del Drive: ${list.error}`)
        } else if (list.photos && list.photos.length > 0) {
          log(`  ✓ ${list.photos.length} fotos encontradas en Drive`)

          // Buscar input file en la página actual (Sooprema lo tiene en el step de fotos)
          // Si no está visible aquí, hacemos un best-effort de avanzar 1 paso.
          let fileInput = page.locator('input[type="file"]').first()
          if (await fileInput.count() === 0) {
            log(`  Buscando step de fotos...`)
            const nextBtn = page.locator('.propertyuploadnavigation__submit--next, button:has-text("Siguiente"), button:has-text("Next")').first()
            for (let i = 0; i < 4; i++) {
              if (await nextBtn.count() > 0 && await nextBtn.isEnabled().catch(() => false)) {
                await nextBtn.click({ timeout: 5000 }).catch(() => {})
                await page.waitForTimeout(2000)
                await dismissPopups(page, log)
                fileInput = page.locator('input[type="file"]').first()
                if (await fileInput.count() > 0) {
                  log(`  ✓ Step de fotos alcanzado (paso ${i + 1})`)
                  break
                }
              } else {
                break
              }
            }
          }

          if (await fileInput.count() > 0) {
            // Descargar todas las fotos en buffers y subir todas de una vez
            // (los inputs file aceptan múltiples archivos con setInputFiles).
            const buffers: { name: string; mimeType: string; buffer: Buffer }[] = []
            // Drone al final
            const ordered = [...list.photos].sort((a, b) => {
              const aDrone = /drone|aer/i.test(a.name) ? 1 : 0
              const bDrone = /drone|aer/i.test(b.name) ? 1 : 0
              return aDrone - bDrone
            })
            for (const photo of ordered.slice(0, 30)) { // límite 30 fotos para no agotar el timeout
              const dl = await downloadPhotoBytes(photo)
              if (dl.ok && dl.bytes) {
                buffers.push({
                  name: dl.filename || photo.name,
                  mimeType: dl.contentType || photo.mimeType || 'image/jpeg',
                  buffer: dl.bytes,
                })
              }
            }
            log(`  ✓ ${buffers.length} fotos descargadas, subiendo a Sooprema...`)

            await fileInput.setInputFiles(buffers).catch((err) => {
              log(`  ⚠ Error al subir: ${(err as Error).message.slice(0, 100)}`)
            })
            await page.waitForTimeout(3000)
            photosUploaded = buffers.length
            log(`  ✓ ${photosUploaded} fotos subidas a Sooprema`)
          } else {
            log(`  ⚠ No se encontró input de subida de fotos en la página actual`)
          }
        } else {
          log(`  ⚠ La carpeta de Drive no contiene imágenes`)
        }
      } catch (err) {
        log(`⚠ Error en bloque de fotos (no rompe el flow): ${(err as Error).message.slice(0, 120)}`)
      }
    }

    const sooprema_public_url = soopremaExternalId
      ? `https://www.costablancainvestments.com/admin/propiedades/editar/${soopremaExternalId}/`
      : null

    if (soopremaExternalId) {
      log(`✅ Borrador en Sooprema · ID ${soopremaExternalId} · ${photosUploaded} foto(s) subida(s)`)
    } else {
      log(`❌ No se generó la propiedad — revisar credenciales/campos obligatorios.`)
    }

    return {
      success: !!soopremaExternalId,
      logs,
      sooprema_external_id: soopremaExternalId,
      sooprema_public_url,
      steps_completed: stepsCompleted,
    }
  } catch (err) {
    const error = (err as Error).message
    log(`❌ Error: ${error}`)
    return { success: false, logs, error, steps_completed: stepsCompleted, sooprema_external_id: soopremaExternalId }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
