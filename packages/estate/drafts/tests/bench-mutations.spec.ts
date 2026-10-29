import { describe, test } from "vitest";
import assert from "node:assert/strict";
import {
  ensureBench,
  getBench,
  patchBench,
  addStageBench,
  removeStageBench,
  archiveBench,
  rewireBench,
  reorderBench,
  groupBench,
  ungroupBench,
  undoBench,
} from "../src/bench.ts";
import { boot, seed, codeOf } from "./bench-helpers.ts";

// ── patch: the full arm set ─────────────────────────────────────

test("a params patch that CHANGES the view invalidates the stage's done mark (the silent no-op cure, session 90a0b920's warm fire)", async () => {
  // THE BURN: the agent patched params, ran the bench, and the
  // skip-done law folded the row — [done] answered, no run minted,
  // no run_id, twelve diagnostic calls hunting a run that never
  // existed. The done mark described the PREVIOUS params; the law
  // that skips unchanged stages has no business skipping changed
  // ones. The door maintains the coherence itself: the patch that
  // changes the view clears the mark its run memory now lies about.
  const drafts = await boot();
  await seed(drafts, "stale1", {
    stages: [{ id: "a", card: "hero", params: { steps: 4 },
      runStatus: "done", result: { run_id: "r-1", url: "/runs/r-1/out.png" } }],
  });
  const ans = await patchBench(drafts, "stale1", {
    stage: "a", params: { steps: 9 }, expect_rev: 0,
  });
  // the answer NAMES the invalidation — the model reads why its
  // next run re-runs the stage instead of skipping it.
  assert.equal(ans.stale, true, "a changed patch answers stale: true");
  const row = (getBench(drafts, "stale1").stages as Array<Record<string, unknown>>)[0]!;
  assert.equal(row["runStatus"], undefined, "the done mark is gone — the skip law cannot fold it");
  // the artifact memory stands: the enrichment read keeps the last
  // run's url (the invalidation owns the SKIP decision, not history).
  assert.deepEqual(row["result"], { run_id: "r-1", url: "/runs/r-1/out.png" });
});

test("an idempotent patch keeps the done mark — staleness judges the VIEW, not the write", async () => {
  // The inverse law: an agent re-asserting the same params (a
  // re-read-compose loop) did not change what the next run
  // composes; skipping stays true and the answer carries no stale
  // key (a false stale would teach the model a re-run it does not
  // owe — the GPU burn the skip law exists to prevent).
  const drafts = await boot();
  await seed(drafts, "stale2", {
    stages: [{ id: "a", card: "hero", params: { steps: 4 }, runStatus: "done" }],
  });
  const ans = await patchBench(drafts, "stale2", {
    stage: "a", params: { steps: 4 }, expect_rev: 0,
  });
  assert.equal(ans.stale, undefined, "no change, no stale key");
  const row = (getBench(drafts, "stale2").stages as Array<Record<string, unknown>>)[0]!;
  assert.equal(row["runStatus"], "done", "the done mark stands — the view is unchanged");
});

test("patch refuses non-string stages, non-record params, and empty bodies", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  assert.match(
    await codeOf(patchBench(drafts, "s", { stage: 5, expect_rev: 0 })),
    /^bench\/bad-body\|stage is required/,
  );
  assert.match(
    await codeOf(patchBench(drafts, "s", { stage: "a", params: "junk", expect_rev: 0 })),
    /^bench\/bad-body\|params must be an object/,
  );
  assert.match(
    await codeOf(patchBench(drafts, "s", { stage: "a", expect_rev: 0 })),
    /^bench\/bad-body\|nothing to patch/,
  );
});

