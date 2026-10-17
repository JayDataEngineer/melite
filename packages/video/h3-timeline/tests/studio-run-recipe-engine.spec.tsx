/**
 * RunRecipeEngine — Recipe + Engine folds (BEHAVIORAL).
 *
 * THE GENERIC SEAM LAW (operator, 2026-09-19: "h3 FORM SEAM = THE
 * GENERIC FORM SEAM"): the parameter surface IS CardForm — the same
 * component the bench drill seats. The recipe pills ride its axes,
 * every knob renders at its WIRE name through the served groups,
 * window width/height are real injects at their declared rows, and
 * the sampling grid seats sampler + scheduler side by side (the
 * kit's columns/width facts). Studio chrome stays chrome: Model
 * route (the sibling-family pin) + doc FPS + the geometry readout.
 * The py-era fictions (Audio mode, Seam continuity, Attention,
 * FP16/Torch/CFG/context frames, legacy spellings) stay pinned
 * ABSENT.
 */
import { beforeAll, describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { DOC_FPS_DEFAULT } from '@melite/models-h3/timelineContract'
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base/client"
import { emitParamsSpec } from "@melite/comfyui-card-kit/params-emit"
import { loadCardDefs } from "@melite/comfyui-cordis"
import "../../../../tests/helpers/boot-models.ts"
import { carrier, BOARDED, VARIANT_ADDRESSES } from "../src/card.ts"
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base/client'
import type { LayerA } from "../src/ui/studio/docModel.ts"

function envelope(): unknown {
  const num = (description: string, dflt: number, meta2: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
    type: "number", meta: { description, default: dflt, ...meta2, extra: { group: "sampling", ...extra } },
  })
  // the kit's sampling facts (columns 2 / width 1) — the same
  // layout truth samplingExtra() serves on the real card
  const bool = (description: string, dflt: boolean, extra: Record<string, unknown> = {}) => ({
    type: "boolean", meta: { description, default: dflt, extra },
  })
  const sel = (description: string, consts: string[], dflt: string, extra: Record<string, unknown> = { wtype: "select" }) => ({
    consts, meta: { description, default: dflt, extra: { wtype: "select", ...extra } },
  })
  return {
    form: "h3-timeline",
    // the axes ride the FEATURES (variant_groups) — the pills seat
    // INSIDE ModelAxes; a fixture without groups renders no pills
    features: { variant_groups: { Variant: { label: "Variant" }, Recipe: { label: "Recipe" } } },
    schema: schemaEnvelope({
      // sliders write their raw string edits (the atom's law:
      // "edited as a raw string, coercion once at patch") — the
      // ranges must cover the asserted values or the range clamps
      // (the atom's default max is 10). step stays OFF 1: a step of
      // 1 re-types the field as a seed row.
      shift_video: num("Video sigma shift", 0, { min: 0, max: 20 }),
      shift_audio: num("Audio sigma shift", 0, { min: 0, max: 10 }),
      sampler_name: sel("Sampler (run)", ["euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun"], "euler", { group: "sampling", columns: 2, width: 1, wtype: "select" }),
      sched_name: sel("Scheduler (run)", ["default", "karras", "simple_cfg", "vp", "exponential"], "default", { group: "sampling", columns: 2, width: 1, wtype: "select" }),
      steps: num("Sampling steps (run)", 20, { min: 4, max: 40 }),
      denoise: num("Denoise (run)", 0.7, { min: 0, max: 1, step: 0.05 }),
      seed: { type: "number", meta: { description: "Seed", default: -1, step: 1 } },
      // the tri-state is SCHEMA-BOUND (its node type — the tri atom
      // serves type:'tri', never a declared wtype; WTYPE_SET holds no
      // tri member and the estate's own h3 declaration carries a plain
      // boolean, so the hint spelling was the fixture's own invention)
      sharpen_enabled: { type: "tri", meta: { description: "Sharpen", default: false } },
      width: num("Width", 1344, { min: 448, max: 1344 }),
      height: num("Height", 768, { min: 448, max: 768 }),
      ref_images: { type: "array", meta: { description: "Reference images", extra: { wtype: "image_list", max_stack: 8 } } },
    }),
    // RULE A: the family's Recipe rows as the spec door serves them
    // (discovery.ts variantRow — resolver+wire defaults merged into
    // the row's `defaults` payload).
    variants: [
      { id: "h3", label: "Standard", group: "Variant", defaults: {}, route: "h3-timeline", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      { id: "default", label: "Default", group: "Recipe", defaults: {}, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      { id: "turbo_lightx2v", label: "Turbo LightX2V", group: "Recipe",
        defaults: { loras: [{ id: "h3_lightx2v_turbo" }] },
        route: "", hint: "the married count rides the bag row", engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      { id: "draft_02mp", label: "Draft 02MP", group: "Recipe",
        defaults: { width: 768, height: 448 },
        route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
    ],
  }
}

function serve(): void {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response(JSON.stringify(envelope()), { headers: { "content-type": "application/json" } })))
}

function engine(layerA: Record<string, unknown>, over?: Record<string, unknown>) {
  const keys: [string, unknown][] = []
  // THE COMMIT SEAT (the collapse): picks ride setLayerA (the
  // whole-doc functional setter); the harness applies the updater
  // to the held doc like useShownDoc's updateLayerA (minus the
  // save — the commit's serialization is the void spec's seat).
  let doc: Record<string, unknown> = { fps: 24, ...layerA }
  const els = render(
    <RunRecipeEngine
      // (F2, 2026-11-05) the pane takes the settled base directly —
      // the stage hand-off lives at component.tsx.
      base={{ width: 800, height: 600 } as never}
      layerA={doc as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
      setLayerA={(updater) => {
        doc = typeof updater === "function"
          ? (updater as (p: unknown) => unknown)(doc) as Record<string, unknown>
          : updater as unknown as Record<string, unknown>
      }}
      refArtifacts={[{ name: "own_out.png", url: "/melite-media/runs/r8/img/own_out.png" }]}
      {...over}
    />,
  )
  return { keys, els, doc: () => doc }
}

// ── THE PICKER WIRE (2026-09-21, the From-media break) ──────────────
// The studio mounted CardForm with NO wire — every input rail row's
// From media opened onto the honest-empty list (the bench drill
// always wired this; the studio silently didn't). The wire now rides
// RunRecipeEngine: candidates = the artifact index, loadMedia = the
// one media-library fetch over the BOUND estate namespace.

/** Bind the estate fakes the real fetchMediaLibrary rides (the
 *  form-stacks pattern: dead namespaces throw, media serves rows). */
function bindMedia(items: Array<{ url: string; name: string }>): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error("unused namespace in this wall: " + method) }
  bindEstateRemote({
    bench: { get: dead("bench/get"), "add-stage": dead("bench/add-stage"), "remove-stage": dead("bench/remove-stage") },
    drafts: { get: dead("drafts/get"), patch: dead("drafts/patch") },
    runs: {
      list: dead("runs/list"), start: dead("runs/start"), status: dead("runs/status"),
      stop: dead("runs/stop"), validate: dead("runs/validate"),
    },
    media: { list: async () => ({ ok: true, value: { items } }) },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

describe("THE INPUT RAIL IS DEAD IN THE STUDIO (operator 2026-11-05: \"GET RID OF THIS — TOO COMPLEX FOR LAYER A, LEAVE IT TO LAYER B AND THE TIMELINE\")", () => {
  it("no rail section, no Add-Reference add rows — media rides the timeline's own surfaces (keyframe lane, D-M-E audio lanes, clips, the call editor's bundles)", async () => {
    serve()
    bindMedia([{ url: "/melite-media/runs/r9/gen_00002_.png", name: "gen_00002_.png" }])
    engine({})
    // the rail section never renders — the picker wire for MEDIA
    // inputs lives on the timeline's own faces (the keyframe panel's
    // SourceRow, the call editor's RefsBucket), walled in their own
    // suites; this suite walls the ABSENCE.
    assert.equal(screen.queryByTestId("input-rail"), null, "no rail section")
    assert.equal(screen.queryByRole("button", { name: /Add Reference/ }), null, "no rail add rows")
    assert.equal(document.querySelector('[data-input-rail]'), null, "the rail gate holds")
    cleanup()
    unbindEstateRemote()
  })

  it("the generic seam still serves knobs and axes (omitInputRail kills ONLY the rail — the Sampling tab, the pills, the axes ride on)", async () => {
    serve()
    bindMedia([])
    engine({})
    const tab = await screen.findByRole("tab", { name: "Sampling" })
    assert.ok(tab instanceof HTMLElement, "the multi-group tabs render")
    cleanup()
    unbindEstateRemote()
  })
})

// THE SUBMENU LAW (stroke 89): a multi-group form renders tabs —
// the sampling fields seat on THEIR tab (the generic seam's own
// chrome, the same face every multi-group card serves)
const openSampling = async (): Promise<void> => {
  const tab = await screen.findByRole("tab", { name: "Sampling" })
  fireEvent.click(tab)
}

// the fps INPUT face (ControlRow's span + SpecAtom's label both
// carry the word — the input is the value face)
const fpsInput = (): HTMLInputElement => {
  // the studio-owned clock's NUMBER BOX (2026-11-05): SpecAtom
  // serves a number field as slider (aria "FPS slider") + box (aria
  // "FPS") — the box is the typeable face these arms drive
  const hits = screen.getAllByLabelText("FPS").filter((el): el is HTMLInputElement => el instanceof HTMLInputElement && el.type === "number")
  assert.ok(hits.length === 1, `exactly one FPS number box (found ${String(hits.length)})`)
  return hits[0]
}

describe("recipe (clock + route) — the document's identity", () => {
  it("THE ROUTE ROW IS DEAD + FPS RIDES THE GENERAL SURFACE (operator 2026-11-05: the chrome head died; fps is a sibling of the generic knobs, its value the RESOLVED clock)", async () => {
    serve()
    engine({})
    // the chrome group is gone — no head, no ghost route
    assert.equal(screen.queryByTestId("tl-recipe-chrome"), null)
    assert.equal(screen.queryByLabelText("Model route"), null)
    assert.ok(!document.body.textContent!.includes("Ref2VA · Identity Refs"))
    // the fps row still serves (moved, never erased) — the resolved
    // default shows, not the raw user layer's hole
    // ControlRow's span AND SpecAtom's own label seat both carry
    // the word — query ALL labeled nodes, the INPUT is the value face
    const inputs = (await screen.findAllByLabelText(/fps/i))
      .filter((el): el is HTMLInputElement => el instanceof HTMLInputElement)
    assert.ok(inputs.length >= 1, "the fps input renders")
    assert.ok(Number(inputs[0].value) > 0, "fps renders its resolved default")
    cleanup()
  })

  it("RULE A: the family's recipe pills stamp next to the model — the lora bag INCLUDED", async () => {
    serve()
    const { keys, doc } = engine({ fps: 30 })
    // the pills ride CardForm's own axes (the generic seam seats
    // them — the hand-seated copy is dead)
    const recipeSelect = async (): Promise<HTMLElement> => {
      const el = await screen.findByLabelText("Recipe")
      return el as HTMLElement
    }
    // THE MENU PICK (S7e): open the recipe trigger, click the row
    const pickRecipeRow = async (rowName: string | RegExp): Promise<void> => {
      fireEvent.click(await recipeSelect())
      fireEvent.click(screen.getByRole("menuitem", { name: rowName }))
    }
    const turbo = await recipeSelect()
    assert.ok(turbo !== null, "the turbo pill renders")
    fireEvent.click(turbo)
    const optionIds = screen.getAllByRole("menuitem").map((o) => (o.textContent ?? "").trim())
    assert.ok(optionIds.some((face) => face.startsWith("Draft 02MP")))
    assert.ok(!optionIds.includes("default")) // stamp-less row: a dead option renders never
    // the pick writes the FULL payload in ONE atomic write — the
    // lora bag rides the stamp (the Rule A amendment of stroke 38's
    // drop); the per-key verb stays SILENT (the 2026-09-29 law)
    fireEvent.click(screen.getByRole("menuitem", { name: /Turbo LightX2V/ }))
    assert.deepEqual(keys, [], "the per-key verb never carries a pick")
    assert.deepEqual(doc().loras, [{ id: "h3_lightx2v_turbo" }])
    cleanup()
  })

  it("the geometry pill stamps width/height; FPS stays an editable document control", async () => {
    serve()
    const { keys, doc } = engine({ fps: 30 })
    await screen.findByLabelText("Recipe")
    // THE READOUT IS DEAD (operator 2026-09-21: "WHY DO I STILL SEE
    // THIS READOUT SKIN?"): geometry owns ONE surface — the Width /
    // Height injects. No derived text row ever renders.
    assert.ok(!document.body.textContent!.includes("doc-fps"))
    assert.equal(document.querySelector('[data-testid="tl-recipe-geom"]'), null)
    fireEvent.click(await screen.findByLabelText("Recipe"))
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    fireEvent.change(fpsInput(), { target: { value: "24" } })
    // the recipe stamp landed atomically (width+height together);
    // FPS is a document control and keeps the per-key verb
    assert.equal(doc().width, 768)
    assert.equal(doc().height, 448)
    assert.deepEqual(keys, [["fps", 24]])
    cleanup()
  })

  it("a non-positive FPS never writes (the >0 guard)", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByLabelText("Recipe")
    fireEvent.change(fpsInput(), { target: { value: "0" } })
    fireEvent.change(fpsInput(), { target: { value: "" } })
    assert.deepEqual(keys, [])
    cleanup()
  })
})

describe("engine (served spec — wire names)", () => {
  it("shifts + sampler + scheduler + steps + denoise write at the wire spelling", async () => {
    serve()
    // sliders need a finite base value to render (the refused face
    // drops the input) — seed them; the preset is draft_02mp so the
    // tail reads the injected default, not a write.
    const { keys } = engine({ shift_video: 0, shift_audio: 0, steps: 20, denoise: 1 })
    await openSampling()
    await screen.findByText("Video sigma shift")
    // the spec rows are served sliders (input type=range), scoped to
    // their labelled row — the estate's row chrome owns the label.
    // (CSS-module hashes the row class, so scope by the label's
    // parent element, never a literal class query.)
    const sliderOf = (label: string): HTMLElement =>
      within(screen.getByText(label).parentElement!).getByRole("slider") as HTMLElement
    fireEvent.change(sliderOf("Video sigma shift"), { target: { value: "16" } })
    fireEvent.change(sliderOf("Audio sigma shift"), { target: { value: "4" } })
    // S7h: enum seats ride the DSH Menu — picks by titled face
    const pickMenu = (label: string, face: string): void => {
      fireEvent.click(screen.getByLabelText(label))
      fireEvent.click(screen.getByRole("menuitem", { name: face }))
    }
    pickMenu("Sampler (run)", "Heun")
    pickMenu("Scheduler (run)", "Karras")
    fireEvent.change(sliderOf("Sampling steps (run)"), { target: { value: "25" } })
    fireEvent.change(sliderOf("Denoise (run)"), { target: { value: "0.8" } })
    // THE STUDIO SEAM (2026-09-18): edits coerce at the SCHEMA
    // boundary now (useResolvedForm's edit verb — numeric strings
    // ride as numbers; the raw-string pass is dead)
    assert.deepEqual(keys, [
      ["shift_video", 16], ["shift_audio", 4],
      ["sampler_name", "heun"], ["sched_name", "karras"],
      ["steps", 25], ["denoise", 0.8],
    ])
    cleanup()
  })

  it("THE PAIRING (anti-DRY, operator 2026-09-19): sampler + scheduler share ONE grid row — the kit's columns law", async () => {
    serve()
    engine({})
    await openSampling()
    const sampler = await screen.findByLabelText("Sampler (run)")
    const sched = await screen.findByLabelText("Scheduler (run)")
    const samplerCell = sampler.closest("[style*='grid-column']") ?? sampler.parentElement
    const schedCell = sched.closest("[style*='grid-column']") ?? sched.parentElement
    // same grid container, one span each — side by side, the exact
    // shape every normal card serves (image-gen et al.)
    assert.ok(samplerCell !== null && schedCell !== null, "both cells seat in grid cells")
    assert.equal(samplerCell.parentElement, schedCell.parentElement, "the sampling group is ONE grid")
    assert.equal((samplerCell as HTMLElement).style.gridColumn, "span 1")
    assert.equal((schedCell as HTMLElement).style.gridColumn, "span 1")
    cleanup()
  })

  it("seed rides the served spec at its wire name", async () => {
    serve()
    const { keys } = engine({ seed: -1 })
    // seed stays GENERAL (the real card's own grouping) — open its tab
    fireEvent.click(await screen.findByRole("tab", { name: "General" }))
    const el = await screen.findByLabelText("Seed")
    fireEvent.change(el, { target: { value: "7" } })
    // the schema-boundary edit law (the studio seam coerces; the
    // run's schema parse stays the loud backstop for garbage)
    assert.deepEqual(keys, [["seed", 7]])
    cleanup()
  })
})

describe("geometry (resolved readout + the declared inject rows)", () => {
  it("the tri-state INHERIT op fires the rail's unset (undefined — the default returns)", async () => {
    serve()
    const { keys } = engine({ sharpen_enabled: true })
    fireEvent.click(await screen.findByRole("tab", { name: "General" }))
    const el = await screen.findByLabelText("Sharpen")
    // 'inherit' = the tri-state's unset signal — CardForm's edit
    // routes undefined to onUnset, the rail writes undefined.
    // S7h: the tri seat rides the DSH Menu (verbatim tri faces)
    fireEvent.click(el)
    fireEvent.click(screen.getByRole("menuitem", { name: "inherit" }))
    assert.deepEqual(keys, [["sharpen_enabled", undefined]])
    cleanup()
  })

  it("THE GEOMETRY READOUT IS DEAD — no derived text row, on any layering", async () => {
    serve()
    engine({ steps: 20 })
    await screen.findByLabelText("Recipe")
    assert.equal(document.querySelector('[data-testid="tl-recipe-geom"]'), null)
    assert.ok(!document.body.textContent!.includes("doc-fps"))
    cleanup()
    serve()
    render(
      <RunRecipeEngine
        base={{}}
        layerA={{ fps: 24 } as unknown as LayerA}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    await screen.findByLabelText("Recipe")
    assert.ok(!document.body.textContent!.includes("doc-fps"))
    assert.ok(!document.body.textContent!.includes("1344×768"))
    cleanup()
  })

  it("window width/height are real injects at their DECLARED rows (the generic seam renders them)", async () => {
    serve()
    const { keys } = engine({})
    fireEvent.change(await screen.findByLabelText("Width"), { target: { value: "1024" } })
    fireEvent.change(await screen.findByLabelText("Height"), { target: { value: "512" } })
    // the schema-boundary edit law: numeric strings ride as numbers
    assert.deepEqual(keys, [["width", 1024], ["height", 512]])
    cleanup()
  })
})

describe("the dead recipe fictions stay dead (pinned absent)", () => {
  it("no audio/continuity/attention/fps16/cfg/context knobs", async () => {
    serve()
    engine({})
    await openSampling()
    await screen.findByLabelText("Sampler (run)")
    for (const dead of [
      "Audio mode", "Seam continuity", "Attention (run)",
      "FP16 accumulation (run)", "Torch compile (run)", "CFG (run)",
      "Motion context frames (run)", "Audio context steps (run)",
    ]) {
      assert.equal(screen.queryByLabelText(dead), null, dead)
    }
    cleanup()
  })
})

describe("THE ATOMIC PICK LAW at the studio rail (2026-09-29)", () => {
  it("a Recipe pick lands the row's defaults in ONE whole-doc write — the per-key verb never fires", async () => {
    serve()
    // Draft 02MP carries width 768 + height 448 — the pick must land
    // the whole stamp as ONE setLayerA updater; the per-key
    // setLayerAKey seat must stay SILENT for the pick (a pick is a
    // contract, not a key sequence — the half-switch law). No
    // recipe key persists by design: the selection DERIVES from the
    // stamp (activeRecipeId) — the select itself is the receipt.
    const { keys, doc } = engine({ width: 1024, height: 640 })
    const pick = await screen.findByLabelText("Recipe")
    // THE MENU PICK (S7e)
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    assert.deepEqual(keys, [], "the per-key verb never carries a pick")
    assert.equal(doc().width, 768)
    assert.equal(doc().height, 448)
    // no re-render in this harness (the mock Dispatch applies the
    // updater to the held doc); the STAMP is the truth, and the
    // selection derives from it on the studio's real render cycle
    assert.equal("recipe" in doc() ? doc().recipe : undefined, undefined, "no recipe key persists — the stamp is the truth")
    cleanup()
  })
})

describe("THE COMPOSE GATE at the studio rail (law C — the schema is never thrown away)", () => {
  /** A DECL that contradicts ITSELF, both halves judged: a Recipe
   *  row's steps-60 stamp under a [4, 40] variant envelope (the
   *  cross-row reconcile), and a Variant row whose OWN default lies
   *  outside its OWN envelope (the lying DECL the gate refuses —
   *  the schema rides every arm, or it is gutter trash, operator
   *  2026-09-29; the reconcile half re-pinned 2026-11-06). */
  function selfContradicting(): unknown {
    return {
      form: "h3-timeline",
      features: { variant_groups: { Variant: { label: "Variant" }, Recipe: { label: "Recipe" } } },
      schema: schemaEnvelope({
        steps: { type: "number", meta: { description: "Sampling steps (run)", default: 20, min: 4, max: 40 } },
      }),
      variants: [
        { id: "h3", label: "Standard", group: "Variant", defaults: {}, route: "h3-timeline", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "",
          sampler_envelope: { steps: [4, 40], cfg: [1, 10] } },
        { id: "overdraft", label: "Overdraft", group: "Recipe", defaults: { steps: 60 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        // THE LYING VARIANT (the refusal law's surviving half): a
        // Variant row whose own declared default falls outside its
        // OWN envelope is a lying DECL — trusted verbatim, the
        // compose gate's to refuse live.
        { id: "liar", label: "Liar", group: "Variant", defaults: { steps: 60 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "",
          sampler_envelope: { steps: [4, 40], cfg: [1, 10] } },
      ],
    }
  }
  function serveGate(): void {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify(selfContradicting()), { headers: { "content-type": "application/json" } })))
  }

  it("a recipe stamp outside the variant envelope RECONCILES; a LYING variant row still refuses (the pick-reconcile law, 2026-11-05)", async () => {
    serveGate()
    // the envelope clause judges the STATED variant (the door's own
    // skip law: no variant stated → the door resolves): the user
    // layer holds variant h3, so the candidate doc states it and the
    // envelope [4, 40] is the law the recipe stamp must survive
    const { doc } = engine({ fps: 24, steps: 20, variant: "h3" })
    const pick = await screen.findByLabelText("Recipe")
    // THE MENU PICK (S7e)
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Overdraft/ }))
    // (re-pin 2026-11-06, the pick-reconcile law) the operator's
    // 2026-11-05 order SUPERSEDED the blanket refusal for CROSS-ROW
    // stamps: "when I switch variant, it should switch the values so
    // they make sense" + "THE LATEST SELECTION MUST OVERRIDE" — a
    // RECIPE stamp outside the RESOLVED VARIANT's envelope reconciles
    // (clamps to the nearest bound, overrideEnvelopeKeys) so the pick
    // never bricks the card behind the gate. 60 → 40, one write, no
    // refusal face.
    assert.equal(doc().steps, 40, "the recipe stamp reconciles into the variant envelope (60 clamps to 40)")
    assert.equal(doc().variant, "h3")
    assert.equal(document.body.querySelector('[role="alert"]'), null, "a reconciled pick never raises the gate face")

    // THE SURVIVING REFUSAL (the same law's other half): a VARIANT
    // row whose own declared default lies outside its OWN envelope
    // is a lying DECL — trusted verbatim (reconcilePick's
    // trustStamps), refused at the gate, the doc untouched.
    const vpick = screen.getByLabelText("Variant")
    fireEvent.click(vpick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Liar/ }))
    assert.equal(doc().steps, 40, "a refused variant pick never touches layerA")
    assert.equal(doc().variant, "h3", "the lying row never seats")
    const face = await screen.findByRole("alert")
    assert.match(face.textContent ?? "", /THE COMPOSE GATE REFUSED/)
    assert.match(face.textContent ?? "", /stated steps 60 is OUTSIDE the route envelope for variant "liar"/)
    cleanup()
  })

  it("the positive control: an in-envelope pick lands atomically and no refusal face shows", async () => {
    serve()
    const { doc } = engine({ steps: 20 })
    const pick = await screen.findByLabelText("Recipe")
    // THE MENU PICK (S7e)
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    assert.equal(doc().width, 768)
    assert.equal(doc().height, 448)
    assert.equal(screen.queryByRole("alert"), null, "no refusal face on a legal pick")
    cleanup()
  })

  it("THE FAMILY CLAUSE (B5, hop 3's first judge): a Final-Cut stamp on a keyframe doc refuses at the pick gate in the run door's own voice — before the write and before the run press", async () => {
    serve()
    // THE BURN: Final Cut saved pre-keyframe (its own wire_defaults —
    // second_pass_enabled + sr_switch), the doc gained a pin, the
    // family re-derived t4r under the stamp. Pre-B5 the gate
    // green-lit every pick over this doc and the run press was the
    // first judge; now ANY pick (an ordinary Draft re-pick) composes
    // the stamped verdict and refuses HERE.
    const { doc } = engine(
      { fps: 24, steps: 20 },
      {
        base: {
          keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
          second_pass_enabled: true,
          sr_switch: true,
          width: 800,
          height: 600,
        } as never,
      },
    )
    const pick = await screen.findByLabelText("Recipe")
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    // a refused pick never touches layerA (the atomic pick law): the
    // held layer is exactly what it was — no width/height stamp, no
    // menu residue (the base's 800/600 live in the base, never layerA)
    assert.deepEqual(doc(), { fps: 24, steps: 20 })
    const face = await screen.findByRole("alert")
    assert.match(face.textContent ?? "", /THE COMPOSE GATE REFUSED/)
    assert.match(
      face.textContent ?? "",
      /card 'h3-timeline' refused params: h3_window\(t4r\): unsanctioned inject keys: second_pass_enabled, sr_switch/,
      "the gate speaks the run door's clause verbatim",
    )
    cleanup()
  })
})

