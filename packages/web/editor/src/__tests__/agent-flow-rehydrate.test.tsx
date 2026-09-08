/**
 * Thread rehydration completeness — the "preview gone on thread load" fix.
 *
 * The old flow trusted ONE source: the thread-keyed localStorage snapshot
 * (fast-path: skip the backend GET when store.flow.id === draftId).
 * A degraded snapshot (quota-swallowed post-run write, the pre-LRU
 * wholesale eviction, a pre-PATCH thread) therefore won FOREVER — the
 * zoomed-out action card rendered its placeholder, the img preview never
 * came back, even though the backend had the result on disk.
 *
 * Pinned here:
 *  • snapshotResultsComplete — the pure completeness gate
 *  • hydrateDraft fires _healStageResults — stages without results are
 *    resolved from the backend heal endpoint (draft PATCH result → run
 *    registry) and the card flips done WITH its preview
 *  • InlineFlowCards fast path: COMPLETE snapshot → zero network;
 *    INCOMPLETE snapshot → the heal endpoint is called (no full rehydrate,
 *    so local param edits survive)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { createElement, StrictMode } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

const apiFetchMock = vi.fn()
vi.mock("@melite/catalog/api", () => ({
  apiFetch: (...a: unknown[]) => apiFetchMock(...a),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
  const fn = vi.fn()
  return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})

import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { snapshotResultsComplete, InlineFlowCards } from "../surfaces/flow/InlineFlowCards"
import type { BackendDraft, BackendStage, FlowDoc, FlowStage, StageResult } from "@melite/contracts"

const DONE_RESULT: StageResult = {
  assetUrls: ["/editor/runs/r0/out.png"],
  artifacts: {},
  metadata: { runId: "r0" },
  completedAt: 1,
  durationSec: 1,
}

function stage(overrides: Partial<BackendStage> = {}): BackendStage {
  return {
    id: "s1",
    title: "Generate",
    kind: "generation",
    service: "z-image",
    params: { prompt: "a cat" },
    inputs: [],
    provenance: "agent",
    ...overrides,
  }
}

function draftDoc(stages: BackendStage[], draftId = "d1"): BackendDraft {
  return {
    draft_id: draftId,
    intent: "test intent",
    stages,
    status: "ready",
    createdAt: Date.now(),
    completedAt: null,
  }
}

const HEAL_URL = "/v1/flows/drafts/d1/stages/s1/result"
const HEALED_RESULT = {
  assetUrls: ["/editor/runs/r1/out.png"],
  artifacts: {},
  metadata: { runId: "r1" },
  completedAt: 1234,
  durationSec: 2.5,
}

/**
 * Seed the store with a RESTORED SNAPSHOT — what setFlowThread loads
 * from thread-keyed localStorage on thread switch. This is the exact
 * degraded shape of the bug: the run FINISHED (status "done") but the
 * snapshot lost the result (withResult=false). hydrateDraft cannot produce
 * this shape (it maps runStatus done + no result → "pending"), so the
 * fast-path tests seed the doc directly, exactly as a reloaded snapshot
 * would.
 */
function seedRestoredSnapshot(withResult: boolean): void {
  const s1: FlowStage = {
    id: "s1",
    title: "Generate",
    kind: "generation",
    service: "z-image",
    params: { prompt: "a cat" },
    inputs: [],
    result: withResult ? DONE_RESULT : null,
    // BOTH arms finished the run — only the degraded arm lost the result.
    status: "done",
    error: null,
    cacheKey: null,
    provenance: "agent",
  }
  const flow: FlowDoc = {
    id: "d1",
    intent: "test intent",
    stages: [s1],
    status: withResult ? "done" : "ready",
    createdAt: 1000,
    completedAt: withResult ? 1001 : null,
  }
  useAgentFlowStore.setState({ flow, threadId: "t1" })
}

function strictRender(el: React.ReactElement) {
  // InlineFlowCards renders Tip tooltips (Radix) — the app mounts
  // TooltipProvider at its root; tests wrap the same way.
  return render(createElement(StrictMode, null, createElement(TooltipProvider, null, el)))
}

