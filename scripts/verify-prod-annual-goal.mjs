#!/usr/bin/env node
/** Verifica si el annual goal card está visible en producción */

import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

try {
  console.log('🔐 Login en PRODUCCIÓN con Bruno...')
  await page.goto('https://cbi-eco-ai.vercel.app/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="email"]', 'bruno@cbi.com')
  await page.fill('input[name="password"]', 'BrunoCBI2026!')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(5000)
  console.log('  URL:', page.url())

  // Si hay modal first-login, saltarlo
  const firstModal = await page.locator('text=/bienvenido|primer/i').first().isVisible().catch(() => false)
  if (firstModal) console.log('  ℹ Modal primer login visible, saltando...')

  console.log('\n📊 Navegando a /dashboard...')
  await page.goto('https://cbi-eco-ai.vercel.app/dashboard', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  console.log('  URL final:', page.url())

  // Buscar textos clave
  const tests = [
    'Objetivo anual',
    'Media mensual',
    'Tracking',
    '🎯',
    'Revenue Growth',
  ]
  console.log('\n🔍 Búsqueda de elementos en la página:')
  for (const t of tests) {
    const count = await page.locator(`text=/${t}/i`).count()
    console.log(`  ${count > 0 ? '✓' : '✗'} "${t}" — ${count} coincidencias`)
  }

  await page.screenshot({ path: '/tmp/prod-dashboard.png', fullPage: true })
  console.log('\n📸 Screenshot: /tmp/prod-dashboard.png')

  // Ver tamaño del HTML para confirmar que carga
  const html = await page.content()
  console.log(`  HTML size: ${html.length} bytes`)

  // Buscar directamente en HTML
  if (html.includes('Objetivo anual')) console.log('  ✅ "Objetivo anual" presente en HTML')
  else console.log('  ❌ "Objetivo anual" NO está en HTML')
  if (html.includes('Revenue Growth')) console.log('  ✅ "Revenue Growth" presente en HTML')
} finally {
  await browser.close()
}
