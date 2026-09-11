// additive-seed-store.spec.tsx — the STORE half of the "can't upload
// images into image ops" regression (2026-08-21).
//
// ParamEditor's card-open seed null-seeds the declared input slots
// (input_image/image2/image3) and auto-saves them. That commit is purely
// additive — and updateStageParams's ADDITIVE-NORMALIZATION branch used
// to return {ok:true} WITHOUT set(), on the assumption that "the UI
// shows the full form from ParamEditor's seeded draft". False for
// slot-driven surfaces: the Inputs section (SlotGrid) renders from
// STAGE.PARAMS via stageSlots() = declared vocab ∩ params-keys. The
// swallowed keys meant fresh image-op cards rendered NO input squares,
// accepted NO uploads, and the localStorage mirror never carried them.
//
// The fix is a NEUTRAL COMMIT: apply the additive keys, but never mark
// stale and never recompute keys (the additive values are schema
// defaults/null slots the backend applies anyway — the existing result
// and cacheKey stay valid, which was the branch's original point).
import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
  const fn = vi.fn()
  return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})

import { useAgentFlowStore } from "../surfaces/flow/flowStore"

function seedStore() {
  useAgentFlowStore.setState({
    flow: {
      id: "d1",
      name: "edit-doc",
      output_dir: "/tmp/x",
      status: "ready",
      shared: {},
      stages: [
        {
          id: "s0",
          title: "Edit Image",
          kind: "generation",
          service: "qwen-img-edit-2511",
          // FRESH card: catalog defaults only — NO slot keys.
          params: { prompt: "", width: 1024 },
          inputs: [],
          result: null,
          status: "pending",
          error: null,
          cacheKey: "k1",
          provenance: "user",
        },
      ],
    } as never,
  })
}

describe("updateStageParams additive normalization", () => {
  beforeEach(() => {
    seedStore()
  })

  it("APPLIES the null-seeded slot keys (neutral — no stale marking)", async () => {
    // Exactly what ParamEditor's auto-save sends after
    // applySpecVocabulary seeds the declared input slots.
    await useAgentFlowStore.getState().updateStageParams("s0", {
      input_image: null,
      image2: null,
      image3: null,
    })

    const p = useAgentFlowStore.getState().flow!
    // THE regression: the keys must LAND — SlotGrid renders from these.
    expect("input_image" in p.stages[0].params).toBe(true)
    expect("image2" in p.stages[0].params).toBe(true)
    expect("image3" in p.stages[0].params).toBe(true)
    expect(p.stages[0].params.input_image).toBe(null)
    // Neutral: a freshly-opened card is NOT stale for its own seed.
    expect(p.status).not.toBe("stale")
    // Existing values untouched.
    expect(p.stages[0].params.prompt).toBe("")
    expect(p.stages[0].params.width).toBe(1024)
  })

  it("a REAL value edit still marks the flow stale", async () => {
    await useAgentFlowStore.getState().updateStageParams("s0", {
      prompt: "a red boat",
    })
    const p = useAgentFlowStore.getState().flow!
    expect(p.stages[0].params.prompt).toBe("a red boat")
    expect(p.status).toBe("stale")
  })

  it("omitted keys are PRESERVED (merge never deletes — mod-bag law)", async () => {
    // Land the slots (neutral), then commit a payload WITHOUT image3:
    // updateStageParams merges {...stage.params, ...params}, so an
    // omitted key survives — the same ownership rule that protects a
    // just-added mod bag from a stale ParamEditor snapshot.
    await useAgentFlowStore.getState().updateStageParams("s0", {
      input_image: null,
      image2: null,
      image3: null,
    })
    await useAgentFlowStore.getState().updateStageParams("s0", { prompt: "hi" })
    const p = useAgentFlowStore.getState().flow!
    expect("image3" in p.stages[0].params).toBe(true)
    expect("input_image" in p.stages[0].params).toBe(true)
    expect(p.stages[0].params.prompt).toBe("hi")
    expect(p.status).toBe("stale")
  })
})
