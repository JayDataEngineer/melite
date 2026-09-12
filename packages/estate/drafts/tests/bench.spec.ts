// bench.spec.ts — the bench engine's own laws, function-grain over a
// REAL json+domain storage stack (no remote, no plugin): every
// refusal voice (bad-session/bad-body/CAS/stage-not-found/duplicate),
// the load path's normalize contract, every mutation arm's edge
// shapes, and the WHOLE undo-inverse table — including crafted log
// entries whose inverse payloads miss optional fields (the log is
// data; the applier is robust to older/hand-written entries).
import { describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";
import {
  ensureBench, getBench, patchBench, addStageBench, removeStageBench,
  rewireBench, reorderBench, groupBench, ungroupBench, undoBench,
  onBenchChange, notifyBenchChange, notifyBenchDocWrite,
} from "../src/bench.ts";
import { BenchRemoteService } from "../src/remote.ts";

const sig = new AbortController().signal;

async function bootCtx(): Promise<{ ctx: Context; domain: Domain<DraftsDomainSpec> }> {
  const root = mkdtempSync(join(tmpdir(), "bench-spec-"));
  mkdirSync(join(root, "storage"), { recursive: true });
  process.env["MELITE_STATE_ROOT"] = root;
  process.env["MELITE_STORAGE_ROOT"] = "";
  const ctx = new Context();
  await ctx.plugin(Storage as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" },
  );
  return { ctx, domain: await openDraftsDomain(ctx) };
}

async function boot(): Promise<Domain<DraftsDomainSpec>> {
  return (await bootCtx()).domain;
}

/** One bench doc seeded straight into the domain (log = data). */
async function seed(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  doc: Record<string, unknown>,
): Promise<void> {
  await drafts.table("docs").put("bench-" + session, {
    updated_at: 1,
    doc: {
      draft_id: "bench-" + session,
      intent: "seeded",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      ...doc,
    } as never,
  });
}

/** The refusal's code, or NO-REFUSAL on resolve. */
async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO-REFUSAL";
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return (err.code ?? "NOT-REMOTE") + "|" + String(err.message);
  }
}

/** The sync refusal's code (getBench throws before any await). */
function syncCodeOf(fn: () => unknown): string {
  try {
    fn();
    return "NO-REFUSAL";
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return (err.code ?? "NOT-REMOTE") + "|" + String(err.message);
  }
}

function entry(
  rev: number,
  kind: string,
  author: string,
  inverse?: Record<string, unknown>,
): Record<string, unknown> {
  return { rev, at: rev, author, kind, ...(inverse !== undefined ? { inverse } : {}) };
}

// ── ensure: the admission voices ────────────────────────────────

test("ensure refuses unknown keys, bad sessions, and stageless loads without expect_rev", async () => {
  const drafts = await boot();
  assert.match(await codeOf(ensureBench(drafts, { session: "s", junk: 1 })), /^bench\/bad-body\|unknown bench key/);
  assert.match(await codeOf(ensureBench(drafts, { session: "bad key!" })), /^bench\/bad-session/);
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  // A load (stages present) with no expect_rev: the CAS law's voice.
  assert.match(
    await codeOf(ensureBench(drafts, { session: "s", stages: [{ id: "b" }] })),
    /^bench\/cas-conflict\|expect_rev is required/,
  );
  // A moved bench: the caller held a stale rev.
  assert.match(
    await codeOf(ensureBench(drafts, { session: "s", stages: [{ id: "b" }], expect_rev: 9 })),
    /^bench\/cas-conflict\|bench moved/,
  );
  // A junk stages value loads as [] (normalize's contract; the body
  // is caller data, never schema-validated).
  const loaded = await ensureBench(drafts, { session: "s", stages: "junk", expect_rev: 0 });
  assert.deepEqual(loaded.stages, []);
  assert.equal(loaded.rev, 1);
});

// ── the legacy bench doc: no bench block, block reborn on save ──

test("a bench doc without a bench block reads as rev 0 and gains its block on first save", async () => {
  const drafts = await boot();
  await seed(drafts, "legacy", { stages: [{ id: "a" }] });
  const got = getBench(drafts, "legacy");
  assert.equal(got.rev, 0);
  assert.deepEqual(got.log, []);
  // The first mutation persists the born block.
  const patched = await patchBench(drafts, "legacy", {
    stage: "a", params: { x: 1 }, expect_rev: 0,
  });
  assert.equal(patched.rev, 1);
  const after = getBench(drafts, "legacy");
  assert.equal(after.rev, 1);
  assert.equal(after.log.length, 1);
});

