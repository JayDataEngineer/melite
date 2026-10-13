/**
 * THE SANCTITY WALL (2026-10-26, the three-purge confession). The
 * bench log's revs 21-31, 41-45, and 89-90 on the operator's live
 * session: agent-authored remove_stage waves destroyed user-added
 * stages three times — probe cleanup built from a stale stage list,
 * riding the user's own session key. The operator's standing order:
 * contracts on every detail, impossible to regress.
 *
 * THE LAW: an agent-authored remove NEVER takes a stage whose
 * provenance is 'user' — it refuses LOUD (bench/stage-sanctity,
 * naming the stage), the bench is untouched, and the agent cleans
 * up after itself on its own rows only. Known boundary, seated in
 * CONTRACTS §3: the author claim rides the wire unauthenticated —
 * the accidental-destruction class (stale-list cleanup) is dead;
 * deliberate spoofing of author:'user' needs session identity.
 */
import { describe, test } from "vitest"
import assert from "node:assert/strict"
import {
  ensureBench,
  getBench,
  addStageBench,
  removeStageBench,
  undoBench,
  clearBench,
} from "../src/bench.ts"
import { boot, codeOf } from "./bench-helpers.ts"

describe("bench sanctity — an agent never removes user work", () => {
  test("agent remove of a USER-added stage refuses loud, naming the stage; the bench is untouched", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const added = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    const rev = getBench(drafts, "s").rev
    // the exact shape of the three purges: author absent → 'agent'
    const esc = added.stage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: added.stage, expect_rev: rev })),
      new RegExp(`^bench/stage-sanctity\\|stage ${esc} is user work`),
    )
    // and the explicit spelling refuses identically
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: added.stage, expect_rev: rev, author: "agent" })),
      /bench\/stage-sanctity/,
    )
    // untouched: the stage stands, the rev never moved
    const doc = getBench(drafts, "s")
    assert.equal((doc.stages as Array<Record<string, unknown>>).some((r) => r["id"] === added.stage), true)
    assert.equal(doc.rev, rev)
  })

  test("a RESTORED row (a user stage that rode an undo) refuses the agent — the live probe's lesson", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const added = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    // the user removes their own stage, then undoes it — the row
    // comes back with a non-agent mark (whatever spelling the restore lands, user work is user work)
    await removeStageBench(drafts, "s", { stage: added.stage, expect_rev: 1, author: "user" })
    await undoBench(drafts, "s", { expect_rev: 2, author: "user" })
    let doc = getBench(drafts, "s")
    let row = (doc.stages as Array<Record<string, unknown>>)[0]
    // the undo may restore the ORIGINAL mark ('user') — both spellings
    // are user work; the refusal must bite on either
    assert.notEqual(row["provenance"], "agent")
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: added.stage, expect_rev: doc.rev })),
      /bench\/stage-sanctity/,
    )
    // and the LIVE spelling (the 04:3x probe: the row rode the wire's
    // undo and read back 'restored') bites identically
    row["provenance"] = "restored"
    doc = getBench(drafts, "s")
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: added.stage, expect_rev: doc.rev })),
      /bench\/stage-sanctity/,
    )
  })

  test("a LEGACY row with no provenance at all refuses the agent too (unknown = protected)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s", stages: [{ id: "legacy", card: "hero" }] })
    const doc = getBench(drafts, "s")
    const row = (doc.stages as Array<Record<string, unknown>>)[0]
    delete row["provenance"]
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: "legacy", expect_rev: doc.rev })),
      /bench\/stage-sanctity/,
    )
  })

  test("agent remove of an AGENT-added stage still passes (clean up after yourself)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const added = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0,
    })
    const out = await removeStageBench(drafts, "s", {
      stage: added.stage, expect_rev: getBench(drafts, "s").rev,
    })
    assert.equal(out.stage, added.stage)
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0)
  })

  test("USER remove of their own stage still passes (the user is sovereign on their bench)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const added = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    await removeStageBench(drafts, "s", {
      stage: added.stage, expect_rev: getBench(drafts, "s").rev, author: "user",
    })
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0)
  })

  test("agent CLEAR refuses on user work — the whole-bench wipe door (the audit's C1)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    await addStageBench(drafts, "s", {
      card: "probe", engine: "comfyui", expect_rev: 1,
    })
    const rev = getBench(drafts, "s").rev
    // author absent -> 'agent' (the exact wire shape of a compose-agent clear)
    assert.match(
      await codeOf(clearBench(drafts, "s", { expect_rev: rev })),
      /bench\/stage-sanctity/,
    )
    // untouched: both stages stand, the rev never moved
    const doc = getBench(drafts, "s")
    assert.equal((doc.stages as unknown[]).length, 2)
    assert.equal(doc.rev, rev)
    // a 'restored' row refuses the clear identically (the live spelling)
    const rows = doc.stages as Array<Record<string, unknown>>
    rows[0]["provenance"] = "restored"
    assert.match(
      await codeOf(clearBench(drafts, "s", { expect_rev: rev })),
      /bench\/stage-sanctity/,
    )
    // agent clears an ALL-AGENT bench cleanly (clean up after yourself)
    const solo = await boot()
    await ensureBench(solo, { session: "a" })
    await addStageBench(solo, "a", { card: "probe", engine: "comfyui", expect_rev: 0 })
    const out = await clearBench(solo, "a", { expect_rev: getBench(solo, "a").rev })
    assert.equal(out.cleared, 1)
    // and the USER clears their own bench (sovereign)
    await addStageBench(drafts, "s", { card: "hero", engine: "comfyui", expect_rev: getBench(drafts, "s").rev, author: "user" })
    await clearBench(drafts, "s", { expect_rev: getBench(drafts, "s").rev, author: "user" })
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0)
  })

  test("agent LOAD overwrite:true refuses on user work — the wholesale-replace door (the audit's C2)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    const rev = getBench(drafts, "s").rev
    assert.match(
      await codeOf(ensureBench(drafts, {
        session: "s", overwrite: true, expect_rev: rev,
        stages: [{ id: "s_0", card: "probe" }],
      })),
      /bench\/stage-sanctity/,
    )
    // the user's stage stands, rev unmoved
    const doc = getBench(drafts, "s")
    assert.equal((doc.stages as Array<Record<string, unknown>>)[0]["provenance"], "user")
    assert.equal(doc.rev, rev)
    // onto an ALL-AGENT bench the load lands (the agent rewrites its own)
    const solo = await boot()
    await ensureBench(solo, { session: "a" })
    await addStageBench(solo, "a", { card: "probe", engine: "comfyui", expect_rev: 0 })
    await ensureBench(solo, {
      session: "a", overwrite: true, expect_rev: getBench(solo, "a").rev,
      stages: [{ id: "s_0", card: "hero" }],
    })
    assert.equal((getBench(solo, "a").stages as Array<Record<string, unknown>>)[0]["card"], "hero")
  })

  test("THE LAUNDERING HOLE: a load never re-stamps a marked row (the audit's C3)", async () => {
    // an agent-authored load carrying a STORED user row: the old stamp
    // re-wrote it to 'agent' — after which remove_stage's guard PASSED
    // on ex-user work. The mark keeps its owner; only UNMARKED rows
    // take the caller's author.
    const drafts = await boot()
    await ensureBench(drafts, {
      session: "s",
      stages: [{ id: "s_0", card: "hero", provenance: "user" }],
    })
    const doc = getBench(drafts, "s")
    assert.equal((doc.stages as Array<Record<string, unknown>>)[0]["provenance"], "user")
    // agent remove STILL refuses on it (the launder would have passed)
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: "s_0", expect_rev: doc.rev })),
      /bench\/stage-sanctity/,
    )
    // the mirror: a USER load does not convert agent rows to 'user'
    await ensureBench(drafts, {
      session: "m", stages: [{ id: "s_0", card: "probe", provenance: "agent" }],
    })
    await ensureBench(drafts, {
      session: "m", author: "user", overwrite: true, expect_rev: getBench(drafts, "m").rev,
      stages: [{ id: "s_0", card: "probe", provenance: "agent" }],
    })
    assert.equal((getBench(drafts, "m").stages as Array<Record<string, unknown>>)[0]["provenance"], "agent")
    // and an UNMARKED incoming row still takes the caller's author (the stamp's one job)
    await ensureBench(drafts, { session: "n", stages: [{ id: "s_0", card: "probe" }] })
    assert.equal((getBench(drafts, "n").stages as Array<Record<string, unknown>>)[0]["provenance"], "agent")
    await ensureBench(drafts, {
      session: "n", author: "user", overwrite: true, expect_rev: getBench(drafts, "n").rev,
      stages: [{ id: "s_1", card: "hero" }],
    })
    const nRows = getBench(drafts, "n").stages as Array<Record<string, unknown>>
    assert.equal(nRows.find((r) => r["id"] === "s_1")?.["provenance"], "user")
  })

  test("agent UNDO never reverts the user's entries — the repair door (the audit's C4)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 0, author: "user",
    })
    const doc = getBench(drafts, "s")
    // author absent -> 'agent': the newest entry is the USER's add —
    // the unfiltered undo used to revert (delete) it
    assert.match(
      await codeOf(undoBench(drafts, "s", { expect_rev: doc.rev })),
      /bench\/nothing-to-undo/,
    )
    const after = getBench(drafts, "s")
    assert.equal((after.stages as unknown[]).length, 1)
    assert.equal(after.rev, doc.rev)
    // the user's own undo still works on their entries
    await undoBench(drafts, "s", { expect_rev: doc.rev, author: "user" })
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 0)
  })

  test("the refusal does not consume the CAS rev (a retry after the refusal lands cleanly)", async () => {
    const drafts = await boot()
    await ensureBench(drafts, { session: "s" })
    const mine = await addStageBench(drafts, "s", {
      card: "probe", engine: "comfyui", expect_rev: 0,
    })
    const theirs = await addStageBench(drafts, "s", {
      card: "hero", engine: "comfyui", expect_rev: 1, author: "user",
    })
    const rev = getBench(drafts, "s").rev
    assert.match(
      await codeOf(removeStageBench(drafts, "s", { stage: theirs.stage, expect_rev: rev })),
      /bench\/stage-sanctity/,
    )
    // same expect_rev still lands for a lawful target — the refusal
    // never bumped the ledger
    await removeStageBench(drafts, "s", { stage: mine.stage, expect_rev: rev })
    assert.equal((getBench(drafts, "s").stages as unknown[]).length, 1)
  })
})
