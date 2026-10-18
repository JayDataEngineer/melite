// @vitest-environment happy-dom
// graph-receipt-chip.spec.tsx — the served-graph receipt's run face
// (the silent UI-drop purge's P1): the RunView renders the
// queue-time doc→graph evidence as a verdict chip beside the status —
// the quiet face (complete) counts the composed nodes, the loud face
// (partial) names the dropped doc scalars, and a run with no receipt
// (inline envelopes stamp none) renders no chip, never a phantom.
// RunView mounts DIRECTLY (the gate-r7b-runview seat): the chip is
// pure render off the run value, no estate verbs fire (the restore is
// mocked, the rest stays live).
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { RunView } from "../src/client/draft-run-views.tsx";
import type { CardsRunValue, GraphReceipt } from "../src/client/cards-resource.ts";

// the restore rides a mock (vi.mock factories hoist — the control
// lives in vi.hoisted); every other seat of the module stays live.
const restoreCtl = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../src/client/cards-resource.ts", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  restoreRunToBench: restoreCtl.fn,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  restoreCtl.fn.mockReset();
});

function receipt(over: Partial<GraphReceipt> = {}): GraphReceipt {
  return {
    nodes: 2,
    populated: ["guidance", "prompt"],
    carried: ["guidance", "prompt"],
    dropped: [],
    verdict: "complete",
    stages: [
      { stage: "s_0", nodes: 2, populated: ["guidance", "prompt"], carried: ["guidance", "prompt"], dropped: [], verdict: "complete" },
    ],
    ...over,
  };
}

function runValue(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return {
    kind: "run",
    runId: "r-1",
    status: "completed",
    draftId: "d-1",
    stages: [],
    lastFrame: undefined,
    ...over,
  };
}

function mountChip(run: CardsRunValue): void {
  render(h(RunView, {
    run,
    sessionKey: "s1",
    onBack: () => {},
    onRestored: () => {},
    onStop: undefined,
  }));
}

describe("the graph-receipt chip (the purge P1's run face)", () => {
  test("complete: the quiet chip counts the composed nodes", async () => {
    mountChip(runValue({ graphReceipt: receipt() }));
    expect(await screen.findByText("graph ✓ 2n", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("partial: the loud chip names the dropped scalars, sorted by the estate", async () => {
    mountChip(runValue({
      graphReceipt: receipt({
        verdict: "partial",
        carried: ["guidance", "prompt"],
        dropped: ["orphan_ash", "orphan_zed"],
      }),
    }));
    expect(await screen.findByText("graph ✕ dropped orphan_ash, orphan_zed", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("no receipt: no chip (inline runs stamp none — never a phantom)", async () => {
    const { container } = render(h(RunView, {
      run: runValue(),
      sessionKey: "s1",
      onBack: () => {},
      onRestored: () => {},
      onStop: undefined,
    }));
    await screen.findByText("r-1");
    expect(container.textContent).not.toContain("graph ✓");
    expect(container.textContent).not.toContain("graph ✕");
  });

  test("engine ref: the quiet chip carries the engine-minted prompt_id beside the node count", async () => {
    mountChip(runValue({ graphReceipt: receipt({ prompt_id: "receipt-prompt-0001" }) }));
    expect(await screen.findByText("graph ✓ 2n · #receipt-prompt-0001", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("engine ref: the loud chip carries the prompt_id beside the dropped names", async () => {
    mountChip(runValue({
      graphReceipt: receipt({
        verdict: "partial",
        carried: ["guidance", "prompt"],
        dropped: ["orphan_ash", "orphan_zed"],
        prompt_id: "receipt-prompt-0001",
      }),
    }));
    expect(await screen.findByText("graph ✕ dropped orphan_ash, orphan_zed · #receipt-prompt-0001", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("no prompt_id: no dangling separator (the legacy faces stay byte-identical)", async () => {
    mountChip(runValue({ graphReceipt: receipt() }));
    expect(await screen.findByText("graph ✓ 2n", {}, { timeout: 5000 })).toBeTruthy();
  });
});
