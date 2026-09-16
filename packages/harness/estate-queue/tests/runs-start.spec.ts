// runs-start.spec.ts — the start arm's pure chain: the flow_inline
// structural compile (every gate's voice), door selection, the
// envelope texts, and the registration tail (mint + dir + rich row
// + durable writes + ledger).
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compileFlowInline,
  envelopeRefusal,
  registerCompiledRun,
  selectSubmitDoor,
  unknownDraftRefusal,
} from "../src/runsStart.ts";
import type { CompiledStage } from "../src/runsStart.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    for (const d of TMP.split(":")) rmSync(d, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "runs-start-"));
  TMP = TMP === "" ? d : TMP + ":" + d;
  return d;
};
const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s",
  engine: "comfyui",
  ...over,
});
const doc = (stages: unknown, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "x",
  stages,
  ...over,
});

describe("compileFlowInline", () => {
  it("refuses structural faults with the door's voice", () => {
    assert.match(
      (compileFlowInline(["x"]) as { payload: { error: string } }).payload.error,
      /must be an object|JSON object/,
    );
    assert.match(
      (compileFlowInline(doc("nope")) as { payload: { error: string } }).payload.error,
      /stages/,
    );
    const keys = compileFlowInline(doc([{ ...stage(), x: 1 }], { nope: 1 })) as {
      payload: { error: string };
    };
    assert.match(keys.payload.error, /unknown keys.*'nope'/);
    const missing = compileFlowInline({ stages: [] }) as { payload: { error: string } };
    assert.match(missing.payload.error, /at least id and stages/);
    const notObj = compileFlowInline(doc(["s"])) as { payload: { error: string } };
    assert.match(notObj.payload.error, /stage\[0\] must be an object/);
    const extra = compileFlowInline(doc([{ ...stage(), x: 1 }])) as {
      payload: { error: string };
    };
    assert.match(extra.payload.error, /unknown field.*'x'/);
    const noId = compileFlowInline(doc([{ engine: "comfyui" }])) as {
      payload: { error: string };
    };
    assert.match(noId.payload.error, /not a legal identifier/);
    const noIdExtra = compileFlowInline(doc([{ engine: "comfyui", x: 1 }])) as {
      payload: { error: string };
    };
    assert.match(noIdExtra.payload.error, /<no id>/);
  });

  it("gates the engine policy (named, grammar + registry, no skip, no card)", () => {
    const unnamed = compileFlowInline(doc([{ id: "s" }])) as { payload: { error: string } };
    assert.match(unnamed.payload.error, /no engine named/);
    const foreign = compileFlowInline(doc([stage({ engine: "unity" })])) as {
      status: number;
      payload: { error: string; code: string };
    };
    assert.equal(foreign.status, 400);
    assert.equal(foreign.payload.code, "invalid_request");
    assert.match(foreign.payload.error, /engine ids are 'comfyui' or 'mcp:<server>'/);
    // Grammatical but unregistered: the membership refusal
    // (preview_scope, the seat-less default registry = comfyui).
    const unregistered = compileFlowInline(doc([stage({ engine: "mcp:blender" })])) as {
      status: number;
      payload: { error: string; code: string };
    };
    assert.equal(unregistered.status, 400);
    assert.equal(unregistered.payload.code, "preview_scope");
    assert.match(unregistered.payload.error, /registered engines only \(comfyui\)/);
    // Empty registry list: the "none registered" arm.
    const noneReg = compileFlowInline(doc([stage({ engine: "mcp:unity" })]), []) as {
      payload: { error: string };
    };
    assert.match(noneReg.payload.error, /registered engines only \(none registered\)/);
    // Registered on the caller's list: ADMITTED (the seam's law —
    // the door serves what the engines seat knows).
    const admitted = compileFlowInline(
      doc([stage({ engine: "mcp:blender" })]),
      ["comfyui", "mcp:blender"],
    ) as { stages: unknown[] };
    assert.equal(admitted.stages.length, 1);
    assert.match(
      (compileFlowInline(doc([stage({ skip_when: { x: 1 } })])) as { payload: { error: string } }).payload.error,
      /skip_when is unported/,
    );
    assert.equal(
      (compileFlowInline(doc([stage({ skip_when: null })])) as { stages: unknown[] }).stages.length,
      1,
    );
    assert.match(
      (compileFlowInline(doc([stage({ card: "c1" })])) as { payload: { error: string } }).payload.error,
      /card= stages are unported/,
    );
    assert.equal(
      (compileFlowInline(doc([stage({ card: "" })])) as { stages: unknown[] }).stages.length,
      1,
    );
  });

  it("compiles clean stages (fills, input wirings, verbatim params)", () => {
    const { stages } = compileFlowInline(
      doc([
        stage({
          params: { workflow: { "1": 1 }, output_nodes: { a: "1" } },
          outputs: { img: "image" },
          expected: { img: "image" },
          inputs: {
            good: { stage: "up", output: "img" },
            seed: { initial: "seed" },
            junk: 5,
            half: { stage: "up" },
          },
        }),
      ]),
    ) as { stages: CompiledStage[] };
    assert.equal(stages.length, 1);
    const st = stages[0]!;
    assert.equal(st.id, "s");
    assert.deepEqual(st.outputs, { img: "image" });
    assert.deepEqual(st.expected, { img: "image" });
    assert.deepEqual(st.outputNodes, { a: "1" });
    assert.deepEqual(st.inputNames, { good: "up.img", seed: "__initial__.seed" });
    const filled = compileFlowInline(doc([stage()])) as { stages: CompiledStage[] };
    assert.deepEqual(filled.stages[0]!.outputs, { default: "image" });
    assert.deepEqual(filled.stages[0]!.expected, {});
    assert.deepEqual(filled.stages[0]!.outputNodes, {});
    assert.deepEqual(filled.stages[0]!.inputNames, {});
    const badParams = compileFlowInline(doc([stage({ params: ["x"], outputs: ["y"], expected: 5 })])) as {
      stages: CompiledStage[];
    };
    assert.deepEqual(badParams.stages[0]!.params, {});
    assert.deepEqual(badParams.stages[0]!.outputs, { default: "image" });
    const badNodes = compileFlowInline(
      doc([stage({ params: { output_nodes: ["x"] } })]),
    ) as { stages: CompiledStage[] };
    assert.deepEqual(badNodes.stages[0]!.outputNodes, {});
    const noInputs = compileFlowInline(doc([stage({ inputs: ["x"] })])) as {
      stages: CompiledStage[];
    };
    assert.deepEqual(noInputs.stages[0]!.inputNames, {});
  });
});

