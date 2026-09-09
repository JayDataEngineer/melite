// wire-phantom-reconcile.test.ts — THE WIRE ADOPTION P3 consumer
// gates: the reload-phantom sanitize (setFlowThread) keeps its sync
// pending flip AND fires the server-side truth check. P3 first
// consumer (toast-only) re-pinned 2026-09-10 to the SECOND consumer:
// a known+live wire row RE-ATTACHES the poll (stages resume live
// tracking, completion rides _finishChainRun); absent/gone rows stay
// silent (fallback law). probeRunStatus never throws, so the store
// path cannot break even when /api is missing.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { useAgentFlowStore } from "@/surfaces/flow/flowStore"
import type { FlowDoc } from "@melite/contracts"
import { useToastStore } from "@melite/ui"
// Side-effect import: attach the persist/rehydrate subscribers (the same
// module main.tsx imports in the app). Without it, no mirror exists.
import "@/surfaces/flow/storePersistence"

const agentStore = () => useAgentFlowStore.getState()
const AGENT_PREFIX = "melite:flow:v2:agent"
const agentKey = (tid: string) => `${AGENT_PREFIX}:${tid}`

const realFetch = globalThis.fetch
function flowKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith("melite:flow:")) keys.push(k)
  }
  return keys
}
// The truth check is fire-and-forget (no await in the sync action) —
// flush macrotasks so the mocked fetch round-trip lands.
const probeSettled = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0))
}

function phantomDoc(runId?: string): FlowDoc {
  return {
    id: "p_phantom", intent: "phantom thread",
    stages: [{
      id: "s1", title: "Stranded", kind: "generation",
      service: "flux-dev", params: { prompt: "x" },
      inputs: [], result: null, status: "running",
      error: null, cacheKey: null,
      ...(runId === undefined ? {} : { runId }),
    }],
    status: "running", createdAt: Date.now(), completedAt: null,
  }
}

// Routes by URL: the wire probe answers /api/*, the re-attached poll
// answers /v1/flows/status/* — one mock for the whole round-trip.
// terminal "vanished" answers the status leg 404 (server restarted
// mid-re-attach); omitted terminal answers "completed" first tick.
function reattachFetch(runStatus: string, terminal?: "vanished") {
  return vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = String(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    if (url.includes("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; payload: { args: { run_id: string } } }
      return new Response(JSON.stringify({
        type: "server-response",
        rpcId: frame.rpcId,
        result: { ok: true, value: { run_id: frame.payload.args.run_id, known: true, status: runStatus } },
      }), { status: 200, headers: { "content-type": "application/json" } })
    }
    if (url.includes("/v1/flows/status/")) {
      if (terminal === "vanished") return new Response("gone", { status: 404 })
      const runId = url.split("/v1/flows/status/")[1]?.split("?")[0] ?? "run-?"
      return new Response(JSON.stringify({
        run_id: runId,
        status: "completed",
        stages: [{ id: "s1", name: "Stranded", index: 0, status: "done" }],
      }), { status: 200, headers: { "content-type": "application/json" } })
    }
    return new Response("not found", { status: 404 })
  }) as unknown as typeof fetch
}

beforeEach(async () => {
  useAgentFlowStore.getState().clear()
  useAgentFlowStore.getState().setFlowThread(null)
  useToastStore.setState({ toasts: [] })
  await new Promise((r) => setTimeout(r, 170))
  for (const k of flowKeys()) localStorage.removeItem(k)
  useToastStore.setState({ toasts: [] })
})

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

