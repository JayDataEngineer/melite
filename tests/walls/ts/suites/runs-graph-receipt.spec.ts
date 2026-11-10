/**
 * runs-graph-receipt.spec.ts — THE SERVED-GRAPH RECEIPT WALL (the
 * silent UI-drop purge's P1, dev_docs/audits/
 * ui-engine-fidelity-purge-2026-11-08.md §7).
 *
 * THE WALL, one line: "every run's _flow.json carries a
 * `graph_receipt` — the queue-time evidence of which doc scalars the
 * composed graph actually carries — and the run view shows the
 * verdict."
 *
 * THE BURN IT GUARDS (the purge's entering wound): a knob the UI
 * showed, the doc saved, and the compose silently dropped — every
 * seat between was green because no seat judged the DOC→GRAPH hop.
 * The receipt is EVIDENCE, never a refusal: the compose gate owns
 * refusals; a dropped key is a receipt fact (verdict 'partial',
 * dropped names it) that the operator's run tile and the P0 census
 * consume.
 *
 * THE ARMS:
 *   a — THE RECEIPT IS STAMPED: a real compose through the estate
 *       queue harness (the draft door → composeBenchStages →
 *       composeCardStageRow → registerCompiledRun) with a synth card
 *       def whose compose emits a graph carrying every declared
 *       scalar → _flow.json's graph_receipt.verdict === 'complete',
 *       dropped [], nodes > 0, populated names the doc scalars
 *       sorted. (RED TODAY: the key does not exist — the
 *       pre-registered red of the seated cure.)
 *   b — THE DROP IS NAMED: a doc scalar the synth compose does NOT
 *       carry → verdict 'partial', dropped names it SORTED.
 *   c — THE BAGS ARE OUT OF SCOPE BY LAW: an array doc key and an
 *       object doc key appear in NEITHER populated nor dropped (the
 *       v1 scope line — the bag/class planes have lawful transforms;
 *       v1 receipts the scalar plane).
 *   d — THE EXECUTE STAMP: after the pump has claimed and executed,
 *       the settled receipt carries prompt_id — the engine-minted
 *       EngineRef, stamped at the execute outcome fold (the claim
 *       rewrite runs BEFORE POST /prompt mints the id, so the
 *       earliest estate seat that can see it is the execute
 *       outcome; settle's sidecar rewrite carries it to disk).
 *   e — THE REAL-BUILD TOGGLE: the REAL music3 DECL through the
 *       real door (phase1Card+phase2Card, hermetic boot) receipts
 *       its admitted body — control verdict partial with dropped
 *       ["model"] ONLY (the routing residue: the admitted body
 *       carries model but no graph input spells the bare family
 *       id — named here, never hidden), every stated scalar
 *       carried; the carriage twin (caption present-but-unwired)
 *       names prompt in dropped. The audit's specified toggle —
 *       delete `caption: p.prompt` at music3 actions — reds this
 *       arm LOUDER than the twin: a phase-1 missing-required
 *       refusal naming caption, before any receipt is judged (the
 *       true-absent drop is refusal-gated, the unwired drop is
 *       receipt-gated — the arm's closing comment carries the
 *       verbatim refusal and the presence-keying wart).
 *   h — THE RUN-fcf9572a HONESTY FACE: the stuck run's envelope
 *       scalars (draft_id/model/press_key/quant/variant) receipt
 *       partial naming EXACTLY those keys SORTED; the
 *       verdict↔dropped biconditional (partial ⟺ dropped non-empty)
 *       and the run/stage fold agreement (run complete iff every
 *       stage complete) hold on every row.
 *
 * THE RED-PROOF (registry row runs-graph-receipt): neutralize the
 * stamp in registerCompiledRun (runsStart.ts — `run.graphReceipt =
 * graphReceiptFoldOf(rows)`, the toggle named on the row) → arm (a)
 * reds with the missing-key face (all four arms fail — b/c/d ride
 * the stamped receipt); restore → green. (The sidecarDocFor line is
 * NOT the toggle: the claim/settle rewrites re-carry the in-memory
 * receipt, so only the stamp kills the key end to end.)
 *
 * Run: npx vitest run tests/walls/ts/suites/runs-graph-receipt.spec.ts
 */
// THE HERMETIC ENGINE, FIRST IMPORT (the boot-models first-import
// law — the ARM-e door composes through the real CardRegistryService
// and prime() fetches /object_info: the mock registers before any
// estate barrel evaluates, so arms a–d's fetch-free rig is
// unaffected and ARM e never dials a live engine).
import "../../../helpers/hermetic-engine.ts";
// THE MODELS BOOT, SECOND (the per-file boot brick — the served
// families table the card defs resolve through).
import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { onTestFinished } from "vitest";

/** A bounded-retry rm for the wall's state homes (the provisioner-boot
 * idiom): the runs seat's writes can trail the test's own lifetime by a
 * beat on a loaded CI pool — rmdir then hits ENOTEMPTY and the WALL's
 * verdict drowns in a teardown flake. Never silent: foreign errnos
 * throw, retries are bounded. */
