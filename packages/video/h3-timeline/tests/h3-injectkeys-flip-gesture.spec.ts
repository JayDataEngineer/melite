/**
 * h3-injectkeys-flip-gesture.spec.ts — THE FLIP-GESTURE ARM (P3's
 * cure spec, ERROR item g). Audit: dev_docs/audits/
 * ui-engine-fidelity-purge-2026-11-08.md §7 P3 (the flip-gesture arm)
 * + §2.3 (the h3 hop trace) + §3 SD-3.
 *
 * THE INVARIANT (journey law §2 hops [1]→[2]→[4]): a family/route
 * FLIP gesture — the model re-point (rePointFrame's merge), the
 * axis/variant pick (axisPickPatch), the params patch a tool write
 * or agent patch carries (patchStageParams' frame) — either RESEATS
 * or NULLS the keys the arrival lane will not sanction, or REFUSES
 * AT THE GESTURE in the arrival lane's own voice. Never a stored doc
 * that refuses at the compose gate LATER: the operator's burn (g) is
 * exactly that stored doc — "switching the model to h3 Singularity
 * live-refuses … unsanctioned inject keys: interpolate_enabled,
 * second_pass_enabled, sharpen_enabled, sr_switch — the write never
 * left the studio" — a week of pre-validation (the pick gate, the
 * bench admitFamily, the omitDead row gate, the B2 flip writer) and
 * the refusal still fired LIVE.
 *
 * THE HOP THE ARM RIDES: [1] UI seat (the flip gestures' own merge
 * and gate) → [2] the product doc the write lands → [4] the REAL
 * clause (CardDefinition.admitFamily / the walk, schema.ts:573-601)
 * the arrival lane runs. No frozen fixtures: the spec is the REAL
 * served form-spec (formSpecArm over the booted estate), the flips
 * are the REAL card-base merge verbs, the verdict is the REAL clause
 * and the REAL run door.
 *
 * THE PRE-REGISTERED RED (today's tree): the rescope nulls (card-base
 * spec.ts:1316-1340 — the departing envelope vocabulary + bagKeysOf)
 * name neither the four booleans nor any T4_ONLY member, and the
 * caller-wins merge (stage-drill.tsx:507-517 — `...modelSwitchPatch
 * (…), …frame`) re-plants whatever the frame and the holding still
 * carry; the gesture's own gate (composeGateRefusal, stage-drill.tsx:
 * 118-130) judges ONLY composeValidate (spec.ts:1644-1720 — variant/
 * quant/envelope, no family clause), so it passes the poisoned frame.
 * The product doc carries the four booleans onto the t4r lane and the
 * refusal happens at the door, one gesture too late.
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

/** THE BURN'S FOUR (H3_BURN_FOUR, liveness wall; the operator's (g)
 *  refusal names them sorted). */
const FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const
const REFUSAL_SPINE = /h3_window\(t4r\): unsanctioned inject keys: interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch/

/** THE STAMPED t4r HOLDING (the Singularity lane's own shape —
 *  ref2va lineage = keyframe-anchored): a doc whose family derives
 *  t4r, carrying the four post booleans as STATED user-plane
 *  overrides (stamped lawfully on the open lane before the pin, or
 *  arrived as the B2 honest edge's mount strand — either way the
 *  studio's shown plane states them while the family refuses them). */
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

/** THE OPEN-LANE HOLDING (family A's legal era: the stamps were
 *  sanctioned here — the same stamps the flip then carries onto the
 *  t4r route). */
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

