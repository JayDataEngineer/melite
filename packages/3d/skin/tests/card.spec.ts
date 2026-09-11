// @melite/3d-skin — the card's compose gate (TEST-2 breadth,
// 2026-09-12). body_glb admission stays on the card; the spec port
// (kind sidecar + SkinPack + SkinApply + proof sheet) rides the kit.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

/** The schema defaults as literals (the wire-string knobs ride
 *  strings, exactly what the door's default layer would hand
 *  compose). */
const SKIN_PARAMS = {
  kind: "keeper", map_size: "512", seed: 20260906,
  resolution: 768, framing: 1.2, focal_length: 50, samples: 64,
  transparent: "true",
};

beforeAll(async () => {
  def = (await loadCardDefs()).get("skin")!;
  assert.ok(def, "the composition root serves the skin card");
});

describe("the skin compose gate", () => {
  it("a missing body_glb refuses loud", () => {
    // Literal params (no def.schema()): the schema's own map_size
    // default is the NUMBER 512 while the vocabulary validates wire
    // STRINGS — the door extracts defaults without re-validation,
    // and compose coerces; parsing through the schema would refuse
    // the declared default itself.
    assert.throws(
      () => def.compose(SKIN_PARAMS, DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param 'body_glb' missing or empty on the skin lane/,
    );
  });

  it("the happy lane packs the skin and proves it", () => {
    const g = new GraphBuilder();
    def.compose({ ...SKIN_PARAMS, body_glb: "/m/b.glb", kind: "dune_hound", map_size: "1024", seed: 7 }, DUMMY_MODEL, g, "run_3");
    const graph = g.toJSON();
    assert.equal(graph["PrimitiveString.0"].inputs.value, "/m/b.glb");
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("SkinPack")),
      "the deterministic detail maps pack",
    );
    assert.ok(
      Object.keys(graph).some((k) => k.startsWith("RayRenderGLBViews")),
      "the proof turnaround renders",
    );
  });

  it("finalize is the skin strip (identity)", () => {
    const g = new GraphBuilder();
    def.compose({ ...SKIN_PARAMS, body_glb: "/m/b.glb" }, DUMMY_MODEL, g, "r1");
    assert.deepEqual(def.finalize?.(g.toJSON()), g.toJSON(), "nothing strips");
  });
});
