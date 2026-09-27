// @vitest-environment happy-dom
/**
 * zoom-stop.spec.tsx — zoom.tsx's last uncovered arm (2026-09-16
 * burn-down): the live tile's Stop press calls onStop (the run
 * gesture flips to stop mid-run — the tile's affordance carried
 * into the drill). Renders the overlay directly with a running
 * stage; the frame (not the 500ms detail) carries the press seat.
 * The enhance-routes fetch is stubbed to a refusal (the picker
 * degrades to the host default — that seam is pinned elsewhere).
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { CardZoomOverlay } from "../src/client/zoom.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STAGE: BenchStageView = {
  id: "s_0", engine: "comfyui", card: "image-gen", title: "hero",
  params: { prompt: "a red cube" }, runStatus: "running",
};
const BENCH: CardsBenchValue = {
  kind: "bench", draftId: "bench-main", rev: 7, stages: [STAGE], log: [],
  sessionKey: "main",
};

function mount(stage: BenchStageView = STAGE): { stops: number; runs: number } {
  let stops = 0;
  let runs = 0;
  const rec = {
    get stops(): number { return stops; },
    get runs(): number { return runs; },
  };
  vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
  render(h(CardZoomOverlay, {
    stage, bench: BENCH,
    running: false,
    onRun: () => { runs++; },
    onStop: () => { stops++; },
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_owner, fallback) => fallback,
    detail: () => h("div", null, "detail-body"),
  }));
  return rec;
}

describe("the live tile's Stop press", () => {
  test("Stop calls onStop (the run flips to stop mid-run)", async () => {
    const rec = mount();
    fireEvent.click(await screen.findByTestId("drill-stop", {}, { timeout: 4000 }));
    expect(rec.stops).toBe(1);
    expect(rec.runs).toBe(0);
  });

  test("a settled tile presses Run, never Stop", async () => {
    const rec = mount({ ...STAGE, runStatus: "completed" });
    fireEvent.click(await screen.findByTestId("drill-run", {}, { timeout: 4000 }));
    expect(rec.runs).toBe(1);
    expect(rec.stops).toBe(0);
    expect(screen.queryByTestId("drill-stop")).toBeNull();
  });
});