const rmState = (dir: string): void => {
  onTestFinished(async () => {
    for (let attempt = 0; ; attempt++) {
      try { rmSync(dir, { recursive: true, force: true }); return } catch (err) {
        if (attempt >= 4 || !["EBUSY", "ENOTEMPTY", "EPERM"].includes((err as NodeJS.ErrnoException).code ?? "")) throw err
        await new Promise((r) => setTimeout(r, 250))
      }
    }
  })
}
import assert from "node:assert/strict";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { ComfyUIHostService } from "@melite/comfyui-cordis";
import type { EngineJson, FlowResult, MergeRow } from "@melite/comfyui-cordis";
// ARM-e imports (the real-door seat — the music wall's proven shape):
// the door, the admission coercion the card arm receipts, the receipt
// spine itself, the card's action bindings (the corruption seam), the
// music3 DECL, and the lane overlay the hermetic gate reads.
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { coerceSnapshotBody } from "../../../../packages/harness/estate-queue/src/runsValidateStages.ts";
import { graphReceiptOf } from "../../../../packages/harness/estate-queue/src/queueSidecar.ts";
import type { GraphReceiptPair } from "../../../../packages/harness/estate-queue/src/queueSidecar.ts";
import { ACTION_BINDINGS } from "../../../../packages/audio/music/src/card.ts";
import { ACTION_BINDINGS as H3_BINDINGS } from "../../../../packages/video/h3-timeline/src/card.ts";
import { DECL as music3Decl } from "@melite/models-music3";
import { DECL as h3Decl } from "@melite/models-h3";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { LOADED_WAIT } from "../../../helpers/loaded-wait.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { RunsRuntimeService } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { outRootFor } from "../../../../packages/harness/estate-queue/src/queueLock.ts";
import { QueueCore } from "../../../../packages/harness/estate-queue/src/queueCore.ts";
import type { RunRecord } from "../../../../packages/harness/estate-queue/src/runsTypes.ts";

// ── THE RIG (the runs-registry-doors harness shape: a real
// RunsRuntimeService over a real QueueCore, the card registry a
// structural fake whose synth compose emits a graph carrying the
// doc scalars the arms declare, the engine a cordis-mounted
// ComfyUIHostService subclass — the same dispatch needComfyUI
// resolves on the lane). No HTTP rig, no live engine socket. ──

/** The synth graph the fake compose emits: node "1" carries the
 *  doc scalars at input seats; node "2" is the save. `carry` names
 *  WHICH doc keys this boot's compose carries — arm (b) drops one
 *  by not listing it. */
interface SynthDoc {
  prompt: string;
  steps: number;
  guidance: number;
  /** Extra SCALAR doc entries the synth compose deliberately does
   *  not carry — arm (b)'s dropped keys. */
  orphans?: Record<string, string | number | boolean>;
}

const synthGraphOf = (doc: SynthDoc): Record<string, unknown> => {
  const inputs: Record<string, unknown> = {
    text: doc.prompt,
    steps: doc.steps,
    guidance: doc.guidance,
  };
  return {
    "1": { class_type: "ReceiptEncode", inputs },
    "2": { class_type: "ReceiptSave", inputs: { images: ["1", 0] } },
  };
};

interface Rig {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
}

const rig = (doc: SynthDoc): Rig => {
  const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-"));
  rmState(state);
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = {
    core,
    stateRoot: state,
    stateRoots: [state],
  };
  // the bench doc the draft door reads (draftsRemote fake — the
  // doors-spec pattern): one card stage whose params ARE the doc.
  const benchDoc = {
    draft_id: "d1",
    status: "draft",
    createdAt: 1700000000000,
    intent: "receipt bench",
    stages: [
      {
        id: "s_0",
        card: "receipt-card",
        engine: "comfyui",
        params: {
          prompt: doc.prompt,
          steps: doc.steps,
          guidance: doc.guidance,
          ...(doc.orphans ?? []),
          // the BAG PLANE (arm c): an array key and an object key —
          // the v1 receipt never receipts them either way.
          ref_images: ["a.png"],
          blend: { mode: "x" },
        },
        inputs: [],
      },
    ],
  };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id === "d1") return benchDoc;
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  // THE SYNTH DEF (the runs-registry-doors card fake shape): phase 1
  // admits the body verbatim (family-less — the lane presence gate
  // never fires), phase 2 emits the synth graph.
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown => new Map(),
    primeObjectInfo: async (): Promise<boolean> => true,
    // THE SPARING'S DECL LOOKUP (queue 12's file plane): the
    // reserved-lift sparable branch reads cardDecls — the fake seats
    // no card DECLs, so every reserved key keeps lifting (the
    // blanket law the doors wall pins on the real registry).
    cardDecls: (): unknown => ({}),
    phase1Card: async (body: Record<string, unknown>) => ({
      mid: "receipt-model",
      fam: "",
      modelId: "receipt-model",
      card: "receipt-card",
      skeleton: "receipt-skel",
      decl: { spells: [] },
      params: body,
      familyless: true,
      spell: null,
    }),
    phase2Card: async () => ({
      graph: synthGraphOf(doc),
      skeleton: "receipt-skel",
      spell: null,
      outputs: { default: "image" },
      outputNodes: { default: "2" },
    }),
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state };
};

