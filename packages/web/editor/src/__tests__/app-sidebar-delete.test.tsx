// app-sidebar-delete.test.tsx — the Media drawer's delete (2026-08-09).
//
// WHAT IS PROVEN: delete is SERVER-BACKED — the archive is server-derived
// (listMedia flattens GET /v1/flows/runs), so a delete that never left
// the browser would lie. The trash button must: delete DIRECTLY with NO
// confirm popup (2026-08-14 — "delete the popup"), call
// DELETE /v1/flows/runs/{run_id}, drop the run's assets from the list,
// bump mediaVersion (so provenance badges + the preview dialog recount),
// and surface a 400/404 refusal as an error toast WITHOUT dropping the tile.
//
// HOW IT'S TESTED: SidebarBody rendered directly (the responsive wrapper
// double-mounts it in happy-dom — no media queries — which would double
// every assertion). Real component, real stores; only the network layer
// (apiFetch) is mocked.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render as renderBase, screen, fireEvent, waitFor, cleanup } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

// SidebarBody mounts the Radix Tip (tooltip unification 2026-08-14) — render
// under the app's TooltipProvider, the same one App.tsx uses.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

import { apiFetch } from "@melite/catalog"
import { toast } from "sonner"
import { SidebarBody } from "../surfaces/shared/AppSidebar"
import { useMediaVersion } from "../surfaces/library/mediaVersion"

const RUNS = [
  { run_id: "run_a", status: "done", created_at: 100, prompt: "a",
    thumbnail: "", artifacts: [{ url: "/assets/runs/run_a/a.png", type: "image", size: 1 }] },
  { run_id: "run_b", status: "done", created_at: 200, prompt: "b",
    thumbnail: "", artifacts: [{ url: "/assets/runs/run_b/b.png", type: "image", size: 1 }] },
]

/** Expand the Images category — categories start collapsed (defaultOpen
 *  false), tiles only render inside the open CollapsibleContent. Must be
 *  called AFTER the load settles (the trigger renders once media lands). */
function openImages() {
  fireEvent.click(screen.getByText("Images"))
}

/** A live mock of the runs endpoint: GET returns the CURRENT run set;
 *  a successful DELETE removes the run from it (like the real server — the
 *  delete bumps mediaVersion, SidebarBody re-fetches, and a static mock
 *  would resurrect the deleted tile). Other calls → {}. */
function mockNetwork(deleteBody: unknown, deleteOk = true) {
  const liveRuns = RUNS.map((r) => ({ ...r }))
  vi.mocked(apiFetch).mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/v1/flows/runs") return { ok: true, json: async () => ({ runs: liveRuns }) } as never
    if (url.startsWith("/v1/flows/runs/") && init?.method === "DELETE") {
      const id = url.split("/").pop()
      if (deleteOk) {
        const idx = liveRuns.findIndex((r) => r.run_id === id)
        if (idx >= 0) liveRuns.splice(idx, 1)
      }
      return { ok: deleteOk, json: async () => deleteBody } as never
    }
    return { ok: true, json: async () => ({}) } as never
  })
}

/** RACE MOCK (2026-08-14 regression): simulates the REAL server — each GET
 *  SNAPSHOTS the run set at request time, and a DELETE of an already-deleted
 *  run 404s (not-found). The FIRST GET resolves immediately (initial load);
 *  every later refetch is served from ONE shared pending response (mirroring
 *  apiFetch's in-flight GET dedup in lib/api.ts) that snapshots the runs at
 *  first-refetch time — i.e. BEFORE the user's second delete lands. The
 *  test calls `release()` after BOTH deletes are processed, so its stale
 *  payload (still containing the deleted run) is a strictly-LATE response.
 *  Returns { release, whenGetCalls } so the test can wait for the refetch to
 *  actually be hanging — deterministic, no effect-timing races. */
