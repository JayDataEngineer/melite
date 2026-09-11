/**
 * Unit tests for lib/segment-clipboard.ts — the transient copy/paste clipboard
 * for segment params (NOT persisted to IndexedDB — intentionally ephemeral).
 *
 * Pure module with module-level `_clipboard` state. Tests cover:
 *   - copySegmentParams: defensive copy (later source mutations don't leak)
 *   - pasteParamsInto: fresh patch every call (never the stored reference),
 *     null when empty
 *   - has/get/clear accessors
 *
 * Zero prior coverage. Returning the stored reference in pasteParamsInto
 * would let callers mutate the canonical clipboard — a subtle data-corruption
 * bug.
 */
import { describe, it, expect, beforeEach } from "vitest"
import {
  copySegmentParams, pasteParamsInto,
  getSegmentClipboard, hasSegmentClipboard, clearSegmentClipboard,
} from "@melite-plugin/timeline/ui/store"
import type { TimelineSegment } from "@melite/contracts"

function mkSeg(overrides: Partial<TimelineSegment> = {}): TimelineSegment {
  return {
    id: overrides.id ?? "seg-1",
    start: overrides.start ?? 0,
    duration: overrides.duration ?? 2,
    prompt: overrides.prompt ?? "a prompt",
    negativePrompt: overrides.negativePrompt ?? "",
    params: overrides.params ?? { seed: 42, steps: 20 } as unknown as TimelineSegment["params"],
  } as TimelineSegment
}

beforeEach(() => {
  clearSegmentClipboard()
})

describe("segment-clipboard — copySegmentParams", () => {
  it("snapshots params + prompt + negativePrompt + sourceId", () => {
    const seg = mkSeg({ id: "s1", prompt: "cat", negativePrompt: "blurry" })
    const snap = copySegmentParams(seg)
    expect(snap.sourceId).toBe("s1")
    expect(snap.prompt).toBe("cat")
    expect(snap.negativePrompt).toBe("blurry")
    expect(snap.params).toEqual({ seed: 42, steps: 20 })
  })
  it("params is a SHALLOW COPY (mutating the source seg after copy doesn't leak)", () => {
    const seg = mkSeg()
    const snap = copySegmentParams(seg)
    seg.params.seed = 999 // mutate source
    expect(snap.params.seed).toBe(42) // snapshot unchanged
  })
  it("stamps a finite copiedAt epoch", () => {
    const snap = copySegmentParams(mkSeg())
    expect(Number.isFinite(snap.copiedAt)).toBe(true)
    expect(snap.copiedAt).toBeLessThanOrEqual(Date.now())
  })
  it("sets the module clipboard (hasSegmentClipboard becomes true)", () => {
    expect(hasSegmentClipboard()).toBe(false)
    copySegmentParams(mkSeg())
    expect(hasSegmentClipboard()).toBe(true)
  })
})

describe("segment-clipboard — pasteParamsInto", () => {
  it("returns null when the clipboard is empty (nothing copied)", () => {
    expect(pasteParamsInto(mkSeg())).toBeNull()
  })
  it("returns a patch with params + prompt + negativePrompt after a copy", () => {
    copySegmentParams(mkSeg({ prompt: "p", negativePrompt: "np" }))
    const patch = pasteParamsInto(mkSeg())
    expect(patch).not.toBeNull()
    expect(patch?.prompt).toBe("p")
    expect(patch?.negativePrompt).toBe("np")
    expect(patch?.params).toEqual({ seed: 42, steps: 20 })
  })
  it("returns a NEW object every call (callers can mutate freely)", () => {
    copySegmentParams(mkSeg())
    const a = pasteParamsInto(mkSeg())
    const b = pasteParamsInto(mkSeg())
    expect(a).not.toBe(b)
    expect(a?.params).not.toBe(b?.params) // params also cloned
  })
  it("mutating the paste result does NOT affect the canonical clipboard", () => {
    copySegmentParams(mkSeg({ prompt: "original" }))
    const patch = pasteParamsInto(mkSeg())
    patch!.prompt = "mutated"
    const ref = getSegmentClipboard()
    expect(ref?.prompt).toBe("original") // clipboard unchanged
  })
  it("paste produces params that are a CLONE (not the clipboard's reference)", () => {
    copySegmentParams(mkSeg())
    const ref = getSegmentClipboard()
    const patch = pasteParamsInto(mkSeg())
    expect(patch?.params).not.toBe(ref?.params)
  })
})

