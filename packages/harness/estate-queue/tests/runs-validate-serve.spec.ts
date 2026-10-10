// runs-validate-serve.spec.ts — the compile-serve tail's every
// arm: branch prune (present/absent triggers, the merge, the
// absent-trigger refusal, the pruned-everything refusal),
// toGraph's output projection, the $channel gate, and the
// serve arms (200/400 shapes, the non-FlowError rethrow).
import { describe, it, expect } from "vitest";
import {
  prunedFor,
  toGraph,
  dollarTokens,
  compileFlow,
  costPreview,
  inlineArm,
  serveSubject,
} from "../src/runsValidateServe.ts";
import { buildStageRow } from "../src/runsValidateStages.ts";
import { compileFlowInline } from "../src/runsStart.ts";
import type { FlowStageRow } from "../src/runsValidateStages.ts";
import type { Flow } from "../src/runsValidateShared.ts";

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s1", engine: "comfyui", inputs: {}, outputs: { out: "image" }, expected: {},
  card: "", card_io: {}, skip_when: null, params: {}, description: "d", ...over,
});
const flowOf = (rows: FlowStageRow[]): Flow => ({ id: "f1", description: "x", stages: rows });

describe("prunedFor (the branch prune)", () => {
  it("a branchless flow rides untouched", () => {
    const f = flowOf([buildStageRow(0, stage({ id: "a" }))]);
    const out = prunedFor(f, {});
    expect(out.pruned).toEqual([]);
    expect(out.flow.stages.length).toBe(1);
  });
  it("a present-trigger prunes its stage when the key rides; keeps it when absent", () => {
    const f = flowOf([
      buildStageRow(0, stage({ id: "a", skip_when: { initial: "flag", when: "present" } })),
      buildStageRow(1, stage({ id: "b" })),
    ]);
    const pruned = prunedFor(f, { flag: 1 });
    expect(pruned.pruned).toEqual(["a"]);
    expect(pruned.flow.stages.map((s) => s.id)).toEqual(["b"]);
    const kept = prunedFor(f, {});
    expect(kept.pruned).toEqual([]);
    expect(kept.flow.stages.length).toBe(2);
  });
  it("an absent-trigger prunes when the key is missing; keeps when present", () => {
    const f = flowOf([
      buildStageRow(0, stage({ id: "a", skip_when: { initial: "flag", when: "absent" } })),
      buildStageRow(1, stage({ id: "b" })),
    ]);
    expect(prunedFor(f, {}).pruned).toEqual(["a"]);
    expect(prunedFor(f, { flag: null }).pruned).toEqual(["a"]);
    expect(prunedFor(f, { flag: 1 }).pruned).toEqual([]);
  });
  it("a pruned-everything flow refuses (a run with no stages never registers)", () => {
    const f = flowOf([buildStageRow(0, stage({ id: "a", skip_when: { initial: "flag", when: "present" } }))]);
    try {
      prunedFor(f, { flag: 1 });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/pruned every stage \(fired: \["a"\]\)/);
    }
  });
  it("a surviving stage wired to a present-pruned stage merges onto the trigger key", () => {
    const f = flowOf([
      buildStageRow(0, stage({ id: "a", outputs: { out: "image" }, skip_when: { initial: "seed", when: "present" } })),
      buildStageRow(1, stage({
        id: "b",
        inputs: { img: { stage: "a", output: "out" }, keep: { initial: "k" } },
        expected: { img: "image", keep: "num" },
        outputs: { res: "image" },
      })),
    ]);
    const out = prunedFor(f, { seed: 7 });
    expect(out.pruned).toEqual(["a"]);
    const merged = out.flow.stages.find((s) => s.id === "b");
    expect(merged?.inputs).toEqual([
      { name: "img", edge: { kind: "initial", key: "seed" } },
      { name: "keep", edge: { kind: "initial", key: "k" } },
    ]);
  });
  it("a surviving stage wired to an ABSENT-pruned stage refuses (no request key to merge)", () => {
    const f = flowOf([
      buildStageRow(0, stage({ id: "a", outputs: { out: "image" }, skip_when: { initial: "seed", when: "absent" } })),
      buildStageRow(1, stage({
        id: "b",
        inputs: { img: { stage: "a", output: "out" } },
        expected: { img: "image" },
        outputs: { res: "image" },
      })),
    ]);
    try {
      prunedFor(f, {});
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/to pruned stage .* no request key to merge/);
    }
  });
});

