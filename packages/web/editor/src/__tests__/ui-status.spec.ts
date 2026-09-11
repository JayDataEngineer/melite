/**
 * Unit tests for components/ui/status.ts — the single source of truth for
 * status → visual style mapping used by every workspace tab.
 *
 * Zero prior coverage. A regression here (e.g. dropping the `failed` alias
 * or changing `generating`'s label) silently breaks the status language
 * across Flow / Video / Motion tabs. These tests pin:
 *   • every documented StatusKey resolves to a style entry
 *   • aliases normalize correctly (completed→done, failed→error, generating→running)
 *   • unknown keys fall back to `pending` (safe default)
 *   • statusDot / statusBadge / statusLabel each extract the right field
 *   • brand-colored statuses share the same dot/badge/ring (running ≡ generating)
 *   • emerald statuses share the same style (done ≡ ready ≡ completed)
 *   • red statuses share the same style (error ≡ failed)
 */
import { describe, it, expect } from "vitest"
import { statusStyle, statusDot, statusBadge, statusLabel } from "@melite/ui/status"

const KNOWN_KEYS = [
  "pending", "running", "done", "error", "skipped", "stopped",
  "empty", "generating", "ready", "failed", "completed", "reused",
] as const

describe("ui/status — every documented StatusKey resolves", () => {
  it("statusStyle returns a fully-populated entry for each known key", () => {
    for (const key of KNOWN_KEYS) {
      const s = statusStyle(key)
      expect(s).toBeTruthy()
      expect(typeof s.dot).toBe("string")
      expect(s.dot.length).toBeGreaterThan(0)
      expect(typeof s.badge).toBe("string")
      expect(s.badge.length).toBeGreaterThan(0)
      expect(typeof s.label).toBe("string")
      expect(s.label.length).toBeGreaterThan(0)
      expect(typeof s.ring).toBe("string")
      expect(s.ring.length).toBeGreaterThan(0)
    }
  })
})

describe("ui/status — unknown keys fall back to pending (safe default)", () => {
  it("returns the pending style for a completely unknown key", () => {
    expect(statusStyle("explosive")).toEqual(statusStyle("pending"))
  })
  it("returns the pending style for empty string", () => {
    expect(statusStyle("")).toEqual(statusStyle("pending"))
  })
  it("is case-sensitive ('Running' ≠ 'running')", () => {
    expect(statusStyle("Running")).toEqual(statusStyle("pending"))
    expect(statusStyle("RUNNING")).toEqual(statusStyle("pending"))
  })
})

describe("ui/status — alias normalization (legacy vocabulary)", () => {
  it("completed aliases to done (same dot/badge/ring, label 'done')", () => {
    const done = statusStyle("done")
    const completed = statusStyle("completed")
    expect(completed.dot).toBe(done.dot)
    expect(completed.badge).toBe(done.badge)
    expect(completed.ring).toBe(done.ring)
    expect(completed.label).toBe("done")
  })
  it("failed aliases to error (same dot/badge/ring, label 'failed')", () => {
    const errorStyle = statusStyle("error")
    const failed = statusStyle("failed")
    expect(failed.dot).toBe(errorStyle.dot)
    expect(failed.badge).toBe(errorStyle.badge)
    expect(failed.ring).toBe(errorStyle.ring)
    expect(failed.label).toBe("failed")
  })
  it("ready aliases to done styling (emerald, label 'ready')", () => {
    const ready = statusStyle("ready")
    const done = statusStyle("done")
    expect(ready.dot).toBe(done.dot)
    expect(ready.badge).toBe(done.badge)
    expect(ready.label).toBe("ready")
  })
  it("generating aliases to running styling (brand pulse, label 'rendering')", () => {
    const gen = statusStyle("generating")
    const run = statusStyle("running")
    expect(gen.dot).toBe(run.dot)
    expect(gen.badge).toBe(run.badge)
    expect(gen.ring).toBe(run.ring)
    expect(gen.label).toBe("rendering")
  })
})

describe("ui/status — field extractors", () => {
  it("statusDot returns just the dot class", () => {
    expect(statusDot("done")).toBe(statusStyle("done").dot)
  })
  it("statusBadge returns just the badge classes", () => {
    expect(statusBadge("error")).toBe(statusStyle("error").badge)
  })
  it("statusLabel returns just the human-readable label", () => {
    expect(statusLabel("running")).toBe("working")
    expect(statusLabel("generating")).toBe("rendering")
    expect(statusLabel("pending")).toBe("queued")
    expect(statusLabel("skipped")).toBe("off")
    expect(statusLabel("stopped")).toBe("stopped")
    expect(statusLabel("empty")).toBe("empty")
    expect(statusLabel("reused")).toBe("reused")
  })
  it("statusLabel falls back to pending's label for unknown keys", () => {
    expect(statusLabel("unknown")).toBe("queued")
  })
})

describe("ui/status — design-language coherence", () => {
  it("brand-colored active statuses (running, generating) use the brand dot", () => {
    expect(statusDot("running")).toBe("bg-brand")
    expect(statusDot("generating")).toBe("bg-brand")
  })
  it("emerald success statuses (done, ready, completed) use the emerald dot", () => {
    expect(statusDot("done")).toBe("bg-emerald-400")
    expect(statusDot("ready")).toBe("bg-emerald-400")
    expect(statusDot("completed")).toBe("bg-emerald-400")
  })
  it("red failure statuses (error, failed) use the red dot", () => {
    expect(statusDot("error")).toBe("bg-red-400")
    expect(statusDot("failed")).toBe("bg-red-400")
  })
  it("pending (queued) uses the amber dot", () => {
    expect(statusDot("pending")).toBe("bg-amber-400")
  })
  it("running + generating badges carry the animate-pulse class (visual affordance)", () => {
    expect(statusBadge("running")).toContain("animate-pulse")
    expect(statusBadge("generating")).toContain("animate-pulse")
  })
  it("non-active badges do NOT animate (done/error/skipped are static)", () => {
    expect(statusBadge("done")).not.toContain("animate-pulse")
    expect(statusBadge("error")).not.toContain("animate-pulse")
    expect(statusBadge("skipped")).not.toContain("animate-pulse")
  })
})
