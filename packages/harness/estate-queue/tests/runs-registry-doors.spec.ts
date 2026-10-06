// runs-registry-doors.spec.ts — the runs seat, list, validate, status + stop: split from runs-registry.spec.ts
// (pure move — zero test-content change; the queue core is real,
// the card registry rides a structural fake).
import { describe, it, afterEach, beforeEach, vi } from "vitest";
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
import { RunsRuntimeService, benchWiring, withStageReports, sidecarReaderFor } from "../src/runsRegistry.ts";
import { EnginesService } from "@melite/engine-contract";
import { QueueCore } from "../src/queue.ts";
import { CardArmError } from "../src/cardsRegistry.ts";
import type { RunRecord, RunStageRow } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";

let TMP = "";
afterEach(async () => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) {
      // a run-seat writer can still be appending when the sweep
      // walks the tree (the battery's parallel load makes the
      // window real): ENOTEMPTY is a race, not a leak — one
      // retry after a tick, then the failure stands loud
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        await new Promise((r) => setTimeout(r, 50));
        rmSync(d, { recursive: true, force: true });
      }
    }
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

const seat = (
  cardOver: Record<string, (...args: never[]) => unknown> = {},
  d1Doc: Record<string, unknown> = {},
): Seat => {
  const state = tmp();
  const ctx = new Context();
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot: state };
  // THE FAMILIES SEAT (the atom vocabulary, stroke 4): the
  // character flow's body hop is a fromFlow link into the anny
  // family's estimate stage, so the flow shim's compose reads the
  // context's models service. The fake rides a real cordis Service
  // (ctx.get resolves only injector-registered services) and serves
  // the real anny/fit/skin DECLs (their declared actions), no
  // engine, no facts file.
  new ModelsSeatFake(ctx);
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return d1Doc;
      if (id === "boom") throw new Error("transport down");
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  const cards: Record<string, (...args: never[]) => unknown> = {
    // The validate arm now passes the seat's registry into the
    // inline compile (the cardGate wire, 2026-09-13): the pin
    // sweep reads objectInfo (null = the fail-open empty pin set,
    // the door's absent-pin degrade) and card= stages read
    // defsSync.
    //
    // CARD STAGES RIDE THESE FLOWS (the atom vocabulary, stroke 3 —
    // the flow-system stroke): the character flow's z-image stages,
    // garment stage, and rig hop (body-to-somax) are card= stages,
    // so the structural fake serves those cards and their family
    // rows. The fake stays structural — no engine, no facts file, no
    // compose.
    objectInfo: (): unknown => null,
    defsSync: (): unknown =>
      new Map([
        [
          "image-gen",
          {
            id: "image-gen",
            boarded: ["krea-2", "z-image", "anima", "qwen-img-21"],
            flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: true },
            // the card gate walks the card's own schema over the
            // stage params (the wire-coercion seat); the structural
            // fake admits the body verbatim — the real card's schema
            // is exercised by the card's own suite, not here
            schema: (v: unknown): unknown => v,
          },
        ],
        [
          "img-to-mesh",
          {
            id: "img-to-mesh",
            boarded: ["pixal3d", "trellis2-native"],
            flowKinds: { inputs: { input_image: "image" }, outputs: { default: "mesh" }, requiresModel: true },
            schema: (v: unknown): unknown => v,
          },
        ],
        [
          "rig",
          {
            id: "rig",
            boarded: [],
            // top-level requiresModel (the cardGate's read — pure-tool
            // cards skip the {model:} demand)
            requiresModel: false,
            flowKinds: { inputs: { mesh_glb: "mesh" }, outputs: { default: "mesh" }, requiresModel: false },
            schema: (v: unknown): unknown => v,
          },
        ],
      ]),
    modelFacts: (): unknown => ({
      "z-image": {
        id: "z-image",
        family: "z-image",
        card: "image-gen",
        defaults: {},
        lane_inputs: {},
        variants: [],
        variant_groups: [],
        outputs: [],
        mods: [],
      },
      pixal3d: {
        id: "pixal3d",
        family: "pixal3d",
        card: "img-to-mesh",
        defaults: {},
        lane_inputs: {},
        variants: [],
        variant_groups: [],
        outputs: [],
        mods: [],
      },
    }),
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    // the card-aware resolve voice (2026-10-08): the decls table
    // answers whether a refused mid is a CARD (empty here — the
    // ghost stays a catalog miss).
    cardDecls: (): unknown => ({}),
    composeValidateCard: async (): Promise<unknown> => null,
    // the validate walk primes the engine itself; this fake answers
    // "primed" so the walk proceeds to phase1 (both are real methods
    // on CardRegistryService — the walk no longer guards a seat that
    // might lack them).
    primeObjectInfo: async (): Promise<boolean> => true,
    // The validate walk DOES reach phase1 for a card= stage (that is
    // the one-admission law: a green compile is not a runnable
    // promise). This fake used to be a tripwire that no test crossed;
    // a test that supplies `phase1Card` through cardOver overrides
    // this, and a test that does not is not exercising a card stage.
    phase1Card: async (): Promise<unknown> => ({}),
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

/** The model-door seat with a phase1/2 compose pair: the graph rides
 *  verbatim (the wall sweeps it). Module-scope so the door walls and
 *  the wired-bench law walls share ONE seat shape. */
