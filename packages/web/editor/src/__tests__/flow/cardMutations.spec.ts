// cardMutations — the declarative card-mutation gate (2026-08-09).
//
// WHAT IS PROVEN: every card mutation passes through the CARD_MUTATIONS
// table — kind → field + coercion + validation. The gate is the frontend
// half of the two-layer enforcement (the backend FlowStep.title
// Field(max_length=120) is the wire half). Rename: trims, requires 1-120
// non-empty chars, rejects unknown kinds at runtime (defense beyond the
// tsc union). A rejected mutation returns { ok: false, error } — never
// throws, never partially writes.
import { describe, it, expect } from "vitest"
import {
  applyDocMutation,
  applyStageMutation,
  TITLE_MAX_LEN,
  type DocMutation,
  type StageMutation,
} from "@melite/formats"
/** Runtime-shape violation — the gate must reject what tsc would never
 *  allow (defense in depth past the union). */
const bad = (m: unknown) => m as unknown as StageMutation

describe("applyStageMutation — the declarative gate", () => {
  it("rename trims and returns the patch for the declared field", () => {
    const res = applyStageMutation({ kind: "rename", value: "  My Card  " })
    expect(res).toEqual({ ok: true, patch: { title: "My Card" } })
  })

  it("empty and whitespace-only titles are rejected (no patch)", () => {
    expect(applyStageMutation({ kind: "rename", value: "" }).ok).toBe(false)
    const ws = applyStageMutation({ kind: "rename", value: "   " })
    expect(ws.ok).toBe(false)
    if ("error" in ws) expect(ws.error).toContain("title")
  })

  it("enforces the TITLE_MAX_LEN boundary: 120 ok, 121 rejected", () => {
    const atBound = applyStageMutation({ kind: "rename", value: "x".repeat(TITLE_MAX_LEN) })
    expect(atBound).toEqual({ ok: true, patch: { title: "x".repeat(TITLE_MAX_LEN) } })
    const over = applyStageMutation({ kind: "rename", value: "x".repeat(TITLE_MAX_LEN + 1) })
    expect(over.ok).toBe(false)
  })

  it("rejects non-string values (the value must be a string, not a passthrough)", () => {
    expect(applyStageMutation(bad({ kind: "rename", value: 123 })).ok).toBe(false)
    expect(applyStageMutation(bad({ kind: "rename", value: null })).ok).toBe(false)
    expect(applyStageMutation(bad({ kind: "rename", value: {} })).ok).toBe(false)
  })

  it("unknown mutation kinds error at runtime (defense beyond the tsc union)", () => {
    const res = applyStageMutation(bad({ kind: "nope", value: "x" }))
    expect(res.ok).toBe(false)
    if ("error" in res) expect(res.error).toContain("Unknown stage mutation kind")
  })
})

describe("applyDocMutation — the flow-level gate (2026-08-09)", () => {
  /** Runtime-shape violation — the gate must reject what tsc would never
   *  allow (defense in depth past the union). */
  const bad = (m: unknown) => m as unknown as DocMutation

  it("rename trims and patches the doc 'name' field", () => {
    const res = applyDocMutation({ kind: "rename", value: "  My Flow  " })
    expect(res).toEqual({ ok: true, patch: { name: "My Flow" } })
  })

  it("empty and whitespace-only names are rejected (no patch)", () => {
    expect(applyDocMutation({ kind: "rename", value: "" }).ok).toBe(false)
    const ws = applyDocMutation({ kind: "rename", value: "   " })
    expect(ws.ok).toBe(false)
    if ("error" in ws) expect(ws.error).toContain("name")
  })

  it("enforces the TITLE_MAX_LEN boundary: 120 ok, 121 rejected", () => {
    const atBound = applyDocMutation({ kind: "rename", value: "x".repeat(TITLE_MAX_LEN) })
    expect(atBound).toEqual({ ok: true, patch: { name: "x".repeat(TITLE_MAX_LEN) } })
    const over = applyDocMutation({ kind: "rename", value: "x".repeat(TITLE_MAX_LEN + 1) })
    expect(over.ok).toBe(false)
    if ("error" in over) expect(over.error).toContain("120")
  })

  it("rejects non-string values", () => {
    expect(applyDocMutation(bad({ kind: "rename", value: 123 })).ok).toBe(false)
    expect(applyDocMutation(bad({ kind: "rename", value: null })).ok).toBe(false)
    expect(applyDocMutation(bad({ kind: "rename", value: {} })).ok).toBe(false)
  })

  it("unknown doc mutation kinds error at runtime", () => {
    const res = applyDocMutation(bad({ kind: "nope", value: "x" }))
    expect(res.ok).toBe(false)
    if ("error" in res) expect(res.error).toContain("Unknown doc mutation kind")
  })

  // Guards the runMutation generalization — the stage gate must not have
  // picked up the doc table's field.
  it("REGRESSION PIN: applyStageMutation still patches 'title', not 'name'", () => {
      const res = applyStageMutation({ kind: "rename", value: "  My Card  " })
      expect(res).toEqual({ ok: true, patch: { title: "My Card" } })
    })
})
