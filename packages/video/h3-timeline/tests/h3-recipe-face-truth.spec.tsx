/**
 * h3-recipe-face-truth.spec.tsx — THE RECIPE FACE TRUTH ARM (ERROR d,
 * first half: recipe second-pass visibility). The operator's burn,
 * reproduced 1:1 on the live lane 2026-10-19: add the Generate Video
 * card, open the studio, pick "Final Cut" in the Recipe seat — the
 * trigger keeps reading "-- recipe --" while the Second Pass master
 * switch flips true and the turbo bag rides MODIFIERS. The pick WROTE;
 * the face LIED. The birth face lies too (blank although the card is
 * born standard-stamped).
 *
 * THE PINNED MECHANISM (the toggle proof, /tmp/red-d-face-toggle2.txt):
 * hydrateLayerA materialized `strength: undefined` as an OWN KEY on
 * every lora bag row; deepEqualJson counts own keys (keys.length 2 ≠
 * 1), so the hydrated bag never deep-matched the served recipe stamp —
 * no Recipe row ever held, at birth AND after the writing pick (the
 * settle round-trip, pendingOps.ts:103, re-dirties the bag after every
 * write). The phantom is invisible state deciding a face — the exact
 * rot class the (m) parity cure killed at the seat.
 *
 * THE CURE (docHydrate.ts, the phantom-key law): `strength` rides only
 * when stated — the wire's own shape, mirroring the steps rider.
 *
 * THE SEAT (tests/helpers/card-rail-seat.tsx — the kit this wall
 * seeded): the REAL served spec (formSpecArm over the booted estate),
 * the REAL hydration (hydrateLayerA), the REAL gesture (menu click →
 * axisPickPatch → resolvePickVerdictDoc → composeValidate), the REAL
 * settle round-trip, and the mux-verbatim live docs below. Nothing
 * about the law is mocked — a jsdom burn here is a lane burn.
 *
 * THE ARMS: LAW (the value half — activeRecipeId names standard/final
 * over the raw held docs), BIRTH (the face journals Standard over the
 * pane's own hydration), PICK (the Final Cut pick writes — sp/sr ride
 * the settled layer — and the face journals Final Cut).
 */
import { beforeAll, describe, expect, it, afterAll } from "vitest"
import { activeRecipeId } from "@melite/card-base/spec"
import type { FormSpecDoc } from "@melite/card-base/client"
import type { LayerA } from "../src/ui/studio/docModel.ts"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { hydrateLayerA, serializeLayerA } from "../src/ui/studio/docHydrate.ts"
import {
  realServedSpec, serveFormSpec, bindDeadEstateRemote, releaseRailSeat,
  restoreLaneOverlay, recipeFace, pickRecipe, gateFace, mountLiveLayer,
} from "../../../../packages/web/card-base/tests/helpers/card-rail-seat.tsx"

/** THE LIVE HELD DOCS, verbatim off the mux (bench-session-5c46,
 *  probe 2026-10-19): the birth stage params (rev 188 era — loras
 *  stated, second pass unstated) and the post-pick params (rev 192 —
 *  the Final Cut stamp stated). THE P1 RECEIPT: the pick's value
 *  REACHED the held doc (sp/sr true aboard) while the face read
 *  blank — the value half is PROVED, the face half OWES. */
function birthParams(): Record<string, unknown> {
  return {
    variant: "timeline", quant: "int8", model: "h3",
    loras: [{ id: "h3_turbo8_v1" }],
    calls: [{ text: "A single shot — describe the action, camera, and mood.", start_frame: 0, end_frame: 90 }],
    seed: 42, sla_protect_audio: true, sla_stabilize_motion: true, sla_disable_fp16_accum: false,
    sharpen_enabled: false, interpolate_enabled: false,
  }
}
function finalParams(): Record<string, unknown> {
  return { ...birthParams(), sr_switch: true, second_pass_enabled: true }
}

/** THE PANE'S OWN SEAT: the rail element factory the kit hosts — the
 *  studio's exact RunRecipeEngine seat (component.tsx:347), whole-doc
 *  commits only. */
function renderRail(seat: { layerA: LayerA, setLayerA: (updater: unknown) => void }): React.ReactElement {
  return (
    <RunRecipeEngine
      base={birthParams()}
      layerA={seat.layerA}
      setLayerAKey={() => { throw new Error("the studio commits whole docs, never keys") }}
      setLayerA={seat.setLayerA as (u: LayerA | ((p: LayerA) => LayerA)) => void}
      refArtifacts={[]}
    />
  )
}

/** The card's own settle round-trip (pendingOps.ts:103): hydrate ∘
 *  serialize over the base — the projection the lane shows after a
 *  write settles. */
function settle(doc: LayerA, base: Record<string, unknown>): LayerA {
  return hydrateLayerA(serializeLayerA(doc, base)) as LayerA
}

describe("THE RECIPE FACE TRUTH ARM (ERROR d — the face journals the held stamps, never a blank)", () => {
  let served: FormSpecDoc
  beforeAll(async () => {
    // THE STUDIO'S OWN KEY (RunRecipeEngine.tsx:71 — useResolvedForm
    // "h3-timeline"): the bare "h3" model doc is a different surface
    // (no loras lane) and its compose gate refuses the recipe bag —
    // the wall's earlier unfaithful key, not the product.
    served = await realServedSpec("h3-timeline")
  }, 90_000)
  afterAll(async () => { await restoreLaneOverlay() })

  it("THE LAW OVER LIVE VALUES: the held Final Cut doc journals Final Cut; the birth doc journals Standard", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const birth = activeRecipeId(served, birthParams() as never)
    const final = activeRecipeId(served, finalParams() as never)
    releaseRailSeat()
    expect(birth, "ERROR d (law, birth): the birth held doc states the standard payload yet the law names no row").toBe("standard")
    expect(final, "ERROR d (law, pick): the held doc states the FULL Final Cut stamp yet the law names no row").toBe("final")
  })

  it("BIRTH: the live seat — the pane's own hydration — journals Standard on the face", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    mountLiveLayer<LayerA>({
      base: birthParams(),
      seed: hydrateLayerA(birthParams()) as LayerA,
      renderRail,
    })
    const face = await recipeFace()
    releaseRailSeat()
    expect(face, "ERROR d (birth face, live seat): the birth held doc states the standard payload yet the face reads blank").toContain("Standard")
  })

  it("PICK: the Final Cut pick writes — the face journals Final Cut, never a blank", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const mounted = mountLiveLayer<LayerA>({
      base: birthParams(),
      seed: hydrateLayerA(birthParams()) as LayerA,
      renderRail,
      settle,
    })
    await pickRecipe(/Final Cut/)
    const face = await recipeFace()
    const layer = mounted.layer() as unknown as Record<string, unknown>
    expect(layer["second_pass_enabled"], "the pick wrote: the second-pass master rides the settled layer").toBe(true)
    expect(layer["sr_switch"], "the pick wrote: the super-res switch rides the settled layer").toBe(true)
    expect(gateFace(), "the pick was admitted — a refusal here is the seat's own voice, not this arm's").toBeNull()
    releaseRailSeat()
    expect(face, `ERROR d (pick face): the Final Cut pick WROTE (second_pass_enabled + sr_switch ride the settled layer) ` +
      `yet the face journals ${JSON.stringify(face)} — the hand's pick is unwitnessed at the seat that took it.`).toContain("Final Cut")
  })
})