const modelDoorSeat = (
  graph: Record<string, unknown>,
  d1Doc: Record<string, unknown> = {},
): Seat =>
  seat(
    {
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      phase1Card: async (): Promise<unknown> => ({ skeleton: "edit", card: "image-edit" }),
      phase2Card: async (): Promise<unknown> => ({
        graph,
        outputs: {},
        outputNodes: {},
      }),
    },
    d1Doc,
  );

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
    assert.equal((good as { status?: unknown; ok?: unknown })["ok"] ?? true, true);
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
    assert.equal((ok as { status?: unknown; ok?: unknown })["ok"] ?? true, true);
    const ghost = await remote(() =>
      s.svc.validate(
        inlineBody({ flow_inline: { id: "x", stages: [{ id: "s", card: "ghost", engine: "comfyui", params: { model: "m" } }] } }),
        sig(),
      ),
    );
    assert.equal(ghost.code, "runs/flow-compile");
    assert.match(ghost.message, /not a registered card/);
  });

  it("an ARRAY flow_inline is refused at the compile gate (isRecord — never read as a row)", async () => {
    // inline as an ARRAY: compileFlowInline's first gate is isRecord,
    // so the array dies in the not-object voice — it never reaches the
    // curated-lane lift at all
    const defs = new Map([
      ["c", { requiresModel: false, schema: (p: unknown): unknown => p }],
    ]);
    const s = seat({ defsSync: (): unknown => defs });
    const err = await remote(() =>
      s.svc.validate(
        inlineBody({ flow_inline: [{ id: "s", card: "c", engine: "comfyui", params: {} }] }),
        sig(),
      ),
    );
    assert.match(err.message, /flow body must be a JSON object|not-object|single-stage/);
  });

  it("the flow shim keeps the door's voice (unknown names, pin sweep)", async () => {
    const s = seat();
    const unknown = await remote(() =>
      s.svc.validate({ flow: "ghost" }, sig()),
    );
    assert.equal(unknown.code, "runs/invalid-request");
    assert.match(unknown.message, /no flow named ghost in the registry/);
    // The seat's pin does not answer (objectInfo() null — the engine
    // is down or the fake has no engine), so the sweep is unjudgeable
    // and the door takes the schema-only verdict. The old degrade
    // answered a workflow_pin here, accusing a flow's stages of
    // classes the pin never claimed not to serve. The flow is
    // anny-hmr-commercial, which is a family verb with no card
    // stage, so the sweep is the only thing that can judge it
    // (image-upscale needs a card the structural fake does not serve).
    const schemaOnly = await s.svc.validate({ flow: "anny-hmr-commercial" }, sig());
    // The POSITIVE the commit means: a served verdict. Asserting the
    // absence of a `code` key would pass for any success, including
    // one that carried pin errors under another field.
    assert.deepEqual(
      Object.keys(schemaOnly as Record<string, unknown>).length > 0,
      true,
      "validate returned a served verdict",
    );
    assert.equal(
      (schemaOnly as Record<string, unknown>)["ok"] ?? true,
      true,
      "the unjudgeable pin serves a verdict — no refusal at all",
    );
    assert.equal(
      (schemaOnly as Record<string, unknown>)["errors"],
      undefined,
      "and it carries no sweep errors",
    );
    // The INITIAL gate is the flow arm's own voice and still refuses
    // the present-but-absent input.
    const bad = await remote(() =>
      s.svc.validate({ flow: "anny-hmr-commercial", photo: "/nonexistent.png" }, sig()),
    );
    assert.match(bad.message, /photo/);
  });

  it("the model arm walks strict, doors, dangling, id, resolve", async () => {
    const s = seat();
    const strict = await remote(() =>
      s.svc.validate({ model: "m", start_from: 1 }, sig()),
    );
    assert.equal(strict.code, "runs/invalid-request");
    const amb = await remote(() =>
      s.svc.validate({ model: "m", flow: "anny-hmr-commercial" }, sig()),
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
    // The arm wraps ONE prepareCardParams: the rig's facts row must
    // carry the card the decls table answers, exactly as a real
    // facts file would.
    const base = {
      modelFacts: (): unknown => ({ m1: { card: "c" } }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      cardDecls: (): unknown => ({ c: { skeleton: "" } }),
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

  // ── THE EXTERMINATION WALLS (2026-10-10, the operator's order: NO
  //    SILENT BEHAVIOR — run 880aaa85d928 proved the seam: the bench
  //    wired input_images from s_0, the client's Run sent a
  //    single-card body, the door stamped inputNames: {} while
  //    composing a graph carrying $input_images, and the wire was
  //    silently discarded — the run died at the MERGE with a
  //    stranger's voice). The door now covers what the run will do. ──

  /** The model-door seat with a phase1/phase2 compose pair: the
   *  graph rides verbatim (the wall sweeps it). */
  const modelDoorSeat = (
    graph: Record<string, unknown>,
    d1Doc: Record<string, unknown> = {},
  ): Seat =>
    seat(
      {
        modelFacts: (): unknown => ({ m1: {} }),
        resolveCardFamily: (): unknown => "m1",
        modelMids: (): unknown => new Set<string>(),
        phase1Card: async (): Promise<unknown> => ({ skeleton: "edit", card: "image-edit" }),
        phase2Card: async (): Promise<unknown> => ({
          graph,
          outputs: {},
          outputNodes: {},
        }),
      },
      d1Doc,
    );

  it("THE CARD-DOOR SPELL GATE: a $spell in the composed graph refuses AT THE DOOR — never the merge's stranger voice", async () => {
    const s = modelDoorSeat({
      "TextEncodeQwenImage21.0": {
        class_type: "TextEncodeQwenImage21",
        inputs: { image_1: "$input_images" },
      },
    });
    const err = await remote(() =>
      s.svc.start(
        {
          draft_id: "d1",
          test: false,
          model: "m1",
          params: { input_images: ["$input_images"] },
        },
        sig(),
      ),
    );
    assert.equal(err.code, "runs/invalid-request");
    // names the spell, names the fix
    assert.match(err.message, /\$input_images/);
    assert.match(err.message, /resolves no wires/);
    // NEVER REGISTERED — nothing queues, nothing runs
    assert.equal(s.core.runs.size, 0);
  });

  // THE WIRED-BENCH LAW (operator, 2026-10-10, verbatim: "By design,
  // there is no 'non bench flow'. There is ALWAYS FromStage links.
  // THERE IS NO FILTER, NO BREAKAGE FROM THIS. EVER."). The old gate
  // REFUSED a single-card start on a wired bench and told the caller
  // to run the flow — which is the bug: the GUI's per-stage Run, the
  // agent's card start and any API caller hit it, on the one shape
  // the run exists for. The door now BECOMES the bench run: the body
  // restages onto flow_inline with the bench's own stages, and the
  // wires ride as stage inputs.
  it("THE CARD PLANE'S CLASSIFICATION survives the bench arm (one voice per refusal)", async () => {
    // The bench arm used to collapse every card refusal into
    // runs/invalid-request while the card arm preserved the code, so
    // the same lane_input_missing — the one carrying the provision
    // fetch URL — arrived under a different code depending on which
    // arm composed it. The stage name rides the message; the
    // classification is the card plane's own.
    const s = seat(
      {
        modelFacts: (): unknown => ({ m1: {} }),
        resolveCardFamily: (): unknown => "m1",
        modelMids: (): unknown => new Set<string>(),
        phase1Card: async (): Promise<unknown> => {
          throw new CardArmError(
            400,
            "lane presence: family 'z-image' declares checkpoint 'x.safetensors' but no store copy exists — fetch it: https://example/x",
            "lane_input_missing",
          );
        },
      },
      {
        // a WIRED bench (a cross-link) is what the door restages into
        // the bench-composed arm; a single unwired stage would take
        // the card arm and prove nothing about this classification.
        stages: [
          { id: "s_0", card: "image-gen", params: { prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, model: "image-gen" }, sig()),
    );
    assert.equal(err.code, "runs/lane-input-missing", "the card plane's own code, not a generic collapse");
    assert.match(err.message, /bench stage "s_0"/);
    assert.match(err.message, /fetch it: https:\/\/example\/x/);
    // THE EVIDENCE RIDES TOO: the card arm preserves the card plane's
    // own loc/expected/got (pinned in the start spec), and "one voice
    // per refusal" means this arm differs by the stage name and by
    // nothing else — a lane_input_missing with no expected/got is a
    // refusal nobody can act on.
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.match(String(details["loc"]), /stages\/"s_0"/, "the stage is named, beside the card's own loc");
  });

  it("THE WIRED-BENCH LAW: a single-card start on a WIRED bench becomes the bench run — never a refusal, never a discarded wire", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [
          { id: "s_0", card: "image-gen", params: { prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    // the caller still names the card arm (that is the GUI's press)
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "", "the wired bench RAN");
    assert.equal(s.core.runs.size, 1, "one run registered — the bench, not a discarded card");
  });

  it("THE STAGE-ID DIGEST: a settled bench run names the stages it composed — on disk ahead of the payloads, on the row as an array", async () => {
    // Commission 015 §6 finding 6: per-stage last_run needs the run
    // to name its membership. The digest is DERIVED from the very
    // stages the doc stores (digest and array can never disagree),
    // rides with the identity scalars so the list row's 8191-byte
    // window always reaches it, and projects CSV-on-disk to
    // array-on-the-row.
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [
          { id: "s_0", card: "image-gen", params: { prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    await settleWait(s, ans.run_id);
    const raw = readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8");
    const doc = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(doc["stage_ids"], "s_0,s_1");
    assert.ok(
      raw.indexOf('"stage_ids"') < raw.indexOf('"graph"'),
      "the digest rides ahead of every payload — the 8191-byte window must always reach it",
    );
    const listed = await s.svc.list("1_0", sig());
    assert.deepEqual(
      (listed.runs[0] as Record<string, unknown>)["stage_ids"],
      ["s_0", "s_1"],
    );
  });

  // THE SELF-WIRE DISCRIMINATION (2026-10-10, the operator's live
  // report: a persisted bench carried input_images <- s_0.default —
  // the STAGE'S OWN output feeding its own input, a cycle born
  // before the bench door's bench/self-wire law landed. The generic
  // "no FromStage links" voice hid the crime and read as nonsense.
  // The door names the cycle.)
  it("THE SELF-WIRE ARM: a stage wired to ITSELF refuses as bench/self-wire — the crime named, not the generic voice", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_1", output: "default" } },
          },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
        sig(),
      ),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /SELF-WIRE/);
    assert.match(err.message, /cycle composes nothing/);
    // the cure is IN the message
    assert.match(err.message, /rewire the input/);
    assert.equal(s.core.runs.size, 0);
  });

  // THE CROSS-WIRE PROMOTION, one-stage edge (batch-4 closure,
  // 2026-10-14): a wire naming ANOTHER stage — even one whose target
  // row is absent — promotes the start to the bench run before the
  // card arm composes (a bench with wires is a flow, whatever the
  // caller named). The dead cross arms this pins the SHAPE of: the
  // discard gate below can only ever see self-wires, and its
  // unreachable generic refusal was deleted, not covered.
  it("a one-stage bench wired CROSS promotes to the bench run — never the discard gate", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "", "the cross-wired bench RAN");
    assert.equal(s.core.runs.size, 1, "one run registered — the bench, not a discarded card");
  });

  // The walker's skip arms: a bench may carry carded stages whose
  // `inputs` are malformed (a string, an array) beside a real wire —
  // both passes skip the malformed rows without touching the real
  // wire's verdict, and the bench run registers.
  it("malformed stage inputs skip clean in both wire passes — the real wire rides, the run registers", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [
          { id: "s_x", card: "image-edit", params: { prompt: "x" }, inputs: "nope" },
          { id: "s_y", card: "image-edit", params: { prompt: "x" }, inputs: ["no"] },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_x", output: "default" } },
          },
        ],
      },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "", "the wired bench RAN");
    assert.equal(s.core.runs.size, 1);
  });

  it("CLEAN SINGLE-CARD: no spells, no wires — the walls never false-alarm, the run registers", async () => {
    const s = modelDoorSeat({
      SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } },
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "a cat" } },
      sig(),
    )) as Record<string, unknown>;
    assert.match(String(ans["run_id"]), /^run-/);
  });

  it("prepare failures fold CardArmErrors and rethrow the rest", async () => {
    // prepareCardParams owns the arms, so a prepare-leg CardArmError
    // is what folds and a raw prepare-leg error is what stays loud.
    // resolveCardFamily is the leg the rig can stub after the
    // resolves short-circuit.
    const arm = seat({
      modelFacts: (): unknown => ({ m1: { card: "c" } }),
      resolveCardFamily: (): unknown => {
        throw new CardArmError(400, "overlay bad", "card_compose");
      },
    });
    assert.equal(
      (await remote(() => arm.svc.validate({ model: "m1" }, sig()))).code,
      "runs/card-compose",
    );
    const loud = seat({
      modelFacts: (): unknown => ({ m1: { card: "c" } }),
      resolveCardFamily: (): unknown => {
        throw new Error("overlay exploded");
      },
    });
    await assert.rejects(loud.svc.validate({ model: "m1" }, sig()), /overlay exploded/);
  });
});

