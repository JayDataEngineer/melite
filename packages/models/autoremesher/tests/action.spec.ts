// the wire is pinned to a COMMITTED GOLDEN — recorded while the kit's legacy
// quadRemeshLane still existed and this spec compared the two arms
// byte-for-byte. That arm is deleted (the families own their lanes now), so
// the golden carries the compatibility law. The family is weightless (the
// door is the vacuous parse); no sampler rides the single node, so no
// seed-sentinel.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { join } from "node:path";
import { DECL } from "../src/index.ts";
import { remesh, parseAutoRemesherFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "quad-remesh",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
};

const PARAMS = {
  input: "/out/dense-soup.glb",
  target_quads: 80000,
  edge_scaling: 0.5,
  sharp_edge: 30,
  adaptivity: 0.5,
  anisotropy: 0.5,
};

const nodeOf = (g: GraphBuilder): { inputs: Record<string, unknown> } =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
    (n) => n.class_type === "AutoRemesher",
  )!;

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the autoremesher remesh action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the single AutoRemesher node IS the lane)", () => {
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("the-composed-prompt-is-the-committed-golden-the-single-autor"), graphOf(action), "the composed prompt is the committed golden (the single AutoRemesher node IS the lane)");
    assert.equal(nodeOf(action).inputs.preset, "hero",
      "the node's combo takes a budget class, never '' (the af-move stop, 2026-10-09) — the undeclared row rides the declared default");
    assert.equal(nodeOf(action).inputs.filename_prefix, "probe/remeshed", "compose stamps the run prefix (the family constant shape)");
  });

  it("the golden holds with re-stated knobs (a tighter quad budget)", () => {
    const p = { ...PARAMS, target_quads: 250000, edge_scaling: 0.8, sharp_edge: 60 };
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...p }, FACTS, action, "probe-2");
    assertGraphGolden(golden("the-golden-holds-with-re-stated-knobs-a-tighter-quad-budget"), graphOf(action), "the golden holds with re-stated knobs (a tighter quad budget)");
    assert.equal(nodeOf(action).inputs.target_quads, 250000);
  });

  it("the golden holds on an empty input (the lane's own coercion, never a second gate)", () => {
    const p = { ...PARAMS, input: "" };
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...p }, FACTS, action, "probe-empty");
    assertGraphGolden(golden("the-golden-holds-on-an-empty-input-the-lane-s-own-coercion-n"), graphOf(action), "the golden holds on an empty input (the lane's own coercion, never a second gate)");
    assert.equal(nodeOf(action).inputs.glb_path, "", "the empty path rides verbatim (the node refuses it loudly)");
  });

  it("the door is the vacuous parse (the binary owns its own weights)", () => {
    assert.deepEqual(parseAutoRemesherFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.equal(DECL.lane_inputs, undefined, "the family declares no lane facts at all");
  });
});
