/**
 * h3-injectkeys-flip-gesture.spec.ts — THE FLIP-GESTURE ARM
 * (retired lane law, 2026-11-15). The original arm (ERROR g, audit
 * ui-engine-fidelity-purge-2026-11-08 §7 P3) forced every family/route
 * FLIP gesture to reseat or refuse the four post booleans carried onto
 * a t4r arrival — because the t4r render arm wired no post chain and
 * the walk refused those keys. The 2026-11-15 cure went to the ROOT:
 * the t4r arm now mounts the post chain (actions.ts), so the gestures
 * LANE the stamps lawfully; no reseat and no refusal is owed.
 *
 * THE INVARIANT (journey law §2 hops [1]→[2]→[4]): the flip gestures'
 * product doc — the model re-point (rePointFrame's merge), the
 * axis/variant pick (axisPickPatch), the params patch a tool write or
 * agent patch carries — keeps the operator's stated stamps and the
 * REAL walk and the REAL run door ADMIT it on the arrival lane. The
 * stamps are never dropped, never refused, and never silently inert:
 * the same doc composes the chain the stamps name.
 *
 * No frozen fixtures: the spec is the REAL served form-spec
 * (formSpecArm over the booted estate), the flips are the REAL
 * card-base merge verbs, the verdict is the REAL walk and the REAL
 * run door.
 */
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts"
import "../../../../tests/helpers/boot-models.ts"
import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { Context } from "@deepseek-ai/cordis"
import type {} from "../../../../packages/harness/estate-queue/src/service.ts"
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts"
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  axisPickPatch,
  composeCandidateDoc,
  composeValidate,
  modelSwitchPatch,
  rowsFor,
  type FormSpecDoc,
  type FormVariantRow,
} from "@melite/card-base/client"
import { schema as h3schemaFn } from "@melite/models-h3/schema"
import { deriveWindowFamily } from "@melite/models-h3/timelineContract"

/** THE BURN'S FOUR (the operator's (g) refusal named them sorted). */
const FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const

/** THE STAMPED t4r HOLDING (the Singularity lane's own shape —
 *  ref2va lineage = keyframe-anchored): a doc whose family derives
 *  t4r, carrying the four post booleans as STATED user-plane
 *  overrides (stamped lawfully on the open lane before the pin, or
 *  arrived as a mount strand — either way the studio's shown plane
 *  states them and the arrival arm now honors them). */
function stampedHolding(): { base: Record<string, unknown>, user: Record<string, unknown> } {
  const base: Record<string, unknown> = {
    seed: 7, width: 768, height: 448, steps: 12,
    keyframes: [{ image: "anchor.png", frame: 0 }],
  }
  const user: Record<string, unknown> = {
    second_pass_enabled: true, sr_switch: true,
    sharpen_enabled: false, interpolate_enabled: false,
  }
  return { base, user }
}

/** THE OPEN-LANE HOLDING (the stamps were legal here — the same
 *  stamps a pin's flip then carries onto the t4r route). */
function stampedOpenHolding(): { base: Record<string, unknown>, user: Record<string, unknown> } {
  const base: Record<string, unknown> = {
    seed: 7, width: 768, height: 448, steps: 12,
    calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
  }
  const user: Record<string, unknown> = {
    second_pass_enabled: true, sr_switch: true,
    sharpen_enabled: false, interpolate_enabled: false,
  }
  return { base, user }
}

/** THE GATE'S FAMILY VOICE (the dead clause's spelling): a violation
 *  that names a field as lane-dead. After the retirement the gate
 *  never speaks it — these arms pin its absence. */
const FAMILY_DEAD_VOICE = /fires nothing on the t4r lane/

