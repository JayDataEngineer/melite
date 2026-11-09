/**
 * img-mesh-blank-departure.spec.tsx — THE BLANK DEPARTURE ON A
 * BASE-STAMPED DOC (the gate-11 sweep red, 2026-11-09: img-to-mesh
 * landed with its family-default recipe High stamped in the BASE —
 * the D12 seed — and the blank round-trip NEVER WROTE: no wire
 * patch, no refusal voice, the face held 'High' for 15 s (probe k:
 * zero drafts/patch frames sent, zero voices, doc unchanged). The
 * repro seats the exact lane: the REAL served img-to-mesh spec, the
 * landed doc (High's stamps), the blank gesture. THE LAW: a blank
 * pick departs the active row's stamps — the write FIRES (three
 * nulls), the face returns to the placeholder. A blank that never
 * writes over a base-held stamp is the silent-drop class.
 */
import { beforeAll, afterAll, describe, expect, it } from "vitest"
import type { FormSpecDoc, SpecValues } from "@melite/card-base/client"
import { activeRecipeId } from "../src/spec.ts"
import { render } from "@testing-library/react"
import { CardForm } from "../src/form.tsx"
import { DeclarativeStudio, defineStudioDeclaration } from "../src/studio.tsx"
import {
  realServedSpec, serveFormSpec, serveFormSpecByModel, bindDeadEstateRemote, releaseRailSeat,
  restoreLaneOverlay, recipeFace, pickRecipe, mountLiveLayer,
} from "./helpers/card-rail-seat.tsx"

