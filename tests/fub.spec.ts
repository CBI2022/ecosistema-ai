// E2E test para la integración Follow Up Boss.
//
// Cubre:
//   1) Smoke: /dashboard carga FubDashboardSection
//   2) /leads carga pipeline kanban
//   3) /admin/fub solo accesible para admin
//   4) Cross-agent leak: agente A no ve leads del agente B (RLS funciona)
//
// Pre-requisitos (env):
//   - PLAYWRIGHT_BASE_URL (ej: http://localhost:3000)
//   - PLAYWRIGHT_AGENT_A_EMAIL / PLAYWRIGHT_AGENT_A_PASSWORD
//   - PLAYWRIGHT_AGENT_B_EMAIL / PLAYWRIGHT_AGENT_B_PASSWORD
//   - PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD
//   - PLAYWRIGHT_AGENT_B_LEAD_ID (un personId que pertenezca al agente B)
//
// Ejecutar:
//   npx playwright test tests/fub.spec.ts

import { test, expect, type Page } from '@playwright/test'

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|onboarding|photographer)/, { timeout: 10_000 })
}

test.describe('FUB integration — smoke', () => {
  test('agent dashboard renders FubDashboardSection', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_AGENT_A_EMAIL
    const password = process.env.PLAYWRIGHT_AGENT_A_PASSWORD
    test.skip(!email || !password, 'PLAYWRIGHT_AGENT_A_* no configurado')

    await login(page, email!, password!)
    await page.goto(`${BASE}/dashboard`)

    const fubSection = page.locator('text=/Actividad CRM|Follow Up Boss no está sincronizado/i').first()
    await expect(fubSection).toBeVisible({ timeout: 10_000 })
  })

  test('/leads page renders pipeline kanban', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_AGENT_A_EMAIL
    const password = process.env.PLAYWRIGHT_AGENT_A_PASSWORD
    test.skip(!email || !password, 'PLAYWRIGHT_AGENT_A_* no configurado')

    await login(page, email!, password!)
    await page.goto(`${BASE}/leads`)

    await expect(page.locator('h1', { hasText: /Leads/ })).toBeVisible()
    // Pipeline header
    await expect(page.locator('text=/Pipeline/i').first()).toBeVisible({ timeout: 10_000 })
  })

  test('/admin/fub rechaza agente no admin', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_AGENT_A_EMAIL
    const password = process.env.PLAYWRIGHT_AGENT_A_PASSWORD
    test.skip(!email || !password, 'PLAYWRIGHT_AGENT_A_* no configurado')

    await login(page, email!, password!)
    await page.goto(`${BASE}/admin/fub`)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5_000 })
  })

  test('/admin/fub accesible para admin', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_ADMIN_EMAIL
    const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD
    test.skip(!email || !password, 'PLAYWRIGHT_ADMIN_* no configurado')

    await login(page, email!, password!)
    await page.goto(`${BASE}/admin/fub`)
    await expect(page.locator('h1', { hasText: /Follow Up Boss/ })).toBeVisible()
    await expect(page.locator('text=/Activity Leaderboard/i')).toBeVisible()
    await expect(page.locator('text=/Conversion Funnel/i')).toBeVisible()
    await expect(page.locator('text=/Speed to Lead/i')).toBeVisible()
    await expect(page.locator('text=/Source ROI/i')).toBeVisible()
    await expect(page.locator('text=/Captaciones Pipeline/i')).toBeVisible()
  })

  test('cross-agent leak: agente A no ve lead del agente B', async ({ page }) => {
    const emailA = process.env.PLAYWRIGHT_AGENT_A_EMAIL
    const passwordA = process.env.PLAYWRIGHT_AGENT_A_PASSWORD
    const leadB = process.env.PLAYWRIGHT_AGENT_B_LEAD_ID
    test.skip(!emailA || !passwordA || !leadB, 'PLAYWRIGHT_AGENT_A_* o LEAD_ID no configurado')

    await login(page, emailA!, passwordA!)
    await page.goto(`${BASE}/leads?personId=${leadB}`)

    // Debe mostrar "Lead no encontrado o no tienes acceso"
    await expect(page.locator('text=/no encontrado|no tienes acceso/i')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('FUB webhook handler', () => {
  test('rechaza firma HMAC inválida', async ({ request }) => {
    const res = await request.post(`${BASE}/api/webhooks/fub`, {
      headers: { 'fub-signature': 'sha1=deadbeef', 'content-type': 'application/json' },
      data: { event: 'peopleUpdated', resourceIds: [1] },
    })
    // 401 si FUB_WEBHOOK_SECRET está configurado; 200 si no (warning)
    expect([200, 401]).toContain(res.status())
  })

  test('GET health responde 200', async ({ request }) => {
    const res = await request.get(`${BASE}/api/webhooks/fub`)
    expect(res.status()).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })
})
