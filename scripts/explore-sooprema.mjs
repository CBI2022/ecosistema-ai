#!/usr/bin/env node
/**
 * Script de exploración de Sooprema CRM.
 * Loguea, navega y toma screenshots + dumps HTML para documentar selectores.
 * NO se commitea — solo uso local.
 *
 * Run: node scripts/explore-sooprema.mjs
 */

import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(ROOT, '.env.local') })

const OUT_DIR = path.join(ROOT, 'scripts', 'sooprema-exploration')

const URL = process.env.SOOPREMA_URL
const USER = process.env.SOOPREMA_USERNAME
const PASS = process.env.SOOPREMA_PASSWORD

if (!URL || !USER || !PASS) {
  console.error('❌ Faltan credenciales en .env.local')
  process.exit(1)
}

async function save(name, content) {
  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.writeFile(path.join(OUT_DIR, name), content)
  console.log(`  ✓ ${name}`)
}

async function screenshot(page, name) {
  await fs.mkdir(OUT_DIR, { recursive: true })
  await page.screenshot({ path: path.join(OUT_DIR, name + '.png'), fullPage: true })
  console.log(`  📸 ${name}.png`)
}

function summarizeInputs(inputs) {
  return inputs.map((i) => {
    const s = [i.tag]
    if (i.name) s.push(`name="${i.name}"`)
    if (i.id) s.push(`id="${i.id}"`)
    if (i.type) s.push(`type="${i.type}"`)
    if (i.placeholder) s.push(`placeholder="${i.placeholder}"`)
    if (i.labelText) s.push(`label="${i.labelText}"`)
    if (i.required) s.push('required')
    return s.join(' ')
  }).join('\n')
}

