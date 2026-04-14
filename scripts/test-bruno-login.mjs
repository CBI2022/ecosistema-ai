#!/usr/bin/env node
/** Test login de Bruno contra producción vía la app */

import { chromium } from 'playwright'

const creds = [
  { email: 'bruno@costablancainvestments.com', password: 'BrunoCBI2026!', desc: 'Email nuevo + password conocida' },
  { email: 'bruno@cbi.com', password: 'BrunoCBI2026!', desc: 'Email VIEJO (debería fallar)' },
]

for (const { email, password, desc } of creds) {
  console.log(`\n🧪 ${desc}`)
  console.log(`   ${email} / ${password}`)
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  try {
    await page.goto('https://cbi-eco-ai.vercel.app/login', { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="email"]', email)
    await page.fill('input[name="password"]', password)
    await page.click('button[type="submit"]')
    await page.waitForTimeout(6000)
    const url = page.url()
    console.log(`   URL final: ${url}`)
    // Check error
    const err = await page.locator('text=/email|contraseña|incorrect/i').first().textContent().catch(() => '')
    if (err) console.log(`   Msg pantalla: ${err.slice(0, 100)}`)
  } catch (e) {
    console.log(`   Error: ${e.message.slice(0, 80)}`)
  } finally {
    await browser.close()
  }
}
