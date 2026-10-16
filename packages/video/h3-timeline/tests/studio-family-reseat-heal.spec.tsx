/**
 * useFamilyReseatHeal — the family-reseat heal's own wall (D8,
 * 2026-11-06).
 *
 * THE LIVE BRICK (the operator's words: "THIS SHOULD BE PHYSICALLY
 * IMPOSSIBLE"): `card_compose phase 1: bad-params: card
 * 'h3-timeline' refused params: h3_window(t4r): unsanctioned
 * inject keys: sr_switch`. A film legally stamped sr_switch lost a
 * call, derived t4r, and every compose refused while the rail kept
 * serving the dead switch. The heal's law: a t4r-derived doc
 * unstated the T4_ONLY residue its layer carries (ONE write,
 * undefined — the serializer omits the key and its delete ride
 * nulls a base-carried stamp); every OTHER family keeps its post
 * keys untouched.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { act, render } from "@testing-library/react"
import { createElement, useState } from "react"
import { useFamilyReseatHeal } from "../src/ui/studio/useFamilyReseatHeal.ts"
import { deriveWindowFamily } from "@melite/models-h3/timelineContract"
import type { LayerA } from "../src/ui/studio/docModel.ts"

/** The harness: a host that mounts the heal over state and records
 *  every updateLayerA call verbatim (the write IS the assertion). */
function mount(
  base: Record<string, unknown> | null | undefined,
  layer: Record<string, unknown>,
): { writes: Array<Record<string, unknown>> } {
  const writes: Array<Record<string, unknown>> = []
  function Host(): React.ReactElement {
    const [layerA] = useState(layer as unknown as LayerA)
    useFamilyReseatHeal(base, layerA, (u) => {
      writes.push(u(layerA) as unknown as Record<string, unknown>)
    })
    return createElement("div")
  }
  act(() => { render(createElement(Host)) })
  return { writes }
}

// the doc shapes: t4r = ONE call carrying a guide seat; t4_chain =
// two calls; t4_open = one text call
const t4rBase = { calls: [{ start_frame: 0, end_frame: 90, image: "data:image/png;base64,AAA" }] }
const chainBase = { calls: [
  { start_frame: 0, end_frame: 90, image: "data:image/png;base64,AAA" },
  { start_frame: 90, end_frame: 180 },
] }
const openBase = { calls: [{ start_frame: 0, end_frame: 90 }] }

describe("deriveWindowFamily (the one spelling the heal and the walk share)", () => {
  it("derives t4r from a single guided call, a pin channel, the declared ref surface, or an end anchor", () => {
    assert.equal(deriveWindowFamily(t4rBase), "t4r")
    assert.equal(deriveWindowFamily({ calls: [{ start_frame: 0, end_frame: 90 }], keyframes: [{ image: "data:image/png;base64,AAA", frame: 12 }] }), "t4r")
    assert.equal(deriveWindowFamily({ calls: [{ start_frame: 0, end_frame: 90 }], ref_images: ["runs/r1/img/a.png"] }), "t4r")
    assert.equal(deriveWindowFamily({ calls: [{ start_frame: 0, end_frame: 90 }], last_frame: "runs/r1/last.png" }), "t4r")
    // the wire-literal spelling counts too (never zero)
    assert.equal(deriveWindowFamily({ calls: [{ start_frame: 0, end_frame: 90 }], ref_images: "runs/r1/img/a.png" }), "t4r")
  })
  it("derives t4_chain for multi-call docs and t4_open for one text call", () => {
    assert.equal(deriveWindowFamily(chainBase), "t4_chain")
    assert.equal(deriveWindowFamily(openBase), "t4_open")
  })
})

describe("useFamilyReseatHeal (the D8 cure)", () => {
  it("THE LAW: a t4r-derived doc unstated the T4_ONLY residue in ONE write", () => {
    const { writes } = mount(t4rBase, {
      sr_switch: true, sr_resolution: 1080, sharpen_method: "rcas", interp_multiplier: 2,
      second_pass_enabled: true, width: 1344,
    })
    assert.equal(writes.length, 1, "exactly one reseat write")
    const w = writes[0]!
    // the twelve T4_ONLY keys the layer carried all unstate
    assert.equal(w["sr_switch"], undefined)
    assert.equal(w["sr_resolution"], undefined)
    assert.equal(w["sharpen_method"], undefined)
    assert.equal(w["interp_multiplier"], undefined)
    // every NON-T4 key rides untouched — the heal speaks only the
    // dead lane's vocabulary (the master switch and geometry stay)
    assert.equal(w["second_pass_enabled"], true)
    assert.equal(w["width"], 1344)
  })

  it("inert values never churn: false/null/'' ride absent from the serializer already", () => {
    const { writes } = mount(t4rBase, { sr_switch: false, sr_model: null, sharpen_method: "" })
    assert.equal(writes.length, 0)
  })

  it("a clean t4r doc writes nothing (the no-op law)", () => {
    const { writes } = mount(t4rBase, { width: 1344, seed: 7 })
    assert.equal(writes.length, 0)
  })

  it("a null base (the spine's absent-params spelling) derives from the layer alone", () => {
    // the null law lives in the merge, owned here — callers pass raw
    const { writes } = mount(null, {
      calls: [{ start_frame: 0, end_frame: 90, image: "runs/r1/anchor.png" }],
      sr_switch: true,
    })
    assert.equal(writes.length, 1)
    assert.equal(writes[0]!["sr_switch"], undefined)
  })

  it("every OTHER family keeps its post keys — films and open windows compose the finishing pass", () => {
    // the live shape: Final Cut legally stamped on a film
    let { writes } = mount(chainBase, { sr_switch: true, sr_resolution: 1080 })
    assert.equal(writes.length, 0, "t4_chain keeps the super-res rail")
    ;({ writes } = mount(openBase, { sr_switch: true }))
    assert.equal(writes.length, 0, "t4_open keeps the super-res rail")
  })

  it("the layer's stated seats feed the derivation — a base without calls derives from the layer's own", () => {
    // the defined-wins merge: the layer's calls state beats the
    // base's hole; a spread's undefined hole would lie t4_open
    const { writes } = mount({ calls: [{ start_frame: 0, end_frame: 90 }] }, {
      calls: [{ start_frame: 0, end_frame: 90, image: "runs/r1/anchor.png" }],
      sr_switch: true,
    })
    assert.equal(writes.length, 1)
    assert.equal(writes[0]!["sr_switch"], undefined)
  })
})
