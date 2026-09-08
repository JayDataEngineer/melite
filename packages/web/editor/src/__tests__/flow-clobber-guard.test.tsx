// flow-clobber-guard.test.tsx — the CLOBBER GUARD (2026-08-09).
//
// THE BUG: clicking the wand icon ("Open as cards") on a sidebar asset
// silently OBLITERATED the composed flow. loadRun (and loadFlowSpec)
// replaced the entire store with zero confirmation, and the store is
// in-memory (no prod persistence) — the user's work was GONE.
//
// THE FIX: loadRun confirms before replacing a non-empty flow. An
// empty canvas loads freely (no friction).
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
  apiJson: vi.fn(),
}))
vi.mock("@/rpc/editorClient", async () => {
  const actual = await vi.importActual<typeof import("@/rpc/editorClient")>("@/rpc/editorClient")
  return {
    ...actual,
    editorClient: {
      ...actual.editorClient,
      fetchRunStatus: vi.fn(),
    },
  }
})
vi.mock("sonner", () => {
  const fn = vi.fn()
  return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})

import { useLibraryFlowStore } from "../surfaces/flow/flowStore"
import { editorClient } from "@/rpc/editorClient"

const RUN_STATUS = {
  run_id: "r1",
  flow: "YAML",
  status: "done",
  total: 1,
  stages: [
    {
      id: "s0", name: "generate_image", family_id: "generate_image",
      title: "Gen", status: "done", url: "/out.png",
      inputs: [] as string[], outputs: ["img"], consumes: [] as string[],
      params: { prompt: "x" }, secs: 1,
    },
  ],
}

beforeEach(() => {
  useLibraryFlowStore.getState().clear()
  vi.mocked(editorClient.fetchRunStatus).mockReset()
  vi.mocked(editorClient.fetchRunStatus).mockResolvedValue(RUN_STATUS as never)
  // jsdom doesn't define window.confirm — install a stub (default: cancel).
  window.confirm = vi.fn().mockReturnValue(false)
})
afterEach(() => { vi.clearAllMocks() })

describe("CLOBBER GUARD — loadRun never silently destroys a flow", () => {
  async function seedFlow() {
    useLibraryFlowStore.getState().startFlow("my composed flow")
    await useLibraryFlowStore.getState().addStage({
      kind: "generation", service: "flux-dev", title: "My Card", params: { prompt: "mine" },
    })
  }

  it("existing flow + user CANCELS → flow is preserved (the fix)", async () => {
    await seedFlow()
    const before = useLibraryFlowStore.getState().flow!
    vi.mocked(window.confirm).mockReturnValue(false)

    await useLibraryFlowStore.getState().loadRun("intent", RUN_STATUS as never)

    const after = useLibraryFlowStore.getState().flow
    expect(after).toBe(before) // ref-equal — NOTHING changed
    expect(after!.stages).toHaveLength(1)
    expect(after!.stages[0].title).toBe("My Card")
    expect(window.confirm).toHaveBeenCalledTimes(1)
  })

  it("existing flow + user CONFIRMS → flow is replaced", async () => {
    await seedFlow()
    vi.mocked(window.confirm).mockReturnValue(true)

    await useLibraryFlowStore.getState().loadRun("intent", RUN_STATUS as never)

    const after = useLibraryFlowStore.getState().flow!
    expect(after.stages[0].title).toBe("Gen") // the RUN's stage, not "My Card"
  })

  it("empty canvas → loads freely, NO confirm dialog (no friction)", async () => {
    vi.mocked(window.confirm).mockReturnValue(true) // should NOT be called
    expect(useLibraryFlowStore.getState().flow).toBeNull()

    await useLibraryFlowStore.getState().loadRun("intent", RUN_STATUS as never)

    expect(window.confirm).not.toHaveBeenCalled()
    expect(useLibraryFlowStore.getState().flow!.stages[0].title).toBe("Gen")
  })
})
