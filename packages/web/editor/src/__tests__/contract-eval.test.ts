/**
 * Unit tests for the conditional CONTRACT evaluation helpers in formSpec.ts.
 *
 * These helpers are the FRONTEND MIRROR of the backend's
 * media.comfyui.family_schema.run_contract / _is_present. The card UI uses
 * them to render per-mode required asterisks + forbidden dimming + inline
 * violation messages from spec.contract.
 *
 * A mismatch between these and run_contract would mean the card shows green
 * but the POST still 400s at parse time. The cases here lock the parity:
 *   - isPresent boundary (None/""/whitespace/0/false/[]/{})
 *   - activeClause resolution (mode → clause, default fallback)
 *   - validateContract (all four clause types + collect-all)
 *   - fieldRequiredInMode / fieldForbiddenInMode (the render helpers)
 *   - undefined contract = no-op (the 95% of forms without one)
 */
import { describe, it, expect } from "vitest"
import {
  isPresent,
  activeClause,
  validateContract,
  fieldRequiredInMode,
  fieldForbiddenInMode,
  type ConditionalContract,
} from "@melite/contracts"

const VOICE_STUDIO: ConditionalContract = {
  discriminator: "voice_studio_mode",
  modes: ["export_lite", "export_wdelta", "preview", "generate"],
  clauses: {
    export_lite: { requires: ["instruct"], forbids: ["qvoice_path", "emotion"] },
    export_wdelta: { requires: ["instruct"], forbids: ["qvoice_path"] },
    preview: { requires: ["qvoice_path"], forbids: ["sample_text"] },
    generate: { requires: ["qvoice_path"], forbids: ["sample_text"] },
  },
  default_clause: null,
}

// ── isPresent — the absent/present boundary ────────────────────────────────
describe("isPresent", () => {
  it("null/undefined/empty-string/whitespace = absent", () => {
    expect(isPresent(null)).toBe(false)
    expect(isPresent(undefined)).toBe(false)
    expect(isPresent("")).toBe(false)
    expect(isPresent("   ")).toBe(false)
  })
  it("numeric 0 and boolean false are PRESENT", () => {
    expect(isPresent(0)).toBe(true)
    expect(isPresent(0.0)).toBe(true)
    expect(isPresent(false)).toBe(true)
  })
  it("empty containers absent, non-empty present", () => {
    expect(isPresent([])).toBe(false)
    expect(isPresent([1])).toBe(true)
    expect(isPresent({})).toBe(false)
    expect(isPresent({ a: 1 })).toBe(true)
  })
  it("non-empty string present (incl. '0')", () => {
    expect(isPresent("x")).toBe(true)
    expect(isPresent("0")).toBe(true)
  })
})

// ── activeClause — discriminator → clause resolution ───────────────────────
describe("activeClause", () => {
  it("resolves the clause matching the discriminator value", () => {
    const c = activeClause(VOICE_STUDIO, { voice_studio_mode: "preview" })
    expect(c?.requires).toEqual(["qvoice_path"])
  })
  it("falls back to default_clause for uncovered modes", () => {
    const c: ConditionalContract = {
      discriminator: "mode", modes: ["a", "b"],
      clauses: { a: { requires: ["x"] } },
      default_clause: { forbids: ["y"] },
    }
    expect(activeClause(c, { mode: "b" })?.forbids).toEqual(["y"])
  })
  it("returns undefined when no clause and no default", () => {
    expect(activeClause(VOICE_STUDIO, { voice_studio_mode: "" })).toBeUndefined()
  })
})

// ── validateContract — all four clause types + collect-all ─────────────────
describe("validateContract", () => {
  it("requires fires when a required field is empty", () => {
    const v = validateContract(VOICE_STUDIO, { voice_studio_mode: "export_lite" })
    expect(v.some((x) => x.field === "instruct")).toBe(true)
  })
  it("requires satisfied when all required fields present", () => {
    const v = validateContract(VOICE_STUDIO, {
      voice_studio_mode: "export_lite", instruct: "warm",
    })
    expect(v).toHaveLength(0)
  })
  it("forbids fires when a forbidden field is set", () => {
    const v = validateContract(VOICE_STUDIO, {
      voice_studio_mode: "export_lite", instruct: "warm",
      qvoice_path: "/v.qvoice",
    })
    expect(v.some((x) => x.field === "qvoice_path")).toBe(true)
  })
  it("requires_one_of fires when all are absent", () => {
    const c: ConditionalContract = {
      discriminator: "m", modes: ["a"],
      clauses: { a: { requires_one_of: ["x", "y"] } },
    }
    const v = validateContract(c, { m: "a" })
    expect(v.some((x) => x.message.includes("at least one of"))).toBe(true)
  })
  it("mutually_exclusive fires when both set", () => {
    const c: ConditionalContract = {
      discriminator: "m", modes: ["a"],
      clauses: { a: { mutually_exclusive: ["x", "y"] } },
    }
    const v = validateContract(c, { m: "a", x: "1", y: "2" })
    expect(v.some((x) => x.message.includes("mutually exclusive"))).toBe(true)
  })
  it("collects ALL violations in one pass (not just first)", () => {
    // export_lite with no instruct AND qvoice_path+emotion set → 3 violations
    const v = validateContract(VOICE_STUDIO, {
      voice_studio_mode: "export_lite",
      qvoice_path: "/v.qvoice", emotion: "happy",
    })
    expect(v.length).toBeGreaterThanOrEqual(3)
  })
  it("no clause for the mode + no default → no violations", () => {
    expect(validateContract(VOICE_STUDIO, { voice_studio_mode: "" })).toHaveLength(0)
  })
})

// ── fieldRequiredInMode / fieldForbiddenInMode — render helpers ────────────
describe("fieldRequiredInMode", () => {
  it("true for a requires field under the active mode", () => {
    expect(fieldRequiredInMode(VOICE_STUDIO, "instruct", { voice_studio_mode: "export_lite" })).toBe(true)
  })
  it("false for a non-required field", () => {
    expect(fieldRequiredInMode(VOICE_STUDIO, "seed", { voice_studio_mode: "export_lite" })).toBe(false)
  })
  it("undefined contract → always false (no-op)", () => {
    expect(fieldRequiredInMode(undefined, "instruct", { voice_studio_mode: "export_lite" })).toBe(false)
  })
})

describe("fieldForbiddenInMode", () => {
  it("true for a forbids field under the active mode", () => {
    expect(fieldForbiddenInMode(VOICE_STUDIO, "qvoice_path", { voice_studio_mode: "export_lite" })).toBe(true)
  })
  it("false when the field is allowed", () => {
    expect(fieldForbiddenInMode(VOICE_STUDIO, "instruct", { voice_studio_mode: "export_lite" })).toBe(false)
  })
  it("undefined contract → always false (no-op)", () => {
    expect(fieldForbiddenInMode(undefined, "qvoice_path", {})).toBe(false)
  })
})