describe("toGraph (the output projection)", () => {
  it("stage outputs ride; cardIo rides when outputs are empty; the engine default lands last", () => {
    const f = flowOf([
      buildStageRow(0, stage({ id: "a", outputs: { out: "image" } })),
      buildStageRow(1, stage({ id: "b", outputs: {}, card_io: { thumb: "image" } })),
      buildStageRow(2, stage({ id: "c", outputs: {}, card_io: {} })),
    ]);
    const g = toGraph(f);
    expect(g[0]?.outputs).toEqual([{ name: "out", kind: "image" }]);
    expect(g[1]?.outputs).toEqual([{ name: "thumb", kind: "image" }]);
    expect(g[2]?.outputs).toEqual([{ name: "default", kind: "image" }]);
    expect(g[0]?.inputFrom).toEqual([]);
    expect(g[0]?.params).toEqual({});
  });
  it("an mcp: stage projects the mcp-client default", () => {
    const f = flowOf([buildStageRow(0, stage({ id: "m", engine: "mcp:blender", outputs: {}, card_io: {} }))]);
    expect(toGraph(f)[0]?.outputs).toEqual([{ name: "default", kind: "image" }]);
  });
});

describe("dollarTokens (the $channel walk)", () => {
  it("whole-string $ tokens ride stripped; bare $ and non-strings never ride; nesting walks", () => {
    expect(dollarTokens("$seed")).toEqual(["seed"]);
    expect(dollarTokens("$")).toEqual([]);
    expect(dollarTokens(7)).toEqual([]);
    expect(dollarTokens({ a: "$x", deep: [{ b: "$y", c: "no" }] })).toEqual(["x", "y"]);
  });
});

describe("compileFlow (the $channel gate)", () => {
  const f = (): Flow => flowOf([
    buildStageRow(0, stage({ id: "a", outputs: { out: "image" } })),
    buildStageRow(1, stage({
      id: "b", params: { seed: "$img" },
      inputs: { img: { stage: "a", output: "out" } }, expected: { img: "image" },
      outputs: { res: "image" },
    })),
  ]);
  it("a satisfied $channel compiles with its nodes and no skips", () => {
    const out = compileFlow(f(), {});
    expect(out.nodes.length).toBe(2);
    expect(out.skipped).toEqual([]);
  });
  it("an unresolved $channel refuses naming the stage, the token, and the pool", () => {
    const g = f();
    g.stages[1]!.params = { seed: "$seed" };
    try {
      compileFlow(g, {});
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/unresolved \$channel\(s\): stage "b" references \$seed \(available: a\.out, img\)/);
    }
  });
  it("an empty pool reports nothing", () => {
    const lone = flowOf([buildStageRow(0, stage({ id: "a", params: { seed: "$ghost" } }))]);
    try {
      compileFlow(lone, {});
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/\(available: nothing\)/);
    }
  });
  it("an initial edge donates its key to the pool (__initial__. prefix)", () => {
    // the input's own name is NOT the initial's key (a re-audit
    // finding, 2026-10-16): with input seed ← initial seed, the pool
    // already carried "seed" through inputNames and the __initial__
    // split was never load-bearing — name the input img so ONLY the
    // split donates "seed" and this arm fails without it
    const seeded = flowOf([buildStageRow(0, stage({
      id: "a", params: { seed: "$seed" },
      inputs: { img: { initial: "seed" } }, expected: { img: "num" },
      outputs: { out: "image" },
    }))]);
    const out = compileFlow(seeded, {});
    expect(out.nodes.length).toBe(1);
  });
});

