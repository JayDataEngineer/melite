// The atom's own proof (the atom vocabulary, stroke 3): the remesh
// action's serialized prompt is BYTE-IDENTICAL to the legacy
// quadRemeshLane on the same doc — the card's binding change moves
// no wire. The family is weightless (the door is the vacuous
// parse); no sampler rides the single node, so no seed-sentinel.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { quadRemeshLane, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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

describe("the autoremesher remesh action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy lane (the single AutoRemesher node IS the lane)", () => {
    const legacy = new GraphBuilder({});
    quadRemeshLane({ ...PARAMS }, legacy, "probe");
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodeOf(action).inputs.preset, "", "no budget class — the budget law is explicit");
    assert.equal(nodeOf(action).inputs.filename_prefix, "probe/remeshed", "compose stamps the run prefix (the family constant shape)");
  });

  it("byte equality holds with re-stated knobs (a tighter quad budget)", () => {
    const p = { ...PARAMS, target_quads: 250000, edge_scaling: 0.8, sharp_edge: 60 };
    const legacy = new GraphBuilder({});
    quadRemeshLane({ ...p }, legacy, "probe-2");
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...p }, FACTS, action, "probe-2");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodeOf(action).inputs.target_quads, 250000);
  });

  it("byte equality holds on an empty input (the lane's own coercion, never a second gate)", () => {
    const p = { ...PARAMS, input: "" };
    const legacy = new GraphBuilder({});
    quadRemeshLane({ ...p }, legacy, "probe-empty");
    const action = new GraphBuilder({});
    instantiateAction(remesh, { ...p }, FACTS, action, "probe-empty");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodeOf(action).inputs.glb_path, "", "the empty path rides verbatim (the node refuses it loudly)");
  });

  it("the door is the weightless vacuous parse (the binary owns its own weights)", () => {
    assert.deepEqual(parseAutoRemesherFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.equal((FACTS.lane_inputs as { weightless?: boolean }).weightless, true, "the family row declares weightless");
  });
});
