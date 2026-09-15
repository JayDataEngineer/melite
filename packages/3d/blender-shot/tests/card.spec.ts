// @melite/3d-blender-shot — the card's compose gate. scene is
// OPTIONAL (empty = the live session — the loop's whole point), so
// this gate pins the graph shape, the run-stamped tag, and the
// SaveImage tail — there is no refusal arm to cover.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("blender-shot")!;
  assert.ok(def, "the composition root serves the blender-shot card");
});

describe("the blender-shot compose gate", () => {
  it("a mesh scene renders and tails the shot", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ scene: "/b/body.glb", width: 512, height: 512, timeout: 120 }),
      DUMMY_MODEL, g, "run_7",
    );
    const graph = g.toJSON();
    const shot = graph["MeliteBlenderRenderShot.0"] as { inputs: Record<string, unknown> };
    assert.ok(shot, "the shot node derives");
    assert.equal(shot.inputs.scene, "/b/body.glb");
    assert.equal(shot.inputs.tag, "run_7_shot");
    assert.equal(shot.inputs.width, 512);
    assert.equal(shot.inputs.height, 512);
    assert.equal(shot.inputs.timeout, 120);
    const tail = graph["SaveImage.0"] as { inputs: Record<string, unknown> };
    assert.ok(tail, "the image tail derives");
    assert.equal(tail.inputs.filename_prefix, "run_7/shot");
  });

  it("an empty scene keeps the live session (the iterative case)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({}), DUMMY_MODEL, g, "r1");
    const shot = g.toJSON()["MeliteBlenderRenderShot.0"] as { inputs: Record<string, unknown> };
    assert.equal(shot.inputs.scene, "");
    assert.equal(shot.inputs.tag, "r1_shot");
  });

  it("defaults ride the node untouched (768 square, 300s)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ scene: "/b/body.glb" }), DUMMY_MODEL, g, "r1");
    const shot = g.toJSON()["MeliteBlenderRenderShot.0"] as { inputs: Record<string, unknown> };
    assert.equal(shot.inputs.width, 768);
    assert.equal(shot.inputs.height, 768);
    assert.equal(shot.inputs.timeout, 300);
  });

  it("hand-composed params ride the fallbacks (no schema, no throw)", () => {
    const g = new GraphBuilder();
    def.compose({} as never, DUMMY_MODEL, g, "r1");
    const graph = g.toJSON();
    assert.ok(graph["MeliteBlenderRenderShot.0"], "the shot derives without params");
    assert.ok(graph["SaveImage.0"], "the tail derives without params");
  });

  it("the tail wires the shot image, not a log", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ scene: "/b/body.glb" }), DUMMY_MODEL, g, "run_9");
    const tail = g.toJSON()["SaveImage.0"] as { inputs: Record<string, unknown> };
    assert.deepEqual(tail.inputs.images, ["MeliteBlenderRenderShot.0", 0]);
    assert.equal(tail.inputs.filename_prefix, "run_9/shot");
  });
});
