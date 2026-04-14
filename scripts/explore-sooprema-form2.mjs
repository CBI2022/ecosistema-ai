#!/usr/bin/env node
/** V2: intenta varios caminos para llegar al form de nueva propiedad */

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

async function dumpForm(page, prefix) {
  const html = await page.content()
  await save(`${prefix}.html`, html.slice(0, 400000))
  await page.screenshot({ path: path.join(OUT_DIR, `${prefix}.png`), fullPage: true })
  console.log(`  📸 ${prefix}.png`)

  const fields = await page.$$eval('input, textarea, select', (els) =>
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
        className: el.className.slice(0, 150),
        options: el.tagName === 'SELECT'
          ? Array.from(el.options).slice(0, 30).map(o => `${o.value}=${o.text.trim().slice(0, 60)}`)
          : null,
      }
    })
  )

  const visible = fields.filter(f => f.visible)
  let out = `TOTAL: ${fields.length} | Visibles: ${visible.length}\n\n`
  visible.forEach((f, i) => {
    out += `[${i + 1}] ${f.tag}`
    if (f.name) out += ` name="${f.name}"`
    if (f.id) out += ` id="${f.id}"`
    if (f.type) out += ` type="${f.type}"`
    if (f.placeholder) out += ` placeholder="${f.placeholder}"`
    if (f.labelText) out += ` label="${f.labelText}"`
    if (f.required) out += ' [req]'
    out += '\n'
    if (f.options) out += '    options: ' + f.options.join(' | ') + '\n'
  })
  await save(`${prefix}-fields.txt`, out)
  return fields.length
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
  await page.waitForTimeout(2500)

  // ═══ Método 1: click directo en .button-new-property ═══
  console.log('\n📋 [Método 1] Click en .button-new-property...')
  const newPropertyBtn = await page.$('.button-new-property')
  if (newPropertyBtn) {
    await newPropertyBtn.click()
    await page.waitForTimeout(3000)
    await page.waitForLoadState('networkidle').catch(() => {})
    console.log('  URL:', page.url())
    console.log('  Title:', await page.title())

    const count = await dumpForm(page, '11-new-property-v2')
    console.log(`  Campos totales: ${count}`)

    // Buscar iframe (los CRMs a veces usan iframe)
    const iframes = await page.$$eval('iframe', (els) => els.map(el => ({
      src: el.src,
      id: el.id,
      name: el.name,
    })))
    if (iframes.length) {
      console.log('  ⚠ Iframes detectados:', JSON.stringify(iframes, null, 2))
      await save('11-iframes.txt', JSON.stringify(iframes, null, 2))
    }
  } else {
    console.log('  ✗ Botón no encontrado')
  }

  // ═══ Método 2: edit de una propiedad existente ═══
  console.log('\n📋 [Método 2] Editar una propiedad existente (ver el form completo)...')
  const editUrl = 'https://www.costablancainvestments.com/admin/propiedades/editar/MTQxOTg0MTUzMjY4Mzg0ODA=/'
  await page.goto(editUrl, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(3000)
  console.log('  URL:', page.url())
  console.log('  Title:', await page.title())

  const count2 = await dumpForm(page, '12-edit-property')
  console.log(`  Campos totales: ${count2}`)

  // ═══ Método 3: nueva propiedad vía URL admin ═══
  console.log('\n📋 [Método 3] URL /admin/propiedades/nueva ...')
  const newUrls = [
    'https://www.costablancainvestments.com/admin/propiedades/nueva/',
    'https://www.costablancainvestments.com/admin/propiedades/nueva',
    'https://www.costablancainvestments.com/admin/propiedades/crear/',
    'https://www.costablancainvestments.com/admin/propiedades/add/',
  ]
  for (const u of newUrls) {
    try {
      const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 })
      console.log(`  ${u} → ${resp?.status()} @ ${page.url()}`)
      if (resp && resp.status() === 200 && page.url().includes('nueva')) {
        const count3 = await dumpForm(page, '13-new-property-direct')
        console.log(`  Campos totales: ${count3}`)
        break
      }
    } catch (e) {
      console.log(`  ${u} → error:`, e.message.slice(0, 60))
    }
  }

  console.log('\n✅ Completo')
} catch (err) {
  console.error('❌ Error:', err.message)
  await page.screenshot({ path: path.join(OUT_DIR, 'ERROR2.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}