describe("status + stop", () => {
  // The fixture brands at its construction door (the run-id type's
  // own law): call sites pass arbitrary labels, the helper mints the
  // brand once, where the row is built.
  const live = (s: Seat, over: Partial<Omit<RunRecord, "runId">> & { runId?: string } = {}): string => {
    const row: RunRecord = {
      status: "queued",
      stages: [],
      skippedStages: [],
      artifacts: [],
      error: "",
      draftId: "d1",
      dir: join(s.state, "output", over.runId ?? "run-live"),
      testFlag: false,
      stopFlag: false,
      params: [],
      createdAt: 1,
      pipeline: "flow_inline",
      graphRows: [],
      outputNodes: [],
      initials: {},
      ...over,
      runId: (over.runId ?? "run-live") as RunId,
    };
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

  it("status serves source and export stamps while empty stamps stay absent", async () => {
    const s = seat();
    const id = live(s, {
      runId: "run-status-stamps",
      sourceEcho: { refs: [{ url: "/x", file: "/tmp/x" }] },
      exportName: "Cherry_17",
      exportPath: "/voices/Cherry_17.qvoice",
      variant: "customvoice",
    });
    const got = await s.svc.status(id, sig());
    assert.deepEqual(got["source_echo"], { refs: [{ url: "/x", file: "/tmp/x" }] });
    assert.equal(got["export_name"], "Cherry_17");
    assert.equal(got["export_path"], "/voices/Cherry_17.qvoice");
    assert.equal(got["variant"], "customvoice");

    const emptyId = live(s, {
      runId: "run-status-empty-stamps",
      exportName: "",
      exportPath: "",
    });
    const empty = await s.svc.status(emptyId, sig());
    assert.equal("export_name" in empty, false);
    assert.equal("export_path" in empty, false);
  });

  it("status serves the loudness + freshness stamps while unmetered runs stay bare (the compact chip's data)", async () => {
    const s = seat();
    const id = live(s, {
      runId: "run-status-loud",
      loudness: { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 },
      voiceFreshness: { reused_existing: true, voice_file: "harbour_2.qvoice" },
    });
    const got = await s.svc.status(id, sig());
    assert.deepEqual(got["loudness"], { loudness_lufs: -24.72274663827507, peak_db: -6.366579627483562 });
    assert.deepEqual(got["voice_freshness"], { reused_existing: true, voice_file: "harbour_2.qvoice" });

    const bareId = live(s, { runId: "run-status-bare" });
    const bare = await s.svc.status(bareId, sig());
    assert.equal("loudness" in bare, false);
    assert.equal("voice_freshness" in bare, false);
  });

  it("status serves the row (log tail rides along on request)", async () => {
    const s = seat();
    const id = live(s, { error: "bad", stages: [{ id: "s", name: "s", index: 0, status: "failed", outputs: {}, expected: {} }] });
    const got = await s.svc.status(id, sig());
    assert.equal(got["queue_position"], 0);
    assert.equal(got["draft_id"], "d1");
    const logged = await s.svc.status(id, sig(), true);
    assert.match(String(logged["log_tail"]), /run: queued/);
  });

  it("THE COMPOSE ECHO, SERVED (the audit's C): a film run's status carries compose_echo; a non-film run omits the key", async () => {
    const echo = { seam: "carry,cut", calls: 2, benchRev: 17 };
    const filmed = seat();
    const filmId = live(filmed, { pipeline: "h3", composeEcho: echo });
    assert.deepEqual((await filmed.svc.status(filmId, sig()))["compose_echo"], echo);
    const plain = seat();
    const plainId = live(plain, { pipeline: "m" });
    assert.equal("compose_echo" in await plain.svc.status(plainId, sig()), false);
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
     assert.deepEqual(got["stages"], [{
       id: "s1",
       status: "completed",
       url: "run.png",
       gallery: [{ name: "run.png" }],
     }]);
    assert.deepEqual(got["artifacts"], ["run.png"]);
  });

  it("disk fallback refuses a sidecar whose status is not ours (T3: the durable boundary judges it)", async () => {
    // A hand-edited or foreign _flow.json serving "banana" as a run
    // status is not a row we serve — the same verdict as
    // unparseable (undefined), never a fabricated status, never a
    // fold. The refusal names the roots it searched, so the
    // operator sees which trees answered; every one of the six
    // vocabulary spellings still serves from disk.
    const s = seat();
    const runId = "run-t3badst123456-00000001";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      run_id: runId, status: "banana", draft_id: "d1",
      stages: [{ id: "s1", status: "completed" }],
      skipped_stages: [], artifacts: ["run.png"], error: "",
    }));
    const err = await remote(() => s.svc.status(runId, sig()));
    assert.equal(err.code, "runs/unknown-run");
    assert.match(err.message, /run-t3badst123456-00000001/);
    for (const st of ["queued", "running", "completed", "failed", "stopped", "stopping"]) {
      writeFileSync(join(dir, "_flow.json"), JSON.stringify({
        run_id: runId, status: st, draft_id: "d1",
        stages: [{ id: "s1", status: "completed" }],
        skipped_stages: [], artifacts: ["run.png"], error: "",
      }));
      const got = await s.svc.status(runId, sig());
      assert.equal(got["status"], st);
      assert.equal(got["from_disk"], true);
    }
  });

  it("disk fallback reconstructs a film hero from legacy H3 artifacts", async () => {
    const s = seat();
    const runId = "run-f5h3disk123456-00000005";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "_flow.json"), JSON.stringify({
      run_id: runId,
      status: "completed",
      stages: [{ id: "h3-film", status: "completed" }],
      artifacts: [
        `${dir}/h3-film/h3_t4_w1_00001_.mp4`,
        `${dir}/h3-film/h3_t4_film_audio_00001.flac`,
        `${dir}/h3-film/h3_t4_film_00002_.mp4`,
      ],
    }));
    const got = await s.svc.status(runId, sig());
    const stage = (got["stages"] as Array<Record<string, unknown>>)[0]!;
    assert.equal(stage["url"], "h3-film/h3_t4_film_00002_.mp4");
    assert.deepEqual(stage["gallery"], [
      { name: "h3-film/h3_t4_w1_00001_.mp4" },
      { name: "h3-film/h3_t4_film_audio_00001.flac" },
      { name: "h3-film/h3_t4_film_00002_.mp4" },
    ]);
  });

  it("disk enrichment refuses malformed rows and preserves explicit presentation", async () => {
    const s = seat();
    const write = (runId: string, row: Record<string, unknown>): void => {
      const dir = join(s.state, "output", runId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "_flow.json"), JSON.stringify(row));
    };
    const multi = "run-multi-stage-00000001";
    write(multi, { status: "completed", stages: [{ id: "a" }, { id: "b" }], artifacts: ["a.mp4"] });
    assert.deepEqual((await s.svc.status(multi, sig()))["stages"], [{ id: "a" }, { id: "b" }]);

    const empty = "run-empty-artifact-00000001";
    write(empty, { status: "completed", stages: [{ id: "a" }], artifacts: [] });
    assert.deepEqual((await s.svc.status(empty, sig()))["stages"], [{ id: "a" }]);

    const badStage = "run-bad-stage-00000001";
    write(badStage, { status: "completed", stages: [null], artifacts: ["a.mp4"] });
    assert.deepEqual((await s.svc.status(badStage, sig()))["stages"], [null]);

    const badName = "run-bad-name-00000001";
    write(badName, { status: "completed", stages: [{ id: "a" }], artifacts: ["notes.txt", 4, ""] });
    assert.deepEqual((await s.svc.status(badName, sig()))["stages"], [{ id: "a" }]);

    const badArrays = "run-bad-arrays-00000001";
    write(badArrays, { status: "completed", stages: "bad", artifacts: "bad" });
    const badArrayRow = await s.svc.status(badArrays, sig());
    assert.equal(badArrayRow["stages"], "bad");
    assert.equal(badArrayRow["artifacts"], "bad");

    const explicit = "run-explicit-stage-00000001";
    write(explicit, {
      status: "completed",
      stages: [{ id: "a", url: "custom.mp4", gallery: [{ name: "custom.png" }] }],
      artifacts: ["h3_t4_film_00001_.mp4"],
    });
    assert.deepEqual((await s.svc.status(explicit, sig()))["stages"], [{
      id: "a", url: "custom.mp4", gallery: [{ name: "custom.png" }],
    }]);
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
    live(s, { runId: huskId, status: "completed", dir });
    const got = await s.svc.status(huskId, sig());
    assert.equal(got["from_disk"], true);
    assert.equal((got["stages"] as unknown[]).length, 1);

    // A genuinely-empty QUEUED row is legitimate (nothing yet) — stays live.
    const q = live(s, { runId: "run-f5queued1234-00000003" });
    const liveAns = await s.svc.status(q, sig());
    assert.equal(liveAns["from_disk"], undefined);
    assert.equal(liveAns["status"], "queued");

    // Unknown + no disk row → the door's refusal, unchanged.
    assert.equal((await remote(() => s.svc.status("run-f5none123456-00000004", sig()))).code, "runs/unknown-run");
  });

  it("terminal empty rows stay live when disk is absent or has no usable arrays", async () => {
    const s = seat();
    const noDisk = live(s, { runId: "run-terminal-no-disk", status: "completed" });
    const liveNoDisk = await s.svc.status(noDisk, sig());
    assert.equal(liveNoDisk["from_disk"], undefined);

    const malformedId = "run-terminal-malformed";
    const malformedDir = join(s.state, "output", malformedId);
    mkdirSync(malformedDir, { recursive: true });
    writeFileSync(join(malformedDir, "_flow.json"), JSON.stringify({
      status: "completed",
      stages: "not-an-array",
      artifacts: "not-an-array",
    }));
    live(s, { runId: malformedId, dir: malformedDir, status: "completed" });
    const malformed = await s.svc.status(malformedId, sig());
    assert.equal(malformed["from_disk"], undefined);
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
    });
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
      stages: [{ id: "s1", status: "running" } as RunStageRow],
    });
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
      runId: runId as RunId,
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
      initials: {},
    });
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
    // THE RUN-DIR RELATIVE (024's self-critique #2): exactly one
    // run-id segment — the out-root-relative join doubled it
    // (`<run>/<run>/…`, a path that exists nowhere) until the
    // relativize moved onto the run dir.
    assert.equal(arts[0], runId + "/o.png");
    assert.equal(arts[1], runId + "/stage/v.mp4");
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

  it("THE REPORT SIDECAR MOUNT (2026-10-17): a run dir's <stem>.report.json rides the status stage INLINE, contract-judged", async () => {
    const s = seat();
    const runId = "run-rig-report";
    const dir = join(s.state, "output", runId);
    mkdirSync(join(dir, "3D"), { recursive: true });
    // the writer's own body (report_sidecar.py's fold): a finished
    // bench report entry, never a rig tuple
    const report = { kind: "report", status: "fail", title: "Rig validation",
      chips: ["CRITICAL 1"], rows: { passed: false, critical_count: 1 } };
    writeFileSync(join(dir, "3D", "rigged.report.json"), JSON.stringify(report));
    const stage: RunStageRow = {
      id: "st1", name: "rig", index: 0, status: "completed",
      url: "rigged.glb", gallery: [{ name: "3D/rigged.glb" }] as never,
      outputs: {}, expected: {},
    };
    live(s, { runId, status: "completed", stages: [stage] });
    const got = await s.svc.status(runId, sig());
    const stages = got["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[0]["reports"], { rigged: report });
    // a clean run's row never grows the key
    const bare = live(s, { runId: "run-rig-bare", status: "completed",
      stages: [{ id: "st1", name: "rig", index: 0, status: "completed", gallery: [{ name: "a.png" }] as never, outputs: {}, expected: {} }] });
    const bareRow = await s.svc.status(bare, sig());
    assert.equal("reports" in (bareRow["stages"] as Array<Record<string, unknown>>)[0], false);
  });

  it("the mount refuses loud: non-JSON and contract-unlawful sidecars warn + skip; an existing key wins", async () => {
    const s = seat();
    const runId = "run-rig-loud";
    const dir = join(s.state, "output", runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "broken.report.json"), "{not json");
    // a rig TUPLE is not a report entry — the contract refuses it
    writeFileSync(join(dir, "tuple.report.json"), JSON.stringify([true, [], { bones: 2 }]));
    const stage: RunStageRow = {
      id: "st1", name: "rig", index: 0, status: "completed",
      gallery: [{ name: "broken.glb" }, { name: "tuple.glb" }, { name: "kept.glb" }] as never,
      reports: { kept: { kind: "report", status: "pass" } } as never,
      outputs: {}, expected: {},
    };
    live(s, { runId, status: "completed", stages: [stage] });
    const got = await s.svc.status(runId, sig());
    const stages = got["stages"] as Array<Record<string, unknown>>;
    assert.deepEqual(stages[0]["reports"], { kept: { kind: "report", status: "pass" } });
    const warnings = got["warnings"] as string[];
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /broken\.report\.json is not JSON/);
    assert.match(warnings[1], /tuple\.report\.json refused by the bench result contract/);
  });
});