// THE PICK JUDGES TRUTH-IN-HAND (the collapse — the operator's
// "recipe switching broken"): there is no mirror, so there are no
// stale untouched keys. The verdict composes the held row with the
// SHOWN layerA whole (resolvePickVerdictDoc): a sparse shown layer
// (keys the rail never stated) yields to held truth; a stated key
// IS truth-in-hand and judges as itself.
describe("the global recipe's face (operator 2026-11-05)", () => {
  it("FPS renders the CLOCK DEFAULT when the doc carries no fps key — the box is never blank", async () => {
    serve()
    // a doc created before the clock default landed carries NO fps —
    // the row still shows the number the run composes (24)
    // fps: undefined overrides the harness seed (the spread keeps
    // the key, value undefined) — the pre-default doc's exact shape
    const { } = engine({ fps: undefined }, { base: { width: 800, height: 600 } as never })
    const boxes = (await screen.findAllByLabelText("FPS")).filter(
      (el) => (el as HTMLInputElement).type === "number",
    )
    assert.equal(boxes.length, 1)
    // THE CLOCK'S ONE OWNER (timeline-plane wave-2 R1): the row's
    // unstated fallback is DOC_FPS_DEFAULT (24) — the film clock the
    // walk fills and the mix divides by. The old pin named
    // DEFAULT_SEGMENT_PARAMS.fps (16 — the VACE segment calibration),
    // certifying the very disease the comment claimed to cure.
    assert.equal((boxes[0] as HTMLInputElement).value, String(DOC_FPS_DEFAULT),
      "unstated fps renders the film clock default, never a blank box and never the segment calibration")
    cleanup()
  })

  it("NO film-level prompt is served (operator: \"I don't want a prompt for the Layer A for the full model\") — the calls own the prompts", async () => {
    serve()
    engine({}, { base: { width: 800, height: 600 } as never })
    // the textarea face never mounts: no label "Prompt" anywhere
    await screen.findByLabelText("Model")
    assert.equal(screen.queryByLabelText("Prompt"), null,
      "the film-level prompt field is gone from the served spec")
    cleanup()
  })
})

