// THE ONE STORE (2026-08-13) — the reverse of the 2026-08-07 "NO LEAKS" pin.
//
// The operator's directive: "Can we have one store? Why have two?" The
// Library canvas and the Agent chat are TWO VIEWS OF THE SAME DOC: a
// flow built by the agent IS the canvas flow ("When the agent
// makes the flow view, can we also have a button that allows us to
// view it in the library tab? So we can edit it from there."), and a
// flow authored on the canvas IS the conversation's flow.
//
// The original 2026-08-07 isolation pinned against "a thousand cards
// everywhere" — the agent tab rendering the library's flow. That bug
// was NOT caused by shared state per se: it was a chat surface bound to a
// GLOBAL doc (the StableFlowMount, deleted 2026-08-07) before
// snapshots were thread-keyed. What keeps the chat clean today:
//  1. THREAD-KEYING (2026-08-12): the one doc is per-conversation —
//     switching chats swaps it, so thread A's flow never bleeds into
//     thread B.
//  2. ONE CARD DESIGN (2026-08-07): the chat cards and the canvas tiles
//     are the SAME FlowTileGrid — there is no second rendering to
//     drift ("THERE IS ONLY ONE DESIGN. NEVER EVER TWO").
//  3. THE NULL-STORE GATE: InlineFlowCards renders NOTHING (not even
//     a spinner) when the store is empty and no build_flow tool call
//     is in flight — the lying forever-spinner on resume was the real
//     leak this file guarded.
//
// This file pins the NEW contract structurally: both names ARE the same
// instance, mutations through one name are visible through the other,
// and the components bind to the shared doc.
import { describe, it, expect, beforeEach } from "vitest"
import {
 useLibraryFlowStore,
 useAgentFlowStore,
} from "@/surfaces/flow/flowStore"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"

beforeEach(() => {
 // The two names share one instance — clearing through either empties the
 // doc (and mirrors null to the current thread's key).
 useAgentFlowStore.getState().clear()
 useAgentFlowStore.getState().setFlowThread(null)
})

describe("flow store — ONE store, two view names (2026-08-13)", () => {
 it("both names ARE the same instance", () => {
  expect(useLibraryFlowStore).toBe(useAgentFlowStore)
 })

 it("a doc hydrated via one name is visible via the other", async () => {
  await useAgentFlowStore.getState().hydrateDraft(makeDraft("shared doc", [
   { title: "One card", kind: "generation", service: "krea2", params: { prompt: "x" } },
  ]))
  // The agent built it — the canvas (library name) sees the same doc.
  expect(useLibraryFlowStore.getState().flow?.stages).toHaveLength(1)

  await useLibraryFlowStore.getState().hydrateDraft(makeDraft("canvas authored", [
   { title: "Canvas card", kind: "generation", service: "krea2", params: {} },
  ]))
  // The canvas authored it — the chat cards (agent name) see it too.
  expect(useAgentFlowStore.getState().flow?.intent).toBe("canvas authored")
 })

 it("clearing through one name empties both (same doc)", async () => {
  await useLibraryFlowStore.getState().hydrateDraft(makeDraft("L", [
   { title: "L1", kind: "generation", service: "krea2", params: {} },
  ]))
  useLibraryFlowStore.getState().clear()
  expect(useLibraryFlowStore.getState().flow).toBeNull()
  expect(useAgentFlowStore.getState().flow).toBeNull()
 })

 it("run state is shared — the canvas and the chat show the same run", async () => {
  await useAgentFlowStore.getState().hydrateDraft(makeDraft("running doc", [
   { title: "R1", kind: "generation", service: "krea2", params: {} },
  ]))
  const stage = useAgentFlowStore.getState().flow!.stages[0]
  useAgentFlowStore.setState({ runningStageId: stage.id })
  expect(useLibraryFlowStore.getState().runningStageId).toBe(stage.id)
 })
})

// ── Component binding ────────────────────────────────────────────────────
// The components bind to their surface's store at MODULE LEVEL — since
// 2026-08-13 both names resolve to the SAME instance, so the canvas and
// the chat cards render the same doc. These imports force the
// tree-shake verifier: if FlowCanvas or InlineFlowCards were to
// bind to anything else, the binding is structurally visible.
import { FlowCanvas } from "@/surfaces/flow/FlowCanvas"
import { InlineFlowCards } from "@/surfaces/flow/InlineFlowCards"
import { LibrarySidebar } from "@/surfaces/library/LibrarySidebar"
import { createElement } from "react"
import { render as renderBase, cleanup } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// LibrarySidebar tiles mount the Radix Tip (tooltip unification 2026-08-14)
// — render under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}
import { vi } from "vitest"

// Mock the catalog fetches (the component-side imports pull modelCatalog).
vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ output: { images: [] as unknown[] } }),
  text: async () => "",
 }),
 apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
 const fn = vi.fn()
 return { toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }) }
})

describe("component ↔ store binding (the shared doc)", () => {
 beforeEach(() => {
  useAgentFlowStore.getState().clear()
  cleanup()
 })

 it("FlowCanvas renders the agent-built flow (the library IS a view of it)", async () => {
  await useAgentFlowStore.getState().hydrateDraft(makeDraft("agent-built", [
   { title: "Agent tile", kind: "generation", service: "krea2", params: {} },
  ]))
  const { container } = renderWithTooltip(createElement(FlowCanvas))
  expect(container.textContent).toContain("Agent tile")
 })

 it("InlineFlowCards renders a canvas-authored doc as cards", async () => {
  await useLibraryFlowStore.getState().hydrateDraft(makeDraft("canvas doc", [
   { title: "Canvas card", kind: "generation", service: "krea2", params: {} },
  ]))
  const { container } = renderWithTooltip(createElement(InlineFlowCards, { toolStatus: "complete" }))
  expect(container.textContent).toContain("Canvas card")
 })

 it("empty store + no in-flight tool renders NOTHING (no lying placeholder)", async () => {
  // The guard that keeps the chat clean: without a doc AND without an
  // active build_flow call, InlineFlowCards renders nothing —
  // no spinner, no stale cards (the resume-forever-spinner bug).
  const { container } = renderWithTooltip(createElement(InlineFlowCards))
  expect(container.textContent).toBe("")
  expect(container.textContent).not.toContain("composing the flow")
 })

 it("LibrarySidebar builds stages on the shared store", async () => {
  renderWithTooltip(createElement(LibrarySidebar))
  // Mounting the sidebar adds nothing by itself; the doc stays empty.
  expect(useAgentFlowStore.getState().flow).toBeNull()
 })
})
