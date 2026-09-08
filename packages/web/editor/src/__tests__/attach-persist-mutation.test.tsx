// attach-persist-mutation.test.tsx — THE "I WAS SENDING AN IMAGE"
// regression (2026-08-23).
//
// The flow persist subscriber (storePersistence.persistAgent) runs
// SYNCHRONOUSLY inside zustand's set(). Its quota guards MUTATE their
// argument in place: stripDataUrls nulls any data: URL over 1KB. It was
// handed the LIVE state.flow — so the moment a card attach wrote a
// multi-KB slot data URL, the mirror pass nulled input_image in the
// IN-MEMORY store. The card kept claiming the image was attached, Run
// read params.input_image === null, and the gateway 400'd "requires an
// input image but none was provided". The attach PROBE showed
// actions.onEditSave called with the real data URL, {"ok":true}
// resolved, and the value gone one statement later.
//
// The fix: the subscriber deep-clones before stripping. The mirror
// still nulls the URL (localStorage quota law, unchanged), but the live
// store keeps the attachment.
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
// THE SUBSCRIBER UNDER TEST: flowStore itself does NOT import the
// persistence side-effect module (the app shell does) — without this
// explicit import the mirror never exists in the test graph and the
// suite passes vacuously. Import it so persistAgent subscribes against
// the SAME singleton store instance.
import "../surfaces/flow/storePersistence"
import { AGENT_FLOW_KEY } from "../surfaces/flow/flowThreadKeys"

// A real attached PNG preview is multi-KB — over the 1KB strip
// threshold, so the OLD in-place pass would have nulled it.
const BIG_DATA_URL = "data:image/png;base64," + "A".repeat(2048)

function seedStore() {
  useAgentFlowStore.setState({
    threadId: null,
    flow: {
      id: "d1",
      name: "mask-doc",
      output_dir: "/tmp/x",
      status: "ready",
      shared: {},
      stages: [
        {
          id: "s0",
          title: "Mask Studio",
          kind: "generation",
          service: "mask-studio",
          params: { detect_mode: "body", output_mode: "segm" },
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

describe("attach persistence — the live store never loses a slot data URL", () => {
  beforeEach(() => {
    seedStore()
    localStorage.clear()
  })

  it("KEEPS a >1KB slot data URL in the in-memory store (the mirror must not mutate live state)", async () => {
    // Exactly what the card's attachImage → onEditSave → updateStageParams
    // does the instant the user attaches an image.
    const res = await useAgentFlowStore.getState().updateStageParams("s0", {
      input_image: BIG_DATA_URL,
    })
    expect(res).toEqual({ ok: true })

    // THE regression: the value must still be there AFTER the persist
    // subscriber ran inside the same set(). Before the fix this read null.
    const p = useAgentFlowStore.getState().flow!
    expect(p.stages[0].params.input_image).toBe(BIG_DATA_URL)
  })

  it("the localStorage MIRROR still strips the >1KB data URL (quota guard unchanged)", async () => {
    await useAgentFlowStore.getState().updateStageParams("s0", {
      input_image: BIG_DATA_URL,
    })
    // F1 (2026-09-01): the mirror trails burst writes by ≤150 ms — let the
    // trailing write land before asserting on localStorage.
    await new Promise((r) => setTimeout(r, 170))
    const raw = localStorage.getItem(AGENT_FLOW_KEY)
    expect(raw).toBeTruthy()
    const doc = JSON.parse(raw as string)
    expect(doc.stages[0].params.input_image).toBeNull()
    // Non-data-URL params ride through untouched.
    expect(doc.stages[0].params.detect_mode).toBe("body")
  })

  it("a SECOND attach survives the first one's mirror write (idempotence)", async () => {
    const OTHER_URL = "data:image/png;base64," + "B".repeat(1500)
    await useAgentFlowStore.getState().updateStageParams("s0", { input_image: BIG_DATA_URL })
    await useAgentFlowStore.getState().updateStageParams("s0", { input_image: OTHER_URL })
    const p = useAgentFlowStore.getState().flow!
    expect(p.stages[0].params.input_image).toBe(OTHER_URL)
  })
})
