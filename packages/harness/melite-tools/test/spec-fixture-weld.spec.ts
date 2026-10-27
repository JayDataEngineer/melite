// spec-fixture-weld.spec.ts — THE CONTRACT WELD (2026-10-10, the
// operator's order: "the contract must actually be fully fleshed
// out so it can serve as mocking for testing").
//
// THE LAW (the kinds-yaml precedent, melite-card-view setup.ts's
// own words): a fixture welded to its producer; drift is CI
// failure. The GUI tier's spec fixtures were HAND-COPIES — a
// declaration could drop max_stack, wtype, or the whole visibility
// grammar and every GUI test stayed green over a hollowed contract
// (going through the motions). This weld serves the REAL doc —
// formSpecArm over the booted in-process card set, the SAME
// projector the /v1/form-spec door rides, never a second one —
// and pins it into a fixture the GUI tests load verbatim.
//
// MACHINE-LOCAL TRUTH NEVER WELDS: families[].present and
// packs[].present read THIS BOX's weights and extensions — they are
// normalized to ids before comparison so the weld pins the
// CONTRACT, not the machine's inventory. Everything else — schema
// envelope, mod envelopes, defaults, variants, edges, identity,
// preview — is repo truth and welds whole.
//
// Refresh: DSH_SNAPSHOT=refresh npx vitest run test/spec-fixture-weld.spec.ts
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, test } from 'vitest'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formSpecArm } from '../src/discovery.ts'
import type { FormSpecDoc } from '@melite/contracts/formSpec'

const FIXTURES = {
  'qwen-img-edit-21': join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../web/melite-card-view/tests/fixtures/image-edit-spec.json',
  ),
  'qwen-img-edit-2511': join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../web/melite-card-view/tests/fixtures/image-edit-2511-spec.json',
  ),
} as const

/** THE UID CANON (slice 6's weld hardening, 2026-10-27): schemastery
 *  uids are a PROCESS-ORDER artifact — one schema created anywhere in
 *  the boot graph renumbers every later uid (slice 6's craft admission
 *  cost exactly +1 and red this weld over a document that was otherwise
 *  byte-identical). The contract is REFERENTIAL, not numeric: every ref
 *  names the schema it points at. Both arms therefore renumber every
 *  uid (an object key, or a value that names a uid) to its rank in
 *  sorted order — one spelling for one document — while a ref that
 *  points at the WRONG schema still reds (its rank moves). */
const canonUids = (doc: Record<string, unknown>): Record<string, unknown> => {
  const uids = new Set<number>()
  const collect = (v: unknown): void => {
    if (Array.isArray(v)) {
      for (const it of v) collect(it)
      return
    }
    if (v === null || typeof v !== 'object') return
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (/^\d+$/.test(k)) uids.add(Number(k))
      if (k === 'uid' && typeof val === 'number') uids.add(val)
      collect(val)
    }
  }
  collect(doc)
  const rank = new Map([...uids].sort((a, b) => a - b).map((u, i) => [u, i]))
  const sub = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sub)
    if (v === null || typeof v !== 'object') {
      return typeof v === 'number' && rank.has(v) ? rank.get(v) : v
    }
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const num = /^\d+$/.test(k) ? Number(k) : null
      out[num !== null && rank.has(num) ? String(rank.get(num)) : k] = sub(val)
    }
    return out
  }
  return sub(doc) as Record<string, unknown>
}

/** The contract projection: machine-local presence marks strip to
 *  ids (the same normalization both arms ride — one spelling). */
const contractOf = (doc: FormSpecDoc): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...doc }
  // families keep the OBJECT face the client renders (id + the
  // DECL label); only the machine-local present mark strips
  if (Array.isArray(out['families'])) {
    out['families'] = (out['families'] as Array<Record<string, unknown>>)
      .map((f) => ({ id: f['id'], label: f['label'] ?? null }))
  }
  if (Array.isArray(out['packs'])) {
    out['packs'] = (out['packs'] as Array<Record<string, unknown>>)
      .map((p) => ({ id: p['id'], present: null }))
  }
  return canonUids(out)
}