describe("withStageReports + sidecarReaderFor (the pure decorate, function-grain)", () => {
  const rep = (status: string): Record<string, unknown> =>
    ({ kind: "report", status, title: "Rig validation" });
  const withDir = (
    fn: (dir: string) => void,
  ): { row: Record<string, unknown>; dir: string } => {
    const dir = tmp();
    fn(dir);
    return { row: { run_id: "run-p", stages: [{ id: "s", gallery: [{ name: "3D/foo.glb" }] }] }, dir };
  };

  it("derives <stem>.report.json siblings from gallery names and the hero url (run-id prefix stripped)", () => {
    const { row, dir } = withDir((d) => {
      mkdirSync(join(d, "3D"), { recursive: true });
      writeFileSync(join(d, "3D", "foo.report.json"), JSON.stringify(rep("pass")));
    });
    row["stages"] = [{ id: "s", url: "run-p/3D/foo.glb", gallery: [{ name: "3D/foo.glb" }] }];
    const out = withStageReports(row, sidecarReaderFor(dir));
    assert.deepEqual((out["stages"] as Array<Record<string, unknown>>)[0]["reports"], { foo: rep("pass") });
  });

  it("the reader answers null for absent sidecars; a stage without candidates passes through untouched", () => {
    const read = sidecarReaderFor(tmp());
    assert.equal(read("nope.report.json"), null);
    const row = { run_id: "r", stages: [{ id: "s", gallery: [] }] };
    assert.equal(withStageReports(row as never, read), row);
  });

  it("prior warnings ride along; a skipped-only mount still warns", () => {
    const dir = tmp();
    writeFileSync(join(dir, "bad.report.json"), "~~");
    const out = withStageReports(
      { run_id: "r", warnings: ["existing"], stages: [{ id: "s", gallery: [{ name: "bad.glb" }] }] },
      sidecarReaderFor(dir),
    );
    assert.deepEqual(out["warnings"], ["existing", "report sidecar bad.report.json is not JSON — skipped"]);
  });
});