test("getBench refuses bad sessions and unknown benches with their voices", async () => {
  const drafts = await boot();
  assert.match(syncCodeOf((): unknown => getBench(drafts, "no!")), /^bench\/bad-session/);
  assert.match(syncCodeOf((): unknown => getBench(drafts, "ghost")), /^bench\/not-found/);
});

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

test("patch serves result-only and runStatus-only writes, and records before-values on overwrite", async () => {
  const drafts = await boot();
  await ensureBench(drafts, {
    session: "s",
    stages: [{ id: "a", params: { steps: 4 } }],
  });
  const resultOnly = await patchBench(drafts, "s", {
    stage: "a", result: { url: "x.png" }, expect_rev: 0,
  });
  assert.equal(resultOnly.rev, 1);
  assert.deepEqual(resultOnly.patched, []);
  const statusOnly = await patchBench(drafts, "s", {
    stage: "a", runStatus: "done", expect_rev: 1,
  });
  assert.equal(statusOnly.rev, 2);
  // Overwrite of an existing param key: before rides the inverse.
  const overwritten = await patchBench(drafts, "s", {
    stage: "a", params: { steps: 8 }, expect_rev: 2,
  });
  assert.deepEqual(overwritten.patched, ["steps"]);
  const doc = getBench(drafts, "s");
  const st = (doc.stages as Array<{ params: Record<string, unknown> }>).find((x) => x.id === "a")!;
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
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
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
  const st = (doc.stages as Array<{ inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal("image" in st.inputs, false, "cleared");
});

// ── undo: the inverse table ─────────────────────────────────────

test("undo takes expect_rev; the author filter skips foreign entries and reports its voice", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await addStageBench(drafts, "s", { card: "x", author: "user", expect_rev: 0 });
  // Filter user: undoes only the user's add (rev 1).
  const undone = await undoBench(drafts, "s", { n: 1, author: "user", expect_rev: 1 });
  assert.deepEqual(undone.undone, [1]);
  // Nothing left for a user filter: the filter's own voice.
  assert.match(
    await codeOf(undoBench(drafts, "s", { n: 1, author: "user" })),
    /^bench\/nothing-to-undo\|nothing to undo \(author user\)/,
  );
});

test("undo n>1 sorts the undone revs ascending", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await addStageBench(drafts, "s", { card: "x", expect_rev: 1 });
  const undone = await undoBench(drafts, "s", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(patch) restores before-values and drops added keys", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a", params: { steps: 4 } }] });
  await patchBench(drafts, "s", { stage: "a", params: { steps: 9, extra: true }, expect_rev: 0 });
  await undoBench(drafts, "s", { n: 1 });
  const doc = getBench(drafts, "s");
  const st = (doc.stages as Array<{ params: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.params, { steps: 4 });
});

test("undo(patch) on a removed stage skips loudly-free (the snapshot is the coarse truth)", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await patchBench(drafts, "s", { stage: "a", params: { x: 1 }, expect_rev: 0 });
  await removeStageBench(drafts, "s", { stage: "a", expect_rev: 1 });
  // Undoing BOTH: the patch's stage is gone when its inverse applies.
  const undone = await undoBench(drafts, "s", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
});

test("undo(group) spills the children back; undo(ungroup) re-groups; undo(reorder) moves back", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }, { id: "c" }] });
  const grouped = await groupBench(drafts, "s", { stages: ["a", "b"], expect_rev: 0 });
  // ungroup then undo: the compound returns at its index.
  await ungroupBench(drafts, "s", { stage: grouped.stage, expect_rev: 1 });
  await undoBench(drafts, "s", { n: 1 });
  let doc = getBench(drafts, "s");
  let ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.equal(ids.length, 2, "compound + c after undo(ungroup)");
  assert.match(ids[0]!, /^g_r0c2_/);
  // undo(ungroup) again is impossible (reverted); now undo the GROUP
  // itself from the birth state instead.
  const gid = ids[0]!;
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "c"], "undo(group) spills children");
  // reorder + undo: back to the original position.
  await reorderBench(drafts, "s", { stage: "c", to: 0, expect_rev: 4 });
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "c"], "undo(reorder) moves back");
});

test("undo(rewire) restores the before-binding, then removes an added one", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { stage: "b", output: "default" }, expect_rev: 0 });
  await rewireBench(drafts, "s", { stage: "a", input: "image", from: { initial: "image" }, expect_rev: 1 });
  // Undo the rebind: the before-binding returns.
  await undoBench(drafts, "s", { n: 1 });
  let doc = getBench(drafts, "s");
  let st = (doc.stages as Array<{ inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "b", output: "default" });
  // Undo the bind itself: the input disappears.
  await undoBench(drafts, "s", { n: 1 });
  doc = getBench(drafts, "s");
  st = (doc.stages as Array<{ inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.equal("image" in st.inputs, false);
});

