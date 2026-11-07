// @contract cards-mirror-admits
// cards-mirror-admits.spec.tsx — THE PRE-COLLAPSE DOC LAW (the
// operator burn, 2026-11-16: "when I look at the video cards from
// before with mods, they are broken").
//
// THE BURN: a doc saved before the mod collapse carries a legacy bag
// name (replace/repair/extend/refine/upscale) as a root key. The
// ESTATE write door admits the row (the card's contract `admits` row
// lists every legacy name — cardAdmits, cardsFacts.ts:181, the same
// predicate compose/start/variant-stamp ride) and the compose door
// TRANSLATES the bag through resolveLegacyEditAliases into the one
// edit entry — the collapse's compose-through promise. But the CLIENT
// compose mirror (composeValidate) judged the doc against lanes.base ∪
// modOwnedFields alone: the legacy name fired nothing on any lane and
// every pre-collapse card opened with a red lane-refusal banner over a
// doc the door admits — "broken" on sight, mods invisible, for the
// operator's whole saved history.
//
// THE LAW THIS WALL PINS: the served spec carries the card's contract
// `admits` row verbatim (the same list the estate's admission
// predicate reads), and the mirror sanctions every name on it with the
// estate's own glob law (a trailing `*` admits every key under the
// prefix). One spelling, both doors: a key the write door admits never
// banners at the mirror; a key neither door admits still refuses with
// the field-named voice (the mirror keeps its teeth — the control arm).
//
// Every arm rides the REAL served spec (formSpecArm, the door's own
// body) over the REAL boot — never a hand-built surface.
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, test } from 'vitest'
import { composeValidate, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'

const LEGACY_DOCS: Array<[string, SpecValues]> = [
  ['replace bag', { replace: [{ source_clip: 'c.mp4', swap_prompt: 'the outfit' }] }],
  ['repair bag', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'fix the hand', denoise: 0.32 }] }],
  ['extend bag', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'more', extend_seconds: 2.33 }] }],
  ['refine bag', { refine: [{ source_clip: 'c.mp4', scale: 2 }] }],
  ['upscale bag', { upscale: [{ chain_run: 'run-x', denoise: 0.24 }] }],
]

describe('THE PRE-COLLAPSE DOC LAW — the mirror sanctions what the door admits (cards-mirror-admits)', () => {
  test('ARM 1 — the serves row: the spec carries the card\'s contract admits verbatim', async () => {
    const spec = (await formSpecArm('h3-timeline')) as FormSpecDoc
    const admits = (spec as unknown as { admits?: readonly string[] }).admits
    expect(admits, 'the served spec carries the card\'s admits row').toBeDefined()
    for (const name of ['edit', 'replace', 'repair', 'extend', 'refine', 'upscale', 'reshoot']) {
      expect(admits, `the admits row carries the estate-admitted name '${name}'`).toContain(name)
    }
    expect(admits, 'the glob rows ride verbatim (the prefix law is the mirror\'s to honor)').toContain('ctx_*')
  })

  test.each(LEGACY_DOCS.map(([n, d]) => [n, d] as const))(
    'ARM 2 — %s never banners: a legacy bag the door admits is compose-through, not a refusal',
    async (name, bag) => {
      const spec = (await formSpecArm('h3-timeline')) as FormSpecDoc
      const doc: SpecValues = { model: 'h3-timeline', steps: 6, ...bag }
      const v = composeValidate(spec, doc)
      expect(v.map((x) => x.message), `the ${name} doc passes the mirror clean (the estate admits it, compose translates it)`).toEqual([])
    },
  )

  test('ARM 3 — the glob law: a prefix* admit row sanctions every key under the prefix', async () => {
    const spec = (await formSpecArm('h3-timeline')) as FormSpecDoc
    const doc: SpecValues = { model: 'h3-timeline', steps: 6, ctx_window: 3, sla_dense_steps: '0' }
    expect(composeValidate(spec, doc), 'ctx_* and sla_* keys pass — the same prefix law cardAdmits rides').toEqual([])
  })

  test('ARM 4 — the mirror keeps its teeth: a key neither door admits still refuses field-named', async () => {
    const spec = (await formSpecArm('h3-timeline')) as FormSpecDoc
    const doc: SpecValues = { model: 'h3-timeline', steps: 6, nonsense_key: 1 }
    const v = composeValidate(spec, doc)
    expect(v.length, 'the unknown key still refuses').toBe(1)
    expect(v[0]!.field).toBe('nonsense_key')
    expect(v[0]!.message).toMatch(/fires nothing on this lane/)
  })
})
