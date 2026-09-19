/**
 * RunRecipeEngine gap rows (2026-09-19) — blanking the window
 * geometry writes undefined (blank inherits preset geometry — the
 * knob-audit law), not zero and not the last value. Every row asserts
 * the written keys — never expect(true).
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { RunRecipeEngine } from "../src/ui/studio/RunRecipeEngine.tsx"
import { schemaEnvelope } from "@melite/card-base"

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
  render(
    <RunRecipeEngine
      stage={{ params: {} } as never}
      layerA={{ fps: 24, ...layerA } as never}
      setLayerAKey={(k: string, v: unknown) => { keys.push([k, v]) }}
      isRef2va={false}
    />,
  )
  return { keys }
}

describe("blank geometry inherits (never zero, never stale)", () => {
  it("blanking the window width writes undefined", () => {
    serve()
    const { keys } = engine({ width: 1024 })
    fireEvent.change(screen.getByLabelText("Window width (run)"), { target: { value: "" } })
    assert.deepEqual(keys, [["width", undefined]])
    expect(keys).toEqual([["width", undefined]])
    cleanup()
  })

  it("blanking the window height writes undefined", () => {
    serve()
    const { keys } = engine({ height: 512 })
    fireEvent.change(screen.getByLabelText("Window height (run)"), { target: { value: "" } })
    assert.deepEqual(keys, [["height", undefined]])
    expect(keys).toEqual([["height", undefined]])
    cleanup()
  })
})