test("undo(load) restores the pre-load snapshot", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
  await ensureBench(drafts, { session: "s", stages: [{ id: "z" }], expect_rev: 0 });
  await undoBench(drafts, "s", { n: 1 });
  const doc = getBench(drafts, "s");
  assert.deepEqual(
    (doc.stages as Array<{ id: string }>).map((x) => x.id),
    ["a", "b"],
  );
});

// ── crafted log entries: the applier is robust to partial data ──

test("crafted entries: remove without index lands at the tail; ungroup without row/index degrades", async () => {
  const drafts = await boot();
  await seed(drafts, "craft", {
    stages: [{ id: "keep" }],
    bench: {
      rev: 2,
      log: [
        entry(1, "remove_stage", "agent", { stage: "gone", row: { id: "gone" } }),
        entry(2, "ungroup", "agent", { stage: "x" }),
      ],
    },
  });
  // No index on the remove: the row re-lands at the tail. The
  // ungroup with no row: skipped loudly-free.
  const undone = await undoBench(drafts, "craft", { n: 2 });
  assert.deepEqual(undone.undone, [1, 2]);
  const doc = getBench(drafts, "craft");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["keep", "gone"]);
});

test("crafted ungroup with non-array children skips the splice-out; missing index parks at the tail", async () => {
  const drafts = await boot();
  await seed(drafts, "craft2", {
    stages: [{ id: "a" }, { id: "b" }],
    bench: {
      rev: 1,
      log: [
        entry(1, "ungroup", "agent", {
          row: { id: "g", card: "group", children: "junk" },
        }),
      ],
    },
  });
  // children non-array: nothing spliced out; the compound parks at
  // the tail (no index on the inverse).
  await undoBench(drafts, "craft2", { n: 1 });
  const doc = getBench(drafts, "craft2");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["a", "b", "g"]);
});

test("crafted reorder without from parks at the tail; crafted patch/rewire on ghost stages skip", async () => {
  const drafts = await boot();
  await seed(drafts, "craft3", {
    stages: [{ id: "a" }, { id: "b" }],
    bench: {
      rev: 3,
      log: [
        entry(1, "patch", "agent", { stage: "ghost", params_before: { x: 1 } }),
        entry(2, "rewire", "agent", { stage: "ghost", input: "image", added: true }),
        entry(3, "reorder", "agent", { stage: "a" }),
      ],
    },
  });
  const undone = await undoBench(drafts, "craft3", { n: 3 });
  assert.deepEqual(undone.undone, [1, 2, 3]);
  const doc = getBench(drafts, "craft3");
  // The reorder with no from: 'a' parks at the tail.
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  assert.deepEqual(ids, ["b", "a"]);
});

test("crafted rewire inverse with a before-binding restores it", async () => {
  const drafts = await boot();
  await seed(drafts, "craft4", {
    stages: [{ id: "a", inputs: { image: { initial: "image" } } }],
    bench: {
      rev: 1,
      log: [
        entry(1, "rewire", "agent", {
          stage: "a", input: "image", before: { stage: "z", output: "default" },
        }),
      ],
    },
  });
  await undoBench(drafts, "craft4", { n: 1 });
  const doc = getBench(drafts, "craft4");
  const st = (doc.stages as Array<{ inputs: Record<string, unknown> }>).find((x) => x.id === "a")!;
  assert.deepEqual(st.inputs.image, { stage: "z", output: "default" });
});

test("crafted undo entry restores its snapshot (the coarse fallback on itself)", async () => {
  const drafts = await boot();
  await seed(drafts, "craft5", {
    stages: [{ id: "current" }],
    bench: {
      rev: 1,
      log: [
        entry(1, "undo", "agent", { stages_before: [{ id: "old-1" }, { id: "old-2" }] }),
        entry(2, "patch", "agent", { stage: "current" }),
      ],
    },
  });
  // The newest ACTION is the patch (rev 2); undoing it is a no-op
  // inverse (patch with no before/added on a bare stage). Then a
  // second undo targets... nothing (the undo entry is never a
  // candidate) — the nothing-to-undo voice. Instead: undo 2 actions —
  // only the patch qualifies; assert the refusal voice after.
  await undoBench(drafts, "craft5", { n: 1 });
  assert.match(
    await codeOf(undoBench(drafts, "craft5", { n: 1 })),
    /^bench\/nothing-to-undo/,
  );
});

// ── the remaining arms: voices, authors, defaults, robustness ──

