#!/usr/bin/env node
/** Profundiza en el formulario "Subir Propiedad" de Sooprema. */

import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
dotenv.config({ path: path.join(ROOT, '.env.local') })

const OUT_DIR = path.join(ROOT, 'scripts', 'sooprema-exploration')
await fs.mkdir(OUT_DIR, { recursive: true })

const URL = process.env.SOOPREMA_URL
const USER = process.env.SOOPREMA_USERNAME
const PASS = process.env.SOOPREMA_PASSWORD

async function save(name, content) {
  await fs.writeFile(path.join(OUT_DIR, name), content)
  console.log(`  ✓ ${name}`)
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

  console.log('\n📋 Abriendo "Subir Propiedad"...')
  // Intento 1: buscar el link por texto
  const link = page.getByText('Subir Propiedad', { exact: false }).first()
  await link.click().catch(() => {})
  await page.waitForTimeout(3000)
  await page.waitForLoadState('networkidle').catch(() => {})

  console.log('  URL tras click:', page.url())
  await page.screenshot({ path: path.join(OUT_DIR, '10-upload-property.png'), fullPage: true })
  console.log('  📸 10-upload-property.png')

  // Dump HTML completo (limitado)
  const html = await page.content()
  await save('10-upload-property.html', html.slice(0, 500000))

  // Extraer TODOS los inputs/selects/textareas con máxima info
  const formFields = await page.$$eval('input, textarea, select', (els) =>
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
      // Rect (si es visible)
      const rect = el.getBoundingClientRect()
      const visible = rect.width > 0 && rect.height > 0
      return {
        tag: el.tagName.toLowerCase(),
        name: el.name || '',
        id,
        type: el.type || '',
        placeholder: el.placeholder || '',
        labelText,
        required: el.required || false,
        visible,
        className: el.className.slice(0, 150),
        value: el.value?.slice(0, 50) || '',
        options: el.tagName === 'SELECT'
          ? Array.from(el.options).slice(0, 20).map(o => `${o.value}=${o.text.trim().slice(0, 60)}`)
          : null,
      }
    })
  )

  let out = `TOTAL CAMPOS: ${formFields.length}\n\n`
  out += 'VISIBLES:\n' + '='.repeat(60) + '\n'
  formFields.filter((f) => f.visible).forEach((f, i) => {
    out += `\n[${i + 1}] ${f.tag}`
    if (f.name) out += ` name="${f.name}"`
    if (f.id) out += ` id="${f.id}"`
    if (f.type) out += ` type="${f.type}"`
    if (f.placeholder) out += ` placeholder="${f.placeholder}"`
    if (f.labelText) out += ` label="${f.labelText}"`
    if (f.required) out += ' [required]'
    if (f.options) out += '\n      options: ' + f.options.join(' | ')
  })
  await save('10-upload-fields.txt', out)

  // Headers / secciones de la página
  const sections = await page.$$eval('h1, h2, h3, h4, legend, .section-title, [class*="title"], [class*="header"]', (els) =>
    els.slice(0, 40).map((el) => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 100),
    })).filter(s => s.text)
  )
  await save('10-sections.txt', sections.map((s) => `[${s.tag}] ${s.text}`).join('\n'))

  // Botones de submit
  const buttons = await page.$$eval('button, input[type="submit"], input[type="button"]', (els) =>
    els.map((el) => ({
      text: (el.textContent || el.value || '').trim().slice(0, 60),
      type: el.type || '',
      id: el.id || '',
    })).filter((b) => b.text)
  )
  await save('10-buttons.txt', buttons.map((b) => `[${b.type}] "${b.text}" ${b.id ? '#' + b.id : ''}`).join('\n'))

  console.log('\n✅ Exploración form completa')
} catch (err) {
  console.error('❌ Error:', err.message)
  await page.screenshot({ path: path.join(OUT_DIR, 'ERROR.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
