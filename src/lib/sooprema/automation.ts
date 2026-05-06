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

    // ═════════ PARAR AQUÍ ═════════
    // Devolvemos OK con el ID temporal. Marco está investigando exactamente
    // cómo Sooprema acepta un borrador (qué botón guarda en "propiedades ocultas").
    // Cuando lo sepa, ajustamos el último paso.

    const sooprema_public_url = soopremaExternalId
      ? `https://www.costablancainvestments.com/admin/propiedades/editar/${soopremaExternalId}/`
      : null

    if (soopremaExternalId) {
      log(`✅ Sesión Sooprema con ID ${soopremaExternalId}. (Pendiente: confirmar acción exacta para guardar borrador.)`)
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