describe("THE FLIP-GESTURE ARM (ERROR g — the flip reseats or refuses AT THE GESTURE, never a stored doc that refuses later)", () => {
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

  /** THE GESTURE LAW, stated once: the flip's product doc must carry
   *  NO key the arrival lane refuses (the gesture reseated them), OR
   *  the gesture's own gate must have refused (a non-empty violation
   *  list naming the keys). Anything else is the stored-doc class. */
  function gestureLawHolds(
    product: Record<string, unknown>,
    gateViolations: Array<{ message: string }>,
  ): { ok: boolean, standing: string[], why: string } {
    const standing = FOUR.filter((k) => product[k] !== undefined && product[k] !== null)
    const gateCaught = gateViolations.length > 0
    return {
      ok: standing.length === 0 || gateCaught,
      standing,
      why: gateCaught
        ? "the gesture's gate refused"
        : `the product still carries ${standing.join(", ")} on its ${deriveWindowFamily(product)} lane and the gesture's gate passed it`,
    }
  }

  it("THE MODEL RE-POINT SHAPE (stage-drill.tsx:507-517 verbatim): flipping the model/route to h3-singularity reseats the four booleans or refuses at the gesture", async () => {
    const { base, user } = stampedHolding()
    expect(deriveWindowFamily({ ...base, ...user })).toBe("t4r")
    // THE GESTURE, the exact composition stage-drill.tsx:507-517 runs
    // (rePointFrame): the rescope derives over the FULL holding, then
    // the caller's frame wins the merge. The flip frame here is the
    // bare pick (no extra keys) — the rescope is the whole gesture.
    const frame: Record<string, unknown> = {
      ...modelSwitchPatch(spec, "h3-singularity", composeCandidateDoc(base, user, {})),
    }
    // THE GATE, the exact judge composeGateRefusal (stage-drill.tsx:
    // 118-130) wraps: composeValidate over the candidate doc.
    const gateViolations = composeValidate(spec, composeCandidateDoc(base, user, frame))
    // THE PRODUCT, the doc the write lands (the bench merge-patch's
    // null-deletes settle the frame over the holding).
    const product = composeCandidateDoc(base, user, frame)
    const law = gestureLawHolds(product, gateViolations)
    expect(law.ok, `ERROR g (the re-point flip): ${law.why} — the nulls at spec.ts:1316-1340 name only envelope vocabulary and bags, and the caller-wins merge at stage-drill.tsx:511-514 re-plants the holding's stamps; the gate at stage-drill.tsx:118-130 judges composeValidate (spec.ts:1644), which carries no family clause`).toBe(true)
  })

  it("THE AXIS PICK SHAPE (the served Singularity variant row, axisPickPatch): the pick's gate refuses the stamped holding or the pick reseats it", () => {
    const { base, user } = stampedHolding()
    const rows: FormVariantRow[] = rowsFor(spec, "Variant")
    const singularity = rows.find((r) => r.id === "singularity")
    expect(singularity, "the REAL served Singularity row answered (the DECL's own matrix)").toBeDefined()
    if (singularity === undefined) return
    // THE GESTURE: axisPickPatch over the holding (the ModelAxes'
    // onPick → stage-drill onPick shape, stage-drill.tsx:718-750).
    const patch = axisPickPatch(spec, singularity, composeCandidateDoc(base, user, {}))
    const gateViolations = composeValidate(spec, composeCandidateDoc(base, user, patch))
    const product = composeCandidateDoc(base, user, patch)
    const law = gestureLawHolds(product, gateViolations)
    expect(law.ok, `ERROR g (the Singularity pick): ${law.why} — the pick patch (axisPickPatch, spec.ts:1105) stamps variant/quant only; the four booleans ride the holding untouched into a doc the arrival lane refuses`).toBe(true)
  })

  it("THE PARAMS-PATCH SHAPE (the patchStageParams frame a tool write / agent patch carries): the gate refuses the frame whose settled product refuses", async () => {
    const { base, user } = stampedOpenHolding()
    expect(deriveWindowFamily(composeCandidateDoc(base, user, {}))).toBe("t4_open")
    // THE FLIP: the pin arrives as a params frame (the tool-write
    // spelling — exactly the keys the write carries, nothing else).
    const frame: Record<string, unknown> = { keyframes: [{ image: "anchor.png", frame: 0 }] }
    const gateViolations = composeValidate(spec, composeCandidateDoc(base, user, frame))
    const product = composeCandidateDoc(base, user, frame)
    expect(deriveWindowFamily(product)).toBe("t4r")
    // THE GESTURE LAW: the studio's own gate (composeGateRefusal)
    // must refuse BEFORE the frame ships (its voice: "the write never
    // left the studio") — that is the pre-validation the operator
    // paid a week for.
    const law = gestureLawHolds(product, gateViolations)
    expect(law.ok, `ERROR g (the tool-write pin): ${law.why} — composeValidate (spec.ts:1644-1720) judges variant/quant/envelope only; the family clause lives in admitFamily (card.ts:220) and the walk (schema.ts:573), so the gate passes and the write lands a doc the door refuses`).toBe(true)
    // THE LIVE RECEIPT (the honest edge — never silenced): the product
    // the gate shipped refuses at the REAL run door in the operator's
    // own words. A cure that makes THIS arm green by silencing the
    // door is the dishonest cure; the cure lands the reseat/refusal at
    // the gesture above.
    await expect(
      svc.phase1Card({ ...product, card: "h3-timeline", model: "h3" }, "h3"),
      "the flipped product must refuse loud at the real door — silencing this is the dishonest cure",
    ).rejects.toThrow(REFUSAL_SPINE)
  })

  it("THE GATE AND THE WALK AGREE (the red's receipt, recut with the cure): the gate's family clause names exactly the four the walk refuses — one law, two seats", () => {
    const { base, user } = stampedHolding()
    const frame: Record<string, unknown> = {
      ...modelSwitchPatch(spec, "h3-singularity", composeCandidateDoc(base, user, {})),
    }
    const product = composeCandidateDoc(base, user, frame)
    // THE GATE (the cure's clause): the family clause names the four,
    // field-named, in the lane's own voice — the gesture refuses
    // BEFORE the wire (this was the red: the gate passed the poisoned
    // product verbatim).
    const gateViolations = composeValidate(spec, product)
    const named = gateViolations
      .map((v) => /field '([^']+)' fires nothing on the t4r lane/.exec(v.message)?.[1] ?? "")
      .filter((k) => k !== "")
      .sort()
    expect(named, "the gate's family clause names exactly the burn's four").toEqual([...FOUR].sort())
    // THE WALK (the arrival lane's own law): the same four, the
    // operator's spine — the client gate and the estate walk speak
    // ONE law from two seats.
    let refused: string | null = null
    try {
      h3schemaFn(product)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    expect(refused, "the walk refuses the same product with the operator's spine").toMatch(REFUSAL_SPINE)
    expect(refused, "the walk names exactly the burn's four").toMatch(/unsanctioned inject keys: interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch/)
  })
})
