/**
 * Real runtime tests for the agent-built flow system.
 *
 * These tests exercise the ACTUAL Zustand store + cache-invalidation engine:
 * • buildFlow materializes descriptors → verifies IDs, cacheKeys, status
 * • updateStageParams marks the stage + downstream stale (cache invalidation)
 * • computeCacheKey cascades — editing stage 0 invalidates stages 1, 2, …
 * • InlineFlowCards renders without infinite loops under StrictMode
 *
 * No mocks of the store logic — we test the REAL implementation. Only the
 * network layer (apiFetch) is mocked, since there's no backend in the test env.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { createElement, StrictMode } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// Mock apiFetch BEFORE importing the store — the store calls it at runtime.
vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn().mockResolvedValue({
 ok: true,
 json: async () => ({ output: { images: ["/fake/test.png"] } }),
 text: async () => "",
 }),
 // modelCatalog (pulled in via the editorClient import chain) imports
 // apiJson — provide a stub so the module graph loads cleanly.
 apiJson: vi.fn(),
}))

// Mock sonner (the toast library) so the real useToastStore works in jsdom.
// The real code calls `sonnerToast(message)` (info) plus `.error`/`.success`
// methods — so the mock must be both callable and carry those methods.
vi.mock("sonner", () => {
 const fn = vi.fn()
 return {
 toast: Object.assign(fn, {
 error: vi.fn(),
 success: vi.fn(),
 info: vi.fn(),
 }),
 }
})

import { useAgentFlowStore } from "../surfaces/flow/flowStore"
import { makeDraft } from "@/__tests__/__fixtures__/backendDraft"
import { apiFetch } from "@melite/catalog"
import type { StageDescriptor } from "@melite/contracts"

function strictRender(el: React.ReactElement) {
 // InlineFlowCards renders Tip tooltips (Radix) — the app mounts
 // TooltipProvider at its root; tests wrap the same way.
 return render(createElement(StrictMode, null, createElement(TooltipProvider, null, el)))
}

beforeEach(() => {
 useAgentFlowStore.getState().clear()
})

afterEach(() => {
 cleanup()
 // Wire tests stub the raw-fetch START POST via vi.stubGlobal — never leak
 // a fetch stub into the next test. The zoom-overlay rect fixture (ONE CARD)
 // spies on getBoundingClientRect — never leak it either.
 vi.unstubAllGlobals()
 vi.restoreAllMocks()
})

describe("buildFlow", () => {
 it("materializes descriptors into stages with stable IDs + cacheKeys", async () => {
 const descriptors: StageDescriptor[] = [
 {
 title: "Generate image",
 kind: "generation",
 service: "krea2",
 params: { prompt: "a waifu", width: 1024, height: 1024 },
 },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("Make me a waifu", descriptors))

 const flow = useAgentFlowStore.getState().flow
 expect(flow).not.toBeNull()
 expect(flow!.intent).toBe("Make me a waifu")
 expect(flow!.stages).toHaveLength(1)
 expect(flow!.stages[0].id).toMatch(/^s_/)
 expect(flow!.stages[0].cacheKey).not.toBeNull()
 expect(flow!.stages[0].status).toBe("pending")
 expect(flow!.stages[0].title).toBe("Generate image")
 })

 it("resolves inputIndices to actual stage IDs in dependency order", async () => {
 const descriptors: StageDescriptor[] = [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "x" } },
 { title: "Upscale", kind: "generation", service: "upscale", params: {}, inputIndices: [0] },
 { title: "Detail", kind: "generation", service: "detail", params: {}, inputIndices: [1] },
 ]
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("chain", descriptors))

 const stages = useAgentFlowStore.getState().flow!.stages
 expect(stages[0].inputs).toEqual([])
 expect(stages[1].inputs).toEqual([stages[0].id])
 expect(stages[2].inputs).toEqual([stages[1].id])
 })

 it("produces DIFFERENT cacheKeys for stages with different params", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("test", [
 { title: "A", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 { title: "B", kind: "generation", service: "krea2", params: { prompt: "dog" } },
 ]))
 const stages = useAgentFlowStore.getState().flow!.stages
 expect(stages[0].cacheKey).not.toBe(stages[1].cacheKey)
 })
})

describe("cache invalidation engine", () => {
 it("marks a stage stale when its params change (after completion)", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("test", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat", seed: 1 } },
 ]))
 const store = useAgentFlowStore.getState()
 const stage = store.flow!.stages[0]

 // Simulate the stage being "done" — pretend it executed.
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) =>
 st.id === stage.id ? { ...st, status: "done" as const, result: { assetUrls: ["/fake.png"], artifacts: {}, metadata: {}, completedAt: Date.now(), durationSec: 1.2 } } : st,
 ),
 } : null,
 }))

 // Edit the params — should mark stale.
 await useAgentFlowStore.getState().updateStageParams(stage.id, { seed: 2 })

 const after = useAgentFlowStore.getState().flow!.stages[0]
 expect(after.status).toBe("stale")
 expect(after.params.seed).toBe(2)
 })

 it("propagates staleness downstream via cacheKey dependency", async () => {
 // Stage 0 → Stage 1 → Stage 2
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("chain", [
 { title: "A", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 { title: "B", kind: "generation", service: "upscale", params: {}, inputIndices: [0] },
 { title: "C", kind: "generation", service: "detail", params: {}, inputIndices: [1] },
 ]))
 const store = useAgentFlowStore.getState()
 const stagesBefore = store.flow!.stages
 const keyA_before = stagesBefore[0].cacheKey
 const keyB_before = stagesBefore[1].cacheKey
 const keyC_before = stagesBefore[2].cacheKey

 // Mark all as "done" first.
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) => ({
 ...st,
 status: "done" as const,
 result: { assetUrls: [] as string[], artifacts: {}, metadata: {}, completedAt: Date.now(), durationSec: 1 },
 })),
 } : null,
 }))

 // Edit stage A — should change A's cacheKey, AND B + C's (they depend on A).
 await useAgentFlowStore.getState().updateStageParams(stagesBefore[0].id, { prompt: "dog" })

 const after = useAgentFlowStore.getState().flow!.stages
 expect(after[0].cacheKey).not.toBe(keyA_before)
 expect(after[1].cacheKey).not.toBe(keyB_before)
 expect(after[2].cacheKey).not.toBe(keyC_before)
 // Stages B and C are marked stale.
 expect(after[1].status).toBe("stale")
 expect(after[2].status).toBe("stale")
 })

 it("updateStageParams fails LOUD on a stale stageId (not a silent no-op)", async () => {
 // The agent rebuilt the flow — old stageIds are gone. Without
 // fail-loud validation, .map returned unchanged stages and the caller
 // had no idea the write went nowhere (the "it wired nothing" bug).
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("v1", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 ]))
 const v1StageId = useAgentFlowStore.getState().flow!.stages[0].id

 // Rebuild — new stageIds.
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("v2", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 ]))

 // The old stageId no longer exists.
 const res = await useAgentFlowStore.getState().updateStageParams(v1StageId, { seed: 99 })
 expect(res.ok).toBe(false)
 expect(res.error).toMatch(/not found/i)
 expect(res.error).toMatch(/available/i) // lists valid stage IDs
 })

 it("updateStageParams fails LOUD when no flow is loaded", async () => {
 useAgentFlowStore.getState().clear()
 const res = await useAgentFlowStore.getState().updateStageParams("s_anything", { seed: 1 })
 expect(res.ok).toBe(false)
 expect(res.error).toMatch(/no flow/i)
 })

 it("buildFlow fails LOUD when a flow is executing (not a silent skip)", async () => {
 // The guard prevents replacing a running flow. Without a fail-loud
 // return, the tool handler read the OLD flow and returned its stage
 // IDs — the agent thought it built a new flow but didn't.
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("v1", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 ]))
 // Simulate a stage mid-execution.
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) => ({ ...st, status: "running" as const })),
 } : null,
 }))

 const res = await useAgentFlowStore.getState().hydrateDraft(makeDraft("v2", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "dog" } },
 ]))
 expect(res.ok).toBe(false)
 expect(res.error).toMatch(/executing/i)
 // The OLD flow is still in the store — the guard didn't wipe it.
 expect(useAgentFlowStore.getState().flow!.intent).toBe("v1")
 })
})

describe("openInStudio event", () => {
 it("emits studioOpenTrigger + pendingStudio for studio-link stages", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("motion", [
 {
 title: "Kimodo Motion",
 kind: "studio-link",
 service: "kimodo",
 params: {},
 studio: "body",
 studioContext: { motion_prompt: "walking" },
 },
 ]))
 const triggerBefore = useAgentFlowStore.getState().studioOpenTrigger
 const stage = useAgentFlowStore.getState().flow!.stages[0]

 const target = useAgentFlowStore.getState().openInStudio(stage.id)

 expect(target).toBe("body")
 const after = useAgentFlowStore.getState()
 expect(after.studioOpenTrigger).toBe(triggerBefore + 1)
 expect(after.pendingStudio).toEqual({ target: "body", context: { motion_prompt: "walking" } })
 })

 it("returns null for non-studio-link stages", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gen", [
 { title: "Image", kind: "generation", service: "krea2", params: {} },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 const target = useAgentFlowStore.getState().openInStudio(stage.id)
 expect(target).toBeNull()
 })
})

// (The Agent center tab mount regression guard died with the native-agent
// chat surfaces, 2026-08-21 — the cards below render on the Library canvas.)

import { InlineFlowCards } from "../surfaces/flow/InlineFlowCards"

describe("InlineFlowCards — cards appear below the message, in order", () => {
 it("shows the composing placeholder while the agent decides (tool in flight)", () => {
 strictRender(createElement(InlineFlowCards, { toolStatus: "inProgress" }))
 expect(screen.getByText(/composing the flow/i)).toBeTruthy()
 })

 it("renders nothing on resume — no lying spinner when the tool is complete", () => {
 // On thread resume, the build_flow tool call has status "complete"
 // but the store is null (wrong thread / not rehydrated). The spinner
 // that never resolves is a lie — show nothing instead.
 const { container } = strictRender(createElement(InlineFlowCards, { toolStatus: "complete" }))
 expect(container.textContent).not.toMatch(/composing the flow/i)
 })

 it("renders built stages IN ORDER under the intent — as the Library's dense tiles", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("Make me a waifu", [
 { title: "Generate", kind: "generation", service: "krea2", params: { prompt: "waifu" } },
 { title: "Upscale", kind: "generation", service: "upscale", params: {}, inputIndices: [0] },
 ]))
 const { container } = strictRender(createElement(InlineFlowCards))
 expect(screen.getByText("Make me a waifu")).toBeTruthy()
 // THE ONE card (2026-08-07): the chat renders the SAME dense Library
 // tiles as the canvas — data-card-tile rectangles, titles in dependency
 // order (h3), numbered badges. No full-width row cards — the second
 // design was deleted.
 const titles = [...document.querySelectorAll("h3")].map((h) => h.textContent)
 expect(titles).toEqual(["Generate", "Upscale"])
 expect(container.querySelectorAll("[data-card-tile]").length).toBe(2)
 // Number badges show the order explicitly.
 expect(screen.getByText("01")).toBeTruthy()
 expect(screen.getByText("02")).toBeTruthy()
 })

 it("renders studio-link cards with the dashed studio treatment", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("motion", [
 {
 title: "Kimodo Motion",
 kind: "studio-link",
 service: "kimodo",
 params: {},
 studio: "body",
 studioContext: { motion_prompt: "walking" },
 },
 ]))
 strictRender(createElement(InlineFlowCards))
 expect(screen.getByText("Kimodo Motion")).toBeTruthy()
 expect(screen.getByText("kimodo")).toBeTruthy()
 })

 it("is INTERACTIVE — Run-all GO button + per-card Run/Edit in the inline expand (the user owns the run)", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("Make me a waifu", [
 { title: "Generate", kind: "generation", service: "krea2", params: { prompt: "waifu" } },
 { title: "Upscale", kind: "generation", service: "upscale", params: {}, inputIndices: [0] },
 ]))
 const { container } = strictRender(createElement(InlineFlowCards))
 // The GO button — "I hit go from there".
 expect(screen.getByRole("button", { name: /Run all/i })).toBeTruthy()
 // Per-card Run + the editor live in the tile's inline expand — the SAME
 // detail body the Library canvas shows (1:1, one design). Click a tile
 // → the detail has Run in the header + the ALWAYS-ON editor (the
 // one-UI drilldown, 2026-08-08 — the "Edit params" toggle is gone: the
 // card never flips into a read-only view).
 const tiles = container.querySelectorAll("[data-card-tile]")
 expect(tiles.length).toBe(2)
 fireEvent.click(tiles[0])
 // The detail opens in the portaled zoom overlay (document.body), so the
 // Run button + editor live there — screen queries document.body. The box
 // holds the SKELETON during the shared-element morph; the detail swaps in
 // when it settles (data-card-ready).
 expect(document.body.querySelector("[data-card-zoom-overlay] [data-card-skeleton]"), "the skeleton holds the box during the grow").toBeTruthy()
 await waitFor(() => {
 expect(document.body.querySelector("[data-card-detail]")).toBeTruthy()
 expect(screen.getByRole("button", { name: /^Run$/i })).toBeTruthy()
 }, { timeout: 3000 })
 // ONE UI: the drilldown is the card — no Edit toggle (the flip is
 // gone; the full editor contract is pinned in card-detail-one-ui).
 expect(screen.queryByRole("button", { name: /Edit/i })).toBeNull()
 })

 // THE ONE CARD (2026-08-07): tiles render COMPACT by default; clicking
 // one expands it INLINE to the bounded detail card (640px, in the grid)
 // — the same CardDetailInline the Library canvas shows (1:1, no second
 // design, no 100%-wide surface). This test pins the tile model — a
 // future refactor that reintroduces full-width row cards, 100% flex
 // expansion, variants, chevrons, or a modal fails here.
 it("ONE CARD: tiles render compact; click expands one inline (1:1 with the Library)", async () => {
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("collapsed test", [
 { title: "Gen A", kind: "generation", service: "krea2", params: { prompt: "cat", seed: 1 } },
 { title: "Gen B", kind: "generation", service: "krea2", params: { prompt: "dog", seed: 2 } },
 ]))
 // The overlay's shared-element EXIT is a framer layout projection: its
 // lifecycle completes from REAL measured rects. happy-dom has no layout
 // engine (all rects zero) — the projection never completes and the
 // close-unmount never fires. Mock distinct rects for the tile vs the
 // expanded card (the same fixture card-animations uses); the browser
 // measures these for real.
 vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
 if (this.matches && this.matches("[data-card-expanded]")) return { left: 360, top: 240, width: 680, height: 500, right: 1040, bottom: 740, x: 360, y: 240, toJSON: () => {} } as DOMRect
 if (this.matches && this.matches("[data-layout-id]")) return { left: 100, top: 100, width: 200, height: 150, right: 300, bottom: 250, x: 100, y: 100, toJSON: () => {} } as DOMRect
 return { left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => {} } as DOMRect
 })
 const { container } = strictRender(createElement(InlineFlowCards))

 // Both cards render as compact tiles — no expanded detail yet.
 const tiles = container.querySelectorAll("[data-card-tile]")
 expect(tiles.length).toBe(2)
 expect(container.querySelector("[data-card-detail]")).toBeNull()

 // The compact tile shows the DECLARED model line (2026-08-09: the
 // family label, falling back to the raw route key when the catalog
 // hasn't loaded — the empty apiJson mock leaves it at "krea2") — and
 // NEVER raw params. The "seed=1" chip strip was deleted: it was
 // freehand policy (Object.entries order decided what showed). The full
 // param surface is the expanded fiddle below.
 expect(container.textContent).toContain("krea2")
 expect(container.textContent).not.toContain("seed=1")
 expect(container.textContent).not.toContain("seed=2")

 // Click the FIRST tile -> it opens the ZOOM OVERLAY (a portaled absolute
 // inset-0 layer whose solid backdrop covers the grid + chat + input,
 // so the ONE drilldown card is the only thing on screen). The resting
 // grid never re-flows; the sibling tile stays mounted behind the
 // backdrop. This pins the zoom-overlay model - a future refactor that
 // reintroduces in-place flex-basis expansion, full-width row cards,
 // variants, chevrons, or un-hides the chat input while zoomed fails here.
 fireEvent.click(tiles[0])
 // OTHER CARDS SHOULD GO AWAY. CHAT INPUT SHOULD GO AWAY. THE ONLY THING
 // SHOULD BE THE ONE DRILLDOWN CARD." The focused card opens as a portaled
 // absolute inset-0 overlay whose solid backdrop covers the grid + chat +
 // input; the single detail is the sole focus. The detail lives in
 // document.body (createPortal escapes every ancestor), not the container.
 const overlay = document.body.querySelector("[data-card-zoom-overlay]")
 expect(overlay, "the zoom overlay mounts in document.body").toBeTruthy()
 // The box holds the SKELETON during the shared-element morph; the real
 // detail (title etc.) swaps in when it settles (data-card-ready).
 expect(overlay!.querySelector("[data-card-skeleton]"), "the skeleton holds the box during the grow").toBeTruthy()
 await waitFor(() => {
 expect(overlay!.querySelector("[data-card-detail]")).toBeTruthy()
 expect(overlay!.querySelector("[data-card-detail] h3")?.textContent).toBe("Gen A")
 }, { timeout: 3000 })
 // The resting grid never re-flows: every wrapper stays at its 200px
 // resting basis (no 640px growth, no 160px shrink - the old in-place
 // flex-basis expansion that janked is dead). Both tiles stay mounted
 // behind the overlay's solid backdrop.
 const wraps = container.querySelectorAll("[data-card-wrap]")
 expect((wraps[0] as HTMLElement).style.flexBasis).toBe("200px")
 expect((wraps[1] as HTMLElement).style.flexBasis).toBe("200px")
 expect(container.querySelectorAll("[data-card-tile]").length).toBe(2)

 // Escape collapses the overlay. The close ANIMATES (AnimatePresence
 // holds the overlay mounted playing the shared-element shrink-back, then
 // unmounts), so we waitFor the overlay to leave the body - not
 // synchronous.
 fireEvent.keyDown(window, { key: "Escape" })
 await waitFor(() => {
 expect(document.body.querySelector("[data-card-zoom-overlay]")).toBeNull()
 })
 expect(document.body.querySelector("[data-card-detail]")).toBeNull()
 })
})

describe("output persistence — run results land in the stage result (run protocol)", () => {
 /** Stub the raw-fetch START POST — /v1/flows/generate (the protocol's
 * no-retry path bypasses the apiFetch module mock, so a real network call
 * would ECONNREFUSED). The COMPILE-FIRST validate POST is answered ok —
 * these tests pin the run path, not the compile refusal (pinned in the
 * compile-first describe below). Anything else reaching raw fetch is a
 * test bug. */
 function stubGenerateStart(body: unknown) {
 vi.stubGlobal(
 "fetch",
 vi.fn(async (input: RequestInfo | URL) => {
 const url = String(input)
 // CARD BIRTH LAW (2026-09-06): compose-first — the run mints its
 // card here before start. Served so these tests pin the run path,
 // not the compose (refused composes are pinned separately).
 if (url === "/v1/flows/drafts") {
 const draftBody = { draftId: "draft-test-agent-flow" }
 return {
 ok: true,
 status: 200,
 json: async () => draftBody,
 text: async () => JSON.stringify(draftBody),
 } as Response
 }
 if (url === "/v1/flows/validate") {
 const okBody = { ok: true, card: true }
 return {
 ok: true,
 status: 200,
 json: async () => okBody,
 text: async () => JSON.stringify(okBody),
 } as Response
 }
 if (url === "/v1/flows/start") {
 return {
 ok: true,
 status: 200,
 json: async () => body,
 text: async () => JSON.stringify(body),
 } as Response
 }
 throw new Error(`agent-flow test: unexpected raw fetch to ${url}`)
 }),
 )
 }

 /** Mock the heal endpoint's miss (2026-08-14): hydrateDraft fires ONE
 * fire-and-forGET per un-resulted stage — GET /v1/flows/drafts/{id}/
 * stages/{id}/result. It fires BEFORE executeStage's poll, so every
 * once-entry queue must start with the heal's response or the heal
 * steals the poll's entry (mockResolvedValueOnce is FIFO by CALL ORDER,
 * not URL). A 404 {found:false} is the honest "nothing to heal" answer
 * for a freshly built draft. */
 function mockHealMiss() {
 vi.mocked(apiFetch).mockResolvedValueOnce({
 ok: false,
 status: 404,
 json: async () => ({ found: false }),
 text: async () => "",
 } as Response)
 }

 /** Mock the flow protocol's two-call flow: POST /v1/flows/generate
 * (→ run_id, raw fetch — stubGenerateStart) then the status poll (→
 * terminal stages, mocked apiFetch). TWO apiFetch entries: the heal miss
 * (hydrateDraft) then the poll — a stale start-shaped entry would
 * be consumed by the poll's FIRST request. */
 function mockRun(runId: string, stages: Array<{ url?: string; gallery?: Array<{ url: string }> }>, status = "completed") {
 stubGenerateStart({ run_id: runId, bricks: [], total: 1 })
 mockHealMiss()
 vi.mocked(apiFetch).mockResolvedValueOnce({
 ok: true,
 // Contract-valid body — the poll validates run_id + the stage core
 // (id/name/index/status) at the wire (runStatusContract.ts).
 json: async () => ({
 run_id: runId,
 status,
 stages: stages.map((s, i) => ({ id: `s${i}`, name: `s${i}`, index: i, status: "completed", ...s })),
 error: null,
 }),
 text: async () => "",
 } as Response)
 }

 it("records the run's stage URLs on the stage result (flow protocol)", async () => {
 // Phase C step 4: POST /v1/flows/generate → run_id → poll /status.
 // The completed status carries artifact URLs (/v1/assets/runs/…)
 // per brick — those surface as card thumbs and the Library's media
 // archive (listMedia flattens /v1/flows/runs artifacts; there is
 // no client-side asset store — R1, an asset IS a 1-level flow).
 mockRun("ptest1", [
 { url: "/v1/assets/runs/ptest1/generate_0.png" },
 { url: "/v1/assets/runs/ptest1/edit_1.png" },
 ])

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("persist test", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)

 // The stage result carries the artifact URLs for inline card thumbs.
 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.status).toBe("done")
 expect(done.result!.assetUrls).toHaveLength(2)
 expect(done.result!.assetUrls[0]).toBe("/v1/assets/runs/ptest1/generate_0.png")
 // The run metadata is attached for the card detail panel.
 expect(done.result!.metadata.runId).toBe("ptest1")
 })

 it("AUTOSAVE: executeStage bumps useMediaVersion on success (Task G guard)", async () => {
 // 2026-08-08: "NOR DOES TEH FINAL IMAGE AUTOSAVE." The server already
 // persists artifacts; the issue was the frontend library didn't
 // refresh after gen. executeStage bumps useMediaVersion on success →
 // every open media view (AppSidebar, etc.) re-fetches listMedia().
 // This test HARDCODES that contract — if the bump is removed, the
 // library goes stale and this test screams.
 const { useMediaVersion } = await import("../surfaces/library/mediaVersion")
 const before = useMediaVersion.getState().version
 mockRun("autosave1", [{ url: "/v1/assets/runs/autosave1/out.png" }])
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("autosave", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "dog" } },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)
 expect(useMediaVersion.getState().version).toBe(before + 1)
 })

 it("AUTOSAVE: a failed run does NOT bump useMediaVersion (no false refresh)", async () => {
 // Only SUCCESSFUL runs produce artifacts — a failed run must not
 // trigger a library refresh (nothing new to show; avoids a loading
 // spinner flicker for the user).
 const { useMediaVersion } = await import("../surfaces/library/mediaVersion")
 const before = useMediaVersion.getState().version
 vi.stubGlobal(
 "fetch",
 // CARD BIRTH LAW (2026-09-06): the compose still mints (the boom
 // under test is the START 500, not the compose) — route by URL.
 vi.fn(async (input: RequestInfo | URL) => {
 if (String(input) === "/v1/flows/drafts") {
 const draftBody = { draftId: "draft-test-agent-flow-boom" }
 return { ok: true, status: 200, json: async () => draftBody, text: async () => JSON.stringify(draftBody) } as Response
 }
 return { ok: false, status: 500, text: async () => "server boom", json: async () => ({}) } as Response
 }),
 )
 await useAgentFlowStore.getState().hydrateDraft(makeDraft("fail", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "x" } },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)
 expect(useMediaVersion.getState().version).toBe(before)
 })

 it("registers gallery artifacts too (multi-output bricks)", async () => {
 // Bricks like render_glb_views emit a url + a click-through gallery.
 mockRun("ptest2", [
 {
 url: "/v1/assets/runs/ptest2/front.png",
 gallery: [
 { url: "/v1/assets/runs/ptest2/front.png" },
 { url: "/v1/assets/runs/ptest2/back.png" },
 { url: "/v1/assets/runs/ptest2/side.png" },
 ],
 },
 ])

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("gallery", [
 { title: "Gen", kind: "generation", service: "render_glb_views", params: {} },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)

 // collectStageUrls flattens url + gallery[].url onto the stage result.
 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.result!.assetUrls).toHaveLength(4) // url + 3 gallery items
 })

 it("passes video/GLB artifact URLs through to the stage result", async () => {
 mockRun("ptest3", [
 { url: "/v1/assets/runs/ptest3/v.mp4" },
 { url: "/v1/assets/runs/ptest3/m.glb" },
 ])

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("3d", [
 { title: "Gen", kind: "generation", service: "trellis", params: {} },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)

 // Category bucketing (video vs mesh) lives in the Library's listMedia
 // (server artifact types), not a client store — R1.
 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.result!.assetUrls).toEqual([
 "/v1/assets/runs/ptest3/v.mp4",
 "/v1/assets/runs/ptest3/m.glb",
 ])
 })

 it("fails cleanly when the form has no family mapping (no /v1/run b64 fallback, D3)", async () => {
 // D3: the legacy /v1/run b64 fallback is GONE. An uncompilable form
 // surfaces the compile error on the stage — the flow protocol
 // (compile → start → poll) is the only generation path, and a 400
 // from /v1/flows/generate is a terminal stage error, never a
 // retry through a second endpoint. The 400 arrives on the raw-fetch
 // START POST — stub global fetch, not the apiFetch module mock.
 vi.stubGlobal(
 "fetch",
 vi.fn(async (input: RequestInfo | URL) => {
 const url = String(input)
 // CARD BIRTH LAW (2026-09-06): compose-first — the 400 under test
 // arrives on the START POST, so the compose still mints.
 if (url === "/v1/flows/drafts") {
 const draftBody = { draftId: "draft-test-agent-flow-nomap" }
 return {
 ok: true,
 status: 200,
 json: async () => draftBody,
 text: async () => JSON.stringify(draftBody),
 } as Response
 }
 if (url === "/v1/flows/validate") {
 const okBody = { ok: true, model: "moss-tts", card: true }
 return {
 ok: true,
 status: 200,
 json: async () => okBody,
 text: async () => JSON.stringify(okBody),
 } as Response
 }
 if (url === "/v1/flows/start") {
 return {
 ok: false,
 status: 400,
 text: async () =>
 "Model 'moss-tts' has no flow family mapping (form not compilable)",
 json: async () => ({}),
 } as Response
 }
 throw new Error(`agent-flow test: unexpected raw fetch to ${url}`)
 }),
 )

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("tts", [
 { title: "Gen", kind: "generation", service: "moss-tts", params: { prompt: "hi" } },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)

 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.status).toBe("error")
 expect(done.error).toMatch(/no flow family mapping/)
 })

 it("surfaces run failures with the server error", async () => {
 stubGenerateStart({ run_id: "ptest4", bricks: [], total: 1 })
 mockHealMiss()
 vi.mocked(apiFetch).mockResolvedValueOnce({
 ok: true,
 json: async () => ({
 run_id: "ptest4",
 status: "failed",
 error: "brick 0: first_frame ctx key 'x' not in ctx",
 stages: [],
 }),
 text: async () => "",
 } as Response)

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("fail", [
 { title: "Gen", kind: "generation", service: "krea2", params: {} },
 ]))
 const stage = useAgentFlowStore.getState().flow!.stages[0]
 await useAgentFlowStore.getState().executeStage(stage.id)

 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.status).toBe("error")
 expect(done.error).toContain("first_frame ctx key 'x' not in ctx")
 })
})

