// runs-registry-pump.spec.ts — the runs seat, pump + engine: split from runs-registry.spec.ts
// (pure move — zero test-content change; the queue core is real,
// the card registry rides a structural fake).
import { describe, it, afterEach, vi } from "vitest";

// THE CLAIM-PERSIST GATE (audit N-S7's wall): the fence only
// fires when a pump scaffold hop ESCAPES — every real hop
// self-swallows, so the wall rigs claimPersist (a self-swallowing
// hop by law) to reject through a mock gated to this file's flag;
// every other test runs the original untouched.
let claimPersistThrows = false;
vi.mock("../src/runsTypes.ts", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../src/runsTypes.ts")>();
  return {
    ...orig,
    claimPersist: (run: Parameters<typeof orig.claimPersist>[0]): Promise<void> =>
      claimPersistThrows ? Promise.reject(new Error("claim persist exploded")) : orig.claimPersist(run),
  };
});
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ComfyUIHostService, ComfyUIWiringService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { EnginesService } from "@melite/engine-contract";
import { QueueCore } from "../src/queue.ts";
import { CardArmError } from "../src/cardsRegistry.ts";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

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
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    // the happy path only (a re-audit finding, 2026-10-16): the
    // transport-down and not-found legs this mock used to carry had
    // no driver in this spec — those refusals are owned by the
    // runs-start/serve specs; a rig leg nobody drives is dead weight
    get: async (): Promise<unknown> => ({}),
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
  ) => Promise<FlowResult> = async (rows) => ({
    stages: Object.fromEntries(
      rows.map((r) => [r.stageId, { outputs: {}, artifacts: [] }]),
    ),
    promptId: "p",
  });
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

