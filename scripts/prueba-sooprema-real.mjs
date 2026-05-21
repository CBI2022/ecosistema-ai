#!/usr/bin/env node
/**
 * PRUEBA REAL del estado actual de la automation contra Sooprema.
 * Replica lo que hace src/lib/sooprema/automation.ts HOY:
 *   login -> rellenar Ventana 1 -> "Continuar" -> mirar Ventana 2.
 * Crea un BORRADOR de prueba (ref ...TEST) en Propiedades ocultas. Headless.
 */
import { chromium } from 'playwright-core'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const EXEC = '/Users/marcoantonio/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell'
const LOGIN = process.env.SOOPREMA_URL || 'https://costablancainvestments.com/crm/login'
const USER = process.env.SOOPREMA_USERNAME
const PASS = process.env.SOOPREMA_PASSWORD
const ADD = 'https://www.costablancainvestments.com/admin/propiedades/add/'
const REF = 'A' + Math.floor(Math.random() * 9000 + 1000) + 'TEST'

const V1 = {
  text: { 'input-txt-precio': '549000', 'input-txt-precio_neto': '521550', 'txt-referencia': REF, 'txt-parcela': '873', 'txt-constru': '127', 'txt-porcentaje_comision': '5' },
  select: { 'txt-tipo_det': '5', 'txt-vistas': '8', 'txt-habitacion': '3', 'txt-banos': '2', 'txt-consano': '2013' },
}
const log = (m) => console.log(m)

const browser = await chromium.launch({ headless: true, executablePath: EXEC })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.setDefaultTimeout(30000)
const result = { ref: REF, steps: {} }
try {
  log('🔐 Login...')
  await page.goto(LOGIN, { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="user"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('input[type="submit"]')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(2000)
  result.steps.login = !page.url().includes('login')
  log('  login OK: ' + result.steps.login)

  log('📝 Abriendo form add...')
  await page.goto(ADD, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  let okT = 0
  for (const [n, v] of Object.entries(V1.text)) { try { await page.fill(`[name="${n}"]`, v); okT++ } catch {} }
  let okS = 0
  for (const [n, v] of Object.entries(V1.select)) { try { await page.selectOption(`[name="${n}"]`, v); okS++ } catch {} }
  result.steps.v1_text = `${okT}/${Object.keys(V1.text).length}`
  result.steps.v1_select = `${okS}/${Object.keys(V1.select).length}`
  log(`  Ventana 1: texto ${result.steps.v1_text}, selects ${result.steps.v1_select}`)
  await page.screenshot({ path: '/tmp/prueba-1-ventana1.png', fullPage: true })

  log('➡️  Click "Continuar"...')
  const btn = page.locator('#btnsend').first()
  const alt = page.locator('#btn').first()
  if (await btn.count()) await btn.click()
  else if (await alt.count()) await alt.click()
  await page.waitForTimeout(4000)
  // cerrar popup si aparece
  const ok = page.locator('#popup_ok').first()
  if (await ok.count() && await ok.isVisible().catch(() => false)) { await ok.click(); await page.waitForTimeout(1000) }
  await page.waitForLoadState('networkidle').catch(() => {})
  result.steps.v2_url = page.url()
  const m = page.url().match(/\/(\d+)\//)
  result.steps.external_id = m ? m[1] : null
  log('  Ventana 2 URL: ' + result.steps.v2_url + ' | ID: ' + result.steps.external_id)
  await page.screenshot({ path: '/tmp/prueba-2-ventana2.png', fullPage: true })

  // ¿Qué hay en Ventana 2? (lo que la automation NO rellena)
  const present = async (sel) => (await page.locator(sel).count()) > 0
  const valOf = async (sel) => { try { return await page.locator(sel).first().inputValue() } catch { return '(n/a)' } }
  result.steps.v2_address_field = await present('[name="address"]')
  result.steps.v2_address_value = await valOf('[name="address"]')
  result.steps.v2_has_floating_selectors = await present('.floating-selector__button')
  result.steps.v2_photo_input = await present('input[type="file"]')
  log('  V2 campo dirección presente: ' + result.steps.v2_address_field + ' | valor: "' + result.steps.v2_address_value + '"')
  log('  V2 selectores agente/owner presentes: ' + result.steps.v2_has_floating_selectors)
  log('  V2 input de fotos presente aquí: ' + result.steps.v2_photo_input)

  log('\n===== RESULTADO =====')
  console.log(JSON.stringify(result, null, 2))
} catch (e) {
  console.error('❌ Error:', e.message)
  await page.screenshot({ path: '/tmp/prueba-ERROR.png', fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
