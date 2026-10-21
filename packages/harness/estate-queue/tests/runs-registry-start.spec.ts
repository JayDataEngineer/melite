// runs-registry-start.spec.ts — the runs seat, start envelope/inline/flow/model arms: split from runs-registry.spec.ts
// (pure move — zero test-content change; the queue core is real,
// the card registry rides a structural fake).
import { describe, it, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { FlowResult, MergeRow, EngineJson } from "@melite/comfyui-cordis";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { DECL as FIT_DECL } from "../../../models/fit/src/index.ts";
import { DECL as SKIN_DECL } from "../../../models/skin/src/index.ts";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { EnginesService } from "@melite/engine-contract";
import type { EngineRef } from "@melite/engine-contract";
import { QueueCore } from "../src/queue.ts";
import { CardArmError } from "../src/cardsRegistry.ts";
import type { RunRecord } from "../src/runsTypes.ts";
import { FlowsSeatService, linkedStage, plainStage } from "../src/flowsData.ts";

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

/** The models seat as a real cordis Service: ctx.get resolves only
 *  injector-registered services, so the fake must mount the same
 *  way the lane's real ModelsService does. Serves the three DECLs
 *  the character flow's hops compose from. */
class ModelsSeatFake extends Service {
  constructor(ctx: Context) {
    super(ctx, "models");
  }
  allDecls(): unknown[] {
    return [ANNY_DECL, FIT_DECL, SKIN_DECL];
  }
}

const seat = (cardOver: Record<string, (...args: never[]) => unknown> = {}): Seat => {
  const state = tmp();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  // THE FAMILIES SEAT (the atom vocabulary, stroke 4): the start
  // arm composes the character flow's hops (anny body, skin coat,
  // fit seat) from the context's models service. The fake rides a
  // real cordis Service — the door reads the seat through ctx.get,
  // which resolves only injector-registered services, never a
  // hand-set property. It serves the real DECLs, mirroring the
  // door's seat.
  new ModelsSeatFake(ctx);
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

  it("an inline dead source refuses before registration", async () => {
    const s = seat();
    const dead = "/melite-media/runs/run-aaaa1111-bb22cc33/edit/gone.png";
    const err = await remote(() => s.svc.start(inlineBody({
      flow_inline: {
        id: "x",
        stages: [{
          id: "s",
          engine: "comfyui",
          params: { workflow: { n: { class_type: "LoadImage", inputs: { image: dead } } } },
        }],
      },
    }), sig()));
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /gone\.png/);
    assert.equal(s.core.runs.size, 0);
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
            engineRef: "seat-prompt-1" as EngineRef,
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

  it("THE TEST CARRIAGE (journey F-1c follow-up): start({test:true}) carries the flag to the row, and the row's dir root names test-output/", async () => {
    // The gap-between-walls the F-1c journey audit named: the walker
    // resolves testFlag (wall-judged) and the door forwards it — but
    // NO judge covered the carriage edge walker→row (:1486/:1892) or
    // the row→dir derivation the registry itself rides at artifact/
    // sidecar faces (outRootFor(stateRoot, run.testFlag)). The law:
    // a test-flagged press registers with row.testFlag true and the
    // dir root is <state>/test-output/; an unflagged press stays
    // output/ (the false-side control).
    const s = seat();
    const on = await s.svc.start(inlineBody({ test: true }), sig());
    const onRow = await settleWait(s, on.run_id);
    assert.equal(onRow.testFlag, true, "the walker's true flag never reached the row — the carriage edge (:1486/:1892) dropped it");
    const { outRootFor } = await import("../src/queue.ts");
    const stateRoot = (s.svc as unknown as { ctx: { queue: { stateRoot: string } } }).ctx.queue.stateRoot;
    assert.match(
      outRootFor(stateRoot, onRow.testFlag),
      /test-output$/,
      "a test-flagged row's dir root is not test-output — the flag resolved but the row's artifacts would land beside real runs",
    );
    const off = await s.svc.start(inlineBody(), sig());
    const offRow = await settleWait(s, off.run_id);
    assert.equal(offRow.testFlag, false);
    assert.match(
      outRootFor(stateRoot, offRow.testFlag),
      /output$/,
      "the unflagged control must stay under plain output/",
    );
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
    assert.match(unknown.message, /no flow named ghost in the registry/);
    const bad = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, flow: "anny-hmr-estimator", photo: "/nonexistent.png" },
        sig(),
      ),
    );
    assert.match(bad.message, /photo/);
    assert.equal(s.core.runs.size, 0);
  });

  it("a dangling from_flow link refuses at start with the door's voice (F4, never 500-class)", async () => {
    // The start door's twin of the validate F4 wall: the same
    // drop-in link refuses invalid-request with the expansion's
    // own text, and the refused press never enqueues.
    const s = seat();
    const flows = (s.svc as unknown as { ctx: Context }).ctx.get("meliteFlows") as FlowsSeatService;
    flows.register({
      id: "dangle-probe",
      description: "the F4 probe",
      stages: [linkedStage("ghost-flow", "ghost-stage", "hop", {})],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    });
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "dangle-probe" }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /links unknown flow ghost-flow/);
    assert.equal(s.core.runs.size, 0);
  });

  it("a flow whose REQUIRED initial is absent refuses at the door, by name", async () => {
    // fit-seat carries the required bone initial (the retired
    // character row linked the same verb): the door refuses here —
    // before any run registers — so the lowest level that can
    // answer answers.
    const s = seat();
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "fit-seat" }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /"bone" is REQUIRED by the "fit-seat" flow/);
  });

  it("THE F5 STAMP: the row carries the FILE-kind initial keys, never text or bake_params", async () => {
    // The claim-time re-probe's contract starts here: the door
    // derives the file-key subset from the declaration's kinds and
    // stamps it beside initials — the pump re-judges exactly those
    // keys on disk, so a text bone or a params_json object is
    // never held to an existence gate it was never promised.
    const s = seat();
    const flows = (s.svc as unknown as { ctx: Context }).ctx.get("meliteFlows") as FlowsSeatService;
    flows.register({
      id: "f5-stamp-probe",
      description: "the F5 stamp probe",
      stages: [plainStage({
        id: "estimate",
        engine: "comfyui",
        family: "anny",
        action: "estimate_photo",
        description: "the estimate",
        inputs: { photo: { initial: "photo" } },
        expected: { photo: "image" },
        params: { photo: "$photo" },
      })],
      initialValidators: { photo: "photo", mesh: "glb", bone: "text", bake: "bake_params" },
      tool: null,
      skillRefs: [],
    });
    mkdirSync(join(s.state, "output", "probe"), { recursive: true });
    writeFileSync(join(s.state, "output", "probe", "in.png"), "png");
    writeFileSync(join(s.state, "mesh.glb"), "glb");
    const ans = await s.svc.start(
      {
        draft_id: "d1",
        test: false,
        flow: "f5-stamp-probe",
        photo: "/melite-media/runs/probe/in.png",
        mesh: { path: join(s.state, "mesh.glb") },
        bone: "spine",
        bake: { dialect: "authored", phenotype: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.2] },
      },
      sig(),
    );
    assert.equal(ans.status, "queued");
    const row = s.core.runs.get(ans.run_id) as RunRecord;
    assert.deepEqual(row.initialFileKeys, ["photo", "mesh"]);
    assert.deepEqual(row.initials, {
      photo: "/melite-media/runs/probe/in.png",
      mesh: join(s.state, "mesh.glb"),
      bone: "spine",
      bake: "{\"dialect\":\"authored\",\"phenotype\":[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,0.2]}",
    });
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
  it("a dead source in a composed card refuses before registration", async () => {
    const dead = "/melite-media/runs/run-aaaa1111-bb22cc33/edit/gone.png";
    const s = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => ({
        graph: { n: { class_type: "LoadImage", inputs: { image: dead } } },
        outputNodes: {},
      }),
    });
    const err = await remote(() => s.svc.start({ draft_id: "d1", test: false, model: "m" }, sig()));
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /gone\.png/);
    assert.equal(s.core.runs.size, 0);
  });

  it("a model key with a NULLISH value rides the empty-mid coerce", async () => {
    // String(undefined ?? "") — the door's model-less card body:
    // phase-1 still probes with the coerced "" mid (a refusal
    // voice names it, never a crash on the coerce itself)
    const s = seat({
      phase1Card: async (): Promise<unknown> => {
        throw new CardArmError(400, "no model unit for model: ", "invalid_request");
      },
    });
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, model: undefined }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /no model unit/);
  });

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

  it("an illegal flow name is ADMITTED before presence, in one voice (start + validate)", async () => {
    // The door's own order (the {model} arm's precedent): a value
    // that cannot be a flow id is a shape failure, refused as such.
    // The registry lookup used to answer first, so `flow: 5` read
    // "no flow named  in the registry" — the offending value named
    // nowhere.
    const s = seat();
    for (const flow of [5, "Image-Upscale", ""]) {
      const err = await remote(() =>
        s.svc.start({ draft_id: "d1", test: false, flow }, sig()),
      );
      assert.equal(err.code, "runs/invalid-request");
      // The refusal NAMES what the caller sent. Naming the coerced
      // "" instead was half the original defect: the operator who
      // sent `flow: 42` learned nothing from the message.
      assert.match(err.message, new RegExp("flow id " + JSON.stringify(flow).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " is not a legal identifier"));
      const verr = await remote(() => s.svc.validate({ flow }, sig()));
      assert.equal(verr.code, "runs/invalid-request");
      assert.equal(
        verr.message,
        err.message,
        "start and validate speak the same refusal for the same value",
      );
    }
    // A legal-but-unregistered name still gets the PRESENCE voice.
    const unknown = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "ghost" }, sig()),
    );
    assert.match(unknown.message, /no flow named ghost in the registry/);
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