describe("THE FLIP-GESTURE ARM (the arrival fires the carried stamps — no reseat, no refusal)", () => {
  let svc: CardRegistryService
  let spec: FormSpecDoc
  beforeAll(async () => {
    const ctx = new Context()
    // the dangling sweep reads the queue seat's manifest (the
    // contract-wall boot precedent — a bare Context makes it vacuous)
    ;(ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "flip-gesture-boot-")),
      stateRoots: [] as string[],
    }
    svc = new CardRegistryService(ctx)
    await svc.prime()
    assertHermeticRode()
    installLaneStoreOverlay()
    const served = await formSpecArm("h3")
    if (served === null) throw new Error("the served h3 form-spec did not answer — the arm rides the REAL spec, not a fixture")
    spec = served
  }, 90_000)
  afterAll(() => { restoreLaneStoreOverlay() })

  /** THE GESTURE LAW, stated once: the product doc keeps every stated
   *  stamp, the gesture's gate speaks no family refusal, and the REAL
   *  walk admits the product on its derived lane. */
  function expectGestureLands(product: Record<string, unknown>): void {
    expect(product, "the stamps survive the gesture").toMatchObject({
      second_pass_enabled: true,
      sr_switch: true,
    })
    const violations = composeValidate(spec, product)
      .filter((v) => FAMILY_DEAD_VOICE.test(v.message))
    expect(violations, "the gate speaks no lane dead-letter").toEqual([])
    const walked = h3schemaFn(product)
    expect(deriveWindowFamily(walked as Record<string, unknown>)).toBe("t4r")
  }

  it("THE MODEL RE-POINT SHAPE (stage-drill.tsx:507-517 verbatim): flipping the model/route to h3-singularity keeps the four booleans and the t4r arrival walks", async () => {
    const { base, user } = stampedHolding()
    expect(deriveWindowFamily({ ...base, ...user })).toBe("t4r")
    // THE GESTURE, the exact composition stage-drill.tsx:507-517 runs
    // (rePointFrame): the rescope derives over the FULL holding, then
    // the caller's frame wins the merge.
    const frame: Record<string, unknown> = {
      ...modelSwitchPatch(spec, "h3-singularity", composeCandidateDoc(base, user, {})),
    }
    const product = composeCandidateDoc(base, user, frame)
    expectGestureLands(product)
    await expect(
      svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3"),
      "the re-pointed product composes at the real door",
    ).resolves.toBeDefined()
  })

  it("THE AXIS PICK SHAPE (the served Singularity variant row, axisPickPatch): the pick lands the stamps on the t4r arrival and the walk admits", () => {
    const { base, user } = stampedHolding()
    const rows: FormVariantRow[] = rowsFor(spec, "Variant")
    const singularity = rows.find((r) => r.id === "singularity")
    expect(singularity, "the REAL served Singularity row answered (the DECL's own matrix)").toBeDefined()
    if (singularity === undefined) return
    const patch = axisPickPatch(spec, singularity, composeCandidateDoc(base, user, {}))
    const product = composeCandidateDoc(base, user, patch)
    expectGestureLands(product)
  })

  it("THE PARAMS-PATCH SHAPE (the patchStageParams frame a tool write / agent patch carries): the pin flips t4_open→t4r and the arrival COMPOSES with the stamps kept", async () => {
    const { base, user } = stampedOpenHolding()
    expect(deriveWindowFamily(composeCandidateDoc(base, user, {}))).toBe("t4_open")
    // THE FLIP: the pin arrives as a params frame (the tool-write
    // spelling — exactly the keys the write carries, nothing else).
    const frame: Record<string, unknown> = { keyframes: [{ image: "anchor.png", frame: 0 }] }
    const product = composeCandidateDoc(base, user, frame)
    expect(deriveWindowFamily(product)).toBe("t4r")
    expectGestureLands(product)
    // THE LIVE RECEIPT: the product the gate shipped composes at the
    // REAL run door — the stored-doc class is dead.
    await expect(
      svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3"),
      "the pinned product composes at the real door",
    ).resolves.toBeDefined()
  })

  it("THE GATE AND THE WALK AGREE: neither speaks a lane dead-letter — the four stamps are lawful on both seats", () => {
    const { base, user } = stampedHolding()
    const frame: Record<string, unknown> = {
      ...modelSwitchPatch(spec, "h3-singularity", composeCandidateDoc(base, user, {})),
    }
    const product = composeCandidateDoc(base, user, frame)
    // THE GATE: composeValidate carries the generic familyLaw clause;
    // with FAMILY_LAW.deadKeys empty it can never name a field dead.
    const gateViolations = composeValidate(spec, product)
    expect(gateViolations.filter((v) => FAMILY_DEAD_VOICE.test(v.message)), "the gate names no dead key").toEqual([])
    // THE WALK: the same product walks with all four stamps intact.
    const walked = h3schemaFn(product)
    for (const k of FOUR) expect(walked, `the walk keeps '${k}'`).toHaveProperty(k)
  })
})
