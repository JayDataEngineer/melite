// @contract models-h3-flip-settlement
/**
 * h3-injectkeys-second-pass-visibility.spec.tsx — THE SECOND-PASS
 * VISIBILITY ARM (ERROR items g/h, retired lane law 2026-11-15). The
 * operator's burns: the second-pass option "DISAPPEARS from the UI
 * randomly (on/off with no reason)" while the compose gate refused the
 * very fields that vanished.
 *
 * THE INVARIANT (journey law §2 hop [1], the UI seat): the option's
 * presence is a PURE function of the doc's derived family and the
 * operator's stated gates — never of invisible state, and a surface
 * that RENDERS a field never refuses its value one door later. Since
 * the 2026-11-15 retirement the t4r arm mounts the post chain
 * (actions.ts), so the Second Pass group renders on EVERY lane, its
 * master gate row renders with it, and the same values compose at the
 * door. These arms ride the REAL studio rail (RunRecipeEngine — the
 * generic CardForm seam) over the REAL served spec (formSpecArm over
 * the booted estate).
 */
import { beforeAll, describe, expect, it, afterAll, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import "../../../../tests/helpers/boot-models.ts"
import { Context } from "@deepseek-ai/cordis"
import type {} from "../../../../packages/harness/estate-queue/src/service.ts"
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts"
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bindEstateRemote, unbindEstateRemote } from "@melite/card-base/client"
import { axisKey, composeValidate, rowsFor } from "@melite/card-base/client"
import type { FormSpecDoc } from "@melite/card-base/client"
import type { LayerA } from "../src/ui/studio/docModel.ts"
import { mergeDocLayers } from "../src/ui/studio/docModel.ts"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { deriveWindowFamily } from "@melite/models-h3/timelineContract"
import { schema as h3schemaFn } from "@melite/models-h3/schema"

/** THE BURN'S FOUR, in the operator's sorted spelling. */
const FOUR = ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const

/** THE HOLDINGS. base = the stage's settled params (the pane's own
 *  prop); layerA = the shown layer. The open holding states the four
 *  booleans (the Final-Cut era); the flip arrives as the keyframes in
 *  the settled base — a family flip NO field write authored. */
function openBase(): Record<string, unknown> {
  return {
    seed: 7, width: 768, height: 448, steps: 12,
    calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
  }
}
function statedLayerA(): LayerA {
  return {
    fps: 24,
    second_pass_enabled: true, sr_switch: true,
    sharpen_enabled: false, interpolate_enabled: false,
  } as unknown as LayerA
}
/** The SAME shape with the four booleans never stated — the honest
 *  arrival the deterministic law compares against. */
function unstatedLayerA(): LayerA {
  return { fps: 24 } as unknown as LayerA
}
function flippedBase(): Record<string, unknown> {
  return { ...openBase(), keyframes: [{ image: "anchor.png", frame: 0 }] }
}

