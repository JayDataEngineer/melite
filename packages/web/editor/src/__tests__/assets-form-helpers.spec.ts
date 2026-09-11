/**
 * Unit tests for surfaces/generate/assets-form-helpers.tsx — the pure
 * accessor functions behind the Assets generate form (MCP-tool field
 * defaults, TTS engine enum seeding).
 *
 * Coverage:
 *   - fieldDefault: undefined tool → fallback; missing property → fallback;
 *     present default → String(default); falsy defaults (0, false) pass through.
 *   - firstEngineOrDefault: undefined tool → ""; tool with engines → first;
 *     tool with empty/missing enum → "" + console.error (no throw).
 *
 * D3 (2026-08-06): the music_meta loadMusicMeta/musicGenrePrompt/
 * musicVariantDefaults tests were deleted with their source — the MCP studio
 * server is gone and genre presets come through the form spec, not an RPC.
 */
import { describe, it, expect, vi } from "vitest"
import { fieldDefault, firstEngineOrDefault } from "../surfaces/generate/assets-form-helpers.utils"
import type { ServiceTool } from "../surfaces/generate/assets-form-helpers.utils"

// ── Helpers ─────────────────────────────────────────────────────────────────
function mkTool(opts: {
  engineEnum?: string[]
  properties?: Record<string, { default?: unknown; enum?: string[] }>
}): ServiceTool {
  return {
    name: "test_tool",
    inputSchema: {
      type: "object",
      properties: {
        ...(opts.engineEnum !== undefined
          ? { engine: { enum: opts.engineEnum } }
          : {}),
        ...(opts.properties ?? {}),
      },
    },
  }
}

// ── fieldDefault (pure — no module state) ───────────────────────────────────
describe("assets-form-helpers — fieldDefault", () => {
  it("undefined tool → fallback", () => {
    expect(fieldDefault(undefined, "prompt", "my-fallback")).toBe("my-fallback")
  })
  it("tool without the named property → fallback", () => {
    const tool = mkTool({ properties: {} })
    expect(fieldDefault(tool, "missing", "fb")).toBe("fb")
  })
  it("property with a default value → String(default)", () => {
    const tool = mkTool({ properties: { steps: { default: 28 } } })
    expect(fieldDefault(tool, "steps", "fb")).toBe("28")
  })
  it("string default passes through", () => {
    const tool = mkTool({ properties: { prompt: { default: "hello world" } } })
    expect(fieldDefault(tool, "prompt", "fb")).toBe("hello world")
  })
  it("default=0 returns '0' (NOT the fallback — 0 is a valid default)", () => {
    const tool = mkTool({ properties: { offset: { default: 0 } } })
    expect(fieldDefault(tool, "offset", "fb")).toBe("0")
  })
  it("default=false returns 'false' (NOT the fallback — false is a valid default)", () => {
    const tool = mkTool({ properties: { enabled: { default: false } } })
    expect(fieldDefault(tool, "enabled", "fb")).toBe("false")
  })
  it("default=undefined falls through to the fallback", () => {
    const tool = mkTool({ properties: { maybe: { default: undefined } } })
    expect(fieldDefault(tool, "maybe", "fb")).toBe("fb")
  })
})

// ── firstEngineOrDefault (pure — no module state) ───────────────────────────
describe("assets-form-helpers — firstEngineOrDefault", () => {
  it("undefined tool → '' (tools/list still loading)", () => {
    expect(firstEngineOrDefault(undefined)).toBe("")
  })
  it("tool with an engine enum → first entry", () => {
    const tool = mkTool({ engineEnum: ["xtts", "piper", "azure"] })
    expect(firstEngineOrDefault(tool)).toBe("xtts")
  })
  it("tool with an empty engine enum → '' (contract violation, logged)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const tool = mkTool({ engineEnum: [] })
    expect(firstEngineOrDefault(tool)).toBe("")
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it("tool with no engine property → '' (contract violation, logged)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const tool = mkTool({ properties: { prompt: { default: "x" } } })
    expect(firstEngineOrDefault(tool)).toBe("")
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
  it("does NOT throw on a contract violation (render-path safe)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const tool = mkTool({})
    expect(() => firstEngineOrDefault(tool)).not.toThrow()
    errSpy.mockRestore()
  })
})
