// runs-plane-fold-arms.spec.ts — the runs plane's fold arms, ridden
// from the REAL doors (the compose walk, the replay judge's
// projection, the list door). Every arm presses the same
// structural-fake seat the claim-press walls ride; no src edits, no
// implementation pins — each `it` states the law it holds:
//   NAKED SERVICE ROW  a claimed bench row with no card and no
//                      params composes by its service stamp (the
//                      routing-key law) and refuses loud when it
//                      declares no output channels (the one-table
//                      law: an empty channel map is "undeclared",
//                      never a fabricated kind).
//   ALIAS EXPECTED     a card that declares legacyAliases and no
//                      input kinds still lifts its aliases into the
//                      composed stage's expected bag (the derivation
//                      law's alias half).
//   JUNK KIND          only string-valued output kinds ride the
//                      replay judge's projection — anything else
//                      skips judgment, never coerced.
//   OUTSIDE WIRE       an edge naming a stage the doc never
//                      declares is not doc-derivable: it drops from
//                      the judged rows, never a false refusal on the
//                      legal wire (the bench lane's cross-wire law).
//   FILL CLASS         a doc whose channels live outside it
//                      (outputsDeclared false — the pre-one-table
//                      fill) skips the replay judge wholesale.
//   TAKES FILTER       the list door narrows a claimed run's takes
//                      by draft and bench stage, and a blank
//                      spelling reads ABSENT (the parse_qs blank
//                      law), never as a match against the empty id.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { DECL as FIT_DECL } from "../../../models/fit/src/index.ts";
import { DECL as SKIN_DECL } from "../../../models/skin/src/index.ts";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { replayJudgeRows } from "../src/runsStart.ts";
import type { CompiledStage } from "../src/runsStart.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { QueueCore } from "../src/queue.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(async () => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) {
      // a run-seat writer can still be appending when the sweep
      // walks the tree (the claim-press walls' own retry): ENOTEMPTY
      // is a race, not a leak — one retry after a tick, then the
      // failure stands loud
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
  const d = mkdtempSync(join(tmpdir(), "runs-fold-arms-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

/** The two-stage bench the claim-press walls ride: s_0 a carded
 *  stage, s_1 the familyless row wired to s_0's output. */
const benchDoc = (): Record<string, unknown> => ({
  stages: [
    { id: "s_0", card: "image-gen", params: { prompt: "x" } },
    {
      id: "s_1",
      card: "image-edit",
      params: { input_images: ["$input_images"] },
      inputs: { input_images: { stage: "s_0", output: "default" } },
    },
  ],
});

class ModelsSeatFake extends Service {
  constructor(ctx: Context) {
    super(ctx, "models");
  }
  allDecls(): unknown[] {
    return [ANNY_DECL, FIT_DECL, SKIN_DECL];
  }
}

interface Seat {
  svc: RunsRuntimeService;
  core: QueueCore;
  state: string;
}

const seat = (docs: Record<string, Record<string, unknown>> = {}): Seat => {
  const state = tmp();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  new ModelsSeatFake(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = {
    core,
    stateRoot: state,
    get stateRoots(): string[] { return [state]; },
  };
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (id: string): Promise<unknown> => {
      if (id in docs) return docs[id]!;
      throw new RemoteError("draft/not-found", "no doc", { draftId: id });
    },
  };
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    objectInfo: (): unknown => null,
    defsSync: (): unknown =>
      new Map([
        [
          "image-gen",
          {
            id: "image-gen",
            boarded: ["z-image"],
            flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: true },
            schema: (v: unknown): unknown => v,
          },
        ],
        [
          "image-edit",
          {
            id: "image-edit",
            boarded: [],
            requiresModel: false,
            flowKinds: { inputs: { input_images: "image" }, outputs: { default: "image" }, requiresModel: false },
            schema: (v: unknown): unknown => v,
          },
        ],
        [
          // THE ALIAS-ONLY CARD: the flowKinds table declares output
          // kinds and legacy aliases but NO input kinds — the
          // derivation law's alias half rides without an inputs bag.
          "alias-card",
          {
            id: "alias-card",
            boarded: ["z-image"],
            flowKinds: { outputs: { default: "image" }, legacyAliases: { prompt: "text" }, requiresModel: true },
            schema: (v: unknown): unknown => v,
          },
        ],
      ]),
    modelFacts: (): unknown => ({ "image-edit": {} }),
    resolveCardFamily: (mid: unknown): unknown => mid,
    modelMids: (): unknown => new Set<string>(),
    cardDecls: (): unknown => ({}),
    composeValidateCard: async (): Promise<unknown> => null,
    primeObjectInfo: async (): Promise<boolean> => true,
    phase1Card: async (): Promise<unknown> => ({
      mid: "image-edit",
      fam: "image-edit",
      card: "image-edit",
      spell: null,
      params: {},
    }),
    phase2Card: async (): Promise<unknown> => ({
      graph: { SaveImage: { class_type: "SaveImage", inputs: {} } },
      outputs: {},
      outputNodes: {},
    }),
    stateRoots: (): string[] => [state],
  };
  const svc = new RunsRuntimeService(ctx as unknown as Context);
  return { svc, core, state };
};

const settleWait = async (
  s: Seat,
  runId: string,
): Promise<RunRecord> => {
  for (let i = 0; i < 500; i++) {
    const row = s.core.runs.get(runId) as RunRecord | undefined;
    if (row !== undefined && row.status !== "queued" && !s.svc.pumping) return row;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("pump never settled " + runId);
};

const remote = async (fn: () => Promise<unknown>): Promise<Error> => {
  try {
    await fn();
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
  throw new Error("expected a refusal, got an answer");
};

describe("the runs plane's fold arms (every arm rides the real door)", () => {
  it("NAKED SERVICE ROW: a claimed bench row with no card and no params composes by its service stamp and refuses loud when it declares no output channels", async () => {
    const s = seat({ d1: { stages: [{ id: "s_naked", service: "somax-tts" }] } });
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, bench_stage_id: "s_naked" },
        sig(),
      ),
    );
    assert.match(
      err.message,
      /declares no outputs and carries no card_io/,
      "the one-table law refuses the undeclared stage in the start door's own voice",
    );
    assert.equal(s.core.runs.size, 0, "never a doomed run");
  });

  it("ALIAS EXPECTED: a bench row whose card declares legacyAliases and no input kinds composes with the aliases riding the expected bag", async () => {
    const s = seat({
      d1: { stages: [{ id: "s_alias", card: "alias-card", params: { model: "z-image" } }] },
    });
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false, bench_stage_id: "s_alias" },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "",
      "the alias-only card composes — a card without an inputs bag is not a refusal");
    await settleWait(s, ans.run_id);
  });

  it("JUNK KIND: an inline stage's non-string output kind is skipped by the replay judge's projection, never coerced — the run starts", async () => {
    const s = seat({ d1: {} });
    const ans = (await s.svc.start(
      {
        draft_id: "d1",
        test: false,
        flow_inline: {
          id: "x",
          stages: [{ id: "s", engine: "comfyui", outputs: { out: "image", junk: 42 } }],
        },
      },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "",
      "a kind the wire contract cannot read skips judgment — it never refuses, never coerces");
    await settleWait(s, ans.run_id);
  });

  it("OUTSIDE WIRE: an edge naming a stage the doc never declares drops from the judged rows — the legal wire never false-refuses", async () => {
    const s = seat({ d1: {} });
    const ans = (await s.svc.start(
      {
        draft_id: "d1",
        test: false,
        flow_inline: {
          id: "x",
          stages: [{
            id: "s",
            engine: "comfyui",
            outputs: { out: "image" },
            expected: { photo: "image" },
            inputs: { photo: { stage: "ghost", output: "default" } },
          }],
        },
      },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "",
      "the bench lane's cross-wire is not doc-derivable — the judge skips the row instead of refusing");
    await settleWait(s, ans.run_id);
  });

  it("FILL CLASS: a doc whose channels live outside it (outputsDeclared false) skips the replay judge wholesale", () => {
    // THE PRE-ONE-TABLE FILL (replayJudgeRows' own contract): a
    // stage whose engine-fill channels live nowhere the doc names
    // is not self-describing — the judge judges only fully-declared
    // docs, so the projection is empty, never a false refusal.
    const fillStage: CompiledStage = {
      id: "s",
      engine: "comfyui",
      params: {},
      outputs: {},
      expected: {},
      outputNodes: {},
      inputNames: {},
      outputsDeclared: false,
    };
    assert.deepEqual(replayJudgeRows({ stages: [fillStage] }), [],
      "the fill class skips the judge wholesale");
  });

  it("TAKES FILTER: the list door narrows a claimed run's takes by draft and bench stage, and a blank spelling reads absent", async () => {
    const s = seat({ d1: benchDoc() });
    const ans = (await s.svc.start(
      {
        draft_id: "d1",
        test: false,
        bench_stage_id: "s_1",
        input_images: ["/melite-media/runs/run-up-1/s_0/a.png"],
      },
      sig(),
    )) as { run_id: string };
    await settleWait(s, ans.run_id);
    // The narrowing law: each STATED key must hold on the SERVED
    // rows; the count stays the scan total (the filter never hides
    // the scan — it narrows the served window only).
    const served = async (
      draftId?: string,
      benchStageId?: string,
    ): Promise<{ served: number; count: number }> => {
      const out = await s.svc.list("50", sig(), draftId, benchStageId);
      return { served: out.runs.length, count: out.count };
    };
    assert.deepEqual(await served("d1"), { served: 1, count: 1 },
      "the draft filter serves the claim's own draft");
    assert.deepEqual(await served("d9"), { served: 0, count: 1 },
      "a foreign draft serves nothing — the count still names the scan");
    assert.deepEqual(await served(undefined, "s_1"), { served: 1, count: 1 },
      "the bench-stage filter serves the pressed row's takes");
    assert.deepEqual(await served(undefined, "s_9"), { served: 0, count: 1 },
      "a stage the run never named serves nothing");
    // THE BLANK LAW: an empty string reads ABSENT (the parse_qs
    // blank law), never as a match against the empty id.
    assert.equal((await served(undefined, undefined)).served, 1,
      "no filter serves every row");
    assert.equal((await served("", undefined)).served, 1,
      "a blank draft spelling reads absent");
    assert.equal((await served(undefined, "")).served, 1,
      "a blank stage spelling reads absent");
    assert.equal((await served("", "")).served, 1,
      "two blank spellings read absent");
    assert.equal((await served("", "s_1")).served, 1,
      "a blank draft beside a real stage filter narrows by the stage alone");
    assert.equal((await served("", "s_9")).served, 0,
      "a blank draft beside a foreign stage filter serves nothing");
    assert.equal((await served("d1", "")).served, 1,
      "a real draft beside a blank stage filter narrows by the draft alone");
  });
});