describe("THE SECOND-PASS VISIBILITY ARM (ERROR h — presence is a pure function of the lane; never hidden-but-stated)", () => {
  let served: FormSpecDoc
  beforeAll(async () => {
    const ctx = new Context()
    ;(ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "visibility-boot-")),
      stateRoots: [] as string[],
    }
    await installLaneStoreOverlayBooted(ctx)
    const doc = await formSpecArm("h3")
    if (doc === null) throw new Error("the served h3 form-spec did not answer — the arm renders the REAL spec, not a fixture")
    served = doc
  }, 90_000)
  afterAll(() => { restoreLaneStoreOverlay() })

  /** THE SERVED SPEC, through the real fetch seam (useResolvedForm →
   *  fetchFormSpec → /v1/form-spec): the component consumes the same
   *  doc the door serves, byte for byte. */
  function serve(): void {
    vi.stubGlobal("fetch", (input: unknown) => {
      const url = String(input)
      if (url.includes("/v1/form-spec")) {
        return Promise.resolve(new Response(JSON.stringify(served), { headers: { "content-type": "application/json" } }))
      }
      return Promise.reject(new Error("this wall fetches only the form-spec: " + url))
    })
  }

  function bind(): void {
    const dead = (method: string) => async (): Promise<never> => { throw new Error("unused namespace in this wall: " + method) }
    bindEstateRemote({
      bench: { get: dead("bench/get"), "add-stage": dead("bench/add-stage"), "remove-stage": dead("bench/remove-stage") },
      drafts: { get: dead("drafts/get"), patch: dead("drafts/patch") },
      runs: { list: dead("runs/list"), start: dead("runs/start"), status: dead("runs/status"), stop: dead("runs/stop"), validate: dead("runs/validate") },
      media: { list: async () => ({ ok: true as const, value: { items: [] } }) },
    } as unknown as Parameters<typeof bindEstateRemote>[0])
  }

  /** THE REAL RAIL: RunRecipeEngine over the real served spec. The
   *  harness captures every setLayerAKey write so the arm can judge
   *  whether a hide DROPS the stated value with a write. */
  function mount(base: Record<string, unknown>, layerA: LayerA): { writes: Array<[string, unknown]>, layer: () => LayerA } {
    let doc: LayerA = layerA
    const writes: Array<[string, unknown]> = []
    render(
      <RunRecipeEngine
        base={base}
        layerA={doc}
        setLayerAKey={(k, v) => { writes.push([k as string, v]) }}
        setLayerA={(updater) => {
          doc = typeof updater === "function"
            ? (updater as (p: unknown) => unknown)(doc) as LayerA
            : updater
        }}
        refArtifacts={[]}
      />,
    )
    return { writes, layer: () => doc }
  }

  /** THE OPTION'S FACE, judged in two seats: the group tab (its name
   *  is titleCaseId(group), form.tsx:536 — "Second Pass") and the
   *  MASTER GATE ROW (the field label titleCaseId("second_pass_enabled")
   *  — "Second Pass Enabled"; the tab label never matches /enabled/i).
   *  The spec lands ASYNC (useResolvedForm fetches) — the waiters are
   *  the seam's own settling law, never sleeps. */
  async function tabPresent(): Promise<HTMLElement | null> {
    try {
      return await screen.findByRole("tab", { name: /second pass/i }, { timeout: 4000 })
    } catch {
      return null
    }
  }
  async function optionFace(): Promise<{ tab: boolean, masterRow: boolean }> {
    const tab = await tabPresent()
    if (tab === null) return { tab: false, masterRow: false }
    fireEvent.click(tab)
    const deadline = Date.now() + 4000
    for (;;) {
      // the PANEL's own master row, never the tab's label: the boolean
      // row renders titleCaseId("second_pass_enabled") minus the
      // _enabled face — its text is ALSO "Second Pass" — so the row
      // hunt excludes the tablist's own elements.
      const candidates = screen.queryAllByText(/second pass/i)
        .filter((el) => el.getAttribute("role") !== "tab" && el.closest("[role=tablist]") === null)
      if (candidates.length > 0) return { tab: true, masterRow: true }
      if (Date.now() > deadline) return { tab: true, masterRow: false }
      await new Promise((r) => setTimeout(r, 25))
    }
  }

  it("THE GROUP MEMBER FLIP (the 2026-10-20 verification's :187 residual, cured 2026-11-12): a rendered refine_denoise control flips THROUGH the engine — the row renders, the flip writes, and no render-side filter drops one group member", async () => {
    serve(); bind()
    // the stated layer carries the member's own value beside the gate
    const layer = { ...statedLayerA(), refine_denoise: 0.35 } as unknown as LayerA
    const seat = mount(openBase(), layer)
    const face = await optionFace()
    expect(face.tab && face.masterRow,
      "the group and its gate render (the sanctioned arm's own law — this arm rides the same mount)").toBe(true)
    // THE RENDERED EXISTENCE pin: the group member's row is present
    // by label (titleCaseId('refine_denoise')); a render-side filter
    // dropping one member reds HERE, named
    // the field renders its slider+input pair: the INPUT carries the
    // accessible name, the slider the '…slider' suffix — query the
    // spinbutton seat exactly (never the ambiguous substring)
    const row = await screen.findByRole("spinbutton", { name: /refine denoise/i })
    expect(row, "the refine_denoise control renders inside its group tab").toBeTruthy()
    // THE FLIP through the real engine write seam (setLayerAKey —
    // the generic CardForm seat, never a direct state poke)
    fireEvent.change(row, { target: { value: "0.5" } })
    await waitFor(() => {
      expect(seat.writes.some(([k, v]) => k === "refine_denoise" && v === 0.5),
        "the flip rides the engine's own write seam: " + JSON.stringify(seat.writes)).toBe(true)
    })
    // and the row STILL renders after the flip (never dropped for
    // having been driven)
    expect(screen.getByRole("spinbutton", { name: /refine denoise/i })).toBeTruthy()
    cleanup(); unbindEstateRemote(); vi.unstubAllGlobals()
  });

  it("SANCTIONED (must stay green): on the open lane the stated option renders WITH its master gate — deterministically, across fresh mounts", async () => {
    serve(); bind()
    expect(deriveWindowFamily(mergeDocLayers(openBase(), statedLayerA() as unknown as Record<string, unknown>))).toBe("t4_open")
    mount(openBase(), statedLayerA())
    const first = await optionFace()
    cleanup()
    mount(openBase(), statedLayerA())
    const second = await optionFace()
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    expect(first.tab && first.masterRow && second.tab && second.masterRow,
      "the stated option renders with its off switch on the lane that sanctions it — both fresh mounts, no randomness",
    ).toBe(true)
  })

  it("THE FLIP (green since 2026-11-15): the family flips under the stated option and the surface renders the group WITH its master gate — the stamps keep riding and the door fires them", async () => {
    serve(); bind()
    const mounted = mount(openBase(), statedLayerA())
    const before = await optionFace()
    expect(before.tab && before.masterRow, "the option renders with its gate before the flip (the sanctioned era)").toBe(true)
    cleanup()
    // THE FLIP: the settled base gains the keyframes — the component's
    // own family derivation flips t4r. NO field write rode (the flip
    // arrived at the doc, not through the rail).
    const remounted = mount(flippedBase(), statedLayerA())
    expect(deriveWindowFamily(mergeDocLayers(flippedBase(), statedLayerA() as unknown as Record<string, unknown>)), "the flip seat derives t4r").toBe("t4r")
    const after = await optionFace()
    const staleStillRides = FOUR.every((k) => {
      const v = (remounted.layer() as unknown as Record<string, unknown>)[k]
      return v !== undefined && v !== null
    }) && remounted.writes.every(([k]) => !FOUR.includes(k as (typeof FOUR)[number]))
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    // THE LAW: the t4r lane renders the group WITH its master gate row
    // (a face a hand can unset) and nothing drops the stated filters.
    expect(after.tab && after.masterRow,
      `the t4r flip renders the Second Pass group WITH its master gate row — presence is lane-truth, never a stale ` +
      `boolean (writes: ${JSON.stringify(remounted.writes)})`).toBe(true)
    expect(staleStillRides, "the stated stamps ride the shown layer (the flip writes nothing over them)").toBe(true)
    // and the same doc composes at the real walk (the door fires the
    // fields the surface renders)
    expect(() => h3schemaFn(mergeDocLayers(flippedBase(), statedLayerA() as unknown as Record<string, unknown>))).not.toThrow()
  })

  it("DETERMINISM (the 'randomly' face, red): the same lane answers the same presence regardless of a stale stated gate — presence is a function of the lane, never of invisible state", async () => {
    serve(); bind()
    // axis 1 (mount order — must stay green): same holdings, mount
    // fresh-on-flipped vs mount-then-flip — the same verdict.
    const directOnFlipped = await (async (): Promise<boolean> => {
      mount(flippedBase(), statedLayerA())
      const face = await optionFace()
      cleanup()
      return face.tab
    })()
    const flippedThenMounted = await (async (): Promise<boolean> => {
      mount(openBase(), statedLayerA())
      cleanup()
      mount(flippedBase(), statedLayerA())
      const face = await optionFace()
      cleanup()
      return face.tab
    })()
    expect(directOnFlipped, "mount order never decides presence (direct)").toBe(flippedThenMounted)
    // axis 2 (the state axis — the operator's burn): the SAME t4r
    // lane, the same base, the only delta an INVISIBLE stale boolean
    // in the shown layer. The lane must answer one presence.
    const withStaleGate = await (async (): Promise<boolean> => {
      mount(flippedBase(), statedLayerA())
      const face = await optionFace()
      cleanup()
      return face.tab
    })()
    const withoutStaleGate = await (async (): Promise<boolean> => {
      mount(flippedBase(), unstatedLayerA())
      const face = await optionFace()
      cleanup()
      return face.tab
    })()
    unbindEstateRemote(); vi.unstubAllGlobals()
    expect(withStaleGate, `ERROR h (the 'random' face): the same t4r lane renders the Second Pass tab when a STALE ` +
      `second_pass_enabled:true rides the shown layer and hides it when the boolean is unstated — the option's ` +
      `presence is a function of invisible state, not of the lane (the omit survivors' visible_when, ` +
      `RunRecipeEngine.tsx:108-113 + timelineContract.ts:80). This on/off flip with no visible reason IS the ` +
      `operator's burn.`).toBe(withoutStaleGate)
  })

  /** THE GESTURE (the operator's exact burn): the Variant pick to
   *  Singularity — the real AxisMenuSelect (atoms' SpecMenuSelect:
   *  the aria-labeled trigger button, the portal menu rows). */
  async function pickSingularity(servedDoc: FormSpecDoc): Promise<{ id: string }> {
    const row = rowsFor(servedDoc, "Variant").find((r) => /singularity/i.test(`${r.id} ${r.label ?? ""}`))
    if (row === undefined) throw new Error("the served matrix offers no singularity variant — the arm drives the REAL rows")
    fireEvent.click(screen.getByRole("button", { name: "Variant" }))
    fireEvent.click(await screen.findByText(/singularity/i, {}, { timeout: 4000 }))
    return row
  }
  /** THE GATE FACE's own render seam (RunRecipeEngine's
   *  data-gate-face alert), read off the real DOM. */
  function gateFace(): string {
    return document.querySelector("[data-gate-face]")?.textContent ?? ""
  }

  it("THE PICK LANDS (green since 2026-11-15): the variant pick on a stamped t4r holding lands and the stamps keep riding — the gate never speaks a lane dead-letter", async () => {
    serve(); bind()
    const mounted = mount(flippedBase(), statedLayerA())
    await tabPresent()
    const row = await pickSingularity(served)
    const layer = mounted.layer() as unknown as Record<string, unknown>
    const face = gateFace()
    const landed = layer[axisKey("Variant")] === row.id
    const stampsKept = FOUR.every((k) => layer[k] === statedLayerA()[k as keyof LayerA])
    const voiceNeverRefuses = !/refused/i.test(face)
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    // the next run composes — the whole holding (stamps + pick) is
    // the doc the walk admits.
    const composed = mergeDocLayers(flippedBase(), mounted.layer())
    let refused: string | null = null
    try {
      h3schemaFn(composed)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    expect(refused, `the picked holding composes at the walk — ${String(refused)}`).toBeNull()
    expect(landed && stampsKept, `the variant pick lands and the finish stamps keep riding — the operator's ` +
      `one-parameter switch never becomes a four-key refusal (landed: ${landed}, stamps kept: ${JSON.stringify(FOUR.map((k) => [k, layer[k]]))})`).toBe(true)
    expect(voiceNeverRefuses, `the gate face never speaks a dead-letter refusal (face: "${face}")`).toBe(true)
  })

  it("THE MIRROR SPEAKS TRUE (red): the studio-owned document surface never refuses at the client mirror — the estate sanctions decl.studio.writes, so a mirror that flags calls/keyframes on a film doc is a lying mirror (it blocks every settlement and every pick on any real doc)", async () => {
    // no mount: the REAL served spec (model 'h3', params 59 — sans
    // calls/keyframes, live-probed) against the REAL judge. A film
    // doc IS calls + keyframes + params — the estate's write door
    // sanctions the studio surface (the DECL's studio.writes); the
    // mirror must sanction exactly the same set or it refuses the
    // studio's own truth-in-hand.
    const filmDoc = {
      calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
      keyframes: [{ image: "anchor.png", frame: 0 }],
      fps: 24, seed: 7, width: 768, height: 448, steps: 12,
    }
    const mirrorViolations = composeValidate(served, filmDoc as unknown as Record<string, unknown>)
      .filter((v) => /fires nothing on this lane/.test(v.message))
    expect(mirrorViolations, `h¹ (the mirror-truth law, the judge hop): the client compose mirror refused the STUDIO-OWNED ` +
      `document surface — ${JSON.stringify(mirrorViolations.map((v) => v.field))} — the estate's admission gate sanctions ` +
      `those keys (the DECL's studio.writes), so the mirror speaks a lie. The served form-spec carries decl.params but ` +
      `not decl.studio.writes, and the mirror's declared set never learns the studio surface: every film doc (calls + ` +
      `keyframes — EVERY real timeline doc) refuses at every pick, and the flip-settlement's recheck can never come ` +
      `back clean (the settlement dies behind the lying mirror).`).toEqual([])
  })

  it("THE TEETH (green today, must stay green through the cure): a refusal that is NOT the family-dead strand still refuses — the settlement never launders an illegal pick", async () => {
    serve(); bind()
    // the strand + an UNDECLARED knob: the mirror clause's violation
    // ("fires nothing on this lane") survives the reseat — the reseat
    // drops family-dead keys only. The pick must refuse WHOLE.
    const strandedIllegal = { ...statedLayerA(), frobnicate_depth: 3 } as unknown as LayerA
    const mounted = mount(flippedBase(), strandedIllegal)
    await tabPresent()
    const row = await pickSingularity(served)
    const face = gateFace()
    const layer = mounted.layer() as unknown as Record<string, unknown>
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    expect(face, `h¹ (the teeth): the gate keeps its law — a violation the reseat does not clear still refuses the pick ` +
      `(face: "${face}")`).toMatch(/refused/i)
    expect(layer[axisKey("Variant")], "the illegal pick never landed (the atomic pick law holds through the settlement)").not.toBe(row.id)
  })

  it("THE FILE-TRUTH WORD (2026-10-26 quant cure): the Quant axis never mints a composite word, and a variant switch lands the NEW lane's file truth — Timeline rides int8 (the hybrid), Singularity rides int8_pruned (the pruned file; convrot unstated upstream)", async () => {
    serve(); bind()
    // THE SERVED SHAPE at the studio's own fetch seam: every Quant
    // row's id IS its coordinate. The old mint (first-seen keeps the
    // plain word, every sibling carries `variant__quant`) served a
    // word the DOOR refuses — selectCardVariant matches the stated
    // quant against the cell's raw coordinate, so the composite id
    // exists nowhere in the facts row: the spec was speaking a
    // language its own gate rejects.
    const quants = rowsFor(served, "Quant")
    const minted = quants.filter((r) => (r.quant ?? "") !== "" && r.id !== r.quant)
    expect(minted.map((r) => [r.id, r.owner]), `h¹ (the shared-vocabulary law, the serve hop): the served Quant axis mints a ` +
      `second word per variant (${JSON.stringify(minted.map((r) => [r.id, r.owner]))}) — a word the compose door refuses ` +
      `(the door judges the cell's raw coordinate). Every row's id IS the coordinate at every address: ` +
      `the timeline speaks int8/int8_convrot/int8_convrot_pruned, singularity speaks int8_pruned — the ` +
      `variant axis carries the lineage switch, the quant word carries the file truth (never one collapsed word).`).toEqual([])
    // THE JOURNEY (the operator's own two picks): a Timeline holding
    // with quant int8 stated → the Variant pick to Singularity → the
    // doc's quant coordinate LANDS THE NEW FILE'S TRUTH (int8 →
    // int8_pruned; face INT8 Hybrid → INT8 Pruned — the word follows
    // the file, never one collapsed spelling over two files).
    const timelineHolding = { ...unstatedLayerA(), quant: "int8" } as unknown as LayerA
    const mounted = mount(openBase(), timelineHolding)
    const trigger = await screen.findByRole("button", { name: "Quant" }, { timeout: 4000 })
    expect(trigger.textContent ?? "", "the timeline lane's quant face is the timeline cell's label (the hybrid file carries no convrot mark — the 2026-10-26 quant cure)").toMatch(/hybrid/i)
    await pickSingularity(served)
    const landed = mounted.layer() as unknown as Record<string, unknown>
    cleanup()
    // THE REOPENED STAGE (this harness's setLayerA is a closure, not
    // React state — the pick's truth is the landed layer, and the
    // stage's own law is that a REOPEN restores its selects from it):
    // remount on the landed holding — the face must follow the
    // variant (INT8 Pruned) while the word stays the door's.
    mount(openBase(), landed as unknown as LayerA)
    const reopened = await screen.findByRole("button", { name: "Quant" }, { timeout: 4000 })
    const face = reopened.textContent ?? ""
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    expect(landed[axisKey("Variant")], "the variant pick landed (the journey is the operator's own two picks)").toBe("singularity")
    expect(String(landed["quant"]), `the doc's quant coordinate lands the singularity file's truth (got ${String(landed["quant"])})`).toBe("int8_pruned")
    expect(face, `the singularity lane's quant face is the singularity cell's label (face: "${face}")`).toMatch(/pruned/i)
  })
})

/** The visibility boot: the lane store overlay wants a primed
 *  registry beside it (the contract-wall boot, minus the doors this
 *  arm does not drive). */
async function installLaneStoreOverlayBooted(ctx: Context): Promise<void> {
  const { CardRegistryService } = await import("../../../../packages/harness/estate-queue/src/cardsRegistry.ts")
  ;(ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "visibility-reg-")),
    stateRoots: [] as string[],
  }
  const svc = new CardRegistryService(ctx)
  await svc.prime()
  installLaneStoreOverlay()
}
