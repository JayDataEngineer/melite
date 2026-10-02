// runs-change.spec.ts — the runs event seat (1.8, the hand-roll
// audit's last poll, 2026-10-12): these arms exercise the module's
// own event law, so they install the SAME seam the registry service
// installs — a real cordis Context carrying the typed `runs.changed`
// event. Nothing here hand-rolls a listener set: the law (a
// subscriber's fault never breaks the write, never starves the
// listeners after it) is the module's wrapper over the real bus, and
// this file is what keeps it pinned. The bench seat's own spec
// (estate/drafts tests/bench-events.spec.ts) is the direct template.
import { describe, expect, test } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { installRunsChangeSeam, notifyRunChanged, onRunChange, setRunsChangeSeam } from "../src/runsChange.ts";

const ctx = new Context();
installRunsChangeSeam(ctx);

describe("the runs change events (the push source)", () => {
  test("a write notify reaches the listener with the run id", () => {
    const seen: string[] = [];
    const off = onRunChange((runId) => { seen.push(runId); });
    notifyRunChanged("run-a");
    notifyRunChanged("run-b");
    off();
    notifyRunChanged("run-a");
    expect(seen).toEqual(["run-a", "run-b"]);
  });

  test("a listener's fault never breaks the write", () => {
    const off = onRunChange(() => { throw new Error("listener fault"); });
    expect(() => notifyRunChanged("run-a")).not.toThrow();
    off();
  });

  test("a tree with NO seam installed refuses LOUD (never a silent no-op)", () => {
    // THE LAW THIS FILE KEEPS: `onRunChange` without a seam is a
    // programming error, not an empty subscription. A silent no-op
    // would let a whole test tree (or a boot path) stop hearing run
    // movement and still pass every assertion it still runs.
    setRunsChangeSeam(null);
    try {
      expect(() => onRunChange(() => {})).toThrow(/no runs change seam installed/);
    } finally {
      installRunsChangeSeam(ctx);
    }
  });

  test("the seam's disposer detaches it (a torn-down Context leaves no emitter)", () => {
    const own = new Context();
    const detach = installRunsChangeSeam(own);
    detach();
    expect(() => onRunChange(() => {})).toThrow(/no runs change seam installed/);
    // a notify with no seam is a no-op, never a throw (writers must
    // not care whether a watcher exists)
    expect(() => notifyRunChanged("run-a")).not.toThrow();
    installRunsChangeSeam(ctx); // restore the file's own seam
  });
});
