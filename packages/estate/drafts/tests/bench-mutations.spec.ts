import { test } from "vitest";
import assert from "node:assert/strict";
import {
  ensureBench,
  getBench,
  patchBench,
  addStageBench,
  removeStageBench,
  rewireBench,
  reorderBench,
  groupBench,
  ungroupBench,
  undoBench,
} from "../src/bench.ts";
import { boot, seed, codeOf } from "./bench-helpers.ts";

// ── patch: the full arm set ─────────────────────────────────────

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
  const undone = await undoBench(drafts, "s", { n: "junk" });
  assert.deepEqual(undone.undone, [2], "n=junk collapsed to 1");
});

test("the author filter skips foreign entries while collecting", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0, author: "agent" });
  await patchBench(drafts, "s", { stage: "a", params: { x: 2 }, expect_rev: 1, author: "user" });
  // n=2 but only the user's entry qualifies: the agent entry is
  // SKIPPED by the walk (never a target).
  const undone = await undoBench(drafts, "s", { n: 2, author: "user" });
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
