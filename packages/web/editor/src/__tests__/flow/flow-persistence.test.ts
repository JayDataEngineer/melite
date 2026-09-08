// flow-persistence.test.ts — the ALWAYS-ON localStorage persistence
// proof (2026-08-09).
//
// THIS EPHEMERAL LOST ON BROWSER REFRESH EVER." This test proves the
// flow store mirrors to localStorage on every change and can be
// rehydrated from it — simulating a browser refresh / tab close + reopen.
import { describe, it, expect, beforeEach } from "vitest"
import { useLibraryFlowStore, useAgentFlowStore } from "@/surfaces/flow/flowStore"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"
import type { FlowDoc } from "@melite/contracts"
// Side-effect import: attach the persist/rehydrate subscribers (the same
// module main.tsx imports in the app). Without it, no mirror exists in tests.
import "@/surfaces/flow/storePersistence"

const PREFIX = "melite:flow:"

function flowKeys(): string[] {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX)) keys.push(k)
    }
  return keys
    }

/** F1 (2026-09-01): the mirror COALESCES burst writes — it trails the last
 * change by ≤150 ms (drag storms used to stringify the whole doc per
 * pointermove). Assertions on localStorage let the trailing write land.
 * Real timers — the production debounce uses setTimeout. */
const mirrorSettled = () => new Promise((r) => setTimeout(r, 170))

beforeEach(async () => {
    useLibraryFlowStore.getState().clear()
    // Agent store: fresh thread (null) + no flow. clear() also mirrors
    // null to the current thread's key; setFlowThread(null) normalizes
    // the thread id so tests can't leak a thread across cases.
    useAgentFlowStore.getState().clear()
    useAgentFlowStore.getState().setFlowThread(null)
  // Fire any trailing mirror write from the PREVIOUS case (or this clear)
  // into the cleaned store, THEN wipe the keys — hermetic per test.
  await mirrorSettled()
  for (const k of flowKeys()) localStorage.removeItem(k)
})

describe("flow persistence — ALWAYS-ON localStorage mirror", () => {
  it("seeding a flow writes it to localStorage (the subscriber fires)", async () => {
    await useLibraryFlowStore.getState().startFlow("my persistent flow")
    await useLibraryFlowStore.getState().addStage({
      kind: "generation", service: "flux-dev", title: "Persisted Card",
      params: { prompt: "persisted" },
})
    await mirrorSettled()

    const keys = flowKeys()
    expect(keys.length).toBeGreaterThan(0)
    
    const persisted = JSON.parse(localStorage.getItem(keys[0])!)
    expect(persisted.intent).toBe("my persistent flow")
    expect(persisted.stages).toHaveLength(1)
    expect(persisted.stages[0].title).toBe("Persisted Card")
})

  it("a fresh chat starts EMPTY for BOTH view names — no module-eval resurrection (2026-08-13)", () => {
    // The merged store keeps the AGENT semantic: nothing resurrects at
    // module-eval, for either view name. Seed the RETIRED library key AND
    // the legacy agent key, then prove neither the canvas (library name)
    // nor the chat cards (agent name) see a doc until a conversation
    // actually restores it via setFlowThread(savedThreadId) — covered
    // in the agent describe below. This is the old library store's
    // synchronous rehydrate, killed by the merge.
    const doc: FlowDoc = {
      id: "p_stale", intent: "stale session doc",
      stages: [{
        id: "s1", title: "Stale", kind: "generation",
        service: "flux-dev", params: { prompt: "x" },
        inputs: [], result: null, status: "done",
        error: null, cacheKey: null,
      }],
      status: "ready", createdAt: Date.now(), completedAt: null,
    }
    localStorage.setItem("melite:flow:v2:library", JSON.stringify(doc))
    localStorage.setItem(AGENT_PREFIX, JSON.stringify(doc))
    expect(useAgentFlowStore.getState().flow).toBeNull()
    expect(useLibraryFlowStore.getState().flow).toBeNull()
  })

  it("clearing the flow mirrors null to localStorage (no stale disk copy)", async () => {
    await useLibraryFlowStore.getState().startFlow("ephemeral")
    await mirrorSettled()
    const keys = flowKeys()
    expect(keys.length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem(keys[0])!).intent).toBe("ephemeral")

    useLibraryFlowStore.getState().clear()
    await mirrorSettled()

    // After clear, the persisted value is null — a stale flow doesn't
    // linger on disk after the user clears the canvas.
    expect(JSON.parse(localStorage.getItem(keys[0])!)).toBeNull()
})
})

