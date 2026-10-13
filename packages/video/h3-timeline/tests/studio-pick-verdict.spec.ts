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

  it("a user unset (undefined) keeps the candidate's unset semantics", () => {
    const verdict = resolvePickVerdictDoc(
      { width: 1344 },
      { width: undefined },
      {},
    )
    assert.ok("width" in verdict)
    assert.equal(verdict.width, undefined)
  })

  it("the user layer composes whole (every stated key reaches the verdict)", () => {
    const verdict = resolvePickVerdictDoc({ a: 1 }, { b: 2, c: 3 }, {})
    assert.deepEqual(verdict, { a: 1, b: 2, c: 3 })
  })
})
