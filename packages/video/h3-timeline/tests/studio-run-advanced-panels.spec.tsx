/**
 * RunAdvancedPanels — Layer A rail (BEHAVIORAL).
 *
 * PINS (the served spec owns the knobs): the SLA lab shows only for
 * block-sparse attention; sharpen leaves follow method; Speed LoRA +
 * RTX + CRF stay document-local; every edit writes its LayerA key
 * (sla_ names take the h3_ spelling); a refused spec renders AS an
 * error, never a thinner rail.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen } from "@testing-library/react"
import { RunAdvancedPanels } from "../src/ui/studio/RunAdvancedPanels.tsx"
import { schemaEnvelope } from "@melite/card-base"
import type { LayerA } from "../src/ui/studio/docModel.ts"

/** Every name the panel reads EXCEPT sla_min_seq_len (its absence
 * pins the undeclared-row-misses arm). */
function envelope(): unknown {
  const num = (description: string, dflt: number) => ({
    type: "number", meta: { description, default: dflt, extra: { wtype: "slider" } },
  })
  const sel = (description: string, consts: string[], dflt: string) => ({
    consts, meta: { description, default: dflt, extra: { wtype: "select" } },
  })
  const flag = (description: string) => ({
    type: "boolean", meta: { description, default: false, extra: {} },
  })
  return {
    form: "h3-timeline",
    schema: schemaEnvelope({
      sla_sparsity: num("SLA sparsity", 0.9),
      sla_block_size: sel("SLA block size", ["32", "64", "128"], "32"),
      sla_dense_last_steps: num("SLA dense last steps", 5),
      sla_dense_steps: num("SLA dense steps", 10),
      sla_dense_backend: sel("SLA dense backend", ["a", "b"], "a"),
      sla_reference_protection: sel("SLA reference protection", ["x", "y"], "x"),
      sla_protect_audio: flag("SLA protect audio"),
      sla_stabilize_motion: flag("SLA stabilize motion"),
      sla_disable_fp16_accum: flag("SLA disable fp16"),
      sharpen_enabled: flag("FSR Sharpening"),
      sharpen_method: sel("Sharpen Method", ["rcas", "adaptive_usm", "deconvolution", "unsharp"], "rcas"),
      sharpen_strength: num("Sharpen strength", 0.5),
      sharpen_radius: num("Sharpen radius", 1),
      sharpen_threshold: num("Sharpen threshold", 2),
      sharpen_iterations: num("Sharpen iterations", 3),
      interpolate_enabled: flag("Interpolate"),
    }),
    variants: [],
  }
}

function serve(body: unknown): void {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })))
}

function panels(layerA: Record<string, unknown>, onKey?: (k: string, v: unknown) => void) {
  const keys: [string, unknown][] = []
  const els = render(
    <RunAdvancedPanels
      layerA={layerA as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]); onKey?.(k as string, v) }}
    />,
  )
  return { keys, els }
}