describe("segment-clipboard — accessors", () => {
  it("getSegmentClipboard returns null before any copy", () => {
    expect(getSegmentClipboard()).toBeNull()
  })
  it("getSegmentClipboard returns the live reference after a copy", () => {
    const snap = copySegmentParams(mkSeg())
    expect(getSegmentClipboard()).toBe(snap) // same reference
  })
  it("hasSegmentClipboard toggles false → true → false across copy/clear", () => {
    expect(hasSegmentClipboard()).toBe(false)
    copySegmentParams(mkSeg())
    expect(hasSegmentClipboard()).toBe(true)
    clearSegmentClipboard()
    expect(hasSegmentClipboard()).toBe(false)
  })
  it("clearSegmentClipboard is a no-op when already empty", () => {
    expect(() => clearSegmentClipboard()).not.toThrow()
    expect(getSegmentClipboard()).toBeNull()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Edge cases + multi-copy lifecycle
// ════════════════════════════════════════════════════════════════════════════
describe("segment-clipboard — edge cases", () => {
  it("copies a segment with empty params {}", () => {
    const seg = mkSeg({ params: {} as unknown as TimelineSegment["params"] })
    const snap = copySegmentParams(seg)
    expect(snap.params).toEqual({})
  })
  it("copies a segment with empty prompt and negativePrompt", () => {
    const seg = mkSeg({ prompt: "", negativePrompt: "" })
    const snap = copySegmentParams(seg)
    expect(snap.prompt).toBe("")
    expect(snap.negativePrompt).toBe("")
  })
  it("second copy replaces the first (clipboard holds a single snapshot)", () => {
    copySegmentParams(mkSeg({ id: "first", prompt: "p1" }))
    const firstSnap = getSegmentClipboard()
    copySegmentParams(mkSeg({ id: "second", prompt: "p2" }))
    const secondSnap = getSegmentClipboard()
    expect(getSegmentClipboard()).toBe(secondSnap)
    expect(getSegmentClipboard()).not.toBe(firstSnap)
    expect(secondSnap.sourceId).toBe("second")
    expect(secondSnap.prompt).toBe("p2")
  })
  it("pasteParamsInto target argument is unused (same result for any target)", () => {
    copySegmentParams(mkSeg({ prompt: "shared" }))
    const targetA = mkSeg({ id: "a", prompt: "will-be-overwritten" })
    const targetB = mkSeg({ id: "b", prompt: "also-overwritten" })
    const patchA = pasteParamsInto(targetA)
    const patchB = pasteParamsInto(targetB)
    expect(patchA?.prompt).toBe("shared")
    expect(patchB?.prompt).toBe("shared")
    // The target's own prompt is NOT merged in — target is purely informational.
    expect(patchA).toEqual(patchB)
  })
  it("clearing between copy and paste → paste returns null", () => {
    copySegmentParams(mkSeg())
    clearSegmentClipboard()
    expect(pasteParamsInto(mkSeg())).toBeNull()
  })
  it("copiedAt is within a 1s window of Date.now()", () => {
    const before = Date.now()
    const snap = copySegmentParams(mkSeg())
    const after = Date.now()
    expect(snap.copiedAt).toBeGreaterThanOrEqual(before)
    expect(snap.copiedAt).toBeLessThanOrEqual(after)
  })
  it("the returned patch has exactly keys: params, prompt, negativePrompt", () => {
    copySegmentParams(mkSeg())
    const patch = pasteParamsInto(mkSeg())
    expect(Object.keys(patch!).sort()).toEqual(["negativePrompt", "params", "prompt"])
  })
  it("copySegmentParams returns a params object that is NOT seg.params (shallow clone)", () => {
    const seg = mkSeg()
    const snap = copySegmentParams(seg)
    expect(snap.params).not.toBe(seg.params)
    expect(snap.params).toEqual(seg.params)
  })
  it("multiple pastes produce independent params objects (no shared ref between pastes)", () => {
    copySegmentParams(mkSeg())
    const a = pasteParamsInto(mkSeg())!
    const b = pasteParamsInto(mkSeg())!
    const c = pasteParamsInto(mkSeg())!
    expect(a.params).not.toBe(b.params)
    expect(b.params).not.toBe(c.params)
    expect(a.params).not.toBe(c.params)
    // But all have the same values.
    expect(a.params).toEqual(b.params)
    expect(b.params).toEqual(c.params)
  })
})
