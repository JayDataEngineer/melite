// The atom's own proof (the atom vocabulary, stroke 2 — the card-system
// stroke): the rig action composes the SOMA-77 weight transfer the arm
// used to own in the card kit, and its serialized prompt is pinned to a
// COMMITTED GOLDEN — recorded while the kit's legacy rigSomaArm still
// existed and the rig card's own node-id walls compared the composed
// graphs node by node. That arm is deleted; the golden carries the
// compatibility law. The lane is weightless (the template's weights
// ship in the autorig pack, nothing is downloaded), so the facts door
// is the vacuous parse. The interpreter's own contract walls live in
// card-kit's tests/action.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { join } from "node:path";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { DECL } from "../src/index.ts";
import { rig, parseSomaRigFacts } from "../src/actions.ts";

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
  mesh_glb: "/m/mesh.glb",
  preserve_texture: true,
  decimate_ratio: 0.5,
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);
const compose = (p: Record<string, unknown>): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const g = new GraphBuilder({});
  instantiateAction(rig, p as never, FACTS, g, "probe");
  return g.toJSON() as never;
};

describe("the soma rig action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (the template's weights apply)", () => {
    const graph = compose(PARAMS);
    assertGraphGolden(golden("soma-rig-apply-weights"), graph, "the SOMA-77 weight transfer");
    const exportNode = graph["KimodoExportFBX.0"]!;
    assert.deepEqual(exportNode.inputs.source_glb, ["PrimitiveString.0", 0], "the mesh rides the export");
    assert.deepEqual(exportNode.inputs.rigged_path, ["PrimitiveString.1", 0], "rigged_path rides EMPTY (no npz)");
    assert.equal(exportNode.inputs.file_format, "glb", "glb out");
    assert.equal(exportNode.inputs.preserve_texture, true, "the texture flag rides verbatim");
    assert.equal(exportNode.inputs.decimate_ratio, 0.5, "the decimate ratio rides");
  });

  it("the texture-off and decimate-off arms hold the golden (the boolean and the 0 mean what they say)", () => {
    assertGraphGolden(
      golden("soma-rig-stripped-textures"),
      compose({ ...PARAMS, preserve_texture: false }),
      "the stripped-texture arm",
    );
    assertGraphGolden(
      golden("soma-rig-decimate-off"),
      compose({ ...PARAMS, decimate_ratio: 0 }),
      "the decimate-off arm",
    );
  });

  it("the fbx arm holds the golden (the Unity import door)", () => {
    const graph = compose({ ...PARAMS, file_format: "fbx" });
    assertGraphGolden(golden("soma-rig-fbx"), graph, "the fbx arm");
    const exportNode = graph["KimodoExportFBX.0"]!;
    assert.equal(exportNode.inputs.file_format, "fbx", "fbx out — the node converts through headless Blender");
  });

  it("the weightless door parses anything (absent ≡ {} — nothing can drift)", () => {
    assert.deepEqual(parseSomaRigFacts({}), {});
    assert.deepEqual(parseSomaRigFacts({ unet: "whatever" }), {}, "unknown keys ride unvalidated");
  });
});