describe("THE img-to-mesh BLANK DEPARTURE (gate-11 sweep red): a base-held recipe stamp departs on the blank pick — the write fires, never a silent no-op", () => {
  let served: FormSpecDoc
  beforeAll(async () => {
    served = await realServedSpec("img-to-mesh")
  }, 90_000)
  afterAll(async () => { await restoreLaneOverlay() })

  it("THE LANDED DOC: High's stamps in the BASE, an empty user layer — the derivation names high (the seed the lane lands with)", () => {
    // the derivation half: activeRecipeId over base⊕user names the
    // row whose stamp the doc carries — the pre-state of the burn
    const landed = { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 }
    expect(activeRecipeId(served, landed as never as SpecValues)).toBe("high")
  })

  it("THE BLANK FIRES: over the landed High doc, the blank pick writes the three null departures and the face returns to the placeholder", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const writes: Array<Record<string, unknown>> = []
    const seat = mountLiveLayer<Record<string, unknown>>({
      base: {},
      seed: { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 },
      renderRail: (s) => (
        <CardForm
          spec={served}
          user={s.layerA as never as SpecValues}
          onSet={(name, v) => s.setLayerA((d: Record<string, unknown>) => ({ ...d, [name]: v }))}
          onPick={(patch) => {
            writes.push(patch)
            s.setLayerA((d: Record<string, unknown>) => {
              const next: Record<string, unknown> = { ...d }
              for (const [k, v] of Object.entries(patch)) {
                if (v === null) delete next[k]
                else next[k] = v
              }
              return next
            })
          }}
          onUnset={(name) => s.setLayerA((d: Record<string, unknown>) => {
            const { [name]: _drop, ...rest } = d
            return rest
          })}
        />
      ),
    })
    // THE PRE-STATE: the face names High (the landed row)
    const preFace = await recipeFace()
    expect(preFace).toContain("High")
    // THE GESTURE: the blank row
    await pickRecipe(/Blank/i)
    // THE WRITE FIRED — the silent no-op is the burn
    expect(writes.length,
      "the blank pick never wrote over the landed High doc (probe k: zero wire frames, zero voices — the silent-drop class)")
      .toBeGreaterThan(0)
    const blank = writes[writes.length - 1]
    // THE DEPARTURE: every High stamp rides the write as a null
    expect(blank["resolution"]).toBeNull()
    expect(blank["remesh_resolution"]).toBeNull()
    expect(blank["decimate_faces"]).toBeNull()
    // THE DOC: the stamps are gone
    const doc = seat.layer()
    expect(doc["resolution"]).toBeUndefined()
    expect(doc["remesh_resolution"]).toBeUndefined()
    expect(doc["decimate_faces"]).toBeUndefined()
    // THE FACE: the placeholder returns (no row names the doc)
    const face = await recipeFace()
    releaseRailSeat()
    expect(face).toMatch(/--\s*recipe\s*--/)
  })

  // THE STUDIO SEAT (the gate-11 burn's own seat, 2026-11-09): the
  // img-to-mesh card renders DeclarativeStudio (the shared studio
  // base), whose ModelAxes onPick once merged onto USER STATE ALONE
  // — no seat, no wire (probe k: zero drafts writes, zero voices,
  // the doc stranded on High while the face moved). THE LAW: the
  // atomic pick rides the write seat's NOW — the whole frame reaches
  // onPatch (the drafts door) in ONE write, the null verdicts DELETE
  // from the user layer, and the face departs.
  it("THE STUDIO PICK WRITES: DeclarativeStudio's blank pick puts the departure nulls on onPatch — state alone is the settings-eater", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const landed = { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 }
    const frames: Array<Record<string, unknown>> = []
    const declaration = defineStudioDeclaration({ model: "img-to-mesh", expose: ["generation"], folds: {}, preview: "mesh" })
    render(
      <DeclarativeStudio
        stageId="s_img"
        cardName="img-to-mesh"
        row={{ params: { ...landed } }}
        runStatus=""
        onPatch={(patch: Record<string, unknown>) => { frames.push(patch); void Promise.resolve(true) }}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        runId={null}
        upstream={[]}
        onSurface={() => {}}
        declaration={declaration}
      />,
    )
    // THE GESTURE: the blank row over the landed High doc
    await pickRecipe(/Blank/i)
    // THE WIRE: the departure frame reached the door verb
    expect(frames.length,
      "the studio's blank pick never reached onPatch — the settings-eater (state-only edits die with the view; probe k's zero-write burn)")
      .toBeGreaterThan(0)
    const frame = frames[frames.length - 1]
    expect(frame["resolution"],
      "the departed High stamp rides the frame as a null (JSON Merge Patch deletes at the door)").toBeNull()
    expect(frame["remesh_resolution"]).toBeNull()
    expect(frame["decimate_faces"]).toBeNull()
    // THE FACE: the placeholder returns over the studio's own seat
    const face = await recipeFace()
    releaseRailSeat()
    expect(face).toMatch(/--\s*recipe\s*--/)
  })

  // THE CROSS-FAMILY HALF (the gate-11 trellis2-native red): the
  // studio's ModelAxes once plumbed NEITHER layer — pickHeld
  // undefined — so a cross-family pick's departure judged an empty
  // held, the departing family's coordinates stayed stated, and the
  // door refused the frame: the doc never took the arrival (the
  // sweep's Second Pass red). THE LAW: the studio's picks judge
  // base under user (composeCandidateDoc — the same shape the door
  // merges), and the switch frame carries the arrival's model
  // coordinate with the departing family's coordinates gone.
  it("THE STUDIO CROSS-FAMILY PICK: switching to trellis2-native writes the model coordinate and departs pixal3d's coordinates", async () => {
    serveFormSpec(served); bindDeadEstateRemote()
    const landed = { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 }
    const frames: Array<Record<string, unknown>> = []
    const declaration = defineStudioDeclaration({ model: "img-to-mesh", expose: ["generation"], folds: {}, preview: "mesh" })
    const { fireEvent, screen, waitFor } = await import("@testing-library/react")
    render(
      <DeclarativeStudio
        stageId="s_x"
        cardName="img-to-mesh"
        row={{ params: { ...landed } }}
        runStatus=""
        onPatch={(patch: Record<string, unknown>) => { frames.push(patch); void Promise.resolve(true) }}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        runId={null}
        upstream={[]}
        onSurface={() => {}}
        declaration={declaration}
      />,
    )
    // THE MODEL SEAT settles over the spec fetch, then the gesture
    const seat = await waitFor(() => {
      const el = document.querySelector('[aria-label="Model"]') as HTMLElement | null
      if (el === null) throw new Error("model seat not rendered yet")
      return el
    }, { timeout: 12000 })
    fireEvent.click(seat)
    const arrival = await waitFor(() => {
      const item = screen.getAllByRole("menuitem").find((r) => /trellis/i.test(r.textContent ?? ""))
      if (item === undefined) throw new Error("trellis row not on the menu yet")
      return item
    }, { timeout: 4000 })
    fireEvent.click(arrival)
    // THE WIRE: the switch frame reached the door verb with the
    // arrival's model coordinate (the burn: the doc could not take
    // the arrival — the Second Pass class)
    await waitFor(() => {
      if (frames.length === 0) throw new Error("no onPatch frame yet")
    }, { timeout: 4000 })
    const frame = frames[frames.length - 1]
    expect(frame["model"],
      "the cross-family pick's frame carries the arrival model coordinate (the door writes the re-point)").toBe("trellis2-native")
    // THE DEPARTING AXES RIDE AS NULLS, never '' (probe (m)'s
    // verbatim burn — the door answered: 'unknown variant "" for
    // model "trellis2-native" — a stated empty selection is not a
    // choice (pick one, or remove the key and let compose default
    // it) (unlanded keys: model, variant, quant)' and refused the
    // WHOLE frame: the doc never took the arrival while the face
    // showed it). '' is a stated empty choice; null deletes the key
    // and the arrival's spec-land seed re-derives it.
    expect(frame["variant"],
      "the departing variant rides as null (a stated empty selection is not a choice — the door refuses the whole frame and the doc never takes the arrival)").toBeNull()
    expect(frame["quant"],
      "the departing quant rides as null (same door law — the empty-string pick is the Second Pass class)").toBeNull()
    // THE DEPARTING VOCABULARY: pixal3d's recipe stamps never ride
    // the frame as stated values — the vocabulary null set reads the
    // spec's sampler_envelope; where the family declares none, the
    // key simply stays off the frame (absent is the null's equal at
    // the door) — never the departed stamp verbatim
    expect(frame["resolution"] === undefined || frame["resolution"] === null,
      "the departing family's stamp rides the switch frame verbatim — the override law's cross-family face").toBe(true)
    releaseRailSeat()
  })

  // THE DEPARTED-HOLD SHADOW (the gate-11 transfer-rig red, the
  // frame's THIRD consumer): the switch's nulls delete from the
  // estate doc, but the studio re-stated them from its own frozen
  // snapshots — the spec-land re-seed ({...params}) and the served
  // base (row.resolved) — so the composed face voiced a refused
  // hold ('1024 — invalid variant for Transfer Rig', the sweep's
  // settle red) over a doc that took the arrival. THE LAW: the
  // pick's null marks consume at EVERY local layer — user, re-seed,
  // base view — until a re-pick clears them or the remount re-serves
  // the truth.
  it("THE DEPARTED-HOLD SHADOW: after the cross-family pick, the Variant face names the ARRIVAL's row — never the departed family's refused hold", async () => {
    // the arrival envelope: trellis2-native serves its OWN variant
    // vocabulary ('slan'), sharing no row with pixal3d's '1024' —
    // the blanket spec server would hide the refused hold
    const arrival: FormSpecDoc = {
      ...served,
      model: "trellis2-native",
      variants: [
        { id: "slan", label: "Slan", group: "Variant", route: "trellis2-native", defaults: { model: "trellis2-native" } },
        ...(served.variants ?? []).filter((v) => v.group !== "Variant" && v.group !== "Quant" && v.group !== "Recipe"),
      ],
    }
    serveFormSpecByModel({ "trellis2-native": arrival }, served); bindDeadEstateRemote()
    const landed = { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 }
    const declaration = defineStudioDeclaration({ model: "img-to-mesh", expose: ["generation"], folds: {}, preview: "mesh" })
    const { fireEvent, screen, waitFor } = await import("@testing-library/react")
    render(
      <DeclarativeStudio
        stageId="s_x"
        cardName="img-to-mesh"
        row={{ params: { ...landed }, resolved: { ...landed } }}
        runStatus=""
        onPatch={() => { void Promise.resolve(true) }}
        onRun={() => {}}
        onStop={() => {}}
        onRemove={() => {}}
        runId={null}
        upstream={[]}
        onSurface={() => {}}
        declaration={declaration}
      />,
    )
    // THE MODEL SEAT settles, then the cross-family gesture
    const seat = await waitFor(() => {
      const el = document.querySelector('[aria-label="Model"]') as HTMLElement | null
      if (el === null) throw new Error("model seat not rendered yet")
      return el
    }, { timeout: 12000 })
    fireEvent.click(seat)
    const arrivalRow = await waitFor(() => {
      const item = screen.getAllByRole("menuitem").find((r) => /trellis/i.test(r.textContent ?? ""))
      if (item === undefined) throw new Error("trellis row not on the menu yet")
      return item
    }, { timeout: 4000 })
    fireEvent.click(arrivalRow)
    // THE FACE (the sweep's own verdict): the Variant seat names a
    // row of the ARRIVAL's envelope — 'Slan' or the placeholder —
    // and the departed '1024' never renders as a refused hold
    await waitFor(() => {
      const v = document.querySelector('[aria-label="Variant"]') as HTMLElement | null
      const face = (v?.textContent ?? "").trim()
      if (face === "") throw new Error("variant face not rendered yet")
      if (/1024|invalid/i.test(face)) throw new Error("the departed family's variant still holds: " + face)
    }, { timeout: 8000 })
    const variantFace = ((document.querySelector('[aria-label="Variant"]') as HTMLElement | null)?.textContent ?? "").trim()
    expect(variantFace.length,
      "the variant face renders a row of the arrival's envelope (the refused hold is the transfer-rig burn)").toBeGreaterThan(0)
    releaseRailSeat()
  })
})
