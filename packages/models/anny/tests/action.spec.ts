// The atom's own proof (the atom vocabulary, stroke 3): the wire is
// pinned to a COMMITTED GOLDEN — recorded while the card's legacy body
// (the staging + turnaround tail) still existed and this spec compared
// the two byte-for-byte. That arm is deleted (the families own their
// lanes now), so the golden carries the compatibility law. The door is
// the weightless vacuous parse (the bake is parametric — no checkpoint
// loads). No sampler rides the turnaround, so no seed-sentinel.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import { assertGraphGolden } from "../../../../tests/helpers/graph-golden.ts";
import { join } from "node:path";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { DECL } from "../src/index.ts";
import { compose, parseAnnyFacts } from "../src/actions.ts";

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
  resolution: 768,
  framing: 1.2,
  focal_length: 50,
  samples: 64,
  transparent: "true",
  gender: 0.7,
  height: 0.6,
};

const golden = (name: string): string => join(import.meta.dirname, "golden", `${name}.json`);

const viewsOf = (g: GraphBuilder): Array<Record<string, unknown>> =>
  Object.values(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>).filter(
    (n) => n.class_type === "SaveImage",
  );

describe("the anny compose action — byte-stability (the compatibility law)", () => {
  it("the composed prompt is the committed golden (an attached GLB renders as-is)", () => {
    const action = new GraphBuilder({});
    instantiateAction(compose, { ...PARAMS }, FACTS, action, "probe");
    assertGraphGolden(golden("compose-attached-glb"), action.toJSON(), "the attached GLB renders as-is");
    assert.equal(viewsOf(action).length, 8, "the 8-view turnaround sheet rides");
    assert.deepEqual(
      viewsOf(action).map((n) => (n.inputs as { filename_prefix: string }).filename_prefix),
      ["anny_front", "anny_front_right", "anny_right", "anny_back_right", "anny_back", "anny_back_left", "anny_left", "anny_front_left"],
      "the view names ride the family convention, unstamped by run (stable)",
    );
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

  it("a non-positive render amount refuses by name (the row guard, ported verbatim)", () => {
    const p = { ...PARAMS, samples: 0 };
    assert.throws(
      () => instantiateAction(compose, { ...p }, FACTS, new GraphBuilder({}), "probe-bad"),
      /samples = 0: a positive number is required/,
    );
  });

  it("the door is the weightless vacuous parse (the bake loads no checkpoint)", () => {
    assert.deepEqual(parseAnnyFacts(FACTS.lane_inputs as never), {}, "nothing off the row is read");
    assert.deepEqual(
      (FACTS.lane_inputs as { weightless?: boolean }).weightless,
      false,
      "the row carries weights but the segment composes none",
    );
  });
});
