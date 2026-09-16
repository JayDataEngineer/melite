// runs-registry.spec.ts — the runs seat: the envelope walk, the
// start arms (inline registers + the pump settles failed without an
// engine seat; model/flow refuse or compose through fakes), list,
// validate, status/stop. The card registry rides a structural fake
// (its real-data voice is cards-registry.spec.ts's); the queue core
// is real.
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
import { planResurrect, buildRebuiltRun } from "../src/queue.ts";
import type { RebuiltRun } from "../src/queue.ts";
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

describe("start envelope", () => {
  it("aborts before the walk; refusals keep the door's codes", async () => {
    const s = seat();
    await assert.rejects(s.svc.start(["x"], dead()));
    assert.equal((await remote(() => s.svc.start(["x"], sig()))).code, "runs/bad-envelope");
    assert.equal((await remote(() => s.svc.start({ test: "yes" }, sig()))).code, "runs/bad-envelope");
    // ONE LAW with checkFlowsStartEnvelope: absent/null test means
    // false (live lane receipt 2026-09-12 — a chat tool's test:null
    // start doc must never refuse bad-test).
    assert.equal((await remote(() => s.svc.start({}, sig()))).code, "runs/draft-required");
    assert.equal((await remote(() => s.svc.start({ test: null, draft_id: "ghost" }, sig()))).code, "runs/draft-unknown");
    assert.equal((await remote(() => s.svc.start({ test: false }, sig()))).code, "runs/draft-required");
    assert.equal((await remote(() => s.svc.start({ test: false, draft_id: "bad id!" }, sig()))).code, "runs/draft-malformed");
    assert.equal((await remote(() => s.svc.start({ test: false, draft_id: "ghost" }, sig()))).code, "runs/draft-unknown");
    await assert.rejects(
      s.svc.start({ test: false, draft_id: "boom" }, sig()),
      /transport down/,
    );
    assert.equal(
      (await remote(() => s.svc.start({ ...inlineBody(), start_from: 1 }, sig()))).code,
      "runs/invalid-request",
    );
    assert.equal(
      (await remote(() => s.svc.start({ draft_id: "d1", test: false, flow: "a", model: "b" }, sig()))).code,
      "runs/invalid-request",
    );
    assert.equal(
      (await remote(() => s.svc.start({ draft_id: "d1", test: false }, sig()))).code,
      "runs/invalid-request",
    );
  });
});