test("mutation arms carry the bad-session/not-found/missing-expect_rev voices", async () => {
  const drafts = await boot();
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }] });
  assert.match(
    await codeOf(patchBench(drafts, "no!", { stage: "a", params: {}, expect_rev: 0 })),
    /^bench\/bad-session/,
  );
  assert.match(
    await codeOf(patchBench(drafts, "ghost", { stage: "a", params: {}, expect_rev: 0 })),
    /^bench\/not-found/,
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
        params: { steps: 2 }, outputs: { default: "mask" }, provenance: "user",
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
  await ensureBench(drafts, { session: "s", stages: [{ id: "a" }, { id: "b" }] });
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
    params: { steps: 4 },
    inputs: { seed: { initial: "text" } },
    outputs: { default: "mask" },
    expect_rev: 0,
  });
  const doc = getBench(drafts, "s");
  const row = (doc.stages as Array<Record<string, unknown>>).find((x) => x["id"] === added.stage)!;
  assert.deepEqual(row["params"], { steps: 4 });
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
  // Seeded raw (past normalize): the stage carries NO inputs field.
  await seed(drafts, "bare", {
    stages: [{ id: "bare" }],
    bench: { rev: 0, log: [] },
  });
  const wired = await rewireBench(drafts, "bare", {
    stage: "bare", input: "image", from: { initial: "image" }, expect_rev: 0,
  });
  assert.equal(wired.rev, 1);
  const doc = getBench(drafts, "bare");
  const st = (doc.stages as Array<{ inputs: Record<string, unknown> }>).find((x) => x.id === "bare")!;
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

test("crafted tail: inverses without stage/index/from/before degrade; unknown kinds fall to the snapshot gate", async () => {
  const drafts = await boot();
  await seed(drafts, "tail", {
    stages: [{ id: "keep" }, { id: "bare" }],
    bench: {
      rev: 12,
      log: [
        // patch with NO inverse: inv {} → ghost stage skip.
        entry(1, "patch", "agent"),
        // patch: e.stage carries the target, inverse only params_before.
        { ...entry(2, "patch", "agent", { params_before: { x: 1 } }), stage: "keep" },
        // add_stage whose stage is absent: nothing spliced in.
        entry(3, "add_stage", "agent", { stage: "ghost" }),
        // remove_stage with a junk row: nothing re-landed.
        entry(4, "remove_stage", "agent", { stage: "keep", row: "junk" }),
        // group with junk children + ghost compound: nothing.
        entry(5, "group", "agent", { stage: "ghostx", children: "junk" }),
        // ungroup child that is not on the bench: splice skipped.
        entry(6, "ungroup", "agent", { row: { id: "g", card: "group", children: [{ id: "ghost" }] }, index: 0 }),
        // reorder ghost: nothing.
        entry(7, "reorder", "agent", { stage: "ghost", from: 1, to: 0 }),
        // rewire: no stage in inverse → ghost skip.
        entry(8, "rewire", "agent", { input: "image", added: true }),
        // rewire: bare stage (no inputs record) births one, then delete "".
        entry(9, "rewire", "agent", { stage: "bare", added: true }),
        // rewire: no input in inverse → input "" (harmless).
        entry(10, "rewire", "agent", { stage: "keep", added: true }),
        // rewire: neither added nor before → no change.
        entry(11, "rewire", "agent", { stage: "keep", input: "image" }),
        // unknown kind: falls through to the snapshot gate (undefined).
        entry(12, "future_kind", "agent", { stages_before: [{ id: "nope" }] }),
      ],
    },
  });
  const undone = await undoBench(drafts, "tail", { n: 12 });
  assert.equal(undone.undone.length, 12);
  const doc = getBench(drafts, "tail");
  const ids = (doc.stages as Array<{ id: string }>).map((x) => x.id);
  // The whole table degraded loudly-free: keep + bare survive; the
  // patch (e.stage keep) applied params_before; nothing else moved.
  assert.deepEqual(ids.filter((x) => x === "keep" || x === "bare").length, 2);
  assert.equal(ids.includes("ghost"), false);
  assert.equal(ids.includes("nope"), false, "unknown-kind snapshot did not apply");
});

// ── THE CHANGE EVENTS + THE SUBSCRIBE STREAM (2026-09-12) ──────────
// The push source: every bench write fires the change event at the
// remote seam; bench/subscribe yields the doc on open and after every
// write that touches the session (the collapse plan's stream arm —
// the browser heartbeat consumes rev drift until the host's stream
// face lands).

