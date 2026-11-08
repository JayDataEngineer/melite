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
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { DOC_FPS_DEFAULT } from '@melite/models-h3/timelineContract'
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base/client"
import { emitParamsSpec } from "@melite/comfyui-card-kit/params-emit"
import { loadCardDefs } from "@melite/comfyui-cordis"
import "../../../../tests/helpers/boot-models.ts"
import { carrier, BOARDED, VARIANT_ADDRESSES } from "../src/card.ts"
import { bindEstateRemote, unbindEstateRemote } from '@melite/card-base/client'
// the upload leaf's faces (the dictionary owns the words — never a
// hand-spelled copy in the arms; the deep source import follows the
// phantom-key-journey-rider precedent, the barrel does not re-export)
import { chromeCopy } from "../../../../packages/web/card-base/src/locales/chromeCopy.ts"
import type { LayerA } from "../src/ui/studio/docModel.ts"
import { projectDoc } from "../src/ui/studio/pendingOps.ts"

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
      // THE V2V DOC PLANE (queue 11): the harness feeds the doc
      // plane the spine threads in the real studio.
      v2vDoc={{ calls: [], fps: 24 }}
      onV2vCalls={() => {}}
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
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
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

  it("a pick on a BASE-LESS mount still lands — the hand-off-less pane (stage.params absent) composes against an empty held row", async () => {
    serve()
    // component.tsx passes base={stage.params ?? undefined}: a stage
    // with no settled params mounts the pane WITHOUT a base — the
    // pick verdict's held row falls to the empty map and the pick
    // still lands its whole stamp (never a crash on the undefined
    // hand-off, never a refusal that only exists because no base
    // ever arrived)
    const { keys, doc } = engine({}, { base: undefined as never })
    const pick = await screen.findByLabelText("Recipe")
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    assert.deepEqual(keys, [], "the per-key verb never carries a pick")
    assert.equal(doc().width, 768, "the pick lands its whole stamp against the empty held row")
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

  it("the Final Cut stamp on a keyframe doc NEVER bricks the pick (retired lane law, 2026-11-15): the pick lands, the stamps ride AS VALUES, and no gate face speaks", async () => {
    serve()
    // THE MINTED BURN: the Final Cut row saved pre-keyframe (its own
    // wire_defaults — second_pass_enabled + sr_switch), the doc then
    // gained a pin. Under the retired lane law the t4r family
    // refused the stamps at the walk, the card admission and the
    // pick gate; since the cure the t4r arm mounts the post chain,
    // so the doc is lawful and the pick must land with its stamps
    // intact — never a reseat, never a settlement voice.
    // the SHOWN layer is the saved doc: the Final Cut stamps and the
    // pin ride the layer itself (the storage the pick writes over)
    const { doc } = engine({
      fps: 24, steps: 20,
      keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
      second_pass_enabled: true,
      sr_switch: true,
      width: 800,
      height: 600,
    })
    const pick = await screen.findByLabelText("Recipe")
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Draft 02MP/ }))
    const after = doc() as Record<string, unknown>
    // the pick LANDED whole (the atomic pick law) and the finish
    // stamps survive it as VALUES — the known bug's exact shape
    assert.equal(after.width, 768)
    assert.equal(after.height, 448)
    assert.equal(after.second_pass_enabled, true,
      "the Final Cut stamp survives the pick — the finish chain fires on this doc")
    assert.equal(after.sr_switch, true,
      "the Final Cut stamp survives the pick — the finish chain fires on this doc")
    // NO FACE AT ALL: no refusal, no settlement (there is nothing to
    // settle — the stamps are lawful on the lane the pin derives)
    assert.equal(document.body.querySelector('[role="alert"]'), null,
      "the pick over a Final-Cut keyframe doc raises no gate face")
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



// ── THE FAMILY GATE, RETIRED (2026-11-15 — every lane serves the
// finishing rail) ────────────────────────────────────────────────
// The old brick: the rail rendered the second-pass switches on a doc
// that derived t4r (one guided call), the operator flipped them or
// picked Final Cut, and the compose refused the whole card. The 2026-
// 11-15 cure hoisted the image-space post chain ABOVE the family
// branch in renderH3Window: the t4r arm now mounts SeedVR2 / sharpen
// / interpolate exactly as the else arm does, so a t4r doc carrying
// those stamps composes and fires them. The rail therefore stops
// omitting on the reference lane — a t4r-derived doc renders the
// finishing rail, the flip lands, and only the film-only knob
// (duck_depth_db, read solely by the multi-window mix) keeps its
// single-window omission.
describe("RunRecipeEngine: the finishing rail on every family (the retired t4r gate)", () => {
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

  it("a t4r-derived doc renders the second-pass rail and a flip on it lands — the reference lane fires the chain now", async () => {
    serveT4()
    const keys: [string, unknown][] = []
    render(
      <RunRecipeEngine
        base={t4rBase as never}
        layerA={{ second_pass_enabled: true, sharpen_enabled: true } as unknown as LayerA}
        setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
        setLayerA={() => {}}
        refArtifacts={[]}
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    await screen.findByText("Width")
    // THE GROUP TAB IS THE PRESENCE PROOF: the panel only mounts rows
    // behind its own tab, so the tab's existence plus an open row is
    // what a dead gate cannot fake.
    const tab = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null,
      "the t4r rail serves the upscaler row — the run mounts the chain there")
    assert.notEqual(screen.queryByText("Sharpen Method"), null,
      "the t4r rail serves the sharpen row")
    // THE FLIP LANDS: the master row toggles as one key write (never a
    // gate face, never a reseat) — the stamp the operator states is
    // the stamp the doc carries to the door.
    const panel = screen.getByRole("tabpanel")
    const master = within(panel).getByRole("switch", { name: /Second pass/i })
    assert.equal(master.getAttribute("aria-checked"), "true",
      "the master renders ON from the stated doc — the rail reads the stamp, never an internal pole")
    fireEvent.click(master)
    assert.deepEqual(keys.at(-1), ["second_pass_enabled", false],
      "the master flip writes the stated value on a t4r doc")
    assert.equal(document.body.querySelector("[data-compose-gate]"), null,
      "a flip never raises the compose gate on the reference lane")
  })

  it("THE PHANTOM-POLE LAW (the 'UI never matches' burn, 2026-11-14): the HYDRATED layer — what the spine hands this pane — carries no gate face on a clean t4r row, and the rail it renders is the FIRING one", async () => {
    // THE LIVE RECEIPT (probe-timeline-truth.log, the operator's
    // bench s_12): a clean agent film (image/ref-locked — the
    // agent's STANDARD shape, zero post keys stated) drilled with
    // THE COMPOSE GATE REFUSED naming sharpen_enabled,
    // interpolate_enabled, sr_switch, second_pass_enabled — keys
    // the row NEVER stated. The run door composed the same doc
    // clean (the t4r arm now mounts the post chain, so the
    // hydrated poles fire there instead of being refused). THE
    // MECHANISM: this arm rides the REAL spine seat — component's
    // projectDoc(row).layerA, the hydrate's always-emit masters —
    // over the REAL agent row and pins ZERO gate face plus the
    // finishing tab (the poles are lawful, not withheld).
    serveT4()
    // THE AGENT ROW (the s_12 shape): image-locked call + ref_images
    // — derives t4r; no post key stated anywhere
    const row: Record<string, unknown> = {
      model: "h3",
      width: 800, height: 600, seed: 5522,
      calls: [{ start_frame: 0, end_frame: 90, text: "perches on the rooftop ridge", image: "data:image/png;base64,AAA" }],
      ref_images: ["/melite-media/runs/r8/ref.png"],
    }
    for (const k of ["sharpen_enabled", "interpolate_enabled", "sr_switch", "second_pass_enabled"]) {
      assert.equal(row[k], undefined, `the premise: ${k} is never stated on the row`)
    }
    // THE REAL SEAT: the layer the spine hands the pane — the
    // hydrate's projection of the clean row (component.tsx:354)
    const hydrated = projectDoc(row).layerA
    assert.equal(hydrated.second_pass_enabled, false,
      "the hydrate emits the master as a real pole (the view seat)")
    render(
      <RunRecipeEngine
        base={row as never}
        layerA={hydrated}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    await screen.findByText("Width")
    const gate = document.body.querySelector("[data-compose-gate]")
    assert.equal(gate, null,
      "a clean t4r doc carries ZERO gate violations — the hydrate's view poles are never stated truth (got: "
      + (gate?.textContent ?? "") + ")")
    // AND THE POLE FIRES: the finishing tab rides (the t4r arm mounts
    // the chain, so a pole at false is an honest "no post", not a
    // refusal) — toggle the master on and the group opens
    assert.notEqual(await screen.findByRole("tab", { name: /second/i }), null)
  })

  it("THE RECIPE-ROW GATE keeps only its film-only tooth: Final Cut is OFFERED on a t4r doc; a row stamping duck_depth_db is withheld", async () => {
    // The old gate withheld every row whose stamp touched a t4r-dead
    // key — the Final Cut burn. The retirement deletes that half (the
    // t4r arm fires the stamp), but the FILM-ONLY half keeps teeth:
    // duck_depth_db is read solely by the multi-window mix, so a
    // single-window doc whose row stamps it would carry a knob the
    // run never reads. The served spec carries one row of each kind.
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(JSON.stringify({
      form: "h3-timeline",
      features: { variant_groups: { Variant: { label: "Variant" }, Recipe: { label: "Recipe" } } },
      schema: realEnvelope,
      variants: [
        { id: "h3", label: "Standard", group: "Variant", defaults: {}, route: "h3-timeline", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        { id: "final_cut", label: "Final Cut", group: "Recipe",
          defaults: { sr_switch: true, sr_resolution: 1080 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        { id: "film_mix", label: "Film Mix", group: "Recipe",
          defaults: { duck_depth_db: -18 }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
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
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    await screen.findByText("Width")
    fireEvent.click(await screen.findByLabelText("Recipe"))
    // THE OFFERED LEG (the cure): the Final Cut row's sr_switch stamp
    // is lawful on a t4r doc — the pill rides.
    assert.notEqual(screen.queryByRole("menuitem", { name: "Final Cut" }), null,
      "the sr_switch-stamped recipe IS offered on a t4r doc — its stamp fires the chain now")
    // THE WITHHELD LEG (the surviving tooth): the film-only stamp is
    // a single-window dead letter — the pill is gone.
    assert.equal(screen.queryByRole("menuitem", { name: "Film Mix" }), null,
      "the duck_depth_db-stamped recipe is not offered on a single-window doc — the mix never reads it")
    assert.notEqual(screen.queryByRole("menuitem", { name: "Draft 02MP" }), null,
      "a clean geometry-only recipe still rides — the gate judges stamps, not the whole Recipe group")
  })

  it("EVERY family keeps the finishing rail — films, open windows AND t4r (the retired gate)", async () => {
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
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    // the second-pass group rides its own tab (the group grammar) —
    // open it, then the rows must be there
    const tab = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null)
    assert.notEqual(screen.queryByText("Sharpen Method"), null)
    unmount()
    const { unmount: unmount2 } = render(
      <RunRecipeEngine
        base={openBase as never}
        layerA={rail}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    const tab2 = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab2)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null)
    unmount2()
    // THE T4R LEG (the retirement's judge): the reference lane is
    // the lane the burn hit, and it now serves the same rail — the
    // presence proof is the tab plus an opened row, not a comment
    const r3 = render(
      <RunRecipeEngine
        base={t4rBase as never}
        layerA={rail}
        setLayerAKey={() => {}}
        setLayerA={() => {}}
        refArtifacts={[]}
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
      />,
    )
    const tab3 = await screen.findByRole("tab", { name: /second/i })
    fireEvent.click(tab3)
    assert.notEqual(await screen.findByText("Super-Res (SeedVR2)"), null,
      "t4r serves the upscaler row — the lane fires the chain")
    r3.unmount()
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
        v2vDoc={{ calls: [], fps: 24 }}
        onV2vCalls={() => {}}
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
          v2vDoc={{ calls: [], fps: 24 }}
          onV2vCalls={() => {}}
        />,
      )
      await screen.findByText("Width")
      assert.equal(screen.queryByText("Duck depth (dB)"), null,
        `${label}: the mix-desk knob composes nothing on a single window`)
      r.unmount()
    }
  })
})

// THE LORA HAND-UPLOAD (2026-11-15, the operator's feature: "add a
// button to upload a LORA and setting default strength"): the rail
// injects the upload transport + the same-session spec refresh into
// CardForm's wire. The wall rides the REAL gesture — the leaf's
// upload menu, the deferred file pick, Apply — and judges the door's
// own POST (the derived family shelf, the filename, the dialed
// strength) plus the stale-while-revalidate refresh. Mocking the
// wire itself would prove nothing: the transport IS the contract.
describe("THE LORA HAND-UPLOAD rides the rail's wire (the operator's 2026-11-15 feature)", () => {
  /** Serve the base envelope with the family's model key and the
   *  loras kind (the pack's option grammar — specModifiers' spelling).
   *  The upload door's fetch is answered SEPARATELY so the arm reads
   *  the door's real request URL off the stub. */
  function serveLoraUpload(): { loraUrls: string[]; specFetches: () => number } {
    let specFetches = 0
    const loraUrls: string[] = []
    vi.stubGlobal("fetch", (input: unknown) => {
      const url = typeof input === "string" ? input : String((input as { url: string }).url)
      if (url.includes("/v1/uploads/lora")) {
        loraUrls.push(url)
        return Promise.resolve(new Response(
          JSON.stringify({ row: { id: "h3/op-pick.safetensors", default_strength: 0.8 }, row_seated: true }),
          { headers: { "content-type": "application/json" } },
        ))
      }
      specFetches++
      const base = envelope() as Record<string, unknown>
      return Promise.resolve(new Response(JSON.stringify({
        ...base,
        // the family shelf the rail derives (resolveFamilyKey reads
        // the served spec's model)
        model: "h3-timeline",
        features: {
          ...(base.features as Record<string, unknown>),
          modifiers: [{
            kind: "lora", label: "LoRAs", param_key: "loras", cardinality: "list",
            entry: "option", option_key: "id",
            options: [{ value: "h3_silver_dareties", label: "Silver" }],
          }],
        },
      }), { headers: { "content-type": "application/json" } }))
    })
    return { loraUrls, specFetches: () => specFetches }
  }

  it("Apply POSTs through the door with the DERIVED family shelf, and the refresh re-serves in the same session", async () => {
    const { loraUrls, specFetches } = serveLoraUpload()
    const { keys } = engine({})
    await screen.findByLabelText("Recipe")
    // the bag's add face → the LoRAs leaf → the upload menu (the
    // operator's gated menu: pick face, then Add LoRA…, then the pane)
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]')!)
    fireEvent.click(screen.getByRole("menuitem", { name: "LoRAs" }))
    fireEvent.click(screen.getByRole("button", { name: chromeCopy.loraAddButton }))
    // the pane's square owns the hidden input (the deferred pick);
    // dial the default strength, then Apply
    const row = document.querySelector('[data-testid="mod-lora-upload"]')
    assert.ok(row, "the upload pane renders the square")
    const inp = row!.querySelector('input[type="file"]')
    assert.ok(inp instanceof HTMLInputElement, "the hidden file input rides the square")
    Object.defineProperty(inp, "files", { value: [new File(["%MEL"], "op-pick.safetensors")], configurable: true })
    fireEvent.change(inp)
    fireEvent.change(screen.getByLabelText(chromeCopy.loraUploadStrengthLabel), { target: { value: "0.6" } })
    const specsBefore = specFetches()
    fireEvent.click(screen.getByRole("button", { name: chromeCopy.loraApplyButton }))
    // the door's OWN transport rode: the URL names the family the
    // rail DERIVED off the served spec (the host owns the transport
    // AND the family shelf), the operator's filename, the dialed
    // strength
    await waitFor(() => assert.equal(loraUrls.length, 1, "the upload POST rode the door"))
    assert.match(loraUrls[0]!, /families=h3-timeline/, "the family shelf derivation rides the wire")
    assert.match(loraUrls[0]!, /filename=op-pick\.safetensors/)
    assert.match(loraUrls[0]!, /strength=0\.6/)
    // THE SAME-SESSION SERVE: the refresh re-fetched the served spec
    // AFTER the upload (stale-while-revalidate) — the seated row
    // serves without a remount
    await waitFor(() => assert.ok(specFetches() > specsBefore, "the refresh re-fetched the served spec"))
    assert.equal(document.querySelector('[data-leaf-pane="upload"]'), null, "the pick face re-opened")
    // the door SEATS the row; the bag's wire never hears the file —
    // the pick is the operator's next gesture (the per-key verb and
    // the whole-doc commit both stay silent)
    assert.deepEqual(keys, [])
    cleanup()
  })
})

// THE EMPTY-SELECTION PICK at the pick commit (the axisUnset law,
// card-base 2026-10-10): a served row whose stamp carries the ''
// clear — born when a model switch cleared an axis to '' — must land
// the axis UNSTATED, never a stated empty string (the door's own
// voice: "a stated empty selection is not a choice"). The rail's
// whole-doc commit rides the same pure judge the drill's write does.
describe("THE EMPTY-SELECTION PICK unstamps the axis (the axisUnset law at the rail's pick commit)", () => {
  function serveCleared(): void {
    const base = envelope() as Record<string, unknown>
    vi.stubGlobal("fetch", () =>
      Promise.resolve(new Response(JSON.stringify({
        ...base,
        variants: [
          ...(base.variants as unknown[]),
          // the cleared stamp: the '' axis carry the law unstamps
          { id: "cleared", label: "Cleared", group: "Recipe", defaults: { variant: "" }, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
        ],
      }), { headers: { "content-type": "application/json" } })))
  }

  it("a Recipe row carrying the '' clear lands the axis UNSTATED — the key never rides a stated empty", async () => {
    serveCleared()
    const { keys, doc } = engine({ fps: 24, variant: "h3" })
    const pick = await screen.findByLabelText("Recipe")
    // THE MENU PICK (S7e)
    fireEvent.click(pick)
    fireEvent.click(screen.getByRole("menuitem", { name: /Cleared/ }))
    // the pick committed atomically (the per-key verb silent) and the
    // '' clear left the axis UNSTATED — undefined in the doc, never a
    // held empty string (the else arm would read '' here)
    assert.deepEqual(keys, [])
    assert.equal(doc().variant, undefined, "the '' clear unstamps the axis — never a stated empty rides")
    assert.equal(document.body.querySelector('[role="alert"]'), null, "a legal clear never raises the gate face")
    assert.equal(doc().fps, 24, "the rest of the doc survives the pick")
    cleanup()
  })
})