test("every write door refuses array-shaped params — the bench is never looser than the card (commission 015 §6 finding 5)", async () => {
  const drafts = await boot();
  // load/birth (ensure): the card's knobs wrapped in an array — the
  // exact shape that minted an empty-params eighth row live.
  assert.match(
    await codeOf(ensureBench(drafts, {
      session: "arrload",
      stages: [{ id: "a", card: "hero", params: [{ steps: 4 }] }],
    })),
    /^bench\/bad-body\|stage a: params must be an object \(got an array/,
  );
  // the wire's own item-wrap spelling of the same corruption — the
  // store-seat unwrap resolves it to a bare array, which refuses.
  assert.match(
    await codeOf(ensureBench(drafts, {
      session: "arrload",
      stages: [{ id: "a", card: "hero", params: { item: [{ steps: 4 }] } }],
    })),
    /^bench\/bad-body\|stage a: params must be an object \(got an array/,
  );
  // nothing minted — the refused birth persisted no doc.
  assert.throws(() => getBench(drafts, "arrload"), /no such bench/);
  // add_stage: the same shape on a live bench.
  await ensureBench(drafts, { session: "arradd", stages: [{ id: "a" }] });
  assert.match(
    await codeOf(addStageBench(drafts, "arradd", {
      card: "hero", params: [{ steps: 4 }], expect_rev: 0,
    })),
    /^bench\/bad-body\|stage "s_0": params must be an object \(got an array/,
  );
  // patch: the array variant of the shape this door has refused
  // since 2026-09-15 (the string variant is pinned above).
  assert.match(
    await codeOf(patchBench(drafts, "arradd", {
      stage: "a", params: [{ steps: 4 }], expect_rev: 0,
    })),
    /^bench\/bad-body\|params must be an object/,
  );
  // the live bench is untouched by any of the refusals.
  assert.deepEqual(
    (getBench(drafts, "arradd").stages as Array<{ id: string }>).map((x) => x.id),
    ["a"],
  );
});

test("patch refuses run outcomes with the redirect voice — the drafts door owns results (the telemetry law's other half, 2026-10-08)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, {
    session: "s",
    stages: [{ id: "a", params: { steps: 4 } }],
  });
  // result-only, runStatus-only, and mixed bodies all refuse — the
  // bench verb's old arms wrote archive-less (a landing destroyed
  // the previous result with no supersede) under the old
  // every-write-bumps law; outcomes ride drafts/patch now
  for (const body of [
    { stage: "a", result: { url: "x.png" }, expect_rev: 0 },
    { stage: "a", runStatus: "done", expect_rev: 0 },
    { stage: "a", params: { steps: 8 }, result: { url: "x.png" }, expect_rev: 0 },
  ]) {
    assert.match(
      await codeOf(patchBench(drafts, "s", body)),
      /^bench\/bad-body\|run outcomes ride the drafts\/patch door/,
    );
  }
  // the refusal leaves no trace: no bump, no log, params untouched
  const doc = getBench(drafts, "s");
  assert.equal(doc.rev, 0);
  assert.deepEqual(doc.log, []);
  const st = (doc.stages as Array<{ id: string; params: Record<string, unknown>; result?: unknown; runStatus?: unknown }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.params, { steps: 4 });
  assert.equal(st.result, undefined);
  assert.equal(st.runStatus, undefined);
});

test("patch records before-values on params overwrite", async () => {
  const drafts = await boot();
  await ensureBench(drafts, {
    session: "s",
    stages: [{ id: "a", params: { steps: 4 } }],
  });
  // Overwrite of an existing param key: before rides the inverse.
  const overwritten = await patchBench(drafts, "s", {
    stage: "a", params: { steps: 8 }, expect_rev: 0,
  });
  assert.deepEqual(overwritten.patched, ["steps"]);
  const doc = getBench(drafts, "s");
  const st = (doc.stages as Array<{ id: string; params: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal(st.params.steps, 8);
});

// ── add_stage ───────────────────────────────────────────────────

test("add_stage refuses an empty card; expected rides the row", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  assert.match(
    await codeOf(addStageBench(drafts, "s", { card: "", expect_rev: 0 })),
    /^bench\/bad-body\|card is required/,
  );
  const added = await addStageBench(drafts, "s", {
    card: "hero",
    engine: "comfyui",
    expected: { default: "image" },
    expect_rev: 0,
  });
  assert.equal(added.stage, "s_0");
  const doc = getBench(drafts, "s");
  const row = (doc.stages as Array<Record<string, unknown>>).find((x) => x["id"] === "s_0")!;
  assert.deepEqual(row["expected"], { default: "image" });
});

test("the id mint never collides after removals (max suffix + 1, not the count)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  // a bench whose history includes removals: ten rows added, nine
  // removed — the count would say s_1 again and collide
  for (let i = 0; i < 10; i++) {
    await addStageBench(drafts, "s", { card: "x", expect_rev: i });
  }
  const ids = (getBench(drafts, "s").stages as Array<Record<string, unknown>>)
    .map((r) => r["id"] as string);
  for (const id of ids.filter((id) => id !== "s_1")) {
    await removeStageBench(drafts, "s", { stage: id, expect_rev: getBench(drafts, "s").rev });
  }
  const lone = getBench(drafts, "s");
  assert.equal((lone.stages as unknown[]).length, 1);
  const added = await addStageBench(drafts, "s", {
    card: "hero",
    expect_rev: lone.rev,
  });
  assert.equal(added.stage, "s_2", "max LIVE suffix + 1 — s_1 survives, s_2 is free (the count mint would collide on s_1)");
});

