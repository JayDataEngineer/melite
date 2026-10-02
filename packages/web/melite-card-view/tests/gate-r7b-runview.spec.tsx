// @vitest-environment happy-dom
// gate-r7b-runview.spec.tsx — the run view's dark arms (round 7b):
// the restore's non-Error voice (restoreRunToBench rejects with a
// foreign value → the note carries String(e), never a blank rail)
// and the cancel guard's neighborhood (a live run with no stop door
// offers no cancel; with a stop door the cancel carries the run id).
// RunView mounts DIRECTLY (not through the tab): the tab always
// wires a stop door, so the no-door seat is stageable only here; and
// the real restore always throws Error, so the foreign throw rides a
// module mock. No estate verbs fire (the restore is mocked, the rest
// is pure render), so no harness and no fetch stub.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { RunView } from "../src/client/draft-run-views.tsx";
import type { CardsRunValue } from "../src/client/cards-resource.ts";

// the restore rides a mock (vi.mock factories hoist — the control
// lives in vi.hoisted); every other seat of the module stays live.
const restoreCtl = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock("../src/client/cards-resource.ts", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  restoreRunToBench: restoreCtl.fn,
}));

beforeEach(() => {
  restoreCtl.fn.mockReset();
  restoreCtl.fn.mockResolvedValue({ added: 1, skipped: 0, notes: [] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function runValue(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return {
    kind: "run",
    runId: "r-1",
    status: "done",
    draftId: "d-1",
    stages: [],
    lastFrame: undefined,
    ...over,
  };
}

function mountRunView(opts: {
  run?: CardsRunValue;
  onBack?: () => void;
  onStop?: ((runId: string) => void) | undefined;
}): { onRestored: ReturnType<typeof vi.fn>; onStop: ReturnType<typeof vi.fn> | undefined } {
  const onRestored = vi.fn(() => {});
  const onStop = opts.onStop !== undefined ? vi.fn(opts.onStop) : undefined;
  render(h(RunView, {
    run: opts.run ?? runValue(),
    sessionKey: "s1",
    onBack: opts.onBack ?? (() => {}),
    onRestored: () => { onRestored(); },
    onStop,
  }));
  return { onRestored, onStop };
}

describe("the restore's foreign voice — a non-Error rejection still reads", () => {
  test("a foreign string rejection voices verbatim (never blank, never stuck)", async () => {
    // the door throws the foreign string "gone" verbatim (the old
    // stub's shape) — the note carries it, the button re-arms, and
    // the bench is never revisited.
    restoreCtl.fn.mockRejectedValue("gone");
    const { onRestored } = mountRunView({});
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("gone", {}, { timeout: 5000 })).toBeTruthy();
    expect(onRestored).not.toHaveBeenCalled();
    // settled back to the idle face (retry is armed)
    expect(await screen.findByRole("button", { name: "Restore to bench" }, { timeout: 5000 })).toBeTruthy();
  });

  test("an Error rejection voices its message (the honest arm)", async () => {
    restoreCtl.fn.mockRejectedValue(new Error("draft gone"));
    mountRunView({});
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("draft gone", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the restore note — the carried count names the preview carry", () => {
  test("a report with carried outcomes counts them in the note", async () => {
    restoreCtl.fn.mockResolvedValue({ added: 2, skipped: 1, carried: 2, notes: [] });
    mountRunView({});
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(
      await screen.findByText("restored 2 stage(s) to the bench, 1 skipped, 2 outcome(s) carried", {}, { timeout: 5000 }),
    ).toBeTruthy();
  });

  test("a report with nothing carried stays quiet (no zero-count noise)", async () => {
    restoreCtl.fn.mockResolvedValue({ added: 1, skipped: 0, carried: 0, notes: [] });
    mountRunView({});
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Restore to bench" }));
    expect(await screen.findByText("restored 1 stage(s) to the bench", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the cancel guard's neighborhood — the stop door owns the affordance", () => {
  test("a live run with no stop door offers no cancel (nothing to arm)", async () => {
    mountRunView({ run: runValue({ status: "running" }), onBack: () => {}, onStop: undefined });
    await screen.findByText("r-1");
    expect(screen.queryByRole("button", { name: "Cancel run" })).toBeNull();
    expect(screen.queryByRole("button", { name: "cancelling…" })).toBeNull();
    // the seat is otherwise whole: back + restore still ride
    expect(screen.getByRole("button", { name: "Back to bench" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Restore to bench" })).toBeTruthy();
  });

  test("a live run with a stop door cancels with its run id", async () => {
    const { onStop } = mountRunView({ run: runValue({ status: "running" }), onStop: () => {} });
    await screen.findByText("r-1");
    fireEvent.click(screen.getByRole("button", { name: "Cancel run" }));
    expect(screen.getByRole("button", { name: "cancelling…" })).toBeTruthy();
    await waitFor(() => {
      expect(onStop).toHaveBeenCalledTimes(1);
    });
    expect(onStop).toHaveBeenCalledWith("r-1");
  });
});
