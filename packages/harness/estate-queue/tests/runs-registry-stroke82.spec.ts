// runs-registry-stroke82.spec.ts — the runs seat, stroke-82/83 regression walls (+ shared smalls): split from runs-registry.spec.ts
// (pure move — zero test-content change; the queue core is real,
// the card registry rides a structural fake).
import { describe, it, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { EnginesService } from "@melite/engine-contract";
import { QueueCore } from "../src/queue.ts";
import { CardArmError } from "../src/cardsRegistry.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-seat-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;
const dead = (): AbortSignal => {
  const c = new AbortController();
  c.abort();
  return c.signal;
};

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
  cards: Record<string, (...args: never[]) => unknown>;
}

const seat = (cardOver: Record<string, (...args: never[]) => unknown> = {}): Seat => {
  const state = tmp();
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return {};
      if (id === "boom") throw new Error("transport down");
      throw new RemoteError("draft/not-found", "no doc", {});
    },
  };
  const cards: Record<string, (...args: never[]) => unknown> = {
    // The validate arm now passes the seat's registry into the
    // inline compile (the cardGate wire, 2026-09-13): the pin
    // sweep reads objectInfo (null = the fail-open empty pin set,
    // the door's absent-pin degrade) and card= stages read
    // defsSync (no card stages ride this rig's flows).
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    modelFacts: (): unknown => {
      throw new Error("no facts");
    },
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    overlayCardParams: async (): Promise<unknown> => {
      throw new Error("unreached overlay");
    },
    composeValidateCard: async (): Promise<unknown> => null,
    phase1Card: async (): Promise<unknown> => {
      throw new Error("unreached phase1");
    },
    phase2Card: async (): Promise<unknown> => {
      throw new Error("unreached phase2");
    },
    ...cardOver,
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = cards;
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state, cards };
};

const inlineBody = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  draft_id: "d1",
  test: false,
  flow_inline: { id: "x", stages: [{ id: "s", engine: "comfyui" }] },
  ...over,
});

const settleWait = async (s: Seat, runId: string): Promise<RunRecord> => {
  for (let i = 0; i < 500; i++) {
    const row = s.core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined && row.status !== "queued" && !s.svc.pumping) return row;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("pump never settled " + runId);
};

/** The engine seat as a cordis-registered subclass (needComfyUI
 *  instanceof-gates the host service — a structural fake cannot
 *  cross; the override scripts executeFlow/stop per test). */
class FakeEngine extends ComfyUIHostService {
  stops: string[] = [];
  stopFails = false;
  onFlow: (
    rows: MergeRow[],
    runDir: string,
    inputNames: Record<string, Record<string, string>>,
    initials: Record<string, EngineJson>,
    opts: { shouldStop?: () => boolean; report?: (updates: Record<string, EngineJson>) => void },
  ) => Promise<FlowResult> = async () => ({ stages: {}, promptId: "p" });
  constructor(ctx: Context) {
    super(ctx as unknown as never, {});
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
  override async stopForRunDir(runDir: string): Promise<void> {
    this.stops.push(runDir);
    if (this.stopFails) throw new Error("interrupt refused");
  }
}

const WF = { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } };

const engineSeat = (s: Seat): FakeEngine => {
  const ctx = (s.svc as unknown as { ctx: Context }).ctx;
  const engine = new FakeEngine(ctx);
  return engine;
};

const remote = async (fn: () => Promise<unknown>): Promise<RemoteError> => {
  try {
    await fn();
  } catch (e) {
    assert.ok(e instanceof RemoteError, "a RemoteError, got " + String(e));
    return e as RemoteError;
  }
  throw new Error("never threw");
};

// ── stroke-82 queue/pump walls ─────────────────────────────────────
// Shared smalls for the walls below (the file's own rig shape:
// seat(), inlineBody, settleWait, FakeEngine via engineSeat).

/** One single-stage comfyui inline body WITH a splicible workflow. */
const wfBody82 = (): Record<string, unknown> =>
  inlineBody({
    flow_inline: {
      id: "x",
      stages: [{ id: "s", engine: "comfyui", params: WF }],
    },
  });

