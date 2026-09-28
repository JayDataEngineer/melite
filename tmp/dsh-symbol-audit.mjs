// One-off audit: every @deepseek-ai/dsh-* symbol Melite imports vs the 0.1.7-rc.2
// source checkout. Not part of any test tier; delete after the audit.
import fs from 'node:fs'
import path from 'node:path'

const NEW = 'references/deepseek-harness/packages'

const dirByName = new Map()
;(function walk(dir, depth) {
  if (depth > 3) return
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const f = path.join(dir, e.name)
    if (e.isDirectory()) walk(f, depth + 1)
    else if (e.name === 'package.json') {
      try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'))
        if (j.name?.startsWith('@deepseek-ai/dsh')) dirByName.set(j.name, path.dirname(f))
      } catch {}
    }
  }
})(NEW, 0)

const imports = new Map()
function scan(dir, depth) {
  if (depth > 5) return
  let entries
  try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (['node_modules', 'dist', 'lib', '.git'].includes(e.name) || e.name.startsWith('.')) continue
    const f = path.join(dir, e.name)
    if (e.isDirectory()) scan(f, depth + 1)
    else if (/\.(ts|tsx|mts)$/.test(e.name)) {
      const src = fs.readFileSync(f, 'utf8')
      const re = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"](@deepseek-ai\/dsh-[a-z0-9-]+)(?:\/client)?['"]/g
      for (const m of src.matchAll(re)) {
        const pkg = m[2]
        for (let s of m[1].split(',')) {
          s = s.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim()
          if (!s) continue
          if (!imports.has(pkg)) imports.set(pkg, new Map())
          if (!imports.get(pkg).has(s)) imports.get(pkg).set(s, [])
          imports.get(pkg).get(s).push(f)
        }
      }
    }
  }
}
scan('packages', 0)

function sourceBlob(dir) {
  let blob = ''
  ;(function rd(d) {
    let entries
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue
      const f = path.join(d, e.name)
      if (e.isDirectory()) rd(f)
      else if (/\.tsx?$/.test(e.name)) blob += fs.readFileSync(f, 'utf8') + '\n'
    }
  })(path.join(dir, 'src'))
  return blob
}

let total = 0
let checked = 0
for (const [pkg, syms] of [...imports].sort()) {
  const dir = dirByName.get(pkg)
  if (!dir) { console.log(`PKG GONE: ${pkg}`); total += syms.size; continue }
  const blob = sourceBlob(dir)
  const bad = []
  for (const [s, files] of syms) {
    checked += 1
    const esc = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (!new RegExp(`\\b${esc}\\b`).test(blob)) bad.push(`${s}   (${files[0]})`)
  }
  if (bad.length) {
    console.log(`### ${pkg} — ${bad.length}/${syms.size} symbol(s) not found in 0.1.7 source:`)
    for (const b of bad) console.log(`    ${b}`)
    total += bad.length
  }
}
console.log(`\nsymbols checked: ${checked}   unresolved: ${total}`)
