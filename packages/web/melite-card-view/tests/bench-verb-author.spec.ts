/**
 * THE UI-IS-THE-USER WALL (2026-10-26, the operator's live burn).
 * "Confirm clear" refused the operator's OWN bench — every tab verb
 * rode the wire's absent-author default ('agent'), so the sanctity
 * law read the user's own presses as probe traffic. The tab runs in
 * the user's browser on the bench it renders: every doc through
 * withRebase carries author 'user' (add-stage.ts, stamped after the
 * spread, unconditional). Agent traffic rides the gateway/tools
 * doors, never this bundle.
 *
 * THE LAW: all seven tab verbs serve author 'user' on the wire —
 * the drill's Remove, the Clear-all, drag-reorder, group, ungroup,
 * undo, and add-card all arrive as the user. Toggle the stamp out
 * and all seven arms red.
 */
import { describe, test, afterEach } from "vitest"
import assert from "node:assert/strict"
import { unbindEstateRemote } from "@melite/card-base/client"
import {
  addStageWire,
  removeStageWire,
  clearBenchWire,
  reorderStageWire,
  groupStagesWire,
  ungroupStageWire,
} from "../src/client/add-stage.ts"
import { mountEstateFakes } from "./estate-harness.ts"

afterEach(() => {
  unbindEstateRemote()
})

/** Drive one wire caller, return the doc the fake bench served. */
async function servedDoc(
  call: (doc: Record<string, unknown>, key: string) => Promise<unknown>,
  doc: Record<string, unknown>,
  method: string,
): Promise<Record<string, unknown>> {
  const estate = mountEstateFakes()
  await call(doc, "bench-under-test")
  const hit = estate.calls.find((c) => c.method === method)
  assert.ok(hit, `${method} never reached the fake bench`)
  return (hit.args as { doc: Record<string, unknown> }).doc
}

describe("the tab's verbs ride the user's own voice", () => {
  test("Remove arrives as the user (the drill's Remove on a user row)", async () => {
    const doc = await servedDoc(removeStageWire, { stage: "s_1", expect_rev: 142 }, "bench/remove-stage")
    assert.equal(doc["author"], "user")
  })

  test("Clear-all arrives as the user (Confirm clear on a user bench)", async () => {
    const doc = await servedDoc(clearBenchWire, { expect_rev: 142 }, "bench/clear")
    assert.equal(doc["author"], "user")
  })

  test("drag-reorder arrives as the user", async () => {
    const doc = await servedDoc(
      reorderStageWire, { stage: "s_1", to: 0, expect_rev: 142 }, "bench/reorder")
    assert.equal(doc["author"], "user")
  })

  test("group arrives as the user", async () => {
    const doc = await servedDoc(
      groupStagesWire, { stages: ["s_1", "s_2"], expect_rev: 142 }, "bench/group")
    assert.equal(doc["author"], "user")
  })

  test("ungroup arrives as the user", async () => {
    const doc = await servedDoc(ungroupStageWire, { stage: "g_x", expect_rev: 142 }, "bench/ungroup")
    assert.equal(doc["author"], "user")
  })

  test("add-card arrives as the user (UI-born rows are user work)", async () => {
    const doc = await servedDoc(
      addStageWire, { card: "hero", engine: "comfyui", expect_rev: 142 }, "bench/add-stage")
    assert.equal(doc["author"], "user")
  })

  test("a caller-seated author never survives the stamp (no tab press rides the agent voice)", async () => {
    const estate = mountEstateFakes()
    await removeStageWire({ stage: "s_1", expect_rev: 142, author: "agent" }, "bench-under-test")
    const hit = estate.calls.find((c) => c.method === "bench/remove-stage")
    assert.ok(hit, "bench/remove-stage never reached the fake bench")
    assert.equal((hit.args as { doc: Record<string, unknown> }).doc["author"], "user")
  })
})
