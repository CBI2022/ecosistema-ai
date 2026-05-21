#!/usr/bin/env node
/**
 * Desarrollo Ventana 2: rellena Ubicación en vivo y reporta qué queda.
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
const USER = process.env.SOOPREMA_USERNAME, PASS = process.env.SOOPREMA_PASSWORD
const ADD = 'https://www.costablancainvestments.com/admin/propiedades/add/'
const REF = 'A' + Math.floor(Math.random() * 9000 + 1000) + 'TEST'
const ADDR = { address: 'Carrer Major', address_number: '14', floorNumber: '2', door: 'A', postal_code: '03590', city: 'Altea' }

const browser = await chromium.launch({ headless: true, executablePath: EXEC })
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
page.setDefaultTimeout(30000)
const log = (m) => console.log(m)
try {
  await page.goto(LOGIN, { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="user"]', USER); await page.fill('input[name="password"]', PASS)
  await page.click('input[type="submit"]'); await page.waitForTimeout(2500)
  await page.goto(ADD, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(3000)
  // V1 mínimo para poder continuar
  await page.fill('[name="input-txt-precio"]', '549000').catch(()=>{})
  await page.fill('[name="txt-referencia"]', REF).catch(()=>{})
  await page.selectOption('[name="txt-tipo_det"]', '5').catch(()=>{})
  await page.fill('[name="txt-constru"]', '127').catch(()=>{})
  await page.locator('#btnsend, #btn').first().click().catch(()=>{})
  await page.waitForTimeout(4000)
  const ok = page.locator('#popup_ok').first()
  if (await ok.count() && await ok.isVisible().catch(()=>false)) { await ok.click(); await page.waitForTimeout(1000) }
  await page.waitForLoadState('networkidle').catch(()=>{})
  log('En Ventana 2: ' + page.url())

  // ====== UBICACIÓN ======
  log('\n--- Rellenando campos planos ---')
  for (const [n, v] of Object.entries({ address: ADDR.address, address_number: ADDR.address_number, floorNumber: ADDR.floorNumber, door: ADDR.door, postal_code: ADDR.postal_code })) {
    try { await page.fill(`[name="${n}"]`, v); log(`  ✓ ${n}=${v}`) } catch (e) { log(`  ✗ ${n}: ${e.message.slice(0,50)}`) }
  }
  // Población (cityId autocomplete): escribir y elegir opción
  log('\n--- Población (autocomplete cityId) ---')
  try {
    await page.fill('[name="cityId"]', ADDR.city)
    await page.waitForTimeout(1800)
    await page.screenshot({ path: '/tmp/v2-poblacion-dropdown.png' })
    // intentar clicar la primera opción del dropdown
    const opt = page.locator('.searchinputselector__results li, .searchinputselector__result, [class*="result"] li, ul li').filter({ hasText: ADDR.city }).first()
    if (await opt.count()) { await opt.click(); log('  ✓ opción población clicada') }
    else log('  ⚠ no encontré opción de dropdown (ver screenshot)')
  } catch (e) { log('  ✗ cityId: ' + e.message.slice(0,60)) }
  await page.waitForTimeout(1000)

  log('\n--- Valores tras rellenar ---')
  for (const n of ['address','address_number','floorNumber','door','postal_code','cityId']) {
    try { log(`  ${n} = "${await page.locator(`[name="${n}"]`).first().inputValue()}"`) } catch { log(`  ${n} = (n/a)`) }
  }
  await page.screenshot({ path: '/tmp/v2-ubicacion-rellena.png', fullPage: true })
  log('\nREF: ' + REF)
} catch (e) { console.error('❌', e.message); await page.screenshot({ path:'/tmp/v2-ERROR.png', fullPage:true }).catch(()=>{}) }
finally { await browser.close() }
