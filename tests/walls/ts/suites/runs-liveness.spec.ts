// runs-liveness.spec.ts — THE LIVE ROW WALLS (2026-10-11, the
// operator's "stuck on a bugged out webhook … I SHOULD BE ABLE TO
// SEE STEPS"): the estate's core principle is that a run's stage
// rows move while the engine works, and that the push-only run tail
// (the poll retired 2026-10-12) hears every move. The drift this
// wall kills: the executor's report fold mutated rows in MEMORY
// only — no seam notify — so production tiles froze on their
// opening read ("merged submit (1 stages, 10 nodes)", zero steps,
// nothing) while the engine rendered to completion behind the
// silence. Every wall here drives the REAL runOne / REAL
// startRunLiveness against the REAL runs change seam; a fake that
// notifies on its own would prove nothing.
import { describe, it, expect, vi, afterEach } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { ComfyUIHostService } from "../../../../packages/engines/comfyui-cordis/src/comfyui.ts";
import type { EngineJson, FlowResult, MergeRow } from "../../../../packages/engines/comfyui-cordis/src/comfyui-types.ts";
import type { RunRecord } from "../../../../packages/harness/estate-queue/src/runsTypes.ts";
import type { RunId } from "../../../../packages/harness/estate-queue/src/queueCore.ts";
import {
  LIVENESS_NOTIFY_MS,
  LIVENESS_WATCHDOG_MS,
  runOne,
  startRunLiveness,
} from "../../../../packages/harness/estate-queue/src/runsExecute.ts";
import { setRunsChangeSeam } from "../../../../packages/harness/estate-queue/src/runsChange.ts";

class FakeEngine extends ComfyUIHostService {
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });

  constructor(ctx: Context) {
    super(ctx, {});
  }

  override executeFlow(
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    return this.onFlow(rows, runDir, inputNames, initials, opts);
  }
}

const runFixture = (): RunRecord => ({
  runId: "run-live-00000000-00000000" as RunId,
  status: "queued",
  stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }],
  skippedStages: [],
  artifacts: [],
  error: "",
  draftId: "d",
  dir: "/tmp/run-live",
  testFlag: false,
  stopFlag: false,
  params: [{ workflow: { "1": { class_type: "X", inputs: {} } } }],
  outputNodes: [{}],
  initials: {},
  createdAt: 1,
  pipeline: "flow_inline",
  graphRows: [],
});

interface SeamEmit { runId: string; activity: unknown; progress: unknown }

/** A hand seam that snapshots the run's stage face AT EMIT TIME —
 *  the seam's contract is "the re-read serves the moved row", so
 *  the emit handler IS the re-read here. */
const armSeam = (run: RunRecord): { emits: SeamEmit[]; restore: () => void } => {
  const emits: SeamEmit[] = [];
  setRunsChangeSeam({
    emit: (runId: string): void => {
      emits.push({
        runId,
        activity: run.stages[0]?.["activity"],
        progress: run.stages[0]?.["progress"],
      });
    },
    on: () => () => undefined,
  });
  return { emits, restore: () => setRunsChangeSeam(null) };
};

afterEach(() => {
  setRunsChangeSeam(null);
  vi.useRealTimers();
});