function mockNetworkRacing() {
  let currentRuns = RUNS.map((r) => ({ ...r }))
  let getCalls = 0
  let staleSnapshot: Record<string, unknown>[] = []
  let resolvePending: (() => void) | null = null
  let pendingPromise: Promise<void> | null = null
  const waiters = new Set<() => void>()
  const notify = () => waiters.forEach((w) => w())
  const whenGetCalls = (n: number) =>
    getCalls >= n
      ? Promise.resolve()
      : new Promise<void>((res) => {
          const check = () => { if (getCalls >= n) res() }
          waiters.add(check)
        })
  const release = () => resolvePending?.()
  vi.mocked(apiFetch).mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === "/v1/flows/runs") {
      getCalls++
      notify()
      if (getCalls === 1) {
        // Initial load resolves immediately — the archive renders.
        return { ok: true, json: async () => ({ runs: currentRuns.map((r) => ({ ...r })) }) } as never
      }
      // Refetches share ONE pending response (apiFetch's in-flight GET dedup).
      if (!pendingPromise) {
        staleSnapshot = currentRuns.map((r) => ({ ...r }))
        pendingPromise = new Promise<void>((res) => { resolvePending = res })
      }
      await pendingPromise
      return { ok: true, json: async () => ({ runs: staleSnapshot }) } as never
    }
    if (url.startsWith("/v1/flows/runs/") && init?.method === "DELETE") {
      const id = url.split("/").pop()
      if (currentRuns.some((r) => r.run_id === id)) {
        currentRuns = currentRuns.filter((r) => r.run_id !== id)
        return { ok: true, json: async () => ({ run_id: id, status: "deleted" }) } as never
      }
      return { ok: false, json: async () => ({ error: "Run not found", code: "not-found" }) } as never
    }
    return { ok: true, json: async () => ({}) } as never
  })
  return { release, whenGetCalls }
}

/** The trash button of the tile showing `name`. The list is sorted NEWEST
 *  first (created_at: run_b=200 > run_a=100), so "Delete" [0] is run_b —
 *  target by tile content, not by index. */
function deleteButtonFor(name: string) {
  const btn = screen.getAllByRole("button", { name: "Delete" }).find((b) =>
    b.closest('[class*="group/item"]')?.textContent?.includes(name),
  )
  expect(btn).toBeTruthy()
  return btn as HTMLButtonElement
}

// happy-dom zero-rect trap (the framer-zoom trap class, 2026-08-09): the
// virtualizer's getRect reads offsetWidth/offsetHeight (NOT
// getBoundingClientRect) and observeElementRect fires it SYNCHRONOUSLY on
// mount — happy-dom's getters return 0 → scrollRect zeroed → calculateRange
// returns null → zero items on every render after the mount effects. Mock
// real sizes on the ScrollArea viewport ONLY (everything else stays zero —
// VirtualList's measure fallback keeps estimates). ResizeObserver is stubbed
// so no late real-observer callback interferes. base-ui's ScrollAreaViewport
// also calls viewport.getAnimations() in a mount timer — happy-dom lacks it;
// stub [] so the uncaught TypeError doesn't poison the file.
function mockVirtualizerRects() {
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 256 : 0
  })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 640 : 0
  })
  // TanStack Virtual's observeElementRect ALSO reads
  // getBoundingClientRect synchronously (jsdom zeros it) — the offset*
  // mocks alone leave the range empty and the panel renders zero rows.
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    if ((this as HTMLElement).getAttribute?.("data-slot") === "scroll-area-viewport") {
      return { x: 0, y: 0, top: 0, left: 0, right: 256, bottom: 640, width: 256, height: 640, toJSON: () => ({}) } as DOMRect
    }
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) } as DOMRect
  })
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  Element.prototype.getAnimations = () => []
}