// ── reorder ─────────────────────────────────────────────────────

test("reorder refuses bad stages, bad indexes, unknown ids; a past-end to clamps", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  assert.match(
    await codeOf(reorderBench(drafts, "s", { stage: 5, to: 0, expect_rev: 0 })),
    /^bench\/bad-body\|stage is required/,
  );
  for (const bad of [-1, 1.5, "0"]) {
    assert.match(
      await codeOf(reorderBench(drafts, "s", { stage: "a", to: bad, expect_rev: 0 })),
      /^bench\/bad-body\|to must be a non-negative integer/,
    );
  }
  assert.match(
    await codeOf(reorderBench(drafts, "s", { stage: "ghost", to: 0, expect_rev: 0 })),
    /^bench\/stage-not-found/,
  );
  // to=99 past the splice-out length parks at the end.
  const moved = await reorderBench(drafts, "s", { stage: "a", to: 99, expect_rev: 0 });
  assert.equal(moved.from, 0);
  assert.equal(moved.to, 2);
  const doc = getBench(drafts, "s");
  assert.deepEqual(
    (doc.stages as Array<{ id: string }>).map((x) => x.id),
    ["b", "c", "a"],
  );
});

test("an anchored reorder resolves the drop's intent on the CURRENT list (the F1-residue cure, round 25)", async () => {
  // THE I2 REBASE-SHIFT: the press rendered [s_0,s_1,s_2,s_3] and
  // asked "s_0 onto s_2" (numeric to 2); a second author landed a
  // head insert before the drop applied, shifting every slot. The
  // anchor id — not the stale number — owns the intent.
  const drafts = await boot();
  const ids = (): string[] =>
    (getBench(drafts, "s").stages as Array<{ id: string }>).map((x) => x.id);

  // the defect first, for the record: UNANCHORED, the stale numeric
  // `to` lands s_0 BEFORE the target once the list shifted.
  await ensureBench(drafts, { session: "s", stages: [{ id: "s_0" }, { id: "s_1" }, { id: "s_2" }, { id: "s_3" }] });
  await reorderBench(drafts, "s", { stage: "s_3", to: 0, expect_rev: 0 });
  assert.deepEqual(ids(), ["s_3", "s_0", "s_1", "s_2"]);
  const skewed = await reorderBench(drafts, "s", { stage: "s_0", to: 2, expect_rev: 1 });
  assert.equal(skewed.to, 2);
  assert.deepEqual(ids(), ["s_3", "s_1", "s_0", "s_2"]);

  // the cure: the SAME interleaving, anchored — s_0 lands AFTER s_2.
  await ensureBench(drafts, { session: "t", stages: [{ id: "s_0" }, { id: "s_1" }, { id: "s_2" }, { id: "s_3" }] });
  await reorderBench(drafts, "t", { stage: "s_3", to: 0, expect_rev: 0 });
  const idsT = (): string[] =>
    (getBench(drafts, "t").stages as Array<{ id: string }>).map((x) => x.id);
  const anchored = await reorderBench(drafts, "t", { stage: "s_0", to: 2, after: "s_2", expect_rev: 1 });
  assert.equal(anchored.from, 1);
  assert.equal(anchored.to, 3);
  assert.deepEqual(idsT(), ["s_3", "s_1", "s_2", "s_0"]);

  // an UNCHANGED list keeps the anchored path identical to the
  // numeric one (identity — the anchor never changes a fresh press).
  await ensureBench(drafts, { session: "u", stages: [{ id: "s_0" }, { id: "s_1" }, { id: "s_2" }] });
  const same = await reorderBench(drafts, "u", { stage: "s_0", to: 2, after: "s_2", expect_rev: 0 });
  assert.equal(same.to, 2);
  assert.deepEqual(
    (getBench(drafts, "u").stages as Array<{ id: string }>).map((x) => x.id),
    ["s_1", "s_2", "s_0"],
  );

  // a missing anchor is an HONEST refusal, never a silent fallback
  // to the stale number.
  assert.match(
    await codeOf(reorderBench(drafts, "u", { stage: "s_1", to: 0, after: "ghost", expect_rev: 1 })),
    /^bench\/anchor-gone\|the card you dropped after is gone/,
  );
  // a non-string anchor is a bad body, same as a non-string stage.
  assert.match(
    await codeOf(reorderBench(drafts, "u", { stage: "s_1", to: 0, after: 5, expect_rev: 1 })),
    /^bench\/bad-body\|after must be a stage id string/,
  );
});

