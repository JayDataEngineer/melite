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
// specifier -> every importer URL that reached for it: a deep module
// graph (loader's config/tree.js) imports the same dep NAMED from
// several files, and the synthesis needs the UNION, not one parent.
const stubImporters = new Map()

export async function resolve (specifier, context, nextResolve) {
  if (!/^[./]|^(file|node|data):/.test(specifier)) {
    try {
      return await nextResolve(specifier, context)
    } catch (e) {
      if (e?.code === 'ERR_MODULE_NOT_FOUND') {
        if (typeof context.parentURL === 'string' && context.parentURL.startsWith('file:')) {
          const set = stubImporters.get(specifier) ?? new Set()
          set.add(context.parentURL)
          stubImporters.set(specifier, set)
        }
        // PER-IMPORTER URL: one stub module per specifier loads BEFORE
        // the graph's other importers resolve (loader's config/tree.js
        // and index.js both reach for cosmokit), so a shared instance
        // can never see the union. Minting importer-scoped URLs gives
        // each importing module its own synthesized instance.
        const parent = typeof context.parentURL === 'string' ? context.parentURL : ''
        return { url: 'stub:' + specifier + '?importer=' + encodeURIComponent(parent), shortCircuit: true }
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
  const q = url.indexOf('?importer=')
  const specUrl = q === -1 ? url.slice(5) : url.slice(5, q)
  const parentFromUrl = q === -1 ? null : decodeURIComponent(url.slice(q + '?importer='.length))
  const importers = new Set(parentFromUrl ? [parentFromUrl] : (stubImporters.get(specUrl) ?? []))
  const importerSrcs = [...importers]
    .filter((u) => typeof u === 'string' && u.startsWith('file:'))
    .map((u) => { try { return readFileSync(fileURLToPath(u), 'utf8') } catch { return '' } })
  if (importerSrcs.length > 0) {
    try {
      const src = importerSrcs.join('\n')
      const spec = esc(specUrl)
      for (const m of src.matchAll(new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${spec}['"]`, 'g'))) {
        for (let part of m[1].split(',')) {
          part = part.trim()
          if (!part) continue
          // the stub must export the MODULE's name (before `as`),
          // not the importer's local alias — the linker checks the
          // original (import { DECL as annyDecl } needs export DECL).
          named.add(part.split(/\s+as\s+/)[0].trim())
        }
      }
      hasDefault = new RegExp(`import\\s+[^{*\\s][^\\s]*\\s*from\\s*['"]${spec}['"]`).test(src)
      // NAMESPACE imports: `import * as yaml from 'js-yaml'` binds a
      // REAL namespace whose members the stub cannot know — ESM
      // namespaces are fixed at link. Scan the importer's own
      // `yaml.<member>` accesses and export each as the constructible
      // stub (vendor does new yaml.Type at module scope).
      for (const m of src.matchAll(new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*['"]${spec}['"]`, 'g'))) {
        for (const u of src.matchAll(new RegExp(`\\b${m[1]}\\.(\\w+)`, 'g'))) named.add(u[1])
      }
    } catch {
      // unreadable importer — fall through to the default stub
    }
  }
  // CONSTRUCTIBLE SYNTHESIS: a stub member that only links is not
  // enough — G5's plain-node import executes the tarball's top level,
  // and vendor libs do `new yaml.Type(...)` at module scope. undefined
  // dies with "not a constructor"; a no-op function satisfies both the
  // link check and construction. The default is a Proxy so ANY member
  // access (import x, then x.y.z) stays constructible-callable.
  const lines = [
    'const stubFn = function stub () {}',
    // toPrimitive: a stub used as a computed property key (vendor:
    // static [EntryGroup.key]) must coerce, not throw.
    "const stubObj = new Proxy(stubFn, { get: (t, k) => k === Symbol.toPrimitive ? () => 'stub' : stubObj, apply: () => stubObj, construct: () => ({}) })",
    'export default stubObj',
  ]
  for (const n of named) lines.push(`export const ${n} = stubObj`)
  return { format: 'module', shortCircuit: true, source: lines.join('\n') + '\n' }
}
