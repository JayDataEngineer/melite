/**
 * RunAdvancedPanels — the Layer A rail (BEHAVIORAL).
 *
 * THE LAYER A/B LAW REWORK (2026-09-17): every row rides the SERVED
 * form-spec at its WIRE name (no h3_ spelling, no gate); the leaves'
 * VISIBILITY rides the declaration's own visible_when grammar (the
 * ONE schema pattern — guards &-ANDed, values |-SET; no hand-rolled
 * predicates anywhere); the lora surface is the MOD PLANE
 * (ModifiersSection over the spec's features.modifiers); the dead
 * vocabulary (Speed LoRA knob pair, RTX VSR multiplier/quality,
 * Output CRF, the attention gate) is pinned ABSENT. A refused spec
 * renders AS an error, never a thinner rail.
 */
import { describe, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { RunAdvancedPanels } from "../src/ui/studio/RunAdvancedPanels.tsx"
import { schemaEnvelope } from "@melite/card-base"
import type { LayerA } from "../src/ui/studio/docModel.ts"

/** Every name the panel reads EXCEPT sla_min_seq_len (its absence
 * pins the undeclared-row-misses arm). The post leaves carry their
 * OWN visibility in visible_when — the declaration owns the leaf
 * law (guards &-ANDed, values |-SET), mirroring card.ts exactly;
 * no panel-side predicates exist. */
function envelope(): unknown {
  const num = (description: string, dflt: number, vis?: string) => ({
    type: "number", meta: { description, default: dflt, extra: { wtype: "slider", ...(vis ? { visible_when: vis } : {}) } },
  })
  const sel = (description: string, consts: string[], dflt: string, vis?: string) => ({
    consts, meta: { description, default: dflt, extra: { wtype: "select", ...(vis ? { visible_when: vis } : {}) } },
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
      sharpen_method: sel("Sharpen Method", ["rcas", "adaptive_usm", "high_pass", "deconvolution"], "rcas",
        "sharpen_enabled=true"),
      sharpen_strength: num("Sharpen strength", 0.5, "sharpen_enabled=true"),
      sharpen_radius: num("Sharpen radius", 1, "sharpen_enabled=true&sharpen_method=adaptive_usm|high_pass|deconvolution"),
      sharpen_threshold: num("Sharpen threshold", 2, "sharpen_enabled=true&sharpen_method=adaptive_usm"),
      sharpen_iterations: num("Sharpen iterations", 3, "sharpen_enabled=true&sharpen_method=deconvolution"),
      interpolate_enabled: flag("Interpolate"),
      interp_model: sel("Interpolation model", ["film_net_fp16", "rife47"], "film_net_fp16", "interpolate_enabled=true"),
      interp_multiplier: num("Interpolation multiplier", 2, "interpolate_enabled=true"),
      sr_switch: flag("SeedVR2 Super-Resolution"),
      sr_resolution: sel("Super-Res resolution", ["720", "1080", "1440", "2160"], "1080", "sr_switch=true"),
    }),
    variants: [],
  }
}

/** The served mod plane: one lora kind, two catalog rows — the shape
 * discovery.ts serves off svc.modCatalog("loras", family). */
function withMods(): unknown {
  const doc = envelope() as { features?: Record<string, unknown> }
  doc.features = {
    modifiers: [{
      kind: "lora", label: "Loras", param_key: "loras", cardinality: "multi", max_stack: 2,
      options: [
        { value: "h3_lightx2v_dareties", label: "LightX2V dareties 4-step" },
        { value: "h3_lightx2v_turbo", label: "LightX2V turbo 4to8-step", defaults: { strength: 0.8 } },
      ],
    }],
  }
  return doc
}

function serve(body: unknown): void {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } })))
}

function panels(layerA: Record<string, unknown>) {
  const keys: [string, unknown][] = []
  const els = render(
    <RunAdvancedPanels
      layerA={layerA as unknown as LayerA}
      setLayerAKey={(k, v) => { keys.push([k as string, v]) }}
    />,
  )
  return { keys, els }
}

describe("the served spec owns the knobs", () => {
  it("the SLA lab rides EVERY layer A (the attention gate was fiction); edits take the wire spelling", async () => {
    serve(envelope())
    const { keys } = panels({})
    await screen.findByText("SLA sparsity")
    assert.notEqual(screen.queryByTestId("tl-sla-panel"), null)
    for (const t of ["SLA block size", "SLA dense last steps", "SLA dense steps", "SLA dense backend",
      "SLA reference protection", "SLA protect audio", "SLA stabilize motion", "SLA disable fp16"]) {
      assert.ok(screen.getByText(t), t)
    }
    // sla_min_seq_len is undeclared → no row, no ghost (never a twin)
    assert.equal(screen.queryByText("SLA min seq length"), null)
    fireEvent.change(screen.getByLabelText("SLA block size"), { target: { value: "64" } })
    fireEvent.click(screen.getByLabelText("SLA protect audio"))
    // WIRE names — the h3_ spelling died with the knob-key rework
    assert.deepEqual(keys, [["sla_block_size", "64"], ["sla_protect_audio", true]])
    cleanup()
  })

  it("a refused spec renders AS an error (never a thinner rail)", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("form-spec: door refused (503)")))
    try {
      panels({})
      const alert = await screen.findByRole("alert")
      assert.ok(alert.textContent!.includes("form-spec: door refused (503)"))
      assert.equal(screen.queryByText("SLA sparsity"), null)
    } finally {
      vi.unstubAllGlobals()
    }
    cleanup()
  })
})

