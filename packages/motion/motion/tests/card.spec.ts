// @melite/motion — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: the motion lane generates FROM a text
// prompt; the lane body rides the kit against the REAL kimodo
// facts row. finalize strips the bake's autofills.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let kimodo: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("motion")!;
  assert.ok(def, "the composition root serves the motion card");
  kimodo = facts.models.kimodo!;
  assert.ok(kimodo, "the kimodo facts row serves");
});

describe("the motion compose gate", () => {
  it("a missing prompt refuses loud (the lane generates FROM text)", () => {
    assert.throws(
      () => def.compose(def.schema({}), kimodo, new GraphBuilder(), "r1"),
      /required param 'prompt' missing on the motion card/,
    );
  });

  it("a whitespace prompt refuses too", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "   " }), kimodo, new GraphBuilder(), "r1"),
      /required param 'prompt' missing on the motion card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope diffusion_steps refuses loud (declared 10–200), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "walks forward", diffusion_steps: 500 }, kimodo, new GraphBuilder(), "r_oob"),
      /diffusion_steps|500|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed diffusion_steps refuses loud", () => {
    assert.throws(
      () => def.compose({ prompt: "walks forward", diffusion_steps: "many" }, kimodo, new GraphBuilder(), "r_type"),
      /diffusion_steps|many/i,
    );
  });

  it("THE SCHEMA GATE: unstated diffusion_steps arrives as the declared default 25 (the walk fills it)", () => {
    const g = new GraphBuilder();
    def.compose({ prompt: "walks forward" }, kimodo, g, "r_def");
    assert.equal(g.toJSON()["KimodoTextToPose.0"].inputs.diffusion_steps, 25,
      "the fresh doc composes the schema-declared default 25, not undefined");
  });

  it("the happy lane: loader → text-to-pose, NO bake without preview_glb", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "walks forward, then turns" }), kimodo, g, "r1");
    const graph = g.toJSON();
    assert.ok(graph["KimodoLoader.0"], "the lane loads the checkpoint");
    const pose = graph["KimodoTextToPose.0"];
    assert.ok(pose, "the pose generator rides");
    assert.equal(pose.inputs.prompt, "walks forward, then turns");
    assert.equal(pose.inputs.cfg_type, "separated", "the calibrated CFG default");
    assert.equal(pose.inputs.duration_sec, 5);
    assert.ok(!graph["RaySomaxBake.0"], "no preview without preview_glb");
  });

  it("preview_glb skins the motion (the somax bake rides)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "waves", preview_glb: "/m/rigged.glb", motion_prompts: " waves | bows ", motion_constraints: " left_foot:ground", motion_npz: "/m/prev.npz" }),
      kimodo, g, "r1",
    );
    const graph = g.toJSON();
    const bake = graph["RaySomaxBake.0"];
    assert.ok(bake, "the bake rides with preview_glb");
    assert.equal(bake.inputs.rigged_glb_path, "/m/rigged.glb");
    assert.equal(bake.inputs.anim_name, "motion");
    const pose = graph["KimodoTextToPose.0"];
    assert.equal(pose.inputs.motion_prompts, "waves | bows", "padded strings trim");
    assert.equal(pose.inputs.motion_constraints, "left_foot:ground");
    assert.equal(pose.inputs.prev_motion_npz, "/m/prev.npz");
  });

  it("flow ports and semantic outputs name the real NPZ and optional GLB producers", () => {
    assert.deepEqual(def.flowKinds.inputs, { prompt: "text", motion_npz: "data" });
    assert.deepEqual(def.flowKinds.outputs, { motion_npz: "data", animated_glb: "mesh" });
    assert.equal(def.flowOutputBindings?.[0]?.channel, "motion_npz");
    assert.equal(def.flowOutputBindings?.[0]?.node, "KimodoTextToPose.0");
    assert.equal(def.flowOutputBindings?.[0]?.nodeClass, "KimodoTextToPose");
    assert.equal(def.flowOutputBindings?.[1]?.channel, "animated_glb");
    assert.equal(def.flowOutputBindings?.[1]?.node, "RaySomaxBake.0");
    assert.equal(def.flowOutputBindings?.[1]?.nodeClass, "RaySomaxBake");
    assert.equal(def.flowOutputBindings?.[1]?.when?.({ preview_glb: "/m/rig.glb" }), true);
    assert.equal(def.flowOutputBindings?.[1]?.when?.({ preview_glb: "" }), false);
  });

  it("finalize is the kit's strip (identity of the declared finalize)", () => {
    assert.equal(typeof def.finalize, "function");
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "runs" }), kimodo, g, "r1");
    const out = def.finalize!(g.toJSON());
    assert.ok(out["KimodoTextToPose.0"], "the strip keeps the pose node");
  });
});
