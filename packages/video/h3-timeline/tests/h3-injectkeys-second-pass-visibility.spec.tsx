/**
 * h3-injectkeys-second-pass-visibility.spec.tsx — THE SECOND-PASS
 * VISIBILITY ARM (ERROR item h, audit §3 SD-7/SD-3). The operator's
 * burn: "the second-pass option DISAPPEARS from the UI randomly (on/
 * off with no reason) — invisible state rot."
 *
 * THE PINNED MECHANISM (this arm's probe census, 2026-11-08): the
 * served second_pass group carries NINETEEN members; sixteen are
 * T4_ONLY_KEYS, but refine_lora, refine_strength and refine_steps are
 * NOT — and all three declare visible_when riding second_pass_enabled.
 * The t4r omit gate (omitDead, RunRecipeEngine.tsx:108-113) filters by
 * T4_ONLY_KEYS alone, so the trio survives the omit and the GROUP
 * survives with them. The tab's presence is therefore decided by the
 * STALE STATED GATE in the shown layer: state second_pass_enabled:true
 * and the "Second Pass" tab resurrects (as an ORPHAN face — its own
 * master row is T4_ONLY and omitted, so the option renders with no
 * off switch); leave it unstated and the group is empty and the tab
 * vanishes. Same lane, opposite verdicts — the "random" disappearance
 * is the stale boolean nobody can see.
 *
 * THE INVARIANT (journey law §2 hop [1], the UI seat): the option's
 * presence is a PURE function of the lane's sanctioned shape — never
 * of a stale stated gate. On a lane whose omit law owns no post chain,
 * EITHER the surface never renders OR it renders with its own master
 * gate row (the row a hand can unset); an orphan face while the stale
 * booleans still ride the layer toward the compose door is the rot
 * (the same strand ERROR g refuses live: "unsanctioned inject keys:
 * interpolate_enabled, second_pass_enabled, sharpen_enabled, sr_switch").
 *
 * THE HOP THE ARM RIDES: [1] the REAL studio rail (RunRecipeEngine —
 * the generic CardForm seam) rendering the REAL served spec
 * (formSpecArm over the booted estate — no fixture envelope), the
 * family derived through the component's own
 * deriveWindowFamily(mergeDocLayers(base, layerA)) seat.
 *
 * THE PRE-REGISTERED REDS (today's tree):
 *   THE FLIP — the family flips to t4r under the stated layer: the tab
 *   renders WITHOUT its master gate row (T4_ONLY-omitted) while no
 *   write drops the stale booleans — hidden-but-stated rot at the
 *   render hop (RunRecipeEngine.tsx:108-113; the survivors are the
 *   served refine_* trio, timelineContract.ts:80).
 *   DETERMINISM — the same t4r lane answers present WITH the stale
 *   stated gate and absent WITHOUT it: presence is a function of
 *   invisible state, the operator's exact burn.
 *   THE PICK SETTLES — the variant pick on a stranded holding LANDS:
 *   the gate reseats the family-dead strand (the estate's one
 *   spelling, reseatFamilyDead) with its named voice; a four-key
 *   gang refusal is never the answer to a one-parameter switch (the
 *   operator: "it should literally just be replacing a model file
 *   and that's it"). The brick it replaces: the pick gate judged the
 *   stranded HOLDINGS pre-write and refused — the reseat math one
 *   door away was unreachable, the doc bricked ("it got stuck").
 *   THE TEETH — a refusal that is NOT the family-dead strand still
 *   refuses: the settlement never launders an illegal pick.
 */
import { beforeAll, describe, expect, it, afterAll, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
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
import { pickFamilyRefusal } from "../src/ui/studio/pickVerdict.ts"

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

  it("THE FLIP (red): the family flips under the stated option — the surface renders only with its own master gate, or never; an orphan face while the stale booleans ride is the rot", async () => {
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
    // THE LAW: on the t4r lane the surface either never renders, or
    // renders WITH its master gate row (a face a hand can unset).
    // Today: the tab resurrects as an ORPHAN — the trio's visible_when
    // rides the stale stated gate while the master row is T4_ONLY-
    // omitted, and no write drops the booleans (writes[]) — they ride
    // to the next commit where the compose door refuses them (ERROR g).
    expect(after.tab === false || after.masterRow,
      `ERROR h (hidden-but-stated, render hop): the t4r flip renders the Second Pass tab WITHOUT its master gate row — ` +
      `the omit gate (RunRecipeEngine.tsx:108-113) filters T4_ONLY_KEYS alone, so the served refine_* trio ` +
      `(refine_lora/refine_strength/refine_steps — group second_pass, NOT in T4_ONLY_KEYS, timelineContract.ts:80) ` +
      `survives the omit and the group tab resurrects on the STALE stated gate, while the stale booleans still ride ` +
      `the layer (writes: ${JSON.stringify(remounted.writes)}). The operator sees an option with no off switch; ` +
      `the compose door refuses it live (the ERROR g strand).`,
    ).toBe(true)
    void staleStillRides
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

  it("THE PICK SETTLES (red): the variant pick on a stranded t4r holding LANDS — the gate reseats the family-dead strand with its named voice; a four-key gang refusal is never the answer to a one-parameter switch", async () => {
    serve(); bind()
    const mounted = mount(flippedBase(), statedLayerA())
    await tabPresent() // the stranded era settled: the tab hidden, the four stated
    const row = await pickSingularity(served)
    const layer = mounted.layer() as unknown as Record<string, unknown>
    const face = gateFace()
    // THE SETTLEMENT'S FOUR FACES:
    const settledDead = FOUR.every((k) => layer[k] === undefined)
    const landed = layer[axisKey("Variant")] === row.id
    const voiceSettles = /settled/i.test(face) && FOUR.every((k) => face.includes(k))
    const voiceNeverRefuses = !/refused/i.test(face)
    cleanup()
    unbindEstateRemote(); vi.unstubAllGlobals()
    // the next run composes — the window clause is silent on the
    // settled truth (the reseat's own judge, the estate's ONE spelling)
    const composed = mergeDocLayers(flippedBase(), mounted.layer())
    expect(pickFamilyRefusal(composed as unknown as Record<string, unknown>), "the settled holding composes clean — the strand is dead, not deferred").toBeNull()
    expect(settledDead && landed, `h¹ (the flip-settlement law, the pick hop): the variant pick on a stranded t4r holding ` +
      `REFUSED with the four-key gang ("unsanctioned inject keys") and the pick never landed — the gate judged the ` +
      `stranded HOLDINGS pre-write, while the settlement math (reseatFamilyDead) sat one door away, unreachable ` +
      `behind its own refusal. The doc bricked: the tab owning the values was hidden, no write could carry the ` +
      `reseat, "Fix the stated value" pointed at a surface that does not render. A one-parameter switch must land: ` +
      `(settled dead keys: ${settledDead}, pick landed: ${landed}, layer: ${JSON.stringify(FOUR.map((k) => [k, layer[k]]))})`).toBe(true)
    expect(voiceSettles && voiceNeverRefuses, `h¹ (the WHY voice): the gate face must NAME the settlement — the cleared ` +
      `keys and the lane that refuses them — never a bare refusal and never silence (face: "${face}")`).toBe(true)
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
