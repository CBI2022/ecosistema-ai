#!/usr/bin/env node
/** Test end-to-end del automation REAL */

import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

// Simular un objeto Property completo
const mockProperty = {
  id: 'test-' + Date.now(),
  reference: 'A' + Math.floor(Math.random() * 9000 + 1000) + 'TST',
  title: 'Test Villa',
  title_headline: 'Mediterranean Villa with Sea Views',
  title_in_text: 'For sale in Altea',
  property_type: 'villa',
  listing_type: 'sale',
  status_tags: ['Exclusive', 'Sea views'],
  occupation_status: 'free',
  price: 549000,
  price_net: 549000,
  commission_percentage: 5,
  bedrooms: 3,
  bathrooms: 2,
  year_built: 2013,
  year_reformed: 2013,
  build_area_m2: 127,
  plot_area_m2: 873,
  views: 'Sea and mountains',
  description_en: 'Beautiful villa with panoramic sea views located in the prestigious area of Altea.',
  description_es: 'Preciosa villa con vistas panorámicas al mar ubicada en Altea.',
  description_nl: 'Prachtige villa met panoramisch uitzicht op zee.',
  has_pool: true,
  has_garden: true,
  has_sea_view: true,
  has_ac: true,
  community_annual: 150,
  community_period: 'annual',
  energy_certificate: 'D',
  publish_sooprema: true,
  publish_idealista: true,
  publish_imoluc: false,
  zone: 'Altea',
  location: 'Calle Mayor 12, Altea',
}

// Como estamos en .mjs no podemos importar .ts directamente.
// Creamos los fields manualmente siguiendo la lógica del mapper
const fields = {
  text: {
    'input-txt-precio': '549000',
    'input-txt-precio_neto': '549000',
    'txt-referencia': mockProperty.reference,
    'txt-parcela': '873',
    'txt-constru': '127',
    'txt-porcentaje_comision': '5',
    'input-txt-gastos_comunidad': '150',
  },
  select: {
    'txt-tipo_det': '5',
    'txt-vistas': '8',
    'txt-habitacion': '3',
    'txt-banos': '2',
    'txt-consano': '2013',
    'txt-refano': '2013',
    'txt-periodo_comunidad': '5',
    'txt-ocupacion_actual': '2',
  },
  textarea: {},
  checkbox: {},
  statusTagIds: ['12', '21'],
  energyCertificate: 'D',
  portals: { sooprema: true, idealista: true, imoluc: false },
  photos: [],
  texts: {
    title_headline: mockProperty.title_headline,
    title_in_text: mockProperty.title_in_text,
    title_short: mockProperty.title,
    en: mockProperty.description_en,
    es: mockProperty.description_es,
    nl: mockProperty.description_nl,
    distances_en: 'Beach, Alicante Airport, Valencia Airport',
    distances_es: 'Playa, Aeropuerto Alicante, Aeropuerto Valencia',
    distances_nl: 'Strand, Luchthaven Alicante, Luchthaven Valencia',
  },
}

import { chromium } from 'playwright'

async function run() {
  const USERNAME = process.env.SOOPREMA_USERNAME
  const PASSWORD = process.env.SOOPREMA_PASSWORD
  const LOGIN_URL = process.env.SOOPREMA_URL

  console.log('🚀 Iniciando automation real...\n')

  const browser = await chromium.launch({ headless: false, slowMo: 200 })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  try {
    // Login
    console.log('🔐 Login...')
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="user"]', USERNAME)
    await page.fill('input[name="password"]', PASSWORD)
    await page.click('input[type="submit"]')
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2000)

    console.log('📝 Abriendo nueva propiedad...')
    await page.goto('https://www.costablancainvestments.com/admin/propiedades/add/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)

    console.log('🖊️  Rellenando step 1...')
    for (const [n, v] of Object.entries(fields.text)) {
      if (v) try { await page.fill(`[name="${n}"]`, v) } catch {}
    }
    for (const [n, v] of Object.entries(fields.select)) {
      if (v && v !== '0') try { await page.selectOption(`[name="${n}"]`, v) } catch {}
    }
    if (fields.statusTagIds.length > 0) {
      try { await page.selectOption('[name="txt-id_etiqueta"]', fields.statusTagIds[0]) } catch {}
    }

    console.log('⏩ Click Continue (btnsend)...')
    await page.click('#btnsend').catch(() => page.click('#btn'))
    await page.waitForTimeout(4000)

    // Cerrar popup
    const popup = page.locator('#popup_ok').first()
    if (await popup.count() > 0 && await popup.isVisible().catch(() => false)) {
      await popup.click()
      await page.waitForTimeout(1500)
      console.log('  Popup cerrado')
    }

    const urlMatch = page.url().match(/\/location\/(\d+)/)
    if (urlMatch) {
      console.log(`\n🎉 PROPIEDAD CREADA EN SOOPREMA con ID: ${urlMatch[1]}`)
      console.log(`   URL: ${page.url()}`)
    } else {
      console.log(`\n⚠ No se pudo extraer ID. URL: ${page.url()}`)
    }

    console.log('\n📸 Screenshot final...')
    await page.screenshot({ path: '/tmp/sooprema-e2e.png', fullPage: true })

    console.log('\n⏸️  Navegador abierto 8s para que Marco revise visualmente...')
    await page.waitForTimeout(8000)

    console.log('\n✅ Test end-to-end completo')
  } finally {
    await browser.close()
  }
}

run().catch(console.error)
