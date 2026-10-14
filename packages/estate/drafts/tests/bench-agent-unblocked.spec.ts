/**
 * THE AGENT IS NEVER BLOCKED (2026-10-26, the operator's ruling).
 * A sanctity law briefly refused agent verbs on user-marked rows —
 * the operator killed it (their words were cruder): if the agent
 * breaks the flow, you just hit undo — never add a crass blocker.
 * The agent's job is working
 * the user's bench (patch, remove, reorder, group on request); the
 * safety net is the undo log, not a lock. This wall pins the
 * permissive law: every agent verb lands on user-marked rows. If a
 * future session re-adds a blocker, these arms red it.
 */
import { describe, test } from "vitest"
import assert from "node:assert/strict"
import {
  ensureBench,
  getBench,
  addStageBench,
  removeStageBench,
  patchBench,
  reorderBench,
  groupBench,
  ungroupBench,
  undoBench,
  clearBench,
} from "../src/bench.ts"
import { boot } from "./bench-helpers.ts"

describe("the agent is never blocked on the bench", () => {
  test("every agent verb lands on user-marked rows — undo is the safety net, not a lock", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const a = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    const b = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 1, author: "user",
    })
    let rev = getBench(drafts, "s").rev
    // patch, reorder, group, ungroup, rewire-class moves all land
    await patchBench(drafts, "s", { stage: a.stage, params: { prompt: "agent refined" }, expect_rev: rev })
    rev = getBench(drafts, "s").rev
    await reorderBench(drafts, "s", { stage: a.stage, to: 1, expect_rev: rev })
    rev = getBench(drafts, "s").rev
    const g = await groupBench(drafts, "s", { stages: [a.stage, b.stage], expect_rev: rev })
    rev = getBench(drafts, "s").rev
    await ungroupBench(drafts, "s", { stage: g.stage, expect_rev: rev })
    rev = getBench(drafts, "s").rev
    // remove lands, and the agent's own undo restores it
    await removeStageBench(drafts, "s", { stage: a.stage, expect_rev: rev })
    rev = getBench(drafts, "s").rev
    await undoBench(drafts, "s", { expect_rev: rev })
    rev = getBench(drafts, "s").rev
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 2)
    // clear lands too
    await clearBench(drafts, "s", { expect_rev: rev })
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0)
  })
})