describe("COMPILE-FIRST (pipe-carry retirement, 2026-09-05) — card bodies compile before any run registers", () => {
 /** Stub raw fetch, capturing request bodies. The policy: a card run
 * composes at POST /v1/flows/drafts (CARD BIRTH LAW, 2026-09-06),
 * compiles at POST /v1/flows/validate, THEN starts at POST
 * /v1/flows/start — the validate body is EXACTLY the start body (the
 * same stamped envelope), refusals throw before any run registers,
 * and the start body carries {model, ...params} with NO stowaway keys
 * (pipe/stage_id died with the pipe-carry). */
 function stubFetchCapture() {
 const captured: Array<{ url: string; body: Record<string, unknown> }> = []
 const okJson = (payload: unknown) => ({
 ok: true,
 status: 200,
 json: async () => payload,
 text: async () => JSON.stringify(payload),
 } as Response)
 vi.stubGlobal(
 "fetch",
 vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
 const url = String(input)
 if (url === "/v1/flows/drafts") {
 const draftBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
 captured.push({ url, body: draftBody })
 return okJson({ draftId: "draft-test-compile-first" })
 }
 if (url === "/v1/flows/validate") {
 const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
 captured.push({ url, body })
 return okJson({ ok: true, model: body.model ?? null, card: true })
 }
 if (url === "/v1/flows/start") {
 const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
 captured.push({ url, body })
 return okJson({ run_id: "pcarry", bricks: [], total: 1 })
 }
 throw new Error(`compile-first test: unexpected raw fetch to ${url}`)
 }),
 )
 return captured
 }

 function mockPoll(stages: Array<{ url: string }>) {
 // Same as mockRun: the heal miss precedes the poll entry (FIFO).
 vi.mocked(apiFetch).mockResolvedValueOnce({
 ok: false,
 status: 404,
 json: async () => ({ found: false }),
 text: async () => "",
 } as Response)
 vi.mocked(apiFetch).mockResolvedValueOnce({
 ok: true,
 // Contract-valid body — run_id + the stage core are required by the poll.
 json: async () => ({
 run_id: "pcarry",
 status: "completed",
 stages: stages.map((s, i) => ({ id: `s${i}`, name: `s${i}`, index: i, status: "completed", ...s })),
 error: null,
 }),
 text: async () => "",
 } as Response)
 }

 it("generate runs: the SAME body compiles first, then starts — {model, ...params}, never a stowaway", async () => {
 const captured = stubFetchCapture()
 mockPoll([{ url: "/v1/assets/runs/pcarry/gen.png" }])

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("carry", [
 { title: "Gen", kind: "generation", service: "krea2", params: { prompt: "cat" } },
 ]))
 const p = useAgentFlowStore.getState().flow!
 await useAgentFlowStore.getState().executeStage(p.stages[0].id)

 // COMPILE-FIRST: compose, then validate, then start — no run
 // registers before compile, and no start is born cardless (CARD
 // BIRTH LAW, 2026-09-06).
 expect(captured.map((c) => c.url)).toEqual(["/v1/flows/drafts", "/v1/flows/validate", "/v1/flows/start"])
 // The compile door sees EXACTLY what the start door will run (the
 // same stamped envelope).
 expect(captured[1].body).toEqual(captured[2].body)
 const body = captured[2].body
 // The retired stowaways never ride a card body again.
 expect("pipe" in body).toBe(false)
 expect("stage_id" in body).toBe(false)
 // The envelope is never a param.
 expect(body.prompt).toBe("cat")
 expect(body.model).toBe("krea2")
 // The birth envelope rides the run.
 expect(body.draft_id).toBe("draft-test-compile-first")
 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.status).toBe("done")
 })

 it("input runs ride the {model} door like every card (no {flow:} doc, no stowaways)", async () => {
 const captured = stubFetchCapture()
 mockPoll([{ url: "/v1/assets/runs/pcarry/out.mp4" }])

 await useAgentFlowStore.getState().hydrateDraft(makeDraft("carry input", [
 {
 title: "Ingest", kind: "input", service: "input",
 params: { source: "/v1/media/original.mp4" },
 },
 ]))
 const p = useAgentFlowStore.getState().flow!
 await useAgentFlowStore.getState().executeStage(p.stages[0].id)

 expect(captured.map((c) => c.url)).toEqual(["/v1/flows/drafts", "/v1/flows/validate", "/v1/flows/start"])
 expect(captured[1].body).toEqual(captured[2].body)
 const body = captured[2].body
 // The input lane is a weightless native model — the SAME door.
 expect(body.model).toBe("input")
 expect(body.source).toBe("/v1/media/original.mp4")
 // The retired {flow: <doc>} shape (a door the gateway never honored)
 // is gone with the stowaways.
 expect("flow" in body).toBe(false)
 expect("pipe" in body).toBe(false)
 expect("stage_id" in body).toBe(false)
 const done = useAgentFlowStore.getState().flow!.stages[0]
 expect(done.status).toBe("done")
 })
})

