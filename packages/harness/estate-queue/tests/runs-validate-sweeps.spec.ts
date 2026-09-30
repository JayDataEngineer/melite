// runs-validate-sweeps.spec.ts — the batch-row + workflow-pin
// sweep validators' every arm: batchRows' labels and probe
// voices, servedNodeClasses' degrade, validateWorkflow's node
// verdicts, and sweepWorkflows' engine scoping.
import { describe, it, expect } from "vitest";
import {
  batchRows,
  servedNodeClasses,
  validateWorkflow,
  sweepWorkflows,
} from "../src/runsValidateSweeps.ts";

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s1", engine: "comfyui", inputs: {}, outputs: { out: "image" }, expected: {},
  card: "", card_io: {}, skip_when: null, params: {}, description: "d", ...over,
});

describe("batchRows (the per-stage probe table)", () => {
  it("always opens with the flow row; a stages-less body stops there", () => {
    expect(batchRows("flat", "boom", null)).toEqual([
      { scope: "flow", error: "boom", code: "flow_compile", loc: "flow" },
    ]);
    expect(batchRows({ noid: 1 }, "boom", null)).toEqual([
      { scope: "flow", error: "boom", code: "flow_compile", loc: "flow" },
    ]);
  });
  it("a clean stage adds no rows; a broken stage adds its labelled row", () => {
    expect(batchRows({ stages: [stage({ id: "a" })] }, "boom", null).length).toBe(1);
    const rows = batchRows({ stages: [stage({ id: "a" }), stage({ id: "b", engine: "" })] }, "boom", null);
    expect(rows.length).toBe(2);
    expect(rows[1]).toMatchObject({ stage: '"b"', code: "flow_compile" });
  });
  it("labels: missing id names the index; nulls label null; non-objects name the index", () => {
    const noId: Record<string, unknown> = stage();
    delete noId["id"];
    const rows = batchRows({ stages: [noId, 7, null] }, "boom", null);
    // noId probes clean (id missing is a FlowError at build — a row);
    // 7 and null are non-objects (index labels, no probe)
    expect(rows[0]).toMatchObject({ scope: "flow" });
    expect(rows.length).toBe(2);
  });
  it("a non-FlowError probe rethrows (the card miswire leaks LOUD)", () => {
    // a card stage with no registry: kindsOk -> cardGate ->
    // needCardRegistry's plain Error (not a FlowError)
    expect(() => batchRows({ stages: [stage({ id: "a", card: "tool", params: {} })] }, "boom", null))
      .toThrow(/no CardRegistryService/);
  });
  it("a workflow pin rides the batch rows too (the sweep leg)", () => {
    // An ANSWERING pin: the ghost verdict needs a pin that says which
    // classes the engine serves (an absent pin is unjudgeable, not an
    // empty roster).
    const rows = batchRows({
      stages: [stage({ id: "a", params: { workflow: { "9": { class_type: "Ghost" } } } })],
    }, "boom", { objectInfo: () => ({ KSampler: {} }) } as never);
    expect(rows.length).toBe(2);
    expect(rows[1]).toMatchObject({ stage: '"a"', code: "workflow_pin" });
  });
});

describe("servedNodeClasses (the pin's state, not an empty set)", () => {
  it("null means NOBODY CAN ASK; a set means the engine answered", () => {
    // No cards seat (a non-plugin caller) and a mounted owner whose
    // engine never answered are both UNJUDGEABLE — null, so the
    // membership verdict is skipped instead of accusing every class.
    expect(servedNodeClasses(null)).toBeNull();
    expect(servedNodeClasses(undefined)).toBeNull();
    expect(servedNodeClasses({ objectInfo: () => null } as never)).toBeNull();
    // The engine answering with no classes IS an answer — a real,
    // empty set, and the sweep judges against it.
    expect(servedNodeClasses({ objectInfo: () => ({}) } as never)).toEqual(new Set());
    const cards = { objectInfo: () => ({ KSampler: {}, VAE: {} }) };
    expect(servedNodeClasses(cards as never)).toEqual(new Set(["KSampler", "VAE"]));
  });
});

describe("validateWorkflow (the pin verdicts)", () => {
  it("a params without a workflow object sweeps clean; a nested workflow unwraps", () => {
    expect(validateWorkflow({}, null)).toEqual([]);
    expect(validateWorkflow({ workflow: "flat" }, null)).toEqual([]);
    expect(validateWorkflow({ workflow: [1] }, null)).toEqual([]);
    expect(validateWorkflow({ workflow: {} }, null)).toEqual([]);
    // No pin to judge against: the schema-only verdict. The old
    // degrade called this a refusal ("Ghost is not in the engine's
    // served node set (0 known classes) — install the node"), a false
    // accusation with a wrong instruction whenever the engine was
    // merely down.
    expect(
      validateWorkflow({ workflow: { workflow: { "1": { class_type: "Ghost" } } } }, null),
    ).toEqual([]);
    // Structure is judged without any pin — that check needs no engine.
    expect(
      validateWorkflow({ workflow: { "1": { no_class: 1 } } }, null),
    ).toHaveLength(1);
  });
  it("a classless node, a scalar node, and an unknown class each refuse; a known class rides", () => {
    const rows = validateWorkflow({
      workflow: {
        "1": { no_class: 1 },
        "2": 7,
        "3": { class_type: "GhostNode" },
        "4": { class_type: "KSampler" },
        "5": { class_type: 7 },
      },
    }, { objectInfo: () => ({ KSampler: {} }) } as never);
    expect(rows.length).toBe(4);
    expect(rows[0]).toMatch(/"1": no class_type/);
    expect(rows[1]).toMatch(/"2": no class_type/);
    expect(rows[2]).toMatch(/"3": class_type "GhostNode" is not in the engine's served node set \(1 known classes\)/);
    expect(rows[3]).toMatch(/"5": class_type 7 is not in the engine's served node set/);
  });
});

describe("sweepWorkflows (the engine scoping)", () => {
  it("non-comfyui engines, non-object params, and stages-less bodies sweep clean", () => {
    expect(sweepWorkflows("flat", null)).toEqual([]);
    expect(sweepWorkflows({ stages: [stage({ engine: "agent" })] }, null)).toEqual([]);
    expect(sweepWorkflows({ stages: [stage({ params: "flat" })] }, null)).toEqual([]);
    expect(sweepWorkflows({ stages: [stage({ params: null })] }, null)).toEqual([]);
    expect(sweepWorkflows({ stages: [stage({ params: [1] })] }, null)).toEqual([]);
    expect(sweepWorkflows({ stages: [7, null, "x"] }, null)).toEqual([]);
  });
  it("a labelless stage names its index; a pinned ghost stamps a workflow_pin row", () => {
    const answering = { objectInfo: () => ({ KSampler: {} }) } as never;
    const rows = sweepWorkflows({
      stages: [stage({ params: { workflow: { "9": { class_type: "Ghost" } } } })],
    }, answering);
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ stage: '"s1"', code: "workflow_pin" });
    const noId: Record<string, unknown> = stage({ params: { workflow: { "9": { class_type: "Ghost" } } } });
    delete noId["id"];
    const indexed = sweepWorkflows({ stages: [noId] }, answering);
    expect(indexed[0]?.["stage"]).toBe('"stage[0]"');
  });
  it("a non-string engine skips (never a throw on this sweep leg)", () => {
    const bad: Record<string, unknown> = stage({ params: { workflow: { "9": { class_type: "Ghost" } } } });
    bad["engine"] = 7;
    expect(sweepWorkflows({ stages: [bad] }, null)).toEqual([]);
  });
});
