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

    // ═════════ PASO CRÍTICO: GUARDAR COMO BORRADOR ═════════
    // Click "Continue" solo crea una sesión temporal con ID — Sooprema NO guarda
    // la propiedad en BD hasta que se pulsa "Confirmar y salir" (o equivalente).
    // Si paramos aquí sin clickar ese botón, la sesión se descarta y la propiedad
    // NO aparece en "propiedades ocultas" (visto 2026-05-06 con Z111 ID 939248).
    //
    // Estrategia: avanzar pasos uno a uno SIN tocar campos (para no corromper
    // como hizo A888) hasta encontrar el botón "Confirmar y salir" y clickarlo.
    log('Buscando botón "Confirmar y salir" para guardar borrador...')
    let saved = false
    for (let i = 0; i < 8; i++) {
      // Intentar click en "Confirmar y salir" / "Guardar borrador" / similares
      const submitFinal = page.locator(
        'button:has-text("Confirmar y salir"), ' +
        'button:has-text("Guardar borrador"), ' +
        'button:has-text("Guardar"), ' +
        '.propertyuploadhelp__submit, ' +
        'a:has-text("Confirmar y salir")'
      ).first()

      try {
        if (await submitFinal.count() > 0 && await submitFinal.isVisible().catch(() => false)) {
          const btnText = (await submitFinal.textContent().catch(() => '')) || ''
          log(`✓ Encontrado botón: "${btnText.trim()}" → clickando para guardar borrador`)
          await submitFinal.click({ timeout: 5000 })
          await page.waitForTimeout(3500)
          await dismissPopups(page, log)
          await page.waitForLoadState('networkidle').catch(() => {})
          saved = true
          stepsCompleted++
          break
        }
      } catch (err) {
        log(`  Error al clickar submit: ${(err as Error).message.slice(0, 80)}`)
      }

      // Si no está, avanzar al siguiente step (sin tocar campos del step actual)
      const nextBtn = page.locator('.propertyuploadnavigation__submit--next, button:has-text("Siguiente"), button:has-text("Next")').first()
      try {
        if (await nextBtn.count() > 0 && await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click({ timeout: 5000 })
          await page.waitForTimeout(2500)
          await dismissPopups(page, log)
          stepsCompleted++
          log(`  Avanzado al paso ${i + 2} buscando "Confirmar y salir"...`)
        } else {
          log(`  No hay botón "Siguiente" visible (paso ${i + 2}). Saliendo del loop.`)
          break
        }
      } catch (err) {
        log(`  Error al avanzar: ${(err as Error).message.slice(0, 80)}`)
        break
      }
    }

    if (!saved) {
      log(`⚠ NO se pudo clickar "Confirmar y salir" — la propiedad NO se guardó como borrador en Sooprema`)
    }

    const sooprema_public_url = soopremaExternalId
      ? `https://www.costablancainvestments.com/admin/propiedades/editar/${soopremaExternalId}/`
      : null

    if (saved && soopremaExternalId) {
      log(`✅ Borrador guardado en Sooprema. La secretaria lo verá en "propiedades ocultas".`)
    } else if (soopremaExternalId) {
      log(`⚠ Sesión creada (ID ${soopremaExternalId}) pero no se guardó — Sooprema descartará la sesión.`)
    } else {
      log(`❌ No se generó la propiedad — revisar credenciales/campos obligatorios.`)
    }

    return {
      success: saved && !!soopremaExternalId,
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
