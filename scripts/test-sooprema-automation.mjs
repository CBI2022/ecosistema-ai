#!/usr/bin/env node
/**
 * Test local: ejecuta la automation Sooprema con una propiedad de prueba.
 * NO hace submit real (el código tiene comentado el click final).
 */

import { chromium } from 'playwright'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const URL = process.env.SOOPREMA_URL
const USER = process.env.SOOPREMA_USERNAME
const PASS = process.env.SOOPREMA_PASSWORD
const NEW_PROPERTY_URL = 'https://www.costablancainvestments.com/admin/propiedades/add/'

// Datos de prueba (simula lo que vendría del form del agente)
const testFields = {
  text: {
    'input-txt-precio': '549000',
    'input-txt-precio_neto': '549000',
    'txt-referencia': 'A' + Math.floor(Math.random() * 9000 + 1000) + 'TEST',
    'txt-parcela': '873',
    'txt-constru': '127',
    'txt-porcentaje_comision': '5',
    'input-txt-gastos_comunidad': '150',
  },
  select: {
    'txt-tipo_det': '5', // Villa
    'txt-vistas': '8', // Sea and mountains
    'txt-habitacion': '3',
    'txt-banos': '2',
    'txt-consano': '2013',
    'txt-refano': '2013',
    'txt-periodo_comunidad': '5', // Annual
  },
  textarea: {
    'txt-observaciones_comunidad': 'Test observación',
  },
}

const browser = await chromium.launch({ headless: false, slowMo: 300 })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

try {
  console.log('🔐 Login...')
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="user"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('input[type="submit"]')
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(2000)
  console.log('  Post-login URL:', page.url())

  console.log('\n📝 Abriendo formulario de nueva propiedad...')
  await page.goto(NEW_PROPERTY_URL, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  console.log('  Form URL:', page.url())

  console.log('\n🖊️  Rellenando campos de texto...')
  let filledText = 0
  for (const [name, value] of Object.entries(testFields.text)) {
    if (!value) continue
    try {
      await page.fill(`[name="${name}"]`, value)
      filledText++
      console.log(`  ✓ ${name} = "${value}"`)
    } catch (err) {
      console.log(`  ✗ ${name}: ${err.message.slice(0, 60)}`)
    }
  }
  console.log(`  Total: ${filledText}/${Object.keys(testFields.text).length}`)

  console.log('\n📋 Rellenando selects...')
  let filledSelect = 0
  for (const [name, value] of Object.entries(testFields.select)) {
    if (!value || value === '0') continue
    try {
      await page.selectOption(`[name="${name}"]`, value)
      filledSelect++
      console.log(`  ✓ ${name} = "${value}"`)
    } catch (err) {
      console.log(`  ✗ ${name}: ${err.message.slice(0, 60)}`)
    }
  }
  console.log(`  Total: ${filledSelect}/${Object.keys(testFields.select).length}`)

  console.log('\n📝 Rellenando textareas...')
  for (const [name, value] of Object.entries(testFields.textarea)) {
    if (!value) continue
    try {
      await page.fill(`textarea[name="${name}"]`, value)
      console.log(`  ✓ ${name}`)
    } catch (err) {
      console.log(`  ✗ ${name}: ${err.message.slice(0, 60)}`)
    }
  }

  console.log('\n📸 Screenshot final para revisión...')
  await page.screenshot({ path: '/tmp/sooprema-form-filled.png', fullPage: true })
  console.log('  Guardado en /tmp/sooprema-form-filled.png')

  console.log('\n⏸️  Dejando navegador abierto 10s para que Marco pueda revisar visualmente...')
  await page.waitForTimeout(10000)

  console.log('\n✅ Test completo — NO SE HA SUBMITEADO. Revisa el screenshot.')
} catch (err) {
  console.error('❌ Error:', err.message)
  await page.screenshot({ path: '/tmp/sooprema-ERROR.png', fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
