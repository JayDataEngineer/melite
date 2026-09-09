// wire-phantom-reconcile.test.ts — THE WIRE ADOPTION P3 consumer
// gates: the reload-phantom sanitize (setFlowThread) keeps its sync
// pending flip AND fires the server-side truth check — a known+live
// wire row surfaces the "still live" toast; absent/gone rows stay
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

function liveFetch(runStatus: string) {
  return vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
    const frame = JSON.parse(String(init?.body)) as { rpcId: string; payload: { args: { run_id: string } } }
    return new Response(JSON.stringify({
      type: "server-response",
      rpcId: frame.rpcId,
      result: { ok: true, value: { run_id: frame.payload.args.run_id, known: true, status: runStatus } },
    }), { status: 200, headers: { "content-type": "application/json" } })
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
  it("live wire row: sync flip stands AND the still-live truth toasts", async () => {
    localStorage.setItem(agentKey("t-live"), JSON.stringify(phantomDoc("run-9")))
    globalThis.fetch = liveFetch("running")

    agentStore().setFlowThread("t-live")
    // Sync behavior unchanged: gates unlock immediately.
    expect(agentStore().flow?.stages[0].status).toBe("pending")
    await probeSettled()

    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("tracking was lost"))).toBe(true)
    expect(messages.some((m) => m.includes("run-9") && m.includes("still live"))).toBe(true)
  })

  it("queued wire row is live truth too", async () => {
    localStorage.setItem(agentKey("t-q"), JSON.stringify(phantomDoc("run-10")))
    globalThis.fetch = liveFetch("queued")

    agentStore().setFlowThread("t-q")
    await probeSettled()

    const messages = useToastStore.getState().toasts.map((t) => t.message)
    expect(messages.some((m) => m.includes("run-10") && m.includes("still live"))).toBe(true)
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
