// @melite/3d-fit — the card's compose gate (TEST-2 breadth,
// 2026-09-12). The three admissions live on the card: body, prop,
// and the carrying bone; the lane body rides the kit.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("fit")!;
  assert.ok(def, "the composition root serves the fit card");
});

describe("the fit compose gate", () => {
  it("body and prop missing refuse TOGETHER, named", () => {
    assert.throws(
      () => def.compose(def.schema({ bone: "mixamorig:Head" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) body_glb, prop_glb missing on the fit lane/,
    );
  });

  it("the prop alone refuses when the body is present", () => {
    assert.throws(
      () => def.compose(def.schema({ body_glb: "/m/b.glb" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) prop_glb missing on the fit lane/,
    );
  });

  it("the body alone refuses when the prop is present", () => {
    assert.throws(
      () => def.compose(def.schema({ prop_glb: "/m/p.glb", bone: "b" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) body_glb missing on the fit lane/,
    );
  });

  it("a missing bone refuses (the schema default never reaches hand-composed params)", () => {
    assert.throws(
      () => def.compose({ body_glb: "/m/b.glb", prop_glb: "/m/p.glb" } as never, DUMMY_MODEL, new GraphBuilder(), "r1"),
      /bone is required on the fit lane/,
    );
  });

  it("an empty bone refuses (which bone carries the prop)", () => {
    assert.throws(
      () => def.compose(def.schema({ body_glb: "/m/b.glb", prop_glb: "/m/p.glb", bone: " " }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /bone is required on the fit lane/,
    );
  });

  it("the happy lane seats the prop under the placement laws", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        body_glb: "/m/b.glb", prop_glb: "/m/p.glb", bone: "mixamorig:Head",
        align: "grip", position: "1,0,0", rotation: "0,90,0",
        fit_ratio: 0.5, seat_ratio: 0.3, target_width: 2,
      }),
      DUMMY_MODEL, g, "run_9",
    );
    const graph = g.toJSON();
    const row = graph["FitRow.0"];
    assert.ok(row, "the runtime row derives");
    assert.equal(row.inputs.bone, "mixamorig:Head");
    assert.equal(row.inputs.align, "grip");
    assert.equal(row.inputs.model_name, "p", "the Unity prop name is the filename stem");
    assert.ok(graph["FitProp.0"], "the prop seats on the body");
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("RayRenderGLBViews")),
      "the 8-view proof sheet renders",
    );
  });

  it("finalize is the fit strip (identity)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "/m/b.glb", prop_glb: "/m/p.glb", bone: "b" }), DUMMY_MODEL, g, "r1");
    assert.deepEqual(def.finalize?.(g.toJSON()), g.toJSON(), "nothing strips");
  });
});