describe("cross-flow carry-over (hydrateDraft preserves matching results)", () => {
 it("carries over a completed generate's result when the agent rebuilds with the same stage + a new downstream", async () => {
 // The user's "generate → run → upscale" flow. The agent builds
 // [generate], the user runs it (done), then the agent builds
 // [generate (same params), upscale]. The generate's cacheKey matches
 // → result carries over → runAll would skip it → the upscale gets
 // the carried-over image as input_image.
 const genParams = { prompt: "cute anime girl at the beach", width: 1024, height: 1024 }
 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("generate", [
 { title: "Gen", kind: "generation", service: "krea-2", params: genParams },
 ]),
 )
 // Simulate the generate completing (the store's executeStage sets
 // result + status after a successful run).
 const gen1 = useAgentFlowStore.getState().flow!.stages[0]
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) =>
 st.id === gen1.id
 ? {
 ...st,
 status: "done" as const,
 result: {
 assetUrls: ["/v1/assets/runs/p1/beach.png"],
 artifacts: {},
 metadata: {},
 completedAt: Date.now(),
 durationSec: 3.2,
 },
 }
 : st,
 ),
 } : null,
 }))

 // The agent rebuilds with [generate (same params), upscale].
 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("generate + upscale", [
 { title: "Gen", kind: "generation", service: "krea-2", params: genParams },
 { title: "Upscale", kind: "generation", service: "seedvr2", params: {}, inputIndices: [0] },
 ]),
 )

 const flow = useAgentFlowStore.getState().flow!
 expect(flow.stages).toHaveLength(2)

 // The generate stage carried over: status "done" + result present.
 // The stage has a NEW id (it's a new draft) but the SAME cacheKey.
 expect(flow.stages[0].status).toBe("done")
 expect(flow.stages[0].result).not.toBeNull()
 expect(flow.stages[0].result!.assetUrls).toEqual([
 "/v1/assets/runs/p1/beach.png",
 ])
 expect(flow.stages[0].id).not.toBe(gen1.id) // new stage id

 // The upscale is brand new: no carry-over.
 expect(flow.stages[1].status).toBe("pending")
 expect(flow.stages[1].result).toBeNull()
 })

 it("does NOT carry over when the generate params changed (different cacheKey)", async () => {
 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("v1", [
 { title: "Gen", kind: "generation", service: "krea-2", params: { prompt: "cat" } },
 ]),
 )
 const gen1 = useAgentFlowStore.getState().flow!.stages[0]
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) =>
 st.id === gen1.id
 ? { ...st, status: "done" as const, result: { assetUrls: ["/cat.png"], artifacts: {}, metadata: {}, completedAt: Date.now(), durationSec: 1 } }
 : st,
 ),
 } : null,
 }))

 // Rebuild with DIFFERENT params → different cacheKey → no carry-over.
 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("v2", [
 { title: "Gen", kind: "generation", service: "krea-2", params: { prompt: "dog" } },
 ]),
 )
 const flow = useAgentFlowStore.getState().flow!
 expect(flow.stages[0].status).toBe("pending")
 expect(flow.stages[0].result).toBeNull()
 })

 it("does NOT carry over stale/errored stages (only done/cached)", async () => {
 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("v1", [
 { title: "Gen", kind: "generation", service: "krea-2", params: { prompt: "cat" } },
 ]),
 )
 // Mark as stale (not done).
 useAgentFlowStore.setState((s) => ({
 flow: s.flow ? {
 ...s.flow,
 stages: s.flow.stages.map((st) => ({ ...st, status: "stale" as const })),
 } : null,
 }))

 await useAgentFlowStore.getState().hydrateDraft(
 makeDraft("v2", [
 { title: "Gen", kind: "generation", service: "krea-2", params: { prompt: "cat" } },
 ]),
 )
 const flow = useAgentFlowStore.getState().flow!
 expect(flow.stages[0].status).toBe("pending")
 expect(flow.stages[0].result).toBeNull()
 })
})
