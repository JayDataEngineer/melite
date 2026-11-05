/**
 * recipe-blank-clamped-departure.spec.ts — THE CLAMPED-STAMP
 * DEPARTURE LAW (the flux-klein blank burn, 2026-11-03, sweep gate
 * 8b). THE BURN, verbatim from the live wire: a recipe row whose
 * stamps fall outside the RESOLVED VARIANT's envelope (author-base
 * steps 50/cfg 4 under the distilled variant's [4,8]/[1,2]) writes
 * the RECONCILED stamp — the override reconcile clamps 50→8, 4→2
 * (its own law: "a recipe's 50 composes to 8 under a 4-step
 * distill") — and the pill lights by the SAME derivation
 * (activeRecipeId: "the stamp the pill DERIVES must be the stamp
 * the pick WRITES"). The blank then departed NOTHING:
 * recipeDeparturePatch compared held (the clamp, 8/2) against the
 * row's RAW stamps (50/4), never matched, wrote an empty frame —
 * the live wire carried {"params":{}} — and the clamped values
 * stayed stated FOREVER with no error anywhere. The sweep's blank
 * round-trip arm caught it red (the face never departs the picked
 * row).
 *
 * THE LAW THIS WALL FIRES ON: the departure rides the SAME
 * derivation the pick wrote — a clamped pick is departable, a
 * hand-edited value still stands (the user's word), and an
 * unclamped pick departs exactly as it did before (no regression
 * on the raw-stamp families). PURE functions, the burn's own
 * shape, no fixtures beyond the flux-klein mirror.
 */
import { describe, expect, it } from 'vitest'
import { activeRecipeId, axisPickPatch, recipeDeparturePatch } from '../src/spec.ts'
import type { FormSpecDoc, FormVariantRow, SpecValues } from '../src/spec.ts'

/** The burn's own shape, mirrored minimal: one clamping variant
 *  (the distilled tier), one out-of-envelope recipe row
 *  (author-base), one empty-stamp row (default). */
function fluxKleinMirror(): FormSpecDoc {
  const V = (id: string, group: string, extra: Record<string, unknown>): FormVariantRow =>
    ({ id, label: id, group, defaults: {}, route: 'flux-klein', ...extra }) as FormVariantRow
  return {
    form: 'txt2img',
    model: 'flux-klein',
    model_defaults: { steps: 4, cfg: 1 },
    schema: {
      uid: 0,
      refs: {
        0: { type: 'object', dict: { prompt: 1, steps: 2, cfg: 3 } },
        1: { type: 'string', meta: { description: 'Prompt', default: 'a cat' } },
        2: { type: 'number', meta: { default: 4, step: 1 } },
        3: { type: 'number', meta: { default: 1, step: 0.5 } },
      },
    },
    features: {
      variant_groups: {
        Variant: { label: 'Variant' },
        Recipe: { label: 'Recipe', default: 'default' },
      },
    },
    variants: [
      V('distilled', 'Variant', {
        label: 'Distilled 4-Step',
        defaults: { model: 'flux-klein', steps: 4, cfg: 1 },
        sampler_envelope: { steps: [4, 8], cfg: [1, 2] },
      }),
      V('author-base', 'Recipe', { defaults: { steps: 50, cfg: 4 } }),
      V('default', 'Recipe', { defaults: {} }),
    ],
    packs: [],
  } as unknown as FormSpecDoc
}

/** The row lookup by id (the fixture's own rows, never ad-hoc). */
function rowOf(spec: FormSpecDoc, id: string): FormVariantRow {
  const row = (spec.variants ?? []).find((r) => r.id === id)
  if (row === undefined) throw new Error('fixture row missing: ' + id)
  return row
}

describe('THE CLAMPED-STAMP DEPARTURE LAW (flux-klein blank burn, 2026-11-03)', () => {
  const spec = fluxKleinMirror()

  it('the pick writes the RECONCILED stamp under a clamping variant (the burn\'s own numbers: 50→8, 4→2)', () => {
    const held: SpecValues = { model: 'flux-klein', variant: 'distilled', steps: 4, cfg: 1 }
    const patch = axisPickPatch(spec, rowOf(spec, 'author-base'), held)
    expect(patch.steps).toBe(8)
    expect(patch.cfg).toBe(2)
  })

  it('the pill lights by the SAME derivation over the clamped doc (never the raw stamps)', () => {
    const clamped: SpecValues = { model: 'flux-klein', variant: 'distilled', steps: 8, cfg: 2 }
    expect(activeRecipeId(spec, clamped)).toBe('author-base')
  })

  it('THE FIRING ARM: the blank DEPARTS a clamped pick (held-at-clamp unstated, never an empty frame)', () => {
    const clamped: SpecValues = { model: 'flux-klein', variant: 'distilled', steps: 8, cfg: 2 }
    const departure = recipeDeparturePatch(spec, rowOf(spec, 'author-base'), clamped)
    // pre-cure this returned {} — the live wire's {"params":{}}
    expect(departure).toEqual({ steps: null, cfg: null })
  })

  it('a hand-edited value still stands (the user\'s word — the D4/F3 law, unchanged by the cure)', () => {
    const handEdited: SpecValues = { model: 'flux-klein', variant: 'distilled', steps: 6, cfg: 2 }
    const departure = recipeDeparturePatch(spec, rowOf(spec, 'author-base'), handEdited)
    // steps 6 is neither the raw stamp (50) nor the derived clamp (8):
    // the user moved it — it stands; cfg still rides the clamp and departs
    expect(departure).toEqual({ cfg: null })
  })

  it('NO REGRESSION: an unclamped pick departs at its raw stamps (the pre-cure families)', () => {
    // no envelope on the resolved variant → the pick writes the raw
    // stamps verbatim; the departure nulls them exactly as before
    const bare = fluxKleinMirror()
    delete (rowOf(bare, 'distilled') as { sampler_envelope?: unknown }).sampler_envelope
    const held: SpecValues = { model: 'flux-klein', variant: 'distilled', steps: 50, cfg: 4 }
    expect(axisPickPatch(bare, rowOf(bare, 'author-base'), held)).toMatchObject({ steps: 50, cfg: 4 })
    expect(recipeDeparturePatch(bare, rowOf(bare, 'author-base'), held)).toEqual({ steps: null, cfg: null })
  })
})
