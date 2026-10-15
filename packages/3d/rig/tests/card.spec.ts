// @melite/3d-rig — the card's compose gate (the quad-remesh wall
// precedent). The rig lane table's own refusals live HERE on the
// card: the mesh must be named; the mode is a closed set; each mode
// names its own required pair (copy needs the donor, species needs
// the creature template). Everything else rides to the nodes' own
// loud laws.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs, theService } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { resolveCardFlowOutputs } from '@melite/comfyui-cordis'
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("rig")!;
  assert.ok(def, "the composition root serves the rig card");
});

describe("the rig compose gate", () => {
  it("a missing mesh refuses loud (the rig needs its mesh)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'mesh_glb' \(Mesh to rig\) missing on the rig card/,
    );
  });

  it("the mode table is closed (auto|copy|species — nothing else composes)", () => {
    assert.throws(
      () => def.schema({ mesh_glb: "/m/body.glb", mode: "magic" }),
      /mode|auto|copy|species/i,
    );
  });

  it("the copy lane names its donor (the rig copy needs the rigged source)", () => {
    assert.throws(
      () => def.compose(def.schema({ mesh_glb: "/m/clothed.glb", mode: "copy" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'donor_glb' \(Rigged donor GLB\) missing on the rig card's copy lane/,
    );
  });

  it("the species lane names its creature template (the bind needs the skeleton)", () => {
    assert.throws(
      () => def.compose(def.schema({ mesh_glb: "/m/beast.glb", mode: "species" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'creature_glb' \(Creature template GLB\) missing on the rig card's species lane/,
    );
  });
});

describe("the rig lanes (one mode, one graph shape)", () => {
  it("THE AUTO LANE: a lone KimodoExportFBX — source_glb wired, rigged_path empty, glb out (the node's own dispatch picks apply_weights)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ mesh_glb: "/m/body.glb" }), DUMMY_MODEL, g, "run_a");
    const graph = g.toJSON();
    const node = graph["KimodoExportFBX.0"];
    assert.ok(node, "the auto lane is the single capture node");
    assert.equal(node.inputs.file_format, "glb");
    assert.equal(node.inputs.preserve_texture, true, "textures keep by default (schema-declared)");
    assert.equal(node.inputs.decimate_ratio, 0, "decimation is OFF by default on the rig hop");
    // rigged_path rides the empty PrimitiveString (the required-but-unused slot)
    const values = Object.values(graph).map((n: { inputs?: Record<string, unknown> }) => n.inputs?.value);
    assert.ok(values.includes(""), "the empty rigged_path string node exists");
    assert.ok(values.includes("/m/body.glb"), "the mesh rides a PrimitiveString into source_glb");
  });

  it("THE COPY LANE: KimodoTransferWeights (donor→target) + SaveRiggedModel — the live transfer-rig arm verbatim", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ mesh_glb: "/m/clothed.glb", mode: "copy", donor_glb: "/m/rigged-donor.glb" }),
      DUMMY_MODEL, g, "run_c",
    );
    const graph = g.toJSON();
    const transfer = graph["KimodoTransferWeights.0"];
    assert.ok(transfer, "the copy lane rides the GPU weight transfer");
    const save = graph["SaveRiggedModel.0"];
    assert.ok(save, "the rigged GLB lands through the saver");
    const values = Object.values(graph).map((n: { inputs?: Record<string, unknown> }) => n.inputs?.value);
    assert.ok(values.includes("/m/rigged-donor.glb") && values.includes("/m/clothed.glb"),
      "the donor and the target both wire as strings");
  });

  it("THE SPECIES LANE: RayCreatureRigBridge with the template + mesh and the declared knobs", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ mesh_glb: "/m/beast.glb", mode: "species", creature_glb: "/m/fox-template.glb", height_ratio: 0.9, max_influences: 4 }),
      DUMMY_MODEL, g, "run_s",
    );
    const graph = g.toJSON();
    const bridge = graph["RayCreatureRigBridge.0"];
    assert.ok(bridge, "the species lane is the single bridge node (it writes itself)");
    assert.equal(bridge.inputs.height_ratio, 0.9);
    assert.equal(bridge.inputs.max_influences, 4);
    assert.equal(bridge.inputs.strip_body, true, "the body strips by default (schema-declared)");
    const save = graph["SaveRiggedModel.0"];
    assert.ok(save, "the species lane terminates in the output capture node");
    assert.deepEqual(save.inputs.rigged_path, ["RayCreatureRigBridge.0", 0]);
  });

  it("the package root is a node-side host marker", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const marker = await import("../src/index.ts");
    const ctx = new Context();
    marker.apply(ctx);
    assert.equal(marker.name, "@melite/3d-rig");
    assert.deepEqual(marker.inject, []);
  });

  it("THE SCHEMA GATE: an out-of-envelope decimate_ratio refuses loud (declared 0–1), never composes", () => {
    assert.throws(
      () => def.compose({ mesh_glb: "/m/body.glb", decimate_ratio: 1.5 }, DUMMY_MODEL, new GraphBuilder(), "r_oob"),
      /decimate_ratio|1.5|between|range/i,
    );
  });
});

describe("the rig declaration and flow output contract", () => {
  it("declares mesh atoms and mode-scoped controls", () => {
    const env = theService().formSchemas("rig", "rig")!.schema as {
      uid: number;
      refs: Record<string, { dict?: Record<string, number>; meta?: { extra?: Record<string, unknown> } }>;
    };
    const root = env.refs[env.uid]!;
    const extra = (name: string): Record<string, unknown> => {
      const id = root.dict?.[name];
      return id === undefined ? {} : env.refs[id]?.meta?.extra ?? {};
    };
    assert.equal(extra("mesh_glb").wtype, "mesh");
    assert.equal(extra("donor_glb").wtype, "mesh");
    assert.equal(extra("donor_glb").visible_when, "mode=copy");
    assert.equal(extra("creature_glb").visible_when, "mode=species");
    assert.equal(extra("preserve_texture").visible_when, "mode=auto");
  });

  it("keeps the mode producer predicates exclusive", () => {
    const [auto, rigged] = def.flowOutputBindings!;
    assert.equal(auto.when?.({}), true);
    assert.equal(rigged.when?.({}), false);
    assert.equal(auto.when?.({ mode: "copy" }), false);
    assert.equal(rigged.when?.({ mode: "species" }), true);
  });

  it("binds one real producer for every rig mode", () => {
    const cases = [
      { mode: "auto", node: "KimodoExportFBX.0" },
      { mode: "copy", donor_glb: "/m/donor.glb", node: "SaveRiggedModel.0" },
      { mode: "species", creature_glb: "/m/fox.glb", node: "SaveRiggedModel.0" },
    ] as const;
    for (const entry of cases) {
      const { node, ...modeParams } = entry;
      const params = def.schema({ mesh_glb: "/m/body.glb", ...modeParams });
      const g = new GraphBuilder();
      def.compose(params, DUMMY_MODEL, g, entry.mode);
      assert.deepEqual(resolveCardFlowOutputs(def, params, g.toJSON()), {
        outputs: { default: "mesh" },
        outputNodes: { default: node },
      });
    }
  });
});
