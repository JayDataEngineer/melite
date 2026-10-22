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
});
