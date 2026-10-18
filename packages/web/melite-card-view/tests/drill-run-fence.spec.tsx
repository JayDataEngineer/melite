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

function stubFetch(holdFormSpec?: { release: () => void }): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      if (holdFormSpec !== undefined) {
        // the arrival window held OPEN: the settle never lands until
        // the arm releases it, so the fence's voice is on the face
        // to stay (the settle's own setError(null) never runs)
        return new Promise<Response>((resolve) => {
          holdFormSpec.release = () => {
            resolve(formSpecResponse());
          };
        });
      }
      return formSpecResponse();
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

function formSpecResponse(): Response {
  return new Response(JSON.stringify({
    form: "image-gen", genre: "image", engine: "comfyui",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
  }), { status: 200, headers: { "content-type": "application/json" } });
}

const STAGE = {
  id: "s_0", card: "image-gen", engine: "comfyui",
  params: { prompt: "x" }, runStatus: "",
} as never as BenchStageView;

const BENCH: CardsBenchValue = {
  kind: "bench", draftId: "bench-p", sessionKey: "p", rev: 1, log: [], stages: [STAGE],
};

function mountDrill(opts?: { refusals?: Array<{ method: string; message: string; code?: string }>; holdFormSpec?: boolean }): {
  runs: number[];
  bound: () => void;
  releaseFormSpec: () => void;
} {
  const hold = opts?.holdFormSpec === true ? { release: (): void => {} } : undefined;
  stubFetch(hold);
  const releaseFormSpec = (): void => { hold?.release(); };
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
  return { runs, bound: () => bound(), releaseFormSpec };
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

  // ORDER d SOURCE SEAT (2026-11-06, audit arm d — the seed-law
  // guard): the reseat verb rides the RE-KEY arm ONLY. A fresh open
  // rides seedUser VERBATIM (the pass-along law: presence survived
  // the reopen — never re-derived); a model-pick re-key reconciles
  // envelope-bound numerics into the arrival lane (the two-hop
  // incident's cure). The seat is judged at the source (the F2
  // precedent: a value arm over this would be tautological — the
  // pure verb's clamp/verbatim halves are pinned in card-base's
  // spec-matrix + switching-sweep walls, red-proved there).
  test("the reseat rides the re-key arm ONLY — a fresh open seeds verbatim", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const srcText = readFileSync(resolve(import.meta.dirname, "../src/client/stage-drill.tsx"), "utf8");
    assert.ok(
      srcText.includes("setUser(freshOpen ? seeded : reseatEnvelopeKeys(doc, seeded))"),
      "the re-key arm reseats (order d): the model-pick re-spec seed reconciles envelope-bound numerics",
    );
    assert.equal(
      srcText.split("reseatEnvelopeKeys").length - 1, 2,
      "reseatEnvelopeKeys appears exactly twice: the import + the re-key arm — a second call site is the fresh-open law breaking",
    );
  });

  // POSITIVE CONTROL, RECUT 2026-11-08 to ride UNDER the arrival-
  // window fence (P4 remainder): a press while the spec settles
  // fires NOTHING by law (W1 in stage-drill-gates pins the re-point
  // case; the arm below pins the INITIAL open) — so the quiet-
  // ledger proof must wait for the form to land (the fence lifts
  // with the settle, never a latch) and THEN press. The old control
  // pressed at t=0 and expected the start — that judged the PRE-P4
  // behavior where the initial fetch was not fenced.
  test("the positive control: a quiet ledger presses through to onRun once the form lands", async () => {
    const { runs, bound } = mountDrill();
    // the arrival window closes with the settle — the Prompt label
    // renders only after setSpec, and the pending ref clears BEFORE
    // setSpec in the same settle, so this wait is the fence-lifted
    // proof
    await waitFor(() => {
      expect(document.querySelector("textarea")).not.toBeNull();
    });
    bound();
    await waitFor(() => {
      expect(runs).toEqual([1]);
    });
    expect(document.body.textContent).not.toMatch(/WRITE DID NOT LAND/);
    expect(document.body.textContent).not.toMatch(/still settling/);
  });

  // THE INITIAL-OPEN HALF of the arrival-window fence (the P4
  // remainder's own drill seat — W1 in stage-drill-gates walls the
  // family re-point case; this walls the FIRST open): a press before
  // the arrival spec settles voices the pending family, fires
  // nothing, and the same press after the settle presses through —
  // the fence stands down at the settle, never latches.
  test("a press during the initial spec settle fences loud, then presses through once the form lands", async () => {
    const { runs, bound, releaseFormSpec } = mountDrill({ holdFormSpec: true });
    bound();
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/still settling/);
    });
    expect(runs).toStrictEqual([]);
    releaseFormSpec();
    await waitFor(() => {
      expect(document.querySelector("textarea")).not.toBeNull();
    });
    expect(document.body.textContent).not.toMatch(/still settling/);
    bound();
    await waitFor(() => {
      expect(runs).toEqual([1]);
    });
  });
});
