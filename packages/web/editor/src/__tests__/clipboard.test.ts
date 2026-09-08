// copyText — clipboard with an insecure-context fallback (2026-08-18).
//
// The editor is browsed over plain HTTP (Tailscale/LAN), where
// navigator.clipboard is undefined — every copy through the async API
// silently no-ops there (operator: "Copy button is broken"). These tests
// pin BOTH paths: the async Clipboard API when present, and the
// execCommand textarea fallback when it isn't (or when it rejects).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { copyText } from "@melite/ui"

const realNavigator = navigator

beforeEach(() => {
  // jsdom has no execCommand — the fallback path needs it stubbed.
  document.execCommand = vi.fn(() => true) as unknown as typeof document.execCommand
})

afterEach(() => {
  vi.unstubAllGlobals()
  // restore a pristine-ish navigator for the next test
  vi.stubGlobal("navigator", realNavigator)
  vi.unstubAllGlobals()
})

function stubClipboard(clip: unknown): void {
  vi.stubGlobal("navigator", { ...realNavigator, clipboard: clip })
}

describe("copyText — async Clipboard API path (secure contexts)", () => {
  it("uses navigator.clipboard.writeText when available", async () => {
    const writeText = vi.fn(async () => undefined)
    stubClipboard({ writeText })
    await copyText("hello")
    expect(writeText).toHaveBeenCalledWith("hello")
    expect(document.execCommand).not.toHaveBeenCalled()
  })

  it("falls through to execCommand when the API write REJECTS", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("NotAllowedError: document not focused")
    })
    stubClipboard({ writeText })
    const ok = await copyText("hello")
    expect(ok).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith("copy")
  })
})

describe("copyText — execCommand fallback (plain-HTTP origins)", () => {
  it("copies via the textarea fallback when navigator.clipboard is UNDEFINED", async () => {
    // The Tailscale/LAN case: navigator.clipboard simply doesn't exist.
    stubClipboard(undefined)
    const ok = await copyText("over http it works")
    expect(ok).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith("copy")
    // The textarea is REMOVED after the copy — no DOM litter.
    expect(document.querySelector("textarea")).toBeNull()
  })

  it("returns false when execCommand also fails", async () => {
    stubClipboard(undefined)
    document.execCommand = vi.fn(() => false) as unknown as typeof document.execCommand
    expect(await copyText("nope")).toBe(false)
  })

  it("returns false for empty text without touching the DOM", async () => {
    stubClipboard(undefined)
    expect(await copyText("")).toBe(false)
    expect(document.execCommand).not.toHaveBeenCalled()
  })
})
