// family-provenance.test.ts — run→capability provenance fold (2026-08-09).
//
// WHAT IS PROVEN: the archive is a trace of each capability. A run's
// `families` (list_runs projection of brick-level family keys) joins to a
// capability's default_family; the fold counts ONLY completed runs and
// remembers the most recent one. The backward-compat contract (runs
// without `families` contribute nothing) is pinned here so the badge never
// lies about pre-provenance history.
import { describe, it, expect } from "vitest"
import { familyProvenance, formatLastRun } from "@melite/catalog"
import type { MediaRun } from "../surfaces/library/media"

function run(partial: Partial<MediaRun> & { run_id: string }): MediaRun {
  return { status: "done", created_at: 0, ...partial }
}

describe("familyProvenance", () => {
  it("counts completed runs per family and keeps the max lastRunAt", () => {
    const prov = familyProvenance([
      run({ run_id: "a", status: "done", families: ["krea-2"], created_at: 100 }),
      run({ run_id: "b", status: "done", families: ["krea-2", "trellis2"], created_at: 200 }),
    ])
    // krea-2 ran twice; its last run was the newer one.
    expect(prov["krea-2"]).toEqual({ count: 2, lastRunAt: 200_000 })
    expect(prov["trellis2"]).toEqual({ count: 1, lastRunAt: 200_000 })
  })

  it("ignores runs that are not done — nothing produced yet", () => {
    const prov = familyProvenance([
      run({ run_id: "a", status: "running", families: ["krea-2"], created_at: 100 }),
      run({ run_id: "b", status: "interrupted", families: ["krea-2"], created_at: 100 }),
      run({ run_id: "c", status: "stopped", families: ["krea-2"], created_at: 100 }),
    ])
    expect(prov).toEqual({})
  })

  it("ignores runs without a families field — pre-provenance sidecars", () => {
    const prov = familyProvenance([
      { run_id: "legacy", status: "done", created_at: 100 }, // no families key
    ])
    expect(prov).toEqual({})
  })

  it("counts a run once per family even when it repeats the family", () => {
    const prov = familyProvenance([
      run({ run_id: "a", status: "done", families: ["krea-2", "krea-2"], created_at: 100 }),
    ])
    expect(prov["krea-2"].count).toBe(1)
  })

  it("keeps the MAX lastRunAt when a family appears in older + newer runs", () => {
    const prov = familyProvenance([
      run({ run_id: "a", status: "done", families: ["krea-2"], created_at: 300 }),
      run({ run_id: "b", status: "done", families: ["krea-2"], created_at: 100 }),
    ])
    expect(prov["krea-2"].lastRunAt).toBe(300_000)
  })
})

describe("formatLastRun", () => {
  it("never for no timestamp", () => {
    expect(formatLastRun(0)).toBe("never")
  })

  it("buckets into just now / minutes / hours / days", () => {
    const now = Date.now()
    expect(formatLastRun(now - 5_000)).toBe("just now")
    expect(formatLastRun(now - 90_000)).toBe("1m ago")
    expect(formatLastRun(now - 3 * 3_600_000)).toBe("3h ago")
    expect(formatLastRun(now - 2 * 86_400_000)).toBe("2d ago")
  })

  it("falls back to a date past a week", () => {
    const d = new Date("2026-07-01T00:00:00")
    expect(formatLastRun(d.getTime())).toBe(d.toLocaleDateString())
  })
})