describe("the served spec owns the knobs", () => {
  it("SLA lab renders for block-sparse; edits take the h3_ spelling", async () => {
    serve(envelope())
    const { keys } = panels({ h3_attention: "sla" })
    await screen.findByText("SLA sparsity")
    for (const t of ["SLA block size", "SLA dense last steps", "SLA dense steps", "SLA dense backend",
      "SLA reference protection", "SLA protect audio", "SLA stabilize motion", "SLA disable fp16"]) {
      assert.ok(screen.getByText(t), t)
    }
    // sla_min_seq_len is undeclared → no row, no ghost (never a twin)
    assert.equal(screen.queryByText("SLA min seq length"), null)
    fireEvent.change(screen.getByLabelText("SLA block size"), { target: { value: "64" } })
    fireEvent.click(screen.getByLabelText("SLA protect audio"))
    assert.deepEqual(keys, [["h3_sla_block_size", "64"], ["h3_sla_protect_audio", true]])
  })

  it("kitchen attention = no SLA lab (inherit spelling, not sla)", async () => {
    serve(envelope())
    panels({})
    await screen.findByText("Speed LoRA")
    assert.equal(screen.queryByTestId("tl-sla-panel"), null)
  })

  it("a refused spec renders AS an error (never a thinner rail)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("form-spec: door refused (503)")))
    try {
      panels({ h3_attention: "sla" })
      const alert = await screen.findByRole("alert")
      assert.ok(alert.textContent!.includes("form-spec: door refused (503)"))
      assert.equal(screen.queryByText("SLA sparsity"), null)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("sharpen leaves follow method", () => {
  it("off = only the switch; rcas = no radius", async () => {
    serve(envelope())
    const h1 = panels({ sharpen_enabled: false })
    await screen.findByText("Speed LoRA")
    assert.ok(screen.getByText("FSR Sharpening"))
    assert.equal(screen.queryByText("Sharpen Method"), null)
    h1.els.unmount()
    serve(envelope())
    panels({ sharpen_enabled: true, sharpen_method: "rcas" })
    await screen.findByText("Sharpen Method")
    assert.ok(screen.getByText("Sharpen strength"))
    assert.equal(screen.queryByText("Sharpen radius"), null)
    assert.equal(screen.queryByText("Sharpen threshold"), null)
    assert.equal(screen.queryByText("Sharpen iterations"), null)
  })

  it("adaptive_usm grows a threshold; deconvolution grows iterations; unsharp grows radius only", async () => {
    serve(envelope())
    const h1 = panels({ sharpen_enabled: true, sharpen_method: "adaptive_usm" })
    await screen.findByText("Sharpen threshold")
    assert.ok(screen.getByText("Sharpen radius"))
    assert.equal(screen.queryByText("Sharpen iterations"), null)
    h1.els.unmount()
    serve(envelope())
    const h2 = panels({ sharpen_enabled: true, sharpen_method: "deconvolution" })
    await screen.findByText("Sharpen iterations")
    assert.equal(screen.queryByText("Sharpen threshold"), null)
    h2.els.unmount()
    serve(envelope())
    const hU = panels({ sharpen_enabled: true, sharpen_method: "unsharp" })
    await screen.findByText("Sharpen radius")
    assert.equal(screen.queryByText("Sharpen threshold"), null)
    // the plain-name edit keeps its spelling (no h3_ prefix off the sla_ family)
    fireEvent.click(screen.getByLabelText("FSR Sharpening"))
    assert.deepEqual(hU.keys, [["sharpen_enabled", false]])
    hU.els.unmount()
    // method unset inherits rcas (no radius) — the ?? default arm
    serve(envelope())
    panels({ sharpen_enabled: true })
    await screen.findByText("Sharpen strength")
    assert.equal(screen.queryByText("Sharpen radius"), null)
  })
})

describe("document-local rows (never card knobs)", () => {
  it("Speed LoRA writes name + strength", async () => {
    serve(envelope())
    const { keys } = panels({})
    await screen.findByText("Speed LoRA")
    fireEvent.change(screen.getByLabelText("Speed LoRA name (run)"), { target: { value: "h3/minimax_h3_fl2v_turbo_4step_v1.1_768p_comfyui_bf16.safetensors" } })
    fireEvent.change(screen.getByLabelText("Speed LoRA strength (run)"), { target: { value: "0.8" } })
    assert.deepEqual(keys, [["lora_name", "h3/minimax_h3_fl2v_turbo_4step_v1.1_768p_comfyui_bf16.safetensors"], ["lora_strength", 0.8]])
  })

  it("interpolation: off hides; rife writes, film is the fallback; multiplier numbers", async () => {
    serve(envelope())
    const h1 = panels({ interpolate_enabled: false })
    await screen.findByText("Speed LoRA")
    assert.equal(screen.queryByLabelText("Interpolation model (run)"), null)
    h1.els.unmount()
    serve(envelope())
    const { keys } = panels({ interpolate_enabled: true })
    await screen.findByLabelText("Interpolation model (run)")
    fireEvent.change(screen.getByLabelText("Interpolation model (run)"), { target: { value: "rife47.pth" } })
    fireEvent.change(screen.getByLabelText("Interpolation model (run)"), {
      target: { value: "film_net_fp16.safetensors" },
    })
    fireEvent.change(screen.getByLabelText("Interpolation multiplier (run)"), { target: { value: "4" } })
    assert.deepEqual(keys, [
      ["interpolate_model", "rife47.pth"],
      ["interpolate_model", "film_net_fp16.safetensors"],
      ["interpolate_multiplier", 4],
    ])
  })

  it("RTX: off hides; on grows scale + quality; CRF rounds, a clear unsets", async () => {
    serve(envelope())
    const h1 = panels({ rtx_vsr_enabled: false })
    await screen.findByText("Speed LoRA")
    assert.equal(screen.queryByLabelText("RTX Super-Res scale (run)"), null)
    h1.els.unmount()
    serve(envelope())
    const { keys } = panels({ rtx_vsr_enabled: true, crf: 19 })
    await screen.findByLabelText("RTX Super-Res scale (run)")
    fireEvent.click(screen.getByLabelText("RTX Super-Resolution (run)"))
    fireEvent.change(screen.getByLabelText("RTX Super-Res scale (run)"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("RTX Super-Res quality (run)"), { target: { value: "HIGH" } })
    fireEvent.change(screen.getByLabelText("Output CRF (run)"), { target: { value: "20.6" } })
    fireEvent.change(screen.getByLabelText("Output CRF (run)"), { target: { value: "" } })
    assert.deepEqual(keys, [
      ["rtx_vsr_enabled", false],
      ["rtx_vsr_multiplier", 3],
      ["rtx_vsr_quality", "HIGH"],
      ["crf", 21],
      ["crf", undefined],
    ])
  })
})
