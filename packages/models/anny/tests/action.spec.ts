// The atom's own proof (the atom vocabulary, stroke 3): the wire is
// pinned to a COMMITTED GOLDEN — recorded while the card's legacy body
// (the staging + turnaround tail) still existed and this spec compared
// the two byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law. The door is
// the weightless vacuous parse (the bake is parametric — no checkpoint
// loads). The turnaround render tail died with the blender lane
// (2026-11-01): the goldens were re-recorded at the cut — the
// CompositeCharacter bake is the lane's terminal, no SaveImage rides,
// and the render knobs left the params doc.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { join } from "node:path";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { compose, parseAnnyFacts, estimate_photo } from "../src/actions.ts";

// The REAL resolved shape the service hands compose: the family row
// with the DECL's own lane_inputs (the registry owns lane truth).
const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS: ModelFacts = {
  id: DECL.id,
  card: "anny",
  defaults: {},
  lane_inputs: (DECL as { lane_inputs?: Record<string, unknown> }).lane_inputs ?? {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
};

const PARAMS = {
  body_glb: "/models/bodies/hero.glb",
  gender: 0.7,
  height: 0.6,
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);

const classes = (g: GraphBuilder): string[] =>
  Object.values(g.toJSON() as Record<string, { class_type: string }>).map((n) => n.class_type);

describe("the estimator chain — estimate_photo (models-hop56 wave-2 item 5: the flow e2e becomes a receipt, not the only judge)", () => {
  it("the photo→body compose pins the estimator chain at its named nodes: LoadImage the stated photo, Sam3dBodyImageToAnny the fixed person index", () => {
    const action = new GraphBuilder({})
    instantiateAction(estimate_photo, { photo: "/models/photos/subject.png" }, FACTS, action, "probe-estimate")
    const graph = action.toJSON() as Record<string, { class_type: string; inputs?: Record<string, unknown> }>
    const load = Object.values(graph).find((n) => n.class_type === "LoadImage")
    assert.ok(load, "LoadImage present (the stated photo's loader)")
    assert.strictEqual(load.inputs?.image, "/models/photos/subject.png", "the stated photo rides the loader verbatim")
    const sam = Object.values(graph).find((n) => n.class_type === "Sam3dBodyImageToAnny")
    assert.ok(sam, "Sam3dBodyImageToAnny present (the estimator engine)")
    assert.strictEqual(sam.inputs?.person_index, 0, "person_index FIXED at the loudest detection (0) — the chip knob never a bench surface")
    assert.ok(Array.isArray(sam.inputs?.image), "the estimator consumes the loader's OUTPUT handle (the graph edge), never a path literal")
  })
})

describe("the anny compose action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (an attached GLB renders as-is)", () => {
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("compose-attached-glb"), action.toJSON(), "the attached GLB renders as-is");
    assert.ok(!classes(action).includes("SaveImage"), "the SaveImage turnaround tail is gone with the blender lane");
    assert.ok(classes(action).includes("CompositeCharacter"), "the composite bake is the terminal");
  });

  it("the identity bake holds its golden (an empty body_glb — the sliders bake the body)", () => {
    const p = { ...PARAMS, body_glb: "", muscle: 0.9, firmness: 0.1, "l-upperarm-fat-incr": 1.5 };
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...p }, FACTS, action, "probe-bake");
    assertGraphGolden(golden("compose-identity-bake"), action.toJSON(), "the identity bake");
    const bake = Object.values(action.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).find(
      (n) => n.class_type === "AnnyParamsToGlb",
    )!;
    const json = JSON.parse((bake.inputs as { params_json: string }).params_json) as { phenotype: number[]; local_changes: Record<string, number> };
    assert.deepEqual(json.phenotype.slice(0, 5), [0.7, 0.5, 0.9, 0.5, 0.6], "absent dims fall to the neutral 0.5, stated dims ride (gender, muscle, height)");
    assert.deepEqual(json.local_changes, { "l-upperarm-fat-incr": 1.5 }, "only non-zero MORPH labels ship (sparse local_changes)");
  });

  it("the retired render knobs ride no row (the blender lane died 2026-11-01)", () => {
    for (const knob of ["resolution", "framing", "focal_length", "samples", "transparent"]) {
      assert.equal(
        compose.params?.some((row) => row.name === knob), false,
        `the ${knob} row left the declared surface`,
      );
    }
  });

  it("the door is the vacuous parse (the bake loads no checkpoint)", () => {
    assert.deepEqual(parseAnnyFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.equal(
      (FACTS.lane_inputs as { model_path?: string }).model_path,
      "sam_vit_b_01ec64.pth",
      "the row's one member names the sam weights; the segment composes none",
    );
  });
});