/** The engine seat (the doors-spec FakeEngine shape): one prompt id
 *  minted per run, every submitted row settles clean — the result
 *  echoes the submitted stage ids (the P7 B1 law: a submitted stage
 *  with no result row fails the run, so the stub answers every row). */
class ReceiptEngine extends ComfyUIHostService {
  promptId = "receipt-prompt-0001";
  constructor(ctx: Context) {
    super(ctx as unknown as never, {});
  }
  override executeFlow(
    rows: MergeRow[],
    _runDir: string,
    _inputNames: Record<string, Record<string, string>>,
    _initials: Record<string, EngineJson>,
    _opts: { shouldStop?: () => boolean; report?: (u: Record<string, EngineJson>) => void } = {},
  ): Promise<FlowResult> {
    return Promise.resolve({
      stages: Object.fromEntries(
        rows.map((row) => [row.stageId, { outputs: {}, artifacts: [] }]),
      ),
      promptId: this.promptId,
    });
  }
}

/** Drive the bench door: {test, draft_id} over a bench doc → the
 *  bench run composes, registers, the pump runs it, settle lands. */
const runBench = async (doc: SynthDoc): Promise<{ run: RunRecord; dir: string; sidecar: Record<string, unknown>; state: string }> => {
  const { svc, core, state } = rig(doc);
  new ReceiptEngine(ctxOf(svc));
  const sig = new AbortController().signal;
  const answer = (await svc.start({ test: true, draft_id: "d1" }, sig)) as { run_id: string };
  const run = await settleWait(core, answer.run_id);
  assert.equal(run.status, "completed", "the run settles completed: " + String(run.error));
  const dir = join(outRootFor(state, true), answer.run_id);
  const sidecar = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8")) as Record<string, unknown>;
  return { run, dir, sidecar, state };
};

/** ARM d's disk-settle gate (the WALL B4 law): `settleWait` returns
 *  on the IN-MEMORY status flip, but the stamp this arm judges is
 *  carried by the settle's SIDECAR REWRITE — an eventually-landed
 *  disk write that can trail the flip by a beat on a loaded CI pool
 *  (run 42234004503, ubuntu: prompt_id undefined on a complete
 *  receipt). The arm re-reads `_flow.json` until the stamp lands,
 *  bounded by the shared settle budget; starving the budget throws
 *  LOUD rather than judging the pre-stamp frame. */
const stampedReceipt = async (dir: string): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + LOADED_WAIT();
  for (;;) {
    const receipt = JSON.parse(readFileSync(join(dir, "_flow.json"), "utf8"))["graph_receipt"] as Record<string, unknown>;
    if (receipt !== undefined && receipt["prompt_id"] !== undefined) return receipt;
    if (Date.now() >= deadline) {
      throw new Error("the execute stamp never reached the sidecar: " + JSON.stringify(receipt));
    }
    await new Promise((r) => setTimeout(r, 50));
  }
};

const ctxOf = (svc: RunsRuntimeService): Context =>
  (svc as unknown as { ctx: Context }).ctx;

const settleWait = async (core: QueueCore, runId: string): Promise<RunRecord> => {
  for (let i = 0; i < 500; i++) {
    const row = core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined && (row.status === "completed" || row.status === "failed")) return row;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("pump never settled " + runId);
};

// ── THE ARMS ─────────────────────────────────────────────────────

/** ARM-e rig: the REAL music3 door (the music wall's proven hermetic
 *  seat — prime through the mocked liveObjectInfo, the lane overlay
 *  materializing the DECLared weights) + the card arm's OWN
 *  admission coercion, receipted by the receipt spine. `corrupt`
 *  rewrites the build inputs the way the audit's toggle does by
 *  hand (identity = control; a prompt swap = the caption twin). */