// THE RAW flow_inline CARD COMPOSE (the warm-1 unported refusal cure,
// 2026-10-21): a caller-submitted inline doc carrying card= stages met
// "card= stages are unported on this gateway" while the bench and
// named-flow doors composed the SAME stages through the card walk. The
// raw door now rides composeRegistryFlowStages too — one execution
// path, no second answering of the card plane's laws. Every arm here
// fires red with the compose block toggled out (the unported voice
// returns).
describe("start raw flow_inline card compose", () => {
  const p1 = {
    mid: "m",
    fam: "f",
    card: "c",
    skeleton: "sk",
    decl: {},
    params: {},
    spell: null,
  };
  const cardDoc = (stages: unknown[]): Record<string, unknown> => ({
    draft_id: "d1",
    test: false,
    flow_inline: { id: "x", stages },
  });

  it("a card= stage composes through the card plane and registers (never the unported voice)", async () => {
    const s = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => ({
        graph: { n: { class_type: "EmptyLatentImage", inputs: { width: 64, height: 64 } } },
        outputNodes: { out: "n" },
        outputs: { out: "image" },
      }),
    });
    const ans = await s.svc.start(cardDoc([{ id: "s0", card: "c", params: {} }]), sig());
    assert.match(String(ans.run_id), /^run-/, "the run registers");
    assert.equal(s.core.runs.size, 1);
    const row = (await settleWait(s, String(ans.run_id))) as RunRecord;
    // the compiled stage's params ride the run row (registration
    // order), the stage row itself stays schema-clean
    const wf = (row.params[0] as Record<string, unknown>)["workflow"] as Record<string, unknown>;
    assert.equal(
      (wf["n"] as Record<string, unknown>)["class_type"],
      "EmptyLatentImage",
      "the run carries the COMPOSED graph, not the card= row",
    );
    assert.ok(!("card" in (row.stages[0] as Record<string, unknown>)), "the card reference is consumed by the compose");
  });

  it("the card plane's own gates keep their voice — a compose refusal names the flow stage, never the unported boundary", async () => {
    const s = seat({
      phase1Card: async (): Promise<unknown> => {
        throw new CardArmError(400, "p1 bad param", "card_compose", "params.seed", "int", "str");
      },
    });
    const err = await remote(() =>
      s.svc.start(cardDoc([{ id: "s0", card: "c", params: {} }]), sig()));
    assert.equal(err.code, "runs/card-compose", "the card plane's own code");
    assert.match(err.message, /flow stage "s0"/, "the refusal names the flow stage");
    assert.doesNotMatch(err.message, /unported/, "never the old boundary voice");
    assert.equal(s.core.runs.size, 0, "nothing registered on a refusal");
  });

  it("the compose does not widen the scope law — a raw MULTI-stage card doc still refuses the preview scope", async () => {
    const s = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => ({
        graph: { n: { class_type: "EmptyLatentImage", inputs: { width: 64, height: 64 } } },
        outputNodes: { out: "n" },
        outputs: { out: "image" },
      }),
    });
    const err = await remote(() =>
      s.svc.start(cardDoc([
        { id: "s0", card: "c", params: {} },
        { id: "s1", card: "c", params: {} },
      ]), sig()));
    assert.equal(err.code, "runs/preview-scope");
    assert.match(err.message, /single-stage/, "the multi-stage policy stands");
    assert.equal(s.core.runs.size, 0);
  });

  it("the claim and receipt ledgers ride the registered row — stageFams + graph receipt stages for the composed card", async () => {
    const s = seat({
      phase1Card: async (): Promise<unknown> => p1,
      phase2Card: async (): Promise<unknown> => ({
        graph: { n: { class_type: "EmptyLatentImage", inputs: { width: 64, height: 64 } } },
        outputNodes: { out: "n" },
        outputs: { out: "image" },
      }),
    });
    const ans = await s.svc.start(cardDoc([{ id: "s0", card: "c", params: {} }]), sig());
    const row = (await settleWait(s, String(ans.run_id))) as RunRecord & {
      stageFams?: Record<string, string>;
      graphReceipt?: { stages?: Record<string, unknown> };
    };
    assert.deepEqual(row.stageFams, { s0: "f" }, "the claim-time re-probe ledger rides the row");
    const receiptRow = row.graphReceipt?.stages?.[0] as Record<string, unknown> | undefined;
    assert.ok(
      row.graphReceipt !== undefined && receiptRow !== undefined &&
      receiptRow["stage"] === "s0",
      "the graph-receipt ledger carries the composed stage's evidence row (registration order)",
    );
  });
});
