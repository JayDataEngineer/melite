// exec-stub-loader.mjs — the G5 executability-probe loader (registered
// per probe process via module.register from tools/release-artifacts.mjs).
//
// Bare specifiers that fail normal resolution become stub: URLs; the
// load hook synthesizes the stub FROM THE IMPORTER'S OWN IMPORT CLAUSE
// so Node's named-export check links it (a default-only stub is
// rejected before the probe's real work runs — measured in the
// packages-alpha3-release-audit). Relative specifiers are NEVER
// stubbed: a missed relative inside the extract is exactly the
// in-package byte defect this gate exists to refuse.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The importer rides THROUGH resolve (the load hook's context has no
// parentURL on modern Node — the G5 estate-call probe starved the
// named-export synthesis and died on `defineTool` at link time).
const stubImporters = new Map()

export async function resolve (specifier, context, nextResolve) {
  if (!/^[./]|^(file|node|data):/.test(specifier)) {
    try {
      return await nextResolve(specifier, context)
    } catch (e) {
      if (e?.code === 'ERR_MODULE_NOT_FOUND') {
        if (typeof context.parentURL === 'string' && context.parentURL.startsWith('file:')) {
          stubImporters.set(specifier, context.parentURL)
        }
        return { url: 'stub:' + specifier, shortCircuit: true }
      }
      throw e
    }
  }
  return nextResolve(specifier, context)
}

/** Escape a specifier for literal embedding in a RegExp source. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function load (url, context, nextLoad) {
  if (!url.startsWith('stub:')) return nextLoad(url, context)
  const named = new Set()
  let hasDefault = false
  const parentURL = stubImporters.get(url.slice(5))
  if (typeof parentURL === 'string' && parentURL.startsWith('file:')) {
    try {
      const src = readFileSync(fileURLToPath(parentURL), 'utf8')
      const spec = esc(url.slice(5))
      for (const m of src.matchAll(new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${spec}['"]`, 'g'))) {
        for (let part of m[1].split(',')) {
          part = part.trim()
          if (!part) continue
          named.add(part.split(/\s+as\s+/)[1]?.trim() ?? part)
        }
      }
      hasDefault = new RegExp(`import\\s+[^{*\\s][^\\s]*\\s*from\\s*['"]${spec}['"]`).test(src)
    } catch {
      // unreadable importer — fall through to the default stub
    }
  }
  const lines = ['export default undefined']
  for (const n of named) lines.push(`export const ${n} = undefined`)
  return { format: 'module', shortCircuit: true, source: lines.join('\n') + '\n' }
}