// ── Agent-store thread-keying (2026-08-12) ────────────────────────────────
// THE BUG it fixes: "flows / cards in the AI history session do not
// persist." The agent store was ONE global slot — a flow built in thread
// A vanished from the cards when the user reopened thread B, and a reload
// restored only whatever was last globally active (often the wrong thread's
// flow, or nothing at all). THE FIX: the agent store is thread-keyed —
// each conversation's flow snapshot lives under
// `melite:flow:v2:agent:<threadId>`, `setFlowThread()` swaps the store
// to the selected conversation's snapshot (or clears it for a new chat),
// and a flow built on the as-yet-unnamed default chat moves to the
// thread's key the moment AutoThreadPersister mirrors its id.
const agentStore = () => useAgentFlowStore.getState()

const AGENT_PREFIX = "melite:flow:v2:agent"
const agentKey = (tid: string | null) =>
  tid ? `${AGENT_PREFIX}:${tid}` : AGENT_PREFIX

const descriptor = (title: string) => ({
  title,
  kind: "generation" as const,
  service: "flux-dev",
  params: { prompt: title },
})

describe("agent flow persistence — per-thread snapshots", () => {
  it("a flow built on a named thread persists under THAT thread's key", async () => {
    agentStore().setFlowThread("t1")
    await agentStore().hydrateDraft(makeDraft("thread one", [descriptor("Card A")]))
    await mirrorSettled()

    const raw = localStorage.getItem(agentKey("t1"))
    expect(raw).not.toBeNull()
    const persisted = JSON.parse(raw!)
    expect(persisted.intent).toBe("thread one")
    expect(persisted.stages).toHaveLength(1)
    // The plain legacy key is untouched — no cross-thread bleed.
    expect(localStorage.getItem(AGENT_PREFIX)).toBeNull()
  })

  it("switching threads swaps the store to that conversation's snapshot", async () => {
    agentStore().setFlowThread("t1")
    await agentStore().hydrateDraft(makeDraft("thread one", [descriptor("Card A")]))
    await mirrorSettled() // the swap-back restore reads the thread key

    // Navigate away to a conversation with no flow → store clears.
    agentStore().setFlowThread("t2")
    expect(agentStore().flow).toBeNull()

    // Navigate back → the snapshot is restored. This is the reload /
    // history-nav path: the thread's own cards come back.
    agentStore().setFlowThread("t1")
    expect(agentStore().flow?.intent).toBe("thread one")
    expect(agentStore().flow?.stages[0].title).toBe("Card A")
  })

  it("a new chat (null thread) clears the store", async () => {
    agentStore().setFlowThread("t1")
    await agentStore().hydrateDraft(makeDraft("thread one", [descriptor("Card A")]))

    agentStore().setFlowThread(null)
    expect(agentStore().flow).toBeNull()
  })

  it("a reload restores the thread's snapshot WITHOUT a module-eval seed", () => {
    // Simulate the previous session: thread t1 has a persisted snapshot and
    // the user is mid-session on it. On reload the agent store starts EMPTY
    // (no global seed — a fresh chat must not resurrect the last flow).
    expect(agentStore().flow).toBeNull()
    const flow: FlowDoc = {
      id: "p_restored", intent: "restored thread one",
      stages: [{
        id: "s1", title: "Survivor", kind: "generation",
        service: "flux-dev", params: { prompt: "survived" },
        inputs: [], result: null, status: "done",
        error: null, cacheKey: null,
      }],
      status: "ready", createdAt: Date.now(), completedAt: null,
    }
    localStorage.setItem(agentKey("t1"), JSON.stringify(flow))

    // The restore effect runs setFlowThread(saved.threadId) once the
    // bridge is healthy — the snapshot lands in the store.
    agentStore().setFlowThread("t1")
    expect(agentStore().flow?.intent).toBe("restored thread one")
    expect(agentStore().flow?.stages[0].title).toBe("Survivor")
  })

  it("a flow built on the unnamed default chat MOVES to the mirrored thread key", async () => {
    // Default chat: no thread id yet — the build lands on the legacy key.
    await agentStore().hydrateDraft(makeDraft("default chat", [descriptor("Card A")]))
    await mirrorSettled()
    expect(JSON.parse(localStorage.getItem(AGENT_PREFIX)!).intent).toBe("default chat")

    // AutoThreadPersister mirrors the id after the first run produced
    // messages — the store must not lose the just-built flow, and the
    // reload of THIS thread must find it under the thread key.
    agentStore().setFlowThread("auto-123")
    expect(agentStore().flow?.intent).toBe("default chat")
    expect(localStorage.getItem(agentKey("auto-123"))).not.toBeNull()
    expect(JSON.parse(localStorage.getItem(agentKey("auto-123"))!).intent).toBe("default chat")
  })

  it("an in-progress flow survives a thread switch BACK (no silent clobber)", async () => {
    agentStore().setFlowThread("t1")
    await agentStore().hydrateDraft(makeDraft("thread one", [descriptor("Card A")]))
    await mirrorSettled()
    // Switch to t2 (no snapshot) then back — t1's doc is intact, not null.
    agentStore().setFlowThread("t2")
    agentStore().setFlowThread("t1")
    expect(agentStore().flow?.stages[0].title).toBe("Card A")
  })

  it("the library view name follows the active thread (ONE store)", async () => {
    // 2026-08-13 merge: useLibraryFlowStore IS useAgentFlowStore —
    // the canvas renders the active conversation's doc, and a doc authored
    // through the canvas name is the conversation's flow.
    agentStore().setFlowThread("t1")
    await agentStore().hydrateDraft(makeDraft("thread one", [descriptor("Card A")]))
    expect(useLibraryFlowStore.getState().flow?.intent).toBe("thread one")

    await useLibraryFlowStore.getState().startFlow("canvas authored")
    expect(agentStore().flow?.intent).toBe("canvas authored")
  })
})

