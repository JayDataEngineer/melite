// restore-batch.spec.ts — THE RESTORE BATCH LAW (operator order a,
// 2026-10-21: "Restoring takes an extreme amount of time, you said
// you fixed this").
//
// The lesion: restoreRunToBench restored an N-stage flow with N+2
// sequential estate round trips — drafts/get, bench/get, then ONE
// bench/add-stage PER STAGE, each a full door cycle (load, CAS,
// normalize, admit, wiring admission, appendAndSave + its history
// event, observer wave). A five-stage flow was five writes and five
// waits; the operator watched the spinner for each.
//
// THE LAW: restoring an N-stage flow is ONE write — a single
// bench/add-stages call carrying every stage under one expect_rev
// (the batch door chains the CAS server-side: one load, one save,
// one history event, one observer wave). Zero per-stage
// bench/add-stage calls ride a restore.
//
// Run: npx vitest run packages/web/melite-card-view/tests/restore-batch.spec.ts
import { afterEach, describe, expect, test, vi } from "vitest";
import { unbindEstateRemote } from '@melite/card-base/client';
import { benchResultDefects } from "@melite/contracts";
import { mountEstateFakes } from "./estate-harness.ts";
import { restoreRunToBench } from "../src/client/cards-resource.ts";
import type { CardsRunValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function run(): CardsRunValue {
  return {
    kind: "run", runId: "r_1", status: "completed", draftId: draftIdOf("d_1"),
    stages: [], lastFrame: undefined,
  };
}

describe("restoreRunToBench — the batch law (one write per restore)", () => {
  test("an N-stage flow restores through ONE bench/add-stages call — never N add-stage round trips", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: 's_0', card: 'image-gen', title: 'hero', engine: 'comfyui', params: { prompt: 'a' } },
        { id: 's_1', card: 'image-edit', title: 'grade', engine: 'comfyui', params: { prompt: 'b' } },
        { id: 's_2', card: 'upscale-tools', title: 'scale', engine: 'comfyui', params: { model: 'x' } },
      ],
    });
    const report = await restoreRunToBench(run(), 'owner');
    expect(report.added).toBe(3);
    const batch = fakes.calls.filter((c) => c.method === "bench/add-stages");
    const singles = fakes.calls.filter((c) => c.method === "bench/add-stage");
    expect(batch.length, "one bench/add-stages call carries the whole flow").toBe(1);
    expect(singles.length, "no per-stage add-stage round trips ride a restore").toBe(0);
    const doc = batch[0]!.args["doc"] as Record<string, unknown>;
    const stages = doc["stages"];
    expect(Array.isArray(stages) && stages.length === 3).toBe(true);
    expect(typeof doc["expect_rev"]).toBe("number");
  });

  test("a single-stage flow rides the same batch door — one call, not a special case", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: 's_0', card: 'image-gen', title: 'hero', engine: 'comfyui', params: { prompt: 'a' } },
      ],
    });
    const report = await restoreRunToBench(run(), 'owner');
    expect(report.added).toBe(1);
    expect(fakes.calls.filter((c) => c.method === "bench/add-stages").length).toBe(1);
    expect(fakes.calls.filter((c) => c.method === "bench/add-stage").length).toBe(0);
  });

  test("a stageless producing draft refuses before any bench read", async () => {
    const fakes = mountEstateFakes({ draftStages: [] });
    await expect(restoreRunToBench(run(), 'owner')).rejects.toThrow(/no stages/);
    expect(fakes.calls.map((c) => c.method)).toEqual(["drafts/get"]);
  });
});

function runWithStages(): CardsRunValue {
  return {
    kind: "run", runId: "r_9", status: "completed", draftId: draftIdOf("d_9"),
    stages: [
      { id: "s_0", status: "completed", url: "/melite-media/runs/r_9/a.png", gallery: [{ name: "a.png" }] },
      // the hero LAST: the engine lists zzz.png first, the stage url names b.png
      { id: "s_1", status: "completed", url: "/melite-media/runs/r_9/b.png", gallery: [{ name: "zzz.png" }, { name: "b.png" }] },
    ],
    lastFrame: undefined,
  };
}

/** The batch body's rows (the ONE door the whole restore rides). */
function batchRows(fakes: { calls: Array<{ method: string; args: Record<string, unknown> }> }): Array<Record<string, unknown>> {
  const batch = fakes.calls.find((c) => c.method === "bench/add-stages");
  if (batch === undefined) throw new Error("no bench/add-stages call rode the restore");
  return (batch.args["doc"] as Record<string, unknown>)["stages"] as Array<Record<string, unknown>>;
}