// ── group / ungroup ─────────────────────────────────────────────

test("group refuses short/non-array/unknown id sets; ungroup refuses non-groups", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  assert.match(
    await codeOf(groupBench(drafts, "s", { stages: "a", expect_rev: 0 })),
    /^bench\/bad-body\|stages must be an array/,
  );
  assert.match(
    await codeOf(groupBench(drafts, "s", { stages: ["a"], expect_rev: 0 })),
    /^bench\/bad-body\|stages must be an array/,
  );
  assert.match(
    await codeOf(groupBench(drafts, "s", { stages: ["a", "ghost"], expect_rev: 0 })),
    /^bench\/stage-not-found\|group: unknown stage id/,
  );
  const grouped = await groupBench(drafts, "s", { stages: ["a", "b"], expect_rev: 0 });
  assert.match(grouped.stage, /^g_r0c2_/);
  assert.match(
    await codeOf(ungroupBench(drafts, "s", { stage: 5, expect_rev: 1 })),
    /^bench\/bad-body\|stage is required/,
  );
  // A fresh bench's plain stage is not a group.
  await ensureBench(drafts, { session: "t", stages: [{ id: "x" }] });
  assert.match(
    await codeOf(ungroupBench(drafts, "t", { stage: "x", expect_rev: 0 })),
    /^bench\/stage-not-found\|ungroup: no group stage/,
  );
});

// ── remove_stage / rewire ───────────────────────────────────────

test("remove_stage refuses non-string and unknown stages", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  assert.match(
    await codeOf(removeStageBench(drafts, "s", { stage: 5, expect_rev: 0 })),
    /^bench\/bad-body\|stage is required/,
  );
  assert.match(
    await codeOf(removeStageBench(drafts, "s", { stage: "ghost", expect_rev: 0 })),
    /^bench\/stage-not-found/,
  );
});

test("rewire refuses missing input, unknown stages, non-record from; clear and rebind round-trip", async () => {
  const drafts = await boot();
  // (2026-09-15 wiring law: the wired channel must be spelled —
  // params carry $image; the upstream 'b' must sit on the bench.)
  await ensureBench(drafts, {
    session: "s",
    stages: [
      { id: "a", params: { image: "$image" } },
      { id: "b" },
    ],
  });
  assert.match(
    await codeOf(rewireBench(drafts, "s", { stage: "a", expect_rev: 0 })),
    /^bench\/bad-body\|stage and input are required/,
  );
  assert.match(
    await codeOf(rewireBench(drafts, "s", { stage: "ghost", input: "image", expect_rev: 0 })),
    /^bench\/stage-not-found/,
  );
  assert.match(
    await codeOf(rewireBench(drafts, "s", { stage: "a", input: "image", from: "junk", expect_rev: 0 })),
    /^bench\/bad-body\|from must be/,
  );
  // Bind (added:true inverse), rebind (before rides), clear (delete).
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { initial: "image" }, expect_rev: 0 });
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { stage: "b", output: "default" }, expect_rev: 1 });
  const cleared = await rewireBench(drafts, "s", { stage: "a", input: "image", expect_rev: 2 });
  assert.equal(cleared.rev, 3);
  const doc = getBench(drafts, "s");
  const st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal("image" in st.inputs, false, "cleared");
});

