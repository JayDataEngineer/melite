// runs-claim-press.spec.ts — THE CLAIMED-STAGE PRESS WALL (the
// ghost-run burn, 2026-11-19: "we have the ghost run issue again,
// where it is running flows that don't show up on the bench"). The
// agent's familyless walk presses one stage with
// {draft_id, bench_stage_id}; the draft door IGNORED the claim and
// composed the WHOLE bench into one merged flow_inline run — every
// sibling re-executed on the GPU, the run's stage digest named every
// row (a failure poisoned every tile's last_run), and the settle
// mirror stamped 'stopped' onto rows nobody pressed.
//
// THE LAW, one arm per judged direction (canon axis 3):
//   GHOST      a claim press composes ONLY the claimed row — one
//              stage in the run, the digest names the claim alone,
//              the settle mirror patches the claim alone, and the
//              row's wires are resolved params (no inputs edge —
//              there is no upstream stage in a single-stage run).
//   RESOLVE    the claim arm's params are the press body's own keys
//              overlaid on the row's bag (the client's wire
//              resolution); a spell the press did NOT resolve
//              refuses loud at the unwired-spell gate, naming it.
//   FOREIGN    a claim naming no row of the draft refuses (the F21
//              membership law), never a stamp on a row nobody
//              pressed.
//   ARCHIVED   an archived claim refuses in the archived skip's own
//              voice — a spent stage composes nowhere.
//   BENCH      the claim-less press {draft_id} alone still composes
//              the whole bench — the operator's run-bench gesture is
//              the draft door's own law and this cure does not
//              touch it.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { DECL as FIT_DECL } from "../../../models/fit/src/index.ts";
import { DECL as SKIN_DECL } from "../../../models/skin/src/index.ts";
import { RunsRuntimeService, settleMirrorPatches } from "../src/runsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { QueueCore } from "../src/queue.ts";
import type { RunRecord } from "../src/runsTypes.ts";

let TMP = "";
afterEach(async () => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) {
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
  const d = mkdtempSync(join(tmpdir(), "claim-press-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const sig = (): AbortSignal => new AbortController().signal;

/** The two-stage bench the burn rode: s_0 a carded stage, s_1 the
 *  familyless row wired to s_0's output — the exact shape the
 *  agent's pass presses stage-by-stage. */
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

const seat = (): { svc: RunsRuntimeService, core: QueueCore, state: string } => {
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
      if (id === "d1") return benchDoc();
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
  s: { svc: RunsRuntimeService, core: QueueCore },
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

describe("the claimed-stage press (bench_stage_id on the draft door)", () => {
  it("GHOST: a claim press composes ONLY the claimed row — one stage, one digest name, one mirror patch, no inputs edge", async () => {
    const s = seat();
    const ans = (await s.svc.start(
      {
        draft_id: "d1",
        test: false,
        bench_stage_id: "s_1",
        input_images: ["/melite-media/runs/run-up-1/s_0/a.png"],
      },
      sig(),
    )) as { run_id: string };
    assert.ok(typeof ans.run_id === "string" && ans.run_id !== "", "the claim press registered a run");
    const row = s.core.runs.get(ans.run_id) as unknown as {
      stages?: Array<{ id: string }>;
      stageFams?: Record<string, string>;
      inputNames?: Record<string, Record<string, string>>;
    };
    // ONE stage — the pressed row, not the bench
    assert.deepEqual((row.stages ?? []).map((st) => st.id), ["s_1"],
      "the ghost is dead: the claim press composed exactly the claimed row");
    assert.deepEqual(row.stageFams, { s_1: "image-edit" },
      "the claim re-probe ledger names the pressed row alone");
    // THE WIRE RESOLUTION LAW, server half: no inputs edge rides a
    // single-stage run — the resolved param IS the wire
    assert.deepEqual(row.inputNames, { s_1: {} },
      "no FromStage link rides a single-stage press (the overlay is the wire)");
    await settleWait(s, ans.run_id);
    const doc = JSON.parse(
      readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(doc["stage_ids"], "s_1",
      "the digest names the claim alone — a failure cannot poison the bench's other rows");
    const settled = s.core.runs.get(ans.run_id) as RunRecord;
    const patches = settleMirrorPatches(settled);
    assert.equal(patches.length, 1);
    assert.equal(patches[0]!.stageId, "s_1",
      "the settle mirror touches only the pressed row — the bench's other tiles keep their memory");
  });

  it("RESOLVE: a claim press that did NOT resolve the wired spell refuses loud, naming it — nothing registered", async () => {
    const s = seat();
    const err = await remote(() =>
      s.svc.start(
        { draft_id: "d1", test: false, bench_stage_id: "s_1" },
        sig(),
      ),
    );
    assert.match(err.message, /\$input_images/, "the spell is named");
    assert.match(err.message, /wire the input|replace the \$spell|concrete value/i,
      "the fix is named");
    assert.equal(s.core.runs.size, 0, "never a doomed run");
  });

  it("FOREIGN: a claim naming no row of the draft refuses (the F21 membership law)", async () => {
    const s = seat();
    const err = await remote(() =>
      s.svc.start(
        {
          draft_id: "d1",
          test: false,
          bench_stage_id: "s_9",
          input_images: ["/melite-media/runs/run-up-1/s_0/a.png"],
        },
        sig(),
      ),
    );
    assert.match(err.message, /bench_stage_id "s_9" names no stage row/,
      "the foreign claim is refused in the F21 voice");
    assert.equal(s.core.runs.size, 0);
  });

  it("ARCHIVED: an archived claim refuses — a spent stage composes nowhere", async () => {
    const s = seat();
    const ctx = (s.svc as unknown as { ctx: Context }).ctx;
    (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
      get: async (id: string): Promise<unknown> => {
        if (id !== "d1") throw new RemoteError("draft/not-found", "no doc", { draftId: id });
        const doc = benchDoc();
        ((doc["stages"] as Array<Record<string, unknown>>)[1]!)["archived"] = true;
        return doc;
      },
    };
    const err = await remote(() =>
      s.svc.start(
        {
          draft_id: "d1",
          test: false,
          bench_stage_id: "s_1",
          input_images: ["/melite-media/runs/run-up-1/s_0/a.png"],
        },
        sig(),
      ),
    );
    assert.match(err.message, /"s_1" is archived/,
      "the archived claim refuses in the archived skip's own voice");
    assert.equal(s.core.runs.size, 0);
  });

  it("BENCH: the claim-less press still composes the whole bench — the run-bench gesture stands", async () => {
    const s = seat();
    const ans = (await s.svc.start(
      { draft_id: "d1", test: false },
      sig(),
    )) as { run_id: string };
    await settleWait(s, ans.run_id);
    const doc = JSON.parse(
      readFileSync(join(s.state, "output", ans.run_id, "_flow.json"), "utf8"),
    ) as Record<string, unknown>;
    assert.equal(doc["stage_ids"], "s_0,s_1",
      "pressing the bench ({test, draft_id} alone) composes every stage — this cure does not touch that law");
    const row = s.core.runs.get(ans.run_id) as unknown as {
      inputNames?: Record<string, Record<string, string>>;
    };
    assert.deepEqual(
      row.inputNames,
      { s_0: {}, s_1: { input_images: "s_0.default" } },
      "the wires still ride as stage inputs on the whole-bench run",
    );
  });
});
