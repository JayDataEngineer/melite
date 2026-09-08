// Tests for the data-URL stripping in storePersistence.ts.
// Flow snapshots carry base64 image data URLs in slot params that
// blow the ~5-10MB localStorage quota. stripDataUrls walks the doc and
// nulls any >1KB `data:` string before it hits localStorage.
import { describe, it, expect } from "vitest"
import { stripDataUrls } from "../surfaces/flow/storePersistence"

describe("stripDataUrls — localStorage quota guard", () => {
  it("nulls a large base64 data URL (the quota killer)", () => {
    // A real base64 image is always >1KB. This is what was blowing the
    // localStorage budget and breaking enhancement-store / agent-chat
    // thread-resume writes app-wide.
    const big = `data:image/png;base64,${"A".repeat(500_000)}`
    const flow = {
      stages: [{ id: "s1", params: { image1: big, prompt: "edit this" } }],
    }
    const out = stripDataUrls(flow) as typeof flow
    expect(out.stages[0].params.image1).toBeNull()
    // Small text params survive.
    expect(out.stages[0].params.prompt).toBe("edit this")
  })

  it("preserves a small data URL (<1KB, e.g. tiny SVG icon)", () => {
    const tiny = `data:image/svg+xml,<svg/>`
    expect(stripDataUrls(tiny)).toBe(tiny)
  })

  it("preserves non-data-URL strings regardless of size", () => {
    const longText = "x".repeat(100_000)
    expect(stripDataUrls(longText)).toBe(longText)
  })

  it("walks nested objects and arrays", () => {
    const big = `data:image/png;base64,${"B".repeat(50_000)}`
    const doc = {
      stages: [
        { params: { image1: big, width: 1024 } },
        { params: { image2: big, inputs: [big, "keep"] } },
      ],
      meta: { nested: { deep: big } },
    }
    const out = stripDataUrls(doc) as typeof doc
    expect(out.stages[0].params.image1).toBeNull()
    expect(out.stages[0].params.width).toBe(1024)
    expect(out.stages[1].params.image2).toBeNull()
    expect(out.stages[1].params.inputs).toEqual([null, "keep"])
    expect(out.meta.nested.deep).toBeNull()
  })

  it("is idempotent — running it twice changes nothing on the second pass", () => {
    const big = `data:image/png;base64,${"C".repeat(10_000)}`
    const doc = { a: big, b: "keep" }
    const once = stripDataUrls(doc)
    const twice = stripDataUrls(once)
    expect(twice).toEqual(once)
    expect(twice).toEqual({ a: null, b: "keep" })
  })

  it("handles primitives and null without crashing", () => {
    expect(stripDataUrls(null)).toBeNull()
    expect(stripDataUrls(42)).toBe(42)
    expect(stripDataUrls("hello")).toBe("hello")
    expect(stripDataUrls(true)).toBe(true)
  })
})