describe("pump + engine", () => {
  const wfBody = (over: Record<string, unknown> = {}): Record<string, unknown> =>
    inlineBody({
      flow_inline: {
        id: "x",
        stages: [{ id: "s", engine: "comfyui", params: WF }],
      },
      ...over,
    });
  const waitRunning = async (s: Seat, runId: string): Promise<void> => {
    // THE CLAIM-WRITE SEAM (the commission wedge landing, 2026-10-03):
    // the row flips 'running' at claim, but the engine holds the run
    // only after the claim persist (durable 'running' on disk — see
    // claimPersist) and runOne's stage stamps. The first stage's
    // flip is the seam these rigs wait on: everything between it
    // and the executeFlow call is synchronous, so a timer observing
    // the flip proves onFlow was entered.
    for (let i = 0; i < 200; i++) {
      const row = s.core.runs.get(runId) as RunRecord | undefined;
      if (row !== undefined && row.status === "running" &&
          (row.stages[0] as unknown as { status?: string } | undefined)?.["status"] === "running") return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error("never claimed " + runId);
  };

  // THE PROGRESS TAP FOLD (2026-09-13, the operator's "forward the
  // comfyui progress webhooks like before"): the worker hands its
  // report to executeFlow; the engine's /ws tap folds live frames —
  // the fold stamps EVERY stage row (the merged submit mints one
  // prompt), the status door serves stages verbatim, and the
  // terminal finisher deletes both keys (no stale percent on a
  // completed face).
  it("the report fold stamps live progress+activity on stage rows and clears them at terminal", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let entered = false;
    let releaseFlow: (() => void) | null = null;
    const flowGate = new Promise<void>((rel): void => { releaseFlow = rel; });
    engine.onFlow = async (_rows, _runDir, _in, _init, opts) => {
      // the degenerate fold first (a bare number progress + empty
      // activity stamp nothing — the fold's false arms), then the
      // real report the asserts below read.
      opts.report?.({ progress: 5, activity: "" } as never);
      opts.report?.({
        progress: { value: 7, max: 20, node: "10" },
        activity: "sampling 7/20",
      } as never);
      // the mid-flight window is a gate, not a 120ms sleep: the
      // reports above are synchronous, so entered means the mid
      // assertions below observe the folded progress deterministically.
      entered = true;
      await flowGate;
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    for (let i = 0; i < 500; i++) {
      if (entered) break;
      if (i === 499) throw new Error("never entered " + ans.run_id);
      await new Promise((r) => setTimeout(r, 10));
    }
    const mid = await s.svc.status(ans.run_id, sig());
    const midStage = (mid["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.deepEqual(midStage["progress"], { value: 7, max: 20 });
    assert.equal(midStage["activity"], "sampling 7/20");
    (releaseFlow as (() => void) | null)?.();
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const doneStage = row.stages[0] as unknown as Record<string, unknown>;
    assert.equal(doneStage["progress"], undefined, "no stale percent on the completed face");
    assert.equal(doneStage["activity"], undefined);
  });

  // THE FILM PRESENTATION (2026-09-22, the valve's death): real tiny
  // mp4s written into the run dir by the fake engine. The harness
  // NEVER composes media — these arms prove presentation order only.
  // The availability gate is asserted in the ARM BODY (a re-audit
  // finding, 2026-10-16): the assert.ok(mkMp4(...)) calls fire inside
  // onFlow, whose throws the source catch (runsExecute) folds into
  // run.error — a host without ffmpeg failed as a mystery "error"
  // row instead of naming the missing binary.
  const ffmpegOk = (): boolean =>
    spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;
  const needFfmpeg = (): void => {
    assert.ok(ffmpegOk(), "ffmpeg is unavailable — the film-presentation arms need real tiny mp4s");
  };
  const mkMp4 = (dir: string, name: string, secs: string): boolean =>
    spawnSync(
      "ffmpeg",
      ["-y", "-f", "lavfi", "-i", `testsrc=duration=${secs}:size=64x64:rate=8`,
       "-f", "lavfi", "-i", `anullsrc=duration=${secs}`,
       "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
       join(dir, name)],
      { encoding: "utf8" },
    ).status === 0;


  it("THE ENGINE FILM LEADS (in-graph concat; the harness never muxes)", async () => {
    needFfmpeg();
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      mkdirSync(join(runDir, "h3-film"), { recursive: true });
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_film_00012_.mp4", "1"));
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w1_00010_.mp4", "1"));
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w2_00011_.mp4", "1"));
      return { stages: { s: { outputs: {}, artifacts: [
        join(runDir, "h3-film/h3_t4_w1_00010_.mp4"),
        join(runDir, "h3-film/h3_t4_w2_00011_.mp4"),
        join(runDir, "h3-film/h3_t4_film_00012_.mp4"),
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    // the film LEADS presentation — and no harness mux artifact exists
    assert.equal(stage["url"], "h3-film/h3_t4_film_00012_.mp4");
    const gallery = stage["gallery"] as Array<{ name: string }>;
    assert.equal(gallery[0]!.name, "h3-film/h3_t4_film_00012_.mp4");
    assert.ok(!row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("THE VALVE IS DEAD (2026-09-22, the operator's provenance law): windows-only films keep the windows — the harness never concats, never mixes", async () => {
    needFfmpeg();
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      mkdirSync(join(runDir, "h3-film"), { recursive: true });
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w1_00010_.mp4", "1"));
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w2_00011_.mp4", "1"));
      return { stages: { s: { outputs: {}, artifacts: [
        join(runDir, "h3-film/h3_t4_w1_00010_.mp4"),
        join(runDir, "h3-film/h3_t4_w2_00011_.mp4"),
      ] } }, promptId: "p" } as never;
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    // the windows ARE the gallery — no film_video_mux, no
    // film_video_mix: the film is a card composition (the
    // film-assemble stage), never a harness side-effect
    assert.ok(typeof stage["url"] === "string" && stage["url"].endsWith("h3_t4_w1_00010_.mp4"));
    const gallery = stage["gallery"] as Array<{ name: string }>;
    assert.equal(gallery.length, 2);
    assert.ok(!row.artifacts.some((a: string) => a.includes("film_video_")));
  });


  // (renamed by the re-audit, 2026-10-16): the old name promised an
  // "undecided probe (missing stitch file)" — no such probe exists;
  // runRel is string surgery and engineFilmName matches only the
  // h3_t4_film_\d+_ pattern, so this vehicle drives the NO-MATCH
  // road: none of these artifact names is a film, the engine's own
  // leading name leads, and the mux valve stays closed
  it("engine names that match no film pattern keep their own order (the film lead matches only the t4 film; the mux valve stays closed)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async () => ({
      stages: { s: { outputs: {}, artifacts: [
        "stitch_video_0.mp4", "window1_video_0.mp4", "window2_video_0.mp4",
      ] } }, promptId: "p",
    });
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    assert.ok(typeof stage["url"] === "string" && (stage["url"] as string).endsWith("stitch_video_0.mp4"));
    assert.ok(!row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });



  it("the worker harvests artifacts (run-relative url + gallery)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async () => ({
      stages: { s: { outputs: { img: 1 }, artifacts: ["", "o.png"] } },
      promptId: "p",
    });
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    assert.deepEqual(row.artifacts, ["o.png"]);
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    assert.equal(stage["status"], "completed");
    assert.deepEqual(stage["result_outputs"], { img: 1 });
    assert.ok(
      typeof stage["url"] === "string" && (stage["url"] as string).endsWith("o.png"),
    );
    assert.equal((stage["gallery"] as unknown[]).length, 1);
    assert.ok(!("activity" in stage) && !("progress" in stage));
  });

  // THE MISSING-STAGE REFUSAL (P7 B1): the old law — the empty
  // harvest completes — is dead by operator mandate. The engine
  // answered for a submitted stage id or it did not: a FlowResult
  // with no row for a submitted stage fails the run naming the
  // missing id, never settles completed/empty (the walls tier
  // judges the same law: tests/walls/ts/suites/runs-missing-stage.spec.ts).
  it("missing stage rows fail the run (the empty harvest no longer completes)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, _dir, _inputs, _initials, opts) => {
      assert.equal(opts.shouldStop?.(), false);
      return { stages: {}, promptId: "p" };
    };
    const row = await settleWait(s, (await s.svc.start(wfBody(), sig())).run_id);
    assert.equal(row.status, "failed");
    assert.match(row.error, /runs\/missing-stage-result/);
    assert.match(row.error, /stage "s"/);
    assert.equal(
      (row.stages[0] as unknown as Record<string, unknown>)["status"],
      "failed",
    );
    assert.match(
      String((row.stages[0] as unknown as Record<string, unknown>)["error"]),
      /stage "s"/,
    );
  });

  // THE CLAIM-RELEASE LAW (the commission wedge landing, 2026-10-03):
  // runOne guards its own paths, but an escape from an UNGUARDED
  // stretch — a wiring seat whose armed() throws, the one fence call
  // outside its own catch — used to strand the claim: activeId held,
  // the pump exited, every later run queued forever behind a claim
  // nobody owned. The pump's catch settles the row failed loud and
  // keeps claiming.
  it("a runOne escape settles failed, frees the claim, and the next run proceeds (claim-release law)", async () => {
    const s = seat();
    // the engine must be SEATED: an unseated fiber refuses at the
    // guarded resolve arm and never reaches the fence. The wiring
    // seat registers through Service construction (super(ctx,
    // 'comfyuiWiring')) — a subclass whose armed() throws is the
    // escape under test: the fence calls it OUTSIDE its own catch.
    engineSeat(s);
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    class ThrowingWiring extends ComfyUIWiringService {
      override armed(): boolean {
        throw new Error("wiring seat died mid-boot");
      }
    }
    new ThrowingWiring(ctx);
    const first = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, first.run_id);
    assert.equal(row.status, "failed");
    assert.match(row.error, /run seat escape/);
    assert.match(row.error, /wiring seat died mid-boot/);
    assert.equal(
      (row.stages[0] as unknown as Record<string, unknown>)["status"],
      "failed",
    );
    assert.equal(s.core.activeId, null, "the claim is free");
    // the claim persist wrote 'running' before the escape; settle
    // rewrote it failed — the disk face ends terminal either way
    const sidecar = JSON.parse(
      readFileSync(join(row.dir, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(sidecar["status"], "failed");
    // the queue CONTINUES: a second run settles too, never stranded
    // behind the dead claim
    const second = await s.svc.start(wfBody(), sig());
    const row2 = await settleWait(s, second.run_id);
    assert.equal(row2.status, "failed");
    assert.equal(s.core.activeId, null);
  });

  // THE PUMP FENCE (audit N-S7): every hop inside pump self-swallows
  // today, so this rig BREAKS one on purpose — a claim persist that
  // escapes must strand nothing: the fence releases the pinned
  // claim, voices in the log, and the next run proceeds. Unstranded
  // by construction, not by current-hop discipline.
  it("a pump scaffold escape releases the claim, voices, and never strands the queue (audit N-S7)", async () => {
    const s = seat();
    engineSeat(s);
    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((...a: unknown[]) => {
      logs.push(a.map((x) => String(x)).join(" "));
    });
    claimPersistThrows = true;
    try {
      await s.svc.start(wfBody(), sig());
      for (let i = 0; i < 500; i++) {
        if (s.core.activeId === null && !s.svc.pumping) break;
        await new Promise((r) => setTimeout(r, 10));
      }
      assert.equal(s.core.activeId, null, "the fence released the stranded claim");
      assert.equal(s.svc.pumping, false);
      assert.ok(logs.some((l) => /pump scaffold escape/.test(l)), "the escape is voiced: " + logs.join(" | "));
      // UNSTRANDED BY CONSTRUCTION: with the hop healthy again, the
      // next run claims and settles normally
      claimPersistThrows = false;
      const second = await s.svc.start(wfBody(), sig());
      const row2 = await settleWait(s, second.run_id);
      assert.equal(row2.status, "completed");
      assert.equal(s.core.activeId, null);
    } finally {
      claimPersistThrows = false;
      spy.mockRestore();
    }
  });

  it("stop converges stopped (flag + stop text; the error stays empty)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let release!: (e: Error) => void;
    engine.onFlow = () => new Promise((_res, rej) => void (release = rej));
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    assert.deepEqual(await s.svc.stop(ans.run_id, sig()), {
      run_id: ans.run_id,
      status: "stopping",
    });
    assert.deepEqual(engine.stops, [(s.core.runs.get(ans.run_id) as RunRecord).dir]);
    release(new Error("stop requested"));
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "stopped");
    assert.equal(row.error, "");
  });

  it("unstopped engine failures carry the text", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let release!: (e: Error) => void;
    engine.onFlow = () => new Promise((_res, rej) => void (release = rej));
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    release(new Error("boom"));
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "failed");
    assert.match(row.error, /boom/);
  });

  it("a refused interrupt still converges (the catch swallows, the flag rules)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.stopFails = true;
    let release!: (v: FlowResult) => void;
    let echo: MergeRow[] = [];
    engine.onFlow = (rows) => {
      echo = rows;
      return new Promise<FlowResult>((res) => void (release = res));
    };
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    assert.deepEqual(await s.svc.stop(ans.run_id, sig()), {
      run_id: ans.run_id,
      status: "stopping",
    });
    // the stop delivery to the engine is async — poll the stops
    // rail, not a fixed 20ms (late on a loaded machine, dead time
    // otherwise).
    for (let i = 0; i < 200; i++) {
      if (engine.stops.length === 1) break;
      if (i === 199) throw new Error("stop never reached the engine " + ans.run_id);
      await new Promise((r) => setTimeout(r, 10));
    }
    release({
      stages: Object.fromEntries(
        echo.map((r) => [r.stageId, { outputs: {}, artifacts: [] }]),
      ),
      promptId: "p",
    });
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "stopped");
    assert.equal((s.core.runs.get(ans.run_id) as RunRecord).stopFlag, true);
  });

  it("a queued rich row without inputNames rides the default (pump loops FIFO)", async () => {
    const s = seat();
    engineSeat(s);
    const dir = join(s.state, "output", "run-manual");
    mkdirSync(dir, { recursive: true });
    s.core.enqueue({
      runId: "run-manual",
      status: "queued",
      stages: [{ id: "m", name: "m", index: 0, status: "pending", outputs: {}, expected: {} }],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir,
      testFlag: false,
      stopFlag: false,
      params: [WF],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [{}],
    } as never);
    const ans = await s.svc.start(wfBody(), sig());
    assert.equal((await settleWait(s, "run-manual")).status, "completed");
    assert.equal((await settleWait(s, ans.run_id)).status, "completed");
  });

  // THE CLAIM-TIME INITIALS RE-PROBE (audit F5): the press gate
  // validated the file initials at press; the merge consumes them
  // minutes later. A file lost in between dies engine-side,
  // unnamed — the probe re-judges the stamped file-kind keys over
  // the press gate's own candidate trees and fails the row with
  // the press text.
  it("THE F5 RE-PROBE, miss: a claimed row whose file initial left disk fails with the press voice", async () => {
    const s = seat();
    const present = join(s.state, "output", "run-here", "kept.png");
    mkdirSync(join(s.state, "output", "run-here"), { recursive: true });
    writeFileSync(present, "png");
    s.core.enqueue({
      runId: "run-init-miss",
      status: "queued",
      stages: [
        { id: "a", name: "a", index: 0, status: "queued", outputs: {}, expected: {} },
        { id: "b", name: "b", index: 1, status: "pending", outputs: {}, expected: {} },
      ],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir: join(s.state, "output", "run-init-miss"),
      testFlag: false,
      stopFlag: false,
      params: [WF],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [{}],
      initials: { gone: "/melite-media/runs/run-old/lost.png", kept: "/melite-media/runs/run-here/kept.png" },
      initialFileKeys: ["gone", "kept"],
    } as never);
    (s.svc as unknown as { kick: () => void }).kick();
    const row = await settleWait(s, "run-init-miss");
    assert.equal(row.status, "failed");
    assert.match(row.error, /initial "gone" is not on disk/);
    assert.match(row.error, /lost\.png/);
    for (const st of row.stages) {
      assert.equal(st.status, "failed");
      assert.match(st.error as string, /initial "gone" is not on disk/);
    }
  });

  it("THE F5 RE-PROBE, hit: a present file initial rides past the probe to the engine", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (): Promise<FlowResult> => ({
      stages: { a: { outputs: {}, artifacts: [] } },
      promptId: "p",
    });
    const dir = join(s.state, "output", "run-here");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "kept.png"), "png");
    s.core.enqueue({
      runId: "run-init-hit",
      status: "queued",
      stages: [{ id: "a", name: "a", index: 0, status: "queued", outputs: {}, expected: {} }],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir,
      testFlag: false,
      stopFlag: false,
      params: [WF],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [{}],
      initials: { kept: "/melite-media/runs/run-here/kept.png" },
      initialFileKeys: ["kept"],
    } as never);
    (s.svc as unknown as { kick: () => void }).kick();
    assert.equal((await settleWait(s, "run-init-hit")).status, "completed");
  });

  it("THE F5 SCOPING: no stamped keys — a text/params initials row is never disk-probed", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (): Promise<FlowResult> => ({
      stages: { a: { outputs: {}, artifacts: [] } },
      promptId: "p",
    });
    mkdirSync(join(s.state, "output", "run-init-scope"), { recursive: true });
    s.core.enqueue({
      runId: "run-init-scope",
      status: "queued",
      stages: [{ id: "a", name: "a", index: 0, status: "queued", outputs: {}, expected: {} }],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir: join(s.state, "output", "run-init-scope"),
      testFlag: false,
      stopFlag: false,
      params: [WF],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [{}],
      initials: { bone: "spine", bake: "{}" },
      // no initialFileKeys: text and bake_params have no disk
      // contract — the probe never runs for them
    } as never);
    (s.svc as unknown as { kick: () => void }).kick();
    assert.equal((await settleWait(s, "run-init-scope")).status, "completed");
  });

  // THE TEARDOWN RACE, RETIRED (standing debt since transcript-014;
  // fixed 2026-09-24): before the arm, dispose stopped NOTHING —
  // the pump kept claiming queued runs past fiber death (GPU work
  // after teardown; a next boot's reconcile could replay a run the
  // zombie pump was still settling — duplicate GPU spend). The arm:
  // the dispose effect flips the PUBLIC tearingDown gate, presses
  // stopFlags on every live row, and fires the engine interrupt
  // best-effort; the pump's claim gate refuses new claims.
  it("THE TEARDOWN ARM: dispose stops the in-flight run (flag + interrupt) and the pump claims nothing more", async () => {
    const s = seat();
    const engine = engineSeat(s);
    let release: (() => void) | undefined;
    const parked = new Promise<void>((r) => { release = r; });
    engine.onFlow = async (_rows, runDir, _in, _init, opts) => {
      // a run that parks until the worker's stop check (the
      // stopFlag the dispose effect presses) converges
      await new Promise<void>((done) => {
        const tick = (): void => {
          if (opts.shouldStop?.()) { done(); return; }
          setTimeout(tick, 5);
        };
        tick();
      });
      release?.();
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const a = await s.svc.start(wfBody(), sig());
    await waitRunning(s, a.run_id);
    // a SECOND run sits queued behind the in-flight one — the
    // claim the teardown gate must refuse
    const b = await s.svc.start(wfBody({ name_hint: "second" }), sig());
    assert.equal((s.core.runs.get(b.run_id) as RunRecord).status, "queued");
    // TEARDOWN: the fiber's own dispose (the cordis effect verb)
    engine.stopFails = true;
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    await ctx.fiber.dispose();
    await parked; // the engine arm observed the stop and returned
    // (1) the in-flight run converges STOPPED, never completed
    const aRow = await settleWait(s, a.run_id);
    assert.equal(aRow.status, "stopped");
    // (2) the engine interrupt fired for the in-flight run's dir
    assert.ok(engine.stops.includes(aRow.dir), "the dispose pressed the engine interrupt");
    // (3) THE CLAIM GATE: the queued run stays queued forever —
    // no post-teardown claim, no duplicate GPU spend
    await new Promise((r) => setTimeout(r, 50));
    const bRow = s.core.runs.get(b.run_id) as RunRecord;
    assert.equal(bRow.status, "queued");
    assert.equal(bRow.stopFlag, true); // the sweep pressed its flag too — the next boot's reconcile owns it
    assert.equal(s.svc.tearingDown, true); // the PUBLIC gate a next claim consults
    assert.equal(s.svc.pumping, false);
    void release;
  });

  it("teardown without a cached engine still presses the live stop flag", async () => {
    const s = seat();
    const runId = "run-teardown-fallback";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    const row: RunRecord = {
      // The fixture brands at its construction door (arbitrary label).
      runId: runId as RunId,
      status: "running",
      stages: [],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir,
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [],
      initials: {},
    };
    s.core.runs.set(runId, row);
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    await ctx.fiber.dispose();
    assert.equal(row.stopFlag, true);
    assert.equal(s.svc.tearingDown, true);
  });

  it("THE VARIANT, SERVED (commission 033's self-critique #5): the live status row serves the lane the row holds; variant-less rows serve no key", async () => {
    const s = seat();
    // park the claim gate (the PUBLIC teardown flag) — the row
    // stays queued, so the status reads are stable with no engine
    // seated and no worker racing the assertions.
    s.svc.tearingDown = true;
    const a = await s.svc.start(wfBody(), sig());
    // an inline run names no lane — the key stays absent, never guessed
    const bare = await s.svc.status(a.run_id, sig());
    assert.ok(!("variant" in bare));
    // the registration stamp is what names it (walled in
    // runs-start.spec.ts); the serve arm projects the row verbatim
    const live = s.core.runs.get(a.run_id) as RunRecord;
    live.variant = "customvoice";
    const served = await s.svc.status(a.run_id, sig());
    assert.equal(served["variant"], "customvoice");
  });
});
