/**
 * Artifact URL robustness (2026-08-10): the user hit "Cannot read
 * properties of undefined (reading 'endsWith')" in the Motion Card — a
 * non-string entry reached `Object.values(artifacts).find(u => u.endsWith)`
 * / `assetUrls.find(...)`. Every construction path filters now; these tests
 * pin the FILTERS so the invariant "result.artifacts / assetUrls contain
 * only non-empty strings" can't regress:
 *
 *   1. collectStageUrls skips non-string gallery urls (they used to be
 *      pushed unguarded → undefined in assetUrls → crash).
 *   2. collectNamedArtifacts already filtered — regression pin.
 *   3. sanitizeRevivedResult (the pipe-carry revive channel — verbatim
 *      casts of stashed docs) strips non-strings + defaults numerics.
 */
import { describe, it, expect } from "vitest"
import { collectStageUrls, collectNamedArtifacts, sanitizeRevivedResult, type FlowRunStage } from "@melite/catalog"

const stage = (patch: Partial<FlowRunStage>): FlowRunStage => ({
  // The contract core (id/name/index/status) — always present, patch overrides.
  id: "s0",
  name: "s0",
  index: 0,
  status: "running",
  url: "/v1/assets/runs/x/out.png",
  ...patch,
})

describe("collectStageUrls", () => {
  it("skips gallery items with a non-string url — never undefined in assetUrls", () => {
    const urls = collectStageUrls([
      stage({ gallery: [
        { url: "/editor/a.png", name: "a" },
        { url: undefined, name: "broken" },
        { url: "/editor/b.png" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any }),
    ])
    expect(urls).toEqual([
      "/v1/assets/runs/x/out.png",
      "/editor/a.png",
      "/editor/b.png",
    ])
    expect(urls.every((u) => typeof u === "string")).toBe(true)
  })

  it("keeps the primary url and tolerates absent gallery", () => {
    expect(collectStageUrls([stage({ gallery: undefined })])).toEqual([
      "/v1/assets/runs/x/out.png",
    ])
    expect(collectStageUrls(undefined)).toEqual([])
  })
})

describe("collectNamedArtifacts", () => {
  it("drops null/undefined named_urls values (regression pin)", () => {
    const out = collectNamedArtifacts([
      stage({
        named_urls: {
          output: "/v1/assets/runs/x/out.png",
          motion_glb: null,
          motion_bvh: undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }),
    ])
    expect(out).toEqual({ output: "/v1/assets/runs/x/out.png" })
  })
})

describe("sanitizeRevivedResult", () => {
  it("strips non-string artifacts + assetUrls, defaults numerics", () => {
    const out = sanitizeRevivedResult({
      assetUrls: ["/editor/a.png", undefined, 42, "/editor/b.png"],
      artifacts: { output: "/editor/a.png", broken: null, empty: "", num: 7 },
      metadata: { model: "kimodo" },
      // completedAt/durationSec absent → defaults
    })!
    expect(out).not.toBeNull()
    expect(out.assetUrls).toEqual(["/editor/a.png", "/editor/b.png"])
    expect(out.artifacts).toEqual({ output: "/editor/a.png" })
    expect(out.metadata).toEqual({ model: "kimodo" })
    expect(typeof out.completedAt).toBe("number")
    expect(out.durationSec).toBe(0)
  })

  it("returns null for non-objects (revive treats as no result)", () => {
    expect(sanitizeRevivedResult(null)).toBeNull()
    expect(sanitizeRevivedResult("junk")).toBeNull()
    expect(sanitizeRevivedResult(undefined)).toBeNull()
  })

  it("survives a round-trip of a healthy result byte-identically", () => {
    const healthy = {
      assetUrls: ["/editor/a.png"],
      artifacts: { output: "/editor/a.png" },
      metadata: { runId: "p-test" },
      completedAt: 1234,
      durationSec: 5,
    }
    expect(sanitizeRevivedResult(healthy)).toEqual(healthy)
  })
})