describe("costPreview (the fresh-gateway shape)", () => {
  it("depth 0, eta null, per-engine medians unknown", () => {
    expect(costPreview(["comfyui", "agent"])).toEqual({
      queue_depth: 0,
      eta_queue_s: null,
      stages: [
        { engine: "comfyui", median_s: null, samples: 0 },
        { engine: "agent", median_s: null, samples: 0 },
      ],
    });
  });
});

describe("inlineArm + serveSubject (the serve arms)", () => {
  const inlineBody = {
    flow_inline: {
      id: "f1",
      stages: [stage({ id: "a", outputs: { out: "image" } })],
    },
  };
  it("SKIP_WHEN PARITY (audit S-S5): a skip_when doc refuses with the run door's exact voice — never a 200 skipped receipt the run door cannot honor", () => {
    const skipBody = {
      id: "f1",
      stages: [
        stage({ id: "a", skip_when: { initial: "flag", when: "present" }, outputs: { out: "image" } }),
        stage({ id: "b", outputs: { res: "image" }, inputs: { img: { stage: "a", output: "out" } }, expected: { img: "image" } }),
      ],
    };
    const ans = inlineArm(skipBody, null);
    expect(ans.status).toBe(400);
    const payload = ans.payload as Record<string, unknown>;
    expect(payload["code"]).toBe("preview_scope");
    expect(payload["error"]).toBe('flow_inline stage "a": skip_when is unported on this gateway');
    // the run door's own compiler refuses the same doc with the
    // same voice — the parity this wall exists to pin
    const startRefusal = compileFlowInline(skipBody) as {
      status: number;
      payload: { error?: unknown };
    };
    expect(startRefusal.status).toBe(400);
    expect(startRefusal.payload["error"]).toBe(
      'flow_inline stage "a": skip_when is unported on this gateway',
    );
  });

  it("a clean inline body serves 200 with nodes, cost, and no skips", () => {
    const ans = inlineArm(inlineBody, null);
    expect(ans.status).toBe(200);
    const payload = ans.payload as Record<string, unknown>;
    expect(payload["ok"]).toBe(true);
    expect(payload["flow"]).toBe("f1");
    expect(payload["skipped"]).toEqual([]);
    expect((payload["stages"] as Array<Record<string, unknown>>)[0]?.["outputs"]).toEqual({ out: "image" });
  });
  it("a body without any envelope serves itself; a null envelope still carries the stale key and refuses", () => {
    const bare = inlineArm({ id: "f1", stages: [stage({ id: "a", outputs: { out: "image" } })] }, null);
    expect(bare.status).toBe(200);
    const stale = inlineArm({ flow_inline: null, id: "f1", stages: [stage({ id: "a", outputs: { out: "image" } })] }, null);
    expect(stale.status).toBe(400);
    expect((stale.payload as Record<string, unknown>)["error"]).toMatch(/unknown keys \["flow_inline"\]/);
  });
  it("an inline body whose flow compiles to nothing serves the flow_compile 400 (renamed by the re-audit: the old name claimed batch rows ride the errors — this vehicle never produces them)", () => {
    const ans = inlineArm({ flow_inline: { id: "f1", stages: [] } }, null);
    expect(ans.status).toBe(400);
    const payload = ans.payload as Record<string, unknown>;
    expect(payload["code"]).toBe("flow_compile");
    expect(payload["loc"]).toBe("flow");
  });
  it("a non-object full rides {} into a 400; a $channel miss serves the compile 400", () => {
    expect(inlineArm("flat", null).status).toBe(400);
    expect(inlineArm(["x"], null).status).toBe(400);
    const miss = inlineArm({
      flow_inline: {
        id: "f1",
        stages: [stage({ id: "a", params: { seed: "$ghost" }, outputs: { out: "image" } })],
      },
    }, null);
    expect(miss.status).toBe(400);
    expect((miss.payload as Record<string, unknown>)["error"]).toMatch(/unresolved \$channel/);
  });
  it("a non-FlowError from construction rethrows (never mapped to 400)", () => {
    // the array stage now refuses as a TYPED FlowError (the leaked
    // TypeError was the old probe vehicle); the rethrow arm needs a
    // GENUINE non-FlowError out of flowFromBody itself — the cards
    // seat's own read, which cardGate calls with no voice of its own
    // (a stage-row fault never gets that far: buildStageRow folds
    // it into a FlowError, and the door's batch rows re-read the row
    // outside this arm — see the 2026-10-16 block below).
    const broken = {
      defsSync: (): never => { throw new TypeError("registry read failed"); },
    } as never;
    expect(() => serveSubject(
      { id: "f1", stages: [stage({ id: "a", card: "c", params: { model: "m" } })] },
      {},
      broken,
    )).toThrow(TypeError);
  });
  it("a pinned ghost class serves the workflow_pin 400 (stage-stamped)", () => {
    // An ANSWERING pin — the ghost verdict needs a registry that says
    // which classes the engine serves. With no pin the sweep is
    // unjudgeable and the door takes the schema-only 200 (the start
    // door, which composes before queuing, still refuses the ghost
    // against a live engine).
    const answering = { objectInfo: () => ({ KSampler: {} }) } as never;
    const ans = inlineArm({
      flow_inline: {
        id: "f1",
        stages: [stage({
          id: "a", outputs: { out: "image" },
          params: { workflow: { "9": { class_type: "Ghost" } } },
        })],
      },
    }, answering);
    expect(ans.status).toBe(400);
    const payload = ans.payload as Record<string, unknown>;
    expect(payload["code"]).toBe("workflow_pin");
    expect(payload["loc"]).toBe('"a"');
    expect((payload["errors"] as Array<Record<string, unknown>>)[0]?.["stage"]).toBe('"a"');
  });

  it("an UNANSWERED pin takes the schema-only 200 — never a false per-class accusation", () => {
    // The engine down (objectInfo() null) or no registry at all: the
    // sweep cannot know which classes are served, so it judges shape
    // only. The old degrade called every class unknown and refused
    // with "install the node" — false, and misdirecting.
    for (const pin of [null, { objectInfo: () => null } as never]) {
      const ans = inlineArm({
        flow_inline: {
          id: "f1",
          stages: [stage({
            id: "a", outputs: { out: "image" },
            params: { workflow: { "9": { class_type: "KSampler" } } },
          })],
        },
      }, pin);
      expect(ans.status).toBe(200);
    }
  });
});