describe("start inline arm", () => {
  it("compile refusals fold; multi-stage refuses the preview scope", async () => {
    const s = seat();
    assert.equal(
      (await remote(() => s.svc.start(inlineBody({ flow_inline: { id: "x" } }), sig()))).code,
      "runs/invalid-request",
    );
    const two = {
      id: "x",
      stages: [
        { id: "a", engine: "comfyui" },
        { id: "b", engine: "comfyui" },
      ],
    };
    const err = await remote(() => s.svc.start(inlineBody({ flow_inline: two }), sig()));
    assert.equal(err.code, "runs/preview-scope");
    assert.match(err.message, /single-stage/);
  });

  it("runEngine: pre-seam rows (no engine stamp) read comfyui; stamped rows read their engine", async () => {
    const preSeam = { stages: [{ id: "s", name: "s", index: 0, status: "pending", outputs: {}, expected: {} }] } as unknown as RunRecord;
    const stamped = { stages: [{ id: "s", name: "s", index: 0, status: "pending", engine: "mcp:blender", outputs: {}, expected: {} }] } as unknown as RunRecord;
    const empty = { stages: [{ id: "s", name: "s", index: 0, status: "pending", engine: "", outputs: {}, expected: {} }] } as unknown as RunRecord;
    const read = (r: RunRecord): string =>
      (RunsRuntimeService as unknown as { runEngine(x: RunRecord): string }).runEngine(r);
    assert.equal(read(preSeam), "comfyui");
    assert.equal(read(stamped), "mcp:blender");
    assert.equal(read(empty), "comfyui");
  });

  it("THE ENGINE SEAT DISPATCH (stroke 53): a mounted engines seat routes the run through its executor", async () => {
    const s = seat();
    // The engines seat + a fake executor registered as 'comfyui'.
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    const engines = new EnginesService(ctx);
    const seen: {
      rows: { stageId: string; params: Record<string, EngineJson> }[];
      runDir: string;
      reported: Record<string, unknown>[];
    } = { rows: [], runDir: "", reported: [] };
    engines.register("comfyui", {
      executor: {
        executeStages: async (rows, runDir, _inputNames, options) => {
          seen.rows = rows.map((r) => ({ stageId: r.stageId, params: r.params as Record<string, EngineJson> }));
          seen.runDir = runDir;
          options.report({ activity: "seat tap alive" });
          return {
            stages: [
              { stageId: "s", outputs: { default: "img.png" }, artifacts: ["img.png"] },
            ],
            engineRef: "seat-prompt-1",
          };
        },
      },
    });
    const ans = await s.svc.start(inlineBody(), sig());
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "completed");
    // Generic rows: params UNSPLICED (the executor owns graph
    // surgery), the stage id carried, the run dir threaded.
    assert.equal(seen.rows.length, 1);
    assert.equal(seen.rows[0]?.stageId, "s");
    assert.deepEqual(seen.rows[0]?.params, {}, "params ride verbatim (unspliced — this inline stage carries none)");
    assert.ok(seen.runDir.includes(ans.run_id));
    // The harvest: artifacts + outputs land on the stage row, the
    // tap's activity fold wrote through before completion cleared it.
    const stage = row.stages[0] as Record<string, unknown>;
    assert.equal(stage["status"], "completed");
    assert.equal(stage["url"], "img.png");
    assert.deepEqual(row.artifacts, ["img.png"]);
  });

  it("a valid run registers, queues at 0, and the pump settles it failed (no engine seat)", async () => {
    const s = seat();
    const ans = await s.svc.start(inlineBody(), sig());
    assert.match(ans.run_id, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.equal(ans.status, "queued");
    assert.equal(ans.queue_position, 0);
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.status, "failed");
    assert.ok(row.error.length > 0);
    const got = await s.svc.status(ans.run_id, sig());
    assert.equal(got["status"], "failed");
    assert.equal(got["draft_id"], "d1");
  });

  it("concurrent starts both queue (the reentrancy guard holds the pump)", async () => {
    const s = seat();
    const [a, b] = await Promise.all([s.svc.start(inlineBody(), sig()), s.svc.start(inlineBody(), sig())]);
    assert.notEqual(a.run_id, b.run_id);
    await settleWait(s, a.run_id);
    await settleWait(s, b.run_id);
  });

  it("a dying bench read stamps nothing (the run still registers — the snapshot is best-effort)", async () => {
    const s = seat();
    // the transport dies BETWEEN the envelope probe and the bench
    // snapshot read: the probe passes, the snapshot read throws, the
    // run registers with no bench stamp (never a refusal, never a
    // zombie slot).
    let calls = 0;
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (id: string): Promise<unknown> => {
        calls += 1;
        if (id === "d1" && calls === 1) return { stages: [{ id: "s" }], intent: "i" };
        throw new Error("transport died mid-submit");
      },
    };
    const ans = await s.svc.start(inlineBody(), sig());
    assert.equal(ans.status, "queued");
    const row = await settleWait(s, ans.run_id);
    assert.equal(row.benchSnapshot, undefined);
    assert.ok(calls >= 2, "the probe passed and the snapshot read died");
  });
});

describe("start flow arm", () => {
  it("unknown names and bad initials refuse before any registration", async () => {
    const s = seat();
    const unknown = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "ghost" }, sig()),
    );
    assert.equal(unknown.code, "runs/invalid-request");
    assert.match(unknown.message, /no flow at flows\/ghost\/flow\.py/);
    const bad = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, flow: "character", starter_image: "/nonexistent.png" },
        sig(),
      ),
    );
    assert.match(bad.message, /starter_image/);
    assert.equal(s.core.runs.size, 0);
  });

  it("the character shim compiles to the skip_when preview scope", async () => {
    const s = seat();
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "character" }, sig()),
    );
    assert.equal(err.code, "runs/preview-scope");
    assert.match(err.message, /skip_when/);
  });
});

