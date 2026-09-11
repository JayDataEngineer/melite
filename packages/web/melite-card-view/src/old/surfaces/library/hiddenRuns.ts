// hiddenRuns.ts — the per-run "don't show in the sidebar" filter (2026-08-12).
//
// The user's directive: "a toggle whether to save this to assets or not.
// That way, even if the image persists, it doesn't clog up the left
// sidebar." The artifact lives on disk (the server's runs/ dir is the
// source of truth); the sidebar's listMedia() flattens every run's
// artifacts. This store is the FILTER — AppSidebar skips any MediaAsset
// whose runId is in the hidden set.
//
// Per-card: a stage with saveToAssets === false adds its runId here on
// completion. Toggling back to true removes it. The set persists to
// localStorage so a page reload respects the user's choice — the disk
// artifact survives (the user said that's fine), the sidebar just doesn't
// list it.
//
// Version counter: AppSidebar subscribes to ``version`` alongside
// mediaVersion so a toggle re-renders the filter immediately (no manual
// refresh). hideRun/unhideRun bump the counter.
import { create } from "zustand"

const STORAGE_KEY = "melite:hiddenRuns"

function loadHidden(): Set<string> {
 try {
 const raw = localStorage.getItem(STORAGE_KEY)
 if (!raw) return new Set()
 const arr = JSON.parse(raw)
 return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === "string")) : new Set()
 } catch {
 return new Set()
 }
}

function persistHidden(set: Set<string>): void {
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
 } catch {
 // localStorage full / disabled — the in-memory set still works for
 // the session; we just can't persist across reloads. Non-fatal.
 }
}

interface HiddenRunsState {
 /** The hidden run ids. AppSidebar filters these out of listMedia(). */
 hiddenRunIds: Set<string>
 /** Monotonic counter — bumped whenever the set changes so subscribers
 * (AppSidebar) re-render without waiting for a mediaVersion bump. */
 version: number
 /** Hide a run's artifacts from the sidebar. Idempotent. */
 hideRun: (runId: string) => void
 /** Unhide a run — its artifacts reappear in the sidebar. Idempotent. */
 unhideRun: (runId: string) => void
 /** Is this run id currently hidden? */
 isHidden: (runId: string) => boolean
 /** Bulk-replace the hidden set (used by the card toggle: hide the old
 * run + unhide the new in one shot when saveToAssets flips). */
 setHidden: (runIds: string[]) => void
}

export const useHiddenRuns = create<HiddenRunsState>((set, get) => ({
 hiddenRunIds: loadHidden(),
 version: 0,
 hideRun: (runId) => {
 if (!runId || get().hiddenRunIds.has(runId)) return
 const next = new Set(get().hiddenRunIds)
 next.add(runId)
 persistHidden(next)
 set({ hiddenRunIds: next, version: get().version + 1 })
 },
 unhideRun: (runId) => {
 if (!runId || !get().hiddenRunIds.has(runId)) return
 const next = new Set(get().hiddenRunIds)
 next.delete(runId)
 persistHidden(next)
 set({ hiddenRunIds: next, version: get().version + 1 })
 },
 isHidden: (runId) => (runId ? get().hiddenRunIds.has(runId) : false),
 setHidden: (runIds) => {
 const next = new Set(runIds.filter((r) => typeof r === "string"))
 persistHidden(next)
 set({ hiddenRunIds: next, version: get().version + 1 })
 },
}))
