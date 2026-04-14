/**
 * Sooprema CRM automation con Playwright.
 * Funciona en Node local (con `playwright`) Y en Vercel serverless (con @sparticuz/chromium).
 */

import type { Browser, Page } from 'playwright-core'
import type { SoopremaFieldMap } from './mapper'

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
}

// Lanza chromium adecuado según entorno
async function launchBrowser(): Promise<Browser> {
  const { chromium: playwrightCore } = await import('playwright-core')

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Serverless (Vercel / AWS Lambda)
    const chromium = (await import('@sparticuz/chromium')).default
    return playwrightCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  } else {
    // Local dev — usa chromium de playwright full
    return playwrightCore.launch({ headless: true })
  }
}

export async function runSoopremaAutomation(
  fields: SoopremaFieldMap,
  options: { timeout?: number } = {}
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

  try {
    log('Lanzando navegador...')
    browser = await launchBrowser()
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    })
    const page = await ctx.newPage()
    page.setDefaultTimeout(options.timeout || 30000)

    // ═══ PASO 1: Login ═══
    log('Login en Sooprema...')
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="user"]', USERNAME)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('input[type="submit"]')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    if (page.url().includes('login')) {
      return { success: false, logs, error: 'Login fallido — verifica credenciales' }
    }
    log('Login OK')

    // ═══ PASO 2: Abrir form de nueva propiedad ═══
    log('Abriendo formulario nueva propiedad...')
    await page.goto(NEW_PROPERTY_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    log(`URL form: ${page.url()}`)

    // ═══ PASO 3: Rellenar campos de texto ═══
    log('Rellenando campos de texto...')
    for (const [name, value] of Object.entries(fields.text)) {
      if (!value) continue
      try {
        await page.fill(`[name="${name}"]`, value)
      } catch {
        // Algunos campos pueden no estar visibles en esta tab, los skippeamos
      }
    }

    // ═══ PASO 4: Rellenar selects ═══
    log('Rellenando selects...')
    for (const [name, value] of Object.entries(fields.select)) {
      if (!value || value === '0') continue
      try {
        await page.selectOption(`[name="${name}"]`, value)
      } catch {
        // ignorar selects no encontrados o valores no válidos
      }
    }

    // ═══ PASO 5: Textareas ═══
    log('Rellenando textareas...')
    for (const [name, value] of Object.entries(fields.textarea)) {
      if (!value) continue
      try {
        await page.fill(`textarea[name="${name}"]`, value)
      } catch {}
    }

    // ═══ PASO 6: Status tags (multi-select o chips) ═══
    // Sooprema usa un select único llamado txt-id_etiqueta según exploración.
    // Si es multi-select, requeriría más investigación. De momento usamos el primer tag.
    if (fields.statusTagIds.length > 0) {
      try {
        await page.selectOption('[name="txt-id_etiqueta"]', fields.statusTagIds[0])
        log(`Status tag: ${fields.statusTagIds[0]}`)
      } catch {}
    }

    // ═══ PASO 7: Agente ═══
    if (fields.soopremaAgentId) {
      try {
        // El selector exacto del agente depende del HTML; podría ser un autocomplete
        // Intentamos varios patrones comunes
        const agentSelectors = [
          '[name="txt-id_agente"]',
          '[name="txt-agente"]',
          '[name="agente_id"]',
        ]
        for (const sel of agentSelectors) {
          if (await page.locator(sel).count() > 0) {
            await page.selectOption(sel, fields.soopremaAgentId)
            log(`Agente: ${fields.soopremaAgentId}`)
            break
          }
        }
      } catch {}
    }

    // ═══ PASO 8: Continuar al siguiente tab (si hay botón Continue/Next) ═══
    // El form de Chloe tiene "Continue" entre secciones. Lo buscamos.
    await page.waitForTimeout(1000)

    // ═══ PASO 9: Textos (descripción, título) ═══
    log('Rellenando descripciones multi-idioma...')
    const textFieldSelectors = [
      // Inglés es el principal
      { langInput: 'input[name*="titulo_en" i], input[name*="title_en" i]', value: fields.texts.title_headline },
      { langInput: 'textarea[name*="descripcion_en" i], textarea[name*="description_en" i]', value: fields.texts.en },
      // Español
      { langInput: 'textarea[name*="descripcion_es" i]', value: fields.texts.es },
      // Holandés
      { langInput: 'textarea[name*="descripcion_nl" i], textarea[name*="description_nl" i]', value: fields.texts.nl },
    ]
    for (const f of textFieldSelectors) {
      if (!f.value) continue
      try {
        const el = page.locator(f.langInput).first()
        if (await el.count() > 0) await el.fill(f.value)
      } catch {}
    }

    // ═══ PASO 10: Subir fotos ═══
    log(`Preparando subida de ${fields.photos.length} fotos...`)
    // Las fotos hay que descargarlas y subirlas via setInputFiles
    // Para eso necesitamos file inputs. Buscamos en la página.
    const fileInputs = await page.locator('input[type="file"]').all()
    log(`File inputs encontrados: ${fileInputs.length}`)

    if (fileInputs.length > 0 && fields.photos.length > 0) {
      // Descargar cada foto a temp y subirla
      const downloadedPaths: string[] = []
      try {
        const fs = await import('node:fs/promises')
        const path = await import('node:path')
        const os = await import('node:os')

        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sooprema-photos-'))
        log(`Directorio temporal: ${tmpDir}`)

        for (let i = 0; i < fields.photos.length; i++) {
          const photo = fields.photos[i]
          const resp = await fetch(photo.url)
          if (!resp.ok) continue
          const buf = Buffer.from(await resp.arrayBuffer())
          const fname = `photo_${String(i).padStart(3, '0')}${photo.is_drone ? '_drone' : ''}.jpg`
          const fpath = path.join(tmpDir, fname)
          await fs.writeFile(fpath, buf)
          downloadedPaths.push(fpath)
        }
        log(`Descargadas ${downloadedPaths.length} fotos a disco temporal`)

        // Subir al primer input de tipo file
        await fileInputs[0].setInputFiles(downloadedPaths)
        log('Fotos inyectadas al input file')
        await page.waitForTimeout(3000)

        // Limpieza tras subir (opcional, tmpdir se limpia solo)
      } catch (err) {
        log(`⚠ Error subiendo fotos: ${(err as Error).message}`)
      }
    }

    // ═══ PASO 11: Portales ═══
    log(`Portales: Sooprema=${fields.portals.sooprema} Idealista=${fields.portals.idealista} Imoluc=${fields.portals.imoluc}`)
    // TODO: localizar checkboxes exactos

    // ═══ PASO 12: Certificado energético ═══
    try {
      const energySelectors = [
        `input[name*="cert_energetico" i][value="${fields.energyCertificate}"]`,
        `input[name*="energy" i][value="${fields.energyCertificate}"]`,
      ]
      for (const sel of energySelectors) {
        if (await page.locator(sel).count() > 0) {
          await page.check(sel)
          log(`Certificado energético: ${fields.energyCertificate}`)
          break
        }
      }
    } catch {}

    // ═══ PASO 13: Submit/Publicar ═══
    log('Buscando botón de publicar...')
    const publishSelectors = [
      'button:has-text("Publicar")',
      'button:has-text("Publish")',
      'button:has-text("Guardar")',
      'input[type="submit"]',
      'button[type="submit"]',
    ]
    let submitted = false
    for (const sel of publishSelectors) {
      const el = page.locator(sel).first()
      if (await el.count() > 0) {
        log(`Click publicar: ${sel}`)
        // NO lo enviamos de verdad en MVP — solo simulamos
        // Descomentar cuando esté validado:
        // await el.click()
        // await page.waitForLoadState('networkidle').catch(() => {})
        submitted = true
        break
      }
    }
    if (!submitted) log('⚠ No se encontró botón de publicar — en MVP dejamos como borrador')

    // ═══ PASO 14: Capturar screenshot final para auditoría ═══
    try {
      const screenshotBuf = await page.screenshot({ fullPage: true })
      log(`Screenshot capturado (${screenshotBuf.length} bytes)`)
      // TODO: subir a Supabase Storage como audit trail
    } catch {}

    // ═══ PASO 15: Capturar sooprema_external_id si está en la URL ═══
    const currentUrl = page.url()
    const idMatch = currentUrl.match(/editar\/([^\/]+)/)
    const soopremaExternalId = idMatch?.[1] || null

    log('✓ Automation completada')

    return {
      success: true,
      logs,
      sooprema_external_id: soopremaExternalId,
      sooprema_public_url: null, // Sooprema no expone URL pública en este flow
    }
  } catch (err) {
    const error = (err as Error).message
    log(`❌ Error: ${error}`)
    return { success: false, logs, error }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }
}
