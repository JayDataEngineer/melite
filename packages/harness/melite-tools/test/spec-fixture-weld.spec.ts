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
  return out
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
    expect((doc!['model_defaults'] as Record<string, unknown>)['width']).toBe(1024)
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
      const seated = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
      // THE LOCKSTEP ASSERTION: byte-meaning equality, failure names
      // the refresh door — never a silent fixture
      expect(seated, 'welded fixture ' + key).toEqual(fresh)
    }
  })
})