describe("loras are MODS (the mod plane, never card knobs)", () => {
  it("features.modifiers boards the section; the add grammar seats the kind menu; edits write the param_key bag", async () => {
    serve(withMods())
    const { keys } = panels({})
    await screen.findByText("SLA sparsity")
    assert.notEqual(screen.queryByTestId("tl-mods-panel"), null)
    // the chrome + the add square seat the kind menu (the estate's grammar)
    fireEvent.click(document.querySelector('[data-subcard-add="mod"]') as HTMLElement)
    fireEvent.click(screen.getByRole("menuitem", { name: "Loras" }))
    // the create leaf offers the catalog rows — pick the turbo row and save
    const leaf = screen.getByRole("dialog")
    fireEvent.change(within(leaf).getByRole("combobox"), { target: { value: "h3_lightx2v_turbo" } })
    fireEvent.click(within(leaf).getByRole("button", { name: /save|add/i }))
    assert.ok(keys.some(([k]) => k === "loras"), "an edit writes the loras bag at its param_key")
    cleanup()
  })

  it("no features.modifiers → no mods panel (nothing offered, nothing hand-rolled)", async () => {
    serve(envelope())
    panels({})
    await screen.findByText("SLA sparsity")
    assert.equal(screen.queryByTestId("tl-mods-panel"), null)
    // the dead knob vocabulary stays dead
    assert.equal(screen.queryByText("Speed LoRA"), null)
    assert.equal(screen.queryByLabelText("Speed LoRA name (run)"), null)
    cleanup()
  })
})

describe("post leaves follow their switches (wire names, served rows)", () => {
  it("sharpen: off = only the switch; on + rcas = no radius; adaptive_usm grows radius (the DECLARATION gates, not the panel)", async () => {
    serve(envelope())
    const h1 = panels({ sharpen_enabled: false })
    await screen.findByText("FSR Sharpening")
    assert.equal(screen.queryByText("Sharpen Method"), null)
    h1.els.unmount()
    serve(envelope())
    const h2 = panels({ sharpen_enabled: true, sharpen_method: "rcas" })
    await screen.findByText("Sharpen Method")
    assert.ok(screen.getByText("Sharpen strength"))
    assert.equal(screen.queryByText("Sharpen radius"), null)
    h2.els.unmount()
    serve(envelope())
    // the |-SET guard: radius seats for every method EXCEPT rcas
    const hU = panels({ sharpen_enabled: true, sharpen_method: "adaptive_usm" })
    await screen.findByText("Sharpen radius")
    assert.ok(screen.getByText("Sharpen threshold"), "the &-chained single guard seats its own leaf")
    assert.equal(screen.queryByText("Sharpen iterations"), null)
    // the plain wire name — no h3_ spelling anywhere off the sla_ family
    fireEvent.click(screen.getByLabelText("FSR Sharpening"))
    assert.deepEqual(hU.keys, [["sharpen_enabled", false]])
    hU.els.unmount()
    cleanup()
  })

  it("interpolate: on grows interp_model + interp_multiplier; sr_switch grows sr_resolution; dead rows stay dead", async () => {
    serve(envelope())
    const h1 = panels({ interpolate_enabled: false, sr_switch: false })
    await screen.findByText("FSR Sharpening")
    assert.equal(screen.queryByText("Interpolation model"), null)
    assert.equal(screen.queryByText("Super-Res resolution"), null)
    h1.els.unmount()
    serve(envelope())
    const { keys } = panels({ interpolate_enabled: true, sr_switch: true })
    await screen.findByText("Interpolation model")
    assert.ok(screen.getByText("Interpolation multiplier"))
    assert.ok(screen.getByText("Super-Res resolution"))
    // the RTX/CRF fictions never come back
    assert.equal(screen.queryByLabelText("RTX Super-Res scale (run)"), null)
    assert.equal(screen.queryByLabelText("Output CRF (run)"), null)
    fireEvent.click(screen.getByLabelText("SeedVR2 Super-Resolution"))
    assert.deepEqual(keys, [["sr_switch", false]])
    cleanup()
  })
})
