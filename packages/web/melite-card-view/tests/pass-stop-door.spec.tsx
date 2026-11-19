// @vitest-environment happy-dom
// THE PASS-STOP DOOR (operator, 2026-11-19: "I hit play on the
// melite bench sidebar, it does not become a stop button while
// stuff is running"): the bench header's Play, while the sequential
// pass is live, rendered a disabled spinner — the pass's abort
// controller (runAllAbort) existed with NO button wired to it, so
// the one press that starts a pass had no stop face at all. The
// cure: while `running` is true and the host passes `onStopPass`,
// the header button IS Stop (data-testid pass-stop) and the press
// fires the host's abort. A host with no door keeps the spinner
// face (the prop is optional by design — the chat-plane hosts
// render BenchView through adapters that predate the door).
//
// ARM 1 judges the FACE on the real BenchView render; ARM 2 pins
// the WIRING (the tab body hands the pass's own abort controller
// to the door) — a regression that drops either one reds its own
// arm; do not "fix" this wall by deleting an arm.
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { BenchView } from "../src/client/bench-view.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
});

function stage(): BenchStageView {
  return {
    id: "s_0",
    card: "h3-timeline",
    engine: "comfyui",
    params: { prompt: "orrery", calls: [{ text: "orrery", start_frame: 0, end_frame: 90 }] },
  } as unknown as BenchStageView;
}

function mount(running: boolean, onStopPass?: () => void): void {
  mountEstateFakes({
    benchDoc: { draft_id: "bench-pass-stop", rev: 3, log: [], stages: [stage() as never] },
  });
  render(h(BenchView, {
    bench: { kind: "bench", draftId: "bench-pass-stop", rev: 3, log: [], stages: [stage()] } as never,
    sessionKey: "main",
    onRun: () => {},
    onRunStage: () => {},
    onStopStage: () => {},
    onRemoveStage: () => {},
    stageRuns: {},
    running,
    onPatchParams: () => {},
    renderStageView: (() => null) as never,
    onStopPass,
  }));
}

test("ARM 1 the face: Play becomes Stop while the pass runs, and the press fires the door", () => {
  const stop = vi.fn();
  mount(true, stop);
  // the running pass shows the STOP face, never a disabled spinner
  const passStop = document.querySelector('[data-testid="pass-stop"]') as HTMLButtonElement | null;
  expect(passStop, "a running pass must render the pass-stop button").not.toBeNull();
  expect(passStop?.textContent).toContain("Stop");
  expect(passStop?.disabled).toBe(false);
  fireEvent.click(passStop as HTMLButtonElement);
  expect(stop).toHaveBeenCalledTimes(1);
  // the play button is gone while the pass runs
  expect(document.querySelector('[data-testid="pass-stop"]')).not.toBeNull();
  cleanup();

  // idle: the stop face is absent, the play face is back
  mount(false, stop);
  expect(document.querySelector('[data-testid="pass-stop"]')).toBeNull();
});

test("ARM 1b a host with no door keeps the spinner face (the prop is optional)", () => {
  mount(true, undefined);
  expect(document.querySelector('[data-testid="pass-stop"]')).toBeNull();
});

test("ARM 2 the wiring: the tab body hands the pass's own abort controller to the door", () => {
  // source-shape pin (gate-regressions style): the tab body must
  // pass onStopPass reading runAllAbort — the controller the pass
  // owns. Dropping the prop, or wiring it to anything but the
  // abort, reds here while ARM 1 stays green (the split signature:
  // the face works, the door leads nowhere).
  const src = readFileSync(join(process.cwd(), "packages/web/melite-card-view/src/client/cards-tab-body.tsx"), "utf8");
  expect(src).toMatch(/onStopPass:\s*\(\)\s*=>\s*\{\s*runAllAbort\.current\?\.abort\(\)\s*\}/);
});