describe("selectSubmitDoor", () => {
  it("selects one door (ambiguity lists in DOOR order)", () => {
    assert.deepEqual(selectSubmitDoor({ flow: "f" }), { door: "flow" });
    assert.deepEqual(selectSubmitDoor({ model: "m" }), { door: "model" });
    assert.deepEqual(selectSubmitDoor({ flow_inline: {} }), { door: "flow_inline" });
    const amb = selectSubmitDoor({ model: "m", flow: "f" }) as { payload: { error: string } };
    assert.match(amb.payload.error, /'flow', 'model'|"flow", "model"/);
    assert.match(
      (selectSubmitDoor({}) as { payload: { error: string } }).payload.error,
      /no flow selected/,
    );
  });
});

describe("envelope texts", () => {
  it("keeps the door's byte-pinned prose", () => {
    assert.equal(envelopeRefusal("not-object", ["x"]).payload["code"], "bad_envelope");
    assert.equal(envelopeRefusal("not-object", ["x"]).payload["got"], "list");
    const badTest = envelopeRefusal("bad-test", {}, { testFlag: "yes" });
    assert.match(badTest.payload["error"] as string, /test flag must be a boolean/);
    assert.equal(badTest.payload["got"], "str");
    const missing = envelopeRefusal("missing-draft", {});
    assert.equal(missing.payload["code"], "draft_required");
    const malformed = envelopeRefusal("malformed-draft", {}, { draftId: "bad id!" });
    assert.match(malformed.payload["error"] as string, /malformed/);
    assert.equal(malformed.payload["got"], "bad id!");
    const bare = envelopeRefusal("malformed-draft", {});
    assert.match(bare.payload["error"] as string, /''/);
    const unknown = unknownDraftRefusal("ghost");
    assert.equal(unknown.payload["code"], "draft_unknown");
    assert.match(unknown.payload["error"] as string, /drafts\/ghost\.json/);
  });
});

