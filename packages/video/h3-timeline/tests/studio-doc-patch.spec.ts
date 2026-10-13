/**
 * THE SINGLE-INDEX PATCH SPINE WALL (the rail-law audit's H7,
 * 2026-10-31): thirteen studio setters hand-rolled "copy the array,
 * replace index i, return the copy". One spelling now — docPatch.ts
 * owns the spine, the single-index setters ride it, and the ONLY
 * remaining explicit copies are the multi-index ripple re-frames
 * (seam/span/delete), which are a different law by design.
 */
import { describe, it } from "vitest"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { patchAt, setPatchAt } from "../src/ui/studio/docPatch.ts"
import type { SetStateAction } from "react"

const STUDIO = join(import.meta.dirname, "..", "src", "ui", "studio")
const read = (name: string): string => readFileSync(join(STUDIO, name), "utf8")

describe("BEHAVIOR — the spine", () => {
  it("patchAt copies the array and replaces exactly the one index (original untouched)", () => {
    const a = [{ v: 1 }, { v: 2 }, { v: 3 }]
    const b = patchAt(a, 1, { v: 9 })
    assert.deepEqual(b.map((x) => x.v), [1, 9, 3])
    assert.notEqual(a, b, "a fresh array, never an in-place edit")
    assert.deepEqual(a.map((x) => x.v), [1, 2, 3], "the previous array is untouched (React identity)")
    assert.notEqual(b[1], a[1], "the patched element is the replacement")
    assert.equal(b[0], a[0], "siblings ride by reference — one copy, one seat")
  })

  it("setPatchAt threads the spine through a setState (updater-function semantics)", () => {
    let held: number[] = [1, 2, 3]
    const fakeSet = (action: SetStateAction<number[]>): void => {
      held = typeof action === "function" ? action(held) : action
    }
    setPatchAt<number>(fakeSet, 2, 30)
    assert.deepEqual(held, [1, 2, 30])
  })
})

describe("SOURCE — one spelling, riders, and the ripple carve-out", () => {
  it("the single-index setters ride the spine (no hand-rolled copies left in them)", () => {
    for (const seat of ["useBeatMutations.ts", "usePromptMutations.ts", "useCallMutations.ts"]) {
      const text = read(seat)
      assert.ok(text.includes("patchAt("), `${seat} rides the spine`)
    }
    // the keyframe mutator is single-index only — zero remaining copies
    assert.ok(
      !read("useBeatMutations.ts").includes("const next = ["),
      "every keyframe setter rides the spine",
    )
    // the call/prompt mutators keep exactly their multi-index ripple re-frames
    for (const seat of ["useCallMutations.ts", "usePromptMutations.ts"]) {
      const text = read(seat)
      const remaining = text.split("const next = [").length - 1
      assert.ok(remaining <= 3 && text.includes("patchAt("), `${seat}: spine riders + at most the ripple re-frames`)
    }
  })

  it("the ONLY remaining explicit copies are the multi-index ripple re-frames", () => {
    const text = read("useCallMutations.ts")
    const remaining = text.split("const next = [").length - 1
    assert.equal(remaining, 3, "addCallAt split, seam move, span re-frame — the ripple law, not the patch spine")
    assert.ok(text.includes("patchAt("), "and its single-index setters ride the spine")
    const prompts = read("usePromptMutations.ts")
    assert.equal(
      prompts.split("const next = [").length - 1, 2,
      "prompt resize + move — both re-frame neighbors (the ripple law)",
    )
  })
})