describe("start model arm", () => {
  const p1 = {
    mid: "m",
    fam: "f",
    card: "c",
    skeleton: "sk",
    decl: {},
    params: {},
    spell: null,
  };
  it("phase-1 compose failures refuse (mapped and unmapped); transports rethrow", async () => {
    const mapped = seat({
      phase1Card: async (): Promise<unknown> => {
        throw new CardArmError(400, "p1 bad param", "card_compose", "params.seed", "int", "str");
      },
    });
    const err = await remote(() =>
      mapped.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()),
    );
    assert.equal(err.code, "runs/card-compose");
    assert.match(err.message, /p1 bad param/);
    assert.equal((err.details as { loc?: string }).loc, "params.seed");
    assert.equal((err.details as { expected?: string }).expected, "int");
    assert.equal((err.details as { got?: string }).got, "str");
    assert.equal(mapped.core.runs.size, 0);

    const weird = seat({
      phase1Card: async (): Promise<unknown> => {
        throw new CardArmError(400, "weird", "weird-code");
      },
    });
    await assert.rejects(
      weird.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()),
      /unmapped refusal code weird-code/,
    );
    const loud = seat({
      phase1Card: async (): Promise<unknown> => {
        throw new Error("engine exploded");
      },
    });
    await assert.rejects(
      loud.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()),
      /engine exploded/,
    );
  });

  it("phase-2 transports rethrow past the CardArmError gate", async () => {
    const loud = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => {
        throw new Error("phase2 exploded");
      },
    });
    await assert.rejects(
      loud.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()),
      /phase2 exploded/,
    );
  });

  it("non-string flow names miss the registry (start + validate)", async () => {
    const s = seat();
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: 5 }, sig()),
    );
    assert.match(err.message, /no flow at flows\/\/flow\.py/);
    const verr = await remote(() => s.svc.validate({ flow: 5 }, sig()));
    assert.match(verr.message, /no flow at flows\/\/flow\.py/);
  });

  it("phase-2 compose failures refuse; success registers the card door and settles", async () => {
    const fail = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => {
        throw new CardArmError(400, "p2 bad", "card_compose");
      },
    });
    assert.equal(
      (await remote(() => fail.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()))).code,
      "runs/card-compose",
    );
    assert.equal(fail.core.runs.size, 0);

    const ok = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => ({ graph: {} }),
    });
    const ans = await ok.svc.start({ draft_id: "d1", test: false, model: "m" }, sig());
    assert.equal(ans.status, "queued");
    const row = (await settleWait(ok, ans.run_id)) as RunRecord & { cardId?: string };
    assert.equal(row.cardId, "c");
    assert.equal(row.pipeline, "m");
  });
});

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

describe("list", () => {
  it("ghost drafts ride the probe's false road (never a loud list)", async () => {
    const s = seat();
    mkdirSync(join(s.state, "output", "run-ghost"), { recursive: true });
    writeFileSync(
      join(s.state, "output", "run-ghost", "_flow.json"),
      JSON.stringify({ status: "completed", draft_id: "ghost", pipeline: "flow_inline" }),
    );
    const listed = await s.svc.list("10", sig());
    assert.equal(listed.count, 1);
    assert.equal(listed.runs.length, 1);
  });

  it("aborts, refuses junk limits (py int rides), and serves the roots", async () => {
    const s = seat();
    await assert.rejects(s.svc.list("10", dead()));
    assert.equal((await remote(() => s.svc.list("x", sig()))).code, "runs/invalid-request");
    const ans = await s.svc.start(inlineBody(), sig());
    await settleWait(s, ans.run_id);
    const listed = await s.svc.list("1_0", sig());
    assert.equal(listed.count, 1);
    assert.equal((listed.runs[0] as Record<string, unknown>)["run_id"], ans.run_id);
  });
});