describe("SidebarBody — delete an asset (server-backed, 2026-08-09)", () => {
  beforeEach(() => {
    useMediaVersion.setState({ version: 0 })
    mockVirtualizerRects()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    delete (Element.prototype as { getAnimations?: unknown }).getAnimations
  })

  it("NO confirm popup — clicking the trash DELETEs the run, drops its assets, bumps mediaVersion", async () => {
    mockNetwork({ run_id: "run_a", status: "deleted" })
    renderWithTooltip(<SidebarBody />)
    // Media loads async — wait for the category to render, then expand it.
    await screen.findByText("Images")
    openImages()
    await screen.findByText(/a\.png/)
    expect(screen.getByText(/b\.png/)).toBeTruthy()

    fireEvent.click(deleteButtonFor("a.png"))

    // No confirm ever appeared — the click went straight to the network.
    expect(vi.isMockFunction(window.confirm)).toBe(false)
    // The network saw the real DELETE for run_a.
    await waitFor(() => {
      const calls = vi.mocked(apiFetch).mock.calls
      expect(calls.some(([u, init]) => init?.method === "DELETE" && u === "/v1/flows/runs/run_a")).toBe(true)
    })
    // run_a's tile is gone; run_b's stays. mediaVersion bumped so every
    // other derived view recounts.
    await waitFor(() => {
      expect(screen.queryByText(/a\.png/)).toBeNull()
    })
    expect(screen.getByText(/b\.png/)).toBeTruthy()
    expect(useMediaVersion.getState().version).toBe(1)
  })

  it("a 400 refusal (still-running) toasts the error and keeps the tile", async () => {
    mockNetwork(
      { error: "Run is still running — stop it before deleting", code: "still-running" },
      false,
    )
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    openImages()
    await screen.findByText(/a\.png/)

    fireEvent.click(deleteButtonFor("a.png"))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Run is still running — stop it before deleting",
        // Errors now carry a duration opts object (15s for errors, via
        // useToastStore.addToast → sonner.toast.error).
        expect.objectContaining({ duration: expect.any(Number) }),
      )
    })
    // Refused = the archive is unchanged.
    expect(screen.getByText(/a\.png/)).toBeTruthy()
    expect(useMediaVersion.getState().version).toBe(0)
  })

  it("a stale refetch must NOT resurrect a deleted tile — delete is authoritative (regression 2026-08-14)", async () => {
    const net = mockNetworkRacing()
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    openImages()
    await screen.findByText(/a\.png/)

    // Delete #1 — the mediaVersion bump fires a refetch GET that hangs (the
    // user's next action happens BEFORE the server round-trip completes).
    fireEvent.click(deleteButtonFor("a.png"))
    await waitFor(() => expect(screen.queryByText(/a\.png/)).toBeNull())
    await net.whenGetCalls(2) // the refetch is now genuinely in flight

    // Delete #2 while that refetch hangs — its snapshot (taken before this
    // delete) still contains run_b.
    fireEvent.click(deleteButtonFor("b.png"))
    await waitFor(() => expect(useMediaVersion.getState().version).toBe(2))
    await net.whenGetCalls(3) // the second refetch joined the same pending GET

    // NOW the stale response lands, late, with run_b still in its payload.
    // It must not resurrect the tile — the server already deleted the run,
    // so deleting again would 404 forever (the "stuck" bug).
    net.release()
    await new Promise((r) => setTimeout(r, 50))
    // The stale response must NOT resurrect run_b. When the guard is absent
    // media becomes [run_b] again: the category list remounts (its previous
    // collapse reset to closed), so re-open Images before asserting — this
    // distinguishes "tile actually gone" from "tile hidden in a closed
    // category".
    if (screen.queryByText("Images")) fireEvent.click(screen.getByText("Images"))
    expect(screen.queryByText("b.png")).toBeNull()
    // No phantom "Run not found" toast — the delete never 404'd. (Scoped to
    // the delete path; unrelated catalog toasts are out of scope.)
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Run not found"),
      expect.anything(),
    )
  })

  it("a 404 (already-deleted) drops the tile instead of sticking (regression 2026-08-14)", async () => {
    // The server says the run is gone — the tile is a phantom (stale-refetch
    // resurrection). Delete must be idempotent: drop the tile, NO toast.
    mockNetwork({ error: "Run not found", code: "not-found" }, false)
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    openImages()
    await screen.findByText(/a\.png/)

    fireEvent.click(deleteButtonFor("a.png"))

    await waitFor(() => expect(screen.queryByText(/a\.png/)).toBeNull())
    expect(screen.getByText(/b\.png/)).toBeTruthy()
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("Run not found"),
      expect.anything(),
    )
    expect(useMediaVersion.getState().version).toBe(1)
  })
})
