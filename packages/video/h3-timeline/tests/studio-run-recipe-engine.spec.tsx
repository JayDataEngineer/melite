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
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base/client"
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
  /** A DECL that contradicts ITSELF: the variant declares a steps
   *  envelope [4, 40] while a Recipe row's stamp carries steps 60.
   *  The gate composes the candidate doc and refuses BEFORE any
   *  layerA write — the schema rides every arm, or it is gutter
   *  trash (operator, 2026-09-29). */
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
      ],
    }
  }
  function serveGate(): void {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify(selfContradicting()), { headers: { "content-type": "application/json" } })))
  }

  it("a recipe stamp outside the variant envelope REFUSES — the doc is untouched, the face speaks the door's voice", async () => {
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
    // the write never happened: the doc holds EXACTLY what it held
    assert.equal(doc().steps, 20, "a refused pick never touches layerA")
    assert.equal(doc().variant, "h3")
    const face = await screen.findByRole("alert")
    assert.match(face.textContent ?? "", /THE COMPOSE GATE REFUSED/)
    assert.match(face.textContent ?? "", /stated steps 60 is OUTSIDE the route envelope for variant "h3"/)
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
})

// THE PICK JUDGES TRUTH-IN-HAND (the collapse — the operator's
// "recipe switching broken"): there is no mirror, so there are no
// stale untouched keys. The verdict composes the held row with the
// SHOWN layerA whole (resolvePickVerdictDoc): a sparse shown layer
// (keys the rail never stated) yields to held truth; a stated key
// IS truth-in-hand and judges as itself.
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

describe("F2 — the spine hand-off (audit nativity-B, 2026-11-05)", () => {
  it("the pane reads the settled BASE prop, never the stage", () => {
    // THE ONE-READ-SEAT LAW: RunRecipeEngine was the only pane that
    // read the doc outside the spine hand-off (stage.params at the
    // form base AND the pick verdict's held). The cure threads `base`
    // from component.tsx — the spine owner — and the pane's source
    // must carry NO stage read at all (the props type dropping `stage`
    // makes any re-introduced mount a typecheck failure too; this arm
    // is the source-plane judge on the read seat itself).
    const src = readFileSync(resolve(import.meta.dirname, "../src/ui/studio/RunRecipeEngine.tsx"), "utf8")
    assert.ok(!src.includes("stage.params"), "a stage read grew back — the base rides the explicit prop from component.tsx")
    assert.ok(src.includes("base:"), "the settled base prop is the pane's only base source")
  })
})