describe('THE CONTRACT WELD: the served image-edit doc is the GUI fixture (drift is CI failure)', () => {
  test('formSpecArm serves the real image-edit contract for qwen-img-edit-21', async () => {
    const doc = await formSpecArm('qwen-img-edit-21')
    expect(doc).not.toBeNull()
    expect(doc!['form']).toBe('image-edit')
    expect(doc!['model']).toBe('qwen-img-edit-21')
    // THE CONTRACT HALF IS FLESHED: the envelope + mods + edges +
    // defaults + variants all ride (the deep facts are pinned in
    // comfyui-cordis contract-envelope.spec.ts — this weld pins
    // the SERVE composes them)
    expect(doc!['schema']).toBeTruthy()
    expect((doc!['mod_schemas'] as Record<string, unknown>)['mask']).toBeTruthy()
    expect(Array.isArray(doc!['inputs'])).toBe(true)
    // THE NO-GEOMETRY LAW (the stated-size recut, 59fc746e9 — the
    // empty-form burn: the serve carries NO width/height, never an
    // empty field, never a ghost 1024; the old pin demanded
    // model_defaults.width = 1024 and red under the new law). The
    // declared size word is the STATED-SIZE wall's own: the lane
    // refuses geometry field-named at both seats.
    const defaults = (doc!['model_defaults'] ?? {}) as Record<string, unknown>
    expect(Object.keys(defaults)).not.toContain('width')
    expect(Object.keys(defaults)).not.toContain('height')
  })

  test('THE UID CANON IS REFERENTIAL: a mis-aimed ref still reds', async () => {
    // the canon renumbers uids; it must never mask a ref pointing at
    // the WRONG schema. Swap two refs inside one inner ref dict: the
    // swap survives rank mapping (both targets exist, ranks differ),
    // so the weld still sees the drift.
    const fresh = contractOf((await formSpecArm('qwen-img-edit-21'))!)
    const tampered = JSON.parse(JSON.stringify(fresh)) as Record<string, unknown>
    const findRefDict = (v: unknown): Record<string, number> | null => {
      if (Array.isArray(v)) {
        for (const it of v) {
          const hit = findRefDict(it)
          if (hit !== null) return hit
        }
        return null
      }
      if (v === null || typeof v !== 'object') return null
      const rec = v as Record<string, unknown>
      const dict = rec['dict']
      if (dict !== null && typeof dict === 'object') {
        const entries = Object.values(dict as Record<string, unknown>)
        if (entries.length > 1 && entries.every((e) => typeof e === 'number')) {
          return dict as Record<string, number>
        }
      }
      for (const it of Object.values(rec)) {
        const hit = findRefDict(it)
        if (hit !== null) return hit
      }
      return null
    }
    const dict = findRefDict(tampered)
    expect(dict).not.toBeNull()
    const names = Object.keys(dict!) as [string, string, ...string[]]
    expect(names.length).toBeGreaterThan(1)
    const [a, b] = names
    const refs = dict!
    const swapped = refs[a]!
    refs[a] = refs[b]!
    refs[b] = swapped
    expect(canonUids(tampered)).not.toEqual(canonUids(fresh))
  })

  test('the fixtures match the fresh serves (refresh with DSH_SNAPSHOT=refresh)', async () => {
    for (const [key, path] of Object.entries(FIXTURES)) {
      const fresh = contractOf((await formSpecArm(key))!)
      if (process.env['DSH_SNAPSHOT'] === 'refresh') {
        mkdirSync(dirname(path), { recursive: true })
        writeFileSync(path, JSON.stringify(fresh, null, 2) + '\n', 'utf8')
        continue
      }
      if (!existsSync(path)) {
        throw new Error(
          'the welded fixture for ' + key + ' is absent — run: DSH_SNAPSHOT=refresh npx vitest run packages/harness/melite-tools/test/spec-fixture-weld.spec.ts',
        )
      }
      // the seated copy rides the SAME uid canon (a fixture written
      // before a schema addition still welds: its uids are rank-equal)
      const seated = canonUids(
        JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>,
      )
      // THE LOCKSTEP ASSERTION: byte-meaning equality, failure names
      // the refresh door — never a silent fixture
      expect(seated, 'welded fixture ' + key).toEqual(fresh)
    }
  })
})