// 2026-10-16 — the coverage queue's runsValidateServe batch. The
// rethrow arm above was long "walled" by a probe vehicle that never
// reached it: a stage row whose `id` getter throws is folded into a
// FlowError by buildStageRow, so the door takes the 400 arm, and the
// RangeError the old assertion saw escaped one line LATER — from the
// batch rows that 400 builds, which re-read the same row.
describe("serveSubject's 400 arm and its batch rows (2026-10-16, the coverage queue's runsValidateServe batch)", () => {
  it("a caught FlowError's batch rows re-read the stage row — a faulting row escapes the 400 arm as itself", () => {
    // buildStageRow folds the getter fault into a FlowError (the
    // door serves a 400), and the batch-row builder then walks the
    // same row with no fold of its own: the fault rides out as the
    // RangeError it is. The rethrow arm proper is the one above.
    const evil: Record<string, unknown> = {};
    Object.defineProperty(evil, "id", {
      get() { throw new RangeError("boom"); },
      enumerable: true,
    });
    expect(() => serveSubject({ id: "f1", stages: [evil] }, {}, null)).toThrow(RangeError);
  });

  it("a clean caught FlowError rides a 400 whose batch rows name every offending stage", () => {
    // the same builder, reached without a faulting row: the 400's
    // errors list is the per-stage batch, not just the first voice.
    const ans = serveSubject({
      id: "f1",
      stages: [
        stage({ id: "a", engine: "nope-engine" }),
        stage({ id: "b", engine: "nope-engine" }),
      ],
    }, {}, null);
    expect(ans.status).toBe(400);
    const payload = ans.payload as { code?: string; errors?: Array<Record<string, unknown>> };
    expect(payload.code).toBe("flow_compile");
    const stages = (payload.errors ?? []).map((r) => r["stage"]);
    expect(stages).toContain('"a"');
    expect(stages).toContain('"b"');
  });
});
