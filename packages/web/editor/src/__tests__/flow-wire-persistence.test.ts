// flow-wire-persistence.test.ts — the 2026-08-22 "CARD WIRING IS
// BROKEN" regression battery.
//
// The shipped gap: setSlotInput (wires) and updateStageParams (uploads,
// slot attaches) mutated ONLY the client store + its localStorage mirror.
// NO test noticed, because no test asserted that a SERVER persist fires.
// This file pins the flush contract end-to-end at the store boundary:
//
//   • wiring a slot            -> enqueueStagePatch({ inputs, inputOutputs })
//   • unwiring a slot          -> enqueueStagePatch with the ""-padded array
//   • params commit (userEdit) -> enqueueStagePatch({ params: merged })
//   • additive seed (neutral)  -> ALSO flushed (slot null-seeds land here)
//   • true no-op               -> NOTHING flushed (no lying patches)
//   • hydrateDraft adopts persisted inputOutputs (named-output wires
//     survive a rehydrate)
//
// The resultOutbox module is MOCKED — delivery is covered by
// result-outbox.test.ts and the live gate; what is pinned HERE is that the
// store CALLS it with the right bodies at the right moments.
import { describe, it, expect, beforeEach, vi } from "vitest"

const enqueueStagePatch = vi.fn()
vi.mock("../surfaces/flow/resultOutbox", () => ({
  enqueueResultPatch: vi.fn(),
  enqueueStagePatch: (...a: unknown[]) => enqueueStagePatch(...(a as [])),
  flushResultPatches: vi.fn(async () => {}),
  pendingResultPatches: vi.fn(() => 0),
}))

import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { resetDraftIds } from "./__fixtures__/backendDraft"
import type { BackendDraft } from "@melite/contracts"

/** A backend-shaped two-stage draft: gen -> edit, the edit stage carrying
 * the qwen-image-edit slot keys pre-seeded (the server's null-seed shape). */
function twoStageDraft(): BackendDraft {
  return {
    draft_id: "p_wiretest_" + Math.random().toString(36).slice(2, 8),
    intent: "wire persistence",
    status: "ready",
    createdAt: Date.now(),
    completedAt: null,
    stages: [
      {
        id: "s_gen",
        title: "Gen", kind: "generation", service: "qwen-image-edit",
        params: { prompt: "base" }, inputs: [],
      },
      {
        id: "s_edit",
        title: "Edit", kind: "chain", service: "qwen-image-edit",
        params: { prompt: "edit", image1: null },
        inputs: [],
      },
    ],
  }
}

beforeEach(() => {
  enqueueStagePatch.mockClear()
  resetDraftIds()
  useAgentFlowStore.getState().clear()
})

describe("store -> server wire persistence flush", () => {
  it("setSlotInput wires AND flushes { inputs, inputOutputs } to the outbox", async () => {
    const { hydrateDraft, setSlotInput } = useAgentFlowStore.getState()
    await hydrateDraft(twoStageDraft())
    enqueueStagePatch.mockClear()
    await setSlotInput("s_edit", "image1", "s_gen", "primary")
    expect(enqueueStagePatch).toHaveBeenCalledTimes(1)
    const [draftId, stageId, body] = enqueueStagePatch.mock.calls[0] as [string, string, { inputs: string[]; inputOutputs: (string | null)[] }]
    expect(draftId).toBe(useAgentFlowStore.getState().flow!.id)
    expect(stageId).toBe("s_edit")
    expect(body.inputs[0]).toBe("s_gen") // the wire itself, index of image1
    expect(body.inputOutputs[0]).toBe("primary")
    // store state agrees with what was flushed
    const stage = useAgentFlowStore.getState().flow!.stages.find((s) => s.id === "s_edit")!
    expect(stage.inputs[0]).toBe("s_gen")
  })

  it("unwiring flushes the empty-string pad (the server learns the wire DIED)", async () => {
    const { hydrateDraft, setSlotInput } = useAgentFlowStore.getState()
    await hydrateDraft(twoStageDraft())
    await setSlotInput("s_edit", "image1", "s_gen", "primary")
    enqueueStagePatch.mockClear()
    // SlotGrid's detach path: onWireSlot(slot, null, null)
    await setSlotInput("s_edit", "image1", null, null)
    expect(enqueueStagePatch).toHaveBeenCalledTimes(1)
    const body = enqueueStagePatch.mock.calls[0][2] as { inputs: string[] }
    expect(body.inputs[0]).toBe("")
  })

  it("upload attach (updateStageParams userEdit) flushes merged params", async () => {
    const { hydrateDraft, updateStageParams } = useAgentFlowStore.getState()
    await hydrateDraft(twoStageDraft())
    enqueueStagePatch.mockClear()
    await updateStageParams("s_edit", { image1: "data:image/png;base64,AA" }, undefined, { userEdit: true })
    expect(enqueueStagePatch).toHaveBeenCalledTimes(1)
    const body = enqueueStagePatch.mock.calls[0][2] as { params: Record<string, unknown> }
    expect(body.params.image1).toBe("data:image/png;base64,AA")
    expect(body.params.prompt).toBe("edit") // merge, not replace
  })

  it("additive neutral commit (slot null-seed) ALSO flushes — rehydrates keep their squares", async () => {
    const { hydrateDraft, updateStageParams } = useAgentFlowStore.getState()
    await hydrateDraft(twoStageDraft())
    enqueueStagePatch.mockClear()
    // No userEdit: an ADDITIVE seed lands in the NEUTRAL branch (image1 is
    // already null-seeded in the draft; image2 is not). The shipped bug
    // shape: the branch updated memory only — the server never learned the
    // slot keys existed.
    await updateStageParams("s_edit", { image2: null })
    expect(enqueueStagePatch).toHaveBeenCalledTimes(1)
    const body = enqueueStagePatch.mock.calls[0][2] as { params: Record<string, unknown> }
    expect("image2" in body.params).toBe(true)
    expect(body.params.image2).toBeNull()
  })

  it("true no-op commits do NOT flush (no lying patches)", async () => {
    const { hydrateDraft, updateStageParams } = useAgentFlowStore.getState()
    await hydrateDraft(twoStageDraft())
    enqueueStagePatch.mockClear()
    const res = await updateStageParams("s_edit", { prompt: "edit" })
    expect(res.ok).toBe(true)
    expect(enqueueStagePatch).not.toHaveBeenCalled()
  })

  it("hydrateDraft adopts persisted inputOutputs so named-output wires survive a rehydrate", async () => {
    const draft = twoStageDraft()
    ;(draft.stages[1] as { inputOutputs?: (string | null)[] }).inputOutputs = ["mask"]
    draft.stages[1].inputs = ["s_gen"]
    await useAgentFlowStore.getState().hydrateDraft(draft)
    const stage = useAgentFlowStore.getState().flow!.stages.find((s) => s.id === "s_edit")!
    expect(stage.inputs).toEqual(["s_gen"])
    expect(stage.inputOutputs).toEqual(["mask"])
  })
})
