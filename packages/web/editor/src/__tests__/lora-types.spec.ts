/**
 * Unit tests for lib/loraTypes.ts — the canonical LoRA wire-format primitive.
 *
 * LoRAEntry is the single shared type across every surface that handles LoRAs:
 * LoraPicker, SegmentParams, GenerateFormBody, and the backend dispatch layer.
 * This test pins the shape so a field rename (strength → weight, etc.) surfaces
 * here before it surfaces as a runtime undefined in the UI.
 *
 * Zero prior coverage — the module is types-only, but shape sanity matters.
 */
import { describe, it, expect } from "vitest"
import type { LoRAEntry } from "@melite/contracts"

describe("loraTypes — LoRAEntry shape", () => {
  it("has exactly two fields: id (string) + strength (number)", () => {
    const entry: LoRAEntry = { id: "stylize_v15", strength: 0.8 }
    expect(entry.id).toBe("stylize_v15")
    expect(entry.strength).toBe(0.8)
    expect(Object.keys(entry).sort()).toEqual(["id", "strength"])
  })

  it("accepts a strength of 0 (disabled)", () => {
    const entry: LoRAEntry = { id: "off", strength: 0 }
    expect(entry.strength).toBe(0)
  })

  it("accepts a strength of 1.0 (full power)", () => {
    const entry: LoRAEntry = { id: "full", strength: 1.0 }
    expect(entry.strength).toBe(1.0)
  })

  it("accepts a strength > 1.0 (overclock — no clamping at the type level)", () => {
    const entry: LoRAEntry = { id: "overdrive", strength: 1.5 }
    expect(entry.strength).toBe(1.5)
  })

  it("accepts a negative strength (inversion)", () => {
    const entry: LoRAEntry = { id: "inverted", strength: -0.5 }
    expect(entry.strength).toBe(-0.5)
  })

  it("accepts an empty name string (backend validates, not the type)", () => {
    const entry: LoRAEntry = { id: "", strength: 0.7 }
    expect(entry.id).toBe("")
  })

  it("works in an array (the wire format for multiple LoRAs)", () => {
    const loras: LoRAEntry[] = [
      { id: "style", strength: 0.8 },
      { id: "detail", strength: 0.4 },
    ]
    expect(loras).toHaveLength(2)
    expect(loras[0].id).toBe("style")
    expect(loras[1].strength).toBe(0.4)
  })

  it("name is a string (not a number or object)", () => {
    const entry: LoRAEntry = { id: "test", strength: 1 }
    expect(typeof entry.id).toBe("string")
  })

  it("strength is a number (not a string)", () => {
    const entry: LoRAEntry = { id: "test", strength: 0.5 }
    expect(typeof entry.strength).toBe("number")
  })

  it("does NOT have legacy fields (name, weight, enabled, path)", () => {
    const entry: LoRAEntry = { id: "modern", strength: 0.9 }
    // 2026-09-06 flip: `id` is THE key (compose resolves it against the
    // catalog rows; the `name` era was the wire drift that made every
    // editor-authored lora compile-refuse as "lora ''").
    expect(entry).not.toHaveProperty("name")
    expect(entry).not.toHaveProperty("weight")
    expect(entry).not.toHaveProperty("enabled")
    expect(entry).not.toHaveProperty("path")
    expect(entry).not.toHaveProperty("strength_model")
    expect(entry).not.toHaveProperty("strength_clip")
  })

  it("is JSON-serializable (the wire format travels as JSON)", () => {
    const entry: LoRAEntry = { id: "json-test", strength: 0.75 }
    const json = JSON.stringify(entry)
    const parsed = JSON.parse(json) as LoRAEntry
    expect(parsed).toEqual(entry)
    expect(parsed.id).toBe("json-test")
    expect(parsed.strength).toBe(0.75)
  })

  it("two entries with the same values are deeply equal but not referentially equal", () => {
    const a: LoRAEntry = { id: "same", strength: 0.5 }
    const b: LoRAEntry = { id: "same", strength: 0.5 }
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})
