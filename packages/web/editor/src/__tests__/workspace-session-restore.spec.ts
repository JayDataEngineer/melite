// workspace-session-restore — the refresh contract (2026-08-15).
//
// "When we refresh the page, I'd like to return to the tab I was on —
// agent if I left on agent, the library if I left on library. Also, when
// I refresh, my last library flow in the center view should be
// preserved."
//
// Two orthogonal mechanisms, both pinned here:
//   1. TAB: activeSurfaceStore persists every setActiveTab and lazily
//      re-initializes from it — validated, with the startup default
//      ("library") whenever nothing valid was stored.
//   2. CANVAS: setFlowThread records the live thread
//      (LAST_CANVAS_THREAD_KEY); storePersistence's boot restore reads it
//      back through the SAME setFlowThread path — the exact doc the
//      refresh interrupted, Library tab included (boot restore is the
//      only path — the canvas mounts only when its tab is active).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { FlowDoc, FlowStage } from "@melite/contracts"
import {
  LAST_CANVAS_THREAD_KEY,
  readLastCanvasThread,
  agentFlowKey,
} from "../surfaces/flow/flowThreadKeys"

const ACTIVE_TAB_KEY = "melite:workspace:activeTab:v1"

const stage = (id: string): FlowStage => ({
  id,
  title: `Card ${id}`,
  kind: "generation",
  service: "flux-dev",
  params: { prompt: "preserve me" },
  inputs: [],
  result: null,
  status: "pending",
  error: null,
  cacheKey: null,
})

const doc = (intent: string): FlowDoc => ({
  id: "p_boot",
  intent,
  stages: [stage("s1")],
  status: "ready",
  createdAt: 1,
  completedAt: null,
})

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  localStorage.clear()
})

// ── 1. Tab restore ────────────────────────────────────────────────────────
describe("activeSurfaceStore — refresh returns to the tab I left", () => {
  it("defaults to the Library canvas when nothing was persisted", async () => {
    const { useActiveSurfaceStore, STARTUP_TAB } = await import(
      "../surfaces/shared/activeSurfaceStore"
    )
    expect(useActiveSurfaceStore.getState().activeTab).toBe(STARTUP_TAB)
    expect(useActiveSurfaceStore.getState().activeTab).toBe("library")
  })

  it("setActiveTab persists the tab; a fresh boot re-initializes on it", async () => {
    {
      const { useActiveSurfaceStore } = await import("../surfaces/shared/activeSurfaceStore")
      useActiveSurfaceStore.getState().setActiveTab("library")
    }
    expect(localStorage.getItem(ACTIVE_TAB_KEY)).toBe("library")

    // A reload: the module re-evaluates and the initializer reads the key.
    vi.resetModules()
    const { useActiveSurfaceStore } = await import("../surfaces/shared/activeSurfaceStore")
    expect(useActiveSurfaceStore.getState().activeTab).toBe("library")
  })

  it("a stale/garbage stored tab falls back at the RENDER PICK — never a blank center", async () => {
    // §8.2 (2026-08-19): validation moved from store-init (the dead
    // KNOWN_TABS hand list) to the render pick — the store holds the raw
    // string; the layout renders STARTUP_TAB's entry when nothing
    // registers the id. This test pins that new contract end-to-end.
    localStorage.setItem(ACTIVE_TAB_KEY, "stretchy") // an ARCHIVED tab id
    const { useActiveSurfaceStore, STARTUP_TAB } = await import(
      "../surfaces/shared/activeSurfaceStore"
    )
    const { centerEntry } = await import("../shell/centerEntries")
    // The store holds the raw stale string (persisted as-is)...
    expect(useActiveSurfaceStore.getState().activeTab).toBe("stretchy")
    // ...but nothing registers it, and the startup fallback IS registered
    // — the layout's pick (WorkspaceLayout §8.2) renders STARTUP_TAB's
    // entry, never a blank center.
    const entries = (
      await import("../shell/seats")
    ).shellSlots.entriesOfSlot("center.tabs")
    expect(centerEntry(entries, "stretchy")).toBeNull()
    expect(centerEntry(entries, STARTUP_TAB)?.id).toBe("library")
  })
})

// ── 2. Canvas restore ─────────────────────────────────────────────────────
describe("boot canvas restore — the last library flow survives refresh", () => {
  it("setFlowThread records the live thread (named + threadless)", async () => {
    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    useAgentFlowStore.getState().setFlowThread("t9")
    expect(readLastCanvasThread()).toBe("t9")
    useAgentFlowStore.getState().setFlowThread(null)
    expect(readLastCanvasThread()).toBeNull()
  })

  it("restoreBootCanvas brings back the exact doc the refresh interrupted", async () => {
    // The session ended on the LIBRARY canvas, in conversation t9, with
    // this doc mirrored under t9's key + the pointer recorded.
    localStorage.setItem(agentFlowKey("t9"), JSON.stringify(doc("my library flow")))
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, "t9")

    // A reload: storePersistence re-evaluates → its module-eval restore
    // runs → the fresh store boots with the doc + the right thread.
    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")
    const st = useAgentFlowStore.getState()
    expect(st.threadId).toBe("t9")
    expect(st.flow?.intent).toBe("my library flow")
    expect(st.flow?.stages).toHaveLength(1)
  })

  it("a threadless library flow (default chat) restores from the legacy key", async () => {
    localStorage.setItem(agentFlowKey(null), JSON.stringify(doc("threadless work")))
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, "")

    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")
    const st = useAgentFlowStore.getState()
    expect(st.threadId).toBeNull()
    expect(st.flow?.intent).toBe("threadless work")
  })

  it("no pointer (fresh visit) boots EMPTY — the fresh-chat rule stands", async () => {
    // Snapshots exist from an old session, but no canvas was live at the
    // last exit: nothing resurrects into a brand-new conversation.
    localStorage.setItem(agentFlowKey("t_old"), JSON.stringify(doc("old session")))

    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")
    expect(useAgentFlowStore.getState().flow).toBeNull()
  })

  it("a CLEARED canvas stays cleared on refresh — no surprise resurrection", async () => {
    // The user cleared the canvas before refreshing: the mirror wrote
    // null under the live thread's key. Restore must honor that.
    localStorage.setItem(agentFlowKey("t2"), JSON.stringify(null))
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, "t2")

    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")
    const st = useAgentFlowStore.getState()
    expect(st.threadId).toBe("t2")
    expect(st.flow).toBeNull()
  })

  it("an evicted/missing snapshot degrades to an empty canvas, never a crash", async () => {
    // Quota eviction removed t3's doc but the pointer survived.
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, "t3")

    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")
    expect(useAgentFlowStore.getState().flow).toBeNull()
  })

  it("the boot restore composes: same id keeps the doc (no swap flash)", async () => {
    localStorage.setItem(agentFlowKey("t9"), JSON.stringify(doc("restored at boot")))
    localStorage.setItem(LAST_CANVAS_THREAD_KEY, "t9")

    const { useAgentFlowStore } = await import("../surfaces/flow/flowStore")
    await import("../surfaces/flow/storePersistence")

    // Re-selecting the SAME thread after the boot restore is the common
    // refresh case: setFlowThread early-returns, the boot-restored doc
    // survives (no empty-frame flash); a different id swaps, as thread
    // navigation does.
    useAgentFlowStore.getState().setFlowThread("t9")
    expect(useAgentFlowStore.getState().flow?.intent).toBe("restored at boot")
  })
})
