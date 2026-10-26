// @vitest-environment happy-dom
// stage-view-refusal.spec.tsx — THE FALLBACK EXTERMINATION's dispatch
// wall (2026-11-09). The operator's burn: input-prep's studio never
// mounted, the dispatch silently rendered the generic form instead,
// and every suite stayed green while the live page wore a form the
// card's package was built to replace. The operator's order: "NO
// FALLBACK FORMS … THERE IS NO SUCH THING AS A FALLBACK, ONLY
// SUPPRESSED ERRORS".
//
// The law, per arm:
//   A  a spec declaring a studio (FormSpecDoc.stage_view) + a slot
//      miss → the LOUD load refusal renders, naming the card and the
//      unmounted plugin, and the generic form is GONE (no prompt
//      field — the miss must not quietly re-express the studio's
//      params with different rules).
//   B  a spec with no declaration + a slot miss → the generic form
//      IS the designed seat (most cards have no studio; this arm
//      guards it against the cure's blast radius).
//   C  a spec declaring a studio + the slot CLAIMS → the studio
//      renders, no refusal (the happy path keeps its seat).
//   D  the refusal's words are dictionary-owned (chromeCopy), not
//      literals at the dispatch.
import { cleanup, render, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { afterEach, describe, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { StageDrill } from "../src/client/stage-drill.tsx";
import { chromeCopy } from "../src/chromeCopy.ts";
import { resetStageWrites } from "../src/client/draft.ts";
import { schemaEnvelope } from "@melite/card-base/client";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

const STAGE = {
  id: "s_0", card: "input-prep", engine: "comfyui",
  params: { prompt: "x" }, runStatus: "",
} as never as BenchStageView;

const BENCH: CardsBenchValue = {
  kind: "bench", draftId: draftIdOf("bench-p"), sessionKey: "p", rev: 1, log: [], stages: [STAGE],
};

function stubFetch(stageView: string | null): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "input-prep",
        // THE DECLARATION: the estate derives this from the card
        // package's tree; null = the card has no studio.
        stage_view: stageView,
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

function mountDrill(opts: {
  stageView: string | null;
  /** The slot consult: "miss" renders whatever the dispatch falls
   *  back to; "claim" renders the studio sentinel. */
  consult: "miss" | "claim";
}): { container: HTMLElement } {
  stubFetch(opts.stageView);
  mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [STAGE as unknown as Record<string, unknown>] },
    draftStages: [STAGE as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
  return render(h(StageDrill, {
    stage: STAGE,
    bench: BENCH,
    running: false,
    onRun: () => {},
    onStop: () => {},
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: opts.consult === "claim"
      ? (() => h("div", { "data-testid": "studio-claimed" }, "the mounted studio")) as never
      : (_owner, fallback) => h("div", null, fallback),
  }));
}

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetStageWrites();
});

describe("the dispatch's stage-view refusal (a declared studio never wears the generic form)", () => {
  test("A: declared studio + slot miss renders the loud refusal, never the form", async () => {
    const { container } = mountDrill({ stageView: "@melite/image-input-prep", consult: "miss" });
    await waitFor(() => {
      assert.ok(container.querySelector('[data-testid="stage-view-load-refusal"]') !== null,
        "the miss must voice the load refusal on the drill's face");
    });
    const face = container.querySelector('[data-testid="stage-view-load-refusal"]');
    const words = face?.textContent ?? "";
    assert.ok(words.includes("input-prep"), "the refusal names the card");
    assert.ok(words.includes("@melite/image-input-prep"), "the refusal names the unmounted plugin");
    assert.equal(container.querySelector("textarea"), null,
      "the generic form is exterminated for a declared card — a miss may not re-express the studio's params with different rules");
  });

  test("B: an undeclared card's slot miss keeps the generic form (the designed seat)", async () => {
    const { container } = mountDrill({ stageView: null, consult: "miss" });
    await waitFor(() => {
      assert.ok(container.querySelector("textarea") !== null, "no declaration → the generic form serves");
    });
    assert.equal(container.querySelector('[data-testid="stage-view-load-refusal"]'), null,
      "no refusal without a declaration — the form is not a fallback here, it is the card's only face");
  });

  test("C: declared studio + the slot claims renders the studio, no refusal", async () => {
    const { container } = mountDrill({ stageView: "@melite/image-input-prep", consult: "claim" });
    await waitFor(() => {
      assert.ok(container.querySelector('[data-testid="studio-claimed"]') !== null, "the mounted studio serves");
    });
    assert.equal(container.querySelector('[data-testid="stage-view-load-refusal"]'), null,
      "a claimed slot never wears the refusal");
  });

  test("D: the refusal's words are dictionary-owned", async () => {
    const { container } = mountDrill({ stageView: "@melite/image-input-prep", consult: "miss" });
    await waitFor(() => {
      assert.ok(container.querySelector('[data-testid="stage-view-load-refusal"]') !== null);
    });
    const words = container.querySelector('[data-testid="stage-view-load-refusal"]')?.textContent ?? "";
    assert.ok(words.includes(chromeCopy.stageViewRefusal({ card: "input-prep", plugin: "@melite/image-input-prep" })),
      "the card line rides chromeCopy");
    assert.ok(words.includes(chromeCopy.stageViewRefusalFix), "the fix line rides chromeCopy");
  });
});
