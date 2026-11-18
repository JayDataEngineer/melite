// @vitest-environment happy-dom
// observer-release-arm.spec.tsx — THE OBSERVER'S RELEASE gets its
// wall (audit V-S7, round13-cures: the cure note said "the named
// catch is the honest brace, no new wall" — the 2026-11-18 coverage
// ratchet disagreed, and rightly: an unowned brace is a law nobody
// re-fires). The invariant: whatever observeRunOutcome does — settle
// OR explode — the tile map gives the run id back, so Stop never
// targets a dead run forever. The real observer resolves on EVERY
// honest wire path (the CRITICAL-2 transport-escalation law), so the
// thrown settle is armed here at the module seam: one rejected
// promise, everything else actual. Toggle the onStarted catch out and
// this arm reds — the stop stays armed on the exploded run.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { schemaEnvelope } from "@melite/card-base/client";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { CardsTab } from "../src/client/CardsTab.tsx";

// THE MODULE SEAT (the one-fake law at the only seam that can
// explode): the observer is swapped for a faithful prefix + a
// hand-held explosion — it stamps the row running exactly as the
// real one does (patchStageOutcome + the touch), then dies mid-watch
// the way the real one never may. Every other export rides the real
// cards-resource.
const observerSeat = vi.hoisted(() => ({ reject: null as ((e: unknown) => void) | null }));
vi.mock("../src/client/cards-resource.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/client/cards-resource.ts")>();
  // the stamp seat lives in draft.ts (cards-resource only imports
  // it internally — the module namespace carries exports alone)
  const { patchStageOutcome } = await import("../src/client/draft.ts");
  return {
    ...actual,
    observeRunOutcome: (
      draftId: Parameters<typeof patchStageOutcome>[0],
      stageId: Parameters<typeof patchStageOutcome>[1],
      runId: string,
      _signal?: AbortSignal,
      onTouched?: () => void,
    ) => {
      void patchStageOutcome(draftId, stageId, { runStatus: "running", result: { run_id: runId } })
        .then(() => { onTouched?.() })
        .catch(() => { /* the stamp is bookkeeping, the real law's own words */ });
      return new Promise<never>((_, reject) => { observerSeat.reject = reject; });
    },
  };
});

const STAGES = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } }];

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  // the tab reads the catalog at mount — start each test cold (the
  // sweep spec's own boot law)
  resetCardFamiliesCache();
  observerSeat.reject = null;
  vi.unstubAllGlobals();
});

test("THE OBSERVER'S RELEASE: a THROWN settle still returns the run id — Stop never arms on a dead run", async () => {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/bench/ensure") {
      return new Response('{"ok":true}', { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({ prompt: { type: "string", meta: { description: "Prompt" } } }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: { "image-gen": { families: ["krea-2"] } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
  // THE TWO-DOOR AGREEMENT (the harness's reload-consistency law,
  // aliased on purpose): drafts/patch applies its stamp in place on
  // the DRAFT rows while bench/get serves the BENCH rows — sharing
  // one row array makes the two doors agree the way the real estate
  // does, so the stamped runStatus reaches the tile face.
  const shared = STAGES.map((s) => ({ ...s }));
  const fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: shared },
    draftStages: shared,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: (_address: string) => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: STAGES },
    }),
  } as never));

  // press the tile's Run — the harness start door answers run-1; the
  // observer's faithful prefix stamps the row running and onStarted
  // seats the map: Stop arms on the live run.
  fireEvent.click(await screen.findByRole("button", { name: "Run stage" }));
  const stop = await waitFor(() => {
    const el = document.querySelector('[data-testid="tile-stop"]');
    if (el === null) {
      throw new Error("no stop face — the row never flipped running. wire: "
        + JSON.stringify(fakes.calls.map((c) => c.method)));
    }
    return el as HTMLButtonElement;
  }, { timeout: 5000 });
  await waitFor(() => {
    if ((stop as HTMLButtonElement).disabled) throw new Error("stop not armed — the start never seated the map");
  }, { timeout: 5000 });

  // the observer EXPLODES mid-watch — the brace must still return
  // the id (a dead run's Stop is a lie aimed at the wire).
  observerSeat.reject!(new Error("observer exploded mid-poll"));
  await waitFor(() => {
    if (!(stop as HTMLButtonElement).disabled) throw new Error("stop still armed on the exploded run — the tile map orphaned it");
  }, { timeout: 5000 });
});