describe("validate", () => {
  it("aborts; the inline arm serves 200 verbatim and folds compile refusals", async () => {
    const s = seat();
    await assert.rejects(s.svc.validate({}, dead()));
    const good = await s.svc.validate(inlineBody()["flow_inline"], sig());
    assert.equal((good as { status?: unknown })["ok"] ?? true, true);
    const bad = await remote(() => s.svc.validate({ nope: 1 }, sig()));
    assert.equal(bad.code, "runs/flow-compile");
  });

  it("card= stages compile through the seat's registry (the cardGate wire)", async () => {
    // THE NAMED-DEBT PIN (2026-09-13): the validate arm passed null
    // into the inline compile — every card= stage refused with the
    // LOUD miswire ("no CardRegistryService for cardGate") while the
    // same stage ran fine at start. The arm now threads the seat's
    // ctx.cardRegistry; a registered card validates, a ghost keeps
    // the door's registry voice.
    const defs = new Map([
      ["c", { requiresModel: false, schema: (p: unknown): unknown => p }],
    ]);
    const s = seat({ defsSync: (): unknown => defs });
    const ok = await s.svc.validate(
      inlineBody({ flow_inline: { id: "x", stages: [{ id: "s", card: "c", engine: "comfyui", params: {} }] } }),
      sig(),
    );
    assert.equal((ok as { status?: unknown })["ok"] ?? true, true);
    const ghost = await remote(() =>
      s.svc.validate(
        inlineBody({ flow_inline: { id: "x", stages: [{ id: "s", card: "ghost", engine: "comfyui", params: { model: "m" } }] } }),
        sig(),
      ),
    );
    assert.equal(ghost.code, "runs/flow-compile");
    assert.match(ghost.message, /not a registered card/);
  });

  it("the flow shim keeps the door's voice (unknown names, pin sweep)", async () => {
    const s = seat();
    const unknown = await remote(() =>
      s.svc.validate({ flow: "ghost" }, sig()),
    );
    assert.equal(unknown.code, "runs/invalid-request");
    assert.match(unknown.message, /no flow at flows\/ghost/);
    const pinned = await remote(() => s.svc.validate({ flow: "character" }, sig()));
    assert.equal(pinned.code, "runs/workflow-pin");
    const bad = await remote(() =>
      s.svc.validate({ flow: "character", starter_image: "/nonexistent.png" }, sig()),
    );
    assert.match(bad.message, /starter_image/);
  });

  it("the model arm walks strict, doors, dangling, id, resolve", async () => {
    const s = seat();
    const strict = await remote(() =>
      s.svc.validate({ model: "m", start_from: 1 }, sig()),
    );
    assert.equal(strict.code, "runs/invalid-request");
    const amb = await remote(() =>
      s.svc.validate({ model: "m", flow: "character" }, sig()),
    );
    assert.match(amb.message, /ambiguous/);
    const dang = await remote(() =>
      s.svc.validate({ model: "m", params: { p: "/v1/assets/runs/run-x/f.png" } }, sig()),
    );
    assert.match(dang.message, /dangling artifact ref/);
    const badId = await remote(() => s.svc.validate({ model: "bad id!" }, sig()));
    assert.match(badId.message, /not a legal identifier/);
    // facts absent: the catalog alone answers (ghost resolves nowhere).
    const ghost = await remote(() => s.svc.validate({ model: "ghost-model" }, sig()));
    assert.match(ghost.message, /no model unit/);
  });

  it("resolve hits compose (refusals, 200, unmapped codes stay LOUD)", async () => {
    const base = {
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      overlayCardParams: async (): Promise<unknown> => ({ fam: "m1", card: "c", params: {} }),
    };
    const refused = seat({
      ...base,
      composeValidateCard: async (): Promise<unknown> => ({ message: "bad seed", code: "card_compose" }),
    });
    const err = await remote(() => refused.svc.validate({ model: "m1" }, sig()));
    assert.equal(err.code, "runs/card-compose");
    assert.match(err.message, /bad seed/);

    const ok = seat(base);
    const ans = (await ok.svc.validate({ model: "m1" }, sig())) as Record<string, unknown>;
    assert.deepEqual(Object.keys(ans), ["ok", "model", "card", "cost"]);
    assert.equal(ans["model"], "m1");

    const weird = seat({
      ...base,
      composeValidateCard: async (): Promise<unknown> => ({ message: "x", code: "weird" }),
    });
    await assert.rejects(weird.svc.validate({ model: "m1" }, sig()), /unmapped answer code weird/);

    // the non-cordis arm (resolves via mids, family row absent).
    const outside = seat({ modelMids: (): unknown => new Set(["ghost-model"]) });
    const out = await remote(() => outside.svc.validate({ model: "ghost-model" }, sig()));
    assert.equal(out.code, "runs/card-compose");
    assert.match(out.message, /outside the cordis plane/);
  });

  it("overlay failures fold CardArmErrors and rethrow the rest", async () => {
    const arm = seat({
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      overlayCardParams: async (): Promise<unknown> => {
        throw new CardArmError(400, "overlay bad", "card_compose");
      },
    });
    assert.equal(
      (await remote(() => arm.svc.validate({ model: "m1" }, sig()))).code,
      "runs/card-compose",
    );
    const loud = seat({
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      overlayCardParams: async (): Promise<unknown> => {
        throw new Error("overlay exploded");
      },
    });
    await assert.rejects(loud.svc.validate({ model: "m1" }, sig()), /overlay exploded/);
  });
});