// ── the remaining arms: voices, authors, defaults, robustness ──

test("mutation arms carry the bad-session/not-found/missing-expect_rev voices", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  assert.match(
    await codeOf(patchBench(drafts, "no!", { stage: "a", params: {}, expect_rev: 0 })),
    /^bench\/bad-session/,
  );
  // STROKE 46g: writes on an unborn bench BIRTH it (rev 0 doc) — the
  // forever fix; "ghost" now exists, so patch on a MISSING STAGE
  // refuses in the stage's own voice.
  assert.match(
    await codeOf(patchBench(drafts, "ghost", { stage: "a", params: {}, expect_rev: 0 })),
    /^bench\/stage-not-found/,
  );
  assert.match(
    await codeOf(patchBench(drafts, "s", { stage: "a", params: { x: 1 } })),
    /^bench\/cas-conflict\|expect_rev is required/,
  );
});

test("normalizeStages: non-string ids mint s_<i>; every explicit field is kept; birth honors author user", async () => {
  const drafts = await boot();
  const ensured = await ensureBench(drafts, {
    session: "s",
    author: "user",
    stages: [
      { id: 5 },
      {
        id: "full", engine: "blender", inputs: { i: { initial: "image" } },
        params: { steps: 2, i: "$i" }, outputs: { default: "mask" }, provenance: "user",
      },
    ],
  });
  assert.equal(ensured.created, true);
  const doc = getBench(drafts, "s");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["s_0", "full"]);
  const bare = (doc.stages as Array<Record<string, unknown>>).find((x) => x["id"] === "s_0")!;
  assert.equal(bare["engine"], "comfyui", "default engine");
  assert.deepEqual(bare["inputs"], {});
  assert.deepEqual(bare["outputs"], { default: "image" });
  assert.equal(bare["provenance"], "user", "birth author rides the bare row");
  const full = (doc.stages as Array<Record<string, unknown>>).find((x) => x["id"] === "full")!;
  assert.equal(full["engine"], "blender");
  assert.deepEqual(full["outputs"], { default: "mask" });
  assert.equal(full["provenance"], "user", "explicit provenance kept");
});

test("every mutation arm honors author user (the log names them)", async () => {
  const drafts = await boot();
  // (2026-09-15 wiring law: 'b' spells the channel it wires.)
  await ensureBench(drafts, {
    session: "s",
    stages: [{ id: "a" }, { id: "b", params: { image: "$image" } }],
  });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0, author: "user" });
  const grouped = await groupBench(drafts, "s", { stages: ["a", "b"], expect_rev: 1, author: "user" });
  await ungroupBench(drafts, "s", { stage: grouped.stage, expect_rev: 2, author: "user" });
  await reorderBench(drafts, "s", { stage: "b", to: 0, expect_rev: 3, author: "user" });
  await rewireBench(drafts, "s", { stage: "b", input: "image", from: { initial: "image" }, expect_rev: 4, author: "user" });
  await removeStageBench(drafts, "s", { stage: "b", expect_rev: 5, author: "user" });
  const doc = getBench(drafts, "s");
  const kinds = new Set((doc.log as Array<{ author: string; kind: string }>).map((e) => e.kind));
  assert.equal((doc.log as Array<{ author: string }>).every((e) => e.author === "user"), true);
  assert.equal(kinds.size, 6, "six authored entries");
});

