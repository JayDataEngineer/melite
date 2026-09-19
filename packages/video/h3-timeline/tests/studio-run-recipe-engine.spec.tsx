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
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base"
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
      sharpen_enabled: bool("Sharpen", false, { wtype: "tri" }),
      width: num("Width", 1344, { min: 448, max: 1344 }),
      height: num("Height", 768, { min: 448, max: 768 }),
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
  const els = render(
    <RunRecipeEngine
      stage={{ params: { width: 800, height: 600 } } as never}
      layerA={{ fps: 24, ...layerA } as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
      {...over}
    />,
  )
  return { keys, els }
}

// THE SUBMENU LAW (stroke 89): a multi-group form renders tabs —
// the sampling fields seat on THEIR tab (the generic seam's own
// chrome, the same face every multi-group card serves)
const openSampling = async (): Promise<void> => {
  const tab = await screen.findByRole("tab", { name: "Sampling" })
  fireEvent.click(tab)
}

describe("recipe (clock + route) — the document's identity", () => {
  it("THE ROUTE ROW IS DEAD (operator 2026-09-20: we use ONE model — the fused checkpoint takes anchors AND refs)", async () => {
    serve()
    engine({})
    await screen.findByTestId("tl-recipe-chrome")
    // no fake model switch ever renders — one route, one graph
    assert.equal(screen.queryByLabelText("Model route"), null)
    assert.ok(!document.body.textContent!.includes("Ref2VA · Identity Refs"))
    cleanup()
  })

  it("RULE A: the family's recipe pills stamp next to the model — the lora bag INCLUDED", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    // the pills ride CardForm's own axes (the generic seam seats
    // them — the hand-seated copy is dead)
    const recipeSelect = async (): Promise<HTMLElement> => {
      const el = await screen.findByLabelText("Recipe")
      return el as HTMLElement
    }
    const turbo = await recipeSelect()
    assert.ok(turbo !== null, "the turbo pill renders")
    const optionIds = Array.from(turbo.querySelectorAll("option")).map((o) => o.getAttribute("value"))
    assert.ok(optionIds.includes("draft_02mp"))
    assert.ok(!optionIds.includes("default")) // stamp-less row: a dead option renders never
    // the click writes the FULL payload — the lora bag rides the
    // stamp (the Rule A amendment of stroke 38's drop)
    fireEvent.change(turbo as HTMLElement, { target: { value: "turbo_lightx2v" } })
    assert.deepEqual(keys, [["loras", [{ id: "h3_lightx2v_turbo" }]]])
    cleanup()
  })

  it("the geometry pill stamps width/height; FPS stays an editable document control", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByLabelText("Recipe")
    assert.ok(document.body.textContent!.includes("800×600 @ 30 doc-fps"))
    fireEvent.change(await screen.findByLabelText("Recipe"), { target: { value: "draft_02mp" } })
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "24" } })
    assert.deepEqual(keys, [["width", 768], ["height", 448], ["fps", 24]])
    cleanup()
  })

  it("a non-positive FPS never writes (the >0 guard)", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByLabelText("Recipe")
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "" } })
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
    fireEvent.change(screen.getByLabelText("Sampler (run)"), { target: { value: "heun" } })
    fireEvent.change(screen.getByLabelText("Scheduler (run)"), { target: { value: "karras" } })
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
    // routes undefined to onUnset, the rail writes undefined
    fireEvent.change(el, { target: { value: "" } })
    assert.deepEqual(keys, [["sharpen_enabled", undefined]])
    cleanup()
  })

  it("stage params win in the readout; the family floor otherwise", async () => {
    serve()
    engine({ steps: 20 })
    await screen.findByLabelText("Recipe")
    assert.ok(document.body.textContent!.includes("800×600 @ 24 doc-fps"))
    cleanup()
    serve()
    render(
      <RunRecipeEngine
        stage={{} as never}
        layerA={{ fps: 24 } as unknown as LayerA}
        setLayerAKey={() => {}}
      />,
    )
    await screen.findByLabelText("Recipe")
    assert.ok(document.body.textContent!.includes("1344×768 @ 24 doc-fps"))
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
