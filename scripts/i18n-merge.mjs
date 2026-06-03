// Fusiona los mapas planos de /tmp/cbi-i18n/*.json en los 3 archivos de mensajes,
// preservando las claves ya existentes (no sobrescribe).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const LOCALES = ['en', 'es', 'nl']
const MSG_DIR = new URL('../src/i18n/messages/', import.meta.url)
const MAP_DIR = '/tmp/cbi-i18n'

const maps = readdirSync(MAP_DIR).filter(f => f.endsWith('.json'))
const report = { added: { en: 0, es: 0, nl: 0 }, conflicts: [], skipped: [] }

// Carga todos los mapas en una estructura { dottedKey: {en,es,nl} }
const all = {}
for (const f of maps) {
  const obj = JSON.parse(readFileSync(`${MAP_DIR}/${f}`, 'utf8'))
  for (const [k, v] of Object.entries(obj)) {
    if (all[k]) continue // primer mapa gana si hay duplicado entre lotes
    all[k] = v
  }
}

for (const loc of LOCALES) {
  const path = new URL(`${loc}.json`, MSG_DIR)
  const msg = JSON.parse(readFileSync(path, 'utf8'))

  for (const [dotted, vals] of Object.entries(all)) {
    const value = vals[loc] ?? vals.en ?? vals.es ?? Object.values(vals)[0]
    const parts = dotted.split('.')
    let node = msg
    let ok = true
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (node[p] === undefined) node[p] = {}
      else if (typeof node[p] !== 'object') {
        if (loc === 'en') report.conflicts.push(`${dotted} (segmento "${p}" ya es texto)`)
        ok = false
        break
      }
      node = node[p]
    }
    if (!ok) continue
    const leaf = parts[parts.length - 1]
    if (node[leaf] === undefined) { node[leaf] = value; report.added[loc]++ }
    // si ya existe, se preserva (no se sobrescribe)
  }

  writeFileSync(path, JSON.stringify(msg, null, 2) + '\n', 'utf8')
}

console.log('Claves añadidas:', report.added)
console.log('Conflictos (segmento ya era texto):', report.conflicts.length)
if (report.conflicts.length) console.log(report.conflicts.slice(0, 30).join('\n'))