const realMusicReceipt = async (
  corrupt: (p: Record<string, unknown>) => Record<string, unknown>,
): Promise<GraphReceiptPair> => {
  const MARKER = "ARM-E marker ZZQ-P1-7741 the courier steps in";
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-arme-"));
  rmState(state);
  (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
  const door = new CardRegistryService(ctx);
  await door.prime();
  installLaneStoreOverlay();
  try {
    const body = {
      model: "music3",
      prompt: MARKER,
      lyrics: "[verse]\nZZQ-LYRIC-7741 tonight",
      duration: 77,
      guidance_scale: 2.5,
      n_diffusion_steps: 64,
      lm_cfg_scale: 3.5,
      seed: 4242,
    };
    const admitted = coerceSnapshotBody(door.defsSync().get("music")!, body);
    const original = ACTION_BINDINGS[music3Decl.id]!;
    ACTION_BINDINGS[music3Decl.id] = (p, model, g, runId) => original(corrupt(p), model, g, runId);
    try {
      const p1 = await door.phase1Card(body, "music3");
      const ran = await door.phase2Card(p1, "receipt_arm_e");
      return graphReceiptOf(admitted, { workflow: (ran as { graph: unknown }).graph });
    } finally {
      ACTION_BINDINGS[music3Decl.id] = original;
    }
  } finally {
    restoreLaneStoreOverlay();
  }
};

describe("runs-graph-receipt (the served-graph receipt, purge P1)", () => {
  it("ARM a — THE RECEIPT IS STAMPED: the composed run's sidecar carries graph_receipt, verdict complete, dropped empty, nodes > 0, populated names the doc scalars", async () => {
    const { sidecar } = await runBench({ prompt: "the courier steps in", steps: 12, guidance: 3.5 });
    const receipt = sidecar["graph_receipt"] as Record<string, unknown> | undefined;
    assert.ok(receipt !== undefined, "THE PRE-REGISTERED RED (the cure is seated): _flow.json carries no graph_receipt key — the queue-time doc→graph evidence does not exist");
    assert.equal(receipt["verdict"], "complete", "every declared scalar rode: " + JSON.stringify(receipt));
    assert.deepEqual(receipt["dropped"], [], "nothing dropped");
    assert.ok(typeof receipt["nodes"] === "number" && (receipt["nodes"] as number) > 0, "the node count is stamped");
    assert.deepEqual(receipt["populated"], ["guidance", "prompt", "steps"], "populated names the doc scalars, sorted");
    assert.deepEqual(receipt["carried"], ["guidance", "prompt", "steps"], "carried mirrors populated on the complete face");
    // THE PER-STAGE ROWS (the [{stage, ...receipt}] shape)
    const stages = receipt["stages"] as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(stages) && stages.length === 1, "one stage row");
    assert.equal(stages[0]!["stage"], "s_0", "the row names the bench stage id");
    assert.equal(stages[0]!["verdict"], "complete");
  });

  it("ARM b — THE DROP IS NAMED: a scalar the compose ignores lands in dropped, sorted, verdict partial — the honesty face", async () => {
    const { sidecar } = await runBench({
      prompt: "the courier steps in",
      steps: 12,
      guidance: 3.5,
      // spelled so the SORT is provable, not just the presence
      orphans: { orphan_zed: 42, orphan_ash: "scar" },
    });
    const receipt = sidecar["graph_receipt"] as Record<string, unknown>;
    assert.ok(receipt !== undefined, "the receipt exists (arm a's cure)");
    assert.equal(receipt["verdict"], "partial", "a dropped scalar is a receipt fact: " + JSON.stringify(receipt));
    assert.deepEqual(receipt["dropped"], ["orphan_ash", "orphan_zed"], "dropped names the ignored scalars, SORTED");
    assert.deepEqual(
      receipt["carried"],
      ["guidance", "prompt", "steps"],
      "carried keeps the scalars the graph took",
    );
    assert.deepEqual(
      (receipt["populated"] as string[]).sort(),
      ["guidance", "orphan_ash", "orphan_zed", "prompt", "steps"],
      "populated is every declared scalar; carried/dropped partition it",
    );
  });

  it("ARM c — THE BAGS ARE OUT OF SCOPE BY LAW: array and object doc keys ride NEITHER populated NOR dropped", async () => {
    const { sidecar } = await runBench({ prompt: "the courier steps in", steps: 12, guidance: 3.5 });
    const receipt = sidecar["graph_receipt"] as Record<string, unknown>;
    const populated = receipt["populated"] as string[];
    const dropped = receipt["dropped"] as string[];
    for (const bag of ["ref_images", "blend"]) {
      assert.ok(!populated.includes(bag), bag + " is not receipted as populated (the v1 scalar-plane scope)");
      assert.ok(!dropped.includes(bag), bag + " is not receipted as dropped (the bag plane's transforms are not v1 drops)");
    }
  });

  it("ARM d — THE EXECUTE STAMP: after the pump claimed and ran, the settled receipt carries the engine's prompt_id", async () => {
    const { dir } = await runBench({ prompt: "the courier steps in", steps: 12, guidance: 3.5 });
    const receipt = await stampedReceipt(dir);
    assert.equal(
      receipt["prompt_id"],
      "receipt-prompt-0001",
      "the engine-minted prompt_id rides the receipt after the execute outcome (the settle rewrite carries it to disk): " + JSON.stringify(receipt),
    );
  });

  it("ARM d2 — THE STAMP'S TOLERANCE: a run with no receipt stamps nothing, and a non-string prompt id never reaches the receipt", async () => {
    // Guard 1 (the receipt-less run): an INLINE envelope carries no
    // card compose, so registerCompiledRun stamped nothing — the
    // execute's stamp folds onto nothing and the run still settles
    // clean (the guard's own law, not a skip).
    const bare = rig({ prompt: "the courier steps in", steps: 12, guidance: 3.5 });
    // the engine seat must be registered for the pump to execute —
    // the construction IS the registration (cordis service ctor).
    new ReceiptEngine(ctxOf(bare.svc));
    const inline = await bare.svc.start(
      {
        test: true,
        flow_inline: {
          id: "x",
          stages: [{
            id: "s",
            engine: "comfyui",
            params: { workflow: { "1": { class_type: "UNETLoader", inputs: {} } } },
            outputs: { out: "image" },
          }],
        },
      } as Parameters<typeof bare.svc.start>[0],
      new AbortController().signal,
    ) as { run_id: string };
    const bareRun = await settleWait(bare.core, inline.run_id);
    assert.equal(bareRun.status, "completed", "the receipt-less inline run settles clean: " + String(bareRun.error));
    assert.equal(bareRun.graphReceipt, undefined, "no compose, no receipt — the stamp had nothing to fold");

    // Guard 2 (the non-string id): the engine minted no prompt id —
    // the composed run's queue-time receipt survives the execute
    // WITHOUT a prompt_id rather than stamping a non-string.
    const ridged = rig({ prompt: "the courier steps in", steps: 12, guidance: 3.5 });
    const engineSilent = new ReceiptEngine(ctxOf(ridged.svc));
    engineSilent.promptId = undefined as unknown as string;
    const answer2 = (await ridged.svc.start({ test: true, draft_id: "d1" }, new AbortController().signal)) as { run_id: string };
    const silentRun = await settleWait(ridged.core, answer2.run_id);
    assert.equal(silentRun.status, "completed", "the silent-id run settles clean: " + String(silentRun.error));
    assert.ok(silentRun.graphReceipt !== undefined, "the queue-time receipt stands");
    assert.equal(silentRun.graphReceipt?.["prompt_id"], undefined, "a non-string id never reaches the receipt");
  });

  it("ARM e — THE REAL-BUILD TOGGLE: the real music3 door carries the stated prompt (control); the unwired caption names prompt in dropped (carriage twin); the truly-absent caption refuses loud naming caption (toggle face, documented below)", async () => {
    // THE AUDIT'S SPECIFIED TOGGLE (P1 recon gap A): arm (b)
    // synthesizes its drop through a fake compose — this arm drives
    // the REAL music3 DECL through the REAL door (phase1Card +
    // phase2Card, hermetic boot: the music wall's proven rig) and
    // receipts the SAME admitted body the card arm judges
    // (coerceSnapshotBody — runsRegistry.ts:1473). The marker prompt
    // carries a sentinel so the BY-VALUE diff cannot collide.
    const control = await realMusicReceipt((p) => p);
    assert.ok(control.nodes > 0, "the real door composed a non-empty graph");
    assert.equal(control.verdict, "partial", "control verdict: " + JSON.stringify(control));
    assert.deepEqual(control.dropped, ["model"],
      "control drops ONLY the routing residue (the admitted body carries model but no graph input spells the bare family id — named, never hidden): " + JSON.stringify(control));
    assert.deepEqual(control.carried,
      ["duration", "guidance_scale", "lm_cfg_scale", "lyrics", "n_diffusion_steps", "prompt", "seed"],
      "every stated scalar rode, the marker prompt among them: " + JSON.stringify(control));
    // THE CORRUPTION TWIN: the build's caption key toggled out (the
    // audit's toggle — delete `caption: p.prompt` at music3 actions)
    // must name prompt in dropped while everything else still rides.
    const twin = await realMusicReceipt((p) => ({ ...p, prompt: "ZZQ-CORRUPTED-CAPTION — the compose never saw the marker" }));
    assert.equal(twin.verdict, "partial", "twin verdict: " + JSON.stringify(twin));
    assert.deepEqual(twin.dropped, ["model", "prompt"],
      "the caption-dropped compose names prompt in dropped, SORTED beside the residue: " + JSON.stringify(twin));
    assert.ok((twin.populated as string[]).includes("prompt"), "prompt stays populated (stated non-empty) — the twin judges carriage, never presence");
    // THE TRUE-ABSENCE FACE (proven by the audit's source toggle,
    // not by a twin — and the twin attempt below is WHY): deleting
    // `caption: p.prompt` at music3 actions reds this arm with a
    // phase-1 REFUSAL before any receipt is judged (verbatim toggle
    // red-output, recorded on the registry row's receipt):
    //   "card_compose phase 1: missing-required: card 'music' built
    //    node 'MiniMaxMusic3TextEncode.0' (MiniMaxMusic3TextEncode)
    //    without its declared-required input 'caption'".
    // A binding-level twin CANNOT replicate it: `delete q.prompt`
    // feeds the action caption: undefined, and the required gate is
    // presence-keyed (the key rides with an undefined value) — the
    // compose RESOLVES and the receipt judges it as unwired
    // carriage (prompt dropped), the carriage twin's face above. So
    // the true-absent drop is refusal-gated (loud, field-named)
    // while the present-but-unwired drop is receipt-gated (partial,
    // field-named) — both faces named, neither silent. (A
    // delete-then-rejects assertion was tried here and FAILED
    // honest with "Missing expected rejection" — the gate's
    // presence-keying is documented, not pinned: a wart for a
    // future gate-tightening row, not this wall's law to enshrine.)
  });

  // ── THE NO-SRC ROW RE-PROBE (F3-06, R-P3-16 — the friction log's
  // closing probe): the source-less refusal existed at the parse leaf
  // (filmMix.ts, armed in film-mix.spec.ts) but the row had to be
  // proven dead at the REAL COMPOSE DOOR too — any path that still
  // admits is a phantom row the run performs without saying so (the
  // {gain:0.5} burn: green run, silent no-op). The arm drives the
  // real h3 film door (phase1Card + phase2Card, the ARM-f rig's
  // shape) and closes the row: both source-less shapes refuse at the
  // compose in the leaf's own voice, the lawful src row composes.
  it("THE NO-SRC ROW RE-PROBE (F3-06): a film body whose audio_clips row carries no src refuses AT THE COMPOSE DOOR in the row's own voice — the leaf's law composes nowhere else", async () => {
    const phase2Film = async (audioClips: unknown): Promise<unknown> => {
      const ctx = new Context();
      new FlowsSeatService(ctx);
      const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-nosrc-"));
      rmState(state);
      (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
      const door = new CardRegistryService(ctx);
      await door.prime();
      installLaneStoreOverlay();
      try {
        const body = {
          model: "h3",
          width: 768, height: 448, steps: 8,
          calls: [
            { text: "a slow push in", start_frame: 0, end_frame: 56 },
            { text: "then a turn", start_frame: 56, end_frame: 124 },
          ],
          length: 124,
          audio_clips: audioClips,
        };
        const p1 = await door.phase1Card(body, "h3");
        return door.phase2Card(p1, "nosrc_reprobe");
      } finally {
        restoreLaneStoreOverlay();
      }
    };
    // THE BURN SHAPE (a stated, source-less row — the silent no-op
    // that performed nothing on a green run)
    await assert.rejects(phase2Film([{ gain: 0.5 }]), /a clip row has no src — the film mix cannot mix a source-less row; state src or drop the row/);
    // THE POSITIONED SHAPE (a placed seat with no source — a lost
    // take, not junk)
    await assert.rejects(phase2Film([{ id: "take-2", start_frame: 24, dur_frames: 48 }]), /a positioned clip row has no src — the film mix cannot place a source-less row/);
    // THE CONTROL: a lawful src row composes green (the door refuses
    // only the source-less class — never the clips lane itself)
    const composed = await phase2Film([{ src: "bells.flac", start_frame: 24 }]) as { graph: unknown };
    assert.ok(composed.graph !== undefined, "the lawful src row composed a graph");
  });

  // ── THE BAKE'S PRICE RIG (arm f's h3 twin of the arm-e rig): the
  // REAL h3 door, the stated bake dials at NON-DEFAULT poles, the
  // refmod image as a run-level ref_mods entry. `corrupt` rewrites
  // the build inputs the way a receipt-side toggle would (identity:
  // pass-through = control).
  const realH3Receipt = async (
    corrupt: (p: Record<string, unknown>) => Record<string, unknown>,
  ): Promise<GraphReceiptPair> => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-armf-"));
    rmState(state);
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    const door = new CardRegistryService(ctx);
    await door.prime();
    installLaneStoreOverlay();
    try {
      const body = {
        model: "h3",
        width: 768, height: 448, steps: 8,
        refmod_mode: "Full Reference",
        refmod_pool: 32,
        refmod_identity: 1000,
        refmod_save: false,
        ref_mods: ["refs/refmod_identity.png"],
        calls: [
          { text: "a slow push in", start_frame: 0, end_frame: 56 },
          { text: "then a turn", start_frame: 56, end_frame: 124 },
        ],
        length: 124,
      };
      const admitted = coerceSnapshotBody(door.defsSync().get("h3-timeline")!, body);
      const original = H3_BINDINGS[h3Decl.id]!;
      H3_BINDINGS[h3Decl.id] = (p, model, g, runId) => original(corrupt(p), model, g, runId);
      try {
        const p1 = await door.phase1Card(body, "h3");
        const ran = await door.phase2Card(p1, "receipt_arm_f");
        return graphReceiptOf(admitted, { workflow: (ran as { graph: unknown }).graph });
      } finally {
        H3_BINDINGS[h3Decl.id] = original;
      }
    } finally {
      restoreLaneStoreOverlay();
    }
  };

  it("ARM f — THE BAKE'S PRICE: the receipt carries the bake record from the COMPOSED GRAPH — mode/pool/refinement-steps/save verbatim, the visual-ref count, the window count, and the run-voice price string (study §7 item 2)", async () => {
    // THE PRE-REGISTERED RED (the cure is the receipt-side bake
    // detection): today the receipt pairs carry no bake record —
    // the arm reads `bake` and refuses its absence.
    const control = await realH3Receipt((p) => p);
    assert.ok(control.nodes > 0, "the real h3 door composed a non-empty graph");
    const bake = control.bake;
    assert.ok(bake !== undefined, "THE PRE-REGISTERED RED (the cure is seated): the receipt carries no bake record — " + JSON.stringify(control));
    assert.equal(bake.mode, "Full Reference", "the bake mode is the stated pole, read off the extract node: " + JSON.stringify(bake));
    assert.equal(bake.pool, 32, "the pool is the stated pole");
    assert.equal(bake.refinement_steps, 1000, "the refinement steps (identity) are the stated pole");
    assert.equal(bake.save, false, "the save pole rides");
    assert.equal(bake.visual_refs, 1, "one visual ref baked");
    assert.ok(bake.windows >= 1, "the window count derives from the graph (" + String(bake.windows) + ")");
    assert.equal(
      bake.price,
      "bake: 1000 refinement steps × 1 ref × " + String(bake.windows) + " windows",
      "the run voice prices the bake: " + bake.price,
    );
    // THE CORRUPTION TWIN: a dial the compose never saw (pool
    // rewritten to 8 under the receipt) is a RECEIPT fact — the
    // bake record reads the GRAPH, never the doc, so the twin's
    // pool reads 8 and the price follows. The bake record cannot
    // lie about what the graph states.
    const twin = await realH3Receipt((p) => ({ ...p, refmod_pool: 8 }));
    assert.ok(twin.bake !== undefined, "the twin composes and receipts the bake");
    assert.equal(twin.bake.pool, 8, "the twin's bake reads the graph's pool, not the doc's: " + JSON.stringify(twin.bake));
    assert.equal(twin.bake.mode, "Full Reference", "the untouched dial still rides verbatim");
  });

  it("ARM g — NO PHANTOM BAKE: an h3 compose with no refmod seat carries NO bake record — the receipt never invents a bake the graph does not contain", async () => {
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-armg-"));
    rmState(state);
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    const door = new CardRegistryService(ctx);
    await door.prime();
    installLaneStoreOverlay();
    try {
      const body = {
        model: "h3",
        width: 768, height: 448, steps: 8,
        calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }],
        length: 56,
      };
      const admitted = coerceSnapshotBody(door.defsSync().get("h3-timeline")!, body);
      const p1 = await door.phase1Card(body, "h3");
      const ran = await door.phase2Card(p1, "receipt_arm_g");
      const receipt = graphReceiptOf(admitted, { workflow: (ran as { graph: unknown }).graph });
      assert.ok(receipt.nodes > 0, "the bare film composes");
      assert.equal(receipt.bake, undefined, "no refmod seat in the graph, no bake in the receipt: " + JSON.stringify(receipt.bake));
    } finally {
      restoreLaneStoreOverlay();
    }
  });

  it("ARM h — THE RUN-fcf9572a HONESTY FACE: a partial verdict names its dropped keys, and the run fold agrees with its stages", async () => {
    // THE BURN (stuck-run receipt remainder 4, 2026-11-09 night):
    // run-fcf9572a5ffb-5ba89b44 settled completed with
    // graph_receipt.verdict "partial", dropped ["draft_id", "model",
    // "press_key", "quant", "variant"] (bench-door envelope scalars the
    // compose never wires), carried ["test"]. The honesty seam: a
    // partial verdict MUST name its dropped keys — the judge that says
    // so is this arm. It pins (i) the run's exact envelope vocabulary
    // on the synth rig, (ii) the verdict↔dropped biconditional
    // (partial ⟺ dropped non-empty, on every stage row), (iii) the
    // run/stage fold agreement (run complete iff every stage
    // complete).
    const { sidecar } = await runBench({
      prompt: "the courier steps in",
      steps: 12,
      guidance: 3.5,
      orphans: { draft_id: "d1", model: "receipt-model", press_key: "k", quant: "q", variant: "v" },
    });
    const receipt = sidecar["graph_receipt"] as Record<string, unknown>;
    assert.ok(receipt !== undefined, "the receipt exists (arm a's cure)");
    assert.equal(receipt["verdict"], "partial", "envelope scalars the compose never wires are a receipt fact: " + JSON.stringify(receipt));
    assert.deepEqual(
      receipt["dropped"],
      ["draft_id", "model", "press_key", "quant", "variant"],
      "dropped names EXACTLY the unwired envelope scalars, SORTED: " + JSON.stringify(receipt),
    );
    assert.deepEqual(
      receipt["carried"],
      ["guidance", "prompt", "steps"],
      "carried keeps the scalars the graph took: " + JSON.stringify(receipt),
    );
    assert.deepEqual(
      (receipt["populated"] as string[]).sort(),
      ["draft_id", "guidance", "model", "press_key", "prompt", "quant", "steps", "variant"],
      "populated is every judged scalar; carried/dropped partition it",
    );
    // THE BICONDITIONAL + THE FOLD (the judge): no partial without
    // named drops, no complete with drops, and the run verdict is the
    // AND of its stages.
    const stages = receipt["stages"] as Array<Record<string, unknown>>;
    assert.ok(stages.length === 1 && stages[0]!["stage"] === "s_0", "one stage row");
    for (const s of stages) {
      const dropped = s["dropped"] as string[];
      if (s["verdict"] === "partial") {
        assert.ok(dropped.length > 0, "a partial stage row names its dropped keys: " + JSON.stringify(s));
        assert.deepEqual([...dropped].sort(), dropped, "the stage drops ride SORTED: " + JSON.stringify(s));
      } else {
        assert.deepEqual(dropped, [], "a complete stage row drops nothing: " + JSON.stringify(s));
      }
    }
    assert.equal(
      receipt["verdict"],
      stages.every((s) => s["verdict"] === "complete") ? "complete" : "partial",
      "the run verdict is the AND of its stages: " + JSON.stringify(receipt),
    );
  });
});

