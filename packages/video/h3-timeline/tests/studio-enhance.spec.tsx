/**
 * useEnhance — per-prompt H3-style enhancement (BEHAVIORAL).
 *
 * PINS (the harness door is real — global fetch is stubbed, the
 * catalog module loads for real): blank text never fires, success
 * applies + banks undo, errors render inline (Error and non-Error
 * throws alike), a second press mid-flight no-ops, undo restores
 * once then forgets.
 */
import { describe, expect, it, vi } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useEnhance } from "../src/ui/studio/useEnhance.ts"

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("enhanceOne", () => {
  it("blank text never fires (no flag, no error, no apply)", async () => {
    const { result } = renderHook(() => useEnhance())
    let applied = 0
    await act(async () => {
      await result.current.enhanceOne("call-0", "   ", () => { applied++ })
    })
    assert.equal(applied, 0)
    assert.equal(result.current.enhancing["call-0"], undefined)
    assert.equal(result.current.enhanceErr["call-0"], undefined)
  })

  it("success applies the positive and banks the pre-text for undo", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ positive: "CINEMATIC rain", negative: "blur", via: "t" }))
    try {
      const { result } = renderHook(() => useEnhance())
      const applied: string[] = []
      await act(async () => {
        await result.current.enhanceOne("call-0", "rain", (t) => { applied.push(t) })
      })
      assert.deepEqual(applied, ["CINEMATIC rain"])
      assert.equal(result.current.enhanceUndo["call-0"], "rain")
      assert.equal(result.current.enhancing["call-0"], false)
      assert.equal(result.current.enhanceErr["call-0"], null)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("a harness JSON error surfaces inline (truncated to 160)", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ error: "bad recipe" }, 500))
    try {
      const { result } = renderHook(() => useEnhance())
      await act(async () => {
        await result.current.enhanceOne("call-1", "rain", () => {})
      })
      const msg = result.current.enhanceErr["call-1"]
      assert.ok(typeof msg === "string" && msg.includes("bad recipe"))
      assert.ok((msg as string).length <= 160)
      assert.equal(result.current.enhancing["call-1"], false)
      expect(msg).toContain("Enhancement failed")
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("an unreachable host surfaces the honest standalone error", async () => {
    // (an HTML body = no harness route here — fast, no retry storm)
    vi.stubGlobal("fetch", async () => new Response("<html></html>", { status: 200 }))
    try {
      const { result } = renderHook(() => useEnhance())
      await act(async () => {
        await result.current.enhanceOne("call-2", "rain", () => {})
      })
      assert.ok((result.current.enhanceErr["call-2"] as string).includes("not answered here"))
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("a non-Error throw renders via String() (never [object Object])", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ positive: "P", negative: "" }))
    try {
      const { result } = renderHook(() => useEnhance())
      await act(async () => {
        await result.current.enhanceOne("call-3", "rain", () => { throw "string-boom" })
      })
      assert.equal(result.current.enhanceErr["call-3"], "string-boom")
      assert.equal(result.current.enhancing["call-3"], false)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it("a second press mid-flight no-ops (the key is already enhancing)", async () => {
    let release!: (r: Response) => void
    vi.stubGlobal("fetch", () => new Promise<Response>((res) => { release = res }))
    try {
      const { result } = renderHook(() => useEnhance())
      let p1!: Promise<void>
      await act(async () => {
        p1 = result.current.enhanceOne("call-4", "rain", () => {})
        await Promise.resolve()
      })
      assert.equal(result.current.enhancing["call-4"], true)
      let second = 0
      await act(async () => {
        await result.current.enhanceOne("call-4", "rain", () => { second++ })
      })
      assert.equal(second, 0)
      await act(async () => {
        release(jsonResponse({ positive: "P", negative: "" }))
        await p1
      })
      assert.equal(result.current.enhancing["call-4"], false)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe("undoEnhance", () => {
  it("restores the pre-text once, then forgets (second undo no-ops)", async () => {
    vi.stubGlobal("fetch", async () => jsonResponse({ positive: "P", negative: "" }))
    try {
      const { result } = renderHook(() => useEnhance())
      const applied: string[] = []
      await act(async () => {
        await result.current.enhanceOne("call-0", "orig", (t) => { applied.push(t) })
      })
      act(() => { result.current.undoEnhance("call-0", (t) => { applied.push(t) }) })
      assert.deepEqual(applied, ["P", "orig"])
      assert.equal(result.current.enhanceUndo["call-0"], undefined)
      act(() => { result.current.undoEnhance("call-0", (t) => { applied.push(t) }) })
      assert.deepEqual(applied, ["P", "orig"])
      // unknown keys no-op
      act(() => { result.current.undoEnhance("call-9", (t) => { applied.push(t) }) })
      assert.deepEqual(applied, ["P", "orig"])
      expect(applied.length).toBe(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