describe("NEVER persist ComfyUI's live status (2026-08-12 directive)", () => {
  // Pin a deterministic thread so the merged store writes where we read —
  // the library name is the same instance now, so the doc lands on the
  // active thread's key, not a retired global one.
  beforeEach(() => {
    agentStore().setFlowThread("live")
  })
  // Operator: "the frontend only receives status and is a proxy for the
  // status ComfyUI sends — it should NEVER dictate"; "frontend should
  // never persist state on the status of comfyui". A persisted "running"
  // is a lie the moment it's written — the stream is gone on reload.

  it("a mid-run persist writes stages as PENDING, run-level as ready — no 'running' on disk", async () => {
    await useLibraryFlowStore.getState().startFlow("live doc")
    await useLibraryFlowStore.getState().addStage(descriptor("Live card"))
    const doc = useLibraryFlowStore.getState().flow!
    // A run marks the doc live — stages "running", run-level "running".
    useLibraryFlowStore.setState({
      flow: {
        ...doc,
        status: "running",
        stages: doc.stages.map((s) => ({ ...s, status: "running" as const })),
      },
    })
    await mirrorSettled()
    const persisted = JSON.parse(localStorage.getItem(agentKey("live"))!)
    expect(JSON.stringify(persisted)).not.toContain("running")
    expect(persisted.status).toBe("ready")
    expect(persisted.stages[0].status).toBe("pending")
  })

  it("terminal statuses are artifact facts — they persist untouched", async () => {
    await useLibraryFlowStore.getState().startFlow("done doc")
    await useLibraryFlowStore.getState().addStage(descriptor("Done card"))
    const doc = useLibraryFlowStore.getState().flow!
    useLibraryFlowStore.setState({
      flow: {
        ...doc,
        status: "done",
        stages: doc.stages.map((s) => ({ ...s, status: "done" as const })),      },
    })
    await mirrorSettled()
    const persisted = JSON.parse(localStorage.getItem(agentKey("live"))!)
    expect(persisted.status).toBe("done")
    expect(persisted.stages[0].status).toBe("done")
  })

  it("stripLiveStatus is a pure no-op on clean docs (ref-preserving)", async () => {
    const { stripLiveStatus } = await import("@/surfaces/flow/storePersistence")
    const clean = { status: "ready", stages: [{ id: "a", status: "pending" }] }
    expect(stripLiveStatus(clean)).toBe(clean) // untouched ref — no write
    expect(stripLiveStatus(null)).toBeNull()
    expect(stripLiveStatus("x")).toBe("x")
    const live = { status: "running", stages: [{ id: "a", status: "running" }, { id: "b", status: "done" }] }
    const stripped = stripLiveStatus(live) as Record<string, unknown>
    expect(stripped.status).toBe("ready")
    expect((stripped.stages as Array<{ status: string }>)[0].status).toBe("pending")
    expect((stripped.stages as Array<{ status: string }>)[1].status).toBe("done")
  })
})
