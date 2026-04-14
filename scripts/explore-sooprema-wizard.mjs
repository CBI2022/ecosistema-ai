#!/usr/bin/env node
/**
 * Recorre el wizard completo: rellena step 1, click Continue,
 * y dumpea todos los siguientes steps hasta llegar al submit final.
 */

import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const OUT = path.join(ROOT, 'scripts', 'sooprema-exploration')
await fs.mkdir(OUT, { recursive: true })

const URL = process.env.SOOPREMA_URL
const USER = process.env.SOOPREMA_USERNAME
const PASS = process.env.SOOPREMA_PASSWORD

async function save(name, content) {
  await fs.writeFile(path.join(OUT, name), content)
  console.log(`  ✓ ${name}`)
}

async function dumpStep(page, step) {
  const prefix = `wizard-step-${step}`
  await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true })

  const html = await page.content()
  await save(`${prefix}.html`, html.slice(0, 400000))

  const fields = await page.$$eval('input, textarea, select, button[type="submit"], input[type="submit"]', (els) =>
    els.map((el) => {
      const id = el.id
      let labelText = ''
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) labelText = label.textContent.trim()
      }
      if (!labelText) {
        const parentLabel = el.closest('label')
        if (parentLabel) labelText = parentLabel.textContent.trim().slice(0, 80)
      }
      const rect = el.getBoundingClientRect()
      return {
        tag: el.tagName.toLowerCase(),
        name: el.name || '',
        id,
        type: el.type || '',
        placeholder: el.placeholder || '',
        labelText,
        required: el.required,
        visible: rect.width > 0 && rect.height > 0,
        value: el.value?.slice(0, 60) || '',
        options: el.tagName === 'SELECT'
          ? Array.from(el.options).slice(0, 25).map(o => `${o.value}=${o.text.trim().slice(0, 50)}`)
          : null,
      }
    })
  )

  const visible = fields.filter(f => f.visible && (f.name || f.id))
  let out = `STEP ${step} — ${visible.length} visible fields\n\n`
  visible.forEach((f, i) => {
    out += `[${i + 1}] ${f.tag}`
    if (f.name) out += ` name="${f.name}"`
    if (f.id) out += ` id="${f.id}"`
    if (f.type) out += ` type="${f.type}"`
    if (f.placeholder) out += ` placeholder="${f.placeholder}"`
    if (f.labelText) out += ` label="${f.labelText}"`
    if (f.value) out += ` value="${f.value}"`
    out += '\n'
    if (f.options) out += '    options: ' + f.options.join(' | ') + '\n'
  })
  await save(`${prefix}-fields.txt`, out)

  // Botones clave (Continue, Publish, Save, Atrás)
  const buttons = await page.$$eval(
    'a.button, button, input[type="submit"], input[type="button"]',
    (els) => els.map((el) => ({
      text: (el.textContent || el.value || '').trim().slice(0, 60),
      id: el.id || '',
      className: el.className?.toString().slice(0, 80) || '',
    })).filter(b => b.text)
  )
  await save(`${prefix}-buttons.txt`, buttons.map(b => `"${b.text}" ${b.id ? '#' + b.id : ''} ${b.className ? '.' + b.className : ''}`).join('\n'))

  // Secciones visibles (h1-h4)
  const headings = await page.$$eval('h1, h2, h3, h4, legend', (els) =>
    els.map(el => el.textContent?.trim().slice(0, 100)).filter(Boolean).slice(0, 30)
  )
  await save(`${prefix}-headings.txt`, headings.join('\n'))

  return { fieldCount: visible.length, buttonCount: buttons.length }
}

async function fillRequired(page) {
  // Rellenar los mínimos necesarios para poder avanzar
  const testRef = 'A' + Math.floor(Math.random() * 9000 + 1000) + 'TESTX'
  try {
    await page.fill('[name="input-txt-precio"]', '549000')
    await page.fill('[name="txt-referencia"]', testRef)
    await page.selectOption('[name="txt-tipo_det"]', '5')
    await page.selectOption('[name="txt-habitacion"]', '3')
    await page.selectOption('[name="txt-banos"]', '2')
    await page.fill('[name="txt-parcela"]', '873')
    await page.fill('[name="txt-constru"]', '127')
    console.log(`  Step 1 básico rellenado (ref=${testRef})`)
  } catch (e) {
    console.log('  ⚠ Error rellenando step 1:', e.message.slice(0, 80))
  }
}

async function dismissPopupsIfAny(page) {
  // Sooprema a veces muestra popup "Etiquetas personalizadas" → botón Accept
  try {
    const ok = page.locator('#popup_ok').first()
    if (await ok.count() > 0 && await ok.isVisible().catch(() => false)) {
      console.log('  Cerrando popup #popup_ok')
      await ok.click()
      await page.waitForTimeout(1200)
    }
  } catch {}
}

async function clickContinue(page) {
  await dismissPopupsIfAny(page)
  const selectors = [
    '#btnsend',
    '#btn',
    'button.propertyuploadnavigation__submit--next', // step 2+ React UI
    '.propertyuploadnavigation__submit--next',
    'button:has-text("Siguiente")',
    'button:has-text("Next")',
    'a.botonAzulFull:has-text("Continue")',
    'a:has-text("Continue")',
  ]
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
      console.log(`  Click ${sel}`)
      await el.click()
      await page.waitForTimeout(4000)
      await page.waitForLoadState('networkidle').catch(() => {})
      await dismissPopupsIfAny(page)
      return true
    }
  }
  return false
}

async function fillLocationStep(page) {
  // Step 2 — ubicación
  try {
    await page.fill('[name="address"]', 'Carrer Barro')
    await page.fill('[name="address_number"]', '7')
    await page.fill('[name="postal_code"]', '03590')
    console.log('  Step 2: calle + número + CP rellenados')
  } catch (e) {
    console.log('  ⚠ Step 2 fallo:', e.message.slice(0, 80))
  }
}

const browser = await chromium.launch({ headless: true })
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

  console.log('\n📋 Step 1 — Datos principales')
  await page.goto('https://www.costablancainvestments.com/admin/propiedades/add/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)
  console.log('  URL:', page.url())
  const { fieldCount: f1 } = await dumpStep(page, 1)
  console.log(`  Campos: ${f1}`)

  await fillRequired(page)

  for (let step = 2; step <= 8; step++) {
    console.log(`\n📋 Step ${step} — Click Continue y dumpear`)
    const clicked = await clickContinue(page)
    if (!clicked) {
      console.log('  ⚠ No se encontró botón Continue — fin del wizard')
      break
    }
    console.log('  URL:', page.url())
    const { fieldCount } = await dumpStep(page, step)
    console.log(`  Campos visibles: ${fieldCount}`)

    // Rellenar en step 2 (ubicación) antes de avanzar
    if (step === 2) {
      await fillLocationStep(page)
    }

    if (fieldCount === 0) {
      console.log('  ⚠ Step sin campos — posible página final o error')
    }
  }

  console.log('\n✅ Exploración wizard completa')
} catch (err) {
  console.error('❌ Error:', err.message)
  await page.screenshot({ path: path.join(OUT, 'ERROR-wizard.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
