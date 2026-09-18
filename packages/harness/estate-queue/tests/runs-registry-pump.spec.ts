// runs-registry-pump.spec.ts — the runs seat, pump + engine: split from runs-registry.spec.ts
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
    for (let i = 0; i < 200; i++) {
      if ((s.core.runs.get(runId) as RunRecord).status === "running") return;
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
    engine.onFlow = async (_rows, _runDir, _in, _init, opts) => {
      // the degenerate fold first (a bare number progress + empty
      // activity stamp nothing — the fold's false arms), then the
      // real report the asserts below read.
      opts.report?.({ progress: 5, activity: "" } as never);
      opts.report?.({
        progress: { value: 7, max: 20, node: "10" },
        activity: "sampling 7/20",
      } as never);
      await new Promise((r) => setTimeout(r, 120));
      return { stages: { s: { outputs: {}, artifacts: [] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    const mid = await s.svc.status(ans.run_id, sig());
    const midStage = (mid["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.deepEqual(midStage["progress"], { value: 7, max: 20 });
    assert.equal(midStage["activity"], "sampling 7/20");
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const doneStage = row.stages[0] as unknown as Record<string, unknown>;
    assert.equal(doneStage["progress"], undefined, "no stale percent on the completed face");
    assert.equal(doneStage["activity"], undefined);
  });

  // THE FILM COMPLETION (2026-09-12): real tiny mp4s written into the
  // run dir by the fake engine — ffmpeg-gated (the host has it; the
  // whole arm skips loudly without it, matching film-mux.spec).
  const ffmpegOk = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" }).status === 0;
  const mkMp4 = (dir: string, name: string, secs: string): boolean =>
    spawnSync(
      "ffmpeg",
      ["-y", "-f", "lavfi", "-i", `testsrc=duration=${secs}:size=64x64:rate=8`,
       "-f", "lavfi", "-i", `anullsrc=duration=${secs}`,
       "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
       join(dir, name)],
      { encoding: "utf8" },
    ).status === 0;

  it("a short stitch completes into the film (windows concat, film leads)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      assert.ok(mkMp4(runDir, "stitch_video_0.mp4", "1"));
      for (const w of ["window1_video_0.mp4", "window2_video_0.mp4", "window3_video_0.mp4"]) {
        assert.ok(mkMp4(runDir, w, "1"));
      }
      return { stages: { s: { outputs: {}, artifacts: [
        "stitch_video_0.mp4", "window1_video_0.mp4", "window2_video_0.mp4", "window3_video_0.mp4",
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    // THE FILM LEADS: url + gallery head is the mux output, and the
    // film artifact rides run.artifacts
    assert.ok(typeof stage["url"] === "string" && (stage["url"] as string).endsWith("film_video_mux.mp4"));
    const gallery = stage["gallery"] as Array<{ name: string }>;
    assert.equal(gallery[0]!.name, "film_video_mux.mp4");
    assert.ok(row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("THE ENGINE FILM LEADS (in-graph concat; the harness never muxes)", async () => {
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

  it("THE MERGED FILM: no stitch at all — the windows concat unconditionally (the seam-wiring stroke)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      mkdirSync(join(runDir, "h3-film"), { recursive: true });
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w1_00010_.mp4", "1"));
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w2_00011_.mp4", "1"));
      // absolute artifact paths — the real engine's convention (runRel
      // keeps the h3-film/ stage-dir suffix only for run-dir-absolute)
      return { stages: { s: { outputs: {}, artifacts: [
        join(runDir, "h3-film/h3_t4_w1_00010_.mp4"),
        join(runDir, "h3-film/h3_t4_w2_00011_.mp4"),
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    assert.ok(typeof stage["url"] === "string" && (stage["url"] as string).endsWith("film_video_mux.mp4"));
    const gallery = stage["gallery"] as Array<{ name: string }>;
    assert.equal(gallery[0]!.name, "film_video_mux.mp4");
    assert.ok(row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("THE MERGED FILM: a failed concat keeps the windows themselves (loud, never a fake film)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      mkdirSync(join(runDir, "h3-film"), { recursive: true });
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w1_00010_.mp4", "1"));
      assert.ok(mkMp4(runDir, "h3-film/h3_t4_w2_00011_.mp4", "1"));
      // the output path is a DIRECTORY: ffmpeg cannot write the film —
      // the concat fails loudly, and the windows stay the truth
      mkdirSync(join(runDir, "film_video_mux.mp4"), { recursive: true });
      return { stages: { s: { outputs: {}, artifacts: [
        join(runDir, "h3-film/h3_t4_w1_00010_.mp4"),
        join(runDir, "h3-film/h3_t4_w2_00011_.mp4"),
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    // the windows lead — no film artifact, no lie
    const url = stage["url"] as string;
    assert.ok(url.includes("h3_t4_w1"), `url was: ${url}`);
    assert.ok(!row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("an undecided probe (missing stitch file) keeps the engine's own names", async () => {
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

  it("a full stitch is never re-muxed (the tolerance law, registry side)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      assert.ok(mkMp4(runDir, "stitch_video_0.mp4", "2"));
      assert.ok(mkMp4(runDir, "window1_video_0.mp4", "1"));
      assert.ok(mkMp4(runDir, "window2_video_0.mp4", "1"));
      return { stages: { s: { outputs: {}, artifacts: [
        "stitch_video_0.mp4", "window1_video_0.mp4", "window2_video_0.mp4",
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    assert.ok(typeof stage["url"] === "string" && (stage["url"] as string).endsWith("stitch_video_0.mp4"));
    assert.ok(!row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("a decided mux that cannot write its list keeps the stitch (muxed-null arm)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      // real, probe-able files (decidable + shouldMux true)…
      assert.ok(mkMp4(runDir, "stitch_video_0.mp4", "1"));
      assert.ok(mkMp4(runDir, "window1_video_0.mp4", "1"));
      assert.ok(mkMp4(runDir, "window2_video_0.mp4", "1"));
      // …but the mux's own list file is occupied by a directory —
      // the concat never starts, the engine stitch stays the hero
      mkdirSync(join(runDir, ".film-mux-list.txt"));
      return { stages: { s: { outputs: {}, artifacts: [
        "stitch_video_0.mp4", "window1_video_0.mp4", "window2_video_0.mp4",
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
    const stage = row.stages[0] as unknown as Record<string, unknown>;
    assert.ok(typeof stage["url"] === "string" && (stage["url"] as string).endsWith("stitch_video_0.mp4"));
    assert.ok(!row.artifacts.some((a: string) => a.endsWith("film_video_mux.mp4")));
  });

  it("a failed concat keeps the stitch (loud, never a fake film)", async () => {
    if (!ffmpegOk) { console.warn("runs-registry.spec: ffmpeg absent — film arm skipped"); return; }
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, runDir) => {
      assert.ok(mkMp4(runDir, "stitch_video_0.mp4", "1"));
      writeFileSync(join(runDir, "window1_video_0.mp4"), "not an mp4");
      writeFileSync(join(runDir, "window2_video_0.mp4"), "not an mp4");
      return { stages: { s: { outputs: {}, artifacts: [
        "stitch_video_0.mp4", "window1_video_0.mp4", "window2_video_0.mp4",
      ] } }, promptId: "p" };
    };
    const ans = await s.svc.start(wfBody(), sig());
    const row = await settleWait(s, ans.run_id);
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

  it("missing stage rows default (the empty harvest completes)", async () => {
    const s = seat();
    const engine = engineSeat(s);
    engine.onFlow = async (_rows, _dir, _inputs, _initials, opts) => {
      assert.equal(opts.shouldStop?.(), false);
      return { stages: {}, promptId: "p" };
    };
    const row = await settleWait(s, (await s.svc.start(wfBody(), sig())).run_id);
    assert.equal(row.status, "completed");
    assert.deepEqual(row.artifacts, []);
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
    engine.onFlow = () => new Promise((res) => void (release = res));
    const ans = await s.svc.start(wfBody(), sig());
    await waitRunning(s, ans.run_id);
    assert.deepEqual(await s.svc.stop(ans.run_id, sig()), {
      run_id: ans.run_id,
      status: "stopping",
    });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(engine.stops.length, 1);
    release({ stages: {}, promptId: "p" });
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
});