const waitRunning82 = async (s: Seat, runId: string): Promise<void> => {
  for (let i = 0; i < 200; i++) {
    if ((s.core.runs.get(runId) as RunRecord).status === "running") return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("never claimed " + runId);
};

/** Mount the engines seat and register one fake executor for comfyui. */
const mountSeat82 = (
  s: Seat,
  executor: {
    executeStages: (...args: never[]) => Promise<unknown>;
  },
): void => {
  const ctx = (s.svc as unknown as { ctx: Context }).ctx;
  const engines = new EnginesService(ctx);
  engines.register("comfyui", { executor } as never);
};

// 1. REGRESSION for the pump-wedge fix (stroke 82): enginesSeat
// resolve() throwing used to escape runOne with activeId held,
// wedging the pump forever. Now the resolve sits in the
// settle-on-catch scope: the run settles failed and the pump lives.
describe("stroke-82 pump-wedge regression", () => {
  it("a resolve throw settles failed, then the pump serves the next run", async () => {
    const s = seat();
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    // The seat mounted with NOTHING registered: resolve('comfyui')
    // throws LOUD ("no engine ... — registered: none ...").
    const engines = new EnginesService(ctx);
    assert.deepEqual(engines.ids(), []);
    const bad = await settleWait(s, (await s.svc.start(inlineBody(), sig())).run_id);
    assert.equal(bad.status, "failed");
    assert.match(bad.error, /no engine/);
    // Register a working executor AFTER the wedge: the pump survived.
    engines.register("comfyui", {
      executor: {
        executeStages: async () => ({
          stages: [{ stageId: "s", outputs: {}, artifacts: [] }],
        }),
      },
    } as never);
    const good = await settleWait(s, (await s.svc.start(inlineBody(), sig())).run_id);
    assert.equal(good.status, "completed");
  });
});

// 3. Terminal settle read-back: the rich row's snapshots survive the
// settle rewrite verbatim, and the terminal ledger row lands.
describe("stroke-82 terminal settle read-back", () => {
  it("card/bench snapshots survive the settle rewrite; the ledger rows run.<status>", async () => {
    const benchDoc = { stages: [{ id: "s", card: "c" }], intent: "the beach flow" };
    const s = seat({
      phase1Card: async (): Promise<unknown> => ({
        mid: "m",
        fam: "f",
        card: "c",
        skeleton: "sk",
        decl: {},
        params: {},
        spell: null,
      }),
      phase2Card: async (): Promise<unknown> => ({ graph: {} }),
    });
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (): Promise<unknown> => benchDoc,
    };
    engineSeat(s);
    const body = { draft_id: "d1", test: false, model: "m" };
    const ans = await s.svc.start(body, sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const flow = JSON.parse(
      readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(flow["status"], "completed");
    assert.deepEqual(flow["card_snapshot"], { card: "c", params: body });
    assert.deepEqual(flow["bench_snapshot"], { stages: benchDoc.stages, intent: "the beach flow" });
    const ledger = readFileSync(join(s.state, "output", "_ledger.jsonl"), "utf8");
    assert.ok(ledger.includes("run.completed"), "the terminal row lands in the ledger");
    assert.ok(ledger.includes(ans.run_id), "the terminal row names the run");
  });
});

// 4. Pre-seam splice refusal: params with no workflow key refuse at
// splice, stages + run failed with the planner text, and the pump
// still serves the next good run.
describe("stroke-82 pre-seam splice refusal", () => {
  it("a workflow-less run fails with the planner text; the next run completes", async () => {
    const s = seat();
    engineSeat(s);
    const bad = await settleWait(s, (await s.svc.start(inlineBody(), sig())).run_id);
    assert.equal(bad.status, "failed");
    assert.match(bad.error, /no inline workflow/);
    assert.equal(bad.stages[0]?.status, "failed");
    assert.match(String((bad.stages[0] as unknown as Record<string, unknown>)["error"]), /no inline workflow/);
    const good = await settleWait(s, (await s.svc.start(wfBody82(), sig())).run_id);
    assert.equal(good.status, "completed");
  });
});

// 5. Initials threading pin: the merged executeFlow seam's 4th arg.
describe("stroke-82 initials threading", () => {
  it("the worker threads {} initials into executeFlow", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let seen: unknown = "unreached";
    engine.onFlow = async (_rows, _dir, _inputs, initials) => {
      seen = initials;
      return { stages: {}, promptId: "p" };
    };
    const row = await settleWait(s, (await s.svc.start(wfBody82(), sig())).run_id);
    assert.equal(row.status, "completed");
    // CURRENT LAW: the gateway passes no initials at execute time —
    // present initials refuse at compile time upstream
    // (registryInitialsError), so the worker always threads {}.
    assert.deepEqual(seen, {});
  });
});

// 5b. THE STOPPING STAMP (stroke 83): the state existed in the
// union but nothing ever set it.
describe("stroke-83 stopping stamp", () => {
  it("a stop press on a RUNNING row stamps stopping; the settle lands stopped; a re-press is idempotent", async () => {
    const s = seat();
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    const engines = new EnginesService(ctx);
    let releaseStage: (() => void) | null = null;
    const gate = new Promise<void>((rel): void => { releaseStage = rel; });
    engines.register("comfyui", {
      executor: {
        executeStages: async (): Promise<{ stages: unknown[]; engineRef: string }> => {
          await gate;
          return { stages: [], engineRef: "p" };
        },
      },
    });
    const ans = await s.svc.start(wfBody82(), sig());
    // wait until the run is live inside the executor
    await new Promise((r): void => setTimeout(r, 60));
    const first = await s.svc.stop(ans.run_id, sig());
    assert.deepEqual(first, { run_id: ans.run_id, status: "stopping" });
    const row = s.core.runs.get(ans.run_id);
    assert.equal((row as unknown as { status: string }).status, "stopping");
    // a re-press on an already-stopping row is idempotent
    const again = await s.svc.stop(ans.run_id, sig());
    assert.equal((again as { status: string }).status, "stopping");
    releaseStage?.();
    const settled = await settleWait(s, ans.run_id);
    assert.equal(settled.status, "stopped");
  });
});

// 6. Seat-path failure/stop/tap arms (the EnginesService executor
// mirrors of the pre-seam FakeEngine arms above).
describe("stroke-82 seat-path arms", () => {
  it("executeStages rejections fail the run with the text verbatim", async () => {
    const s = seat();
    mountSeat82(s, {
      executeStages: async (): Promise<never> => {
        throw new Error("seat boom");
      },
    });
    const row = await settleWait(s, (await s.svc.start(inlineBody(), sig())).run_id);
    assert.equal(row.status, "failed");
    assert.equal(row.error, "Error: seat boom");
    assert.equal(row.stages[0]?.status, "failed");
  });

  it("a stop mid-execution converges stopped with an empty error", async () => {
    const s = seat();
    let release!: (v: { stages: never[] }) => void;
    mountSeat82(s, {
      executeStages: (): Promise<{ stages: never[] }> =>
        new Promise((res) => void (release = res)),
    });
    const ans = await s.svc.start(inlineBody(), sig());
    await waitRunning82(s, ans.run_id);
    assert.deepEqual(await s.svc.stop(ans.run_id, sig()), {
      run_id: ans.run_id,
      status: "stopping",
    });
    release({ stages: [] });
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "stopped");
    assert.equal(row.error, "");
  });

  it("the seat-path report tap folds progress then clears at completion", async () => {
    const s = seat();
    mountSeat82(s, {
      executeStages: async (
        ...args: never[]
      ): Promise<{ stages: { stageId: string; outputs: Record<string, never>; artifacts: string[] }[] }> => {
        const opts = args[3] as unknown as { report: (u: Record<string, unknown>) => void };
        opts.report({ progress: 5, activity: "" } as never);
        opts.report({
          progress: { value: 7, max: 20, node: "10" },
          activity: "sampling 7/20",
        } as never);
        await new Promise((r) => setTimeout(r, 120));
        return { stages: [{ stageId: "s", outputs: {}, artifacts: [] }] };
      },
    });
    const ans = await s.svc.start(inlineBody(), sig());
    await waitRunning82(s, ans.run_id);
    const mid = await s.svc.status(ans.run_id, sig());
    const midStage = (mid["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.deepEqual(midStage["progress"], { value: 7, max: 20 });
    assert.equal(midStage["activity"], "sampling 7/20");
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const done = row.stages[0] as unknown as Record<string, unknown>;
    assert.equal(done["progress"], undefined, "no stale percent on the completed face");
    assert.equal(done["activity"], undefined);
  });
});

// 7. FIFO serialization: a blocking first run holds the second queued.
describe("stroke-82 FIFO serialization", () => {
  it("B waits queued while A runs; A settles before B starts; order held", async () => {
    const s = seat();
    const engine = engineSeat(s);
    const started: string[] = [];
    let seenAStatusAtBStart: unknown = "unreached";
    let releaseA!: (v: FlowResult) => void;
    let calls = 0;
    let aId = "";
    engine.onFlow = (rows, runDir, _inputs, _initials, _opts) => {
      void rows;
      calls += 1;
      started.push(runDir);
      if (calls === 1) return new Promise<FlowResult>((res) => void (releaseA = res));
      seenAStatusAtBStart = (s.core.runs.get(aId) as RunRecord).status;
      return Promise.resolve({ stages: {}, promptId: "p" });
    };
    aId = (await s.svc.start(wfBody82(), sig())).run_id;
    await waitRunning82(s, aId);
    const bId = (await s.svc.start(wfBody82(), sig())).run_id;
    // B stayed queued while A ran (head-of-line holds the pump).
    assert.equal((s.core.runs.get(bId) as RunRecord).status, "queued");
    assert.equal(s.core.queuePosition(bId), 0);
    assert.equal((s.core.runs.get(aId) as RunRecord).status, "running");
    releaseA({ stages: {}, promptId: "p" });
    assert.equal((await settleWait(s, aId)).status, "completed");
    assert.equal((await settleWait(s, bId)).status, "completed");
    assert.equal(started.length, 2);
    assert.ok(started[0]!.includes(aId) && started[1]!.includes(bId), "started in order");
    assert.equal(seenAStatusAtBStart, "completed", "A was terminal before B started");
  });
});

// 8. Ghost-row strand: the stroke-82 wall exposed a REAL BUG (tryDequeue
// consumed a ghost id and returned null; the pump read a NON-empty queue
// as idle and stranded every run behind the ghost). FIXED in queue.ts the
// same stroke: the claim SKIPS ghost heads. The wall:
describe("stroke-82 ghost-head strand", () => {
  it("a ghost id at the head is skipped — the real run behind it still pumps", async () => {
    const s = seat();
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    const engines = new EnginesService(ctx);
    engines.register("comfyui", {
      executor: {
        executeStages: async () => ({ stages: [], engineRef: "p" }),
      },
    });
    const ghost = "run-ghost";
    s.core.order.push(ghost);
    const ans = await s.svc.start(inlineBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    assert.ok(!s.core.order.includes(ghost), "the ghost was consumed, not stranded");
  });
});

// 9. Stop-flag + non-stop error: the flag must not mask a real failure.
describe("stroke-82 stop-flag masking", () => {
  it("a stop followed by a non-stop failure settles failed with the text", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let release!: (e: Error) => void;
    engine.onFlow = () => new Promise((_res, rej) => void (release = rej));
    const ans = await s.svc.start(wfBody82(), sig());
    await waitRunning82(s, ans.run_id);
    assert.deepEqual(await s.svc.stop(ans.run_id, sig()), {
      run_id: ans.run_id,
      status: "stopping",
    });
    release(new Error("boom"));
    const row = await settleWait(s, ans.run_id);
    // Only a stop-voiced rejection converges stopped; 'boom'
    // carries no stop text, so the real failure wins over the flag.
    assert.equal(row.status, "failed");
    assert.match(row.error, /boom/);
  });
});

// 10. Variant-mid validate joint: the model id is NOT in facts, but
// resolveCardFamily(mid) IS — the middle disjunct resolves.
describe("stroke-82 variant-mid validate joint", () => {
  it("the middle disjunct validates 200", async () => {
    const s = seat({
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      overlayCardParams: async (): Promise<unknown> => ({ fam: "m1", card: "c", params: {} }),
    });
    const ans = (await s.svc.validate({ model: "mx" }, sig())) as Record<string, unknown>;
    assert.deepEqual(Object.keys(ans), ["ok", "model", "card", "cost"]);
    assert.equal(ans["model"], "mx");
  });
});

// 11. Cheap pins: merged:true on seat-path runs, the merged-submit
// activity text on the pre-seam path, and the list limit clamp.
describe("stroke-82 cheap pins", () => {
  it("the seat path stamps merged:true on stage rows", async () => {
    const s = seat();
    mountSeat82(s, {
      executeStages: async () => ({ stages: [{ stageId: "s", outputs: {}, artifacts: [] }] }),
    });
    const row = await settleWait(s, (await s.svc.start(inlineBody(), sig())).run_id);
    assert.equal(row.status, "completed");
    assert.equal((row.stages[0] as unknown as Record<string, unknown>)["merged"], true);
  });

  it("the pre-seam merged submit activity names stages and nodes", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async () => {
      await new Promise((r) => setTimeout(r, 120));
      return { stages: {}, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody82(), sig());
    await waitRunning82(s, ans.run_id);
    const mid = await s.svc.status(ans.run_id, sig());
    assert.equal(
      (mid["stages"] as Array<Record<string, unknown>>)[0]!["activity"],
      "merged submit (1 stages, 1 nodes)",
    );
    assert.equal((await settleWait(s, ans.run_id)).status, "completed");
  });

  it("list clamps the limit (0→1, >500→500)", async () => {
    const s = seat();
    for (const id of ["run-a", "run-b", "run-c"]) {
      const dir = join(s.state, "output", id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "_flow.json"),
        JSON.stringify({ status: "completed", pipeline: "x", created_at: 1 }),
      );
    }
    const lo = await s.svc.list("0", sig());
    assert.equal(lo.count, 3);
    assert.equal(lo.runs.length, 1);
    const hi = await s.svc.list("600", sig());
    assert.equal(hi.count, 3);
    assert.equal(hi.runs.length, 3);
  });
});
