// hiddenRuns.test.ts — the per-run sidebar filter store (2026-08-12).
//
// The user's directive: "a toggle whether to save this to assets or not.
// That way, even if the image persists, it doesn't clog up the left
// sidebar." This pins the store that AppSidebar reads to filter hidden
// run ids out of listMedia(). The store persists to localStorage so a
// page reload respects the user's choice; the version counter drives the
// sidebar to re-render immediately on toggle.
import { describe, it, expect, beforeEach } from "vitest"
import { useHiddenRuns } from "@/surfaces/library/hiddenRuns"

beforeEach(() => {
 localStorage.clear()
 useHiddenRuns.getState().setHidden([])
})

describe("useHiddenRuns", () => {
 it("starts empty (nothing hidden)", () => {
 expect(useHiddenRuns.getState().hiddenRunIds.size).toBe(0)
 expect(useHiddenRuns.getState().isHidden("any-run")).toBe(false)
 })

 it("hideRun adds the run id + bumps version", () => {
 const v0 = useHiddenRuns.getState().version
 useHiddenRuns.getState().hideRun("run-abc")
 expect(useHiddenRuns.getState().isHidden("run-abc")).toBe(true)
 expect(useHiddenRuns.getState().hiddenRunIds.has("run-abc")).toBe(true)
 expect(useHiddenRuns.getState().version).toBe(v0 + 1)
 })

 it("unhideRun removes the run id + bumps version", () => {
 useHiddenRuns.getState().hideRun("run-abc")
 const v1 = useHiddenRuns.getState().version
 useHiddenRuns.getState().unhideRun("run-abc")
 expect(useHiddenRuns.getState().isHidden("run-abc")).toBe(false)
 expect(useHiddenRuns.getState().version).toBe(v1 + 1)
 })

 it("hideRun is idempotent (no version bump on repeat)", () => {
 useHiddenRuns.getState().hideRun("run-abc")
 const v1 = useHiddenRuns.getState().version
 useHiddenRuns.getState().hideRun("run-abc") // same id again
 expect(useHiddenRuns.getState().version).toBe(v1) // no bump
 })

 it("unhideRun is idempotent (no version bump when not hidden)", () => {
 const v0 = useHiddenRuns.getState().version
 useHiddenRuns.getState().unhideRun("not-hidden") // was never hidden
 expect(useHiddenRuns.getState().version).toBe(v0) // no bump
 })

 it("setHidden bulk-replaces the entire set", () => {
 useHiddenRuns.getState().hideRun("old-1")
 useHiddenRuns.getState().setHidden(["a", "b", "c"])
 expect(useHiddenRuns.getState().hiddenRunIds.size).toBe(3)
 expect(useHiddenRuns.getState().isHidden("old-1")).toBe(false)
 expect(useHiddenRuns.getState().isHidden("a")).toBe(true)
 expect(useHiddenRuns.getState().isHidden("b")).toBe(true)
 expect(useHiddenRuns.getState().isHidden("c")).toBe(true)
 })

 it("persists to localStorage so a reload respects the choice", () => {
 useHiddenRuns.getState().hideRun("persisted-run")
 const raw = localStorage.getItem("melite:hiddenRuns")
 expect(raw).not.toBeNull()
 const arr = JSON.parse(raw!)
 expect(arr).toContain("persisted-run")
 })

 it("empty / falsy run ids are ignored (no junk in the set)", () => {
 useHiddenRuns.getState().hideRun("")
 expect(useHiddenRuns.getState().hiddenRunIds.size).toBe(0)
 })

 it("isHidden returns false for empty/falsy run ids (permissive)", () => {
 expect(useHiddenRuns.getState().isHidden("")).toBe(false)
 })
})
