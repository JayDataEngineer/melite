/**
 * pickVerdict — the pick judges truth-in-hand (the collapse: the
 * user layer is the shown document, stated-or-settled by
 * construction — no touched ledger, no stale keys, nothing
 * unstated reaches the gate).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { pickFamilyRefusal, resolvePickVerdictDoc } from "../src/ui/studio/pickVerdict.ts"

describe("resolvePickVerdictDoc — the pick judges truth-in-hand", () => {
  it("absent user keys yield to the held row (the sparse shown layer)", () => {
    const verdict = resolvePickVerdictDoc(
      { width: 800, height: 600, steps: 20 },
      {},
      { width: 768, height: 448 },
    )
    assert.equal(verdict.steps, 20)
    assert.equal(verdict.width, 768)
    assert.equal(verdict.height, 448)
  })

  it("a stated (shown) user key beats the held row", () => {
    const verdict = resolvePickVerdictDoc(
      { steps: 20 },
      { steps: 25 },
      {},
    )
    assert.equal(verdict.steps, 25)
  })

  it("the pick's stamps win over both; a null stamp deletes", () => {
    const verdict = resolvePickVerdictDoc(
      { width: 800, seed: 7 },
      { width: 1000 },
      { width: 768, seed: null },
    )
    assert.equal(verdict.width, 768)
    assert.ok(!("seed" in verdict), "a null stamp deletes the key")
  })

  it("held-only keys (drill/agent writes) ride the verdict", () => {
    const verdict = resolvePickVerdictDoc(
      { width: 800, custom_knob: 3 },
      {},
      {},
    )
    assert.equal(verdict.custom_knob, 3)
  })

  it("a user unset (undefined) inherits the held row — the DOOR'S spelling, not the spread's (G3, timeline wave-2)", () => {
    // The old arm pinned the disease as law ("keeps the candidate's
    // unset semantics"): a materialized undefined overwrote held, so
    // after any axis-unset the pick judged `steps: undefined` where
    // the run composes serializeLayerA's held 20. A materialized
    // undefined is the unset gesture, not a statement — the base
    // rides; deletion is the frame's explicit null only.
    const verdict = resolvePickVerdictDoc(
      { width: 1344 },
      { width: undefined },
      {},
    )
    assert.equal(verdict.width, 1344)
  })

  it("THE G3 UNSET-THEN-PICK CHAIN: unset an axis, pick, the verdict judges the base's held value", () => {
    // The exact report scenario: the pick commit mints materialized
    // undefineds (RunRecipeEngine's axisUnset keys), so a NEXT pick's
    // layerA carries `steps: undefined` beside the persisted
    // `steps: 20`. The verdict must see the 20 the door composes —
    // never the undefined the door never composes.
    const layerAAfterUnset = { steps: undefined, denoise: 0.7 } as Record<string, unknown>
    const held = { steps: 20, denoise: 0.5, width: 832 } as Record<string, unknown>
    const verdict = resolvePickVerdictDoc(held, layerAAfterUnset, {})
    assert.equal(verdict.steps, 20, "the unset axis rides the held value")
    assert.equal(verdict.denoise, 0.7, "the stated sibling still wins")
    assert.equal(verdict.width, 832, "held-only keys ride")
  })

  it("deletion stays the frame's explicit null (the unset cure never eats it)", () => {
    const verdict = resolvePickVerdictDoc(
      { width: 800, seed: 7 },
      { width: undefined, denoise: 0.6 },
      { seed: null },
    )
    assert.equal(verdict.width, 800, "user unset inherits")
    assert.ok(!("seed" in verdict), "a null frame stamp still deletes")
    assert.equal(verdict.denoise, 0.6)
  })

  it("the user layer composes whole (every stated key reaches the verdict)", () => {
    const verdict = resolvePickVerdictDoc({ a: 1 }, { b: 2, c: 3 }, {})
    assert.deepEqual(verdict, { a: 1, b: 2, c: 3 })
  })
})

// ── THE FAMILY CLAUSE (journey-closure B5 — hop 3's first judge) ────
// The pick gate judges resolvePickVerdictDoc's candidate through the
// SAME clause the run door's walk enforces (deriveWindowFamily +
// T4_ONLY_KEYS, @melite/models-h3/timelineContract — ONE spelling;
// the one-owner ruling lives on pickFamilyRefusal). Pre-fix state
// (audits/journey/b5-pick-patch-family-clause-2026-10-17.md): both
// faces green-lit a Final-Cut-stamped keyframe doc while the walk
// refused it verbatim at the run press.
describe("pickFamilyRefusal — the pick gate judges the candidate through the walk", () => {
  const KEYFRAME_DOC = {
    keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
    steps: 20,
  }

  it("a Final-Cut stamp on a keyframe doc refuses with the run door's own voice", () => {
    // the burn: Final Cut saved pre-keyframe (the stamp's own
    // wire_defaults — second_pass_enabled + sr_switch), the doc
    // gained a pin, the family re-derived t4r under the stamp
    assert.equal(
      pickFamilyRefusal({ ...KEYFRAME_DOC, second_pass_enabled: true, sr_switch: true }),
      "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: second_pass_enabled, sr_switch",
    )
  })

  it("the four-key doc refuses naming every key, sorted — the door refusal's verbatim key set", () => {
    assert.equal(
      pickFamilyRefusal({
        ...KEYFRAME_DOC,
        interpolate_enabled: true,
        interp_model: "film_net_fp16.safetensors",
        interp_multiplier: 2,
        sharpen_enabled: true,
      }),
      "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: "
      + "interp_model, interp_multiplier, interpolate_enabled, sharpen_enabled",
    )
  })

  it("the reference surface derives t4r too — a stamp over ref_images refuses", () => {
    assert.match(
      pickFamilyRefusal({ ...KEYFRAME_DOC, ref_images: "webp/ref.png", sr_switch: true }) ?? "",
      /unsanctioned inject keys: sr_switch/,
    )
  })

  it("a clean t4r doc (keyframes, no post keys) composes on its lane", () => {
    assert.equal(pickFamilyRefusal(KEYFRAME_DOC), null)
  })

  it("the same four keys on a t4_open doc compose — the family honors them there", () => {
    assert.equal(
      pickFamilyRefusal({ interpolate_enabled: true, interp_model: "m", interp_multiplier: 2, sharpen_enabled: true }),
      null,
    )
  })

  it("the same keys on a t4_chain film compose (multi-call = the film lane)", () => {
    assert.equal(
      pickFamilyRefusal({
        calls: [
          { text: "a", start_frame: 0, end_frame: 90 },
          { text: "b", start_frame: 90, end_frame: 180 },
        ],
        sr_switch: true,
        second_pass_enabled: true,
      }),
      null,
    )
  })

  it("a null-valued key does not refuse — the wire's delete spelling (the merge-patch deletes it before the walk sees it)", () => {
    assert.equal(pickFamilyRefusal({ ...KEYFRAME_DOC, sr_switch: null }), null)
  })

  it("THE PICK VERDICT, END TO END: the candidate resolvePickVerdictDoc composes is the doc the clause judges", () => {
    // held row: the Final-Cut-stamped keyframe doc (drill/agent
    // writes). The pick: an ordinary Draft re-pick. The verdict doc
    // — what the run would compose — refuses BEFORE the write.
    const candidate = resolvePickVerdictDoc(
      { ...KEYFRAME_DOC, second_pass_enabled: true, sr_switch: true },
      {},
      { width: 768, height: 448 },
    )
    assert.match(
      pickFamilyRefusal(candidate) ?? "",
      /h3_window\(t4r\): unsanctioned inject keys: second_pass_enabled, sr_switch/,
    )
  })
})
