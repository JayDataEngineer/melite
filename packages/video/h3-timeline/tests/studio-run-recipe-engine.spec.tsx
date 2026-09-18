/**
 * RunRecipeEngine — Recipe + Engine folds (BEHAVIORAL).
 *
 * RULE A — THE RECIPE LAW (operator, 2026-09-18): the family's
 * recipes render as PILLS next to the Model route, stamped from the
 * served spec's Recipe rows — the lora bag payloads INCLUDED (the
 * card's hand preset select is DEAD; the family owns presets). The
 * doc FPS stays a document control. The sampling knobs ride the served form-spec
 * via SpecPanel at their WIRE names
 * (sampler_name/sched_name/steps/denoise/shift_*); Seed rides the
 * panel too. Window width/height are real injects (studio
 * NumberControls — blank inherits preset geometry). The py-era
 * fictions (Audio mode, Seam continuity, Attention, FP16/Torch/CFG/
 * context frames, legacy sampler/scheduling_steps spellings) are
 * pinned ABSENT.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base"
import type { LayerA } from "../src/ui/studio/docModel.ts"

function envelope(): unknown {
  const num = (description: string, dflt: number, meta2: Record<string, unknown> = {}) => ({
    type: "number", meta: { description, default: dflt, ...meta2 },
  })
  const sel = (description: string, consts: string[], dflt: string) => ({
    consts, meta: { description, default: dflt, extra: { wtype: "select" } },
  })
  return {
    form: "h3-timeline",
    schema: schemaEnvelope({
      // sliders write their raw string edits (the atom's law:
      // "edited as a raw string, coercion once at patch") — the
      // ranges must cover the asserted values or the range clamps
      // (the atom's default max is 10). step stays OFF 1: a step of
      // 1 re-types the field as a seed row.
      shift_video: num("Video sigma shift", 0, { min: 0, max: 20 }),
      shift_audio: num("Audio sigma shift", 0, { min: 0, max: 10 }),
      sampler_name: sel("Sampler (run)", ["euler", "euler_cfg_pp", "euler_ancestral", "dpmpp_2m", "dpmpp_2m_sde", "heun"], "euler"),
      sched_name: sel("Scheduler (run)", ["default", "karras", "simple_cfg", "vp", "exponential"], "default"),
      steps: num("Sampling steps (run)", 20, { min: 4, max: 40 }),
      denoise: num("Denoise (run)", 0.7, { min: 0, max: 1, step: 0.05 }),
      seed: { type: "number", meta: { description: "Seed", default: -1, step: 1 } },
    }),
    // RULE A: the family's Recipe rows as the spec door serves them
    // (discovery.ts variantRow — resolver+wire defaults merged into
    // the row's `defaults` payload).
    variants: [
      { id: "default", label: "Default", group: "Recipe", defaults: {}, route: "", hint: null, engine: "comfyui", quant: null, vram_peak_gb: null, owner: "" },
      { id: "turbo_lightx2v", label: "Turbo LightX2V", group: "Recipe",
        defaults: { loras: [{ id: "h3_lightx2v_turbo", strength: 0.6, steps: 8 }] },
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
      isRef2va={false}
      {...over}
    />,
  )
  return { keys, els }
}

describe("recipe (clock + route) — the document's identity", () => {
  it("the route select switches the card's model id (FL2VA ↔ Ref2VA)", async () => {
    serve()
    const { keys } = engine({})
    const sel = await screen.findByLabelText("Model route")
    assert.equal((sel as HTMLSelectElement).value, "h3-timeline")
    fireEvent.change(sel, { target: { value: "h3-timeline-ref" } })
    assert.deepEqual(keys, [["model", "h3-timeline-ref"]])
    cleanup()
  })

  it("the Ref2VA route renders its own face", () => {
    serve()
    render(
      <RunRecipeEngine
        stage={{ params: { width: 800, height: 600 } } as never}
        layerA={{ fps: 24 } as unknown as LayerA}
        setLayerAKey={() => {}}
        isRef2va={true}
      />,
    )
    const sel = screen.getByLabelText("Model route") as HTMLSelectElement
    assert.equal(sel.value, "h3-timeline-ref")
    assert.ok(document.body.textContent!.includes("Ref2VA · Identity Refs"))
    cleanup()
  })

  it("RULE A: the family's recipe pills stamp next to the model — the lora bag INCLUDED", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByText("Clock")
    // the pills render (stamp-carrying rows only; the stamp-less
    // `default` renders nothing)
    const turbo = screen.getByTestId("tl-recipe-chrome").querySelector('[data-recipe-pill="turbo_lightx2v"]')
    assert.ok(turbo !== null, "the turbo pill renders")
    assert.ok(screen.getByTestId("tl-recipe-chrome").querySelector('[data-recipe-pill="draft_02mp"]') !== null)
    assert.ok(screen.getByTestId("tl-recipe-chrome").querySelector('[data-recipe-pill="default"]') === null)
    // the click writes the FULL payload — the lora bag rides the
    // stamp (the Rule A amendment of stroke 38's drop)
    fireEvent.click(turbo as HTMLElement)
    assert.deepEqual(keys, [["loras", [{ id: "h3_lightx2v_turbo", strength: 0.6, steps: 8 }]]])
    cleanup()
  })

  it("the geometry pill stamps width/height; FPS stays an editable document control", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByText("Clock")
    assert.ok(document.body.textContent!.includes("800×600 @ 30 doc-fps"))
    fireEvent.click(screen.getByTestId("tl-recipe-chrome").querySelector('[data-recipe-pill="draft_02mp"]') as HTMLElement)
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "24" } })
    assert.deepEqual(keys, [["width", 768], ["height", 448], ["fps", 24]])
    cleanup()
  })

  it("a non-positive FPS never writes (the >0 guard)", async () => {
    serve()
    const { keys } = engine({ fps: 30 })
    await screen.findByText("Clock")
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
    assert.deepEqual(keys, [
      ["shift_video", "16"], ["shift_audio", "4"],
      ["sampler_name", "heun"], ["sched_name", "karras"],
      ["steps", "25"], ["denoise", "0.8"],
    ])
    cleanup()
  })

  it("seed rides the served spec at its wire name", async () => {
    serve()
    const { keys } = engine({ seed: -1 })
    const el = await screen.findByLabelText("Seed")
    fireEvent.change(el, { target: { value: "7" } })
    // the raw-string edit law (coercion once at patch)
    assert.deepEqual(keys, [["seed", "7"]])
    cleanup()
  })
})

describe("engine header (resolved, never placeholders)", () => {
  it("stage params win; otherwise the preset geometry rides", () => {
    serve()
    engine({ steps: 20 })
    assert.ok(screen.getByText("Engine (H3)"))
    assert.ok(document.body.textContent!.includes("window 800×600 · steps 20"))
    cleanup()
  })

  it("no stage params = the family floor (1344×768); stamped width/height win; no steps = auto", () => {
    serve()
    const h1 = render(
      <RunRecipeEngine
        stage={{} as never}
        layerA={{ fps: 24 } as unknown as LayerA}
        setLayerAKey={() => {}}
        isRef2va={false}
      />,
    )
    assert.ok(document.body.textContent!.includes("window 1344×768 · steps auto"))
    h1.unmount()
    serve()
    render(
      <RunRecipeEngine
        stage={{} as never}
        layerA={{ width: 768, height: 448, fps: 24 } as unknown as LayerA}
        setLayerAKey={() => {}}
        isRef2va={false}
      />,
    )
    assert.ok(document.body.textContent!.includes("window 768×448 · steps auto"))
    cleanup()
  })

  it("window width/height are real injects (blank inherits preset geometry)", () => {
    serve()
    const { keys } = engine({})
    fireEvent.change(screen.getByLabelText("Window width (run)"), { target: { value: "1024" } })
    fireEvent.change(screen.getByLabelText("Window height (run)"), { target: { value: "512" } })
    assert.deepEqual(keys, [["width", 1024], ["height", 512]])
    cleanup()
  })
})

describe("the dead recipe fictions stay dead (pinned absent)", () => {
  it("no audio/continuity/attention/fps16/cfg/context knobs", async () => {
    serve()
    engine({})
    await screen.findByText("Engine (H3)")
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
