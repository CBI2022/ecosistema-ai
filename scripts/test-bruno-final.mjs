import { chromium } from 'playwright'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
try {
  await page.goto('https://cbi-eco-ai.vercel.app/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="email"]', 'bruno@costablancainvestments.com')
  await page.fill('input[name="password"]', 'Ciao2010')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(6000)
  console.log('URL final:', page.url())
  const isDashboard = page.url().includes('/dashboard')
  console.log(isDashboard ? '✅ BRUNO ENTRA AL DASHBOARD' : '❌ Quedó en:', page.url())
  // Check if first-login modal appears
  const modal = await page.locator('text=/Bienvenido a CBI/i').first().isVisible().catch(() => false)
  console.log('Modal primer login aparece:', modal)
} finally {
  await browser.close()
}