describe("registerCompiledRun", () => {
  const compiled = (stages: CompiledStage[]): { stages: CompiledStage[] } => ({ stages });
  const one: CompiledStage = {
    id: "s",
    params: { workflow: {} },
    outputs: { default: "image" },
    expected: {},
    outputNodes: {},
    inputNames: {},
  };
  it("mints, routes the out root on the test flag, and writes the durable pair", () => {
    const root = tmp();
    const seen: string[] = [];
    const { run, queuePosition } = registerCompiledRun({
      compiled: compiled([one]),
      testFlag: true,
      draftId: "d1",
      stateRoot: root,
      enqueue: (row) => {
        seen.push(row.runId);
        return 0;
      },
    });
    assert.match(run.runId, /^run-[0-9a-f]{12}-[0-9a-f]{8}$/);
    assert.equal(queuePosition, 0);
    assert.deepEqual(seen, [run.runId]);
    assert.ok(run.dir.startsWith(join(root, "test-output")));
    assert.deepEqual(JSON.parse(readFileSync(join(run.dir, "_request.json"), "utf8")), {
      stages: [
        {
          id: "s",
          params: { workflow: {} },
          outputs: { default: "image" },
          expected: {},
          outputNodes: {},
          inputNames: {},
        },
      ],
    });
    const sidecar = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8"));
    assert.equal(sidecar["status"], "queued");
    assert.equal(sidecar["pipeline"], "flow_inline");
    assert.equal(
      readFileSync(join(root, "output", "_ledger.jsonl"), "utf8").includes("run.queued"),
      true,
    );
    assert.equal(run.inputNames?.["s"], run.inputNames?.["s"]);
  });

  it("the card door carries its identity (minted id, pipeline, request body)", () => {
    const root = tmp();
    const body = { model: "m" };
    const { run } = registerCompiledRun({
      compiled: compiled([one]),
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-door", pipeline: "m", cardId: "c", requestBody: body },
    });
    assert.equal(run.runId, "run-door");
    assert.equal(run.pipeline, "m");
    assert.equal((run as unknown as { cardId: string }).cardId, "c");
    assert.ok(run.dir.startsWith(join(root, "output")));
    assert.ok(!run.dir.includes("test-output"));
    assert.deepEqual(JSON.parse(readFileSync(join(run.dir, "_request.json"), "utf8")), body);
    assert.ok(existsSync(join(run.dir, "_flow.json")));
  });

  it("the card door stamps the snapshots (the wand restores from these, never the living bench)", () => {
    const root = tmp();
    const body = { model: "m" };
    const benchDoc = { stages: [{ id: "s", card: "c" }], intent: "the beach flow" };
    const { run } = registerCompiledRun({
      compiled: compiled([one]),
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-snap", pipeline: "m", cardId: "c", requestBody: body, benchDoc },
    });
    assert.deepEqual(run.cardSnapshot, { card: "c", params: body });
    assert.deepEqual(run.benchSnapshot, { stages: benchDoc.stages, intent: "the beach flow" });
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(flow["card_snapshot"], { card: "c", params: body });
    assert.deepEqual(flow["bench_snapshot"], { stages: benchDoc.stages, intent: "the beach flow" });
  });

  it("an empty bench stamps no bench snapshot (the key stays absent, never null)", () => {
    const root = tmp();
    const doorBase = { runId: "run-nobench", pipeline: "m", cardId: "c", requestBody: {} };
    const { run } = registerCompiledRun({
      compiled: compiled([one]),
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 3,
      door: { ...doorBase, benchDoc: { stages: [] } },
    });
    assert.equal(run.benchSnapshot, undefined);
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal("bench_snapshot" in flow, false);
    assert.deepEqual(flow["card_snapshot"], { card: "c", params: {} });
    // a non-string intent stamps "" (the wand reads a string, never a guess)
    const stages = [{ id: "s" }];
    const { run: run2 } = registerCompiledRun({
      compiled: compiled([one]),
      testFlag: false,
      draftId: "d1",
      stateRoot: root,
      enqueue: () => 3,
      door: { ...doorBase, runId: "run-nointent", benchDoc: { stages, intent: 7 } },
    });
    assert.deepEqual(run2.benchSnapshot, { stages, intent: "" });
  });

  it("an unwritable state root throws LOUD (a refusal contract, never a silent skip)", () => {
    // registerCompiledRun raw-throws the node fs Error (mkdirSync on
    // the 555 root raises EACCES) — the caller (the start arm) folds
    // it; pinning the loud shape here so a future silent-skip can
    // never slip in. Root bypasses permission bits: skip there.
    if (typeof process.geteuid === "function" && process.geteuid() === 0) {
      console.warn("unwritable-root wall skipped: running as root");
      return;
    }
    const root = tmp();
    chmodSync(root, 0o555);
    try {
      assert.throws(
        () =>
          registerCompiledRun({
            compiled: compiled([one]),
            testFlag: false,
            draftId: "d1",
            stateRoot: root,
            enqueue: () => 0,
          }),
        /EACCES|EPERM|permission/i,
      );
    } finally {
      chmodSync(root, 0o755);
    }
  });
});
