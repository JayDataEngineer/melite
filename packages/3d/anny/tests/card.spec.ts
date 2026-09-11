// @melite/3d-anny — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission stays on the card (the lane body rides the
// kit): body_glb must be a real non-empty value, and the optional
// SAM ingest fires only when a source photo rides along.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("anny")!;
  assert.ok(def, "the composition root serves the anny card");
});

describe("the anny compose gate", () => {
  it("a missing body_glb refuses loud (never a mannequin)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'body_glb' missing or empty on the anny card/,
    );
  });

  it("an all-whitespace body_glb refuses too", () => {
    assert.throws(
      () => def.compose(def.schema({ body_glb: "   " }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /body_glb/,
    );
  });

  it("the happy lane composites the body and renders the views", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "/m/anny-base-body.glb", resolution: 512 }), DUMMY_MODEL, g, "r1");
    const graph = g.toJSON();
    assert.equal(graph["PrimitiveString.0"].inputs.value, "/m/anny-base-body.glb");
    assert.ok(graph["CompositeCharacter.0"], "the composite node rides the body path");
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("RayRenderGLBViews")),
      "the turnaround views node is emitted",
    );
    assert.equal(Object.keys(graph).find((k) => k.startsWith("LoadImage")), undefined, "no ingest without a source photo");
  });

  it("a source photo fires the SAM ingest side", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ body_glb: "/m/body.glb", source_image: "/m/photo.png", transparent: "false" }),
      DUMMY_MODEL, g, "r1",
    );
    const graph = g.toJSON();
    assert.equal(graph["LoadImage.0"].inputs.image, "/m/photo.png");
    assert.ok(graph["RaySAMSegmentHairClothing.0"], "the SAM sprite node rides the loaded image");
  });

  it("finalize is the anny strip (identity on the empty strip table)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ body_glb: "/m/body.glb" }), DUMMY_MODEL, g, "r1");
    assert.deepEqual(def.finalize?.(g.toJSON()), g.toJSON(), "nothing strips");
  });
});
