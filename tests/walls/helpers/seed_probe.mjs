// Seed-sentinel probe (2026-09-08): the seed law's new carrier is
// the TS card contract (the py schema.py rows died with the render
// machinery, b324c480). Each card module's schema is private to its
// apply() — this probe stubs ctx.comfyui.registerCard to capture the
// registered schema, then evaluates seed=-1 (must admit — RANDOM
// sentinel) and seed=-2 (must refuse — "expected number >= -1").
// Non-seed refusals (a card requiring siblings) don't mask the
// verdict: we classify by whether the refusal names seed.
//
// Output: one JSON line per card —
//   {id, hasSeed, admitMinus1: bool, refuseMinus2: bool, note?}
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const cardsDir = new URL('.', import.meta.url).pathname
  // tests/walls/helpers/ -> repo/packages/engines/comfyui-cordis/src/cards/
const repoCards = join(cardsDir, '..', '..', '..',
  'packages', 'engines', 'comfyui', 'cordis', 'src', 'cards')

const trySchema = (schema, seed, extra = {}) => {
  try {
    schema({ ...extra, seed })
    return { ok: true }
  } catch (e) {
    return { ok: false, msg: String(e && e.message ? e.message : e) }
  }
}

const out = []
for (const f of readdirSync(repoCards).filter(x => x.endsWith('.ts')).sort()) {
  const mod = await import(join(repoCards, f))
  if (typeof mod.apply !== 'function') continue
  const defs = []
  mod.apply({ comfyui: { registerCard: (d) => defs.push(d) } })
  for (const def of defs) {
    const id = def && def.id ? def.id : f.replace(/\.ts$/, '')
    // seed membership: the declared knob map (extra keys are silently
    // allowed by Schemastery objects — a successful eval proves nothing).
    // Some cards (h3) register a hand-written normalizer wrapping the
    // real Schemastery schema — no .dict — so fall back to behavioral
    // probing with generous sibling fill; classify by the refusal
    // naming seed, so missing-sibling refusals never mask the verdict.
    const dict = def.schema && def.schema.dict
    const fill = { prompt: 'p', image: 'i', model: 'm', body_glb: 'b', source_image: 's' }
    const hasSeed = !!(dict && Object.prototype.hasOwnProperty.call(dict, 'seed'))
      || (() => {
        const r = trySchema(def.schema, -2, dict ? {} : fill)
        return !r.ok && /seed|>=\s*-1/i.test(r.msg)
      })()
    if (!hasSeed) { out.push({ id, hasSeed: false, admitMinus1: true, refuseMinus2: true }); continue }
    const a = trySchema(def.schema, -1, dict ? {} : fill)
    const r = trySchema(def.schema, -2, dict ? {} : fill)
    const admitMinus1 = a.ok || (a.ok === false && !/seed/i.test(a.msg))
    const refuseMinus2 = !r.ok && /seed|>=\s*-1/i.test(r.msg)
    out.push({
      id, hasSeed,
      admitMinus1,
      refuseMinus2,
      note: a.ok ? undefined : a.msg.slice(0, 120),
    })
  }
}
console.log(JSON.stringify(out))