async function dumpFormInputs(page, filename) {
  const inputs = await page.$$eval('input, textarea, select', (els) =>
    els.map((el) => {
      const id = el.id
      let labelText = ''
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`)
        if (label) labelText = label.textContent.trim()
      }
      if (!labelText) {
        const parentLabel = el.closest('label')
        if (parentLabel) labelText = parentLabel.textContent.trim().slice(0, 60)
      }
      return {
        tag: el.tagName.toLowerCase(),
        name: el.name || '',
        id,
        type: el.type || '',
        placeholder: el.placeholder || '',
        labelText,
        required: el.required || false,
        className: el.className.slice(0, 100),
      }
    })
  )

  const summary = summarizeInputs(inputs)
  await save(filename, summary)
  return inputs
}

async function dumpStructure(page, filename) {
  const html = await page.content()
  await save(filename, html.slice(0, 200000))
}

async function dumpLinks(page, filename) {
  const links = await page.$$eval('a, button', (els) =>
    els.slice(0, 200).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 80),
      href: el.getAttribute('href') || '',
      id: el.id || '',
      className: (el.className || '').toString().slice(0, 80),
    }))
  )
  const out = links
    .filter((l) => l.text || l.href)
    .map((l) => `[${l.tag}] "${l.text}" ${l.href ? '→ ' + l.href : ''} ${l.id ? 'id=' + l.id : ''} ${l.className ? 'class=' + l.className : ''}`)
    .join('\n')
  await save(filename, out)
}

async function main() {
  console.log('🚀 Iniciando exploración de Sooprema CRM...\n')

  const browser = await chromium.launch({
    headless: true,
  })
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await ctx.newPage()

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('  ⚠ console error:', msg.text().slice(0, 80))
  })

  try {
    // ═══ PASO 1: Página de login ═══
    console.log('📍 PASO 1 — Página de login')
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(1500)
    console.log('  URL cargada:', page.url())
    console.log('  Título:', await page.title())

    await screenshot(page, '01-login-page')
    await dumpFormInputs(page, '01-login-inputs.txt')
    await dumpStructure(page, '01-login.html')

    // ═══ PASO 2: Intentar login ═══
    console.log('\n📍 PASO 2 — Intentando login')

    const usernameSelectors = [
      'input[name="username"]', 'input[name="user"]', 'input[name="email"]',
      'input[name="login"]', 'input[type="email"]', 'input[type="text"]:first-of-type',
      'input[id*="user" i]', 'input[id*="email" i]',
    ]
    const passwordSelectors = [
      'input[name="password"]', 'input[name="pass"]',
      'input[type="password"]', 'input[id*="pass" i]',
    ]

    let usernameField, passwordField
    for (const sel of usernameSelectors) {
      const el = await page.$(sel)
      if (el) { usernameField = sel; break }
    }
    for (const sel of passwordSelectors) {
      const el = await page.$(sel)
      if (el) { passwordField = sel; break }
    }

    if (!usernameField || !passwordField) {
      console.log('  ⚠ No se encontraron campos de login — revisa 01-login-inputs.txt')
      await browser.close()
      return
    }
    console.log(`  Username field: ${usernameField}`)
    console.log(`  Password field: ${passwordField}`)

    await page.fill(usernameField, USER)
    await page.fill(passwordField, PASS)
    await screenshot(page, '02-login-filled')

    // Botón submit
    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:has-text("Login")', 'button:has-text("Iniciar")', 'button:has-text("Entrar")',
    ]
    let submitClicked = false
    for (const sel of submitSelectors) {
      const el = await page.$(sel)
      if (el) {
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
          el.click(),
        ])
        console.log(`  Click submit: ${sel}`)
        submitClicked = true
        break
      }
    }
    if (!submitClicked) {
      console.log('  ⚠ No se encontró botón submit, probando ENTER')
      await page.keyboard.press('Enter')
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
    }

    await page.waitForTimeout(2500)

    // ═══ PASO 3: Dashboard post-login ═══
    console.log('\n📍 PASO 3 — Post-login (dashboard)')
    console.log('  URL actual:', page.url())
    console.log('  Título:', await page.title())
    await screenshot(page, '03-dashboard')
    await dumpStructure(page, '03-dashboard.html')
    await dumpLinks(page, '03-dashboard-links.txt')

    // ═══ PASO 4: Buscar enlaces relevantes (Propiedades / Nueva propiedad) ═══
    console.log('\n📍 PASO 4 — Buscando sección de propiedades')

    const propertyKeywords = ['propiedad', 'property', 'properties', 'listing', 'inmueble', 'nueva', 'new', 'add']
    const allLinks = await page.$$eval('a, button', (els) =>
      els.map((el) => ({
        text: (el.textContent || '').trim(),
        href: el.getAttribute('href') || '',
      })).filter(l => l.text.length > 0 && l.text.length < 80)
    )

    const propertyLinks = allLinks.filter((l) =>
      propertyKeywords.some((kw) => l.text.toLowerCase().includes(kw) || l.href.toLowerCase().includes(kw))
    ).slice(0, 20)

    console.log('  Enlaces relacionados con propiedades encontrados:')
    propertyLinks.forEach((l) => console.log(`    • "${l.text}" → ${l.href}`))
    await save('04-property-links.txt', propertyLinks.map((l) => `"${l.text}" → ${l.href}`).join('\n'))

    // ═══ PASO 5: Intentar ir a "nueva propiedad" ═══
    console.log('\n📍 PASO 5 — Intentando abrir formulario nueva propiedad')
    const newPropertyKeywords = ['nueva propiedad', 'new property', 'añadir propiedad', 'add property', 'nuevo inmueble']
    let navigated = false
    for (const kw of newPropertyKeywords) {
      const el = page.getByRole('link', { name: new RegExp(kw, 'i') }).first()
      if (await el.count() > 0) {
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
          el.click(),
        ])
        console.log(`  Click en: "${kw}"`)
        navigated = true
        break
      }
    }

    if (!navigated) {
      // Intentar primera URL con 'propiedad' o 'property'
      const propUrl = propertyLinks.find((l) => l.href && !l.href.startsWith('#') && !l.href.startsWith('javascript'))
      if (propUrl) {
        const target = new URL(propUrl.href, page.url()).href
        console.log(`  Navegando directamente a: ${target}`)
        await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
        await page.waitForTimeout(1500)
        navigated = true
      }
    }

    if (navigated) {
      console.log('  URL actual:', page.url())
      await screenshot(page, '05-properties-area')
      await dumpStructure(page, '05-properties-area.html')
      await dumpLinks(page, '05-properties-links.txt')

      // Si hay un botón "nueva"
      const addButtonSelectors = [
        'a:has-text("Nueva")', 'a:has-text("New")', 'a:has-text("Añadir")',
        'button:has-text("Nueva")', 'button:has-text("New")', 'button:has-text("Añadir")',
        '[href*="/new"]', '[href*="/create"]', '[href*="/add"]',
      ]
      for (const sel of addButtonSelectors) {
        const el = await page.$(sel)
        if (el) {
          await Promise.all([
            page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
            el.click().catch(() => {}),
          ])
          console.log(`  Click: ${sel}`)
          await page.waitForTimeout(1500)
          console.log('  URL:', page.url())
          await screenshot(page, '06-new-property-form')
          await dumpFormInputs(page, '06-new-property-inputs.txt')
          await dumpStructure(page, '06-new-property-form.html')
          break
        }
      }
    }

    console.log('\n✅ Exploración completa')
    console.log(`📁 Resultados en: ${OUT_DIR}`)
  } catch (err) {
    console.error('❌ Error:', err.message)
    try { await screenshot(page, 'ERROR-state') } catch {}
  } finally {
    await browser.close()
  }
}

main()
