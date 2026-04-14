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

    // Capturar sooprema_external_id de la URL (ej: /location/932168)
    const urlMatch = page.url().match(/\/location\/(\d+)/)
    if (urlMatch) {
      soopremaExternalId = urlMatch[1]
      log(`✓ Propiedad CREADA en Sooprema con ID: ${soopremaExternalId}`)
      stepsCompleted = 3
    } else {
      log('⚠ No se pudo capturar el external_id — puede haber fallado la creación')
    }

    // ═════════ PASO 5: Ubicación ═════════
    if (soopremaExternalId) {
      log('Rellenando ubicación...')
      try {
        await page.fill('[name="address"]', '').catch(() => {})
        // Construir dirección desde property
        const street = (fields.text['location'] as string) || ''
        if (street) await page.fill('[name="address"]', street)

        // Los campos específicos (address_number, postal_code) se rellenan desde property si están
        // Pero no están en fields.text con ese name. Por ahora los skippeamos.

        const nextBtn = page.locator('.propertyuploadnavigation__submit--next').first()
        if (await nextBtn.count() > 0 && await nextBtn.isEnabled().catch(() => false)) {
          await nextBtn.click()
          await page.waitForTimeout(3000)
          log('✓ Avanzado desde ubicación')
          stepsCompleted = 4
        } else {
          log('⚠ Botón "Siguiente" no habilitado (faltan campos requeridos en ubicación)')
        }
      } catch (err) {
        log(`⚠ Error en ubicación: ${(err as Error).message.slice(0, 100)}`)
      }
    }

    // ═════════ PASO 6: Navegar pasos restantes (descripción, portales, publicar) ═════════
    // Los siguientes steps son React-driven. Intentamos avanzar pulsando "Siguiente"
    // hasta encontrar el submit final.
    for (let i = 0; i < 5; i++) {
      const nextBtn = page.locator('.propertyuploadnavigation__submit--next').first()
      const submitFinal = page.locator('.propertyuploadhelp__submit, button:has-text("Confirmar y salir"), button:has-text("Publicar")').first()

      if (await submitFinal.count() > 0 && await submitFinal.isVisible().catch(() => false)) {
        log(`✓ Encontrado botón submit final: "Confirmar y salir"`)
        // NO clickamos en MVP — dejamos como draft para revisión humana
        // Descomentar en producción tras validación: await submitFinal.click()
        stepsCompleted++
        break
      }

      if (await nextBtn.count() > 0 && await nextBtn.isEnabled().catch(() => false)) {
        await nextBtn.click()
        await page.waitForTimeout(2500)
        stepsCompleted++
        log(`  Avance paso intermedio ${i + 1}`)
      } else {
        log(`  Paso intermedio ${i + 1}: no hay más avance posible`)
        break
      }
    }

    // ═════════ PASO 7: Rellenar descripciones (si existen en algún tab) ═════════
    log('Buscando textareas de descripción multi-idioma...')
    const descLocators = [
      { sel: 'textarea[name*="_en" i], textarea[id*="_en" i]', value: fields.texts.en },
      { sel: 'textarea[name*="_es" i], textarea[id*="_es" i]', value: fields.texts.es },
      { sel: 'textarea[name*="_nl" i], textarea[id*="_nl" i]', value: fields.texts.nl },
    ]
    for (const { sel, value } of descLocators) {
      if (!value) continue
      try {
        const el = page.locator(sel).first()
        if (await el.count() > 0) {
          await el.fill(value)
          log(`  ✓ Descripción: ${sel.split(',')[0]}`)
        }
      } catch {}
    }

    const sooprema_public_url = soopremaExternalId
      ? `https://www.costablancainvestments.com/admin/propiedades/editar/${soopremaExternalId}/`
      : null

    log(`✅ Automation completada (${stepsCompleted} pasos)`)
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
