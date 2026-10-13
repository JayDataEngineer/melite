// @vitest-environment happy-dom
// drill-run-fence.spec.tsx — Cure 4 (2026-10-27): the drill's press
// settles the whole stage ledger BEFORE the start. The bench door
// (runCardStage) keeps its own gate — defense in depth, never
// delegation: this drill's onRun prop may be any host's verb, and a
// bare start must be unexpressible from this seat. A failed key
// voices on the drill's own face and the start never fires; a quiet
// ledger presses through.
import { cleanup, render, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { StageDrill } from "../src/client/stage-drill.tsx";
import {
  resetStageWrites,
  scheduleStageParam,
  stageWriteState,
} from "../src/client/draft.ts";
import { schemaEnvelope } from "@melite/card-base/client";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetStageWrites();
});

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

const STAGE = {
  id: "s_0", card: "image-gen", engine: "comfyui",
  params: { prompt: "x" }, runStatus: "",
} as never as BenchStageView;

const BENCH: CardsBenchValue = {
  kind: "bench", draftId: "bench-p", sessionKey: "p", rev: 1, log: [], stages: [STAGE],
};

function mountDrill(opts?: { refusals?: Array<{ method: string; message: string; code?: string }> }): {
  runs: number[];
  bound: () => void;
} {
  stubFetch();
  mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [STAGE] },
    draftStages: [STAGE as unknown as Record<string, unknown>],
    draftBenchRev: 1,
    refusals: opts?.refusals,
  });
  const runs: number[] = [];
  let bound: () => void = () => { throw new Error("bindRun never fired"); };
  render(h(StageDrill, {
    stage: STAGE,
    bench: BENCH,
    running: false,
    onRun: () => { runs.push(1); },
    onStop: () => {},
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    // THE FALLBACK SEAT: the drill returns the stage view directly —
    // the rail chrome (the error face included) rides the generic
    // fallback body. Seat it so the fence's voice has a face.
    renderStageView: (_owner, fallback) => h("div", null, fallback),
    bindRun: (r: () => void) => { bound = r; },
  }));
  return { runs, bound: () => bound() };
}

describe("the drill's run fence (Cure 4)", () => {
  test("a failed ledger key refuses on the drill's face and the start never fires", async () => {
    const { runs, bound } = mountDrill({
      refusals: [{ method: "drafts/patch", message: "door down", code: "wire/down" }],
    });
    // another hand's write lands in the ledger and FAILS at the door
    scheduleStageParam("bench-p", "s_0", "prompt", "typed-after-open").catch(() => {});
    await waitFor(() => {
      expect(stageWriteState("bench-p", "s_0").failedKeys).toEqual(["prompt"]);
    });
    bound();
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/WRITE DID NOT LAND/);
    });
    expect(runs).toStrictEqual([]);
    assert.equal(runs.length, 0, "the start never fires past an unlanded write");
  });

  test("the positive control: a quiet ledger presses through to onRun", async () => {
    const { runs, bound } = mountDrill();
    bound();
    await waitFor(() => {
      expect(runs).toEqual([1]);
    });
    expect(document.body.textContent).not.toMatch(/WRITE DID NOT LAND/);
  });
});