describe("phantom reconcile over the Connection transport", () => {
  it("live wire row: sync flip stands, poll re-attaches, completion finishes", async () => {
    localStorage.setItem(agentKey("t-live"), JSON.stringify(phantomDoc("run-9")))
    globalThis.fetch = reattachFetch("running")

    agentStore().setFlowThread("t-live")
    // Sync behavior unchanged: gates unlock immediately.
    expect(agentStore().flow?.stages[0].status).toBe("pending")
    await probeSettled()

    // The re-attached poll rode the mocked status leg to completion:
    // stages done, run recorded, tracking cleared.
    expect(agentStore().flow?.stages[0].status).toBe("done")
    expect(agentStore().flow?.flowRunId).toBe("run-9")
    expect(agentStore()._abort).toBeNull()
    expect(agentStore().runningStageId).toBeNull()
    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("tracking was lost"))).toBe(true)
    expect(messages.some((m) => m.includes("run-9") && m.includes("still live"))).toBe(true)
    expect(messages.some((m) => m.includes("re-attached"))).toBe(true)
  })

  it("queued wire row is live truth too (re-attaches)", async () => {
    localStorage.setItem(agentKey("t-q"), JSON.stringify(phantomDoc("run-10")))
    globalThis.fetch = reattachFetch("queued")

    agentStore().setFlowThread("t-q")
    await probeSettled()

    expect(agentStore().flow?.stages[0].status).toBe("done")
    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("run-10") && m.includes("still live"))).toBe(true)
    expect(messages.some((m) => m.includes("re-attached"))).toBe(true)
  })

  it("run vanishes mid-re-attach: stages fail VISIBLY, never fake-running", async () => {
    localStorage.setItem(agentKey("t-vanish"), JSON.stringify(phantomDoc("run-13")))
    globalThis.fetch = reattachFetch("running", "vanished")

    agentStore().setFlowThread("t-vanish")
    expect(agentStore().flow?.stages[0].status).toBe("pending")
    await probeSettled()

    expect(agentStore().flow?.stages[0].status).toBe("error")
    expect(String(agentStore().flow?.stages[0].error)).toContain("gone")
    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("run-13") && m.includes("failed"))).toBe(true)
  })

  it("a newer tracked run wins: live verdict falls back to toast-only (no steal)", async () => {
    localStorage.setItem(agentKey("t-steal"), JSON.stringify(phantomDoc("run-14")))
    globalThis.fetch = reattachFetch("running")

    agentStore().setFlowThread("t-steal")
    // A run starts while the probe is in flight — the re-attach must
    // never steal its _abort/runningStageId.
    useAgentFlowStore.setState({ _abort: new AbortController(), runningStageId: "s1" })
    await probeSettled()

    expect(agentStore().flow?.stages[0].status).toBe("pending")
    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("run-14") && m.includes("left alone"))).toBe(true)
    expect(messages.some((m) => m.includes("re-attached"))).toBe(false)
  })

  it("thread switch mid-probe: stale verdict stays silent", async () => {
    localStorage.setItem(agentKey("t-stale"), JSON.stringify(phantomDoc("run-15")))
    globalThis.fetch = reattachFetch("running")

    agentStore().setFlowThread("t-stale")
    agentStore().setFlowThread(null)
    await probeSettled()

    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("run-15"))).toBe(false)
  })

  it("unclaimed channel (404): flip stands, no still-live toast (fallback law)", async () => {
    localStorage.setItem(agentKey("t-old"), JSON.stringify(phantomDoc("run-11")))
    globalThis.fetch = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof fetch

    agentStore().setFlowThread("t-old")
    expect(agentStore().flow?.stages[0].status).toBe("pending")
    await probeSettled()

    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("tracking was lost"))).toBe(true)
    expect(messages.some((m) => m.includes("still live"))).toBe(false)
  })

  it("gone row (known:false): flip stands, silent", async () => {
    localStorage.setItem(agentKey("t-gone"), JSON.stringify(phantomDoc("run-12")))
    globalThis.fetch = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string }
      return new Response(JSON.stringify({
        type: "server-response",
        rpcId: frame.rpcId,
        result: { ok: true, value: { run_id: "run-12", known: false, status: null } },
      }), { status: 200, headers: { "content-type": "application/json" } })
    }) as unknown as typeof fetch

    agentStore().setFlowThread("t-gone")
    await probeSettled()

    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("still live"))).toBe(false)
  })

  it("phantom stage without a runId: no probe fires (no fetch call)", async () => {
    localStorage.setItem(agentKey("t-norun"), JSON.stringify(phantomDoc()))
    const fetchMock = vi.fn(async () => new Response("not found", { status: 404 })) as unknown as typeof fetch
    globalThis.fetch = fetchMock

    agentStore().setFlowThread("t-norun")
    expect(agentStore().flow?.stages[0].status).toBe("pending")
    await probeSettled()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