describe("film admission warn (F-6b)", () => {
  const GIB = 1024 ** 3;
  // Every arm pins its own endpoint config (a valid absolute URL
  // the stubbed fetch answers) — never the repo's data file.
  beforeEach(() => {
    const good = join(tmp(), "endpoint.json");
    writeFileSync(good, JSON.stringify({ url: "http://stubbed-engine" }));
    process.env["COMFYUI_ENDPOINT_CONFIG"] = good;
  });
  afterEach(() => {
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  });
  const filmBody = (): Record<string, unknown> => ({
    draft_id: "d1",
    test: false,
    model: "h3-timeline",
    calls: [
      { start_frame: 0, end_frame: 124 },
      { start_frame: 124, end_frame: 243 },
      { start_frame: 243, end_frame: 362 },
    ],
    width: 1344,
    height: 768,
  });
  const filmSeat = (): Seat => seat({
    phase1Card: (async (): Promise<unknown> => ({ card: "h3-timeline", skeleton: "s" })) as never,
    phase2Card: (async (): Promise<unknown> => ({ graph: {} })) as never,
  });
  const stubMem = (free: number, total: number): void => {
    vi.stubGlobal("fetch", async (url: unknown) => {
      // Mirror the real fetch: a baseless relative URL (the config
      // arm's "" + '/system_stats') throws — the stub answers only
      // absolute URLs.
      if (typeof url !== "string" || !url.startsWith("http")) throw new Error("no base");
      return {
        json: async () => ({ devices: [{ name: "cuda:0", vram_free: free, vram_total: total }] }),
      };
    });
  };

  it("THE SNAPSHOT-COERCION LAW (BRIEF14 finding #2 — the stringified persisted snapshot): the card door's sidecar carries the numbers the card received, never dsh's stringly encoding; the raw body still rides _request.json verbatim", async () => {
    stubMem(20 * GIB, 24.5 * GIB);
    try {
      const s = seat({
        phase1Card: (async (): Promise<unknown> => ({ card: "h3-timeline", skeleton: "s" })) as never,
        phase2Card: (async (): Promise<unknown> => ({ graph: {} })) as never,
        defsSync: (): unknown => new Map([
          ["h3-timeline", {
            schemaCarrier: { dict: { dur_frames: { type: "number" }, seed: { type: "number" } } },
          }],
        ]),
      }, {
        intent: "h3-timeline",
        stages: [{ id: "s_0", card: "h3-timeline", params: { dur_frames: "110", prompt: "kept" } }],
      });
      const ans = await s.svc.start({
        ...filmBody(),
        dur_frames: "110",
        seed: "42",
        prompt: "kept a string",
      }, sig());
      await settleWait(s, ans.run_id);
      // the run record's snapshot: declared numerics are numbers
      // The registry row has no overlap with a plain record, so
      // the snapshot face is read via unknown (type-only).
      const rec = s.core.runs.get(ans.run_id) as unknown as Record<string, unknown>;
      const snap = rec["cardSnapshot"] as { params: Record<string, unknown> };
      assert.equal(snap.params["dur_frames"], 110);
      assert.strictEqual(typeof snap.params["dur_frames"], "number");
      assert.equal(snap.params["seed"], 42);
      assert.equal(snap.params["prompt"], "kept a string");
      // the persisted sidecar (_flow.json) carries the typed truth
      const flow = JSON.parse(readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8")) as Record<string, unknown>;
      const flowSnap = flow["card_snapshot"] as { params: Record<string, unknown> };
      assert.strictEqual(typeof flowSnap.params["dur_frames"], "number");
      // the BENCH snapshot rides the same law per stage: each row's
      // params coerce through its own card's carrier
      const benchSnap = flow["bench_snapshot"] as { stages: Array<{ params: Record<string, unknown> }> };
      assert.strictEqual(benchSnap.stages[0]?.params["dur_frames"], 110);
      assert.equal(benchSnap.stages[0]?.params["prompt"], "kept");
      // _request.json rides the SAME coerced body (the door feeds
      // both seats): the request sidecar itself now proves type
      // integrity — the finding's exact complaint — while the
      // structure/seam evidence (the compose echo's law) is
      // unchanged by the numeric fill.
      const req = JSON.parse(readFileSync(join(s.state, "output", ans.run_id, "_request.json"), "utf8")) as Record<string, unknown>;
      assert.strictEqual(req["dur_frames"], 110);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("a pressured engine warns on the run (the warn rides run_status)", async () => {
    stubMem(0.8 * GIB, 24.5 * GIB);
    try {
      const s = filmSeat();
      const ans = await s.svc.start(filmBody(), sig());
      const row = await s.svc.status(ans.run_id, sig());
      const warnings = row["warnings"] as string[];
      assert.equal(warnings.length, 1);
      assert.match(warnings[0] as string, /film admission/);
      assert.match(warnings[0] as string, /0\.8 of 24\.5 GiB free/);
      assert.match(warnings[0] as string, /3-window film/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("headroom stays quiet; a dead stats read never blocks admission", async () => {
    stubMem(20 * GIB, 24.5 * GIB);
    try {
      const s = filmSeat();
      const ans = await s.svc.start(filmBody(), sig());
      assert.deepEqual((await s.svc.status(ans.run_id, sig()))["warnings"], []);
    } finally {
      vi.unstubAllGlobals();
    }
    vi.stubGlobal("fetch", async () => {
      throw new Error("engine down");
    });
    try {
      const s = filmSeat();
      const ans = await s.svc.start(filmBody(), sig());
      assert.equal(ans.status, "queued");
      assert.deepEqual((await s.svc.status(ans.run_id, sig()))["warnings"], []);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("an unreadable endpoint config skips the warn (admission never blocks on config)", async () => {
    const dir = tmp();
    const bad = join(dir, "endpoint.json");
    writeFileSync(bad, "{ not json");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = bad;
    stubMem(0.8 * GIB, 24.5 * GIB);
    try {
      const s = filmSeat();
      const ans = await s.svc.start(filmBody(), sig());
      assert.equal(ans.status, "queued");
      assert.deepEqual((await s.svc.status(ans.run_id, sig()))["warnings"], []);
    } finally {
      delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      vi.unstubAllGlobals();
    }
  });

  it("non-film cards never warn (the calls shape is the film lane's)", async () => {
    stubMem(0.8 * GIB, 24.5 * GIB);
    try {
      const s = seat({
        phase1Card: (async (): Promise<unknown> => ({ card: "tts", skeleton: "s" })) as never,
        phase2Card: (async (): Promise<unknown> => ({ graph: {} })) as never,
      });
      const ans = await s.svc.start({ draft_id: "d1", test: false, model: "tts", text: "hi" }, sig());
      assert.deepEqual((await s.svc.status(ans.run_id, sig()))["warnings"], []);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("an h3 body with no computable spans never warns (nothing to warn about)", async () => {
    stubMem(0.8 * GIB, 24.5 * GIB);
    try {
      const s = filmSeat();
      const ans = await s.svc.start({ draft_id: "d1", test: false, model: "h3-timeline" }, sig());
      assert.deepEqual((await s.svc.status(ans.run_id, sig()))["warnings"], []);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("the multi-stage boundary (2026-09-25 — curated lane lifts the length gate; card flows stay validate-only)", () => {
  it("a HAND-AUTHORED multi-stage flow_inline still refuses, now naming the curated exception", async () => {
    const s = seat();
    const err = await remote(() =>
      s.svc.start(
        inlineBody({
          flow_inline: {
            id: "hand-authored",
            stages: [
              { id: "a", engine: "comfyui" },
              { id: "b", engine: "comfyui" },
            ],
          },
        }),
        sig(),
      ),
    );
    assert.equal(err.code, "runs/preview-scope");
    assert.match(err.message, /single-stage flow_inline runs only \(2 stages\)/);
    assert.match(err.message, /curated registry flows except/);
  });

  it("the curated-lane MECHANIC: an inline doc whose id names a registry flow passes the length gate (drives 2 merged rows)", async () => {
    // NOT a claim about image-upscale's own stages (they are card=
    // stages and refuse at the card gate, walled below) — this pins
    // the gate mechanic itself: the id-name check is what lifts the
    // single-stage policy for curated docs, and the merged worker
    // receives BOTH rows with the cross-stage wiring intact.
    const s = seat();
    const engine = engineSeat(s);
    // the engines SEAT (stroke 53's dispatch law — runOne reads
    // ctx.get("engines").resolve(id).executor, never a raw inject)
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    (ctx as unknown as Record<string, unknown>)["engines"] = {
      ids: (): string[] => ["comfyui"],
      resolve: (): { executor: FakeEngine } => ({ executor: engine }),
    };
    let seenRows: MergeRow[] | null = null;
    let seenNames: Record<string, Record<string, string>> | null = null;
    // The worker's write is invisible to CFA (a direct read narrows
    // to never), so the count rides a reader — declared-type reads
    // inside a closure narrow honestly.
    const seenRowCount = (): number => (seenRows === null ? 0 : seenRows.length);
    engine.onFlow = async (rows, _dir, inputNames): Promise<FlowResult> => {
      seenRows = rows;
      seenNames = inputNames;
      return { stages: {}, promptId: "p2" };
    };
    const r = (await s.svc.start(
      inlineBody({
        flow_inline: {
          id: "image-upscale",
          stages: [
            { id: "make", engine: "comfyui", params: WF, outputs: { image: "image" } },
            { id: "polish", engine: "comfyui", params: WF, inputs: { image: { stage: "make", output: "image" } } },
          ],
        },
      }),
      sig(),
    )) as { run_id?: string };
    const run = await settleWait(s, String(r["run_id"]));
    assert.equal(run.status, "completed", "the 2-stage curated doc drives the merged worker");
    assert.equal(run.stages.length, 2);
    assert.deepEqual(run.stages.map((st) => st.id), ["make", "polish"]);
    assert.equal(seenRowCount(), 2, "BOTH rows land in the one merged submit");
    assert.equal(
      seenNames !== null && seenNames["polish"] !== undefined ? seenNames["polish"]["image"] : "",
      "make.image",
      "the cross-stage wiring rides inputNames",
    );
  });

  it("the registry's CARD flows RUN on the {flow:} door (2026-10-04: the card stages compose)", async () => {
    // The VALIDATE-ONLY stamp is GONE. A registry row projects with
    // its `card` references intact and the inline compiler refuses
    // those, so every card flow (audio-native-tts, image-upscale,
    // music-native, body-to-somax) could validate but never start —
    // an app calling a named flow got 400 runs/preview-scope. The
    // start door now composes them through the SAME card walk the
    // bench run uses, so the compiler only ever sees compiled stages.
    const graph = { nodes: [{ id: "1", class_type: "SaveImage" }] };
    const s = seat({
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      phase1Card: async (body: Record<string, unknown>): Promise<unknown> => ({
        skeleton: "up",
        card: String(body["card"] ?? ""),
        // the composed stage keeps the row's own params, so the card
        // arm's admission sees exactly what the flow declared
        params: body["params"] ?? {},
      }),
      phase2Card: async (): Promise<unknown> => ({
        graph,
        outputs: {},
        outputNodes: {},
      }),
    });
    const engine = engineSeat(s);
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    (ctx as unknown as Record<string, unknown>)["engines"] = {
      ids: (): string[] => ["comfyui"],
      resolve: (): { executor: FakeEngine } => ({ executor: engine }),
    };
    let seenRows: MergeRow[] | null = null;
    // the worker's write is invisible to CFA (a direct read narrows to
    // never), so the count rides a reader — the curated-lane arm's law
    const seenRowCount = (): number => (seenRows === null ? 0 : seenRows.length);
    engine.onFlow = async (rows): Promise<FlowResult> => {
      seenRows = rows;
      return { stages: {}, promptId: "p1" };
    };
    const r = (await s.svc.start(
      { draft_id: "d1", test: false, flow: "image-upscale" },
      sig(),
    )) as { run_id?: string };
    const run = await settleWait(s, String(r["run_id"]));
    assert.equal(run.status, "completed", "the named card flow RUNS");
    // both registry stages ran as ONE merged submit
    assert.equal(seenRowCount(), 2, "BOTH stages land in the one merged submit");
    const stages = run.stages.map((st) => st.id);
    assert.deepEqual(stages, ["make", "polish"]);
  });

  it("a card flow whose card compose refuses names the FLOW stage and keeps the card plane's evidence", async () => {
    const s = seat({
      modelFacts: (): unknown => ({ m1: {} }),
      resolveCardFamily: (): unknown => "m1",
      modelMids: (): unknown => new Set<string>(),
      phase1Card: async (): Promise<unknown> => {
        throw new CardArmError(
          400,
          "lane presence: family 'z-image' declares checkpoint 'x.safetensors' but no store copy exists — fetch it: https://example/x",
          "lane_input_missing",
        );
      },
      phase2Card: async (): Promise<unknown> => {
        throw new Error("unreached phase2");
      },
    });
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, flow: "image-upscale" }, sig()),
    );
    assert.match(err.message, /flow stage "make"/, "the flow's own stage is named");
    assert.match(err.message, /fetch it: https:\/\/example\/x/, "the card plane's actionable message rides whole");
    assert.equal(err.code, "runs/lane-input-missing", "the card plane's own code classifies it, not a flows-only code");
  });
});

describe("cross-roots manifest (§23)", () => {
  const richDoc = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
    status: "completed",
    draft_id: "d1",
    pipeline: "h3-timeline",
    stages: [{ id: "s", status: "completed" }],
    artifacts: ["film.mp4"],
    ...extra,
  });
  const plant = (root: string, runId: string, doc: Record<string, unknown>): void => {
    mkdirSync(join(root, "output", runId), { recursive: true });
    writeFileSync(join(root, "output", runId, "_flow.json"), JSON.stringify(doc));
  };
  const withMaker = (fn: (maker: string) => Promise<void>): (() => Promise<void>) => async () => {
    const maker = tmp();
    process.env["MELITE_STATE_ROOTS"] = maker;
    try {
      await fn(maker);
    } finally {
      delete process.env["MELITE_STATE_ROOTS"];
    }
  };

  it("status resolves a run living only on the second root (names its root)", withMaker(async (maker) => {
    const s = seat();
    plant(maker, "run-maker1", richDoc());
    const got = await s.svc.status("run-maker1", sig());
    assert.equal(got["from_disk"], true);
    assert.equal(got["served_from"], maker);
  }));

  const liveRow = (s: Seat): string => {
    const row: RunRecord = {
      // The fixture brands at its construction door (arbitrary label).
      runId: "run-live" as RunId,
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
      initials: {},
    };
    (s.core.runs as Map<string, RunRecord>).set(row.runId, row);
    return row.runId;
  };

  it("own root wins the collision; live rows name the seat root", withMaker(async (maker) => {
    const s = seat();
    plant(s.state, "run-both1", richDoc({ pipeline: "own-pipe" }));
    plant(maker, "run-both1", richDoc({ pipeline: "maker-pipe" }));
    const got = await s.svc.status("run-both1", sig());
    assert.equal(got["served_from"], s.state);
    const id = liveRow(s);
    assert.equal((await s.svc.status(id, sig()))["served_from"], s.state);
  }));

  it("misses name every searched root (status + stop)", withMaker(async (maker) => {
    const s = seat();
    const miss = await remote(() => s.svc.status("run-x", sig()));
    assert.ok(miss.message.includes(s.state), miss.message);
    assert.ok(miss.message.includes(maker), miss.message);
    const stopMiss = await remote(() => s.svc.stop("run-x", sig()));
    assert.equal(stopMiss.code, "runs/run-unknown");
    assert.ok(stopMiss.message.includes(maker), stopMiss.message);
  }));

  it("list unions both roots; every row names its root; own wins collisions", withMaker(async (maker) => {
    const s = seat();
    plant(s.state, "run-own1", richDoc());
    plant(maker, "run-mk1", richDoc());
    plant(s.state, "run-both2", richDoc({ pipeline: "own-pipe" }));
    plant(maker, "run-both2", richDoc({ pipeline: "maker-pipe" }));
    const listed = await s.svc.list("50", sig());
    // The scan total counts every dir in every tree (the collision
    // exists on both); the SERVED rows dedupe to one per run-id.
    assert.equal(listed.count, 4);
    assert.equal(listed.runs.length, 3);
    const byId = new Map(listed.runs.map((r) => [r["run_id"], r]));
    assert.equal(byId.get("run-own1")?.["served_from"], s.state);
    assert.equal(byId.get("run-mk1")?.["served_from"], maker);
    assert.equal(byId.get("run-both2")?.["served_from"], s.state);
  }));
});

// ── THE WIRED-BENCH LAW, EVERY ARM (operator, 2026-10-10, verbatim:
// "By design, there is no 'non bench flow'. There is ALWAYS FromStage
// links ... THERE IS NO FILTER, NO BREAKAGE FROM THIS. EVER.") The
// door re-routes a wired bench into the bench run; these pin that the
// run is REAL — every stage composed, every wire riding into the
// merged doc — and that the same state is identical whoever authored
// it (the GUI, the agent, a hand-written body: no distinction in the
// bench).
describe("the wired-bench law — the run is real, and authorship makes no difference", () => {
  const wiredBench = {
    stages: [
      { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "a harbour" } },
      {
        id: "s_1",
        card: "image-edit",
        // the spell + the edge: how a FromStage link is stored
        params: { model: "m1", input_images: ["$input_images"] },
        inputs: { input_images: { stage: "s_0", output: "default" } },
        outputs: { default: "image" },
      },
    ],
  };

  it("every stage composes and every wire rides into the merged run", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      wiredBench,
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the wired bench ran");
    const row = s.core.runs.get(ans.run_id) as unknown as {
      stages: Array<{ id: string; input_names?: Record<string, string> }>;
      inputNames?: Record<string, Record<string, string>>;
    };
    assert.equal(row.stages.length, 2, "BOTH stages are in the one run — not two runs, not one stage");
    // THE MERGE READS input_names (stage → {channel: "stage.output"}) —
    // the compiled edge map, which is where a FromStage link becomes a
    // link. Assert THAT, not the bench's storage shape: the bench row
    // is the input, the run's input_names is the wire.
    assert.deepEqual(
      row.inputNames,
      { s_0: {}, s_1: { input_images: "s_0.default" } },
      "THE WIRE RIDES — the run's input map is what the merged worker links " +
      "(s_0.default into the consuming stage), so the bench's edge is a real link, not a discarded row",
    );
  });

  it("an UNWIRED bench still takes the single-card arm (the re-route is precise, not eager)", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      { stages: [{ id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } }] },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the clean single-card run still registers");
    const row = s.core.runs.get(ans.run_id) as unknown as { stages: unknown[] };
    assert.equal(row.stages.length, 1, "one stage — the card arm, unchanged");
  });

  it("a SELF-wire is still named as the cycle it is (a cycle composes nothing, in any arm)", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: {} } },
      {
        stages: [{
          id: "s_1", card: "image-edit",
          params: { model: "m1", input_images: ["$input_images"] },
          inputs: { input_images: { stage: "s_1", output: "default" } },
        }],
      },
    );
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /SELF-WIRE/);
    assert.equal(s.core.runs.size, 0);
  });

  it("THE ENGINE IS DERIVED, NOT AUTHORED: a card stage with no engine composes (one schema for the whole bench)", async () => {
    // the same stage a hand-authored body would send: a card, params,
    // no engine. It must compose exactly like the GUI's row.
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      { stages: [{ id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } }] },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "an engine-less card stage composes — the door derives the card plane's engine");
  });
});

// ── THE WIRE CENSUS (benchWiring, the pure projection): the door's
//    self-wire and cross-wire discrimination reads THIS fold, so its
//    own tolerances are law — junk rows, junk inputs, and entries
//    that are not stage wires contribute NOTHING, and a wire's label
//    carries the output port only when it names one. ──────────────

describe("benchWiring (the pure wire census)", () => {
  it("junk rows and junk inputs contribute nothing, never throw", () => {
    const w = benchWiring({
      stages: [
        null,
        "a bare string row",
        { id: "s_0" },
        { id: "s_1", inputs: null },
        { id: "s_2", inputs: "junk" },
        { id: "s_3", inputs: ["array"] },
        { id: "s_4", inputs: {} },
      ],
    });
    assert.deepEqual(w, { cross: [], self: [] });
  });

  it("entries that are not stage wires are skipped, never guessed", () => {
    const w = benchWiring({
      stages: [
        {
          id: "s_0",
          inputs: {
            a: null,
            b: "a string binding",
            c: 42,
            d: { weird: true },
            e: { stage: 42, output: "x" },
          },
        },
      ],
    });
    assert.deepEqual(w, { cross: [], self: [] });
  });

  it("a wire's label names the output port only when it carries one, and self/cross split by target", () => {
    const w = benchWiring({
      stages: [
        {
          id: "s_1",
          inputs: {
            with_port: { stage: "s_0", output: "default" },
            bare: { stage: "s_0" },
            own: { stage: "s_1" },
          },
        },
      ],
    });
    assert.deepEqual(w.cross, ["with_port <- s_0.default", "bare <- s_0"]);
    assert.deepEqual(w.self, ["own <- s_1"]);
  });
});

// ── THE BENCH COMPOSE'S OWN TOLERANCES (composeBenchStages through
//    the start door): a junk row among the stages is skipped (the
//    good stages still compose), an id-less row is MINTED the
//    positional spelling, an array-shaped params bag reads as empty,
//    and a row that names no card REFUSES naming the stage. ────────

describe("the bench compose's tolerances", () => {
  it("a junk row is skipped; the good stage composes and the run registers", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      {
        stages: [
          null,
          "junk row",
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the junk rows cost nothing — the bench ran");
    assert.equal(s.core.runs.size, 1);
  });

  it("an id-less row and an array-shaped params bag both ride (minted id, empty params)", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      {
        stages: [
          // the wire promotes the start to the bench run (the
          // single-card arm would never read the minted id)
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            card: "image-edit",
            params: ["array-shaped"],
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
        ],
      },
    );
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } },
      sig(),
    )) as { run_id: string };
    assert.ok(ans.run_id !== "", "the minted id and emptied params compose");
    assert.equal(s.core.runs.size, 1);
  });

  it("a stage that names no card REFUSES naming the stage — the bench composes card stages only", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      {
        stages: [
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
          { id: "s_2", params: { tool: "mcp-row" } },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /bench stage "s_2" names no card/);
    assert.match(err.message, /belongs in a flow, not the bench/);
    assert.equal(s.core.runs.size, 0);
  });

  it("a row whose card is not a string REFUSES the same way (never coerced)", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
      {
        stages: [
          // the wire promotes the start to the bench run (the
          // single-card arm would never read the junk row)
          { id: "s_0", card: "image-gen", params: { model: "m1", prompt: "x" } },
          {
            id: "s_1",
            card: "image-edit",
            params: { input_images: ["$input_images"] },
            inputs: { input_images: { stage: "s_0", output: "default" } },
          },
          { id: "s_2", card: 42, params: { tool: "coerced" } },
        ],
      },
    );
    const err = await remote(() =>
      s.svc.start({ draft_id: "d1", test: false, model: "m1", params: { prompt: "x" } }, sig()),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /bench stage "s_2" names no card/);
  });

  it("a junk row in a hand-authored flow_inline is skipped by the derive, then REFUSED by the compile gate — never a half flow", async () => {
    const s = modelDoorSeat(
      { SaveImage: { class_type: "SaveImage", inputs: { filename_prefix: "gen" } } },
    );
    const err = await remote(() =>
      s.svc.start(
        inlineBody({
          flow_inline: {
            id: "x",
            stages: [
              null,
              "junk row",
              { id: "s", card: "image-gen", engine: "comfyui", params: {} },
            ],
          },
        }),
        sig(),
      ),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.equal(s.core.runs.size, 0, "the junk row costs the whole flow its start");
  });
});

describe("the declared initials ride the run", () => {
  it("an initial the extractor refuses stops the run before any stage composes", async () => {
    // THE GATE-BLESSED INITIALS: the extractor walks the flow's own
    // initialValidators and refuses a value the kind cannot hold (a
    // photo must be a path string or {path}). The refusal is the
    // flow's own voice, carried at loc body — the run never reaches
    // the merge that would resolve the $spell over this key.
    const s = seat();
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, flow: "anny-hmr-commercial", photo: 7 },
        sig(),
      ),
    );
    assert.equal(err.code, "runs/invalid-request");
    assert.match(err.message, /initial "photo"/);
    assert.match(err.message, /must be a file path string/);
    const details = (err as unknown as { details?: Record<string, unknown> }).details ?? {};
    assert.equal(details["loc"], "body", "the refusal rides the body, not a stage");
    assert.equal(s.core.runs.size, 0);
  });
});