describe("THE LIVE ROW WALLS (the frozen-tile cure)", () => {
  it("STEP FRAMES FLOW: engine folds reach the seam mid-run — the tail hears steps before settle", async () => {
    const run = runFixture();
    const { emits, restore } = armSeam(run);
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    let settles = 0;
    let afterFold2: unknown;
    engine.onFlow = async (_r, _d, _i, _init, opts) => {
      opts.report?.({ activity: "sampling 3/10", progress: { value: 3, max: 10 } });
      opts.report?.({ activity: "sampling 9/10", progress: { value: 9, max: 10 } });
      afterFold2 = run.stages[0]?.["activity"];
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    await runOne(run, ctx, () => { settles++; });
    restore();
    expect(run.status).toBe("completed");
    const midRun = emits.filter((e) => settles === 0 || e !== undefined);
    expect(midRun.length).toBeGreaterThanOrEqual(1);
    // the emit-time snapshot carries the fold's voice — the tail's
    // re-read never serves a stale row. A synchronous burst coalesces
    // into the FIRST fold's notify (the throttle wall pins the bound);
    // the last fold's stamps live in the row for the next window.
    expect(midRun[0]?.activity).toBe("sampling 3/10");
    expect(midRun[0]?.progress).toEqual({ value: 3, max: 10 });
    expect(midRun[0]?.runId).toBe(run.runId);
    // the last fold's stamps live in the row (the terminal harvest
    // then deletes the live lines — settled rows carry artifacts)
    expect(afterFold2).toBe("sampling 9/10");
    expect(settles).toBe(1);
  });

  it("NO WRITE STORM: a report burst coalesces — the throttle bounds notifies per window", async () => {
    const run = runFixture();
    const { emits, restore } = armSeam(run);
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async (_r, _d, _i, _init, opts) => {
      for (let i = 0; i < 40; i++) {
        opts.report?.({ activity: "tick " + i, progress: { value: i, max: 40 } });
      }
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    await runOne(run, ctx, () => undefined);
    restore();
    // 40 synchronous folds land inside one LIVENESS_NOTIFY_MS window:
    // exactly one notify may leave the fold (the first), never forty.
    expect(emits.length).toBeLessThanOrEqual(3);
    expect(emits.length).toBeGreaterThanOrEqual(1);
  });

  it("FROZEN-TILE REFUSAL: a silent engine never owns the tile — the watchdog stamps the waiting voice and counts up", async () => {
    vi.useFakeTimers();
    const run = runFixture();
    run.status = "running";
    for (const stage of run.stages) stage["status"] = "running";
    const { emits, restore } = armSeam(run);
    const live = startRunLiveness(run);
    // inside the silence window: no stamp, no notify
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS - 1);
    expect(emits.length).toBe(0);
    expect(run.stages[0]?.["activity"]).toBeUndefined();
    // the window breaks: the waiting voice takes the tile + notifies
    vi.advanceTimersByTime(1);
    expect(emits.length).toBe(1);
    expect(String(run.stages[0]?.["activity"])).toContain("waiting on engine (5s");
    // the count climbs on later ticks (a live run never freezes twice)
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS);
    expect(emits.length).toBe(2);
    expect(String(run.stages[0]?.["activity"])).toContain("waiting on engine (10s");
    live.stop();
    restore();
  });

  it("A REPORT SILENCES THE WATCHDOG: engine truth overwrites the waiting voice", async () => {
    vi.useFakeTimers();
    const run = runFixture();
    run.status = "running";
    for (const stage of run.stages) stage["status"] = "running";
    const { emits, restore } = armSeam(run);
    const live = startRunLiveness(run);
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS + 1);
    expect(String(run.stages[0]?.["activity"])).toContain("waiting on engine");
    // a fresh fold resets the silence clock — the next window is clean
    live.report();
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS - 1);
    const after = emits.length;
    vi.advanceTimersByTime(1);
    expect(emits.length).toBe(after); // no watchdog stamp: the engine folded
    live.stop();
    restore();
  });

  it("SETTLED RUNS OWN NO STAMP: the watchdog neither stamps nor notifies post-settle, and stop() clears the tick", async () => {
    vi.useFakeTimers();
    const run = runFixture();
    run.status = "running";
    const { emits, restore } = armSeam(run);
    const live = startRunLiveness(run);
    live.stop();
    run.status = "completed";
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS * 10);
    expect(emits.length).toBe(0);
    expect(run.stages[0]?.["activity"]).toBeUndefined();
    restore();
  });

  it("EVERY EXECUTE PATH RETIRES THE WATCHDOG: a throwing engine leaks no tick", async () => {
    vi.useFakeTimers();
    const run = runFixture();
    const { emits, restore } = armSeam(run);
    const ctx = new Context();
    (ctx as unknown as { queue: unknown }).queue = { stateRoots: [] as string[] };
    const engine = new FakeEngine(ctx);
    engine.onFlow = async () => {
      throw new Error("the engine died loud");
    };
    await runOne(run, ctx, () => undefined);
    expect(run.status).toBe("failed");
    const atSettle = emits.length;
    vi.advanceTimersByTime(LIVENESS_WATCHDOG_MS * 10);
    expect(emits.length).toBe(atSettle); // the finally stopped the tick
    restore();
  });
});
