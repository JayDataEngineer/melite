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
import { ENGINE_TABLE } from "../src/runsValidateShared.ts";
import type { CompiledStage } from "../src/runsStart.ts";
import { newRunId } from "../src/queueCore.ts";
import type { RunRecord } from "../src/runsTypes.ts";
import type { RunId } from "../src/queueCore.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

/** registerCompiledRun now returns a refusal union (the source-echo
 *  gate) — these walls register sourceless stages, so a refusal is
 *  itself the failure. */
const mustRegister = async (
  args: Parameters<typeof registerCompiledRun>[0],
): Promise<{ run: RunRecord; queuePosition: number }> => {
  const out = await registerCompiledRun(args);
  if ("payload" in out) throw new Error("unexpected refusal: " + JSON.stringify(out.payload));
  return out;
};

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

// THE REFUSAL-READ IDIOM (the type law): compileFlowInline and
// selectSubmitDoor return a refusal union whose payload is
// Record<string, unknown> — no overlap with the narrowed
// { payload: { error: string } } face these walls read. Every input
// below is crafted to refuse (each assert pins the refusal voice),
// so the refusal arm is read via unknown. Type-only: the runtime
// object is untouched.
describe("compileFlowInline", () => {
  it("THE SPELL GATE (2026-10-09): an UNWIRED $image1 refuses at the door, never at the merge", () => {
    // the operator's live case, verbatim: an edit stage carrying
    // params.image1 "$image1" with no wiring — the run used to die
    // mid-flow at the merge ('workflow carries $image1'). The door
    // now refuses in its own voice, naming the spell and the fix.
    const out = compileFlowInline(doc([
      stage({ id: "gen", outputs: { default: "image" } }),
      stage({ id: "edit", params: { prompt: "make it blue", image1: "$image1" } }),
    ])) as { payload: { error: string; code: string }; status: number };
    assert.equal(out.status, 400);
    assert.equal(out.payload.code, "invalid_request");
    assert.match(out.payload.error, /stage "edit"/);
    assert.match(out.payload.error, /params carry \["\$image1"\]/);
    assert.match(out.payload.error, /name it or wire it/);
  });
  it("THE SPELL GATE: the WIRED $image1 compiles green (the wired path builds)", () => {
    const out = compileFlowInline(doc([
      stage({ id: "gen", outputs: { default: "image" } }),
      stage({
        id: "edit",
        params: { prompt: "make it blue", image1: "$image1" },
        inputs: { image1: { stage: "gen", output: "default" } },
      }),
    ])) as { stages: CompiledStage[] };
    assert.equal(out.stages[1]?.inputNames["image1"], "gen.default");
  });
  it("THE SPELL GATE: a wired stage still refuses a FOREIGN spell ($ghost in the reference list)", () => {
    const out = compileFlowInline(doc([
      stage({ id: "gen", outputs: { default: "image" } }),
      stage({
        id: "edit",
        params: { prompt: "x", image1: "$image1", reference_images: ["$ghost"] },
        inputs: { image1: { stage: "gen", output: "default" } },
      }),
    ])) as { payload: { error: string }; status: number };
    assert.equal(out.status, 400);
    assert.match(out.payload.error, /\$ghost/);
    // the WIRED spell rides through untouched
    assert.doesNotMatch(out.payload.error, /\$image1.*\$image1/);
  });
  it("refuses structural faults with the door's voice", () => {
    assert.match(
      (compileFlowInline(["x"]) as unknown as { payload: { error: string } }).payload.error,
      /must be an object|JSON object/,
    );
    assert.match(
      (compileFlowInline(doc("nope")) as unknown as { payload: { error: string } }).payload.error,
      /stages/,
    );
    const keys = compileFlowInline(doc([{ ...stage(), x: 1 }], { nope: 1 })) as unknown as {
      payload: { error: string };
    };
    assert.match(keys.payload.error, /unknown keys \["nope"\]/);
    const missing = compileFlowInline({ stages: [] }) as unknown as { payload: { error: string } };
    assert.match(missing.payload.error, /at least id and stages/);
    const notObj = compileFlowInline(doc(["s"])) as unknown as { payload: { error: string } };
    assert.match(notObj.payload.error, /stage\[0\] must be an object/);
    const extra = compileFlowInline(doc([{ ...stage(), x: 1 }])) as unknown as {
      payload: { error: string };
    };
    assert.match(extra.payload.error, /unknown field\(s\) \["x"\]/);
    const noId = compileFlowInline(doc([{ engine: "comfyui" }])) as unknown as {
      payload: { error: string };
    };
    assert.match(noId.payload.error, /not a legal identifier/);
    const noIdExtra = compileFlowInline(doc([{ engine: "comfyui", x: 1 }])) as unknown as {
      payload: { error: string };
    };
    assert.match(noIdExtra.payload.error, /<no id>/);
  });

  it("gates the engine policy (named, grammar + registry, no skip, no card)", () => {
    const unnamed = compileFlowInline(doc([{ id: "s" }])) as unknown as { payload: { error: string } };
    assert.match(unnamed.payload.error, /no engine named/);
    const foreign = compileFlowInline(doc([stage({ engine: "unity" })])) as {
      status: number;
      payload: { error: string; code: string };
    };
    assert.equal(foreign.status, 400);
    assert.equal(foreign.payload.code, "invalid_request");
    // S-S6 re-cut: the grammar voice names the full pinned set the
    // grammar itself admits (comfyui, craft, agent, mcp:<server>);
    // the ids ride the engine contract's constants (closure RULE 2b),
    // so the voice is unquoted joins.
    assert.match(
      foreign.payload.error,
      /engine ids are comfyui, craft, agent or 'mcp:<server>'/,
    );
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
    const noneReg = compileFlowInline(doc([stage({ engine: "mcp:unity" })]), []) as unknown as {
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
      (compileFlowInline(doc([stage({ skip_when: { x: 1 } })])) as unknown as { payload: { error: string } }).payload.error,
      /skip_when is unported/,
    );
    assert.equal(
      (compileFlowInline(doc([stage({ skip_when: null })])) as { stages: unknown[] }).stages.length,
      1,
    );
    assert.match(
      (compileFlowInline(doc([stage({ card: "c1" })])) as unknown as { payload: { error: string } }).payload.error,
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
    // params.output_nodes rides the container law too (P7 B2): a
    // malformed nested value refuses, never drops into {}.
    const badNodes = compileFlowInline(
      doc([stage({ params: { output_nodes: ["x"] } })]),
    ) as unknown as { status: number; payload: { error: string; code: string } };
    assert.equal(badNodes.status, 400);
    assert.equal(badNodes.payload.code, "invalid_request");
    assert.match(badNodes.payload.error, /params\.output_nodes must be an object \(got array\)/);
  });

  // THE SILENCE WAS PINNED HERE (the coverage audit, HIGH finding #2).
  // This file used to assert `params:["x"] → {}` and `inputs:["x"] →
  // {}` — i.e. it pinned the run registering a stage whose wiring had
  // been silently dropped, while the BENCH door refused the same
  // shapes. Two seats, one shape, opposite judgments. The bench is
  // right, so these arms now pin the refusal. The old assertions are
  // not deleted: they are the defect, restated as what must happen.
  describe("a malformed container or binding REFUSES (it used to be coerced away)", () => {
    const refused = (body: unknown): string => {
      const r = compileFlowInline(doc([stage(body as Record<string, unknown>)]));
      // the refusal carries {status, payload:{error, code}} — the
      // message lives at payload.error, not on the refusal itself
      assert.ok("payload" in r, `expected a refusal, got ${JSON.stringify(r)}`);
      const payload = (r as { payload: { error?: unknown } }).payload;
      assert.equal(typeof payload.error, "string", "the refusal carries no message");
      return String(payload.error);
    };

    it("params: an array refuses, naming the container", () => {
      assert.match(refused({ params: ["x"] }), /params must be an object \(got array\)/);
    });
    it("params: a string refuses", () => {
      assert.match(refused({ params: "x" }), /params must be an object \(got string\)/);
    });
    it("params: null refuses", () => {
      assert.match(refused({ params: null }), /params must be an object \(got null\)/);
    });
    it("inputs: an array refuses (a dropped input list is a dropped wire)", () => {
      assert.match(refused({ inputs: ["x"] }), /inputs must be an object \(got array\)/);
    });
    it("outputs and expected refuse on the same law", () => {
      assert.match(refused({ outputs: ["y"] }), /outputs must be an object/);
      assert.match(refused({ expected: 5 }), /expected must be an object \(got number\)/);
    });
    it("params.output_nodes: a string refuses, naming the nested container", () => {
      assert.match(
        refused({ params: { output_nodes: "main" } }),
        /params\.output_nodes must be an object \(got string\)/,
      );
    });
    it("the empty-outputs fill equals the lattice's read for the derived engine roster (the P7 latent lock)", () => {
      // The derived roster: every ENGINE_TABLE key + the mcp grammar
      // arm. Start's fill and validate's engineDefaults must read the
      // SAME row — today they agree by coincidence (two spellings of
      // the mcp leg: the table-miss literal here, the mcp-client row
      // in the lattice). The cure makes it one shared read; this arm
      // reds the moment either door drifts from the other.
      const roster = [...Object.keys(ENGINE_TABLE), "mcp:blender", "mcp:ghost-9_x"];
      const known = [...roster, "comfyui"];
      for (const engine of roster) {
        const out = compileFlowInline(
          doc([stage({ id: "s", engine, outputs: {} })]),
          known,
        ) as unknown as { stages: CompiledStage[] };
        const filled = out.stages[0]?.outputs as Record<string, unknown>;
        const want = engine.startsWith("mcp:")
          ? "image"
          : (ENGINE_TABLE[engine] as { def: string } | undefined)?.def;
        assert.equal(filled["default"], want, `engine ${engine}`);
      }
    });
    it("a malformed BINDING refuses: a number where a wire belongs", () => {
      assert.match(refused({ inputs: { junk: 5 } }), /input "junk" is neither \{stage, output\} nor \{initial\}/);
    });
    it("a half binding refuses: {stage} with no output channel", () => {
      assert.match(
        refused({ inputs: { half: { stage: "up" } } }),
        /input "half" is neither \{stage, output\} nor \{initial\}/,
      );
    });
    it("an ABSENT container is still legal (most stages carry no inputs at all)", () => {
      const { stages } = compileFlowInline(doc([stage({ params: { workflow: {} } })])) as {
        stages: CompiledStage[];
      };
      assert.equal(stages.length, 1);
      assert.deepEqual(stages[0]!.inputNames, {});
    });
  });
});

describe("selectSubmitDoor", () => {
  it("selects one door (ambiguity lists in DOOR order)", () => {
    assert.deepEqual(selectSubmitDoor({ flow: "f" }), { door: "flow" });
    assert.deepEqual(selectSubmitDoor({ model: "m" }), { door: "model" });
    assert.deepEqual(selectSubmitDoor({ flow_inline: {} }), { door: "flow_inline" });
    const amb = selectSubmitDoor({ model: "m", flow: "f" }) as unknown as { payload: { error: string } };
    assert.match(amb.payload.error, /names \["flow","model"\]/);
    assert.match(
      (selectSubmitDoor({}) as unknown as { payload: { error: string } }).payload.error,
      /no flow selected/,
    );
  });
});

describe("envelope texts", () => {
  it("keeps the door's byte-pinned prose", () => {
    assert.equal(envelopeRefusal("not-object", ["x"]).payload["code"], "bad_envelope");
    assert.equal(envelopeRefusal("not-object", ["x"]).payload["got"], "array");
    const badTest = envelopeRefusal("bad-test", {}, { testFlag: "yes" });
    assert.match(badTest.payload["error"] as string, /test flag must be a boolean/);
    assert.equal(badTest.payload["got"], "string");
    const missing = envelopeRefusal("missing-draft", {});
    assert.equal(missing.payload["code"], "draft_required");
    const malformed = envelopeRefusal("malformed-draft", {}, { draftId: draftIdOf("bad id!") });
    assert.match(malformed.payload["error"] as string, /malformed/);
    assert.equal(malformed.payload["got"], "bad id!");
    const bare = envelopeRefusal("malformed-draft", {});
    assert.match(bare.payload["error"] as string, /: ""$/);
    const unknown = unknownDraftRefusal(draftIdOf("ghost"));
    assert.equal(unknown.payload["code"], "draft_unknown");
    assert.match(unknown.payload["error"] as string, /drafts\/ghost\.json/);
  });
});

describe("registerCompiledRun", () => {
  const compiled = (stages: CompiledStage[]): { stages: CompiledStage[] } => ({ stages });
  // The pre-engine wire shape, PINNED: the request echo below
  // asserts this stage serializes verbatim (no engine key), so the
  // fixture converts via unknown instead of stating an engine.
  const one = {
    id: "s",
    params: { workflow: {} },
    outputs: { default: "image" },
    expected: {},
    outputNodes: {},
    inputNames: {},
  } as unknown as CompiledStage;
  it("registers UNDER THE CALLER'S RUN ID, routes the out root, and writes the durable pair", async () => {
    const root = tmp();
    const seen: string[] = [];
    // THE RUN ID IS THE CALLER'S (the operator's live refusal,
    // 2026-09-28). This arm used to assert the opposite — that the
    // door MINTS an id when given none — which is the second
    // producer that let a composed graph and its run name different
    // runs ("run sources resolve nowhere (1 dead: run-…/gen)"). The
    // door is required now and carries a required id, so a caller
    // that forgets one does not compile; the id the caller composed
    // its stages under is the id the run registers under.
    const runId = newRunId();
    const { run, queuePosition } = await mustRegister({
      compiled: compiled([one]),
      testFlag: true,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      door: { runId, pipeline: "flow_inline", requestBody: { model: "m" } },
      enqueue: (row) => {
        seen.push(row.runId);
        return 0;
      },
    });
    assert.equal(run.runId, runId, "the run registers under the id it was composed with");
    assert.equal(queuePosition, 0);
    assert.deepEqual(seen, [run.runId]);
    assert.ok(run.dir.startsWith(join(root, "test-output")));
    // THE REQUEST SIDECAR IS THE DOOR'S BODY (the card-snapshot law:
    // the sidecar records what the run was ASKED with, so the wand
    // can restore the flow that made this image). Before the door
    // became required, a caller with no door fell back to the
    // COMPILED shape here — the same seam that let a run register
    // under an id its graph never named.
    assert.deepEqual(JSON.parse(readFileSync(join(run.dir, "_request.json"), "utf8")), { model: "m" });
    const sidecar = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8"));
    assert.equal(sidecar["status"], "queued");
    assert.equal(sidecar["pipeline"], "flow_inline");
    assert.equal(
      readFileSync(join(root, "output", "_ledger.jsonl"), "utf8").includes("run.queued"),
      true,
    );
    assert.equal(run.inputNames?.["s"], run.inputNames?.["s"]);
  });

  it("the card door carries its identity (minted id, pipeline, request body)", async () => {
    const root = tmp();
    const body = { model: "m" };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-door" as RunId, pipeline: "m", cardId: "c", requestBody: body },
    });
    assert.equal(run.runId, "run-door");
    assert.equal(run.pipeline, "m");
    assert.equal((run as unknown as { cardId: string }).cardId, "c");
    assert.ok(run.dir.startsWith(join(root, "output")));
    assert.ok(!run.dir.includes("test-output"));
    assert.deepEqual(JSON.parse(readFileSync(join(run.dir, "_request.json"), "utf8")), body);
    assert.ok(existsSync(join(run.dir, "_flow.json")));
  });

  it("THE SNAPSHOT CONTRACT (the operator's order, 2026-09-26): the writer stamps a CONTRACTED stage list — junk rows drop with named warnings, the loadable row rides with provenance restored", async () => {
    // "the saving should 100% be a schemamaster contract, that way
    // we know 100% if it will load again": whatever the bench held,
    // what PERSISTS parses on the load side. A null and a scalar
    // row are unloadable — they DROP, each drop rides the sidecar's
    // warnings row (visible loss, never silent), and the good row
    // rides contracted (run memory stripped, provenance restored).
    // Never a crash: the contract's save face always answers. (The
    // verbatim law this wall replaces — "not ours to interpret" —
    // is what let an unloadable snapshot reach disk in the first
    // place; the reader then posted coerced junk to the door.)
    const root = tmp();
    const body = { model: "m" };
    const benchDoc = { stages: [null, "scalar", { id: "s", card: "c" }], intent: "mixed rows" };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-nonlist" as RunId, pipeline: "m", cardId: "c", requestBody: body, benchDoc },
    });
    const snap = run.benchSnapshot as { stages: Array<Record<string, unknown>>; intent: string };
    assert.equal(snap.intent, "mixed rows");
    assert.equal(snap.stages.length, 1, "only the loadable row persisted");
    assert.deepEqual(snap.stages[0], { id: "s", card: "c", provenance: "restored" });
    const drops = (run.warnings ?? []).filter((w) => w.startsWith("bench snapshot: dropped"));
    assert.equal(drops.length, 2, "each junk row's drop is named");
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(
      Array.isArray(flow["warnings"]) &&
        (flow["warnings"] as string[]).some((w) => w.includes("dropped unloadable stage")),
      "the drops ride the sidecar's warnings row",
    );
  });

  it("the card door stamps the snapshots (the wand restores from these, never the living bench)", async () => {
    const root = tmp();
    const body = { model: "m" };
    const benchDoc = { stages: [{ id: "s", card: "c" }], intent: "the beach flow" };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-snap" as RunId, pipeline: "m", cardId: "c", requestBody: body, benchDoc },
    });
    assert.deepEqual(run.cardSnapshot, { card: "c", params: body });
    // THE CONTRACTED STAMP: the row rides with provenance restored
    // (the admission repair law's coordinate), and the persisted
    // snapshot PARSES on the load side — the round-trip guarantee,
    // pinned at the writer (save → parse never fails).
    assert.deepEqual(run.benchSnapshot, {
      stages: [{ id: "s", card: "c", provenance: "restored" }],
      intent: "the beach flow",
    });
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(flow["card_snapshot"], { card: "c", params: body });
    assert.deepEqual(flow["bench_snapshot"], {
      stages: [{ id: "s", card: "c", provenance: "restored" }],
      intent: "the beach flow",
    });
  });

  it("a benchDoc with unusable stages stamps a warning (the snapshot never silently skips)", async () => {
    // P7 B3: a benchDoc whose stages is not a usable stage list
    // skipped the whole snapshot with NO voice — restore then
    // reconstructed from the LIVE bench, unvoiced. The row must
    // carry the skip's voice the way the read-failure path does.
    const root = tmp();
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: {
        runId: "run-badstages" as RunId,
        pipeline: "m",
        cardId: "c",
        requestBody: { model: "m" },
        benchDoc: { stages: "nope", intent: "the beach flow" },
      },
    });
    assert.equal(run.benchSnapshot, undefined);
    assert.ok(
      (run.warnings ?? []).some((w) => w.includes("bench snapshot") && w.includes("stages")),
      "the skipped snapshot's voice rides the row: " + JSON.stringify(run.warnings ?? []),
    );
  });

  it("a present-but-undefined stages reads as absent (the door's spread materializes the key)", async () => {
    // P7 B3 follow-up: the door's benchDoc coercion spread stamps
    // `stages: undefined` onto stages-less drafts — a key that JSON
    // drops on the sidecar anyway. Voicing it would warn every
    // stages-less bench run for the spread's own artifact, so the
    // voice reads present-undefined as the absent shape it echoes.
    const root = tmp();
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: {
        runId: "run-undefinedstages" as RunId,
        pipeline: "m",
        cardId: "c",
        requestBody: { model: "m" },
        benchDoc: { stages: undefined, intent: "a rev-only echo" },
      },
    });
    assert.equal(run.benchSnapshot, undefined);
    assert.deepEqual(run.warnings ?? [], []);
  });

  it("THE PROVENANCE HEAD (2026-09-25): a bench with a log rides its head on the snapshot; a log-less doc rides no fabricated label", async () => {
    const root = tmp();
    const body = { model: "m" };
    // the bench's OWN log head — who wrote the bench the run was
    // born from (tool-minted vs hand-composed is READ from the
    // domain row, never synthesized by the writer)
    const logged = {
      stages: [{ id: "s_0", card: "tts" }],
      intent: "tts",
      log: [{ rev: 1, at: 1758841200, author: "tool", kind: "ensure", stage: "s_0", summary: "card birth" }],
    };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-head" as RunId, pipeline: "m", cardId: "tts", requestBody: body, benchDoc: logged },
    });
    assert.deepEqual((run.benchSnapshot as Record<string, unknown>)["bench_head"], {
      rev: 1, at: 1758841200, author: "tool", kind: "ensure", stage: "s_0", summary: "card birth",
    });
    // the log-less arm: the key rides ABSENT, never a guessed label
    const bare = { stages: [{ id: "s", card: "c" }], intent: "" };
    const { run: run2 } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { runId: "run-bare" as RunId, pipeline: "m", cardId: "c", requestBody: body, benchDoc: bare },
    });
    assert.equal("bench_head" in (run2.benchSnapshot as Record<string, unknown>), false);
  });

  it("THE VARIANT AT BIRTH (commission 033's self-critique #5): the lane stamps the row, the queued sidecar, and the queued ledger row", async () => {
    const root = tmp();
    // a film body (calls present): the ECHO queued-row arm carries
    // the variant too — both run.queued writers stamp the lane, and
    // the wall pins both (the else arm rides the wall below).
    const body = {
      model: "qwen3-tts",
      variant: "customvoice",
      voice_name: "night-frequency",
      calls: [{ text: "one", start_frame: 0, end_frame: 124 }],
    };
    const { run } = await mustRegister({
      compiled: compiled([{ ...one, params: { text: "hi" } }]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 0,
      door: { runId: "run-var" as RunId, pipeline: "qwen3-tts", cardId: "qwen3-tts", requestBody: body },
    });
    // the compiled stage params carry no variant (engine-shaped) —
    // the exact submitted body names the lane (the export-name
    // stamp's 024 lesson, same fallback order).
    assert.equal(run.variant, "customvoice");
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal(flow["variant"], "customvoice");
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.queued"/);
    assert.match(ledger, /"variant":"customvoice"/);
  });

  it("THE VARIANT AT BIRTH, NON-FILM ARM: a stageless-body registration stamps the lane on the else queued-row writer too", async () => {
    const root = tmp();
    const body = { model: "qwen3-tts", variant: "voicedesign", voice_name: "night-frequency" };
    const { run } = await mustRegister({
      compiled: compiled([{ ...one, params: { text: "hi" } }]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 0,
      door: { runId: "run-var2" as RunId, pipeline: "qwen3-tts", cardId: "qwen3-tts", requestBody: body },
    });
    assert.equal(run.variant, "voicedesign");
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.match(ledger, /"event":"run\.queued"/);
    assert.match(ledger, /"variant":"voicedesign"/);
  });

  it("a variant-less registration stamps nothing (the lane is never guessed)", async () => {
    const root = tmp();
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 0,      door: { runId: newRunId(), pipeline: "flow_inline", requestBody: {} },

    });
    assert.equal(run.variant, undefined);
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.ok(!("variant" in flow));
    const ledger = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8");
    assert.ok(!ledger.includes('"variant"'));
  });

  it("an empty bench stamps no bench snapshot (the key stays absent, never null)", async () => {
    const root = tmp();
    const doorBase = { runId: "run-nobench" as RunId, pipeline: "m", cardId: "c", requestBody: {} };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
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
    const { run: run2 } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 3,
      door: { ...doorBase, runId: "run-nointent" as RunId, benchDoc: { stages, intent: 7 } },
    });
    assert.deepEqual(run2.benchSnapshot, { stages: [{ id: "s", provenance: "restored" }], intent: "" });
  });

  // THE COMPOSE ECHO (the one-press/one-engine law, 2026-09-23: the
  // operator pressed carried, the engine received cut, and the run
  // left NO voice saying which). A film start stamps what the engine
  // actually received — the seam values of the composed calls + the
  // bench revision the compose read — on the row, the queued sidecar,
  // and the ledger row. "What did ComfyUI get" is answered by the run
  // record itself, never by inference.
  it("THE COMPOSE ECHO: a film start stamps the seam values + bench rev on the row, the sidecar, and the ledger", async () => {
    const root = tmp();
    const body = {
      model: "h3",
      calls: [
        { text: "one", start_frame: 0, end_frame: 124 },
        { text: "two", start_frame: 124, end_frame: 243, transition: "cut" },
      ],
    };
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 0,
      door: {
        runId: "run-echo" as RunId, pipeline: "m", cardId: "h3-timeline",
        requestBody: body, benchDoc: { bench: { rev: 17 } },
      },
    });
    // the first call carries no transition — the engine's own law
    // (window 1 never carries) reads it as carried.
    assert.deepEqual(run.composeEcho, { seam: "carry,cut", calls: 2, benchRev: 17 });
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.deepEqual(flow["compose_echo"], { seam: "carry,cut", calls: 2, benchRev: 17 });
    const lines = readFileSync(join(root, "output", "_ledger.jsonl"), "utf8").split("\n");
    const queued = lines.filter((l) => l.includes("run.queued")).map((l) => JSON.parse(l) as { data: Record<string, unknown> }).at(-1);
    assert.equal(queued?.data["seam"], "carry,cut");
    assert.equal(queued?.data["calls"], 2);
    assert.equal(queued?.data["bench_rev"], 17);
    assert.equal(queued?.data["pipeline"], "m");
  });

  it("a non-film start stamps no compose echo (the key stays absent, never null)", async () => {
    const root = tmp();
    const { run } = await mustRegister({
      compiled: compiled([one]),
      testFlag: false,
      draftId: draftIdOf("d1"),
      stateRoot: root,
      enqueue: () => 0,
      door: { runId: "run-noecho" as RunId, pipeline: "m", cardId: "c", requestBody: { model: "m" } },
    });
    assert.equal(run.composeEcho, undefined);
    const flow = JSON.parse(readFileSync(join(run.dir, "_flow.json"), "utf8")) as Record<string, unknown>;
    assert.equal("compose_echo" in flow, false);
  });

  // Root bypasses permission bits, and a `return` on that path records
  // a PASS — the wall's own "never a silent skip" contract held only in
  // a comment (audit 2026-10-13). Declared skip now, so a root runner
  // reports SKIPPED rather than a false green.
  it.skipIf(typeof process.geteuid === "function" && process.geteuid() === 0)(
    "an unwritable state root throws LOUD (a refusal contract, never a silent skip)",
    async () => {
      // registerCompiledRun raw-throws the node fs Error (the write's
      // parent-dir mkdir on the 555 root raises EACCES) — the caller
      // (the start arm) folds it; pinning the loud shape here.

    const root = tmp();
    chmodSync(root, 0o555);
    try {
      await assert.rejects(
        () =>
          mustRegister({
            compiled: compiled([one]),
            testFlag: false,
            draftId: draftIdOf("d1"),
            stateRoot: root,
            door: { runId: newRunId(), pipeline: "flow_inline", requestBody: {} },
            enqueue: () => 0,
          }),
        /EACCES|EPERM|permission/i,
      );
      } finally {
        chmodSync(root, 0o755);
      }
    },
  );
});
