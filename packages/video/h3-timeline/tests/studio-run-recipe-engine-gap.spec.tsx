/**
 * RunRecipeEngine gap rows (2026-09-19) — blanking the window
 * geometry writes undefined (blank inherits preset geometry — the
 * knob-audit law), not zero and not the last value. Under the
 * GENERIC SEAM the declared Width/Height rows carry the law (the
 * empty numeric string IS the unset signal — coerceFieldEdit).
 * Every row asserts the written keys — never expect(true).
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base/client"

function envelope(): unknown {
  const num = (description: string, dflt: number, meta2: Record<string, unknown> = {}) => ({
    type: "number", meta: { description, default: dflt, ...meta2 },
  })
  return {
    form: "h3-timeline",
    schema: schemaEnvelope({
      shift_video: num("Video sigma shift", 0, { min: 0, max: 20 }),
      shift_audio: num("Audio sigma shift", 0, { min: 0, max: 10 }),
      steps: num("Sampling steps (run)", 20, { min: 4, max: 40 }),
      width: num("Width", 1344, { min: 448, max: 1344 }),
      height: num("Height", 768, { min: 448, max: 768 }),
      seed: { type: "number", meta: { description: "Seed", default: -1, step: 1 } },
    }),
    variants: [],
  }
}

function serve(): void {
  vi.stubGlobal("fetch", () =>
    Promise.resolve(new Response(JSON.stringify(envelope()), { headers: { "content-type": "application/json" } })))
}

function engine(layerA: Record<string, unknown>) {
  const keys: [string, unknown][] = []
  // THE ATOMIC PICK SEAT (2026-09-29): picks ride setLayerA — the
  // whole-doc functional setter — never the per-key verb. The
  // harness applies the updater to the held doc, exactly like the
  // studio's own Dispatch.
  let doc: Record<string, unknown> = { fps: 24, ...layerA }
  render(
    <RunRecipeEngine
      base={{}}
      layerA={doc as unknown as never}
      setLayerAKey={(k: string, v: unknown) => { keys.push([k, v]) }}
      setLayerA={(updater) => {
        doc = typeof updater === "function"
          ? (updater as (p: unknown) => unknown)(doc) as Record<string, unknown>
          : updater as unknown as Record<string, unknown>
      }}
      refArtifacts={[]}
    />,
  )
  return { keys, doc: () => doc }
}

describe("geometry rows ride the generic seam (min+max = the slider law)", () => {
  it("the window width slider writes COERCED numbers at the wire name", async () => {
    serve()
    const { keys } = engine({ width: 1024 })
    // min+max fields render the MIXED KNOB (the seam's own atom
    // law — the same face the bench drill serves): the range is
    // "<label> slider", the typed face owns the bare label; every
    // drag writes a coerced number
    const el = await screen.findByLabelText("Width slider")
    assert.equal((el as HTMLInputElement).type, "range")
    // a DIFFERENT value (React fires no change for a no-op re-set)
    fireEvent.change(el, { target: { value: "1152" } })
    assert.deepEqual(keys, [["width", 1152]])
    cleanup()
  })

  it("the window height slider writes COERCED numbers at the wire name", async () => {
    serve()
    const { keys } = engine({ height: 512 })
    const el = await screen.findByLabelText("Height slider")
    fireEvent.change(el, { target: { value: "640" } })
    assert.deepEqual(keys, [["height", 640]])
    cleanup()
  })
})