test("add_stage keeps explicit params/inputs/outputs records", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s" });
  const added = await addStageBench(drafts, "s", {
    card: "hero",
    params: { steps: 4, seed: "$seed" },
    inputs: { seed: { initial: "text" } },
    outputs: { default: "mask" },
    expect_rev: 0,
  });
  const doc = getBench(drafts, "s");
  const row = (doc.stages as Array<Record<string, unknown>>).find((x) => x["id"] === added.stage)!;
  assert.deepEqual(row["params"], { steps: 4, seed: "$seed" });
  assert.deepEqual(row["inputs"], { seed: { initial: "text" } });
  assert.deepEqual(row["outputs"], { default: "mask" });
});

test("group with duplicate ids refuses: one bench row cannot fill two slots", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  assert.match(
    await codeOf(groupBench(drafts, "s", { stages: ["a", "a"], expect_rev: 0 })),
    /^bench\/stage-not-found\|group: unknown stage id\(s\) — have 1 of 2/,
  );
});

test("ungroup on a junk-children compound removes it and spills nothing", async () => {
  const drafts = await boot();
  await seed(drafts, "junkgrp", {
    stages: [
      { id: "plain" },
      { id: "g0", card: "group", children: "junk" },
    ],
    bench: { rev: 0, log: [] },
  });
  const out = await ungroupBench(drafts, "junkgrp", { stage: "g0", expect_rev: 0 });
  assert.equal(out.rev, 1);
  const doc = getBench(drafts, "junkgrp");
  assert.deepEqual(
    (doc.stages as Array<{ id: string }>).map((x) => x.id),
    ["plain"],
  );
});

test("rewire on a stage with no inputs record births one", async () => {
  const drafts = await boot();
  // Seeded raw (past normalize): the stage carries NO inputs field
  // (but spells the channel — the 2026-09-15 wiring law).
  await seed(drafts, "bare", {
    stages: [{ id: "bare", params: { image: "$image" } }],
    bench: { rev: 0, log: [] },
  });
  const wired = await rewireBench(drafts, "bare", {
    stage: "bare", input: "image", from: { initial: "image" }, expect_rev: 0,
  });
  assert.equal(wired.rev, 1);
  const doc = getBench(drafts, "bare");
  const st = (doc.stages as Array<{ id: string; inputs: Record<string, unknown> }>).find((x) => x.id === "bare")!;
  assert.deepEqual(st.inputs, { image: { initial: "image" } });
});

test("undo defaults n to 1 on junk values", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await addStageBench(drafts, "s", { card: "x", expect_rev: 1 });
  const undone = await undoBench(drafts, "s", { n: "junk", expect_rev: 2 });
  assert.deepEqual(undone.undone, [2], "n=junk collapsed to 1");
});

test("the author filter skips foreign entries while collecting", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0, author: "agent" });
  await patchBench(drafts, "s", { stage: "a", params: { x: 2 }, expect_rev: 1, author: "user" });
  // n=2 but only the user's entry qualifies: the agent entry is
  // SKIPPED by the walk (never a target).
  const undone = await undoBench(drafts, "s", { n: 2, author: "user", expect_rev: 2 });
  assert.deepEqual(undone.undone, [2]);
});

// ── the id mint's shape guard ───────────────────────────────────

test("a row id outside the s_N shape never feeds the mint (max stays, s_0 rides next)", async () => {
  const drafts = await boot();
  // a crafted bench with a free-form row id (agent-authored rows can
  // carry any string; the mint only counts /s_(\d+)/ suffixes)
  await seed(drafts, "mintshape", {
    stages: [
      { id: "hero-1", card: "x" },
      { id: "s_7", card: "x" },
      { id: "note" },
      // a null id row: String(null ?? "") — the empty string, never
      // the literal "null"
      { card: "x", id: null },
    ],
  });
  const added = await addStageBench(drafts, "mintshape", {
    card: "hero",
    expect_rev: 0,
  });
  // hero-1/note are INVISIBLE to the mint; s_7 is the max — s_8 next
  assert.equal(added.stage, "s_8");
});

