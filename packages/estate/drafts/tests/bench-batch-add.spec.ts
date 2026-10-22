import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  ensureBench,
  getBench,
  addStagesBench,
  undoBench,
} from "../src/bench.ts";
import { boot, failureOf } from "./bench-helpers.ts";

// ── add-stages: the batch add door's own laws ───────────────────
//
// THE RESTORE LAW (operator 2026-10-21: "Restoring takes an extreme
// amount of time"): restoring an N-stage flow minted N sequential
// add-stage writes — N revs, N history events, N observer waves —
// and the client paid a round trip per stage. The batch door lands
// the whole restore as ONE write. These tests pin the door's own
// invariants at function grain over the real storage stack: the
// one-rev-one-event shape, whole-batch atomicity (a refused row
// persists nothing — the refusal-that-lies law), the single CAS
// word, the mint over PROJECTED rows, duplicate refusal, and the
// batch undo inverse. The client-side law (one bench/add-stages
// call per restore) lives in melite-card-view's restore-batch.spec.

const ROW = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  card: "image-gen",
  params: { prompt: "a" },
  ...over,
});

async function bootWithStage() {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "s_0", card: "hero", params: {} }] });
  return { drafts, base: getBench(drafts, "s") };
}

/** The served bench's stage rows, runtime-checked — the serve types
 *  the list as JsonValue; a bench without a stages array is a serve
 *  crime louder than any assertion here. */
function stageRows(bench: ReturnType<typeof getBench>): Array<Record<string, unknown>> {
  const rows: unknown = bench.stages;
  if (!Array.isArray(rows)) throw new Error("the bench serve carries no stages array");
  return rows as Array<Record<string, unknown>>;
}

describe("addStagesBench — the batch laws", () => {
  test("N stages land at ONE rev with ONE history event naming every id", async () => {
    const { drafts, base } = await bootWithStage();
    const ans = await addStagesBench(drafts, "s", {
      stages: [ROW(), ROW({ card: "image-edit" }), ROW({ card: "upscale-tools" })],
      expect_rev: base.rev,
      author: "user",
    });
    assert.equal(ans.rev, base.rev + 1, "the whole batch rides ONE rev");
    assert.equal(ans.stages.length, 3);
    const bench = getBench(drafts, "s");
    assert.equal(bench.rev, base.rev + 1);
    // ONE event — the batch is one write, not N writes folded
    const batchEvents = bench.log.filter((e) => e["kind"] === "add_stages");
    assert.equal(batchEvents.length, 1, "exactly one add_stages history event");
    assert.equal(batchEvents[0]!["summary"], "add 3 stages");
    // every minted id is on the bench, provenance marked by the batch author
    const ids = new Set<string>(ans.stages);
    const seated = stageRows(bench)
      .filter((st) => ids.has(String(st["id"])));
    assert.equal(seated.length, 3);
    for (const st of seated) assert.equal(st["provenance"], "user");
  });

  test("a refused row persists NOTHING (whole-batch atomicity — the refusal-that-lies law)", async () => {
    const { drafts, base } = await bootWithStage();
    const good = getBench(drafts, "s");
    const f = await failureOf(addStagesBench(drafts, "s", {
      // row 0 is clean; row 1 lacks its card — the batch must die whole
      stages: [ROW(), { params: { prompt: "no card" } }],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.equal(f.code, "bench/bad-body");
    assert.match(f.message, /stage 1 of the batch: card is required/);
    const after = getBench(drafts, "s");
    assert.equal(after.rev, base.rev, "the rev never moved");
    assert.equal(stageRows(after).length, stageRows(good).length, "row 0 was NOT half-landed");
    assert.equal(after.log.length, good.log.length, "no history event for a refused batch");
  });

  test("the mint walks the PROJECTED rows — batch-internal ids never collide", async () => {
    const { drafts } = await bootWithStage();
    const base = getBench(drafts, "s");
    const ans = await addStagesBench(drafts, "s", {
      stages: [ROW(), ROW(), ROW()],
      expect_rev: base.rev,
      author: "user",
    });
    assert.equal(new Set(ans.stages).size, 3, "three rows, three fresh ids");
    // ids continue the bench's own arithmetic (s_0 seeded → s_1, s_2, s_3)
    assert.deepEqual([...ans.stages].sort(), ["s_1", "s_2", "s_3"]);
  });

  test("a duplicate id — bench-live or batch-internal — refuses the whole batch", async () => {
    const { drafts, base } = await bootWithStage();
    const live = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW(), ROW({ id: "s_0" })],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.equal(live.code, "bench/duplicate-stage");
    assert.match(live.message, /stage 1 of the batch: stage id already on the bench: s_0/);
    const twin = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW({ id: "twin" }), ROW({ id: "twin" })],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.equal(twin.code, "bench/duplicate-stage");
    assert.equal(getBench(drafts, "s").rev, base.rev, "neither refusal moved the rev");
  });

  test("ONE CAS word judges the whole batch", async () => {
    const { drafts, base } = await bootWithStage();
    const f = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW()],
      expect_rev: base.rev + 40,
      author: "user",
    }));
    assert.equal(f.code, "bench/cas-conflict");
    assert.equal(f.details.current_rev, base.rev);
    assert.equal(f.details.expect_rev, base.rev + 40);
  });

  test("one undo removes every batch row (the batch inverse)", async () => {
    const { drafts, base } = await bootWithStage();
    const ans = await addStagesBench(drafts, "s", {
      stages: [ROW(), ROW({ card: "image-edit" })],
      expect_rev: base.rev,
      author: "user",
    });
    await undoBench(drafts, "s", { expect_rev: ans.rev, author: "user" });
    const after = getBench(drafts, "s");
    assert.equal(after.rev, base.rev + 2, "undo is its own write, not a fold");
    assert.equal(stageRows(after).length, stageRows(base).length, "every batch row is gone");
    const ids = new Set<string>(ans.stages);
    assert.equal(
      stageRows(after)
        .filter((st) => ids.has(String(st["id"]))).length,
      0,
    );
  });

  test("an empty or missing stages list refuses at the body gate", async () => {
    const { drafts, base } = await bootWithStage();
    const f = await failureOf(addStagesBench(drafts, "s", {
      stages: [],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.equal(f.code, "bench/bad-body");
    assert.match(f.message, /stages is required — a non-empty array/);
  });

  test("per-row refusals name the row's index and its crime", async () => {
    const { drafts, base } = await bootWithStage();
    const notObject = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW(), "junk"],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.match(notObject.message, /stage 1 of the batch: must be an object/);
    const unknownKey = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW({ expect_rev: 7 })],
      expect_rev: base.rev,
      author: "user",
    }));
    // a per-stage CAS word is not a row key — the batch owns the ONE rev
    assert.match(unknownKey.message, /stage 0 of the batch: unknown bench key\(s\): expect_rev/);
    const arrayParams = await failureOf(addStagesBench(drafts, "s", {
      stages: [ROW({ params: ["prompt"] })],
      expect_rev: base.rev,
      author: "user",
    }));
    assert.match(arrayParams.message, /stage 0 of the batch: params must be an object/);
  });
});
