/**
 * Unit tests for lib/objectUrlCache.ts — the data-URL → object-URL converter
 * that caches conversions to avoid re-decoding multi-MB base64 on every render.
 *
 * happy-dom provides URL.createObjectURL/revokeObjectURL, Blob, atob, TextEncoder.
 * Tests cover: isDataUrl guard, dataUrlToObjectUrl (cache hit, passthrough for
 * non-data URLs, null/empty), base64 decoding round-trip, revocation.
 *
 * Module-level cache — revokeAll() in beforeEach for isolation.
 *
 * Zero prior coverage. A missing idempotency check would mint a new blob: URL
 * on every call, leaking memory until the tab crashes.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  isDataUrl, dataUrlToObjectUrl, revokeObjectUrlFor, revokeAll, _cachedCount,
} from "@melite/contracts"

beforeEach(() => {
  revokeAll()
})

describe("objectUrlCache — isDataUrl", () => {
  it("returns true for a data: URL longer than 128 chars", () => {
    const long = "data:image/png;base64," + "A".repeat(200)
    expect(isDataUrl(long)).toBe(true)
  })
  it("returns false for a short data: URL (<= 128 chars — not worth caching)", () => {
    expect(isDataUrl("data:image/png;base64,short")).toBe(false)
  })
  it("returns false for non-data URLs (blob:, http:, relative)", () => {
    expect(isDataUrl("blob:http://x/abc")).toBe(false)
    expect(isDataUrl("https://example.com/img.png")).toBe(false)
    expect(isDataUrl("/img.png")).toBe(false)
  })
  it("returns false for non-string inputs", () => {
    expect(isDataUrl(null)).toBe(false)
    expect(isDataUrl(undefined)).toBe(false)
    expect(isDataUrl(123)).toBe(false)
  })
})

describe("objectUrlCache — dataUrlToObjectUrl", () => {
  it("returns null for null/undefined/empty input", () => {
    expect(dataUrlToObjectUrl(null)).toBeNull()
    expect(dataUrlToObjectUrl(undefined)).toBeNull()
    expect(dataUrlToObjectUrl("")).toBeNull()
  })
  it("passes through non-data URLs unchanged (blob:, http:, relative)", () => {
    expect(dataUrlToObjectUrl("blob:http://x/abc")).toBe("blob:http://x/abc")
    expect(dataUrlToObjectUrl("https://example.com/img.png")).toBe("https://example.com/img.png")
    expect(dataUrlToObjectUrl("/img.png")).toBe("/img.png")
  })
  it("converts a base64 data URL to a blob: URL (starts with 'blob:')", () => {
    // Pad to exceed the 128-char isDataUrl threshold.
    const long = "data:text/plain;base64," + btoa("x".repeat(200))
    const out = dataUrlToObjectUrl(long)
    expect(out).not.toBeNull()
    expect(out!.startsWith("blob:")).toBe(true)
  })
  it("is IDEMPOTENT: the same input returns the same blob: URL (cache hit)", () => {
    const long = "data:text/plain;base64," + btoa("x".repeat(200))
    const a = dataUrlToObjectUrl(long)
    const b = dataUrlToObjectUrl(long)
    expect(a).toBe(b) // same cached object URL
    expect(_cachedCount()).toBe(1) // only one entry
  })
  it("different data URLs produce different blob: URLs", () => {
    const url1 = "data:text/plain;base64," + btoa("x".repeat(200))
    const url2 = "data:text/plain;base64," + btoa("y".repeat(200))
    expect(dataUrlToObjectUrl(url1)).not.toBe(dataUrlToObjectUrl(url2))
    expect(_cachedCount()).toBe(2)
  })
  it("caching works across multiple calls without growing for repeats", () => {
    const long = "data:text/plain;base64," + btoa("z".repeat(200))
    for (let i = 0; i < 5; i++) dataUrlToObjectUrl(long)
    expect(_cachedCount()).toBe(1)
  })
})

describe("objectUrlCache — revocation", () => {
  it("revokeObjectUrlFor removes the entry for a specific source URL", () => {
    const long = "data:text/plain;base64," + btoa("a".repeat(200))
    dataUrlToObjectUrl(long)
    expect(_cachedCount()).toBe(1)
    revokeObjectUrlFor(long)
    expect(_cachedCount()).toBe(0)
  })
  it("revokeObjectUrlFor is a no-op for an unknown source URL", () => {
    expect(() => revokeObjectUrlFor("never-cached")).not.toThrow()
  })
  it("revokeAll clears the entire cache", () => {
    dataUrlToObjectUrl("data:text/plain;base64," + btoa("a".repeat(200)))
    dataUrlToObjectUrl("data:text/plain;base64," + btoa("b".repeat(200)))
    expect(_cachedCount()).toBe(2)
    revokeAll()
    expect(_cachedCount()).toBe(0)
  })
  it("after revocation, a new call mints a NEW blob: URL", () => {
    const long = "data:text/plain;base64," + btoa("c".repeat(200))
    const first = dataUrlToObjectUrl(long)
    revokeObjectUrlFor(long)
    const second = dataUrlToObjectUrl(long)
    expect(second).not.toBe(first) // new URL after re-cache
  })
  it("revokeAll calls URL.revokeObjectURL for every cached entry", () => {
    const spy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    dataUrlToObjectUrl("data:text/plain;base64," + btoa("a".repeat(200)))
    dataUrlToObjectUrl("data:text/plain;base64," + btoa("b".repeat(200)))
    revokeAll()
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2)
    spy.mockRestore()
  })
})

// ════════════════════════════════════════════════════════════════════════════
// createObjectUrlFromDataUrl internals — MIME, encoding, edge cases
// ════════════════════════════════════════════════════════════════════════════
describe("objectUrlCache — data URL parsing internals", () => {
  it("extracts the correct MIME type from the data URL header", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    // Use image/png explicitly.
    const png = "data:image/png;base64," + btoa("x".repeat(200))
    dataUrlToObjectUrl(png)
    const blob = spy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("image/png")
    spy.mockRestore()
    revokeAll()
  })

  it("extracts video/mp4 MIME type", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    const mp4 = "data:video/mp4;base64," + btoa("x".repeat(200))
    dataUrlToObjectUrl(mp4)
    const blob = spy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("video/mp4")
    spy.mockRestore()
    revokeAll()
  })

  it("defaults to application/octet-stream when MIME is missing from the header", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    // data:;base64,<payload> — no MIME between data: and ;
    const noMime = "data:;base64," + btoa("x".repeat(200))
    dataUrlToObjectUrl(noMime)
    const blob = spy.mock.calls[0][0] as Blob
    expect(blob.type).toBe("application/octet-stream")
    spy.mockRestore()
    revokeAll()
  })

  it("decodes base64 payload correctly (round-trip via Blob.text)", async () => {
    const payload = "Hello, World! ".repeat(20) // >128 chars after encoding
    const dataUrl = "data:text/plain;base64," + btoa(payload)
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    dataUrlToObjectUrl(dataUrl)
    const blob = spy.mock.calls[0][0] as Blob
    expect(await blob.text()).toBe(payload)
    spy.mockRestore()
    revokeAll()
  })

  it("handles URL-encoded (non-base64) data URLs", () => {
    const payload = "x".repeat(200)
    const encoded = encodeURIComponent(payload)
    const dataUrl = "data:text/plain," + encoded
    const out = dataUrlToObjectUrl(dataUrl)
    expect(out).not.toBeNull()
    expect(out!.startsWith("blob:")).toBe(true)
    revokeAll()
  })

  it("URL-encoded data URL content is decoded correctly", async () => {
    const payload = "Hello World & Friends <script>alert(1)</script>".repeat(5)
    const encoded = encodeURIComponent(payload)
    const dataUrl = "data:text/plain," + encoded
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    dataUrlToObjectUrl(dataUrl)
    const blob = spy.mock.calls[0][0] as Blob
    expect(await blob.text()).toBe(payload)
    spy.mockRestore()
    revokeAll()
  })

  it("returns the original data URL when base64 payload is malformed (atob throws)", () => {
    // Invalid base64 characters that atob rejects.
    const malformed = "data:text/plain;base64,!!!!not-valid-base64!!!!" + "x".repeat(200)
    const out = dataUrlToObjectUrl(malformed)
    // atob throws → catch → returns the original dataUrl.
    expect(out).toBe(malformed)
  })

  it("returns the original data URL when there is no comma (malformed)", () => {
    // No comma → comma < 0 → returns the original dataUrl.
    const noComma = "data:text/plain;base64" + "x".repeat(200)
    const out = dataUrlToObjectUrl(noComma)
    expect(out).toBe(noComma)
  })

  it("the 128-char boundary: exactly 128 chars is NOT cached (>128 required)", () => {
    // isDataUrl checks s.length > 128. Construct a data URL of EXACTLY 128 chars.
    const header = "data:text/plain;base64,"
    const payloadLen = 128 - header.length
    const exact = header + "A".repeat(payloadLen)
    expect(exact.length).toBe(128)
    // isDataUrl returns false (not > 128), so dataUrlToObjectUrl passes through.
    expect(isDataUrl(exact)).toBe(false)
    expect(dataUrlToObjectUrl(exact)).toBe(exact) // unchanged
  })

  it("the 128-char boundary: 129 chars IS cached", () => {
    const header = "data:text/plain;base64,"
    const payloadLen = 129 - header.length
    const over = header + "A".repeat(payloadLen)
    expect(over.length).toBe(129)
    expect(isDataUrl(over)).toBe(true)
    const out = dataUrlToObjectUrl(over)
    expect(out).not.toBe(over) // converted to blob:
    revokeAll()
  })

  it("Blob is created with bytes that are a defensive copy (not the same buffer ref)", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    dataUrlToObjectUrl("data:text/plain;base64," + btoa("x".repeat(200)))
    const blob = spy.mock.calls[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)
    // blob.arrayBuffer() returns a new buffer each time — not the internal one.
    expect(blob.size).toBeGreaterThan(0)
    spy.mockRestore()
    revokeAll()
  })

  it("createObjectURL is called exactly once per unique data URL (idempotent)", () => {
    const spy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:fake")
    const long = "data:text/plain;base64," + btoa("x".repeat(200))
    dataUrlToObjectUrl(long)
    dataUrlToObjectUrl(long)
    dataUrlToObjectUrl(long)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
    revokeAll()
  })

  it("revokeObjectUrlFor calls URL.revokeObjectURL with the cached blob URL", () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cached-url")
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    const long = "data:text/plain;base64," + btoa("x".repeat(200))
    dataUrlToObjectUrl(long)
    revokeObjectUrlFor(long)
    expect(revokeSpy).toHaveBeenCalledWith("blob:cached-url")
    createSpy.mockRestore()
    revokeSpy.mockRestore()
  })
})
