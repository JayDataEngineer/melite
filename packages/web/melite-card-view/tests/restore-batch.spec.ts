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

afterEach(() => {
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function run(): CardsRunValue {
  return {
    kind: "run", runId: "r_1", status: "completed", draftId: "d_1",
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
    kind: "run", runId: "r_9", status: "completed", draftId: "d_9",
    stages: [
      { id: "s_0", status: "completed", url: "/melite-media/runs/r_9/a.png", gallery: [{ name: "a.png" }] },
      // the hero LAST: the engine lists zzz.png first, the stage url names b.png
      { id: "s_1", status: "completed", url: "/melite-media/runs/r_9/b.png", gallery: [{ name: "zzz.png" }, { name: "b.png" }] },
    ],
    lastFrame: undefined,
  };
}

function patchTargets(fakes: { calls: Array<{ method: string; args: Record<string, unknown> }> }): string[] {
  return fakes.calls.filter((c) => c.method === "drafts/patch").map((c) => c.args["stageId"] as string);
}

function patchResult(fakes: { calls: Array<{ method: string; args: Record<string, unknown> }> }, stageId: string): Record<string, unknown> {
  const call = fakes.calls.find((c) => c.method === "drafts/patch" && c.args["stageId"] === stageId);
  if (call === undefined) throw new Error("no drafts/patch call for " + stageId);
  return (call.args["patch"] as { result: Record<string, unknown> }).result;
}

describe("restoreRunToBench — the zip (draftIds[i] ↔ seatedIds[i] holds across every skip/drop)", () => {
  test("cardless stages skip but the zip holds: outcomes land on their own seated ids, in order", async () => {
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
    // rows and draftIds stayed aligned across the two skips: the FIRST
    // patch carries s_0's outcome onto s_0, the SECOND s_1's onto s_1 —
    // a one-slot drift would paint the wrong preview on both tiles.
    expect(patchTargets(fakes)).toEqual(["s_0", "s_1"]);
    expect(patchResult(fakes, "s_0")["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect(patchResult(fakes, "s_1")["url"]).toBe("/melite-media/runs/r_9/b.png");
    // the hero reorder rode the restore path, not just the builder unit:
    // s_1's gallery lists zzz.png first, the carried map still leads b.png.
    expect(Object.keys(patchResult(fakes, "s_1")["artifacts"] as Record<string, string>)[0]).toBe("b.png");
    expect(benchResultDefects(patchResult(fakes, "s_1"))).toEqual([]);
  });

  test("a colliding id seats fresh and the outcome follows the minted seat, never the old row", async () => {
    const fakes = mountEstateFakes({
      // the fake's default bench already holds s_0: the draft's s_0 collides
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
      ],
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    expect(report.added).toBe(1);
    expect(report.notes.join("; ")).toMatch(/already on the bench/);
    // the outcome follows the minted seat (fresh_1): the pre-existing
    // s_0 row keeps its own result — patching the draft id here would
    // repaint the OLD tile with the restored run's preview.
    expect(patchTargets(fakes)).toEqual(["fresh_1"]);
    expect(patchResult(fakes, "fresh_1")["url"]).toBe("/melite-media/runs/r_9/a.png");
  });

  test("an answer naming no seated id never falls back onto a collision-dropped id", async () => {
    const fakes = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
      ],
      addStageNoIds: true,
    });
    const report = await restoreRunToBench(runWithStages(), 'owner');
    // the door minted fresh but named nothing: the draft id s_0 addresses
    // the PRE-EXISTING row — carrying onto it would repaint the old tile.
    expect(patchTargets(fakes)).not.toContain("s_0");
    expect(report.carried).toBe(0);
    expect(report.notes.join("; ")).toMatch(/no seated id/);
  });

  test("an answer naming no seated id still carries when the row kept its own id", async () => {
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
    // the door keeps provided ids: the unnamed seat IS s_9, the carry lands.
    expect(patchTargets(fakes)).toEqual(["s_9"]);
    expect(report.carried).toBe(1);
  });
});

describe("restoreRunToBench — the abort (a dead gesture stops starting carries)", () => {
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

  test("an abort mid-loop stops after the in-flight carry and voices it", async () => {
    const ctrl = new AbortController();
    const fakes = mountEstateFakes({
      benchDoc: { session: "s1", rev: 7, log: [], stages: [] },
      draftStages: [
        { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a" } },
        { id: "s_1", card: "image-edit", engine: "comfyui", params: { prompt: "b" } },
      ],
      onPatchCall: () => ctrl.abort(),
    });
    const report = await restoreRunToBench(runWithStages(), 'owner', ctrl.signal);
    // the first carry was already at the door when the abort landed; the
    // second never starts — one patch, one carried, the hole voiced.
    expect(patchTargets(fakes)).toEqual(["s_0"]);
    expect(report.carried).toBe(1);
    expect(report.notes.join("; ")).toMatch(/abort/);
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
    expect(patchResult(fakes, "s_0")["url"]).toBe("/melite-media/runs/r_9/a.png");
    expect((patchResult(fakes, "s_0") as { run_id: string }).run_id).toBe("r_9");
    expect(benchResultDefects(patchResult(fakes, "s_0"))).toEqual([]);
  });
});
