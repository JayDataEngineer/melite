// @melite/motion — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: the motion lane generates FROM a text
// prompt; the lane body rides the kit against the REAL kimodo
// facts row. finalize strips the bake's autofills.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { ACTION_BINDINGS } from "../src/card.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
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

/** The kimodo family's own floor calibration (the DECL defaults
 *  row) — stated EXPLICITLY here because these specs drive the RAW
 *  card compose: no cascade, no walk fill (the dual-floor cure,
 *  2026-11-02 — the card schema stamps no defaults; the family
 *  floor owns the fresh-card prefill). */
const FLOORS = { seed: 42, duration_sec: 5, diffusion_steps: 25, num_samples: 1, num_transition_frames: 10, cfg_type: "separated", cfg_weight_a: 2.5, cfg_weight_b: 5 }

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

  it("THE ONE-OWNER FLOOR: an unstated seed REFUSES at raw compose — the family cascade owns it", () => {
    // The dual-floor cure (2026-11-02): the schema stamps no seed
    // default. The estate compose door stamps the kimodo family's
    // 42; the RAW compose (this spec's seat) refuses loud on the
    // absent floor — never silently clamps.
    assert.throws(
      () => def.compose({ prompt: "walks forward" }, kimodo, new GraphBuilder(), "r_def"),
      /seed = undefined: -1 \(random\) or a non-negative int is required/,
    );
    const g = new GraphBuilder();
    def.compose({ prompt: "walks forward", ...FLOORS }, kimodo, g, "r_def");
    assert.equal(g.toJSON()["KimodoTextToPose.0"].inputs.diffusion_steps, 25,
      "an explicit 25 (the family's calibration) rides verbatim");
  });

  it("the happy lane: loader → text-to-pose, NO bake without preview_glb", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ ...FLOORS, prompt: "walks forward, then turns" }), kimodo, g, "r1");
    const graph = g.toJSON();
    assert.ok(graph["KimodoLoader.0"], "the lane loads the checkpoint");
    const pose = graph["KimodoTextToPose.0"];
    assert.ok(pose, "the pose generator rides");
    assert.equal(pose.inputs.prompt, "walks forward, then turns");
    assert.equal(pose.inputs.cfg_type, "separated", "the calibrated CFG default");
    assert.equal(pose.inputs.duration_sec, 5);
    assert.ok(!graph["RaySomaxBake.0"], "no preview without preview_glb");
  });

  it("THE BG BRICK CURE (hop 5): motion_bg_image composes and NEVER rides the graph (UI-only by consumption)", () => {
    // The studio persists the bg into stage.params; the door admits
    // it through the kimodo DECL's studio.writes; the graph builder
    // consumes none of it — the serialized graph carries no trace.
    // (The estate door's admission half is walled estate-side in
    // cards-admission-matrix T5; this arm pins the wire half.)
    const g = new GraphBuilder();
    def.compose(
      def.schema({ ...FLOORS, prompt: "waves", motion_bg_image: "data:image/png;base64,AAAA" }),
      kimodo, g, "r_bg",
    );
    const graph = g.toJSON();
    assert.equal(JSON.stringify(graph).includes("motion_bg_image"), false,
      "the bg param is UI-only — no node input carries it");
    assert.equal(JSON.stringify(graph).includes("AAAA"), false,
      "the bg payload never leaks into any serialized value");
  });

  it("preview_glb skins the motion (the somax bake rides)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ ...FLOORS, prompt: "waves", preview_glb: "/m/rigged.glb", motion_prompts: " waves | bows ", motion_constraints: " left_foot:ground", motion_npz: "/m/prev.npz" }),
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
    // preview_glb joins (the naming-law census, 2026-10-09): the
    // skinned character is a REAL wire seat — a prior motion
    // stage's animated_glb (mesh) chains straight in.
    assert.deepEqual(def.flowKinds.inputs, { prompt: "text", motion_npz: "data", preview_glb: "mesh" });
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
    def.compose(def.schema({ ...FLOORS, prompt: "runs" }), kimodo, g, "r1");
    const out = def.finalize!(g.toJSON());
    assert.ok(out["KimodoTextToPose.0"], "the strip keeps the pose node");
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the motion card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row; (2) the row composes ITS OWN
// declared segment — the pose synth rides the prompt. The declared
// fallback (a family-less row) rides the legacy lane in the open.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "motion");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 1, `expected the served motion addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      const g = new GraphBuilder();
      def.compose(def.schema({ ...FLOORS, prompt: "walks forward, then waves" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const pose = Object.values(graph).find((n) => n.class_type === "KimodoTextToPose")!;
      assert.ok(pose, "the declared segment synthesizes the motion");
      assert.equal(pose.inputs.prompt, "walks forward, then waves", "the prompt rides verbatim");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    const row = { ...rows[0]!, id: "synthetic-motion", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ ...FLOORS, prompt: "fallback probe" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-motion' on the motion card — every boarded family \(kimodo\)/,
    );
  });
});
