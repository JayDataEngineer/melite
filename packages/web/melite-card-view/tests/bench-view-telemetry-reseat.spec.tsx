// @vitest-environment happy-dom
// THE REV-SILENT TELEMETRY SEAT (operator burn, 2026-10-31, journey
// audit §2 — "the timeline card isn't updated visually", fifteenth
// report class): a run's outcome lands on the bench through the
// drafts stage-patch door's telemetry arm — result/runStatus only,
// WITHOUT bumping bench.rev (drafts/remote.ts:1306-1339, the
// telemetry law: rev is AUTHORSHIP, not change). The bench tail
// yields those frames anyway by the doc-change gate's own key — rev
// + the stages' own bytes (cards-resource.ts:1814-1830) — so the
// stream hands BenchView a NEW bench value at the SAME rev. This
// wall guards the last hop: BenchView's own copy (the `live` seat)
// and the drilled row (the `open` re-map) must re-seat on that
// frame, not only on rev drift.
//
// The two frames in every arm are exact telemetry twins: same
// draftId, same rev, stages differ ONLY by the landed outcome —
// byte-for-byte the frame observeAndAttribute lands (melite-flow.ts
// :780 terminal rich stamp). If either key regresses to rev-only,
// arms 1 and 3 RED while arm 2 stays green (the door itself works;
// only the gate goes blind) — that split is the regression's
// signature, do not "fix" the wall by weakening arm 2.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { BenchView } from "../src/client/bench-view.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

const REV = 7; // THE TELEMETRY LAW: the outcome write does NOT move this.

function h3Stage(extra: Record<string, unknown>): BenchStageView {
  return {
    id: "s_0",
    card: "h3-timeline",
    engine: "comfyui",
    params: { prompt: "orrery", calls: [{ text: "orrery", start_frame: 0, end_frame: 90 }] },
    ...extra,
  } as unknown as BenchStageView;
}

// The pre-run row: composed, never run. What the tab rendered before the
// agent's mod run pressed.
const PRE = [h3Stage({})];
// The POST row: exactly what the agent-side observer (melite-flow.ts
// observeAndAttribute :780) lands through the drafts stage-patch door —
// runStatus + result only, everything else byte-identical.
const FILM_URL = "/melite-media/runs/run-telemetry-twin-0001/h3-film/SaveVideo.0_h3_t4_film_1_.mp4";
const POST = [h3Stage({
  runStatus: "done",
  result: {
    run_id: "run-telemetry-twin-0001",
    url: FILM_URL,
    artifacts: { "SaveVideo.0_h3_t4_film_1_.mp4": FILM_URL },
    assetUrls: [FILM_URL],
  },
})];

function benchOf(rev: number, stages: BenchStageView[]): Parameters<typeof BenchView>[0]["bench"] {
  return { kind: "bench", draftId: "bench-telemetry-twin", rev, log: [], stages } as never;
}

function mount(stages: BenchStageView[]): { rerender: (stages: BenchStageView[], rev: number) => void } {
  const fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-telemetry-twin", rev: REV, log: [], stages: stages.map((s) => ({ ...s })) as never },
  });
  const props = {
    bench: benchOf(REV, stages),
    sessionKey: "main",
    onRun: () => {},
    onRunStage: () => {},
    onStopStage: () => {},
    onRemoveStage: () => {},
    stageRuns: {},
    running: false,
    onPatchParams: () => {},
    // THE OWNER PROBE (the drill's row is the seam under test): render
    // the owner currency verbatim — the same fields the h3 tenant's
    // projection consumes (stageView.ts projectStageView reads
    // row['result'] and owner.runStatus; projection.ts
    // projectH3StageViewProps projects them onto the studio's stage).
    renderStageView: ((owner: { row?: { result?: { url?: string } } }) =>
      h("div", { "data-testid": "owner-probe" }, owner?.row?.result?.url ?? "no-result")) as never,
  };
  const view = render(h(BenchView, props));
  return {
    rerender: (stages2: BenchStageView[], rev: number) => {
      view.rerender(h(BenchView, { ...props, bench: benchOf(rev, stages2) }));
    },
  };
}

test("ARM-1 the same-rev telemetry frame re-seats the tile face (THE BREAK HOP)", async () => {
  const view = mount(PRE);
  // the tile mounts as a kindFace span (no url yet — no tile-face-video)
  await waitFor(() => {
    expect(document.querySelectorAll('li[class*="_tile_"]:not([class*="_tileAdd_"])').length).toBe(1);
  });
  expect(document.querySelector('[data-testid="tile-face-video"]')).toBeNull();
  // the estate's terminal write landed; the tail yields the frame (same rev)
  view.rerender(POST, REV);
  await waitFor(() => {
    expect(document.querySelector('[data-testid="tile-face-video"]')).not.toBeNull();
  }, { timeout: 2000 });
});

test("ARM-2 the same faces at a BUMPED rev re-seat (the view's own door works)", async () => {
  const view = mount(PRE);
  view.rerender(POST, REV + 1);
  await waitFor(() => {
    expect(document.querySelector('[data-testid="tile-face-video"]')).not.toBeNull();
  }, { timeout: 2000 });
});

test("ARM-3 the open drill's row follows the same-rev telemetry frame", async () => {
  const view = mount(PRE);
  await waitFor(() => {
    expect(document.querySelector('div[role="button"][data-status]')).not.toBeNull();
  });
  // open the drill the way the user does: click the tile's open face
  // (the role=button tileInner div — sortable-tile.tsx:156-160; the
  // trash/run buttons inside stopPropagation, so this hits onOpen)
  fireEvent.click(document.querySelector('div[role="button"][data-status]') as Element);
  await waitFor(() => {
    expect(screen.getByTestId("owner-probe").textContent).toBe("no-result");
  });
  // the mod run lands while the studio is OPEN — same rev
  view.rerender(POST, REV);
  await waitFor(() => {
    expect(screen.getByTestId("owner-probe").textContent).toBe(FILM_URL);
  }, { timeout: 2000 });
});
