/**
 * pickVerdict — the pick judges truth-in-hand (the collapse: the
 * user layer is the shown document, stated-or-settled by
 * construction — no touched ledger, no stale keys, nothing
 * unstated reaches the gate).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { resolvePickVerdictDoc } from "../src/ui/studio/pickVerdict.ts"

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
