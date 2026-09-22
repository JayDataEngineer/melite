// runs-registry-doors.spec.ts — the runs seat, list, validate, status + stop: split from runs-registry.spec.ts
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
    // the card-aware resolve voice (2026-10-08): the decls table
    // answers whether a refused mid is a CARD (empty here — the
    // ghost stays a catalog miss).
    cardDecls: (): unknown => ({}),
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
    assert.match(unknown.message, /no flow named ghost in the registry/);
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
    // §23 NAME-THE-ROOT: the miss names the tree it searched (a
    // two-roots box stays debuggable — the operator sees WHICH root
    // answered, never a bare unknown)
    const miss = await remote(() => s.svc.status("run-x", sig()));
    assert.ok(miss.message.includes('(searched ' + s.state + ')'), miss.message);
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

  it("THE DISK FALLBACK (agent-debt F-5): a run unknown to memory answers from its on-disk _flow.json, marked from_disk — never fabricated", async () => {
    // The maker-test lane: status answered runs/unknown-run (or
    // "? — 0/0 stage(s)" husks) for runs whose _flow.json on disk
    // held status completed + full rows. The live map is the queue's
    // cache; the run tree is the durable record.
    const s = seat();
    const runId = "run-f5disk123456-00000001";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      run_id: runId, status: "completed", draft_id: "d1",
      stages: [{ id: "s1", status: "completed" }],
      skipped_stages: [], artifacts: ["run.png"], error: "",
    }));
    const got = await s.svc.status(runId, sig());
    assert.equal(got["status"], "completed");
    assert.equal(got["from_disk"], true);
    assert.deepEqual(got["stages"], [{ id: "s1", status: "completed" }]);
    assert.deepEqual(got["artifacts"], ["run.png"]);
  });

  it("a terminal husk in memory defers to a richer disk row; a queued-empty row stays live; unknown with no disk still refuses", async () => {
    const s = seat();
    // THE HUSK: completed in memory yet zero stages + zero artifacts
    // — the queue settled before the executor's rows landed. Disk
    // holds the rich row; status serves it (marked).
    const huskId = "run-f5husk123456-00000002";
    const dir = join(s.state, "output", huskId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      run_id: huskId, status: "completed", draft_id: "d1",
      stages: [{ id: "s1", status: "completed" }], skipped_stages: [],
      artifacts: ["film.mp4"], error: "",
    }));
    live(s, { runId: huskId, status: "completed", dir } as Partial<RunRecord>);
    const got = await s.svc.status(huskId, sig());
    assert.equal(got["from_disk"], true);
    assert.equal((got["stages"] as unknown[]).length, 1);

    // A genuinely-empty QUEUED row is legitimate (nothing yet) — stays live.
    const q = live(s, { runId: "run-f5queued1234-00000003" } as Partial<RunRecord>);
    const liveAns = await s.svc.status(q, sig());
    assert.equal(liveAns["from_disk"], undefined);
    assert.equal(liveAns["status"], "queued");

    // Unknown + no disk row → the door's refusal, unchanged.
    assert.equal((await remote(() => s.svc.status("run-f5none123456-00000004", sig()))).code, "runs/unknown-run");
  });

  it("THE LIVE-ROW PLAN (efficiency Fix 2): a queued/running row with no stage rows projects its registered plan + card + age — never a bare 0/0", async () => {
    const s = seat();
    const q = live(s, {
      runId: "run-f2plan123456-00000005",
      status: "running",
      cardId: "h3-timeline",
      pipeline: "h3",
      createdAt: Date.now() / 1000 - 100,
      graphRows: [{
        id: "h3-film", type: "comfyui", input_from: [], input_names: {},
        outputs: {}, params: { workflow: { fat: "50KB of prompt JSON must never ride status" } },
      }],
    } as Partial<RunRecord>);
    const got = await s.svc.status(q, sig());
    assert.equal(got["status"], "running");
    assert.equal(got["from_disk"], undefined);
    assert.deepEqual(got["planned_stages"], [{ id: "h3-film", engine: "comfyui" }]);
    assert.equal(got["card"], "h3-timeline");
    assert.ok(typeof got["run_age_s"] === "number" && (got["run_age_s"] as number) >= 90);
    // a row WITH stage rows carries no plan (the stages are the truth)
    const w = live(s, {
      runId: "run-f2staged12345-00000006",
      status: "running",
      stages: [{ id: "s1", status: "running" }],
    } as Partial<RunRecord>);
    const staged = await s.svc.status(w, sig());
    assert.equal(staged["planned_stages"], undefined);
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
