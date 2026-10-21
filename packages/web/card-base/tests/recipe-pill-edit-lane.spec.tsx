/**
 * recipe-pill-edit-lane.spec.tsx — THE EDIT LANE'S RECIPE PILL ARM
 * (SD-8 / G4, ui-engine-fidelity-purge-2026-11-08: "B6
 * anonymous-stamp pill-state unshowable (G4)"; G4's residue named
 * "21 remove-background stamp" — the derivation was UNJUDGED on this
 * lane; the h3 Final Cut lane's face is walled family-side,
 * h3-timeline/tests/h3-recipe-face-truth.spec.tsx).
 *
 * THE LAW THE CELL CARRIES: a recipe pick mints NO key — the
 * compose door refuses a stated `recipe` (the RECIPE-AXIS YIELD,
 * qwen-img-edit-21's own card law) — so the post-pick doc is
 * ANONYMOUS by construction. The pill's state therefore derives
 * from a KEY-INDEPENDENT seat: the stamp the pick WROTE (the doc's
 * own values, deep-equal to the row's pick patch minus the dead
 * axis key — card-base/src/spec.ts activeRecipeId). The judge here
 * rides the real pick path end to end on the lane the audit named:
 * the REAL served spec (formSpecArm over the booted estate), the
 * REAL gesture (menu click → the card-base AxisMenuSelect seam →
 * the atomic pick patch), the REAL trigger journal for the face —
 * the card-rail-seat kit's four primitives, nothing mocked.
 *
 * THE ARMS: LAW (the value half — the derivation names
 * remove-background over the raw held doc and NOTHING over a fresh
 * doc) and PICK (the face half — the pick writes the stamp the
 * derivation reads, mints no recipe key, and the face journals the
 * row, never the placeholder).
 */
import { beforeAll, describe, expect, it, afterAll } from "vitest"
import { activeRecipeId } from "@melite/card-base/spec"
import type { FormSpecDoc, SpecValues } from "@melite/card-base/client"
import { CardForm } from "../src/form.tsx"
import {
  realServedSpec, serveFormSpec, bindDeadEstateRemote, releaseRailSeat,
  restoreLaneOverlay, recipeFace, pickRecipe, mountLiveLayer,
} from "./helpers/card-rail-seat.tsx"

/** THE REMOVE-BACKGROUND STAMP, verbatim off the DECL row
 *  (qwen-img-edit-21's remove-background wire_defaults): the
 *  one-click's canned prompt. */
const REMOVE_BG_PROMPT = "Remove the background, and output a PNG image"

describe("THE EDIT LANE'S RECIPE PILL (SD-8/G4): the anonymous post-pick doc is addressable and the pill resolves its state from the stamp, never a key", () => {
  let served: FormSpecDoc
  beforeAll(async () => {
    served = await realServedSpec("qwen-img-edit-21")
  }, 90_000)
  afterAll(async () => { await restoreLaneOverlay() })

  it("THE LAW OVER LIVE VALUES: the held post-pick doc journals remove-background; a fresh doc journals no row (no emergent pick)", () => {
    // THE RAW HELD DOC, off the lane shape: the pick's stamp is
    // anonymous (no recipe key exists to read) — and the pick
    // WRITES the lane's married sampler values beside the prompt
    // (reconcilePick, operator 2026-11-05): the pill derives from
    // the stamp the pick writes, so the held doc carries all of it.
    const postPick = { prompt: REMOVE_BG_PROMPT, steps: 25, cfg: 1 }
    expect(activeRecipeId(served, postPick as never as SpecValues),
      "G4 (law, post-pick): the held doc states the remove-background stamp yet the derivation names no row — the pill state is unshowable on an addressable doc")
      .toBe("remove-background")
    // THE NON-EMERGENT HALF: a fresh doc (no pick made) journals no
    // row — the derivation never lights a recipe nobody picked.
    expect(activeRecipeId(served, {} as never as SpecValues),
      "G4 (law, fresh): the derivation named a row over an unstamped doc — an emergent pick the user never made")
      .toBeUndefined()
  })

  it("THE PICK: the real gesture writes the stamp the derivation reads — the post-pick doc carries the canned prompt verbatim, mints no recipe key, and the face journals Remove Background, never the placeholder", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const seat = mountLiveLayer<Record<string, unknown>>({
      base: {},
      seed: {},
      renderRail: (s) => (
        <CardForm
          spec={served}
          user={s.layerA as never as SpecValues}
          onSet={(name, v) => s.setLayerA((d: Record<string, unknown>) => ({ ...d, [name]: v }))}
          onPick={(patch) => s.setLayerA((d: Record<string, unknown>) => ({ ...d, ...patch }))}
          onUnset={(name) => s.setLayerA((d: Record<string, unknown>) => {
            const { [name]: _drop, ...rest } = d
            return rest
          })}
        />
      ),
    })
    // THE REAL GESTURE: trigger click → menu row click — the exact
    // event path a hand drives, no programmatic writes.
    await pickRecipe(/Remove Background/i)
    const doc = seat.layer()
    // THE POST-PICK DOC IS ADDRESSABLE: the stamp the pill derives
    // from is ON the doc, verbatim.
    expect(doc["prompt"],
      "G4 (pick, doc): the pick's write never landed the stamp — the post-pick doc is not addressable to its recipe")
      .toBe(REMOVE_BG_PROMPT)
    // THE ANONYMITY LAW: the pick mints NO key — the durable recipe
    // key is dead vocabulary (the compose door refuses it); the doc
    // stays key-anonymous and the derivation does the naming.
    expect(doc["recipe"],
      "G4 (pick, vocabulary): the pick authored the dead `recipe` key — the compose door refuses it and the write must never mint it")
      .toBeUndefined()
    // THE FACE: the trigger's resting journal names the row.
    const face = await recipeFace()
    releaseRailSeat()
    expect(face,
      "G4 (pick, face): the pick WROTE the stamp the derivation reads yet the face journals the placeholder — the pill state is unshowable after a landed pick")
      .toContain("Remove Background")
  })
})