describe("the pick judges truth-in-hand — the collapse", () => {
  it("a legal pick admits when held truth is in-envelope and the shown layer never stated the key", async () => {
    serve()
    // the rail stated NO steps (sparse shown layer) — the drill
    // persisted steps=20. The verdict judges held 20, never a
    // phantom 60 (the old mirror's stale whole-channel snapshot).
    const { doc } = engine(
      { variant: "h3" },
      {
        base: { width: 800, height: 600, variant: "h3", steps: 20 } as never,
      },
    )
    fireEvent.click(await screen.findByLabelText("Recipe"))
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    assert.equal(screen.queryByRole("alert"), null,
      "no refusal face — the verdict judged the held steps=20; no stale key exists to refuse over")
    assert.equal(doc().width, 768, "the pick's own stamps land")
    assert.equal(doc().height, 448)
    assert.ok(!("steps" in doc()),
      "the unstated key is never invented nor clobbered — the commit carries held truth")
    cleanup()
  })
})



// ── THE FAMILY GATE (D8, 2026-11-06 — the t4r lane serves no post
// chain) ─────────────────────────────────────────────────────────
// The live brick: the rail rendered the second-pass switches on a
// doc that derived t4r (one guided call), the operator flipped
// them / picked Final Cut, and the compose refused the whole card
// ("unsanctioned inject keys: sr_switch" — the SECOND-PASS SWITCH
// DOES NOT SWITCH shape, and the pick's residue then bricked every
// later compose). The rail derives the family from the SAME seats
// the walk reads (deriveWindowFamily, the contract face) and stops
// RENDERING what the family cannot honor; films (t4_chain) and
// open single windows (t4_open) keep the finishing rail.
describe("RunRecipeEngine: the t4r family gate (omitFields)", () => {
  // the card's REAL served envelope (schemastery's own toJSON — the
  // exact value discovery.ts:911 hands the panel)
  let realEnvelope: unknown
  beforeAll(async () => {
    const def = (await loadCardDefs()).get("h3-timeline")
    assert.ok(def, "the composition root serves the h3-timeline card")
    realEnvelope = ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON()
  })
  function serveT4(): void {
    // THE SERVED-SURFACE LAW (2026-10-16, audit 3f0b7c1a
    // layera-globals #3): this fixture used to hand-serve FOUR keys
    // (width, sr_switch, sr_resolution, sharpen_method) — every one
    // of them in T4_ONLY_KEYS — so the tab-absence arm below passed
    // no matter what the gate did: the fixture had already removed
    // the masters. It now serves the card's REAL envelope (the same
    // schemastery toJSON the estate's discovery serializes), so the
    // group grammar judges what the estate actually serves.
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({
      form: "h3-timeline",
      features: { variant_groups: { Variant: { label: "Variant" }, Recipe: { label: "Recipe" } } },
      schema: realEnvelope,
      variants: [
        { id: "h3", label: "Standard", group: "Variant", defaults: {}, route: "h3-timeline", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      ],
    }), { headers: { "content-type": "application/json" } })))
  }
  const t4rBase = { width: 800, height: 600, calls: [{ start_frame: 0, end_frame: 90, image: "data:image/png;base64,AAA" }] }
  const chainBase = { width: 800, height: 600, calls: [
    { start_frame: 0, end_frame: 90, image: "data:image/png;base64,AAA" },
    { start_frame: 90, end_frame: 180 },
  ] }
  const openBase = { width: 800, height: 600, calls: [{ start_frame: 0, end_frame: 90 }] }

  it("a t4r-derived doc renders NO second-pass row — the rail never offers what the walk refuses", async () => {
    serveT4()
    render(
      <RunRecipeEngine
        base={t4rBase as never}
        layerA={{} as unknown as LayerA}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    // the surface settles on a row that exists in BOTH worlds
    // (Width never filters — the gate speaks only the T4
    // vocabulary); the judges below are then single synchronous
    // queries, never retry loops
    await screen.findByText("Width")
    // on a t4r doc the second_pass group loses EVERY member row, so
    // the group grammar renders no tab for it at all (one surviving
    // group renders tab-less) — the tab face is the strong presence
    // proof: a row-absence query alone would pass with the gate
    // dead behind an unopened panel
    assert.equal(screen.queryByRole("tab", { name: /second/i }), null,
      "the second-pass group has no tab on a t4r doc — every one of its fields was filtered")
    // THE TAB FACE (the strong face: an unopened group's panel rows
    // mount nowhere, so row-absence alone would pass with the gate
    // dead — the GROUP TAB is the presence proof)
    assert.equal(screen.queryByRole("tab", { name: /second/i }), null,
      "the second-pass group has no tab on a t4r doc — every one of its fields was filtered")
    // and with the whole group gone, its rows ride no panel either
    assert.equal(screen.queryByText("Super-Res (SeedVR2)"), null)
    assert.equal(screen.queryByText("Sharpen method"), null)
    // THE DEAD-LETTER MASTERS (audit 3f0b7c1a layera-globals #3):
    // the three masters that OWN the leaves above and the attention
    // backend were NOT in the gate, and each is read only inside the
    // non-t4r branch of the compose — on a t4r doc they rendered
    // (the group kept members, so its tab kept rendering) while the
    // run landed them in no node. The real served envelope is what
    // makes these queries load-bearing: with the hand fixture the
    // masters were absent from the wire already.
    for (const label of ["Second pass", "FSR Sharpening", "FILM Interpolation", "Attention backend"]) {
      assert.equal(screen.queryByText(label), null,
        `${label} renders on no t4r doc — the run cannot honor it`)
    }
  })

  it("THE RECIPE-ROW GATE fires on the row's OWN stamp (the Final Cut burn): a recipe stamping a t4r-dead key is not offered on the t4r lane", async () => {
    // the 2026-11-06 coverage sweep found the row gate's closure
    // never called by any fixture: the t4r tests served no
    // Recipe-group rows, so omitRecipeRow judged nothing — a gate
    // with no firing arm is the tautology seat LAW 3/ENFORCEMENT
    // exists to catch. This arm serves the burn itself (a Final Cut
    // row stamping sr_switch) plus a clean sibling (geometry only):
    // the dead-stamped pill is withheld, the clean one still rides.
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({
      form: "h3-timeline",
      features: { variant_groups: { Variant: { label: "Variant" }, Recipe: { label: "Recipe" } } },
      schema: realEnvelope,
      variants: [
        { id: "h3", label: "Standard", group: "Variant", defaults: {}, route: "h3-timeline", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        { id: "final_cut", label: "Final Cut", group: "Recipe",
          defaults: { sr_switch: true, sr_resolution: 2 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        { id: "draft_02mp", label: "Draft 02MP", group: "Recipe",
          defaults: { width: 768, height: 448 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      ],
    }), { headers: { "content-type": "application/json" } })))
    render(
      <RunRecipeEngine
        base={t4rBase as never}
        layerA={{} as unknown as LayerA}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    await screen.findByText("Width")
    // the pills ride the Recipe select's own menu (the generic seam
    // seats them): open it, then the DEAD-stamped row is gone from
    // the menu while the clean sibling still offers
    fireEvent.click(await screen.findByLabelText("Recipe"))
    assert.equal(screen.queryByRole("menuitem", { name: "Final Cut" }), null,
      "the sr_switch-stamped recipe is not offered on a t4r doc — the walk would refuse the stamp")
    assert.notEqual(screen.queryByRole("menuitem", { name: "Draft 02MP" }), null,
      "a clean geometry-only recipe still rides — the gate refuses the dead vocabulary, not the whole Recipe group")
  })

  it("films and open windows keep the finishing rail (the gate is the t4r lane's, not the knobs')", async () => {
    serveT4()
    // the leaves carry their declared visible_when (the real envelope
    // is now what the panel reads): the master gates the group, and
    // sharpen_method additionally demands its own leaf switch — the
    // operator's own flow; the labels are the schema's ("Sharpen
    // Method", not the retired hand fixture's spelling)
    const rail = { second_pass_enabled: true, sharpen_enabled: true } as unknown as LayerA
    const { unmount } = render(
      <RunRecipeEngine
        base={chainBase as never}
        layerA={rail}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    // the second-pass group rides its own tab (the group grammar) —
    // open it, then the rows must be there
    const tab = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null)
    assert.notEqual(screen.queryByText("Sharpen Method"), null)
    unmount()
    render(
      <RunRecipeEngine
        base={openBase as never}
        layerA={rail}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    const tab2 = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab2)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null)
  })

  // THE FILM-ONLY KNOB (2026-10-16, audit 3f0b7c1a ui-truth-gap #4):
  // duck_depth_db is read ONLY inside the multi-window film boundary
  // (computeFilmMix's manifest) — on a single-window doc it rendered,
  // persisted and composed into NO node. The studio's served surface
  // omits it unless the doc derives t4_chain; this arm judges the row
  // face across ALL THREE families (the chain arm is the positive
  // control: a gate that hid it everywhere would pass a one-sided
  // assertion while breaking the mix desk).
  it("the film-only knob is served on a chain doc and omitted on single-window docs", async () => {
    serveT4()
    const { unmount } = render(
      <RunRecipeEngine
        base={chainBase as never}
        layerA={{} as unknown as LayerA}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
      />,
    )
    assert.notEqual(await screen.findByText("Duck depth (dB)"), null,
      "the film shape serves the mix-desk knob")
    unmount()
    for (const [label, doc] of [["t4r", t4rBase], ["t4_open", openBase]] as const) {
      const r = render(
        <RunRecipeEngine
          base={doc as never}
          layerA={{} as unknown as LayerA}
          setLayerAKey={() => {}}
          setLayerA={() => {}}
          refArtifacts={[]}
        />,
      )
      await screen.findByText("Width")
      assert.equal(screen.queryByText("Duck depth (dB)"), null,
        `${label}: the mix-desk knob composes nothing on a single window`)
      r.unmount()
    }
  })
})