// ── MUTATION CONTAINMENT (the li-bc stroke, 2026-10-11) ──────────
//
// The deferred finding: remove_stage and rewire had refusal arms and
// intent-churn arms, but no arm proved the CONTAINMENT law — that a
// mutation touches exactly what it names and nothing else. A remove
// that also dropped a survivor's history, or a rewire that rewrote a
// bystander's params, would pass every existing arm (the intent
// re-derives fine; the id mint is intact). The judged-and-stored
// view arms (bench-model-admission) and the junk-model refusals rode
// in with li-ax; containment is this block's whole job.
describe("MUTATION CONTAINMENT — a mutation touches only what it names", () => {
  // each row wires to ANOTHER stage (a self-wire refuses at read —
  // the door's own law); backward wiring is legal by order-independence
  const richRow = (id: string, card: string, wiredTo: string): Record<string, unknown> => ({
    id, card, params: { prompt: `p-${id}`, seed: 7, image: "$image" },
    inputs: { image: { stage: wiredTo, output: "default" } },
    outputs: { default: "image" },
    history: [{ run_id: "run-0f1e2d-old", url: "/x/old.png" }],
    provenance: "agent",
  });

  test("remove_stage preserves every survivor BYTE-IDENTICALLY (disk re-read, not the in-memory doc)", async () => {
    const drafts = await boot();
    await seed(drafts, "contain-rm", {
      intent: "tts",
      stages: [richRow("s_0", "tts", "s_2"), richRow("s_1", "tts", "s_0"), richRow("s_2", "tts", "s_0")],
    });
    const before = await getBench(drafts, "contain-rm");
    const beforeStages = before.stages as Array<Record<string, unknown>>;
    const survivorBefore = JSON.stringify(beforeStages.filter((s) => s["id"] !== "s_1"));
    await removeStageBench(drafts, "contain-rm", { stage: "s_1", expect_rev: 0 });
    const after = await getBench(drafts, "contain-rm");
    const afterStages = after.stages as Array<Record<string, unknown>>;
    // the survivor set is unchanged, byte for byte — no re-derivation
    // churn, no history loss, no params rewrite riding the removal
    const survivorAfter = JSON.stringify(afterStages);
    assert.equal(survivorAfter, survivorBefore,
      "remove_stage may drop ONLY the named row — survivors ride byte-identical");
    assert.equal(afterStages.length, 2, "exactly the named row left");
  });

  test("rewire touches ONLY the target row's inputs — every bystander is byte-identical", async () => {
    const drafts = await boot();
    await seed(drafts, "contain-rw", {
      intent: "tts",
      stages: [
        richRow("s_0", "tts", "s_2"),
        { ...richRow("s_1", "tts", "s_0"), inputs: { image: { stage: "s_0", output: "default" } } },
        richRow("s_2", "tts", "s_0"),
      ],
    });
    // snapshot as BYTES (getBench can serve the domain's cached doc —
    // the same object references the rewire mutates in place)
    const snap = (b: Record<string, unknown>): Record<string, unknown> =>
      JSON.parse(JSON.stringify(b)) as Record<string, unknown>;
    const before = snap(await getBench(drafts, "contain-rw") as unknown as Record<string, unknown>);
    await rewireBench(drafts, "contain-rw", {
      stage: "s_1", input: "image", from: { stage: "s_2", output: "default" }, expect_rev: 0,
    });
    const after = snap(await getBench(drafts, "contain-rw") as unknown as Record<string, unknown>);
    const rowsAfter = after["stages"] as Array<Record<string, unknown>>;
    const rowsBefore = before["stages"] as Array<Record<string, unknown>>;
    for (const row of rowsAfter) {
      if (row["id"] === "s_1") continue;
      const src = rowsBefore.find((s) => s["id"] === row["id"])!;
      assert.equal(JSON.stringify(row), JSON.stringify(src),
        `bystander ${String(row["id"])} is byte-identical after rewire`);
    }
    const target = rowsAfter.find((s) => s["id"] === "s_1")!;
    const targetBefore = rowsBefore.find((s) => s["id"] === "s_1")!;
    // the target's inputs changed — and NOTHING else on the target
    assert.notEqual(JSON.stringify(target["inputs"]), JSON.stringify(targetBefore["inputs"]),
      "the rewire landed on the target's inputs");
    const { inputs: _i, ...targetRest } = target;
    const { inputs: _j, ...beforeRest } = targetBefore;
    assert.equal(JSON.stringify(targetRest), JSON.stringify(beforeRest),
      "the target's non-input members are untouched");
  });
});