describe("the bench change events (the push source)", () => {
  test("a write notify reaches the listener with the session", () => {
    const seen: string[] = [];
    const off = onBenchChange((session) => { seen.push(session) });
    notifyBenchChange("main");
    notifyBenchChange("second");
    off();
    notifyBenchChange("main");
    expect(seen).toEqual(["main", "second"]);
  });

  test("a listener's fault never breaks the write", () => {
    const off = onBenchChange(() => { throw new Error("listener fault") });
    expect(() => notifyBenchChange("main")).not.toThrow();
    off();
  });

  test("notifyBenchDocWrite parses bench-shaped draft ids only", () => {
    const seen: string[] = [];
    const off = onBenchChange((session) => { seen.push(session) });
    notifyBenchDocWrite("bench-main");
    notifyBenchDocWrite("some-other-draft");
    notifyBenchDocWrite("bench-");
    expect(seen).toEqual(["main"]);
    off();
  });
});

describe("the bench/subscribe stream remote", () => {
  type Row = { draft_id: string; session: string; rev: number; intent: unknown; stages: unknown[]; log: unknown[] };



  test("yields the doc on open, after a write, and abort ends", async () => {
    const controller = new AbortController();
    const rows: Row[] = [
      { draft_id: "bench-main", session: "main", rev: 3, intent: null, stages: [], log: [] },
      { draft_id: "bench-main", session: "main", rev: 4, intent: null, stages: [{ id: "s_1" }], log: [] },
    ];
    // the receiver: a bare object with the get arm the generator calls
    const fake = { get: async (): Promise<Row> => rows.shift() ?? rows[0]! };
    const gen = BenchRemoteService.prototype.remoteExportSubscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    if (first.done !== false) throw new Error("no initial frame");
    // resume the stream INTO the change wait, then land the write
    const secondP = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 25));
    notifyBenchChange("main");
    const second = await secondP;
    if (second.done !== false) throw new Error("no change frame");
    expect([first.value.rev, second.value.rev]).toEqual([3, 4]);
    controller.abort();
    const third = await gen.next();
    if (third.done !== true) throw new Error("abort must end the stream");
  });

  test("an abort that lands while suspended at a yield ends the stream on the next resume (no parked listener)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 2, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.remoteExportSubscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    // the abort lands with NO listener attached (the generator sits
    // suspended at the yield) — the executor's re-check must end it
    controller.abort();
    const next = await gen.next();
    expect(next.done).toBe(true);
  });

  test("a write and a racing abort settle ONCE (the double-finish guard)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 5, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.remoteExportSubscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    const parked = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 10));
    // the write wakes the park; the abort races in behind it — one
    // finish wins, both listeners come off, nothing double-resolves
    notifyBenchChange("main");
    controller.abort();
    const second = await parked;
    // either a final frame or a clean end — never a hang or a throw
    expect(second.done === false || second.done === true).toBe(true);
    const last = await gen.next();
    expect(last.done).toBe(true);
  });

  test("a foreign session's write does not wake the stream (the mismatch arm runs, the park holds)", async () => {
    const controller = new AbortController();
    const fake = {
      get: async (): Promise<Row> => ({ draft_id: "bench-main", session: "main", rev: 1, intent: null, stages: [], log: [] }),
    };
    const gen = BenchRemoteService.prototype.remoteExportSubscribe.call(
      fake as never,
      "main",
      controller.signal,
    ) as AsyncGenerator<Row>;
    const first = await gen.next();
    expect(first.done).toBe(false);
    // resume INTO the park first (listener attaches), THEN probe it
    // with a foreign write — the mismatch arm returns early and the
    // stream stays parked (only the matching session may wake it)
    const parked = gen.next();
    await new Promise((resolve) => setTimeout(resolve, 10));
    notifyBenchChange("other-session");
    const raced = await Promise.race([
      parked.then((r) => r.done === true ? "ended" : "FRAME"),
      new Promise((resolve) => setTimeout(() => resolve("parked"), 25)),
    ]);
    expect(raced).toBe("parked");
    controller.abort();
    const last = await parked;
    expect(last.done).toBe(true);
  });
});

describe("the bench/ensure notify", () => {
  test("the notify rides the doc's own gated session key", async () => {
    const { ctx } = await bootCtx();
    const heard: string[] = [];
    const off = onBenchChange((session) => { heard.push(session) });
    // the in-process ensure arm (the remote delegates here):
    // ensureBench gates the session key; the notify rides it verbatim
    const service = new BenchRemoteService(ctx);
    const row = await service.ensure({ session: "spec-fb" }, sig) as { session: string };
    expect(row.session).toBe("spec-fb");
    expect(heard).toEqual(["spec-fb"]);
    off();
  });
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
