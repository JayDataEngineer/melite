/**
 * Render-time regression guard for the ONE-surface Library rail
 * (retargeted from drawer-render.test.tsx, ONE_SURFACE Phase 4, 2026-08-11:
 * the "Flow Nodes" drawer merged into the Library tab's discovery rail).
 *
 * The structural gate tests (test_gate_architecture.py) verify that the
 * source files exist and contain the right string patterns. But they CAN'T
 * catch React runtime errors like "Maximum update depth exceeded" — the
 * infinite-render-loop crash caused by returning a new array reference from
 * a Zustand selector on every render.
 *
 * This test mounts the rail with REAL Zustand stores (not mocked) seeded
 * with test data. If a selector creates a new reference every render, React
 * Testing Library will throw the "Maximum update depth exceeded" error
 * during render — failing the test loud and early.
 *
 * The specific regression this catches: putting `.filter()` INSIDE a Zustand
 * selector instead of in a useMemo. The filter creates a fresh array each
 * time → useSyncExternalStore detects a change → re-render → loop → crash.
 *
 * The rail is the merged surface — capabilities + AI Generated — so this
 * guard covers the whole discovery view (the flow-templates section
 * retired with the yaml library, 2026-09-05).
 */
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest"
import { render, cleanup } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"
import { createElement, StrictMode } from "react"

// Mock apiFetch so the rail's fetches (catalog, provenance runs) never
// hit the network. Empty bodies: the real client guards every shape with
// `?? []` / `?? {}` (listRuns), and loadCatalog's resolved {} renders as
// "no tiles" — no throw.
vi.mock("@melite/catalog/api", () => ({
 apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), text: async () => "" }),
 apiJson: vi.fn(),
}))
vi.mock("sonner", () => {
 const fn = vi.fn()
 return {
 toast: Object.assign(fn, { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
 }
})
import { primeCatalog } from "@melite/catalog"

/**
 * Render inside <StrictMode>. The app mounts in StrictMode (src/main.tsx),
 * which double-invokes useSyncExternalStore's getSnapshot. A Zustand
 * selector that returns a new array reference each call (.filter() in the
 * selector) will cause "Maximum update depth exceeded" ONLY under StrictMode
 * — the single-invocation test render won't catch it. This helper reproduces
 * the real browser environment so the test catches the footgun.
 */
function strictRender(element: React.ReactElement) {
 return render(
   <TooltipProvider>{createElement(StrictMode, null, element)}</TooltipProvider>,
 )
}

beforeEach(() => {
 // Empty catalog — the rail renders its empty states, never throws.
 primeCatalog({ families: {}, models: {}, capabilities: {} })
})

afterEach(() => {
 vi.restoreAllMocks()
})

describe("Library rail — renders without infinite loops", () => {
 it("LibrarySidebar (capabilities + AI Generated + Flows) mounts without throwing", async () => {
 const { LibrarySidebar } = await import("../surfaces/library/LibrarySidebar")
 expect(() => {
 strictRender(createElement(LibrarySidebar, {}))
 }).not.toThrow()
 // The merged Flows section rendered — the guard is on the whole rail.
 cleanup()
 })
})