// ── THE DROPPED-KNOB ALLOWABILITY LAW (F3-04, 2026-11-15) ──
// The receipt admits params can fall out of compilation; this law
// judges WHICH falls are ALLOWED. Arms (i)/(j) import beside the
// ARM-e imports above: the declaration leaf + the real registry
// roster the sweep rides.
import { CARD_DROPPABLE, unjustifiedDropped } from "../../../../packages/harness/estate-queue/src/cardsDroppable.ts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";

describe("runs-graph-receipt — THE DROPPED-KNOB ALLOWABILITY LAW (F3-04)", () => {
  it("ARM i — THE RIG-P0-15 SHAPE: a declared router drop is justified; the same drop undeclared, or a stray key beside it, is the unjustified drop this law reds on", () => {
    const rigReceipt = {
      nodes: 2,
      populated: ["mode", "source_glb"],
      carried: ["source_glb"],
      dropped: ["mode"],
      verdict: "partial" as const,
    };
    assert.deepEqual(unjustifiedDropped(rigReceipt, "rig"), [],
      "the rig's mode drop carries its declared reason (the lane router) — justified, never a finding");
    assert.deepEqual(unjustifiedDropped(rigReceipt, "anny"), ["mode"],
      "the SAME drop on a card that declares it not — the silent fall-out-of-compilation the law exists to red");
    const stray = { ...rigReceipt, dropped: ["mode", "preserve_texture"] };
    assert.deepEqual(unjustifiedDropped(stray, "rig"), ["preserve_texture"],
      "an undeclared key beside a declared one reds on its own — the allowlist never launders a batch");
  });

  it("ARM j — THE DECLARATION SWEEP: every CARD_DROPPABLE entry names a card the registry serves and a knob that card serves, with a reason", async () => {
    // D1: the declaration can never drift off the served surface —
    // a row for a dead card, or a knob the card stopped serving,
    // reds here (the ARM-e rig: the real CardRegistryService over
    // the hermetic engine + the models boot).
    const ctx = new Context();
    new FlowsSeatService(ctx);
    const state = mkdtempSync(join(tmpdir(), "runs-graph-receipt-armj-"));
    rmState(state);
    (ctx as unknown as { queue: unknown }).queue = { stateRoot: state, stateRoots: [state] };
    const door = new CardRegistryService(ctx);
    await door.prime();
    installLaneStoreOverlay();
    try {
      const defs = door.defsSync() as Map<string, CardDefinition>;
      const offenders: string[] = [];
      for (const [card, knobs] of Object.entries(CARD_DROPPABLE)) {
        const def = defs.get(card);
        if (def === undefined) {
          offenders.push(`CARD_DROPPABLE declares card '${card}' but the registry serves no such card`);
          continue;
        }
        const dict = def.schema.dict;
        if (dict === undefined) {
          offenders.push(`card '${card}' carries no schema dict — the declaration is unjudgeable against the served surface`);
          continue;
        }
        // THE SERVED SURFACE (D1): the schema's knobs ∪ the def's
        // admission extras ∪ the model gate's own demanded key —
        // `params.model` is REQUIRED on every model card
        // (runsValidateStages: requiresModel !== false demands it),
        // so it is served BY LAW even though no schema spells it.
        const served = new Set<string>([...Object.keys(dict), ...(def.admits ?? [])]);
        if (def.requiresModel !== false) served.add("model");
        for (const [knob, reason] of Object.entries(knobs)) {
          if (!served.has(knob)) offenders.push(`CARD_DROPPABLE['${card}'] declares knob '${knob}' the card does not serve (neither schema knob, admit row, nor the model gate's own key)`);
          if (reason.trim() === "") offenders.push(`CARD_DROPPABLE['${card}']['${knob}'] carries no reason — a drop without its why is a finding, not an allowlist entry`);
        }
      }
      assert.deepEqual(offenders, [], "every declared droppable rides the served surface with its reason: " + offenders.join("; "));
      // THE FRICTION'S OWN SHAPE, JUDGED: the rig card serves a mode
      // knob (the sweep proved it) and the receipt that dropped it
      // is justified TODAY — toggle the declaration out and ARM i
      // reds on the RIG-P0-15 shape.
      assert.ok("mode" in (defs.get("rig")?.schema.dict ?? {}), "the rig card serves the mode knob the burn dropped");
    } finally {
      restoreLaneStoreOverlay();
    }
  });
});
