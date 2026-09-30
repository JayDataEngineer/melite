// The atom's own proof (the atom vocabulary, stroke 2 — the card-system
// stroke): the bind action composes the anyCreature skeleton bind the
// arm used to own in the card kit, and its serialized prompt is pinned
// to a COMMITTED GOLDEN — recorded while the kit's legacy rigSpeciesArm
// still existed and the rig card's own node-id walls compared the
// composed graphs node by node. That arm is deleted; the golden carries
// the compatibility law. The lane is weightless (the skeletons ride in
// the caller's own GLB), so the facts door is the vacuous parse. The
// interpreter's own contract walls live in card-kit's
// tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join } from "node:path";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { DECL } from "../src/index.ts";
import { bind, parseSpeciesBindFacts } from "../src/actions.ts";

const FACTS: ModelFacts = {
  id: DECL.id,
  card: "rig",
  defaults: {},
  lane_inputs: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : DECL.mods.map((x) => (typeof x === "string" ? x : x.pack)),
};

const PARAMS = {
  creature_glb: "/m/creature.glb",
  mesh_glb: "/m/mesh.glb",
  height_ratio: 0.9,
  max_influences: 4,
  strip_body: true,
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(bind, p as never, FACTS, g, "probe");
  return g.toJSON() as never;
};

describe("the species bind action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the mesh binds onto the template)", () => {
    const graph = compose(PARAMS);
    assertGraphGolden(golden("species-bind-whole-body"), graph, "the anyCreature bind");
    const bridge = graph["RayCreatureRigBridge.0"]!;
    assert.deepEqual(bridge.inputs.creature_glb, ["PrimitiveString.0", 0], "the template rides the bridge");
    assert.deepEqual(bridge.inputs.mesh_glb, ["PrimitiveString.1", 0], "the mesh rides the bridge");
    assert.equal(bridge.inputs.height_ratio, 0.9, "the bind height ratio rides verbatim");
    assert.equal(bridge.inputs.max_influences, 4, "the influence cap rides verbatim");
    assert.equal(bridge.inputs.strip_body, true, "the strip-body flag rides");
    const save = graph["SaveRiggedModel.0"]!;
    assert.deepEqual(save.inputs.rigged_path, ["RayCreatureRigBridge.0", 0], "the bound skeleton persists");
  });

  it("the full-body arm holds the golden (strip_body off keeps the creature mesh)", () => {
    assertGraphGolden(
      golden("species-bind-full-body"),
      compose({ ...PARAMS, strip_body: false }),
      "the full-body arm",
    );
  });

  it("the weightless door parses anything (absent ≡ {} — nothing can drift)", () => {
    assert.deepEqual(parseSpeciesBindFacts({}), {});
    assert.deepEqual(parseSpeciesBindFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
