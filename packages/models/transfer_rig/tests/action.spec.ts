// The atom's own proof (the atom vocabulary, stroke 3): the
// transfer action's serialized prompt is BYTE-IDENTICAL to the
// legacy transferRigArm on the same doc — the card's binding
// change moves no wire. The family's own required-pair admission
// moved in with the arm (the UI-label law rides verbatim); the
// family is path-based (the door is the vacuous parse).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { transferRigArm, instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { transfer, parseTransferRigFacts } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "img-to-mesh",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
};

const PARAMS = {
  rigged_glb: "/models/rigs/donor-rigged.glb",
  target_glb: "/out/clothed-target.glb",
};

const nodesOf = (g: GraphBuilder, cls: string): Array<{ inputs: Record<string, unknown> }> =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).filter(
    (n) => n.class_type === cls,
  );

describe("the transfer_rig transfer action — byte-stability (the compatibility law)", () => {
  it("the action's serialized prompt is identical to the legacy arm (the GPU KNN weight transfer)", () => {
    const legacy = new GraphBuilder({});
    transferRigArm(legacy, { ...PARAMS });
    const action = new GraphBuilder({});
    instantiateAction(transfer, { ...PARAMS }, FACTS, action, "probe");
    assert.deepEqual(action.toJSON(), legacy.toJSON());
    assert.equal(nodesOf(action, "KimodoTransferWeights").length, 1, "one transfer node");
    assert.equal(nodesOf(action, "SaveRiggedModel").length, 1, "the written GLB persists");
    const paths = nodesOf(action, "PrimitiveString").map((n) => (n.inputs as { value: string }).value);
    assert.deepEqual(paths.sort(), [...Object.values(PARAMS)].sort(), "the two mount paths ride as constants");
  });

  it("the family's own admission refuses a missing half of the pair (the UI-label law)", () => {
    assert.throws(
      () => instantiateAction(transfer, { target_glb: "/out/x.glb" }, FACTS, new GraphBuilder({}), "probe-miss"),
      /required param\(s\) 'rigged_glb' \(Rigged source GLB\) missing on the transfer_rig lane/,
    );
    assert.throws(
      () => instantiateAction(transfer, { rigged_glb: "/m/d.glb" }, FACTS, new GraphBuilder({}), "probe-miss"),
      /required param\(s\) 'target_glb' \(Target GLB\) missing on the transfer_rig lane/,
    );
    assert.throws(
      () => instantiateAction(transfer, {}, FACTS, new GraphBuilder({}), "probe-miss"),
      /'rigged_glb' \(Rigged source GLB\), 'target_glb' \(Target GLB\)/,
    );
  });

  it("the door is the vacuous parse (the transfer is path-based — the row's lane weights never reach the segment)", () => {
    assert.deepEqual(parseTransferRigFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.equal((FACTS.lane_inputs as { weightless?: boolean }).weightless, false, "the row carries lane weights (boot/mirror truth); the segment composes none");
  });
});
