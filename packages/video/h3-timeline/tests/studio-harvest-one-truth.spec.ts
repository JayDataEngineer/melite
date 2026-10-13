/**
 * THE HARVEST ONE-TRUTH WALL — SOURCE ARM (rail-law audit,
 * 2026-10-31 — the DRY sweep's S2: the run-history harvest law was
 * owned twice, once in projection.ts and once as a DRIFT copy
 * inside StudioPreview with a different priority order (direct over
 * film) and no error→failed arm). This arm pins the SOURCE truth;
 * the behavioral parity arm lives beside it in
 * studio-harvest-one-truth.spec.tsx (dom lane).
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
const PREVIEW_SRC = readFileSync(join(STUDIO, "StudioPreview.tsx"), "utf8")
const PROJECTION_SRC = readFileSync(join(STUDIO, "projection.ts"), "utf8")

describe("SOURCE — one harvest owner (no second face in the preview)", () => {
  it("StudioPreview imports the owner and carries no harvest machinery of its own", () => {
    assert.ok(
      PREVIEW_SRC.includes('stageHistoryRows } from "./projection.ts"'),
      "the preview must import stageHistoryRows from the one owner",
    )
    for (const face of ["h3_t4_film_", "refGenreOf", "function historyRows"]) {
      assert.ok(
        !PREVIEW_SRC.includes(face),
        `a second harvest face ("${face}") must not live in StudioPreview.tsx`,
      )
    }
  })

  it("projection.ts owns the law (the film lead + the stage read export)", () => {
    assert.ok(PROJECTION_SRC.includes("h3_t4_film_"), "the film-lead law lives in projection.ts")
    assert.ok(PROJECTION_SRC.includes("export function stageHistoryRows"), "the stage read is exported here")
  })
})