describe("status + stop", () => {
  const live = (s: Seat, over: Partial<RunRecord> = {}): string => {
    const row = {
      runId: "run-live",
      status: "queued",
      stages: [],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir: join(s.state, "output", "run-live"),
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [],
      ...over,
    } as RunRecord;
    (s.core.runs as Map<string, RunRecord>).set(row.runId, row);
    return row.runId;
  };
  it("aborts; unknowns throw the door's voice", async () => {
    const s = seat();
    await assert.rejects(s.svc.status("run-x", dead()));
    await assert.rejects(s.svc.stop("run-x", dead()));
    assert.equal((await remote(() => s.svc.status("run-x", sig()))).code, "runs/unknown-run");
    assert.equal((await remote(() => s.svc.stop("run-x", sig()))).code, "runs/run-unknown");
  });

  it("status serves the row (log tail rides along on request)", async () => {
    const s = seat();
    const id = live(s, { error: "bad", stages: [{ id: "s", status: "failed" }] });
    const got = await s.svc.status(id, sig());
    assert.equal(got["queue_position"], 0);
    assert.equal(got["draft_id"], "d1");
    const logged = await s.svc.status(id, sig(), true);
    assert.match(String(logged["log_tail"]), /run: queued/);
  });

  it("status rewrites absolute artifact paths to route-relative (never a leading /)", async () => {
    // Stroke-82 fix (e): the executor harvests ABSOLUTE disk paths
    // into run.artifacts — serving them raw hands the browser
    // strings the media route cannot answer (a leading-/ path rides
    // toRunMediaUrl verbatim). status() rewrites each absolute path
    // against the run's out root; bare relatives pass through.
    const s = seat();
    const runId = "run-abcdef123456-7890abcd";
    const dir = join(s.state, "output", runId);
    mkdirSync(join(dir, "stage"), { recursive: true });
    const absTop = join(dir, "o.png");
    const absNested = join(dir, "stage", "v.mp4");
    writeFileSync(absTop, "img");
    writeFileSync(absNested, "vid");
    (s.core.runs as Map<string, RunRecord>).set(runId, {
      runId,
      status: "completed",
      stages: [{ id: "s", name: "s", index: 0, status: "completed", outputs: {}, expected: {} }],
      skippedStages: [],
      artifacts: [absTop, absNested, "note.png"],
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
    } as RunRecord);
    const got = await s.svc.status(runId, sig());
    const arts = got["artifacts"] as string[];
    assert.equal(arts.length, 3);
    for (const a of arts) {
      assert.equal(typeof a, "string");
      assert.ok(a !== "", "no empty artifact rides the payload");
      assert.ok(!a.startsWith("/"), "route-relative, never absolute: " + a);
      assert.ok(!a.includes("/tmp"), "no disk root leaks: " + a);
    }
    // The strict branch: in-tree absolute paths rewrite under the run id.
    assert.match(arts[0] as string, /^run-[0-9a-f]+-[A-Za-z0-9_-]+\//);
    assert.ok((arts[1] as string).startsWith(runId + "/"), arts[1] as string);
    // The bare relative passes through verbatim.
    assert.equal(arts[2], "note.png");
  });

  it("stop flags live runs (no seat: the flag is the authority); terminal rows refuse", async () => {
    const s = seat();
    const id = live(s);
    const ans = await s.svc.stop(id, sig());
    assert.deepEqual(ans, { run_id: id, status: "stopping" });
    assert.equal((s.core.runs.get(id) as RunRecord).stopFlag, true);
    const done = live(s, { runId: "run-done", status: "completed" });
    assert.deepEqual(await s.svc.stop(done, sig()), {
      error: "cannot stop run in state completed",
    });
  });
});

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

// 2. Resurrect→pump joint: a canned queued pair on disk, through
// planResurrect/buildRebuiltRun, adapted into a live QueueCore,
// pumped with a FakeEngine aboard.
describe("stroke-82 resurrect→pump joint", () => {
  it("the canned pair revives through the pump to terminal statuses", async () => {
    // The on-disk shape resurrect expects (queue.spec's durable
    // shape): output/<id>/_flow.json queued + a parseable
    // _request.json.
    const canned = tmp();
    const put = (id: string, created: number): void => {
      const dir = join(canned, "output", id);
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
      writeFileSync(join(dir, "_request.json"), "{}");
    };
    put("run-aaa", 1);
    put("run-bbb", 2);
    const plan = planResurrect(canned, undefined, undefined, () => true);
    assert.deepEqual(plan.order, ["run-aaa", "run-bbb"]);
    assert.deepEqual(plan.orphans, []);
    const s = seat();
    engineSeat(s);
    for (const id of plan.order) {
      const rebuilt: RebuiltRun = buildRebuiltRun(canned, id);
      const dir = join(s.state, "output", rebuilt.runId);
      mkdirSync(dir, { recursive: true });
      const faces = (rebuilt.stages as Record<string, unknown>[]).map((st, i) => ({
        id: String(st["id"] ?? "s" + i),
        name: String(st["name"] ?? st["id"] ?? "s"),
        index: i,
        status: "pending",
        outputs: {},
        expected: {},
      }));
      s.core.enqueue({
        runId: rebuilt.runId,
        status: "queued",
        stages: faces,
        skippedStages: [],
        artifacts: [...rebuilt.artifacts],
        error: "",
        draftId: rebuilt.draftId,
        dir,
        testFlag: false,
        stopFlag: false,
        // THE JOINT'S GAP (current truth, pinned): the durable
        // sidecar stages are HOLLOW — no params/outputNodes survive
        // the record, and nothing replays _request.json back into
        // the row — so the pump's splice refuses and BOTH runs
        // settle failed (terminal). A params-rehydration seam would
        // turn these completed; it does not exist yet.
        params: faces.map(() => ({})),
        createdAt: 1,
        pipeline: "flow_inline",
        graphRows: [],
        outputNodes: faces.map(() => ({})),
      } as never);
    }
    // Kick the pump with a live trigger run (the pump moves on kick).
    const trig = await s.svc.start(wfBody82(), sig());
    const a = await settleWait(s, "run-aaa");
    const b = await settleWait(s, "run-bbb");
    assert.equal(a.status, "failed");
    assert.match(a.error, /no inline workflow/);
    assert.equal(b.status, "failed");
    assert.match(b.error, /no inline workflow/);
    assert.equal((await settleWait(s, trig.run_id)).status, "completed");
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
