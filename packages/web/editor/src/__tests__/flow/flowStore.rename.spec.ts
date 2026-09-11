// Store-level rename (2026-08-09) — the applyStageMutation gate on the
// live store, driven directly (no component render — the flowStore
// harness pattern).
//
// WHAT IS PROVEN: rename writes the stage title through the declarative
// cardMutations gate and is PURELY COSMETIC — no staleness marking, no
// cacheKey recompute (title is not part of the key), status untouched.
// Rejected mutations (empty, too-long, unknown stageId) return
// { ok: false } and leave the document unchanged.
import { describe, it, expect, beforeEach } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { TITLE_MAX_LEN } from "@melite/formats"

const state = () => useAgentFlowStore.getState()
const stage = () => state().flow!.stages[0]

beforeEach(async () => {
  state().clear()
  await state().startFlow("rename test")
  await state().addStage({
    kind: "generation",
    service: "flux-dev",
    title: "Original Title",
    params: { prompt: "a" },
  })
})

describe("applyStageMutation — rename on the store", () => {
  it("renames the stage title, trimmed, through the gate", () => {
    const res = state().applyStageMutation(stage().id, { kind: "rename", value: "  New Title  " })
    expect(res).toEqual({ ok: true, patch: { title: "New Title" } })
    expect(stage().title).toBe("New Title")
  })

  it("is purely cosmetic: status and cacheKey are untouched (no stale)", async () => {
    const before = stage()
    const cacheKey = before.cacheKey
    const status = before.status

    state().applyStageMutation(stage().id, { kind: "rename", value: "Cosmetic" })
    const after = stage()
    expect(after.title).toBe("Cosmetic")
    expect(after.status).toBe(status)
    expect(after.cacheKey).toBe(cacheKey)
  })

  it("rejects empty / too-long / unknown-stageId and leaves the doc unchanged", () => {
    const id = stage().id
    expect(state().applyStageMutation(id, { kind: "rename", value: "   " }).ok).toBe(false)
    expect(state().applyStageMutation(id, { kind: "rename", value: "x".repeat(TITLE_MAX_LEN + 1) }).ok).toBe(false)
    expect(state().applyStageMutation("s_nope", { kind: "rename", value: "X" }).ok).toBe(false)
    expect(stage().title).toBe("Original Title")
    expect(state().flow!.stages).toHaveLength(1)
  })
})

describe("applyDocMutation — the flow rename on the store (2026-08-09)", () => {
  it("sets flow.name through the gate, trimmed; intent is untouched", () => {
    const res = state().applyDocMutation({ kind: "rename", value: "  My Run  " })
    expect(res).toEqual({ ok: true, patch: { name: "My Run" } })
    expect(state().flow!.name).toBe("My Run")
    expect(state().flow!.intent).toBe("rename test")
  })

  it("is purely cosmetic: id/stages/status/createdAt/cacheKeys all untouched", () => {
    const before = state().flow!
    const stageKeys = before.stages.map((s) => s.cacheKey)
    const res = state().applyDocMutation({ kind: "rename", value: "Cosmetic" })
    expect(res.ok).toBe(true)
    const after = state().flow!
    expect(after.id).toBe(before.id)
    expect(after.status).toBe(before.status)
    expect(after.createdAt).toBe(before.createdAt)
    expect(after.completedAt).toBe(before.completedAt)
    expect(after.stages).toHaveLength(before.stages.length)
    expect(after.stages.map((s) => s.cacheKey)).toEqual(stageKeys)
  })

  it("rejects empty / too-long names and leaves the doc unchanged", () => {
    const doc = state().flow!
    expect(state().applyDocMutation({ kind: "rename", value: "   " }).ok).toBe(false)
    expect(state().applyDocMutation({ kind: "rename", value: "x".repeat(TITLE_MAX_LEN + 1) }).ok).toBe(false)
    expect(state().flow!.name).toBeUndefined()
    expect(state().flow!.intent).toBe(doc.intent)
  })

  it("no flow loaded → { ok: false, error: 'No flow loaded' }", () => {
    state().clear()
    const res = state().applyDocMutation({ kind: "rename", value: "X" })
    expect(res).toEqual({ ok: false, error: "No flow loaded" })
  })
})
