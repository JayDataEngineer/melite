// agent-build-flow-slots.spec.tsx — the agent path renders the SAME
// slot squares as capability cards (2026-08-08; rewritten 2026-08-13).
//
// build_flow moved to the BACKEND (agent/tools/flow.py +
// backend/core/flows/drafts.py): capability resolution + null-seeding
// of the model's declared input_slots happen server-side, and the draft
// arrives with the seeded params already folded. The store is a dumb
// renderer — hydrateDraft adopts the draft AS-IS. This test pins that the
// hydrated card carries the SAME slot keys the capability cards render:
// edit → image1/image2/image3 (the 3-slot IMAGE1 grid), video →
// first_frame/last_frame, upscale → input_image, explicit agent-set values
// never clobbered. The null-seeding itself is backend logic, covered by
// test_flow_drafts.py (TestCapabilityResolution etc.).
//
// The stageSlots() calls are the square-count source the drilldown's
// SlotGrid derives from — the exact regression this file originally
// pinned: an agent-built edit card used to carry zero slot keys and
// rendered ZERO squares while its capability-tab twin rendered three.
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { makeDraft } from "./__fixtures__/backendDraft"
import { stageSlots } from "@melite/catalog"

beforeEach(() => {
  useAgentFlowStore.getState().clear()
})

afterEach(() => {})

describe("agent path — backend null-seeded slots render the same grids", () => {
  it("edit stages adopt image1/image2/image3 — the 3-slot IMAGE1 grid", async () => {
    // The backend resolved capability image_edit → qwen-image-edit and
    // null-seeded its declared input_slots; the draft carries that shape.
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("edit this", [
      {
        title: "Edit", kind: "generation", service: "qwen-image-edit",
        params: { prompt: "blue", image1: null, image2: null, image3: null },
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.service).toBe("qwen-image-edit")
    // The seeded keys survive hydration → stageSlots sees all three, so
    // the drilldown renders THREE squares (the original regression: the
    // agent-built card used to carry zero slot keys). The IMAGE1 vocabulary
    // (2026-08-09): the primary slot is image1, never input_image; the
    // LanPaint mask is NOT a card slot (the inpaint mod wires it as its
    // own conditioning layer).
    expect(stage.params).toMatchObject({
      prompt: "blue",
      image1: null,
      image2: null,
      image3: null,
    })
    expect(stage.params).not.toHaveProperty("input_image")
    expect(stage.params).not.toHaveProperty("lanpaint_mask")
    expect(stageSlots(stage.params)).toEqual(["image1", "image2", "image3"])
  })

  it("video stages adopt first_frame/last_frame — the 2-slot grid", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("make a video", [
      {
        title: "Video", kind: "generation", service: "ltx-video",
        params: { prompt: "pan", first_frame: null, last_frame: null },
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.service).toBe("ltx-video")
    expect(stage.params).toMatchObject({ first_frame: null, last_frame: null })
    expect(stage.params).not.toHaveProperty("input_image")
    expect(stageSlots(stage.params)).toEqual(["first_frame", "last_frame"])
  })

  it("upscale adopts the single input key (input_image)", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("upscale", [
      {
        title: "Upscale", kind: "generation", service: "seedvr2-ema-3b",
        params: { input_image: null },
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.params).toMatchObject({ input_image: null })
    expect(stageSlots(stage.params)).toEqual(["input_image"])
  })

  it("never clobbers a value the agent set explicitly (escape hatch)", async () => {
    // The backend's null-seed skips keys the agent set — the draft carries
    // the explicit value; hydration must not clobber it either.
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("edit with my image", [
      {
        title: "Edit", kind: "generation", service: "qwen-image-edit",
        params: { prompt: "blue", image2: "already-set.png", image1: null, image3: null },
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.params.image2).toBe("already-set.png")
    // The other slots still seed — partial grid (IMAGE1 vocabulary: the
    // primary slot is image1, the phantom input_image is gone).
    expect(stage.params.image1).toBeNull()
    expect(stage.params.image3).toBeNull()
  })

  it("non-generation stages (chain/studio-link) never seed", async () => {
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("pose studio", [
      {
        title: "Pose", kind: "studio-link", service: "pose_studio", params: {},
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.params).toEqual({})
  })

  it("hydrateDraft never re-seeds or re-folds — the backend wrote the draft (no second source of truth)", async () => {
    // A draft with UNSEEDED params arrives as-is: the store is a dumb
    // renderer. If the frontend started null-seeding again (the old
    // build_flow behavior), this test screams.
    await useAgentFlowStore.getState().hydrateDraft(makeDraft("bare", [
      {
        title: "Edit", kind: "generation", service: "qwen-image-edit",
        params: { prompt: "bare" },
      },
    ]))
    const stage = useAgentFlowStore.getState().flow!.stages[0]
    expect(stage.params).toEqual({ prompt: "bare" })
    expect(stageSlots(stage.params)).toEqual([])
  })
})