beforeEach(() => {
  localStorage.clear()
  useAgentFlowStore.getState().clear()
  apiFetchMock.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("snapshotResultsComplete (pure gate)", () => {
  it("complete: every done/cached stage carries assetUrls", () => {
    expect(
      snapshotResultsComplete({
        stages: [
          { status: "done", result: { assetUrls: ["/editor/a.png"] } },
          { status: "pending", result: null },
          { status: "error", result: null },
        ],
      }),
    ).toBe(true)
  })

  it("incomplete: a done stage without a result", () => {
    expect(
      snapshotResultsComplete({
        stages: [{ status: "done", result: null }],
      }),
    ).toBe(false)
  })

  it("incomplete: a done stage with an EMPTY assetUrls array", () => {
    expect(
      snapshotResultsComplete({
        stages: [{ status: "done", result: { assetUrls: [] } }],
      }),
    ).toBe(false)
  })

  it("cached counts as executed (must carry previews too)", () => {
    expect(
      snapshotResultsComplete({
        stages: [{ status: "cached", result: { assetUrls: ["/editor/a.png"] } }],
      }),
    ).toBe(true)
  })
})

describe("hydrateDraft → _healStageResults", () => {
  it("resolves a missing result from the heal endpoint → stage done WITH preview", async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === HEAL_URL) {
        return new Response(
          JSON.stringify({ found: true, source: "run", result: HEALED_RESULT }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    await useAgentFlowStore.getState().hydrateDraft(draftDoc([stage()]))
    const p = useAgentFlowStore.getState().flow
    expect(p?.stages[0].status).toBe("pending") // pre-heal honest state

    await waitFor(() => {
      const st = useAgentFlowStore.getState().flow?.stages[0]
      expect(st?.status).toBe("done")
      expect(st?.result?.assetUrls[0]).toBe("/editor/runs/r1/out.png")
    })
  })

  it("heal miss (404) leaves the stage honestly pending", async () => {
    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === HEAL_URL) {
        return new Response(JSON.stringify({ found: false }), { status: 404 })
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    await useAgentFlowStore.getState().hydrateDraft(draftDoc([stage()]))
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith(HEAL_URL))
    await new Promise((r) => setTimeout(r, 10))
    const st = useAgentFlowStore.getState().flow?.stages[0]
    expect(st?.status).toBe("pending")
    expect(st?.result).toBeNull()
  })

  it("adopted draft results are verified ONCE, never downgraded (run-truth, 2026-08-30)", async () => {
    // Every done+result stage is a VERIFY target: one local GET against
    // the heal door per open — the fetched truth replaces the snapshot
    // ONLY when disk is strictly richer. The default mock answers
    // {ok:true} (no found/result) → the adopted result must survive.
    await useAgentFlowStore.getState().hydrateDraft(
      draftDoc([stage({ runStatus: "done", result: DONE_RESULT })]),
    )
    const st = useAgentFlowStore.getState().flow?.stages[0]
    expect(st?.status).toBe("done")
    expect(st?.result?.assetUrls[0]).toBe("/editor/runs/r0/out.png")
    await new Promise((r) => setTimeout(r, 10))
    // ONE verify probe — not a re-heal storm, not zero (the clip-loss
    // verdict killed the "trust the snapshot" arm).
    expect(apiFetchMock.mock.calls.filter((c) => c[0] === HEAL_URL).length).toBe(1)
    const after = useAgentFlowStore.getState().flow?.stages[0]
    expect(after?.status).toBe("done")
    expect(after?.result?.assetUrls[0]).toBe("/editor/runs/r0/out.png")
  })
})

describe("InlineFlowCards fast path (conditional)", () => {
  const toolResult = JSON.stringify({
    draftId: "d1",
    stages: [{ id: "s1", title: "Generate", kind: "generation", service: "z-image" }],
  })

  it("COMPLETE snapshot → version check + run-truth verify, NO rehydrate (the conditional fast path)", async () => {
    // The 2026-08-30 contract: mount fires ONE conditional draft GET
    // (createdAt = the doc version; same/older → snapshot wins) plus the
    // done-stage verify against the heal door — never a full rehydrate,
    // never result churn when disk is not richer. The mock answers
    // {ok:true} everywhere: no found result → the adopted one stays.
    seedRestoredSnapshot(true)
    strictRender(
      createElement(InlineFlowCards, {
        toolStatus: "complete",
        result: toolResult,
      }),
    )
    await new Promise((r) => setTimeout(r, 20))
    const calls = apiFetchMock.mock.calls.map((c) => c[0] as string)
    // The version check fired exactly once.
    expect(calls.filter((c) => c === "/v1/flows/drafts/d1").length).toBe(1)
    // The done stage's verify fired exactly once.
    expect(calls.filter((c) => c === HEAL_URL).length).toBe(1)
    // The adopted result survived the verify (no downgrade, no churn).
    const st = useAgentFlowStore.getState().flow?.stages[0]
    expect(st?.status).toBe("done")
    expect(st?.result?.assetUrls[0]).toBe("/editor/runs/r0/out.png")
  })

  it("INCOMPLETE snapshot → heal endpoint called, preview restored, params survive", async () => {
    seedRestoredSnapshot(false)
    // Local param edit AFTER the degraded restore — must survive the heal
    // (the heal resolves ONLY results, never a full rehydrate).
    await useAgentFlowStore
      .getState()
      .updateStageParams("s1", { prompt: "an edited cat" })

    apiFetchMock.mockImplementation(async (url: string) => {
      if (url === HEAL_URL) {
        return new Response(
          JSON.stringify({ found: true, source: "run", result: HEALED_RESULT }),
          { status: 200 },
        )
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })

    strictRender(
      createElement(InlineFlowCards, {
        toolStatus: "complete",
        result: toolResult,
      }),
    )

    await waitFor(() => {
      const st = useAgentFlowStore.getState().flow?.stages[0]
      expect(st?.result?.assetUrls[0]).toBe("/editor/runs/r1/out.png")
    })
    const calls = apiFetchMock.mock.calls.map((c) => c[0] as string)
    expect(calls).toContain(HEAL_URL)
    // The conditional version GET may ride (same version → snapshot
    // wins); the no-rehydrate pin is below — the local param edit
    // SURVIVES the heal (a full hydrateDraft would clobber it).
    const st = useAgentFlowStore.getState().flow?.stages[0]
    expect(st?.params.prompt).toBe("an edited cat")
    expect(st?.status).toBe("done")
  })
})

describe("InlineFlowCards slow path failure (no slim fallback, 2026-09-06)", () => {
  // Store EMPTY (beforeEach clears): the slow path fires — the store
  // holds no snapshot of this draft, so the backend doc is the ONLY
  // recreation source. Operator order: a draft that won't recreate
  // ERRORS with its name and a Retry — never ghost cards.
  const toolResult = JSON.stringify({
    draftId: "d9",
    stages: [{ id: "s9", title: "Generate", kind: "generation", service: "z-image" }],
  })

  it("draft GET 500 → named error panel, NO ghost cards in the store", async () => {
    apiFetchMock.mockImplementation(
      async () => new Response("boom", { status: 500 }),
    )
    const view = strictRender(
      createElement(InlineFlowCards, {
        toolStatus: "complete",
        result: toolResult,
      }),
    )
    await waitFor(() => expect(view.getByRole("alert")).toBeTruthy())
    expect(view.getByText(/Couldn't recreate the flow cards/)).toBeTruthy()
    expect(view.getByText(/d9/)).toBeTruthy()
    expect(view.getByText(/HTTP 500/)).toBeTruthy()
    // No ghost recreation: the store stays empty.
    expect(useAgentFlowStore.getState().flow).toBeNull()
  })

  it("double-encoded doc (a JSON string, not an object) → named error, no adoption", async () => {
    // The double-encoded drafts_get door served text here — the old
    // code threw inside hydrateDraft and slim-fell-back to a blank
    // studio. The recreation gate names it instead.
    apiFetchMock.mockImplementation(
      async () =>
        new Response(
          JSON.stringify(JSON.stringify({ draft_id: "d9", stages: [] })),
          { status: 200 },
        ),
    )
    const view = strictRender(
      createElement(InlineFlowCards, {
        toolStatus: "complete",
        result: toolResult,
      }),
    )
    await waitFor(() => expect(view.getByRole("alert")).toBeTruthy())
    expect(view.getByText(/not an object/)).toBeTruthy()
    expect(useAgentFlowStore.getState().flow).toBeNull()
  })

  it("Retry re-fires the GET and hydrates on success", async () => {
    let calls = 0
    apiFetchMock.mockImplementation(async () => {
      calls += 1
      // Fail twice: StrictMode double-fires the mount effect in dev —
      // BOTH attempts must fail before the panel owns the state.
      if (calls <= 2) return new Response("boom", { status: 500 })
      return new Response(JSON.stringify(draftDoc([stage()], "d9")), {
        status: 200,
      })
    })
    const view = strictRender(
      createElement(InlineFlowCards, {
        toolStatus: "complete",
        result: toolResult,
      }),
    )
    await waitFor(() => expect(view.getByRole("alert")).toBeTruthy())
    fireEvent.click(view.getByRole("button", { name: /retry/i }))
    await waitFor(() =>
      expect(useAgentFlowStore.getState().flow?.id).toBe("d9"),
    )
  })
})
