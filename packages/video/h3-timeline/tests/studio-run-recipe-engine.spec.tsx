/**
 * RunRecipeEngine — Recipe + Engine folds (BEHAVIORAL).
 *
 * PINS (the run's clock + sampling base): the route follows the
 * Ref2VA door; the header shows RESOLVED geometry (never lazy
 * placeholders); every knob writes its LayerA key; guards hold
 * (non-positive FPS never writes, a clear never writes).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import type { LayerA } from "../src/ui/studio/docModel.ts"

function engine(layerA: Record<string, unknown>, over?: Record<string, unknown>) {
  const keys: [string, unknown][] = []
  const els = render(
    <RunRecipeEngine
      stage={{ params: { width: 800, height: 600 } } as never}
      layerA={{ preset: "draft_02mp", ...layerA } as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
      isRef2va={false}
      {...over}
    />,
  )
  return { keys, els }
}

describe("recipe (clock + route)", () => {
  it("the route follows the Ref2VA door and writes", () => {
    const f = engine({})
    assert.equal((screen.getByLabelText("Model route") as HTMLSelectElement).value, "h3-timeline")
    fireEvent.change(screen.getByLabelText("Model route"), { target: { value: "h3-timeline-ref" } })
    assert.deepEqual(f.keys, [["model", "h3-timeline-ref"]])
    f.els.unmount()
    engine({}, { isRef2va: true })
    assert.equal((screen.getByLabelText("Model route") as HTMLSelectElement).value, "h3-timeline-ref")
  })

  it("preset + FPS + audio + continuity + seed write (guards hold)", () => {
    const { keys } = engine({ fps: 24, audio_mode: "none", seed: 5 })
    fireEvent.change(screen.getByLabelText("Preset"), { target: { value: "final_hd" } })
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "30" } })
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "0" } })
    fireEvent.change(screen.getByLabelText("FPS"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Audio mode"), { target: { value: "lipSync" } })
    fireEvent.click(screen.getByLabelText("Seam continuity"))
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "7" } })
    fireEvent.change(screen.getByLabelText("Seed"), { target: { value: "" } })
    assert.deepEqual(keys, [
      ["preset", "final_hd"],
      ["fps", 30],
      ["audio_mode", "lipSync"],
      ["continuity", true],
      ["seed", 7],
    ])
  })
})

describe("engine header (resolved, never placeholders)", () => {
  it("stage params win; otherwise the preset geometry rides", () => {
    engine({ sampling_steps: 20 })
    assert.ok(screen.getByText("Engine (H3)"))
    const tail = document.body.textContent!
    assert.ok(tail.includes("window 800×600 · steps 20"))
  })

  it("no stage params = preset geometry; no steps = auto; unknown preset falls back to draft", () => {
    const keys: [string, unknown][] = []
    const h1 = render(
      <RunRecipeEngine
        stage={{} as never}
        layerA={{ preset: "final_hd" } as unknown as LayerA}
        setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
        isRef2va={false}
      />,
    )
    assert.ok(document.body.textContent!.includes("window 1344×768 · steps auto"))
    h1.unmount()
    render(
      <RunRecipeEngine
        stage={{} as never}
        layerA={{ preset: "nope" } as unknown as LayerA}
        setLayerAKey={() => {}}
        isRef2va={false}
      />,
    )
    assert.ok(document.body.textContent!.includes("window 768×448 · steps auto"))
  })
})

describe("engine knobs (forwarded verbatim)", () => {
  it("shifts + sampler + scheduler + steps + denoise write", () => {
    const { keys } = engine({ denoise: 1 })
    fireEvent.change(screen.getByLabelText("Video sigma shift"), { target: { value: "16" } })
    fireEvent.change(screen.getByLabelText("Audio sigma shift"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("Sampler (run)"), { target: { value: "heun" } })
    fireEvent.change(screen.getByLabelText("Sampler (run)"), { target: { value: "" } })
    fireEvent.change(screen.getByLabelText("Scheduler (run)"), { target: { value: "karras" } })
    fireEvent.change(screen.getByLabelText("Sampling steps (run)"), { target: { value: "25" } })
    fireEvent.change(screen.getByLabelText("Denoise (run)"), { target: { value: "0.8" } })
    fireEvent.change(screen.getByLabelText("Denoise (run)"), { target: { value: "" } })
    assert.deepEqual(keys, [
      ["shift_video", 16],
      ["shift_audio", 4],
      ["sampler", "heun"],
      ["sampler", undefined],
      ["scheduler", "karras"],
      ["sampling_steps", 25],
      ["denoise", 0.8],
      ["denoise", undefined],
    ])
  })

  it("window + attention + flags + contexts write", () => {
    const { keys } = engine({ shift_video: 12, shift_audio: 3 })
    fireEvent.change(screen.getByLabelText("Window width (run)"), { target: { value: "1024" } })
    fireEvent.change(screen.getByLabelText("Window height (run)"), { target: { value: "512" } })
    fireEvent.change(screen.getByLabelText("Attention (run)"), { target: { value: "sla" } })
    fireEvent.change(screen.getByLabelText("Attention (run)"), { target: { value: "" } })
    fireEvent.click(screen.getByLabelText("FP16 accumulation (run)"))
    fireEvent.click(screen.getByLabelText("Torch compile (run)"))
    fireEvent.change(screen.getByLabelText("CFG (run)"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("Motion context frames (run)"), { target: { value: "4" } })
    fireEvent.change(screen.getByLabelText("Audio context steps (run)"), { target: { value: "60" } })
    assert.deepEqual(keys, [
      ["width", 1024],
      ["height", 512],
      ["h3_attention", "sla"],
      ["h3_attention", undefined],
      ["h3_fp16_accumulation", true],
      ["h3_torch_compile", true],
      ["cfg", 5],
      ["h3_context_steps", 4],
      ["h3_audio_context_steps", 60],
    ])
  })
})
