// runs-registry-reconcile.spec.ts — the runs seat, stroke-83 boot reconcile (+ shared stroke-82 smalls): split from runs-registry.spec.ts
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

const seat = (cardOver: Record<string, (...args: never[]) => unknown> = {}): Seat =>
  seatAt(tmp(), cardOver);

/** The same rig on a CHOSEN state root (the round-trip arm needs a
 *  SECOND seat over the first one's bytes — the dead-process case). */
const seatAt = (state: string, cardOver: Record<string, (...args: never[]) => unknown> = {}): Seat => {
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return {};
      if (id === "boom") throw new Error("transport down");
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
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

// 2. Resurrect→pump joint: a canned queued pair on disk, replayed
// through the service's bootReconcile (stroke 83) with a FakeEngine
// aboard.
describe("stroke-83 boot reconcile (resurrect REBORN as a replay)", () => {
  it("the constructor's OWN fire replays records that predate the service (the true reboot receipt)", async () => {
    // The most real wall of the set: a DEAD process's queued pair
    // on disk, the engine ALREADY aboard, then the service is
    // BORN — the constructor's fire-and-forget bootReconcile runs
    // with the real dispose probe, replays both through the start
    // door, and the pump settles them. No manual re-arm anywhere.
    const state = tmp();
    const outRoot = join(state, "output");
    const put = (id: string, created: number): void => {
      const dir = join(outRoot, id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "_flow.json"),
        JSON.stringify({ status: "queued", draft_id: "d1", created_at: created, graph: [], stages: [], skipped_stages: [], artifacts: [] }),
      );
      writeFileSync(join(dir, "_request.json"), JSON.stringify(wfBody82()));
    };
    put("run-reboot-a", 1);
    put("run-reboot-b", 2);
    const ctx = new Context();
    const core = new QueueCore();
    (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (id: string): Promise<unknown> => {
        if (id === "d1") return {};
        throw new RemoteError("draft/not-found", "no doc", { draftId: id });
      },
    };
    const cards: Record<string, (...args: never[]) => unknown> = {
      objectInfo: (): unknown => null,
      defsSync: (): unknown => new Map(),
    };
    (ctx as unknown as { cardRegistry: unknown }).cardRegistry = cards;
    new FakeEngine(ctx); // aboard BEFORE the service (the lane's row order)
    const svc = new RunsRuntimeService(ctx);
    const s: Seat = { svc, core, state, cards };
    const a = await settleWait(s, "run-reboot-a");
    const b = await settleWait(s, "run-reboot-b");
    assert.equal(a.status, "completed");
    assert.equal(a.error, "");
    assert.equal(b.status, "completed");
    assert.equal(b.error, "");
    const side = JSON.parse(readFileSync(join(outRoot, "run-reboot-a", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "completed");
    assert.equal(svc.reconciled, true, "the constructor's once-guard holds");
  });

  it("a plan-level I/O fault at construction never takes the fiber down (the fire-and-forget swallow)", async () => {
    // The constructor's bootReconcile fires with a dispose guard;
    // a fault BEFORE any per-run arm (here: a state root that is a
    // FILE — the plan's directory read throws ENOTDIR) lands in the
    // .catch swallower. The once-guard already tripped (reconciled
    // true), so a later bootReconcile is a no-op — the service
    // stays usable, the fiber stays alive.
    const state = join(tmp(), "poison-root");
    writeFileSync(state, "not a directory");
    const ctx = new Context();
    const core = new QueueCore();
    (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (id: string): Promise<unknown> => { throw new RemoteError("draft/not-found", "no doc", { draftId: id }); },
    };
    const cards: Record<string, (...args: never[]) => unknown> = {
      objectInfo: (): unknown => null,
      defsSync: (): unknown => new Map(),
    };
    (ctx as unknown as Record<string, unknown>)["cards"] = cards;
    let svc: RunsRuntimeService | null = null;
    try {
      svc = new RunsRuntimeService(ctx);
    } catch (e) {
      assert.fail("construction threw: " + String(e));
    }
    await new Promise((r): void => { setTimeout(r, 30); });
    assert.ok(svc);
    assert.equal(svc.reconciled, true, "the once-guard tripped before the fault");
    assert.deepEqual(await svc.bootReconcile(), [], "the later call is a no-op");
    await ctx.fiber.dispose();
  });

  it("the canned pair replays through the start door and settles COMPLETED (real params)", async () => {
    // The on-disk shape a DEAD process leaves (queue.spec's durable
    // shape): output/<id>/_flow.json queued + the verbatim
    // _request.json the run was born from. Stroke 83: the service's
    // bootReconcile replays each request through the START door
    // under its own run id — the recompiled row carries REAL
    // params (the old hollow requeue settled everything failed
    // "no inline workflow"; that road is retired).
    const s = seat();
    engineSeat(s);
    const put = (id: string, created: number, req: Record<string, unknown>): void => {
      const dir = join(s.state, "output", id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "_flow.json"),
        JSON.stringify({
          status: "queued",
          draft_id: "d1",
          created_at: created,
          graph: [],
          stages: [{ id: "s", name: "s", index: 0, status: "queued", outputs: {}, expected: {} }],
          skipped_stages: [],
          artifacts: [],
        }),
      );
      writeFileSync(join(dir, "_request.json"), JSON.stringify(req));
    };
    // REAL single-stage inline bodies (the door's own shape) — one
    // good, one good; FIFO by created_at holds.
    put("run-aaa", 1, wfBody82());
    put("run-bbb", 2, wfBody82());
    s.svc.reconciled = false; // re-arm the wall probe
    const revived = await s.svc.bootReconcile();
    assert.deepEqual(revived, ["run-aaa", "run-bbb"]);
    const a = await settleWait(s, "run-aaa");
    const b = await settleWait(s, "run-bbb");
    assert.equal(a.status, "completed");
    assert.equal(b.status, "completed");
    // the replay enqueued REAL params: no splice refusal anywhere
    assert.equal(a.error, "");
    assert.equal(b.error, "");
    // the resurrect ledger row lands per revived id
    const ledger = readFileSync(join(s.state, "output", "_ledger.jsonl"), "utf8");
    assert.ok(ledger.includes("\"event\":\"run.resurrected\"") || ledger.includes("run.resurrected"));
  });

  it("a POISON request settles failed LOUD in place (never a haunting queued row)", async () => {
    const s = seat();
    engineSeat(s);
    const dir = join(s.state, "output", "run-poison");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({
        status: "queued", draft_id: "d1", created_at: 1, graph: [], stages: [],
        skipped_stages: [], artifacts: [],
      }),
    );
    // a request the door refuses (unknown draft is the loudest arm)
    writeFileSync(join(dir, "_request.json"), JSON.stringify({ draft_id: "nope", test: false }));
    s.svc.reconciled = false;
    const revived = await s.svc.bootReconcile();
    assert.deepEqual(revived, []);
    const side = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "failed");
    assert.match(String(side["error"]), /draft/);
  });

  it("a dispose mid-reconcile stops the replay walk (the guard returns what it revived)", async () => {
    // The dispose guard's mid-loop arm: the callback flips true
    // after the first record, so the second queued claim never
    // replays and bootReconcile returns the partial revival (the
    // caller's law, not a throw).
    const s = seat();
    engineSeat(s);
    const outRoot = join(s.state, "output");
    const put = (id: string, created: number): void => {
      const dir = join(outRoot, id);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "_flow.json"),
        JSON.stringify({ status: "queued", draft_id: "d1", created_at: created, graph: [], stages: [], skipped_stages: [], artifacts: [] }),
      );
      writeFileSync(join(dir, "_request.json"), JSON.stringify(wfBody82()));
    };
    put("run-first", 1);
    put("run-second", 2);
    s.svc.reconciled = false;
    let seen = 0;
    const revived = await s.svc.bootReconcile((): boolean => { seen += 1; return seen > 1; });
    assert.deepEqual(revived, ["run-first"], "only the head replayed before the dispose");
    assert.equal(s.core.runs.get("run-second"), undefined, "the tail never entered the registry");
    // the tail's queued sidecar stays honest on disk (the NEXT
    // boot's reconcile owns it)
    const tail = JSON.parse(readFileSync(join(outRoot, "run-second", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(tail["status"], "queued");
  });

  it("a corrupt _request.json never replays — the sweep owns it (the orphan road)", async () => {
    // Line 250's road: an unreadable request is NOT a replayable
    // claim. bootReconcile skips it; bootSweep then sweeps the
    // stale QUEUED sidecar failed with the never-executed note.
    const s = seat();
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    const engines = new EnginesService(ctx);
    engines.register("comfyui", { executor: { executeStages: async () => ({ stages: [], engineRef: "" }) } });
    const outRoot = join(s.state, "output");
    mkdirSync(join(outRoot, "run-corruptreq"), { recursive: true });
    writeFileSync(
      join(outRoot, "run-corruptreq", "_flow.json"),
      JSON.stringify({ status: "queued", error: "", stages: [], skipped_stages: [], created_at: "2026-01-01T00:00:00Z" }),
    );
    writeFileSync(join(outRoot, "run-corruptreq", "_request.json"), "{not json");
    s.svc.reconciled = false;
    const revived = await s.svc.bootReconcile();
    assert.deepEqual(revived, [], "nothing revived — the corrupt request is not a claim");
    await new Promise((r): void => { setTimeout(r, 40); });
    const side = JSON.parse(readFileSync(join(outRoot, "run-corruptreq", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "failed");
    assert.match(String(side["error"]), /never executed/);
    assert.equal(s.core.runs.get("run-corruptreq"), undefined, "no in-memory row — it never replayed");
  });

  it("a refused replay settles loud in place carrying the old sidecar's identity", async () => {
    // settleReplayRefusal's identity rebuild: the refusal row is
    // rebuilt FROM the old sidecar (stage faces, skipped_stages,
    // created_at, draft_id) and settled failed with the door's
    // own refusal text — the disk row never haunts as queued.
    const s = seat();
    engineSeat(s);
    const outRoot = join(s.state, "output");
    mkdirSync(join(outRoot, "run-poison-noise"), { recursive: true });
    writeFileSync(
      join(outRoot, "run-poison-noise", "_flow.json"),
      JSON.stringify({
        status: "queued",
        draft_id: "d1",
        created_at: 1,
        pipeline: "flow_card",
        graph: [],
        stages: [{ id: "s", name: "s", index: 0, status: "queued", outputs: {}, expected: {} }],
        skipped_stages: [],
        artifacts: [],
      }),
    );
    writeFileSync(
      join(outRoot, "run-poison-noise", "_request.json"),
      JSON.stringify({ draft_id: "nope", test: false, flow_inline: wfBody82()["flow_inline"] }),
    );
    s.svc.reconciled = false;
    const revived = await s.svc.bootReconcile();
    assert.deepEqual(revived, [], "a refused replay revives nothing");
    // the settle is IN PLACE — disk is the record (the registry row
    // never births: the run never started; "never a haunting QUEUED
    // row" is the whole point)
    assert.equal(s.core.runs.get("run-poison-noise"), undefined, "no in-memory row");
    const side = JSON.parse(readFileSync(join(outRoot, "run-poison-noise", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "failed");
    assert.match(String(side["error"]), /draft/);
    assert.equal((side["stages"] as unknown[]).length, 1, "the old sidecar's stage face carried into the refusal settle");
    assert.equal(side["pipeline"], "flow_card", "a string pipeline carries through the identity rebuild");
    // the skipped_stages map coerces non-strings to "" (the row
    // identity never leaks untyped items)
    mkdirSync(join(outRoot, "run-junkstages"), { recursive: true });
    writeFileSync(
      join(outRoot, "run-junkstages", "_flow.json"),
      JSON.stringify({ status: "queued", draft_id: "d1", error: "", graph: [], stages: [], skipped_stages: [42, "s1"], artifacts: [], created_at: 2 }),
    );
    writeFileSync(
      join(outRoot, "run-junkstages", "_request.json"),
      JSON.stringify({ draft_id: "nope", test: false, flow_inline: wfBody82()["flow_inline"] }),
    );
    s.svc.reconciled = false;
    await s.svc.bootReconcile();
    // the wrong-typed identity fields (the settle's coercion floor):
    // non-array stages, ABSENT skipped_stages, non-number created_at,
    // non-string pipeline — every ternary's zero arm.
    mkdirSync(join(outRoot, "run-junkidentity"), { recursive: true });
    writeFileSync(
      join(outRoot, "run-junkidentity", "_flow.json"),
      JSON.stringify({ status: "queued", draft_id: "d1", created_at: "late", pipeline: 7, graph: [], stages: "s", artifacts: [] }),
    );
    writeFileSync(
      join(outRoot, "run-junkidentity", "_request.json"),
      JSON.stringify({ draft_id: "nope", test: false }),
    );
    s.svc.reconciled = false;
    await s.svc.bootReconcile();
    const side3 = JSON.parse(readFileSync(join(outRoot, "run-junkidentity", "_flow.json"), "utf8")) as Record<string, unknown>;
    // TORN IDENTITY IS THE SWEEP'S, NOT THE REPLAY'S: a non-number
    // created_at fails the durable gate — the row is never replayed;
    // bootSweep settles it failed with the restart note, carrying
    // the raw sidecar identity verbatim (never guessed, never coerced).
    assert.equal(side3["status"], "failed");
    assert.equal(side3["stages"], "s", "the torn row is swept verbatim, never replayed");
    assert.equal(side3["created_at"], "late");
    assert.equal(side3["pipeline"], 7);
    assert.match(String(side3["error"]), /host restarted before the run started/);
    const side2 = JSON.parse(readFileSync(join(outRoot, "run-junkstages", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side2["status"], "failed");
    assert.equal(side2["sweep"], undefined, "not the sweep road: " + JSON.stringify(side2["sweep"]));
    // the skipped_stages map coerces non-strings to "" (the row
    // identity never leaks untyped items)
    assert.deepEqual(side2["skipped_stages"], ["", "s1"]);
  });

  it("a refused replay with a null-ish identity settles at the coercion floor", async () => {
    // settleReplayRefusal's zero arms: stages null -> [], skipped
    // null -> [], created_at "5" (a string) -> 0, pipeline
    // absent -> "flow_inline" — the row identity never leaks
    // untyped shapes into the failed settle.
    const s = seat();
    engineSeat(s);
    const outRoot = join(s.state, "output");
    mkdirSync(join(outRoot, "run-nullish"), { recursive: true });
    writeFileSync(
      join(outRoot, "run-nullish", "_flow.json"),
      JSON.stringify({ status: "queued", draft_id: "d1", created_at: "5", graph: [], stages: null, skipped_stages: null, artifacts: [] }),
    );
    writeFileSync(
      join(outRoot, "run-nullish", "_request.json"),
      JSON.stringify({ draft_id: "nope", test: false, flow_inline: wfBody82()["flow_inline"] }),
    );
    s.svc.reconciled = false;
    const revived = await s.svc.bootReconcile();
    assert.deepEqual(revived, [], "a refused replay revives nothing");
    const side = JSON.parse(readFileSync(join(outRoot, "run-nullish", "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "failed");
    assert.deepEqual(side["stages"], []);
    assert.deepEqual(side["skipped_stages"], []);
    assert.equal(side["created_at"], 0, "a string created_at tolls the number gate's zero arm");
    assert.equal(side["pipeline"], "flow_inline");
  });

  it("a NON-OBJECT sidecar never enters the replay plan (the settle's shape guard is TOCTOU-only)", async () => {
    // JSON.parse accepts `null`/`42`/`"x"` — the plan's own
    // parseSidecar refuses them before any id reaches the settle's
    // re-read, so the run is never replayed and never settled: the
    // sweep owns it and the doc rides untouched. The settle-side
    // guard exists only for a doc that CHANGES shape between the
    // plan's read and the settle's re-read.
    for (const doc of [null, 42, "x", [1, 2]]) {
      const s = seat();
      engineSeat(s);
      const outRoot = join(s.state, "output");
      mkdirSync(join(outRoot, "run-nonobj"), { recursive: true });
      writeFileSync(join(outRoot, "run-nonobj", "_flow.json"), JSON.stringify(doc));
      writeFileSync(
        join(outRoot, "run-nonobj", "_request.json"),
        JSON.stringify({ draft_id: "nope", test: false, flow_inline: wfBody82()["flow_inline"] }),
      );
      s.svc.reconciled = false;
      const revived = await s.svc.bootReconcile();
      assert.deepEqual(revived, [], "a non-object sidecar revives nothing: " + JSON.stringify(doc));
      // untouched: never settled failed (the sweep road owns it)
      const raw = JSON.parse(readFileSync(join(outRoot, "run-nonobj", "_flow.json"), "utf8")) as unknown;
      assert.deepEqual(raw, doc, "the doc rides verbatim: " + JSON.stringify(doc));
    }
  });

  it("the service's modelValidateArm delegates to the extracted arm", async () => {
    const s = seat();
    engineSeat(s);
    const ans = await s.svc.modelValidateArm({ model: undefined });
    assert.ok([200, 400, 500].includes(ans.status), "an envelope answer, never a throw");
  });

  it("a stale RUNNING claim sweeps after the replay (the boot disposition is ledgered)", async () => {
    const s = seat();
    engineSeat(s);
    const dir = join(s.state, "output", "run-ghosted");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "_flow.json"),
      JSON.stringify({ status: "running", draft_id: "d1", created_at: 1, graph: [], stages: [] }),
    );
    s.svc.reconciled = false;
    await s.svc.bootReconcile();
    const side = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(side["status"], "failed");
    // the running-claim sweep note rides the `sweep` key (only
    // never-executed QUEUED claims also carry `error` — the
    // sweepSidecar law)
    assert.match(String(side["sweep"]), /boot sweep/);
  });
});

// THE ROUND TRIP (2026-10-13, the door audit's gap 1). Every reboot
// test above HAND-AUTHORED its `_flow.json`: the writer (runsStart.ts
// -> sidecarDoc) and the reader (queueResurrect.ts -> parseSidecar)
// were pinned to two independently written JSON shapes, so renaming a
// field on either side stayed green while a production run silently
// dropped at boot. Nothing crossed the two. This does: the REAL start
// door writes the bytes, a FRESH seat reads them off disk.
describe("the writer's own bytes survive the process", () => {
  it("a real run's _flow.json is readable by a real boot on a fresh seat", async () => {
    const s = seat();
    engineSeat(s);
    const ans = await s.svc.start(wfBody82(), new AbortController().signal);

    // read the writer's OWN sidecar — no fixture, no hand-authored shape
    const sidecarPath = join(s.state, "output", ans.run_id, "_flow.json");
    const sidecar = JSON.parse(readFileSync(sidecarPath, "utf8")) as Record<string, unknown>;
    assert.equal(sidecar["status"], "queued", "the shape bootReconcile replays");
    assert.equal(sidecar["draft_id"], "d1");

    // the DEAD-PROCESS case: a second seat over the SAME root, engine
    // aboard, nothing re-armed by hand. The constructor's OWN
    // fire-and-forget bootReconcile (runsRegistry.ts:353) is what runs
    // — so the assertion is its EFFECT: the run reappears in a queue
    // that started empty, which it can only do by reading the writer's
    // bytes. (The once-guard at :387 means an explicit second call
    // returns []; re-arming it by hand would test the re-arm, not the
    // round trip.)
    const dead = seatAt(s.state);
    new FakeEngine((dead.svc as unknown as { ctx: Context }).ctx);
    const revived = await waitForReplay(dead);
    assert.equal(revived.length, 1, "exactly the writer's run was replayed");
    const row = await settleWait(dead, revived[0]!);
    assert.notEqual(row.status, "queued", "the replayed run really ran");
  });

  it("a completed run is NOT resurrected (the settle writer is readable too)", async () => {
    const s = seat();
    engineSeat(s);
    const ans = await s.svc.start(wfBody82(), new AbortController().signal);
    await settleWait(s, ans.run_id);
    const sidecar = JSON.parse(
      readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.notEqual(sidecar["status"], "queued", "the settle writer moved it off queued");

    const dead = seatAt(s.state);
    new FakeEngine((dead.svc as unknown as { ctx: Context }).ctx);
    assert.deepEqual(await waitForReplay(dead), [], "a settled run is never resurrected");
  });
});

/** The ids the fresh seat's OWN boot replay put into its queue, after
 *  the fire-and-forget reconcile has had time to land. Bounded so a
 *  reader that never replays fails with [] instead of hanging. */
const waitForReplay = async (s: Seat): Promise<string[]> => {
  for (let i = 0; i < 200; i++) {
    const ids = [...s.core.runs.keys()].filter((id) => s.core.runs.get(id) !== undefined);
    if (ids.length > 0) {
      // one more turn so a second (unexpected) replay would also show
      await new Promise((r) => setTimeout(r, 20));
      return [...s.core.runs.keys()];
    }
    await new Promise((r) => setTimeout(r, 10));
  }
  return [];
};