// ── archive: F11's spent-stage mark (2026-11-12) ─────────────────
// The friction burn: spent stages re-ran ahead of newer stages,
// blocking the queue until manually removed. The mark keeps the row
// (result + history — the provenance remove_stage destroys) and
// every run face skips it. A LIVE stage wiring the row refuses the
// archive (the wire would dangle at run time).

test("archive marks the row and keeps its provenance; every run face reads the mark", async () => {
  const drafts = await boot();
  await seed(drafts, "arc1", {
    stages: [
      { id: "a", card: "hero", params: { steps: 4 },
        runStatus: "done", result: { run_id: "r-1", url: "/runs/r-1/out.png" } },
      { id: "b", card: "side", params: { steps: 2 } },
    ],
  });
  const ans = await archiveBench(drafts, "arc1", { stage: "a", expect_rev: 0 });
  assert.equal(ans.stage, "a");
  const stages = getBench(drafts, "arc1").stages as Array<Record<string, unknown>>;
  assert.equal(stages.length, 2, "the row STAYS — archive never removes");
  assert.equal(stages[0]!["archived"], true, "the mark rides the spent row");
  assert.deepEqual(stages[0]!["result"], { run_id: "r-1", url: "/runs/r-1/out.png" },
    "the provenance remove_stage destroys survives the mark");
  assert.equal(stages[1]!["archived"], undefined, "the live row is untouched");
  // the log entry carries the inverse
  const log = getBench(drafts, "arc1").log as Array<Record<string, unknown>>;
  assert.equal(log[log.length - 1]!["kind"], "archive");
  // unarchive clears it
  await archiveBench(drafts, "arc1", { stage: "a", off: true, expect_rev: 1 });
  const after = getBench(drafts, "arc1").stages as Array<Record<string, unknown>>;
  assert.equal(after[0]!["archived"], undefined, "off: true restores the run set");
});

test("archiving a stage a LIVE stage wires to REFUSES naming the wire (never a dangling run input)", async () => {
  const drafts = await boot();
  await seed(drafts, "arc2", {
    stages: [
      { id: "up", card: "hero", params: { steps: 4 } },
      { id: "down", card: "side", params: { source: "$source" },
        inputs: { source: { stage: "up", output: "default" } } },
    ],
  });
  const refusal = await codeOf(archiveBench(drafts, "arc2", { stage: "up", expect_rev: 0 }));
  assert.ok(refusal.startsWith("bench/wire-stage-not-found|"), refusal);
  assert.match(refusal, /wired by live stage\(s\) down/);
  // archiving BOTH in dependency order lands: the consumer first,
  // then the upstream (no live row wires it anymore)
  await archiveBench(drafts, "arc2", { stage: "down", expect_rev: 0 });
  await archiveBench(drafts, "arc2", { stage: "up", expect_rev: 1 });
  const stages = getBench(drafts, "arc2").stages as Array<Record<string, unknown>>;
  assert.equal(stages[0]!["archived"], true);
  assert.equal(stages[1]!["archived"], true);
});

test("archive refuses unknown keys, a missing stage, and a ghost id loud", async () => {
  const drafts = await boot();
  await seed(drafts, "arc3", { stages: [{ id: "a", card: "hero", params: {} }] });
  assert.ok(
    (await codeOf(archiveBench(drafts, "arc3", { stage: "a", bogus: 1, expect_rev: 0 } as Record<string, unknown>)))
      .startsWith("bench/bad-body|"),
  );
  assert.ok(
    (await codeOf(archiveBench(drafts, "arc3", { expect_rev: 0 })))
      .startsWith("bench/bad-body|"),
  );
  assert.ok(
    (await codeOf(archiveBench(drafts, "arc3", { stage: "ghost", expect_rev: 0 })))
      .startsWith("bench/stage-not-found|"),
  );
  // CAS holds: a stale expect_rev refuses
  assert.ok(
    (await codeOf(archiveBench(drafts, "arc3", { stage: "a", expect_rev: 99 })))
      .startsWith("bench/cas-conflict|"),
  );
});