/** One batch row's carried outcome (undefined when the row carried none). */
function rowOutcome(rows: Array<Record<string, unknown>>, id: string): Record<string, unknown> | undefined {
  return rows.find((r) => r["id"] === id)?.["outcome"] as Record<string, unknown> | undefined;
}

describe("restoreRunToBench — the alignment (row i's outcome is run stage i's terminal face, across every skip/drop)", () => {
  test("cardless stages skip but the alignment holds: each carded row carries its OWN outcome", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { engine: "comfyui", params: {} },
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
        { id: "s_x", engine: "comfyui", params: {} },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" } },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    expect(report.added).toBe(2);
    expect(report.skipped).toBe(2);
    expect(report.carried).toBe(2);
    // rows stayed aligned across the two skips: the FIRST row carries
    // s_0's outcome, the SECOND s_1's — a one-slot drift would paint
    // the wrong preview on both tiles.
    const rows = batchRows(fakes);
    expect((rowOutcome(rows, "s_0")!["result"] as Record<string, unknown>)["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect((rowOutcome(rows, "s_1")!["result"] as Record<string, unknown>)["url"]).toBe("/melite-media/runs/r_9/b.png");
    // the hero reorder rode the restore path, not just the builder unit:
    // s_1's gallery lists zzz.png first, the carried map still leads b.png.
    const s1 = rowOutcome(rows, "s_1")!["result"] as Record<string, unknown>;
    expect(Object.keys(s1["artifacts"] as Record<string, string>)[0]).toBe("b.png");
    expect(benchResultDefects(s1)).toEqual([]);
  });

  test("a colliding id drops from the row and the outcome follows anyway — it never addressed a seat", async () => {
    const fakes = mountEstateFakes({
      // the fake's default bench already holds s_0: the draft's s_0 collides
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    expect(report.added).toBe(1);
    expect(report.notes.join("; ")).toMatch(/already on the bench/);
    // the row dropped its colliding id (the door mints a fresh one) and the
    // outcome rides the ROW — the pre-existing s_0 keeps its own result,
    // and the carry can never repaint the old tile because it never
    // addresses a seat at all.
    const rows = batchRows(fakes);
    expect(rows[0]!).not.toHaveProperty("id");
    expect((rows[0]!["outcome"] as { result: Record<string, unknown> })["result"]["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect(report.carried).toBe(1);
  });

  test("an answer naming no seated ids changes nothing — the outcome rode the row, not the answer", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_9", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
      ],
      addStageNoIds: true,
    });
    const solo: CardsRunValue = { ...runWithStages(), stages: [
      { id: "s_9", status: "completed", url: "/melite-media/runs/r_9/a.png", gallery: [{ name: "a.png" }] },
    ] };
    const report = await restoreRunToBench(solo, 'owner');
    expect(report.carried).toBe(1);
    expect((rowOutcome(batchRows(fakes), "s_9")!["result"] as Record<string, unknown>)["url"]).toBe("/melite-media/runs/r_9/a.png");
  });
});

describe("restoreRunToBench — the abort (the carry is atomic with the write — no mid-carry window exists)", () => {
  test("a pre-aborted restore writes nothing and voices the abort", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner', AbortSignal.abort());
    expect(fakes.calls).toEqual([]);
    expect(report.added).toBe(0);
    expect(report.carried).toBe(0);
    expect(report.notes.join("; ")).toMatch(/abort/);
  });

  test("a signal aborting mid-door leaves no half-carried state — the outcome rode the same write", async () => {
    const ctrl = new AbortController();
    let releaseGate: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { releaseGate = () => resolve(); });
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" } },
      ],
      verbGates: { "bench/add-stages": [gate] },
    });
    const restoring = restoreRunToBench(runWithStages(), 'owner', ctrl.signal);
    // park the restore AT the batch door (calls land before the gate), then
    // let the abort go mid-door — the worst window the old loop law had.
    for (let i = 0; i < 100 && !fakes.calls.some((c) => c.method === "bench/add-stages"); i += 1) {
      await new Promise((resolve) => { setTimeout(resolve, 0); });
    }
    ctrl.abort();
    releaseGate!();
    const report = await restoring;
    // the old law had a carry LOOP after the add — an abort mid-loop
    // holed the restore (S−k outcomes lost, voiced). The carry-batch
    // law has no loop: the door answered, everything landed, and there
    // is no abort note because nothing was left un-carried.
    expect(report.added).toBe(2);
    expect(report.carried).toBe(2);
    expect(report.notes.join("; ")).not.toMatch(/abort/);
  });
});

describe("restoreRunToBench — the stale sibling (no draft result rides the batch)", () => {
  test("stale draft rows never ride: only card/engine/params/id seat, outcomes carry fresh", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "fresh knobs" },
          result: { run_id: "run-OLD", url: "/stale/old.png", artifacts: { "old.png": "/stale/old.png" } },
          runStatus: "done", history: [{ url: "/stale/older.png" }],
          resolved: { prompt: "stale" }, resultParams: { prompt: "stale" } },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" },
          result: { run_id: "run-OLD", url: "/stale/other.png" }, runStatus: "done" },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    expect(report.added).toBe(2);
    const batch = fakes.calls.find((c) => c.method === "bench/add-stages");
    const rows = (batch!.args["doc"] as Record<string, unknown>)["stages"] as Array<Record<string, unknown>>;
    expect(rows.length).toBe(2);
    for (const row of rows) {
      for (const stale of ["result", "runStatus", "history", "resolved", "resultParams"]) {
        expect(row, "batch row " + String(row["id"])).not.toHaveProperty(stale);
      }
    }
    // the carried outcomes are the RUN's fresh rows, never the stale ones.
    const s0 = rowOutcome(rows, "s_0")!["result"] as Record<string, unknown>;
    expect(s0["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect((s0 as { run_id: string }).run_id).toBe("r_9");
    expect(benchResultDefects(s0)).toEqual([]);
  });
});

describe("restoreRunToBench — the carry batch law (operator order b, 2026-10-26: the batch cure left the outcome carry serial — S stages, S rev re-reads + S drafts/patch writes, sequential)", () => {
  test("an N-stage restore performs a CONSTANT number of doors: ONE add-stages, ZERO drafts/patch, ONE drafts/get", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" } },
        { id: "s_2", card: "upscale-tools", engine: "comfyui", params: { model: "x" } },
      ],
    });
    const three: CardsRunValue = { ...runWithStages(), stages: [
      ...runWithStages().stages,
      { id: "s_2", status: "completed", url: "/melite-media/runs/r_9/c.png", gallery: [{ name: "c.png" }] },
    ] };
    const report = await restoreRunToBench(three, 'owner');
    expect(report.added).toBe(3);
    expect(report.carried).toBe(3);
    expect(fakes.calls.filter((c) => c.method === "bench/add-stages").length,
      "the whole restore — stages AND outcomes — rides one batch door").toBe(1);
    expect(fakes.calls.filter((c) => c.method === "drafts/patch").length,
      "no per-stage outcome patch rides a restore").toBe(0);
    expect(fakes.calls.filter((c) => c.method === "drafts/get").length,
      "no per-stage rev re-read rides a restore — the batch carries one expect_rev").toBe(1);
  });

  test("the batch body carries every stage's outcome aligned with its row — the fresh run's, never the stale draft's", async () => {
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" } },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    expect(report.carried).toBe(2);
    const batch = fakes.calls.find((c) => c.method === "bench/add-stages");
    const rows = (batch!.args["doc"] as Record<string, unknown>)["stages"] as Array<Record<string, unknown>>;
    expect(rows.length).toBe(2);
    const outcomes = rows.map((r) => r["outcome"] as Record<string, unknown> | undefined);
    // alignment: row i's outcome is run stage i's terminal face
    expect((outcomes[0]!["result"] as Record<string, unknown>)["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect((outcomes[1]!["result"] as Record<string, unknown>)["url"]).toBe("/melite-media/runs/r_9/b.png");
    expect(outcomes[0]!["runStatus"]).toBe("done");
    expect((outcomes[0]!["result"] as { run_id: string }).run_id).toBe("r_9");
    // the hero reorder rode the batch path: s_1's gallery lists zzz.png
    // first, the carried map still leads b.png
    expect(Object.keys(((outcomes[1]!["result"] as Record<string, unknown>)["artifacts"]) as Record<string, string>)[0]).toBe("b.png");
    expect(benchResultDefects(outcomes[0]!["result"] as Record<string, unknown>)).toEqual([]);
  });
});
